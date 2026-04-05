import type { ContaBanco } from '../types'
import { USING_BACKEND, request } from './apiHelper'
import { storageContas } from './storage'

export const contasBancoGateway = {
  usingBackend: USING_BACKEND,

  async getAll(): Promise<ContaBanco[]> {
    if (USING_BACKEND) return request<ContaBanco[]>('/api/contas-banco')
    return storageContas.getAll()
  },

  async getById(id: string): Promise<ContaBanco | undefined> {
    if (USING_BACKEND) {
      try {
        return await request<ContaBanco>(`/api/contas-banco/${id}`)
      } catch {
        return undefined
      }
    }
    return storageContas.getById(id)
  },

  async save(conta: ContaBanco): Promise<ContaBanco> {
    if (USING_BACKEND) {
      const existing = await this.getById(conta.id)
      if (existing) {
        return request<ContaBanco>(`/api/contas-banco/${conta.id}`, {
          method: 'PUT',
          body: JSON.stringify(conta),
        })
      }
      return request<ContaBanco>('/api/contas-banco', {
        method: 'POST',
        body: JSON.stringify(conta),
      })
    }
    return storageContas.save(conta)
  },

  async delete(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/contas-banco/${id}`, { method: 'DELETE' })
      return
    }
    storageContas.delete(id)
  },
}
