import type { Request, Response } from 'express'
import { purchasesService } from './service'
import { createPurchaseManualSchema, generatePayablesSchema, listPurchasesQuerySchema } from './schemas'

export const purchasesController = {
  async list(req: Request, res: Response) {
    const query = listPurchasesQuerySchema.safeParse(req.query)
    if (!query.success) return res.status(400).json({ error: 'Parametros de filtro invalidos.', details: query.error.flatten() })
    const data = await purchasesService.listPurchases(query.data)
    return res.json(data)
  },

  async getById(req: Request, res: Response) {
    const purchaseId = String(req.params.id)
    const row = await purchasesService.getPurchaseById(purchaseId)
    if (!row) return res.status(404).json({ error: 'Compra nao encontrada.' })
    return res.json(row)
  },

  async createManual(req: Request, res: Response) {
    const parsed = createPurchaseManualSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    const created = await purchasesService.createPurchaseManual(parsed.data)
    return res.status(201).json(created)
  },

  async importXml(req: Request, res: Response) {
    const xmlRaw = String(req.body?.xmlRaw ?? '').trim()
    const performedBy = String(req.body?.performedBy ?? 'unknown')
    if (!xmlRaw) return res.status(400).json({ error: 'xmlRaw e obrigatorio.' })
    try {
      const created = await purchasesService.importNFeXmlToPurchase(xmlRaw, performedBy)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao importar XML.' })
    }
  },

  async generatePayables(req: Request, res: Response) {
    const parsed = generatePayablesSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    try {
      const created = await purchasesService.generatePayablesFromPurchase({
        purchaseId: String(req.params.id),
        ...parsed.data,
      })
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao gerar contas a pagar.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await purchasesService.deletePurchase(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir compra.' })
    }
  },
}
