import { prisma } from '../../infra/prismaClient'
import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import type { createBoletoSchema, updateBoletoSchema } from './schemas'

type CreateInput = z.infer<typeof createBoletoSchema>
type UpdateInput = z.infer<typeof updateBoletoSchema>
type Tx = Prisma.TransactionClient

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: Number(row.valor),
    vencimento: row.vencimento,
    pago: row.pago,
    dataPagamento: row.dataPagamento ?? undefined,
    origemPagamento: row.origemPagamento ?? undefined,
    contaBancoId: row.contaBancoId ?? undefined,
    compraId: row.compraId ?? undefined,
    criadoEm: row.criadoEm,
  }
}

async function reverterMovimentacoesBoleto(tx: Tx, boletoId: string) {
  const movs = await tx.movimentacaoBancaria.findMany({ where: { boletoId } })
  for (const m of movs) {
    await tx.contaBanco.update({
      where: { id: m.contaBancoId },
      data: { saldoAtual: { increment: m.valor } },
    })
  }
  await tx.movimentacaoBancaria.deleteMany({ where: { boletoId } })
}

export const boletosService = {
  async list() {
    const rows = await prisma.boleto.findMany({ orderBy: { criadoEm: 'desc' } })
    return rows.map(toJson)
  },

  async getById(id: string) {
    const row = await prisma.boleto.findUnique({ where: { id } })
    return row ? toJson(row) : null
  },

  async getPendentes() {
    const rows = await prisma.boleto.findMany({ where: { pago: false }, orderBy: { vencimento: 'asc' } })
    return rows.map(toJson)
  },

  async getPagos() {
    const rows = await prisma.boleto.findMany({ where: { pago: true }, orderBy: { dataPagamento: 'desc' } })
    return rows.map(toJson)
  },

  async create(input: CreateInput) {
    return prisma.boleto.create({
      data: {
        id: input.id ?? crypto.randomUUID(),
        descricao: input.descricao,
        valor: input.valor,
        vencimento: input.vencimento,
        pago: input.pago,
        dataPagamento: input.dataPagamento ?? null,
        origemPagamento: input.origemPagamento ?? null,
        contaBancoId: input.contaBancoId ?? null,
        compraId: input.compraId ?? null,
      },
    }).then(toJson)
  },

  async update(id: string, input: UpdateInput) {
    const existing = await prisma.boleto.findUnique({ where: { id } })
    if (!existing) throw new Error('Boleto nao encontrado.')
    return prisma.boleto.update({
      where: { id },
      data: {
        ...(input.descricao !== undefined && { descricao: input.descricao }),
        ...(input.valor !== undefined && { valor: input.valor }),
        ...(input.vencimento !== undefined && { vencimento: input.vencimento }),
        ...(input.pago !== undefined && { pago: input.pago }),
        ...(input.dataPagamento !== undefined && { dataPagamento: input.dataPagamento ?? null }),
        ...(input.origemPagamento !== undefined && { origemPagamento: input.origemPagamento ?? null }),
        ...(input.contaBancoId !== undefined && { contaBancoId: input.contaBancoId ?? null }),
        ...(input.compraId !== undefined && { compraId: input.compraId ?? null }),
      },
    }).then(toJson)
  },

  async registrarBaixa(id: string, origem: 'dinheiro' | 'conta_banco', contaBancoId?: string) {
    return prisma.$transaction(async (tx) => {
      const boleto = await tx.boleto.findUnique({ where: { id } })
      if (!boleto) throw new Error('Boleto nao encontrado.')
      if (boleto.pago) throw new Error('Boleto ja esta pago.')

      const dataPagamento = new Date().toISOString().slice(0, 10)

      const updated = await tx.boleto.update({
        where: { id },
        data: {
          pago: true,
          dataPagamento,
          origemPagamento: origem,
          contaBancoId: contaBancoId ?? null,
        },
      })

      if (origem === 'conta_banco' && contaBancoId) {
        await tx.movimentacaoBancaria.create({
          data: {
            id: crypto.randomUUID(),
            contaBancoId,
            tipo: 'saida',
            valor: boleto.valor,
            descricao: `Pagamento boleto: ${boleto.descricao}`,
            boletoId: id,
            data: dataPagamento,
          },
        })
        await tx.contaBanco.update({
          where: { id: contaBancoId },
          data: { saldoAtual: { decrement: boleto.valor } },
        })
      }

      return toJson(updated)
    })
  },

  async reverterBaixa(id: string) {
    return prisma.$transaction(async (tx) => {
      const boleto = await tx.boleto.findUnique({ where: { id } })
      if (!boleto) throw new Error('Boleto nao encontrado.')
      if (!boleto.pago) throw new Error('Boleto nao esta pago.')

      if (boleto.origemPagamento === 'conta_banco' && boleto.contaBancoId) {
        await reverterMovimentacoesBoleto(tx, id)
      }

      const updated = await tx.boleto.update({
        where: { id },
        data: {
          pago: false,
          dataPagamento: null,
          origemPagamento: null,
          contaBancoId: null,
        },
      })
      return toJson(updated)
    })
  },

  async delete(id: string) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.boleto.findUnique({ where: { id } })
      if (!existing) throw new Error('Boleto nao encontrado.')
      if (existing.pago && existing.origemPagamento === 'conta_banco' && existing.contaBancoId) {
        await reverterMovimentacoesBoleto(tx, id)
      }
      await tx.movimentacaoBancaria.deleteMany({ where: { boletoId: id } })
      await tx.boleto.delete({ where: { id } })
    })
  },

  async saveAll(boletos: CreateInput[]) {
    const ops = boletos.map((b) =>
      prisma.boleto.upsert({
        where: { id: b.id ?? '' },
        update: {
          descricao: b.descricao,
          valor: b.valor,
          vencimento: b.vencimento,
          pago: b.pago,
          dataPagamento: b.dataPagamento ?? null,
          origemPagamento: b.origemPagamento ?? null,
          contaBancoId: b.contaBancoId ?? null,
          compraId: b.compraId ?? null,
        },
        create: {
          id: b.id ?? crypto.randomUUID(),
          descricao: b.descricao,
          valor: b.valor,
          vencimento: b.vencimento,
          pago: b.pago,
          dataPagamento: b.dataPagamento ?? null,
          origemPagamento: b.origemPagamento ?? null,
          contaBancoId: b.contaBancoId ?? null,
          compraId: b.compraId ?? null,
        },
      })
    )
    await prisma.$transaction(ops)
  },
}
