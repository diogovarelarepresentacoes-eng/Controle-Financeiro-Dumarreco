import type { Request, Response } from 'express'
import { vendasService } from './service'
import { createVendaSchema } from './schemas'

export const vendasController = {
  async list(_req: Request, res: Response) {
    const rows = await vendasService.list()
    return res.json(rows)
  },

  async getById(req: Request, res: Response) {
    const row = await vendasService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Venda nao encontrada.' })
    return res.json(row)
  },

  async registrar(req: Request, res: Response) {
    const parsed = createVendaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await vendasService.registrar(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao registrar venda.' })
    }
  },

  async atualizar(req: Request, res: Response) {
    const parsed = createVendaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await vendasService.atualizar(String(req.params.id), parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar venda.' })
    }
  },

  async excluir(req: Request, res: Response) {
    try {
      await vendasService.excluir(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir venda.' })
    }
  },
}
