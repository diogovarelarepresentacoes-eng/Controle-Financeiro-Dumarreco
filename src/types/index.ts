export type FormaPagamento = 'pix' | 'debito' | 'credito';

export interface ContaBanco {
  id: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  saldoInicial: number;
  saldoAtual: number;
  formasAceitas: FormaPagamento[];
  ativo: boolean;
  criadoEm: string;
}

export type OrigemPagamento = 'dinheiro' | 'conta_banco';

export interface Boleto {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;
  dataPagamento?: string;
  origemPagamento?: OrigemPagamento;
  contaBancoId?: string;
  /** Vinculo opcional com compra no modulo de compras */
  compraId?: string;
  criadoEm: string;
}

export interface MovimentacaoBancaria {
  id: string;
  contaBancoId: string;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  boletoId?: string;
  vendaId?: string;
  data: string;
}

/** Forma de pagamento na venda: PIX, dinheiro, cartão */
export type FormaPagamentoVenda = 'pix' | 'dinheiro' | 'cartao';

/** Tipo de cartão: débito ou crédito */
export type TipoPagamentoCartao = 'debito' | 'credito';

export interface Venda {
  id: string;
  descricao: string;
  /** Valor líquido para cartão; valor total para outros */
  valor: number;
  formaPagamento: FormaPagamentoVenda;
  /** Conta que recebeu (obrigatório para PIX e cartão) */
  contaBancoId?: string;
  data: string;
  criadoEm: string;
  /** Campos específicos de cartão (quando formaPagamento === 'cartao') */
  maquinaCartaoId?: string;
  /** Nome da máquina (snapshot para relatórios e descrição) */
  maquinaCartaoNome?: string;
  tipoPagamentoCartao?: TipoPagamentoCartao;
  quantidadeParcelas?: number;
  valorBruto?: number;
  taxaPercentualCartao?: number;
  valorTaxaCartao?: number;
  valorLiquido?: number;
  observacaoFinanceira?: string;
}

export interface MaquinaCartao {
  id: string;
  nome: string;
  adquirente: string;
  descricao?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaxaMaquinaCartao {
  id: string;
  maquinaCartaoId: string;
  tipoCartao: 'debito' | 'credito';
  parcelas: number;
  taxaPercentual: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Dados mensais para acompanhamento de faturamento (igual à planilha). Inventário e opcionais pelo usuário; faturamento, venda cartão e despesas vêm do sistema. */
export interface FaturamentoMensal {
  id: string;
  ano: number;
  mes: number; // 1-12
  /** Inventário no início do mês (usuário) */
  valorInventarioInicio: number;
  /** Se true, usa valorInventarioInicio manual; se false/undefined, calcula automático */
  usarInventarioInicioManual?: boolean;
  /** Inventário no final do mês (usuário) */
  valorInventarioFim: number;
  /** Se true, usa valorInventarioFim manual; se false/undefined, calcula automático */
  usarInventarioFimManual?: boolean;
  /** Compras no mês (usuário, opcional) */
  comprasDoMes: number;
  /** Compra s/ nota (usuário, opcional) */
  compraSemNota: number;
  /** Acordo (usuário, opcional) - entra no TOTAL = Fat + Acordo + Mercadoria */
  acordos: number;
  /** Mercadoria (usuário, opcional) */
  mercadorias: number;
  criadoEm: string;
  atualizadoEm: string;
}
