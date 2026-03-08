import type { Request, Response } from 'express'
import { productsService } from './service'
import {
  activateProductSchema,
  createProductSchema,
  importProductsOptionsSchema,
  importStockOptionsSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from './schemas'

function parseMaybeJson(value: unknown) {
  if (typeof value === 'string') return JSON.parse(value)
  return value
}

export const productsController = {
  async list(req: Request, res: Response) {
    const parsed = listProductsQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: 'Parametros invalidos.', details: parsed.error.flatten() })
    const data = await productsService.list(parsed.data)
    return res.json(data)
  },

  async getById(req: Request, res: Response) {
    const row = await productsService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Produto nao encontrado.' })
    return res.json(row)
  },

  async create(req: Request, res: Response) {
    const parsed = createProductSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    const created = await productsService.create(parsed.data)
    return res.status(201).json(created)
  },

  async update(req: Request, res: Response) {
    const parsed = updateProductSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    const updated = await productsService.update(String(req.params.id), parsed.data)
    return res.json(updated)
  },

  async activate(req: Request, res: Response) {
    const parsed = activateProductSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    const updated = await productsService.setActive(String(req.params.id), parsed.data.isActive)
    return res.json(updated)
  },

  async previewImport(req: Request, res: Response) {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio.' })
    const data = productsService.preview(req.file.buffer)
    return res.json(data)
  },

  async importProducts(req: Request, res: Response) {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio.' })
    const parsed = importProductsOptionsSchema.safeParse(parseMaybeJson(req.body?.options ?? req.body))
    if (!parsed.success) return res.status(400).json({ error: 'Opcoes invalidas.', details: parsed.error.flatten() })
    const result = await productsService.importProducts({
      fileName: req.file.originalname,
      fileBuffer: req.file.buffer,
      mode: parsed.data.mode,
      createdBy: parsed.data.createdBy,
      mapping: parsed.data.mapping,
    })
    return res.status(202).json(result)
  },

  async importStock(req: Request, res: Response) {
    if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatorio.' })
    const parsed = importStockOptionsSchema.safeParse(parseMaybeJson(req.body?.options ?? req.body))
    if (!parsed.success) return res.status(400).json({ error: 'Opcoes invalidas.', details: parsed.error.flatten() })
    const result = await productsService.importStock({
      fileName: req.file.originalname,
      fileBuffer: req.file.buffer,
      createIfMissing: parsed.data.create_if_missing,
      updateMode: parsed.data.update_mode,
      createdBy: parsed.data.createdBy,
      mapping: parsed.data.mapping,
    })
    return res.status(202).json(result)
  },

  async getImportJob(req: Request, res: Response) {
    const row = await productsService.getImportJob(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Job nao encontrado.' })
    return res.json(row)
  },

  async listImportJobs(req: Request, res: Response) {
    const limit = Number(req.query.limit ?? 100)
    const rows = await productsService.listImportJobs(Number.isFinite(limit) ? Math.max(1, Math.min(500, limit)) : 100)
    return res.json(rows)
  },

  async exportImportErrors(req: Request, res: Response) {
    const csv = await productsService.exportImportErrorsCsv(String(req.params.id))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${req.params.id}.csv"`)
    return res.status(200).send(csv)
  },

  async search(req: Request, res: Response) {
    const q = String(req.query.q ?? '').trim()
    if (!q) return res.json({ items: [] })
    const limit = Number(req.query.limit ?? 8)
    const items = await productsService.search(q, Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 8)
    return res.json({ items })
  },

  async stockBatch(req: Request, res: Response) {
    const raw = String(req.query.codes ?? '')
    const codes = raw.split(',').map((v) => v.trim()).filter(Boolean)
    const items = await productsService.getStockForCodes(codes)
    return res.json({ items })
  },
}
