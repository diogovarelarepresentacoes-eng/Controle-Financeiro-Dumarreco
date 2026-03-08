import type { Request, Response } from 'express'
import { maquinasCartaoService } from './service'
import {
  createMaquinaCartaoSchema,
  updateMaquinaCartaoSchema,
  listMaquinasCartaoQuerySchema,
  createTaxaMaquinaSchema,
  updateTaxaMaquinaSchema,
  modalidadeQuerySchema,
} from './schemas'

export const maquinasCartaoController = {
  async list(req: Request, res: Response) {
    const query = listMaquinasCartaoQuerySchema.safeParse(req.query)
    if (!query.success) {
      return res.status(400).json({ error: 'Parametros invalidos.', details: query.error.flatten() })
    }
    const ativo = query.data.ativo === 'true' ? true : query.data.ativo === 'false' ? false : undefined
    const rows = await maquinasCartaoService.list({ ativo })
    return res.json(rows)
  },

  async getById(req: Request, res: Response) {
    const row = await maquinasCartaoService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Maquina nao encontrada.' })
    return res.json(row)
  },

  async getByIdWithTaxas(req: Request, res: Response) {
    const row = await maquinasCartaoService.getByIdWithTaxas(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Maquina nao encontrada.' })
    return res.json(row)
  },

  async getByModalidade(req: Request, res: Response) {
    const maquinaId = String(req.params.id)
    const query = modalidadeQuerySchema.safeParse(req.query)
    if (!query.success) {
      return res.status(400).json({ error: 'Parametros invalidos (tipoCartao, quantidadeParcelas).', details: query.error.flatten() })
    }
    const { tipoCartao, quantidadeParcelas } = query.data
    const row = await maquinasCartaoService.findByModalidade(maquinaId, tipoCartao, quantidadeParcelas)
    if (!row) {
      return res.status(404).json({ error: 'Nao existe taxa configurada para esta maquina de cartao nesta modalidade.' })
    }
    return res.json(row)
  },

  async createMaquina(req: Request, res: Response) {
    const parsed = createMaquinaCartaoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await maquinasCartaoService.createMaquina(parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar maquina.' })
    }
  },

  async updateMaquina(req: Request, res: Response) {
    const parsed = updateMaquinaCartaoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await maquinasCartaoService.updateMaquina(String(req.params.id), parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar maquina.' })
    }
  },

  async toggleAtivo(req: Request, res: Response) {
    try {
      const updated = await maquinasCartaoService.toggleAtivo(String(req.params.id))
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao alterar status.' })
    }
  },

  async removeMaquina(req: Request, res: Response) {
    try {
      await maquinasCartaoService.deleteMaquina(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir maquina.' })
    }
  },

  async listTaxas(req: Request, res: Response) {
    const maquinaId = String(req.params.id)
    const rows = await maquinasCartaoService.listTaxas(maquinaId)
    return res.json(rows)
  },

  async createTaxa(req: Request, res: Response) {
    const maquinaId = String(req.params.id)
    const parsed = createTaxaMaquinaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const created = await maquinasCartaoService.createTaxa(maquinaId, parsed.data)
      return res.status(201).json(created)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar taxa.' })
    }
  },

  async updateTaxa(req: Request, res: Response) {
    const maquinaId = String(req.params.id)
    const taxaId = String(req.params.taxaId)
    const parsed = updateTaxaMaquinaSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const updated = await maquinasCartaoService.updateTaxa(maquinaId, taxaId, parsed.data)
      return res.json(updated)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar taxa.' })
    }
  },

  async removeTaxa(req: Request, res: Response) {
    const maquinaId = String(req.params.id)
    const taxaId = String(req.params.taxaId)
    try {
      await maquinasCartaoService.deleteTaxa(maquinaId, taxaId)
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir taxa.' })
    }
  },
}
