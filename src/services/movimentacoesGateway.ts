import type { MovimentacaoBancaria } from '../types'
import { USING_BACKEND, request } from './apiHelper'
import { storageMovimentacoes } from './storage'

export const movimentacoesGateway = {
  usingBackend: USING_BACKEND,

  async getAll(): Promise<MovimentacaoBancaria[]> {
    if (USING_BACKEND) return request<MovimentacaoBancaria[]>('/api/movimentacoes')
    return storageMovimentacoes.getAll()
  },

  async getByConta(contaBancoId: string): Promise<MovimentacaoBancaria[]> {
    if (USING_BACKEND) return request<MovimentacaoBancaria[]>(`/api/movimentacoes/conta/${contaBancoId}`)
    return storageMovimentacoes.getByConta(contaBancoId)
  },

  async getByVendaId(vendaId: string): Promise<MovimentacaoBancaria[]> {
    if (USING_BACKEND) return request<MovimentacaoBancaria[]>(`/api/movimentacoes/venda/${vendaId}`)
    return storageMovimentacoes.getByVendaId(vendaId)
  },

  async add(mov: MovimentacaoBancaria): Promise<MovimentacaoBancaria> {
    if (USING_BACKEND) {
      return request<MovimentacaoBancaria>('/api/movimentacoes', {
        method: 'POST',
        body: JSON.stringify(mov),
      })
    }
    return storageMovimentacoes.add(mov)
  },

  async delete(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/movimentacoes/${id}`, { method: 'DELETE' })
      return
    }
    storageMovimentacoes.delete(id)
  },
}
