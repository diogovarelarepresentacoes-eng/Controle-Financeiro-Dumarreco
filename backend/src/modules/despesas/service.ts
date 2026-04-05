import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createDespesaSchema, updateDespesaSchema } from './schemas'

type CreateInput = z.infer<typeof createDespesaSchema>
type UpdateInput = z.infer<typeof updateDespesaSchema>

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria,
    tipo: row.tipo,
    valor: Number(row.valor),
    dataVencimento: row.dataVencimento,
    dataPagamento: row.dataPagamento ?? undefined,
    status: row.status,
    formaPagamento: row.formaPagamento,
    origemPagamento: row.origemPagamento ?? undefined,
    contaBancoId: row.contaBancoId ?? undefined,
    fornecedor: row.fornecedor,
    centroCusto: row.centroCusto,
    observacoes: row.observacoes,
    recorrente: row.recorrente,
    periodicidade: row.periodicidade ?? undefined,
    recorrenciaOrigemId: row.recorrenciaOrigemId ?? undefined,
    criadoEm: (row.criadoEm as Date).toISOString(),
    atualizadoEm: (row.atualizadoEm as Date).toISOString(),
  }
}

export const despesasService = {
  async list() {
    const rows = await prisma.despesa.findMany({ orderBy: { criadoEm: 'desc' } })
    return rows.map(toJson)
  },

  async getById(id: string) {
    const row = await prisma.despesa.findUnique({ where: { id } })
    return row ? toJson(row) : null
  },

  async create(input: CreateInput) {
    return prisma.despesa.create({
      data: {
        id: input.id ?? crypto.randomUUID(),
        descricao: input.descricao,
        categoria: input.categoria,
        tipo: input.tipo,
        valor: input.valor,
        dataVencimento: input.dataVencimento,
        dataPagamento: input.dataPagamento ?? null,
        status: input.status,
        formaPagamento: input.formaPagamento,
        origemPagamento: input.origemPagamento ?? null,
        contaBancoId: input.contaBancoId ?? null,
        fornecedor: input.fornecedor,
        centroCusto: input.centroCusto,
        observacoes: input.observacoes,
        recorrente: input.recorrente,
        periodicidade: input.periodicidade ?? null,
        recorrenciaOrigemId: input.recorrenciaOrigemId ?? null,
      },
    }).then(toJson)
  },

  async update(id: string, input: UpdateInput) {
    const existing = await prisma.despesa.findUnique({ where: { id } })
    if (!existing) throw new Error('Despesa nao encontrada.')
    return prisma.despesa.update({
      where: { id },
      data: {
        ...(input.descricao !== undefined && { descricao: input.descricao }),
        ...(input.categoria !== undefined && { categoria: input.categoria }),
        ...(input.tipo !== undefined && { tipo: input.tipo }),
        ...(input.valor !== undefined && { valor: input.valor }),
        ...(input.dataVencimento !== undefined && { dataVencimento: input.dataVencimento }),
        ...(input.dataPagamento !== undefined && { dataPagamento: input.dataPagamento ?? null }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.formaPagamento !== undefined && { formaPagamento: input.formaPagamento }),
        ...(input.origemPagamento !== undefined && { origemPagamento: input.origemPagamento ?? null }),
        ...(input.contaBancoId !== undefined && { contaBancoId: input.contaBancoId ?? null }),
        ...(input.fornecedor !== undefined && { fornecedor: input.fornecedor }),
        ...(input.centroCusto !== undefined && { centroCusto: input.centroCusto }),
        ...(input.observacoes !== undefined && { observacoes: input.observacoes }),
        ...(input.recorrente !== undefined && { recorrente: input.recorrente }),
        ...(input.periodicidade !== undefined && { periodicidade: input.periodicidade ?? null }),
        ...(input.recorrenciaOrigemId !== undefined && { recorrenciaOrigemId: input.recorrenciaOrigemId ?? null }),
      },
    }).then(toJson)
  },

  async saveAll(list: CreateInput[]) {
    const ops = list.map((d) =>
      prisma.despesa.upsert({
        where: { id: d.id ?? '' },
        update: {
          descricao: d.descricao,
          categoria: d.categoria,
          tipo: d.tipo,
          valor: d.valor,
          dataVencimento: d.dataVencimento,
          dataPagamento: d.dataPagamento ?? null,
          status: d.status,
          formaPagamento: d.formaPagamento,
          origemPagamento: d.origemPagamento ?? null,
          contaBancoId: d.contaBancoId ?? null,
          fornecedor: d.fornecedor,
          centroCusto: d.centroCusto,
          observacoes: d.observacoes,
          recorrente: d.recorrente,
          periodicidade: d.periodicidade ?? null,
          recorrenciaOrigemId: d.recorrenciaOrigemId ?? null,
        },
        create: {
          id: d.id ?? crypto.randomUUID(),
          descricao: d.descricao,
          categoria: d.categoria,
          tipo: d.tipo,
          valor: d.valor,
          dataVencimento: d.dataVencimento,
          dataPagamento: d.dataPagamento ?? null,
          status: d.status,
          formaPagamento: d.formaPagamento,
          origemPagamento: d.origemPagamento ?? null,
          contaBancoId: d.contaBancoId ?? null,
          fornecedor: d.fornecedor,
          centroCusto: d.centroCusto,
          observacoes: d.observacoes,
          recorrente: d.recorrente,
          periodicidade: d.periodicidade ?? null,
          recorrenciaOrigemId: d.recorrenciaOrigemId ?? null,
        },
      })
    )
    await prisma.$transaction(ops)
  },

  async registrarPagamento(id: string, origemPagamento: 'dinheiro' | 'conta_banco', contaBancoId?: string, dataPagamento?: string) {
    const despesa = await prisma.despesa.findUnique({ where: { id } })
    if (!despesa) throw new Error('Despesa nao encontrada.')

    const data = dataPagamento ?? new Date().toISOString().slice(0, 10)
    const updated = await prisma.despesa.update({
      where: { id },
      data: {
        status: 'pago',
        dataPagamento: data,
        origemPagamento,
        contaBancoId: contaBancoId ?? null,
      },
    })

    if (origemPagamento === 'conta_banco' && contaBancoId) {
      await prisma.movimentacaoBancaria.create({
        data: {
          id: crypto.randomUUID(),
          contaBancoId,
          tipo: 'saida',
          valor: despesa.valor,
          descricao: `Despesa: ${despesa.descricao}`,
          despesaId: id,
          data,
        },
      })
      await prisma.contaBanco.update({
        where: { id: contaBancoId },
        data: { saldoAtual: { decrement: despesa.valor } },
      })
    }

    return toJson(updated)
  },

  async reverterPagamento(id: string) {
    const despesa = await prisma.despesa.findUnique({ where: { id } })
    if (!despesa) throw new Error('Despesa nao encontrada.')

    if (despesa.origemPagamento === 'conta_banco' && despesa.contaBancoId) {
      const movs = await prisma.movimentacaoBancaria.findMany({ where: { despesaId: id } })
      for (const m of movs) {
        await prisma.contaBanco.update({
          where: { id: m.contaBancoId },
          data: { saldoAtual: { increment: m.valor } },
        })
      }
      await prisma.movimentacaoBancaria.deleteMany({ where: { despesaId: id } })
    }

    const updated = await prisma.despesa.update({
      where: { id },
      data: {
        status: 'pendente',
        dataPagamento: null,
        origemPagamento: null,
        contaBancoId: null,
      },
    })
    return toJson(updated)
  },

  async delete(id: string) {
    const existing = await prisma.despesa.findUnique({ where: { id } })
    if (!existing) throw new Error('Despesa nao encontrada.')
    await prisma.movimentacaoBancaria.deleteMany({ where: { despesaId: id } })
    await prisma.despesa.delete({ where: { id } })
  },

  // Deleted recurrence markers
  async getDeletedRecurrenceMarkers() {
    return prisma.deletedRecurrenceMarker.findMany()
  },

  async addDeletedRecurrenceMarker(origemId: string, dataVencimento: string) {
    await prisma.deletedRecurrenceMarker.upsert({
      where: { origemId_dataVencimento: { origemId, dataVencimento } },
      update: {},
      create: {
        id: crypto.randomUUID(),
        origemId,
        dataVencimento,
      },
    })
  },

  async clearDeletedRecurrenceMarkersByOrigem(origemId: string) {
    await prisma.deletedRecurrenceMarker.deleteMany({ where: { origemId } })
  },
}
