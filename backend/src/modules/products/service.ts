import { randomUUID } from 'node:crypto'
import XLSX from 'xlsx'
import { prisma } from '../../infra/prismaClient'
const db = prisma as any

type ProductInput = {
  code: string
  description: string
  priceInstallment: number
  stockBalance: number
  unit?: string
  isActive?: boolean
}

type Row = Record<string, unknown>

function normalizeCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase()
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const raw = String(value).trim()
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function readSheet(buffer: Buffer): Row[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[sheetName], { defval: '' })
}

function inferMapping(headers: string[]) {
  const normalized = headers.map((h) => ({ raw: h, n: h.toLowerCase().trim().replace(/\s+/g, '_') }))
  const by = (candidates: string[]) => normalized.find((h) => candidates.includes(h.n))?.raw ?? null
  return {
    code: by(['codigo_do_produto', 'codigo', 'code', 'sku']),
    description: by(['descricao_do_produto', 'descricao', 'description']),
    priceInstallment: by(['preco_a_prazo', 'preco', 'price_installment']),
    stockBalance: by(['saldo_estoque', 'estoque', 'stock_balance']),
  }
}

export const productsService = {
  async list(input: { search?: string; page: number; limit: number }) {
    const where = input.search
      ? {
          OR: [
            { code: { contains: input.search, mode: 'insensitive' as const } },
            { description: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }
      : undefined
    const [total, items] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
    ])
    return { total, page: input.page, limit: input.limit, items }
  },

  getById(id: string) {
    return db.product.findUnique({ where: { id } })
  },

  getByCode(code: string) {
    return db.product.findUnique({ where: { code: normalizeCode(code) } })
  },

  async create(input: ProductInput) {
    return db.product.create({
      data: {
        code: normalizeCode(input.code),
        description: input.description.trim(),
        priceInstallment: input.priceInstallment.toFixed(2),
        stockBalance: input.stockBalance.toFixed(3),
        unit: input.unit?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
  },

  async update(id: string, input: ProductInput) {
    return db.product.update({
      where: { id },
      data: {
        code: normalizeCode(input.code),
        description: input.description.trim(),
        priceInstallment: input.priceInstallment.toFixed(2),
        stockBalance: input.stockBalance.toFixed(3),
        unit: input.unit?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
  },

  async setActive(id: string, isActive: boolean) {
    return db.product.update({ where: { id }, data: { isActive } })
  },

  preview(fileBuffer: Buffer) {
    const rows = readSheet(fileBuffer)
    const headers = Object.keys(rows[0] ?? {})
    return {
      headers,
      previewRows: rows.slice(0, 20),
      suggestedMapping: inferMapping(headers),
    }
  },

  async importProducts(input: {
    fileName: string
    fileBuffer: Buffer
    mode: 'INSERT_ONLY' | 'UPSERT_ALL'
    createdBy?: string
    mapping?: { code: string; description?: string; priceInstallment?: string; stockBalance?: string }
  }) {
    const rows = readSheet(input.fileBuffer)
    const headers = Object.keys(rows[0] ?? {})
    const suggested = inferMapping(headers)
    const mapping = {
      code: input.mapping?.code || suggested.code || '',
      description: input.mapping?.description || suggested.description || '',
      priceInstallment: input.mapping?.priceInstallment || suggested.priceInstallment || '',
      stockBalance: input.mapping?.stockBalance || suggested.stockBalance || '',
    }
    if (!mapping.code) throw new Error('Mapeamento de codigo_do_produto obrigatorio.')

    const job = await db.productImportJob.create({
      data: {
        id: randomUUID(),
        type: 'PRODUCT_IMPORT',
        fileName: input.fileName,
        status: 'PROCESSING',
        createdBy: input.createdBy ?? null,
        optionsJson: { mode: input.mode, mapping },
      },
    })

    const totals = { lidas: rows.length, inseridas: 0, atualizadas: 0, ignoradas: 0, erros: 0, warnings: 0 }
    const dedup = new Map<string, { row: Row; rowNumber: number }>()
    rows.forEach((row, idx) => {
      const code = normalizeCode(String(row[mapping.code] ?? ''))
      if (!code) return
      if (dedup.has(code)) totals.warnings += 1
      dedup.set(code, { row, rowNumber: idx + 2 })
    })

    const errors: Array<{ id: string; jobId: string; rowNumber: number; productCode?: string; errorMessage: string; rawRowJson: Row }> = []

    for (const entry of dedup.values()) {
      const code = normalizeCode(String(entry.row[mapping.code] ?? ''))
      const description = String(mapping.description ? entry.row[mapping.description] ?? '' : '').trim()
      const price = mapping.priceInstallment ? parseNumber(entry.row[mapping.priceInstallment]) : null
      const stock = mapping.stockBalance ? parseNumber(entry.row[mapping.stockBalance]) : null

      if (!code) {
        totals.erros += 1
        errors.push({
          id: randomUUID(),
          jobId: job.id,
          rowNumber: entry.rowNumber,
          errorMessage: 'codigo_do_produto vazio.',
          rawRowJson: entry.row,
        })
        continue
      }
      if (price !== null && price < 0) {
        totals.erros += 1
        errors.push({
          id: randomUUID(),
          jobId: job.id,
          rowNumber: entry.rowNumber,
          productCode: code,
          errorMessage: 'preco_a_prazo deve ser >= 0.',
          rawRowJson: entry.row,
        })
        continue
      }
      if (stock !== null && stock < 0) {
        totals.erros += 1
        errors.push({
          id: randomUUID(),
          jobId: job.id,
          rowNumber: entry.rowNumber,
          productCode: code,
          errorMessage: 'saldo_estoque deve ser >= 0.',
          rawRowJson: entry.row,
        })
        continue
      }

      const existing = await db.product.findUnique({ where: { code } })
      if (existing && input.mode === 'INSERT_ONLY') {
        totals.ignoradas += 1
        continue
      }

      if (!existing) {
        await db.product.create({
          data: {
            code,
            description: description || `Produto ${code}`,
            priceInstallment: (price ?? 0).toFixed(2),
            stockBalance: (stock ?? 0).toFixed(3),
            isActive: true,
          },
        })
        totals.inseridas += 1
        continue
      }

      await db.product.update({
        where: { id: existing.id },
        data: {
          description: description || existing.description,
          priceInstallment: (price ?? Number(existing.priceInstallment)).toFixed(2),
          stockBalance: (stock ?? Number(existing.stockBalance)).toFixed(3),
        },
      })
      totals.atualizadas += 1
    }

    if (errors.length > 0) await db.productImportError.createMany({ data: errors })

    await db.productImportJob.update({
      where: { id: job.id },
      data: { status: 'DONE', finishedAt: new Date(), totalsJson: totals },
    })
    return { jobId: job.id, totals }
  },

  async importStock(input: {
    fileName: string
    fileBuffer: Buffer
    createIfMissing: boolean
    updateMode: 'SET' | 'ADD'
    createdBy?: string
    mapping: { code: string; stockBalance: string; description?: string; priceInstallment?: string }
  }) {
    const rows = readSheet(input.fileBuffer)
    const job = await db.productImportJob.create({
      data: {
        id: randomUUID(),
        type: 'STOCK_UPDATE',
        fileName: input.fileName,
        status: 'PROCESSING',
        createdBy: input.createdBy ?? null,
        optionsJson: {
          create_if_missing: input.createIfMissing,
          update_mode: input.updateMode,
          mapping: input.mapping,
        },
      },
    })

    const totals = { lidas: rows.length, inseridas: 0, atualizadas: 0, ignoradas: 0, erros: 0 }
    const errors: Array<{ id: string; jobId: string; rowNumber: number; productCode?: string; errorMessage: string; rawRowJson: Row }> = []

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx]
      const rowNumber = idx + 2
      const code = normalizeCode(String(row[input.mapping.code] ?? ''))
      const stock = parseNumber(row[input.mapping.stockBalance])
      const description = input.mapping.description ? String(row[input.mapping.description] ?? '').trim() : ''
      const price = input.mapping.priceInstallment ? parseNumber(row[input.mapping.priceInstallment]) : null

      if (!code) {
        totals.erros += 1
        errors.push({ id: randomUUID(), jobId: job.id, rowNumber, errorMessage: 'codigo_do_produto vazio.', rawRowJson: row })
        continue
      }
      if (stock === null || stock < 0) {
        totals.erros += 1
        errors.push({
          id: randomUUID(),
          jobId: job.id,
          rowNumber,
          productCode: code,
          errorMessage: 'saldo_estoque deve ser numero >= 0.',
          rawRowJson: row,
        })
        continue
      }

      let product = await db.product.findUnique({ where: { code } })
      if (!product) {
        if (!input.createIfMissing) {
          totals.ignoradas += 1
          continue
        }
        product = await db.product.create({
          data: {
            code,
            description: description || `Produto ${code}`,
            priceInstallment: (price ?? 0).toFixed(2),
            stockBalance: stock.toFixed(3),
            isActive: true,
          },
        })
        totals.inseridas += 1
      } else {
        const previous = Number(product.stockBalance)
        const newBalance = input.updateMode === 'SET' ? stock : previous + stock
        product = await db.product.update({
          where: { id: product.id },
          data: {
            description: description || product.description,
            priceInstallment: (price ?? Number(product.priceInstallment)).toFixed(2),
            stockBalance: newBalance.toFixed(3),
          },
        })
        totals.atualizadas += 1

        await db.inventoryMovement.create({
          data: {
            id: randomUUID(),
            productId: product.id,
            movementType: input.updateMode === 'SET' ? 'IMPORT_SET' : 'IMPORT_ADD',
            quantity: stock.toFixed(3),
            previousBalance: previous.toFixed(3),
            newBalance: newBalance.toFixed(3),
            referenceJobId: job.id,
            createdBy: input.createdBy ?? null,
          },
        })
      }
    }

    if (errors.length > 0) await db.productImportError.createMany({ data: errors })
    await db.productImportJob.update({
      where: { id: job.id },
      data: { status: 'DONE', finishedAt: new Date(), totalsJson: totals },
    })
    return { jobId: job.id, totals }
  },

  async getImportJob(id: string) {
    return db.productImportJob.findUnique({
      where: { id },
      include: { errors: { orderBy: { rowNumber: 'asc' }, take: 500 } },
    })
  },

  listImportJobs(limit = 100) {
    return db.productImportJob.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  },

  async exportImportErrorsCsv(jobId: string) {
    const errors = await db.productImportError.findMany({ where: { jobId }, orderBy: { rowNumber: 'asc' } })
    const lines = [
      '"row_number","product_code","error_message","raw_row_json"',
      ...errors.map((e: any) => {
        const cols = [String(e.rowNumber), e.productCode ?? '', e.errorMessage, JSON.stringify(e.rawRowJson ?? {})]
        return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      }),
    ]
    return lines.join('\n')
  },

  search(query: string, limit = 8) {
    return db.product.findMany({
      where: {
        isActive: true,
        OR: [{ code: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    })
  },

  getStockForCodes(codes: string[]) {
    const normalized = Array.from(new Set(codes.map(normalizeCode))).filter(Boolean)
    if (normalized.length === 0) return Promise.resolve([])
    return db.product.findMany({ where: { code: { in: normalized } } })
  },
}
