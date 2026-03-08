import { prisma } from '../../infra/prismaClient'
import { createTaxaCartaoSchema } from './schemas'
import type { z } from 'zod'

type CreateTaxaCartaoInput = z.infer<typeof createTaxaCartaoSchema>

export function calcularValorLiquidoCartao(
  valorBruto: number,
  taxaPercentual: number
): { valorTaxa: number; valorLiquido: number } {
  const valorTaxa = Math.round(valorBruto * (taxaPercentual / 100) * 100) / 100
  const valorLiquido = Math.round((valorBruto - valorTaxa) * 100) / 100
  return { valorTaxa, valorLiquido }
}

export const taxasCartaoService = {
  async list(filters?: { tipo?: 'debito' | 'credito' | 'todas'; ativo?: boolean }) {
    const where: Record<string, unknown> = {}
    if (filters?.tipo && filters.tipo !== 'todas') {
      where.tipoCartao = filters.tipo
    }
    if (filters?.ativo !== undefined) {
      where.ativo = filters.ativo
    }
    return prisma.taxaCartao.findMany({
      where,
      orderBy: [{ tipoCartao: 'asc' }, { quantidadeParcelas: 'asc' }],
    })
  },

  async getById(id: string) {
    return prisma.taxaCartao.findUnique({
      where: { id },
    })
  },

  async findByModalidade(tipoCartao: string, quantidadeParcelas: number) {
    return prisma.taxaCartao.findFirst({
      where: {
        tipoCartao,
        quantidadeParcelas,
        ativo: true,
      },
    })
  },

  async create(input: CreateTaxaCartaoInput) {
    const existing = await prisma.taxaCartao.findFirst({
      where: {
        tipoCartao: input.tipoCartao,
        quantidadeParcelas: input.quantidadeParcelas,
        ativo: true,
      },
    })
    if (existing) {
      throw new Error('Ja existe taxa ativa para esta modalidade (tipo + parcelas).')
    }
    return prisma.taxaCartao.create({
      data: {
        id: crypto.randomUUID(),
        descricao: input.descricao,
        tipoCartao: input.tipoCartao,
        quantidadeParcelas: input.quantidadeParcelas,
        taxaPercentual: input.taxaPercentual.toFixed(2),
        ativo: true,
      },
    })
  },

  async update(id: string, input: Partial<CreateTaxaCartaoInput>) {
    const existing = await prisma.taxaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Taxa nao encontrada.')

    const tipoCartao = input.tipoCartao ?? existing.tipoCartao
    const quantidadeParcelas = input.quantidadeParcelas ?? existing.quantidadeParcelas

    if (tipoCartao !== existing.tipoCartao || quantidadeParcelas !== existing.quantidadeParcelas) {
      const dup = await prisma.taxaCartao.findFirst({
        where: {
          tipoCartao,
          quantidadeParcelas,
          ativo: true,
          id: { not: id },
        },
      })
      if (dup) throw new Error('Ja existe taxa ativa para esta modalidade.')
    }

    return prisma.taxaCartao.update({
      where: { id },
      data: {
        ...(input.descricao !== undefined && { descricao: input.descricao }),
        ...(input.tipoCartao !== undefined && { tipoCartao: input.tipoCartao }),
        ...(input.quantidadeParcelas !== undefined && { quantidadeParcelas: input.quantidadeParcelas }),
        ...(input.taxaPercentual !== undefined && { taxaPercentual: input.taxaPercentual.toFixed(2) }),
      },
    })
  },

  async toggleAtivo(id: string) {
    const existing = await prisma.taxaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Taxa nao encontrada.')
    return prisma.taxaCartao.update({
      where: { id },
      data: { ativo: !existing.ativo },
    })
  },

  async delete(id: string) {
    const existing = await prisma.taxaCartao.findUnique({ where: { id } })
    if (!existing) throw new Error('Taxa nao encontrada.')
    await prisma.taxaCartao.delete({ where: { id } })
  },
}
