import type { Request, Response } from 'express'
import { contasBancoService } from './service'
import { createContaBancoSchema, updateContaBancoSchema } from './schemas'

export const contasBancoController = {
  async list(_req: Request, res: Response) {
    const rows = await contasBancoService.list()
    return res.json(rows)
  },

  async getById(req: Request, res: Response) {
    const row = await contasBancoService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Conta nao encontrada.' })
    return res.json(row)
  },

  async create(req: Request, res: Response) {
    const parsed = createContaBancoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await contasBancoService.create(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar conta.' })
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateContaBancoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await contasBancoService.update(String(req.params.id), parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar conta.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await contasBancoService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir conta.' })
    }
  },
}
