import type { ContaBanco, Boleto, MovimentacaoBancaria, Venda, FaturamentoMensal } from '../types';

const KEY_CONTAS = 'controle-financeiro-contas';
const KEY_BOLETOS = 'controle-financeiro-boletos';
const KEY_MOVIMENTACOES = 'controle-financeiro-movimentacoes';
const KEY_VENDAS = 'controle-financeiro-vendas';
const KEY_FATURAMENTO_MENSAL = 'controle-financeiro-faturamento-mensal';

/** Remove todos os dados do sistema. */
export function zerarBancoDeDados(): void {
  localStorage.removeItem(KEY_CONTAS);
  localStorage.removeItem(KEY_BOLETOS);
  localStorage.removeItem(KEY_MOVIMENTACOES);
  localStorage.removeItem(KEY_VENDAS);
  localStorage.removeItem(KEY_FATURAMENTO_MENSAL);
}

function getContas(): ContaBanco[] {
  try {
    const data = localStorage.getItem(KEY_CONTAS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setContas(contas: ContaBanco[]) {
  localStorage.setItem(KEY_CONTAS, JSON.stringify(contas));
}

function getBoletos(): Boleto[] {
  try {
    const data = localStorage.getItem(KEY_BOLETOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setBoletos(boletos: Boleto[]) {
  localStorage.setItem(KEY_BOLETOS, JSON.stringify(boletos));
}

function getMovimentacoes(): MovimentacaoBancaria[] {
  try {
    const data = localStorage.getItem(KEY_MOVIMENTACOES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setMovimentacoes(mov: MovimentacaoBancaria[]) {
  localStorage.setItem(KEY_MOVIMENTACOES, JSON.stringify(mov));
}

function getVendas(): Venda[] {
  try {
    const data = localStorage.getItem(KEY_VENDAS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setVendas(vendas: Venda[]) {
  localStorage.setItem(KEY_VENDAS, JSON.stringify(vendas));
}

function getFaturamentoMensal(): FaturamentoMensal[] {
  try {
    const data = localStorage.getItem(KEY_FATURAMENTO_MENSAL);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setFaturamentoMensal(list: FaturamentoMensal[]) {
  localStorage.setItem(KEY_FATURAMENTO_MENSAL, JSON.stringify(list));
}

export const storageFaturamentoMensal = {
  getAll: getFaturamentoMensal,
  getByAnoMes: (ano: number, mes: number) =>
    getFaturamentoMensal().find((f) => f.ano === ano && f.mes === mes),
  save: (item: FaturamentoMensal) => {
    const list = getFaturamentoMensal();
    const idx = list.findIndex((f) => f.id === item.id);
    const now = new Date().toISOString();
    const toSave = { ...item, atualizadoEm: now };
    if (!toSave.criadoEm) toSave.criadoEm = now;
    if (idx >= 0) list[idx] = toSave;
    else list.push(toSave);
    setFaturamentoMensal(list);
    return toSave;
  },
  delete: (id: string) => {
    setFaturamentoMensal(getFaturamentoMensal().filter((f) => f.id !== id));
  },
};

export const storageContas = {
  getAll: getContas,
  getById: (id: string) => getContas().find((c) => c.id === id),
  save: (conta: ContaBanco) => {
    const contas = getContas();
    const idx = contas.findIndex((c) => c.id === conta.id);
    if (idx >= 0) contas[idx] = conta;
    else contas.push(conta);
    setContas(contas);
    return conta;
  },
  delete: (id: string) => {
    setContas(getContas().filter((c) => c.id !== id));
  },
};

export const storageBoletos = {
  getAll: getBoletos,
  getById: (id: string) => getBoletos().find((b) => b.id === id),
  getPendentes: () => getBoletos().filter((b) => !b.pago),
  getPagos: () => getBoletos().filter((b) => b.pago),
  save: (boleto: Boleto) => {
    const boletos = getBoletos();
    const idx = boletos.findIndex((b) => b.id === boleto.id);
    if (idx >= 0) boletos[idx] = boleto;
    else boletos.push(boleto);
    setBoletos(boletos);
    return boleto;
  },
  delete: (id: string) => {
    setBoletos(getBoletos().filter((b) => b.id !== id));
  },
};

export const storageMovimentacoes = {
  getAll: getMovimentacoes,
  getByConta: (contaBancoId: string) =>
    getMovimentacoes().filter((m) => m.contaBancoId === contaBancoId),
  getByVendaId: (vendaId: string) =>
    getMovimentacoes().filter((m) => m.vendaId === vendaId),
  add: (mov: MovimentacaoBancaria) => {
    const list = getMovimentacoes();
    list.push(mov);
    setMovimentacoes(list);
    return mov;
  },
  delete: (id: string) => {
    setMovimentacoes(getMovimentacoes().filter((m) => m.id !== id));
  },
};

/** Saldo em dinheiro: vendas em dinheiro menos boletos pagos em dinheiro */
export function getSaldoDinheiro(): number {
  const entradas = getVendas()
    .filter((v) => v.formaPagamento === 'dinheiro')
    .reduce((s, v) => s + v.valor, 0);
  const saidas = getBoletos()
    .filter((b) => b.pago && b.origemPagamento === 'dinheiro')
    .reduce((s, b) => s + b.valor, 0);
  return entradas - saidas;
}

export const storageVendas = {
  getAll: getVendas,
  getById: (id: string) => getVendas().find((v) => v.id === id),
  save: (venda: Venda) => {
    const vendas = getVendas();
    const idx = vendas.findIndex((v) => v.id === venda.id);
    if (idx >= 0) vendas[idx] = venda;
    else vendas.push(venda);
    setVendas(vendas);
    return venda;
  },
  delete: (id: string) => {
    setVendas(getVendas().filter((v) => v.id !== id));
  },
};

function atualizarSaldoConta(contaId: string, valor: number, tipo: 'entrada' | 'saida') {
  const conta = storageContas.getById(contaId);
  if (!conta) return;
  const delta = tipo === 'entrada' ? valor : -valor;
  conta.saldoAtual += delta;
  storageContas.save(conta);
}

export function registrarBaixaBoleto(
  boleto: Boleto,
  origem: 'dinheiro' | 'conta_banco',
  contaBancoId?: string
) {
  const atualizado = { ...boleto, pago: true, dataPagamento: new Date().toISOString().slice(0, 10), origemPagamento: origem, contaBancoId };
  storageBoletos.save(atualizado);

  if (origem === 'conta_banco' && contaBancoId) {
    storageMovimentacoes.add({
      id: crypto.randomUUID(),
      contaBancoId,
      tipo: 'saida',
      valor: boleto.valor,
      descricao: `Pagamento boleto: ${boleto.descricao}`,
      boletoId: boleto.id,
      data: new Date().toISOString().slice(0, 10),
    });
    atualizarSaldoConta(contaBancoId, boleto.valor, 'saida');
  }
  return atualizado;
}

export function reverterBaixaBoleto(boleto: Boleto) {
  if (boleto.origemPagamento === 'conta_banco' && boleto.contaBancoId) {
    const conta = storageContas.getById(boleto.contaBancoId);
    if (conta) {
      conta.saldoAtual += boleto.valor;
      storageContas.save(conta);
    }
  }
  const revertido = { ...boleto, pago: false, dataPagamento: undefined, origemPagamento: undefined, contaBancoId: undefined };
  storageBoletos.save(revertido);
  return revertido;
}

/** Registra uma venda. Se PIX/débito/crédito com contaBancoId, credita na conta. */
export function registrarVenda(venda: Venda): Venda {
  storageVendas.save(venda);
  const formaCartaoOuPix = venda.formaPagamento === 'pix' || venda.formaPagamento === 'debito' || venda.formaPagamento === 'credito';
  if (formaCartaoOuPix && venda.contaBancoId) {
    storageMovimentacoes.add({
      id: crypto.randomUUID(),
      contaBancoId: venda.contaBancoId,
      tipo: 'entrada',
      valor: venda.valor,
      descricao: `Venda: ${venda.descricao} (${venda.formaPagamento.toUpperCase()})`,
      vendaId: venda.id,
      data: venda.data,
    });
    atualizarSaldoConta(venda.contaBancoId, venda.valor, 'entrada');
  }
  return venda;
}

/** Reverte o efeito da venda no saldo da conta (remove movimentação e estorna). */
function reverterMovimentacaoVenda(vendaId: string) {
  const movs = storageMovimentacoes.getByVendaId(vendaId);
  for (const m of movs) {
    atualizarSaldoConta(m.contaBancoId, m.valor, 'saida');
    storageMovimentacoes.delete(m.id);
  }
}

/** Atualiza uma venda existente: reverte movimentação antiga (se houver), salva e aplica nova. */
export function atualizarVenda(venda: Venda): Venda {
  const antiga = storageVendas.getById(venda.id);
  if (antiga) {
    const formaCartaoOuPixAntiga = antiga.formaPagamento === 'pix' || antiga.formaPagamento === 'debito' || antiga.formaPagamento === 'credito';
    if (formaCartaoOuPixAntiga && antiga.contaBancoId) {
      reverterMovimentacaoVenda(antiga.id);
    }
  }
  return registrarVenda(venda);
}
