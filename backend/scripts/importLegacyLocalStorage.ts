import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../src/infra/prismaClient'

type LegacyExport = Record<string, unknown>

const KEY_FORNECEDORES = 'controle-financeiro-fornecedores'
const KEY_COMPRAS = 'controle-financeiro-compras'
const KEY_COMPRAS_ITENS = 'controle-financeiro-compras-itens'
const KEY_COMPRAS_DOCUMENTOS = 'controle-financeiro-compras-documentos'
const KEY_BOLETOS = 'controle-financeiro-boletos'

function parseMaybeArray(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function toDateSafe(v?: string): Date {
  if (!v) return new Date()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

async function run() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    throw new Error('Uso: npm run migrate:legacy -- <caminho-do-json-exportado>')
  }
  const fullPath = path.resolve(process.cwd(), inputPath)
  if (!fs.existsSync(fullPath)) throw new Error(`Arquivo nao encontrado: ${fullPath}`)
  const raw = fs.readFileSync(fullPath, 'utf-8')
  const json = JSON.parse(raw) as LegacyExport

  const fornecedores = parseMaybeArray(json[KEY_FORNECEDORES])
  const compras = parseMaybeArray(json[KEY_COMPRAS])
  const itens = parseMaybeArray(json[KEY_COMPRAS_ITENS])
  const docs = parseMaybeArray(json[KEY_COMPRAS_DOCUMENTOS])
  const boletos = parseMaybeArray(json[KEY_BOLETOS]).filter((b) => b?.compraId)

  await prisma.$transaction(async (tx) => {
    for (const f of fornecedores) {
      const cnpj = f.cnpj ?? null
      const legalName = String(f.razaoSocial ?? f.legalName ?? 'Fornecedor')
      const existing = cnpj ? await tx.supplier.findUnique({ where: { cnpj } }) : null
      if (existing) {
        await tx.supplier.update({
          where: { id: existing.id },
          data: { legalName },
        })
      } else {
        await tx.supplier.create({
          data: {
            id: String(f.id ?? crypto.randomUUID()),
            cnpj: cnpj ?? undefined,
            legalName,
            createdAt: toDateSafe(f.criadoEm),
            updatedAt: toDateSafe(f.atualizadoEm),
          },
        })
      }
    }

    for (const c of compras) {
      const supplierCnpj = c.fornecedorCnpj ? String(c.fornecedorCnpj) : undefined
      const supplierName = String(c.fornecedorNome ?? 'Fornecedor')
      let supplier = supplierCnpj ? await tx.supplier.findUnique({ where: { cnpj: supplierCnpj } }) : null
      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            id: crypto.randomUUID(),
            cnpj: supplierCnpj,
            legalName: supplierName,
          },
        })
      }
      const purchaseId = String(c.id ?? crypto.randomUUID())
      const exists = await tx.purchase.findUnique({ where: { id: purchaseId } })
      if (exists) continue
      await tx.purchase.create({
        data: {
          id: purchaseId,
          supplierId: supplier.id,
          issueDate: toDateSafe(c.dataEmissao),
          competenceMonth: String(c.competenciaMes ?? '1970-01'),
          description: c.descricao ? String(c.descricao) : undefined,
          notes: c.observacoes ? String(c.observacoes) : undefined,
          totalAmount: toNum(c.valorTotal).toFixed(2),
          category: c.categoria ? String(c.categoria) : undefined,
          costCenter: c.centroCusto ? String(c.centroCusto) : undefined,
          hasInvoice: Boolean(c.temNotaFiscal),
          source: String(c.origem ?? 'manual'),
          nfeAccessKey: c.nfeChaveAcesso ? String(c.nfeChaveAcesso) : undefined,
          nfeNumber: c.nfeNumero ? String(c.nfeNumero) : undefined,
          nfeSeries: c.nfeSerie ? String(c.nfeSerie) : undefined,
          recipientName: c.destinatarioNome ? String(c.destinatarioNome) : undefined,
          recipientCnpj: c.destinatarioCnpj ? String(c.destinatarioCnpj) : undefined,
          totalProducts: c.totalProdutos != null ? toNum(c.totalProdutos).toFixed(2) : undefined,
          totalInvoice: c.totalNotaFiscal != null ? toNum(c.totalNotaFiscal).toFixed(2) : undefined,
          totalTaxes: c.totalImpostos != null ? toNum(c.totalImpostos).toFixed(2) : undefined,
          createdAt: toDateSafe(c.criadoEm),
          updatedAt: toDateSafe(c.atualizadoEm),
          deletedAt: c.ativo === false ? new Date() : undefined,
        },
      })
    }

    for (const i of itens) {
      const itemId = String(i.id ?? crypto.randomUUID())
      const exists = await tx.purchaseItem.findUnique({ where: { id: itemId } }).catch(() => null)
      if (exists) continue
      await tx.purchaseItem.create({
        data: {
          id: itemId,
          purchaseId: String(i.compraId),
          description: String(i.descricao ?? 'Item'),
          ncm: i.ncm ? String(i.ncm) : undefined,
          quantity: toNum(i.quantidade || 1).toFixed(4),
          unitAmount: toNum(i.valorUnitario || 0).toFixed(4),
          totalAmount: toNum(i.valorTotal || 0).toFixed(2),
        },
      }).catch(() => undefined)
    }

    for (const d of docs) {
      const docId = String(d.id ?? crypto.randomUUID())
      const exists = await tx.purchaseDocument.findUnique({ where: { id: docId } }).catch(() => null)
      if (exists) continue
      await tx.purchaseDocument.create({
        data: {
          id: docId,
          purchaseId: String(d.compraId),
          documentType: String(d.tipo ?? 'anexo'),
          fileName: String(d.nomeArquivo ?? 'documento'),
          fileContent: String(d.conteudo ?? ''),
          nfeAccessKey: d.chaveAcesso ? String(d.chaveAcesso) : undefined,
          createdAt: toDateSafe(d.criadoEm),
        },
      }).catch(() => undefined)
    }

    for (const b of boletos) {
      const payableId = String(b.id ?? crypto.randomUUID())
      const exists = await tx.payable.findUnique({ where: { id: payableId } }).catch(() => null)
      if (exists) continue
      await tx.payable.create({
        data: {
          id: payableId,
          purchaseId: String(b.compraId),
          description: String(b.descricao ?? 'Conta a pagar'),
          dueDate: toDateSafe(b.vencimento),
          amount: toNum(b.valor).toFixed(2),
          status: b.pago ? 'paid' : 'pending',
          paymentDate: b.dataPagamento ? toDateSafe(b.dataPagamento) : undefined,
          paymentMethod: b.origemPagamento ? String(b.origemPagamento) : undefined,
          supplierName: undefined,
          createdAt: toDateSafe(b.criadoEm),
          updatedAt: new Date(),
        },
      }).catch(() => undefined)
    }
  })

  // eslint-disable-next-line no-console
  console.log('Migracao legada concluida com sucesso.')
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
