const API_BASE_RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const API_BASE = API_BASE_RAW || 'http://localhost:3333'
const USING_BACKEND = Boolean(API_BASE)

export type Product = {
  id: string
  code: string
  description: string
  priceInstallment: string | number
  stockBalance: string | number
  unit: string | null
  isActive: boolean
}

type RequestInitSafe = RequestInit & { skipJson?: boolean }

async function request<T>(path: string, init?: RequestInitSafe): Promise<T> {
  if (!USING_BACKEND) throw new Error('API backend nao configurada (VITE_API_BASE_URL).')
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const details = body?.details as { fieldErrors?: Record<string, string[]> } | undefined
    const firstFieldError = details?.fieldErrors
      ? Object.values(details.fieldErrors).flat().find(Boolean)
      : null
    const msg = body?.error ?? `Erro HTTP ${response.status}`
    throw new Error(typeof firstFieldError === 'string' ? `${msg}: ${firstFieldError}` : msg)
  }
  if (init?.skipJson) return undefined as T
  return (await response.json()) as T
}

export const productsGateway = {
  usingBackend: USING_BACKEND,
  async list(search: string, page = 1, limit = 50) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', String(page))
    params.set('limit', String(limit))
    return request<{ total: number; page: number; limit: number; items: Product[] }>(`/api/products?${params.toString()}`)
  },

  async search(q: string, limit = 8) {
    const params = new URLSearchParams()
    params.set('q', q)
    params.set('limit', String(limit))
    return request<{ items: Product[] }>(`/api/products/search?${params.toString()}`)
  },

  create(payload: { code: string; description: string; priceInstallment: number; stockBalance: number; unit?: string; isActive?: boolean }) {
    return request<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: { code: string; description: string; priceInstallment: number; stockBalance: number; unit?: string; isActive?: boolean }) {
    return request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  activate(id: string, isActive: boolean) {
    return request<Product>(`/api/products/${id}/activate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
  },

  async previewImport(file: File, type: 'products' | 'stock') {
    const form = new FormData()
    form.append('file', file)
    const path = type === 'products' ? '/api/products/import/preview' : '/api/stock/import/preview'
    return request<{ headers: string[]; previewRows: Record<string, unknown>[]; suggestedMapping: Record<string, string | null> }>(path, {
      method: 'POST',
      body: form,
    })
  },

  async importProducts(file: File, options: unknown) {
    const form = new FormData()
    form.append('file', file)
    form.append('options', JSON.stringify(options))
    return request<{ jobId: string; totals: Record<string, number> }>('/api/products/import', {
      method: 'POST',
      body: form,
    })
  },

  async importStock(file: File, options: unknown) {
    const form = new FormData()
    form.append('file', file)
    form.append('options', JSON.stringify(options))
    return request<{ jobId: string; totals: Record<string, number> }>('/api/stock/import', {
      method: 'POST',
      body: form,
    })
  },

  listImportJobs(limit = 100) {
    return request<Array<{ id: string; type: string; status: string; fileName: string; createdAt: string; finishedAt?: string }>>(
      `/api/import-jobs?limit=${limit}`
    )
  },
}
