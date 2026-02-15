import type { Boleto } from '../../types'

export type CompraOrigem = 'manual' | 'xml_nfe'
export type FiltroNf = 'todas' | 'com_nf' | 'sem_nf'
export type FiltroStatusPagamento = 'todos' | 'sem_contas' | 'pendente' | 'pago'

export interface Fornecedor {
  id: string
  cnpj?: string
  razaoSocial: string
  criadoEm: string
  atualizadoEm: string
}

export interface CompraItem {
  id: string
  compraId: string
  descricao: string
  ncm?: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

export interface CompraDocumento {
  id: string
  compraId: string
  tipo: 'xml_nfe' | 'anexo'
  nomeArquivo: string
  conteudo: string
  chaveAcesso?: string
  criadoEm: string
}

export interface Compra {
  id: string
  fornecedorId: string
  fornecedorNome: string
  fornecedorCnpj?: string
  dataEmissao: string
  competenciaMes: string
  descricao: string
  observacoes: string
  valorTotal: number
  categoria?: string
  centroCusto?: string
  temNotaFiscal: boolean
  origem: CompraOrigem
  nfeNumero?: string
  nfeSerie?: string
  nfeChaveAcesso?: string
  destinatarioNome?: string
  destinatarioCnpj?: string
  totalProdutos?: number
  totalNotaFiscal?: number
  totalImpostos?: number
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface ImportacaoXmlLog {
  id: string
  dataHora: string
  usuario: string
  sucesso: boolean
  chaveAcesso?: string
  compraId?: string
  mensagem: string
}

export interface NFeDuplicata {
  numero?: string
  vencimento: string
  valor: number
}

export interface NFeItem {
  descricao: string
  ncm?: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

export interface NFeParsed {
  chaveAcesso?: string
  numero?: string
  serie?: string
  dataEmissao: string
  emitenteNome: string
  emitenteCnpj?: string
  destinatarioNome?: string
  destinatarioCnpj?: string
  naturezaOperacao?: string
  itens: NFeItem[]
  totalProdutos: number
  totalNotaFiscal: number
  totalImpostos?: number
  duplicatas: NFeDuplicata[]
}

export interface CompraComRelacionamentos {
  compra: Compra
  itens: CompraItem[]
  documentos: CompraDocumento[]
  contasPagar: Boleto[]
}

export interface FiltrosCompra {
  mesCompetencia?: string
  fornecedor?: string
  tipoNota?: FiltroNf
  statusPagamento?: FiltroStatusPagamento
}

export interface KpisCompras {
  totalMes: number
  totalComNf: number
  totalSemNf: number
  percentualComNf: number
  percentualSemNf: number
  contasPagarGeradas: number
  contasPagarPendentes: number
  contasPagarPagas: number
}
