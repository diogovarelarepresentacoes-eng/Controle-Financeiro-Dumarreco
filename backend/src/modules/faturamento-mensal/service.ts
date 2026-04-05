import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { saveFaturamentoSchema } from './schemas'

type SaveInput = z.infer<typeof saveFaturamentoSchema>

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    ano: row.ano,
    mes: row.mes,
    valorInventarioInicio: Number(row.valorInventarioInicio),
    usarInventarioInicioManual: row.usarInventarioInicioManual,
    valorInventarioFim: Number(row.valorInventarioFim),
    usarInventarioFimManual: row.usarInventarioFimManual,
    comprasDoMes: Number(row.comprasDoMes),
    compraSemNota: Number(row.compraSemNota),
    acordos: Number(row.acordos),
    mercadorias: Number(row.mercadorias),
    criadoEm: (row.criadoEm as Date).toISOString(),
    atualizadoEm: (row.atualizadoEm as Date).toISOString(),
  }
}

export const faturamentoMensalService = {
  async list() {
    const rows = await prisma.faturamentoMensal.findMany({ orderBy: [{ ano: 'desc' }, { mes: 'desc' }] })
    return rows.map(toJson)
  },

  async getByAnoMes(ano: number, mes: number) {
    const row = await prisma.faturamentoMensal.findUnique({ where: { ano_mes: { ano, mes } } })
    return row ? toJson(row) : null
  },

  async save(input: SaveInput) {
    const existing = input.id
      ? await prisma.faturamentoMensal.findUnique({ where: { id: input.id } })
      : await prisma.faturamentoMensal.findUnique({ where: { ano_mes: { ano: input.ano, mes: input.mes } } })

    if (existing) {
      return prisma.faturamentoMensal.update({
        where: { id: existing.id },
        data: {
          valorInventarioInicio: input.valorInventarioInicio,
          usarInventarioInicioManual: input.usarInventarioInicioManual,
          valorInventarioFim: input.valorInventarioFim,
          usarInventarioFimManual: input.usarInventarioFimManual,
          comprasDoMes: input.comprasDoMes,
          compraSemNota: input.compraSemNota,
          acordos: input.acordos,
          mercadorias: input.mercadorias,
        },
      }).then(toJson)
    }

    return prisma.faturamentoMensal.create({
      data: {
        id: input.id ?? crypto.randomUUID(),
        ano: input.ano,
        mes: input.mes,
        valorInventarioInicio: input.valorInventarioInicio,
        usarInventarioInicioManual: input.usarInventarioInicioManual,
        valorInventarioFim: input.valorInventarioFim,
        usarInventarioFimManual: input.usarInventarioFimManual,
        comprasDoMes: input.comprasDoMes,
        compraSemNota: input.compraSemNota,
        acordos: input.acordos,
        mercadorias: input.mercadorias,
      },
    }).then(toJson)
  },

  async delete(id: string) {
    const existing = await prisma.faturamentoMensal.findUnique({ where: { id } })
    if (!existing) throw new Error('Faturamento nao encontrado.')
    await prisma.faturamentoMensal.delete({ where: { id } })
  },
}
