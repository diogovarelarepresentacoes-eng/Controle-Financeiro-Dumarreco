/**
 * Serviço centralizado para cálculo de taxas de cartão.
 * Arredondamento monetário com 2 casas decimais.
 */
export function calcularValorLiquidoCartao(
  valorBruto: number,
  taxaPercentual: number
): { valorTaxa: number; valorLiquido: number } {
  const valorTaxa = Math.round(valorBruto * (taxaPercentual / 100) * 100) / 100
  const valorLiquido = Math.round((valorBruto - valorTaxa) * 100) / 100
  return { valorTaxa, valorLiquido }
}
