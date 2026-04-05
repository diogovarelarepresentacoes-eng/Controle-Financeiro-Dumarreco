import type { FaturamentoMensal } from '../types'
import { USING_BACKEND, request } from './apiHelper'
import { storageFaturamentoMensal } from './storage'

export const faturamentoGateway = {
  usingBackend: USING_BACKEND,

  async getAll(): Promise<FaturamentoMensal[]> {
    if (USING_BACKEND) return request<FaturamentoMensal[]>('/api/faturamento-mensal')
    return storageFaturamentoMensal.getAll()
  },

  async getByAnoMes(ano: number, mes: number): Promise<FaturamentoMensal | undefined> {
    if (USING_BACKEND) {
      try {
        return await request<FaturamentoMensal>(`/api/faturamento-mensal/${ano}/${mes}`)
      } catch {
        return undefined
      }
    }
    return storageFaturamentoMensal.getByAnoMes(ano, mes)
  },

  async save(item: FaturamentoMensal): Promise<FaturamentoMensal> {
    if (USING_BACKEND) {
      return request<FaturamentoMensal>('/api/faturamento-mensal', {
        method: 'POST',
        body: JSON.stringify(item),
      })
    }
    return storageFaturamentoMensal.save(item)
  },

  async delete(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/faturamento-mensal/${id}`, { method: 'DELETE' })
      return
    }
    storageFaturamentoMensal.delete(id)
  },
}
