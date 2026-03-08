import type { Request, Response } from 'express'
import { taxasCartaoService } from './service'
import { createTaxaCartaoSchema, updateTaxaCartaoSchema, listTaxasCartaoQuerySchema } from './schemas'

function toJson(row: { id: string; descricao: string; tipoCartao: string; quantidadeParcelas: number; taxaPercentual: unknown; ativo: boolean; createdAt: Date; updatedAt: Date }) {
  return {
    id: row.id,
    descricao: row.descricao,
    tipoCartao: row.tipoCartao,
    quantidadeParcelas: row.quantidadeParcelas,
    taxaPercentual: Number(row.taxaPercentual),
    ativo: row.ativo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const taxasCartaoController = {
  async list(req: Request, res: Response) {
    const query = listTaxasCartaoQuerySchema.safeParse(req.query)
    if (!query.success) return res.status(400).json({ error: 'Parametros invalidos.', details: query.error.flatten() })
    const tipo = query.data.tipo === 'todas' ? undefined : (query.data.tipo as 'debito' | 'credito')
    const ativo = query.data.ativo === 'true' ? true : query.data.ativo === 'false' ? false : undefined
    const rows = await taxasCartaoService.list({ tipo, ativo })
    return res.json(rows.map(toJson))
  },

  async getById(req: Request, res: Response) {
    const row = await taxasCartaoService.getById(String(req.params.id))
    if (!row) return res.status(404).json({ error: 'Taxa nao encontrada.' })
    return res.json(toJson(row))
  },

  async getByModalidade(req: Request, res: Response) {
    const tipoCartao = String(req.query.tipoCartao ?? '')
    const quantidadeParcelas = Number(req.query.quantidadeParcelas ?? 1)
    if (!tipoCartao || !['debito', 'credito'].includes(tipoCartao)) {
      return res.status(400).json({ error: 'tipoCartao invalido (debito ou credito).' })
    }
    if (quantidadeParcelas < 1 || quantidadeParcelas > 12) {
      return res.status(400).json({ error: 'quantidadeParcelas deve ser entre 1 e 12.' })
    }
    const row = await taxasCartaoService.findByModalidade(tipoCartao, quantidadeParcelas)
    if (!row) return res.status(404).json({ error: 'Nao existe taxa configurada para esta modalidade de cartao.' })
    return res.json(toJson(row))
  },

  async create(req: Request, res: Response) {
    const parsed = createTaxaCartaoSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    try {
      const created = await taxasCartaoService.create(parsed.data)
      return res.status(201).json(toJson(created))
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao criar taxa.' })
    }
  },

  async update(req: Request, res: Response) {
    const parsed = updateTaxaCartaoSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    try {
      const updated = await taxasCartaoService.update(String(req.params.id), parsed.data)
      return res.json(toJson(updated))
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao atualizar taxa.' })
    }
  },

  async toggleAtivo(req: Request, res: Response) {
    try {
      const updated = await taxasCartaoService.toggleAtivo(String(req.params.id))
      return res.json(toJson(updated))
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao alterar status.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await taxasCartaoService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir taxa.' })
    }
  },
}
