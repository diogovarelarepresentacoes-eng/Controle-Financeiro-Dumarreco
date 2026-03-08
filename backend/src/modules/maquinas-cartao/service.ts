import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createMaquinaCartaoSchema, updateMaquinaCartaoSchema, createTaxaMaquinaSchema, updateTaxaMaquinaSchema } from './schemas'

type CreateMaquinaInput = z.infer<typeof createMaquinaCartaoSchema>
type UpdateMaquinaInput = z.infer<typeof updateMaquinaCartaoSchema>
type CreateTaxaInput = z.infer<typeof createTaxaMaquinaSchema>
type UpdateTaxaInput = z.infer<typeof updateTaxaMaquinaSchema>

function toJsonMaquina(row: {
  id: string
  nome: string
  adquirente: string
  descricao: string | null
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    nome: row.nome,
    adquirente: row.adquirente,
    descricao: row.descricao,
    ativo: row.ativo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toJsonTaxa(row: {
  id: string
  maquinaCartaoId: string
  tipoCartao: string
  parcelas: number
  taxaPercentual: unknown
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: row.id,
    maquinaCartaoId: row.maquinaCartaoId,
    tipoCartao: row.tipoCartao,
    parcelas: row.parcelas,
    taxaPercentual: Number(row.taxaPercentual),
    ativo: row.ativo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const maquinasCartaoService = {
  async list(filters?: { ativo?: boolean }) {
    const where: Record<string, unknown> = {}
    if (filters?.ativo !== undefined) {
      where.ativo = filters.ativo
    }
    const rows = await prisma.maquinaCartao.findMany({
      where,
      orderBy: { nome: 'asc' },
    })
    return rows.map(toJsonMaquina)
  },

  async getById(id: string) {
    const row = await prisma.maquinaCartao.findUnique({
      where: { id },
    })
    return row ? toJsonMaquina(row) : null
  },

  async getByIdWithTaxas(id: string) {
    const row = await prisma.maquinaCartao.findUnique({
      where: { id },
      include: {
        taxas: {
          orderBy: [{ tipoCartao: 'asc' }, { parcelas: 'asc' }],
        },
      },
    })
    if (!row) return null
    return {
      ...toJsonMaquina(row),
      taxas: row.taxas.map(toJsonTaxa),
    }
  },

  async findByModalidade(maquinaCartaoId: string, tipoCartao: string, parcelas: number) {
    const row = await prisma.taxaMaquinaCartao.findFirst({
      where: {
        maquinaCartaoId,
        tipoCartao,
        parcelas,
        ativo: true,
      },
    })
    return row ? toJsonTaxa(row) : null
  },

  async createMaquina(input: CreateMaquinaInput) {
    return prisma.maquinaCartao.create({
      data: {
        id: crypto.randomUUID(),
        nome: input.nome,
        adquirente: input.adquirente,
        descricao: input.descricao ?? null,
        ativo: true,
      },
    }).then(toJsonMaquina)
  },

  async updateMaquina(id: string, input: UpdateMaquinaInput) {
    const existing = await prisma.maquinaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Maquina nao encontrada.')

    return prisma.maquinaCartao.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.adquirente !== undefined && { adquirente: input.adquirente }),
        ...(input.descricao !== undefined && { descricao: input.descricao }),
      },
    }).then(toJsonMaquina)
  },

  async toggleAtivo(id: string) {
    const existing = await prisma.maquinaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Maquina nao encontrada.')

    return prisma.maquinaCartao.update({
      where: { id },
      data: { ativo: !existing.ativo },
    }).then(toJsonMaquina)
  },

  async deleteMaquina(id: string) {
    const existing = await prisma.maquinaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Maquina nao encontrada.')
    await prisma.maquinaCartao.delete({ where: { id } })
  },

  async listTaxas(maquinaCartaoId: string) {
    const rows = await prisma.taxaMaquinaCartao.findMany({
      where: { maquinaCartaoId },
      orderBy: [{ tipoCartao: 'asc' }, { parcelas: 'asc' }],
    })
    return rows.map(toJsonTaxa)
  },

  async createTaxa(maquinaCartaoId: string, input: CreateTaxaInput) {
    const existing = await prisma.taxaMaquinaCartao.findFirst({
      where: {
        maquinaCartaoId,
        tipoCartao: input.tipoCartao,
        parcelas: input.parcelas,
        ativo: true,
      },
    })
    if (existing) {
      throw new Error('Ja existe taxa ativa para esta modalidade nesta maquina.')
    }

    return prisma.taxaMaquinaCartao.create({
      data: {
        id: crypto.randomUUID(),
        maquinaCartaoId,
        tipoCartao: input.tipoCartao,
        parcelas: input.parcelas,
        taxaPercentual: input.taxaPercentual.toFixed(2),
        ativo: true,
      },
    }).then(toJsonTaxa)
  },

  async updateTaxa(maquinaCartaoId: string, taxaId: string, input: UpdateTaxaInput) {
    const existing = await prisma.taxaMaquinaCartao.findUnique({
      where: { id: taxaId, maquinaCartaoId },
    })
    if (!existing) throw new Error('Taxa nao encontrada.')

    const tipoCartao = input.tipoCartao ?? existing.tipoCartao
    const parcelas = input.parcelas ?? existing.parcelas

    if (tipoCartao !== existing.tipoCartao || parcelas !== existing.parcelas) {
      const dup = await prisma.taxaMaquinaCartao.findFirst({
        where: {
          maquinaCartaoId,
          tipoCartao,
          parcelas,
          ativo: true,
          id: { not: taxaId },
        },
      })
      if (dup) throw new Error('Ja existe taxa ativa para esta modalidade nesta maquina.')
    }

    return prisma.taxaMaquinaCartao.update({
      where: { id: taxaId },
      data: {
        ...(input.tipoCartao !== undefined && { tipoCartao: input.tipoCartao }),
        ...(input.parcelas !== undefined && { parcelas: input.parcelas }),
        ...(input.taxaPercentual !== undefined && { taxaPercentual: input.taxaPercentual.toFixed(2) }),
      },
    }).then(toJsonTaxa)
  },

  async deleteTaxa(maquinaCartaoId: string, taxaId: string) {
    const existing = await prisma.taxaMaquinaCartao.findUnique({
      where: { id: taxaId, maquinaCartaoId },
    })
    if (!existing) throw new Error('Taxa nao encontrada.')
    await prisma.taxaMaquinaCartao.delete({ where: { id: taxaId } })
  },
}
