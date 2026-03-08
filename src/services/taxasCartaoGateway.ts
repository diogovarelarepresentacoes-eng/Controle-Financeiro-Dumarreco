export interface TaxaCartao {
  id: string
  descricao: string
  tipoCartao: 'debito' | 'credito'
  quantidadeParcelas: number
  taxaPercentual: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

const KEY_TAXAS_CARTAO = 'controle-financeiro-taxas-cartao'

const TAXAS_PADRAO: Omit<TaxaCartao, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { descricao: 'Débito', tipoCartao: 'debito', quantidadeParcelas: 1, taxaPercentual: 1.99, ativo: true },
  { descricao: 'Crédito 1x', tipoCartao: 'credito', quantidadeParcelas: 1, taxaPercentual: 2.99, ativo: true },
  { descricao: 'Crédito 2x', tipoCartao: 'credito', quantidadeParcelas: 2, taxaPercentual: 3.49, ativo: true },
  { descricao: 'Crédito 3x', tipoCartao: 'credito', quantidadeParcelas: 3, taxaPercentual: 3.99, ativo: true },
  { descricao: 'Crédito 4x', tipoCartao: 'credito', quantidadeParcelas: 4, taxaPercentual: 4.49, ativo: true },
  { descricao: 'Crédito 5x', tipoCartao: 'credito', quantidadeParcelas: 5, taxaPercentual: 4.99, ativo: true },
  { descricao: 'Crédito 6x', tipoCartao: 'credito', quantidadeParcelas: 6, taxaPercentual: 5.49, ativo: true },
  { descricao: 'Crédito 7x', tipoCartao: 'credito', quantidadeParcelas: 7, taxaPercentual: 5.99, ativo: true },
  { descricao: 'Crédito 8x', tipoCartao: 'credito', quantidadeParcelas: 8, taxaPercentual: 6.49, ativo: true },
  { descricao: 'Crédito 9x', tipoCartao: 'credito', quantidadeParcelas: 9, taxaPercentual: 6.99, ativo: true },
  { descricao: 'Crédito 10x', tipoCartao: 'credito', quantidadeParcelas: 10, taxaPercentual: 7.49, ativo: true },
  { descricao: 'Crédito 11x', tipoCartao: 'credito', quantidadeParcelas: 11, taxaPercentual: 7.99, ativo: true },
  { descricao: 'Crédito 12x', tipoCartao: 'credito', quantidadeParcelas: 12, taxaPercentual: 8.49, ativo: true },
]

const API_BASE_RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const API_BASE = API_BASE_RAW || 'http://localhost:3333'
const USING_BACKEND = Boolean(API_BASE_RAW)

function getTaxasLocal(): TaxaCartao[] {
  try {
    const data = localStorage.getItem(KEY_TAXAS_CARTAO)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setTaxasLocal(taxas: TaxaCartao[]) {
  localStorage.setItem(KEY_TAXAS_CARTAO, JSON.stringify(taxas))
}

function ensureTaxasPadraoLocal(): TaxaCartao[] {
  let taxas = getTaxasLocal()
  if (taxas.length === 0) {
    const now = new Date().toISOString()
    taxas = TAXAS_PADRAO.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }))
    setTaxasLocal(taxas)
  }
  return taxas
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export const taxasCartaoGateway = {
  usingBackend: USING_BACKEND,

  async list(filtro?: { tipo?: 'debito' | 'credito' | 'todas'; ativo?: boolean }): Promise<TaxaCartao[]> {
    if (USING_BACKEND) {
      const params = new URLSearchParams()
      if (filtro?.tipo && filtro.tipo !== 'todas') params.set('tipo', filtro.tipo)
      if (filtro?.ativo !== undefined) params.set('ativo', String(filtro.ativo))
      const rows = await request<TaxaCartao[]>(`/api/taxas-cartao?${params.toString()}`)
      return rows
    }
    let taxas = ensureTaxasPadraoLocal()
    if (filtro?.tipo && filtro.tipo !== 'todas') {
      taxas = taxas.filter((t) => t.tipoCartao === filtro.tipo)
    }
    if (filtro?.ativo !== undefined) {
      taxas = taxas.filter((t) => t.ativo === filtro.ativo)
    }
    return taxas
  },

  async getByModalidade(tipoCartao: 'debito' | 'credito', quantidadeParcelas: number): Promise<TaxaCartao | null> {
    if (USING_BACKEND) {
      try {
        const row = await request<TaxaCartao>(
          `/api/taxas-cartao/modalidade?tipoCartao=${tipoCartao}&quantidadeParcelas=${quantidadeParcelas}`
        )
        return row
      } catch {
        return null
      }
    }
    const taxas = ensureTaxasPadraoLocal()
    const found = taxas.find(
      (t) => t.tipoCartao === tipoCartao && t.quantidadeParcelas === quantidadeParcelas && t.ativo
    )
    return found ?? null
  },

  async create(input: {
    descricao: string
    tipoCartao: 'debito' | 'credito'
    quantidadeParcelas: number
    taxaPercentual: number
  }): Promise<TaxaCartao> {
    if (USING_BACKEND) {
      return request<TaxaCartao>('/api/taxas-cartao', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    }
    const taxas = ensureTaxasPadraoLocal()
    const dup = taxas.find(
      (t) => t.tipoCartao === input.tipoCartao && t.quantidadeParcelas === input.quantidadeParcelas && t.ativo
    )
    if (dup) throw new Error('Já existe taxa ativa para esta modalidade.')
    const now = new Date().toISOString()
    const nova: TaxaCartao = {
      id: crypto.randomUUID(),
      ...input,
      ativo: true,
      createdAt: now,
      updatedAt: now,
    }
    taxas.push(nova)
    setTaxasLocal(taxas)
    return nova
  },

  async update(
    id: string,
    input: Partial<{ descricao: string; tipoCartao: 'debito' | 'credito'; quantidadeParcelas: number; taxaPercentual: number }>
  ): Promise<TaxaCartao> {
    if (USING_BACKEND) {
      return request<TaxaCartao>(`/api/taxas-cartao/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    }
    const taxas = ensureTaxasPadraoLocal()
    const idx = taxas.findIndex((t) => t.id === id)
    if (idx < 0) throw new Error('Taxa não encontrada.')
    const updated = { ...taxas[idx], ...input, updatedAt: new Date().toISOString() }
    taxas[idx] = updated
    setTaxasLocal(taxas)
    return updated
  },

  async toggleAtivo(id: string): Promise<TaxaCartao> {
    if (USING_BACKEND) {
      return request<TaxaCartao>(`/api/taxas-cartao/${id}/ativo`, {
        method: 'PATCH',
      })
    }
    const taxas = ensureTaxasPadraoLocal()
    const idx = taxas.findIndex((t) => t.id === id)
    if (idx < 0) throw new Error('Taxa não encontrada.')
    taxas[idx] = { ...taxas[idx], ativo: !taxas[idx].ativo, updatedAt: new Date().toISOString() }
    setTaxasLocal(taxas)
    return taxas[idx]
  },

  async remove(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/taxas-cartao/${id}`, { method: 'DELETE' })
      return
    }
    const taxas = getTaxasLocal().filter((t) => t.id !== id)
    setTaxasLocal(taxas)
  },
}
