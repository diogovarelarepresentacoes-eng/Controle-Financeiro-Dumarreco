import { prisma } from '../../infra/prismaClient'
import type { z } from 'zod'
import type { createVendaSchema } from './schemas'

type CreateInput = z.infer<typeof createVendaSchema>

function toJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: Number(row.valor),
    formaPagamento: row.formaPagamento,
    contaBancoId: row.contaBancoId ?? undefined,
    data: row.data,
    criadoEm: row.criadoEm,
    maquinaCartaoId: row.maquinaCartaoId ?? undefined,
    maquinaCartaoNome: row.maquinaCartaoNome ?? undefined,
    tipoPagamentoCartao: row.tipoPagamentoCartao ?? undefined,
    quantidadeParcelas: row.quantidadeParcelas ?? undefined,
    valorBruto: row.valorBruto != null ? Number(row.valorBruto) : undefined,
    taxaPercentualCartao: row.taxaPercentualCartao != null ? Number(row.taxaPercentualCartao) : undefined,
    valorTaxaCartao: row.valorTaxaCartao != null ? Number(row.valorTaxaCartao) : undefined,
    valorLiquido: row.valorLiquido != null ? Number(row.valorLiquido) : undefined,
    observacaoFinanceira: row.observacaoFinanceira ?? undefined,
  }
}

function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function valorParaMovimentacao(venda: CreateInput): number {
  if (venda.formaPagamento === 'cartao' && venda.valorLiquido != null) {
    return venda.valorLiquido
  }
  return venda.valor
}

function descricaoMovimentacao(venda: CreateInput): string {
  if (venda.formaPagamento === 'cartao' && venda.valorBruto != null && venda.valorTaxaCartao != null && venda.valorLiquido != null) {
    const tipo = venda.tipoPagamentoCartao === 'debito' ? 'DÉBITO' : `CRÉDITO ${venda.quantidadeParcelas ?? 1}x`
    const maq = venda.maquinaCartaoNome ? ` ${venda.maquinaCartaoNome}` : ''
    return `Venda: ${venda.descricao} (CARTÃO${maq} ${tipo}) | Bruto: ${formatMoney(venda.valorBruto)} | Taxa: ${formatMoney(venda.valorTaxaCartao)} | Líquido: ${formatMoney(venda.valorLiquido)}`
  }
  if (venda.formaPagamento === 'cheque') return `Venda: ${venda.descricao} (CHEQUE)`
  const forma = venda.formaPagamento === 'pix' ? 'PIX' : venda.formaPagamento === 'cartao' ? 'CARTÃO' : venda.formaPagamento.toUpperCase()
  return `Venda: ${venda.descricao} (${forma})`
}

function precisaMovimentacao(formaPagamento: string): boolean {
  return formaPagamento === 'pix' || formaPagamento === 'cartao' || formaPagamento === 'cheque'
}

async function criarMovimentacaoVenda(venda: CreateInput, vendaId: string, tx: typeof prisma) {
  if (!precisaMovimentacao(venda.formaPagamento) || !venda.contaBancoId) return
  const valor = valorParaMovimentacao(venda)
  await tx.movimentacaoBancaria.create({
    data: {
      id: crypto.randomUUID(),
      contaBancoId: venda.contaBancoId,
      tipo: 'entrada',
      valor,
      descricao: descricaoMovimentacao(venda),
      vendaId,
      data: venda.data,
    },
  })
  await tx.contaBanco.update({
    where: { id: venda.contaBancoId },
    data: { saldoAtual: { increment: valor } },
  })
}

async function reverterMovimentacoesVenda(vendaId: string, tx: typeof prisma) {
  const movs = await tx.movimentacaoBancaria.findMany({ where: { vendaId } })
  for (const m of movs) {
    await tx.contaBanco.update({
      where: { id: m.contaBancoId },
      data: { saldoAtual: { decrement: m.valor } },
    })
  }
  await tx.movimentacaoBancaria.deleteMany({ where: { vendaId } })
}

export const vendasService = {
  async list() {
    const rows = await prisma.venda.findMany({ orderBy: { criadoEm: 'desc' } })
    return rows.map(toJson)
  },

  async getById(id: string) {
    const row = await prisma.venda.findUnique({ where: { id } })
    return row ? toJson(row) : null
  },

  async registrar(input: CreateInput) {
    const vendaId = input.id ?? crypto.randomUUID()
    const venda = await prisma.$transaction(async (tx) => {
      const created = await tx.venda.create({
        data: {
          id: vendaId,
          descricao: input.descricao,
          valor: input.valor,
          formaPagamento: input.formaPagamento,
          contaBancoId: input.contaBancoId ?? null,
          data: input.data,
          maquinaCartaoId: input.maquinaCartaoId ?? null,
          maquinaCartaoNome: input.maquinaCartaoNome ?? null,
          tipoPagamentoCartao: input.tipoPagamentoCartao ?? null,
          quantidadeParcelas: input.quantidadeParcelas ?? null,
          valorBruto: input.valorBruto ?? null,
          taxaPercentualCartao: input.taxaPercentualCartao ?? null,
          valorTaxaCartao: input.valorTaxaCartao ?? null,
          valorLiquido: input.valorLiquido ?? null,
          observacaoFinanceira: input.observacaoFinanceira ?? null,
        },
      })
      await criarMovimentacaoVenda(input, vendaId, tx as unknown as typeof prisma)
      return created
    })
    return toJson(venda)
  },

  async atualizar(id: string, input: CreateInput) {
    const antiga = await prisma.venda.findUnique({ where: { id } })
    if (!antiga) throw new Error('Venda nao encontrada.')

    const venda = await prisma.$transaction(async (tx) => {
      if (precisaMovimentacao(antiga.formaPagamento as string) && antiga.contaBancoId) {
        await reverterMovimentacoesVenda(id, tx as unknown as typeof prisma)
      }

      const updated = await tx.venda.update({
        where: { id },
        data: {
          descricao: input.descricao,
          valor: input.valor,
          formaPagamento: input.formaPagamento,
          contaBancoId: input.contaBancoId ?? null,
          data: input.data,
          maquinaCartaoId: input.maquinaCartaoId ?? null,
          maquinaCartaoNome: input.maquinaCartaoNome ?? null,
          tipoPagamentoCartao: input.tipoPagamentoCartao ?? null,
          quantidadeParcelas: input.quantidadeParcelas ?? null,
          valorBruto: input.valorBruto ?? null,
          taxaPercentualCartao: input.taxaPercentualCartao ?? null,
          valorTaxaCartao: input.valorTaxaCartao ?? null,
          valorLiquido: input.valorLiquido ?? null,
          observacaoFinanceira: input.observacaoFinanceira ?? null,
        },
      })
      await criarMovimentacaoVenda(input, id, tx as unknown as typeof prisma)
      return updated
    })
    return toJson(venda)
  },

  async excluir(id: string) {
    const existente = await prisma.venda.findUnique({ where: { id } })
    if (!existente) throw new Error('Venda nao encontrada.')
    await prisma.$transaction(async (tx) => {
      if (precisaMovimentacao(existente.formaPagamento) && existente.contaBancoId) {
        await reverterMovimentacoesVenda(id, tx as unknown as typeof prisma)
      }
      await tx.venda.delete({ where: { id } })
    })
  },
}
