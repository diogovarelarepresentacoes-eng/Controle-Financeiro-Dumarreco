import type { Request, Response } from 'express'
import { boletosService } from './service'
import { createBoletoSchema, updateBoletoSchema, baixaBoletoSchema } from './schemas'

export const boletosController = {
  async list(_req: Request, res: Response) {
    const rows = await boletosService.list()
    return res.json(rows)
  },

  async getById(req: Request, res: Response) {
    const row = await boletosService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Boleto nao encontrado.' })
    return res.json(row)
  },

  async getPendentes(_req: Request, res: Response) {
    return res.json(await boletosService.getPendentes())
  },

  async getPagos(_req: Request, res: Response) {
    return res.json(await boletosService.getPagos())
  },

  async create(req: Request, res: Response) {
    const parsed = createBoletoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await boletosService.create(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar boleto.' })
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateBoletoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await boletosService.update(String(req.params.id), parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar boleto.' })
    }
  },

  async registrarBaixa(req: Request, res: Response) {
    const parsed = baixaBoletoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await boletosService.registrarBaixa(String(req.params.id), parsed.data.origem, parsed.data.contaBancoId)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao registrar baixa.' })
    }
  },

  async reverterBaixa(req: Request, res: Response) {
    try {
      const updated = await boletosService.reverterBaixa(String(req.params.id))
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao reverter baixa.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await boletosService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir boleto.' })
    }
  },

  async saveAll(req: Request, res: Response) {
    try {
      await boletosService.saveAll(req.body)
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao salvar boletos.' })
    }
  },
}
