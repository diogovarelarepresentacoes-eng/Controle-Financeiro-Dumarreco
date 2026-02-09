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

/** Forma de pagamento na venda: PIX, dinheiro, débito, crédito */
export type FormaPagamentoVenda = 'pix' | 'dinheiro' | 'debito' | 'credito';

export interface Venda {
  id: string;
  descricao: string;
  valor: number;
  formaPagamento: FormaPagamentoVenda;
  /** Conta que recebeu (obrigatório para PIX, débito e crédito) */
  contaBancoId?: string;
  data: string;
  criadoEm: string;
}

/** Dados mensais para acompanhamento de faturamento (igual à planilha). Inventário e opcionais pelo usuário; faturamento, venda cartão e despesas vêm do sistema. */
export interface FaturamentoMensal {
  id: string;
  ano: number;
  mes: number; // 1-12
  /** Inventário no início do mês (usuário) */
  valorInventarioInicio: number;
  /** Inventário no final do mês (usuário) */
  valorInventarioFim: number;
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
