import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createBoletoSchema, updateBoletoSchema } from './schemas'

type CreateInput = z.infer<typeof createBoletoSchema>
type UpdateInput = z.infer<typeof updateBoletoSchema>

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
    const boleto = await prisma.boleto.findUnique({ where: { id } })
    if (!boleto) throw new Error('Boleto nao encontrado.')
    if (boleto.pago) throw new Error('Boleto ja esta pago.')

    const dataPagamento = new Date().toISOString().slice(0, 10)

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBoleto = await tx.boleto.update({
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

      return updatedBoleto
    })

    return toJson(updated)
  },

  async reverterBaixa(id: string) {
    const boleto = await prisma.boleto.findUnique({ where: { id } })
    if (!boleto) throw new Error('Boleto nao encontrado.')
    if (!boleto.pago) throw new Error('Boleto nao esta pago.')

    const updated = await prisma.$transaction(async (tx) => {
      if (boleto.origemPagamento === 'conta_banco' && boleto.contaBancoId) {
        await tx.movimentacaoBancaria.deleteMany({ where: { boletoId: id } })
        await tx.contaBanco.update({
          where: { id: boleto.contaBancoId },
          data: { saldoAtual: { increment: boleto.valor } },
        })
      }

      return tx.boleto.update({
        where: { id },
        data: {
          pago: false,
          dataPagamento: null,
          origemPagamento: null,
          contaBancoId: null,
        },
      })
    })

    return toJson(updated)
  },

  async delete(id: string) {
    const existing = await prisma.boleto.findUnique({ where: { id } })
    if (!existing) throw new Error('Boleto nao encontrado.')
    await prisma.$transaction([
      prisma.movimentacaoBancaria.deleteMany({ where: { boletoId: id } }),
      prisma.boleto.delete({ where: { id } }),
    ])
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
