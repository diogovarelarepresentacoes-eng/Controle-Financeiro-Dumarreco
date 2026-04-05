import type { Request, Response } from 'express'
import { despesasService } from './service'
import { createDespesaSchema, updateDespesaSchema, pagamentoDespesaSchema, deletedRecurrenceMarkerSchema } from './schemas'

export const despesasController = {
  async list(_req: Request, res: Response) {
    return res.json(await despesasService.list())
  },

  async getById(req: Request, res: Response) {
    const row = await despesasService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Despesa nao encontrada.' })
    return res.json(row)
  },

  async create(req: Request, res: Response) {
    const parsed = createDespesaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await despesasService.create(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar despesa.' })
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateDespesaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await despesasService.update(String(req.params.id), parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar despesa.' })
    }
  },

  async saveAll(req: Request, res: Response) {
    try {
      await despesasService.saveAll(req.body)
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao salvar despesas.' })
    }
  },

  async registrarPagamento(req: Request, res: Response) {
    const parsed = pagamentoDespesaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await despesasService.registrarPagamento(
        String(req.params.id),
        parsed.data.origemPagamento,
        parsed.data.contaBancoId,
        parsed.data.dataPagamento,
      )
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao registrar pagamento.' })
    }
  },

  async reverterPagamento(req: Request, res: Response) {
    try {
      const updated = await despesasService.reverterPagamento(String(req.params.id))
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao reverter pagamento.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await despesasService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir despesa.' })
    }
  },

  async getDeletedRecurrenceMarkers(_req: Request, res: Response) {
    return res.json(await despesasService.getDeletedRecurrenceMarkers())
  },

  async addDeletedRecurrenceMarker(req: Request, res: Response) {
    const parsed = deletedRecurrenceMarkerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      await despesasService.addDeletedRecurrenceMarker(parsed.data.origemId, parsed.data.dataVencimento)
      return res.status(201).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao adicionar marcador.' })
    }
  },

  async clearDeletedRecurrenceMarkersByOrigem(req: Request, res: Response) {
    try {
      await despesasService.clearDeletedRecurrenceMarkersByOrigem(String(req.params.origemId))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao limpar marcadores.' })
    }
  },
}
