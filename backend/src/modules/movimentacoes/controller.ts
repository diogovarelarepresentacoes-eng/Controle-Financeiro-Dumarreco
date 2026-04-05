import type { Request, Response } from 'express'
import { movimentacoesService } from './service'
import { createMovimentacaoSchema } from './schemas'

export const movimentacoesController = {
  async list(_req: Request, res: Response) {
    const rows = await movimentacoesService.list()
    return res.json(rows)
  },

  async getByConta(req: Request, res: Response) {
    const rows = await movimentacoesService.getByConta(String(req.params.contaBancoId))
    return res.json(rows)
  },

  async getByVenda(req: Request, res: Response) {
    const rows = await movimentacoesService.getByVendaId(String(req.params.vendaId))
    return res.json(rows)
  },

  async create(req: Request, res: Response) {
    const parsed = createMovimentacaoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await movimentacoesService.create(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar movimentacao.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await movimentacoesService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir movimentacao.' })
    }
  },
}
