export interface MaquinaCartao {
  id: string
  nome: string
  adquirente: string
  descricao?: string
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxaMaquinaCartao {
  id: string
  maquinaCartaoId: string
  tipoCartao: 'debito' | 'credito'
  parcelas: number
  taxaPercentual: number
  ativo: boolean
  createdAt: string
  updatedAt: string
}

const KEY_MAQUINAS_CARTAO = 'controle-financeiro-maquinas-cartao'

const TAXAS_PADRAO: Omit<TaxaMaquinaCartao, 'id' | 'maquinaCartaoId' | 'createdAt' | 'updatedAt'>[] = [
  { tipoCartao: 'debito', parcelas: 1, taxaPercentual: 1.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 1, taxaPercentual: 2.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 2, taxaPercentual: 3.49, ativo: true },
  { tipoCartao: 'credito', parcelas: 3, taxaPercentual: 3.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 4, taxaPercentual: 4.49, ativo: true },
  { tipoCartao: 'credito', parcelas: 5, taxaPercentual: 4.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 6, taxaPercentual: 5.49, ativo: true },
  { tipoCartao: 'credito', parcelas: 7, taxaPercentual: 5.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 8, taxaPercentual: 6.49, ativo: true },
  { tipoCartao: 'credito', parcelas: 9, taxaPercentual: 6.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 10, taxaPercentual: 7.49, ativo: true },
  { tipoCartao: 'credito', parcelas: 11, taxaPercentual: 7.99, ativo: true },
  { tipoCartao: 'credito', parcelas: 12, taxaPercentual: 8.49, ativo: true },
]

const API_BASE_RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const API_BASE = API_BASE_RAW || 'http://localhost:3333'
const USING_BACKEND = Boolean(API_BASE_RAW)

interface LocalData {
  maquinas: MaquinaCartao[]
  taxas: TaxaMaquinaCartao[]
}

function getLocalData(): LocalData {
  try {
    const data = localStorage.getItem(KEY_MAQUINAS_CARTAO)
    if (data) {
      const parsed = JSON.parse(data) as LocalData
      return { maquinas: parsed.maquinas ?? [], taxas: parsed.taxas ?? [] }
    }
  } catch {
    // ignore
  }
  return { maquinas: [], taxas: [] }
}

function setLocalData(data: LocalData) {
  localStorage.setItem(KEY_MAQUINAS_CARTAO, JSON.stringify(data))
}

function ensureMaquinaPadraoLocal(): LocalData {
  let { maquinas, taxas } = getLocalData()
  if (maquinas.length === 0) {
    const now = new Date().toISOString()
    const maquinaPadrao: MaquinaCartao = {
      id: crypto.randomUUID(),
      nome: 'Stone',
      adquirente: 'Stone',
      descricao: 'Máquina padrão',
      ativo: true,
      createdAt: now,
      updatedAt: now,
    }
    maquinas = [maquinaPadrao]
    taxas = TAXAS_PADRAO.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      maquinaCartaoId: maquinaPadrao.id,
      createdAt: now,
      updatedAt: now,
    }))
    setLocalData({ maquinas, taxas })
  }
  return { maquinas, taxas }
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

export const maquinasCartaoGateway = {
  usingBackend: USING_BACKEND,

  async list(ativo?: boolean): Promise<MaquinaCartao[]> {
    if (USING_BACKEND) {
      const params = new URLSearchParams()
      if (ativo !== undefined) params.set('ativo', String(ativo))
      const rows = await request<MaquinaCartao[]>(`/api/maquinas-cartao?${params.toString()}`)
      return rows
    }
    const { maquinas } = ensureMaquinaPadraoLocal()
    if (ativo !== undefined) {
      return maquinas.filter((m) => m.ativo === ativo)
    }
    return maquinas
  },

  async getById(id: string): Promise<MaquinaCartao | null> {
    if (USING_BACKEND) {
      try {
        return await request<MaquinaCartao>(`/api/maquinas-cartao/${id}`)
      } catch {
        return null
      }
    }
    const { maquinas } = ensureMaquinaPadraoLocal()
    return maquinas.find((m) => m.id === id) ?? null
  },

  async getTaxaByModalidade(
    maquinaCartaoId: string,
    tipoCartao: 'debito' | 'credito',
    parcelas: number
  ): Promise<TaxaMaquinaCartao | null> {
    if (USING_BACKEND) {
      try {
        return await request<TaxaMaquinaCartao>(
          `/api/maquinas-cartao/${maquinaCartaoId}/modalidade?tipoCartao=${tipoCartao}&quantidadeParcelas=${parcelas}`
        )
      } catch {
        return null
      }
    }
    const { taxas } = ensureMaquinaPadraoLocal()
    const found = taxas.find(
      (t) =>
        t.maquinaCartaoId === maquinaCartaoId &&
        t.tipoCartao === tipoCartao &&
        t.parcelas === parcelas &&
        t.ativo
    )
    return found ?? null
  },

  async listTaxas(maquinaCartaoId: string): Promise<TaxaMaquinaCartao[]> {
    if (USING_BACKEND) {
      return request<TaxaMaquinaCartao[]>(`/api/maquinas-cartao/${maquinaCartaoId}/taxas`)
    }
    const { taxas } = ensureMaquinaPadraoLocal()
    return taxas.filter((t) => t.maquinaCartaoId === maquinaCartaoId)
  },

  async createMaquina(input: {
    nome: string
    adquirente: string
    descricao?: string
  }): Promise<MaquinaCartao> {
    if (USING_BACKEND) {
      return request<MaquinaCartao>('/api/maquinas-cartao', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    }
    const { maquinas, taxas } = ensureMaquinaPadraoLocal()
    const now = new Date().toISOString()
    const nova: MaquinaCartao = {
      id: crypto.randomUUID(),
      nome: input.nome,
      adquirente: input.adquirente,
      descricao: input.descricao,
      ativo: true,
      createdAt: now,
      updatedAt: now,
    }
    maquinas.push(nova)
    setLocalData({ maquinas, taxas })
    return nova
  },

  async updateMaquina(
    id: string,
    input: Partial<{ nome: string; adquirente: string; descricao?: string }>
  ): Promise<MaquinaCartao> {
    if (USING_BACKEND) {
      return request<MaquinaCartao>(`/api/maquinas-cartao/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })
    }
    const { maquinas, taxas } = getLocalData()
    const idx = maquinas.findIndex((m) => m.id === id)
    if (idx < 0) throw new Error('Máquina não encontrada.')
    const updated = { ...maquinas[idx], ...input, updatedAt: new Date().toISOString() }
    maquinas[idx] = updated
    setLocalData({ maquinas, taxas })
    return updated
  },

  async toggleAtivo(id: string): Promise<MaquinaCartao> {
    if (USING_BACKEND) {
      return request<MaquinaCartao>(`/api/maquinas-cartao/${id}/ativo`, {
        method: 'PATCH',
      })
    }
    const { maquinas, taxas } = getLocalData()
    const idx = maquinas.findIndex((m) => m.id === id)
    if (idx < 0) throw new Error('Máquina não encontrada.')
    maquinas[idx] = {
      ...maquinas[idx],
      ativo: !maquinas[idx].ativo,
      updatedAt: new Date().toISOString(),
    }
    setLocalData({ maquinas, taxas })
    return maquinas[idx]
  },

  async removeMaquina(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/maquinas-cartao/${id}`, { method: 'DELETE' })
      return
    }
    const { maquinas, taxas } = getLocalData()
    const filtered = maquinas.filter((m) => m.id !== id)
    const filteredTaxas = taxas.filter((t) => t.maquinaCartaoId !== id)
    if (filtered.length === maquinas.length) throw new Error('Máquina não encontrada.')
    setLocalData({ maquinas: filtered, taxas: filteredTaxas })
  },

  async createTaxa(
    maquinaCartaoId: string,
    input: { tipoCartao: 'debito' | 'credito'; parcelas: number; taxaPercentual: number }
  ): Promise<TaxaMaquinaCartao> {
    if (USING_BACKEND) {
      return request<TaxaMaquinaCartao>(`/api/maquinas-cartao/${maquinaCartaoId}/taxas`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    }
    const { maquinas, taxas } = getLocalData()
    const dup = taxas.find(
      (t) =>
        t.maquinaCartaoId === maquinaCartaoId &&
        t.tipoCartao === input.tipoCartao &&
        t.parcelas === input.parcelas &&
        t.ativo
    )
    if (dup) throw new Error('Já existe taxa ativa para esta modalidade nesta máquina.')
    const now = new Date().toISOString()
    const nova: TaxaMaquinaCartao = {
      id: crypto.randomUUID(),
      maquinaCartaoId,
      ...input,
      ativo: true,
      createdAt: now,
      updatedAt: now,
    }
    taxas.push(nova)
    setLocalData({ maquinas, taxas })
    return nova
  },

  async updateTaxa(
    maquinaCartaoId: string,
    taxaId: string,
    input: Partial<{ tipoCartao: 'debito' | 'credito'; parcelas: number; taxaPercentual: number }>
  ): Promise<TaxaMaquinaCartao> {
    if (USING_BACKEND) {
      return request<TaxaMaquinaCartao>(
        `/api/maquinas-cartao/${maquinaCartaoId}/taxas/${taxaId}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        }
      )
    }
    const { maquinas, taxas } = getLocalData()
    const idx = taxas.findIndex((t) => t.id === taxaId && t.maquinaCartaoId === maquinaCartaoId)
    if (idx < 0) throw new Error('Taxa não encontrada.')
    const updated = { ...taxas[idx], ...input, updatedAt: new Date().toISOString() }
    taxas[idx] = updated
    setLocalData({ maquinas, taxas })
    return updated
  },

  async removeTaxa(maquinaCartaoId: string, taxaId: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/maquinas-cartao/${maquinaCartaoId}/taxas/${taxaId}`, {
        method: 'DELETE',
      })
      return
    }
    const { maquinas, taxas } = getLocalData()
    const filtered = taxas.filter(
      (t) => !(t.id === taxaId && t.maquinaCartaoId === maquinaCartaoId)
    )
    if (filtered.length === taxas.length) throw new Error('Taxa não encontrada.')
    setLocalData({ maquinas, taxas: filtered })
  },
}
