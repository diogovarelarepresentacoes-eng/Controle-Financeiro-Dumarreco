import type { TipoPagamentoCartao } from '../types'

export interface ModalidadeCartao {
  value: string
  tipo: TipoPagamentoCartao
  parcelas: number
  label: string
}

export const MODALIDADES_CARTAO: ModalidadeCartao[] = [
  { value: 'debito_1', tipo: 'debito', parcelas: 1, label: 'Débito' },
  { value: 'credito_1', tipo: 'credito', parcelas: 1, label: 'Crédito 1x' },
  { value: 'credito_2', tipo: 'credito', parcelas: 2, label: 'Crédito 2x' },
  { value: 'credito_3', tipo: 'credito', parcelas: 3, label: 'Crédito 3x' },
  { value: 'credito_4', tipo: 'credito', parcelas: 4, label: 'Crédito 4x' },
  { value: 'credito_5', tipo: 'credito', parcelas: 5, label: 'Crédito 5x' },
  { value: 'credito_6', tipo: 'credito', parcelas: 6, label: 'Crédito 6x' },
  { value: 'credito_7', tipo: 'credito', parcelas: 7, label: 'Crédito 7x' },
  { value: 'credito_8', tipo: 'credito', parcelas: 8, label: 'Crédito 8x' },
  { value: 'credito_9', tipo: 'credito', parcelas: 9, label: 'Crédito 9x' },
  { value: 'credito_10', tipo: 'credito', parcelas: 10, label: 'Crédito 10x' },
  { value: 'credito_11', tipo: 'credito', parcelas: 11, label: 'Crédito 11x' },
  { value: 'credito_12', tipo: 'credito', parcelas: 12, label: 'Crédito 12x' },
]
