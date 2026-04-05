import type { Request, Response } from 'express'
import { faturamentoMensalService } from './service'
import { saveFaturamentoSchema } from './schemas'

export const faturamentoMensalController = {
  async list(_req: Request, res: Response) {
    return res.json(await faturamentoMensalService.list())
  },

  async getByAnoMes(req: Request, res: Response) {
    const ano = Number(req.params.ano)
    const mes = Number(req.params.mes)
    if (isNaN(ano) || isNaN(mes)) {
      return res.status(400).json({ error: 'Ano e mes devem ser numeros.' })
    }
    const row = await faturamentoMensalService.getByAnoMes(ano, mes)
    if (!row) return res.status(404).json({ error: 'Faturamento nao encontrado.' })
    return res.json(row)
  },

  async save(req: Request, res: Response) {
    const parsed = saveFaturamentoSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload invalido.', details: parsed.error.flatten() })
    }
    try {
      const saved = await faturamentoMensalService.save(parsed.data)
      return res.json(saved)
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao salvar faturamento.' })
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await faturamentoMensalService.delete(String(req.params.id))
      return res.status(204).send()
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao excluir faturamento.' })
    }
  },
}
