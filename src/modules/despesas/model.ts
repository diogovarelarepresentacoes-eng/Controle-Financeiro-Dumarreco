export type CategoriaDespesa =
  | 'Agua'
  | 'Energia eletrica'
  | 'Internet'
  | 'Aluguel'
  | 'Folha de pagamento'
  | 'Fornecedores de material'
  | 'Manutencao de equipamentos'
  | 'Combustivel'
  | 'Impostos'
  | 'Contabilidade'
  | 'Marketing'
  | 'Transporte'
  | 'Outros'

export type TipoDespesa = 'fixa' | 'variavel'
export type StatusDespesa = 'pendente' | 'pago' | 'atrasado'
export type FormaPagamentoDespesa = 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'dinheiro'
export type PeriodicidadeDespesa = 'mensal' | 'semanal' | 'anual'

export interface Despesa {
  id: string
  descricao: string
  categoria: CategoriaDespesa
  tipo: TipoDespesa
  valor: number
  dataVencimento: string
  dataPagamento?: string
  status: StatusDespesa
  formaPagamento: FormaPagamentoDespesa
  fornecedor: string
  centroCusto: string
  observacoes: string
  recorrente: boolean
  periodicidade?: PeriodicidadeDespesa
  recorrenciaOrigemId?: string
  criadoEm: string
  atualizadoEm: string
}

export interface FiltrosDespesas {
  dataInicio?: string
  dataFim?: string
  categoria?: CategoriaDespesa | 'todas'
  status?: StatusDespesa | 'todos'
  busca?: string
}

export interface DashboardDespesas {
  totalDespesasMes: number
  totalPagoMes: number
  totalPendenteMes: number
  totalAtrasadoMes: number
  custoFixoMensal: number
  custoVariavelMensal: number
  totalProjetadoProximoMes: number
  categorias: Array<{
    categoria: CategoriaDespesa
    total: number
    percentualDoTotal: number
    alertaAcimaDe30: boolean
  }>
}

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  'Agua',
  'Energia eletrica',
  'Internet',
  'Aluguel',
  'Folha de pagamento',
  'Fornecedores de material',
  'Manutencao de equipamentos',
  'Combustivel',
  'Impostos',
  'Contabilidade',
  'Marketing',
  'Transporte',
  'Outros',
]

export const FORMAS_PAGAMENTO_DESPESA: FormaPagamentoDespesa[] = [
  'pix',
  'boleto',
  'transferencia',
  'cartao',
  'dinheiro',
]
