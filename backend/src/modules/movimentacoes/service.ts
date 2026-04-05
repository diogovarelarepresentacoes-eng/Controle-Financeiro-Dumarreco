import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createMovimentacaoSchema } from './schemas'

type CreateInput = z.infer<typeof createMovimentacaoSchema>

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    contaBancoId: row.contaBancoId,
    tipo: row.tipo,
    valor: Number(row.valor),
    descricao: row.descricao,
    boletoId: row.boletoId ?? undefined,
    vendaId: row.vendaId ?? undefined,
    despesaId: row.despesaId ?? undefined,
    data: row.data,
  }
}

export const movimentacoesService = {
  async list() {
    const rows = await prisma.movimentacaoBancaria.findMany({ orderBy: { data: 'desc' } })
    return rows.map(toJson)
  },

  async getByConta(contaBancoId: string) {
    const rows = await prisma.movimentacaoBancaria.findMany({
      where: { contaBancoId },
      orderBy: { data: 'desc' },
    })
    return rows.map(toJson)
  },

  async getByVendaId(vendaId: string) {
    const rows = await prisma.movimentacaoBancaria.findMany({
      where: { vendaId },
    })
    return rows.map(toJson)
  },

  async create(input: CreateInput) {
    return prisma.movimentacaoBancaria.create({
      data: {
        id: input.id ?? crypto.randomUUID(),
        contaBancoId: input.contaBancoId,
        tipo: input.tipo,
        valor: input.valor,
        descricao: input.descricao,
        boletoId: input.boletoId ?? null,
        vendaId: input.vendaId ?? null,
        despesaId: input.despesaId ?? null,
        data: input.data,
      },
    }).then(toJson)
  },

  async delete(id: string) {
    const existing = await prisma.movimentacaoBancaria.findUnique({ where: { id } })
    if (!existing) throw new Error('Movimentacao nao encontrada.')
    await prisma.movimentacaoBancaria.delete({ where: { id } })
  },
}
