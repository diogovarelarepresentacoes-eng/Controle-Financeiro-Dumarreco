import type { Venda } from '../types'
import { USING_BACKEND, request } from './apiHelper'
import { storageVendas, registrarVenda as localRegistrarVenda, atualizarVenda as localAtualizarVenda, excluirVenda as localExcluirVenda, getSaldoDinheiro as localGetSaldoDinheiro } from './storage'

export const vendasGateway = {
  usingBackend: USING_BACKEND,

  async getAll(): Promise<Venda[]> {
    if (USING_BACKEND) return request<Venda[]>('/api/vendas')
    return storageVendas.getAll()
  },

  async getById(id: string): Promise<Venda | undefined> {
    if (USING_BACKEND) {
      try {
        return await request<Venda>(`/api/vendas/${id}`)
      } catch {
        return undefined
      }
    }
    return storageVendas.getById(id)
  },

  async registrar(venda: Venda): Promise<Venda> {
    if (USING_BACKEND) {
      return request<Venda>('/api/vendas', {
        method: 'POST',
        body: JSON.stringify(venda),
      })
    }
    return localRegistrarVenda(venda)
  },

  async atualizar(venda: Venda): Promise<Venda> {
    if (USING_BACKEND) {
      return request<Venda>(`/api/vendas/${venda.id}`, {
        method: 'PUT',
        body: JSON.stringify(venda),
      })
    }
    return localAtualizarVenda(venda)
  },

  async excluir(vendaId: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/vendas/${vendaId}`, { method: 'DELETE' })
      return
    }
    localExcluirVenda(vendaId)
  },

  async save(venda: Venda): Promise<Venda> {
    if (USING_BACKEND) {
      const existing = await this.getById(venda.id)
      if (existing) return this.atualizar(venda)
      return this.registrar(venda)
    }
    return storageVendas.save(venda)
  },

  async delete(id: string): Promise<void> {
    return this.excluir(id)
  },

  getSaldoDinheiro: localGetSaldoDinheiro,
}
