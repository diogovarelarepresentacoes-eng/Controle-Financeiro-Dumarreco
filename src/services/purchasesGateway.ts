import { comprasController } from '../modules/compras/controller'
import type { CompraComRelacionamentos, FiltrosCompra, KpisCompras } from '../modules/compras/model'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function normalizeCompraApi(row: any): CompraComRelacionamentos {
  return {
    compra: {
      id: row.id,
      fornecedorId: row.supplierId,
      fornecedorNome: row.supplier?.legalName ?? '',
      fornecedorCnpj: row.supplier?.cnpj ?? undefined,
      dataEmissao: String(row.issueDate).slice(0, 10),
      competenciaMes: row.competenceMonth,
      descricao: row.description ?? '',
      observacoes: row.notes ?? '',
      valorTotal: toNumber(row.totalAmount),
      categoria: row.category ?? undefined,
      centroCusto: row.costCenter ?? undefined,
      temNotaFiscal: Boolean(row.hasInvoice),
      origem: row.source,
      nfeNumero: row.nfeNumber ?? undefined,
      nfeSerie: row.nfeSeries ?? undefined,
      nfeChaveAcesso: row.nfeAccessKey ?? undefined,
      destinatarioNome: row.recipientName ?? undefined,
      destinatarioCnpj: row.recipientCnpj ?? undefined,
      totalProdutos: row.totalProducts != null ? toNumber(row.totalProducts) : undefined,
      totalNotaFiscal: row.totalInvoice != null ? toNumber(row.totalInvoice) : undefined,
      totalImpostos: row.totalTaxes != null ? toNumber(row.totalTaxes) : undefined,
      ativo: !row.deletedAt,
      criadoEm: row.createdAt,
      atualizadoEm: row.updatedAt,
    },
    itens: (row.items ?? []).map((i: any) => ({
      id: i.id,
      compraId: i.purchaseId,
      descricao: i.description,
      ncm: i.ncm ?? undefined,
      quantidade: toNumber(i.quantity),
      valorUnitario: toNumber(i.unitAmount),
      valorTotal: toNumber(i.totalAmount),
    })),
    documentos: (row.documents ?? []).map((d: any) => ({
      id: d.id,
      compraId: d.purchaseId,
      tipo: d.documentType,
      nomeArquivo: d.fileName,
      conteudo: d.fileContent,
      chaveAcesso: d.nfeAccessKey ?? undefined,
      criadoEm: d.createdAt,
    })),
    contasPagar: (row.payables ?? []).map((p: any) => ({
      id: p.id,
      compraId: p.purchaseId ?? undefined,
      descricao: p.description,
      valor: toNumber(p.amount),
      vencimento: String(p.dueDate).slice(0, 10),
      pago: p.status === 'paid',
      dataPagamento: p.paymentDate ? String(p.paymentDate).slice(0, 10) : undefined,
      origemPagamento: undefined,
      contaBancoId: undefined,
      criadoEm: p.createdAt,
    })),
  }
}

function computeKpis(mesCompetencia: string, lista: CompraComRelacionamentos[]): KpisCompras {
  const comprasMes = lista.filter((i) => i.compra.competenciaMes === mesCompetencia)
  const totalMes = comprasMes.reduce((s, c) => s + c.compra.valorTotal, 0)
  const totalComNf = comprasMes.filter((c) => c.compra.temNotaFiscal).reduce((s, c) => s + c.compra.valorTotal, 0)
  const totalSemNf = comprasMes.filter((c) => !c.compra.temNotaFiscal).reduce((s, c) => s + c.compra.valorTotal, 0)
  const contas = comprasMes.flatMap((c) => c.contasPagar)
  const contasPagarPagas = contas.filter((c) => c.pago).length
  const contasPagarPendentes = contas.filter((c) => !c.pago).length
  return {
    totalMes,
    totalComNf,
    totalSemNf,
    percentualComNf: totalMes > 0 ? (totalComNf / totalMes) * 100 : 0,
    percentualSemNf: totalMes > 0 ? (totalSemNf / totalMes) * 100 : 0,
    contasPagarGeradas: contas.length,
    contasPagarPendentes,
    contasPagarPagas,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error('API de compras nao configurada.')
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `Erro HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const purchasesGateway = {
  usingBackend: Boolean(API_BASE),
  async list(filtros: FiltrosCompra): Promise<CompraComRelacionamentos[]> {
    if (!API_BASE) return comprasController.listar(filtros)
    const params = new URLSearchParams()
    if (filtros.mesCompetencia) params.set('competenceMonth', filtros.mesCompetencia)
    if (filtros.fornecedor) params.set('supplier', filtros.fornecedor)
    if (filtros.tipoNota && filtros.tipoNota !== 'todas') params.set('withInvoice', filtros.tipoNota === 'com_nf' ? 'yes' : 'no')
    if (filtros.statusPagamento && filtros.statusPagamento !== 'todos') {
      const map: Record<string, string> = {
        sem_contas: 'without_payables',
        pendente: 'pending',
        pago: 'paid',
      }
      params.set('paymentStatus', map[filtros.statusPagamento] ?? 'all')
    }
    const rows = await request<any[]>(`/api/purchases?${params.toString()}`)
    return rows.map(normalizeCompraApi)
  },
  async detail(id: string): Promise<CompraComRelacionamentos | undefined> {
    if (!API_BASE) return comprasController.detalhar(id)
    const row = await request<any>(`/api/purchases/${id}`)
    return normalizeCompraApi(row)
  },
  async createManual(payload: Parameters<typeof comprasController.criarManual>[0]) {
    if (!API_BASE) return comprasController.criarManual(payload)
    return request('/api/purchases/manual', {
      method: 'POST',
      body: JSON.stringify({
        supplierName: payload.fornecedorNome,
        supplierCnpj: payload.fornecedorCnpj,
        issueDate: payload.dataEmissao,
        description: payload.descricao,
        notes: payload.observacoes,
        totalAmount: payload.valorTotal,
        category: payload.categoria,
        costCenter: payload.centroCusto,
        items: payload.itens?.map((i) => ({
          description: i.descricao,
          quantity: i.quantidade,
          unitAmount: i.valorUnitario,
          totalAmount: i.valorTotal,
        })),
      }),
    })
  },
  async importXml(xmlRaw: string, performedBy: string) {
    if (!API_BASE) return comprasController.importarXml(xmlRaw, performedBy)
    return request('/api/purchases/import-xml', {
      method: 'POST',
      body: JSON.stringify({ xmlRaw, performedBy }),
    })
  },
  async generatePayables(payload: Parameters<typeof comprasController.gerarContasPagarManual>[0]) {
    if (!API_BASE) return comprasController.gerarContasPagarManual(payload)
    return request(`/api/purchases/${payload.compraId}/generate-payables`, {
      method: 'POST',
      body: JSON.stringify({
        totalAmount: payload.valorTotal,
        installments: payload.parcelas,
        firstDueDate: payload.primeiroVencimento,
        descriptionBase: payload.descricaoBase,
      }),
    })
  },
  async remove(id: string) {
    if (!API_BASE) return comprasController.excluirCompra(id)
    return request(`/api/purchases/${id}`, { method: 'DELETE' })
  },
  async kpis(mesCompetencia: string, listaAtual?: CompraComRelacionamentos[]) {
    if (!API_BASE) return comprasController.kpisMensais(mesCompetencia)
    const lista = listaAtual ?? (await this.list({ mesCompetencia, tipoNota: 'todas', statusPagamento: 'todos' }))
    return computeKpis(mesCompetencia, lista)
  },
}
