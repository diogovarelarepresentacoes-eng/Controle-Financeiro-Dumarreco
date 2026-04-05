import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createContaBancoSchema, updateContaBancoSchema } from './schemas'

type CreateInput = z.infer<typeof createContaBancoSchema>
type UpdateInput = z.infer<typeof updateContaBancoSchema>

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    nome: row.nome,
    banco: row.banco,
    agencia: row.agencia,
    conta: row.conta,
    saldoInicial: Number(row.saldoInicial),
    saldoAtual: Number(row.saldoAtual),
    formasAceitas: row.formasAceitas,
    ativo: row.ativo,
    criadoEm: row.criadoEm,
  }
}

export const contasBancoService = {
  async list() {
    const rows = await prisma.contaBanco.findMany({ orderBy: { nome: 'asc' } })
    return rows.map(toJson)
  },

  async getById(id: string) {
    const row = await prisma.contaBanco.findUnique({ where: { id } })
    return row ? toJson(row) : null
  },

  async create(input: CreateInput) {
    return prisma.contaBanco.create({
      data: {
        id: crypto.randomUUID(),
        nome: input.nome,
        banco: input.banco,
        agencia: input.agencia,
        conta: input.conta,
        saldoInicial: input.saldoInicial,
        saldoAtual: input.saldoAtual,
        formasAceitas: input.formasAceitas,
        ativo: input.ativo,
      },
    }).then(toJson)
  },

  async update(id: string, input: UpdateInput) {
    const existing = await prisma.contaBanco.findUnique({ where: { id } })
    if (!existing) throw new Error('Conta nao encontrada.')
    return prisma.contaBanco.update({
      where: { id },
      data: {
        ...(input.nome !== undefined && { nome: input.nome }),
        ...(input.banco !== undefined && { banco: input.banco }),
        ...(input.agencia !== undefined && { agencia: input.agencia }),
        ...(input.conta !== undefined && { conta: input.conta }),
        ...(input.saldoInicial !== undefined && { saldoInicial: input.saldoInicial }),
        ...(input.saldoAtual !== undefined && { saldoAtual: input.saldoAtual }),
        ...(input.formasAceitas !== undefined && { formasAceitas: input.formasAceitas }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
      },
    }).then(toJson)
  },

  async delete(id: string) {
    const existing = await prisma.contaBanco.findUnique({ where: { id } })
    if (!existing) throw new Error('Conta nao encontrada.')
    await prisma.contaBanco.delete({ where: { id } })
  },
}
