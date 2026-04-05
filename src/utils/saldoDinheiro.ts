import type { Venda, Boleto } from '../types'

interface DespesaLike {
  status: string
  origemPagamento?: string
  valor: number
}

export function computeSaldoDinheiro(
  vendas: Venda[],
  boletos: Boleto[],
  despesas: DespesaLike[],
): number {
  const entradas = vendas
    .filter((v) => v.formaPagamento === 'dinheiro')
    .reduce((s, v) => s + v.valor, 0)
  const saidasBoletos = boletos
    .filter((b) => b.pago && b.origemPagamento === 'dinheiro')
    .reduce((s, b) => s + b.valor, 0)
  const saidasDespesas = despesas
    .filter((d) => d.status === 'pago' && d.origemPagamento === 'dinheiro')
    .reduce((s, d) => s + d.valor, 0)
  return entradas - saidasBoletos - saidasDespesas
}
