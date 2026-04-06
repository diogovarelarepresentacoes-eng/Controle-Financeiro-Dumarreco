const API_BASE_RAW = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
export const API_BASE = API_BASE_RAW ?? ''
export const USING_BACKEND =
  import.meta.env.VITE_USE_BACKEND === 'true' || API_BASE_RAW !== undefined

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
