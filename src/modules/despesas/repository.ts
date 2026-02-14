import type { Despesa } from './model'

const KEY_DESPESAS = 'controle-financeiro-despesas'

function getRaw(): Despesa[] {
  try {
    const data = localStorage.getItem(KEY_DESPESAS)
    return data ? (JSON.parse(data) as Despesa[]) : []
  } catch {
    return []
  }
}

function saveRaw(list: Despesa[]): void {
  localStorage.setItem(KEY_DESPESAS, JSON.stringify(list))
}

function seedExemplos(): Despesa[] {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const nowIso = new Date().toISOString()
  const base = `${ano}-${mes}`
  const exemplos: Despesa[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Conta de energia da loja',
      categoria: 'Energia eletrica',
      tipo: 'fixa',
      valor: 1850,
      dataVencimento: `${base}-10`,
      status: 'pendente',
      formaPagamento: 'boleto',
      fornecedor: 'Concessionaria de Energia',
      centroCusto: 'Operacional',
      observacoes: '',
      recorrente: true,
      periodicidade: 'mensal',
      recorrenciaOrigemId: '',
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    },
    {
      id: crypto.randomUUID(),
      descricao: 'Frete de materiais',
      categoria: 'Transporte',
      tipo: 'variavel',
      valor: 920,
      dataVencimento: `${base}-08`,
      dataPagamento: `${base}-08`,
      status: 'pago',
      formaPagamento: 'pix',
      fornecedor: 'Transportadora Alpha',
      centroCusto: 'Logistica',
      observacoes: 'Entrega cimento e areia',
      recorrente: false,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    },
    {
      id: crypto.randomUUID(),
      descricao: 'Compra de material para revenda',
      categoria: 'Fornecedores de material',
      tipo: 'variavel',
      valor: 6500,
      dataVencimento: `${base}-05`,
      status: 'pendente',
      formaPagamento: 'transferencia',
      fornecedor: 'Distribuidora Construcao LTDA',
      centroCusto: 'Estoque',
      observacoes: 'Pedido #2034',
      recorrente: false,
      criadoEm: nowIso,
      atualizadoEm: nowIso,
    },
  ]
  return exemplos.map((d) => ({ ...d, recorrenciaOrigemId: d.recorrente ? d.id : undefined }))
}

export const despesasRepository = {
  ensureSeed: () => {
    const atual = getRaw()
    if (atual.length > 0) return
    saveRaw(seedExemplos())
  },
  getAll: getRaw,
  getById: (id: string) => getRaw().find((d) => d.id === id),
  saveAll: (list: Despesa[]) => saveRaw(list),
  save: (despesa: Despesa) => {
    const list = getRaw()
    const idx = list.findIndex((d) => d.id === despesa.id)
    if (idx >= 0) list[idx] = despesa
    else list.push(despesa)
    saveRaw(list)
    return despesa
  },
  delete: (id: string) => {
    const list = getRaw().filter((d) => d.id !== id)
    saveRaw(list)
  },
}
