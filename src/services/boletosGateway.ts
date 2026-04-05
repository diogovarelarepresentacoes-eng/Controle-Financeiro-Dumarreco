import type { Boleto, OrigemPagamento } from '../types'
import { USING_BACKEND, request } from './apiHelper'
import { storageBoletos, registrarBaixaBoleto, reverterBaixaBoleto } from './storage'

export const boletosGateway = {
  usingBackend: USING_BACKEND,

  async getAll(): Promise<Boleto[]> {
    if (USING_BACKEND) return request<Boleto[]>('/api/boletos')
    return storageBoletos.getAll()
  },

  async getById(id: string): Promise<Boleto | undefined> {
    if (USING_BACKEND) {
      try {
        return await request<Boleto>(`/api/boletos/${id}`)
      } catch {
        return undefined
      }
    }
    return storageBoletos.getById(id)
  },

  async getPendentes(): Promise<Boleto[]> {
    if (USING_BACKEND) return request<Boleto[]>('/api/boletos/pendentes')
    return storageBoletos.getPendentes()
  },

  async getPagos(): Promise<Boleto[]> {
    if (USING_BACKEND) return request<Boleto[]>('/api/boletos/pagos')
    return storageBoletos.getPagos()
  },

  async save(boleto: Boleto): Promise<Boleto> {
    if (USING_BACKEND) {
      const existing = await this.getById(boleto.id)
      if (existing) {
        return request<Boleto>(`/api/boletos/${boleto.id}`, {
          method: 'PUT',
          body: JSON.stringify(boleto),
        })
      }
      return request<Boleto>('/api/boletos', {
        method: 'POST',
        body: JSON.stringify(boleto),
      })
    }
    return storageBoletos.save(boleto)
  },

  async saveAll(boletos: Boleto[]): Promise<void> {
    if (USING_BACKEND) {
      await request('/api/boletos/save-all', {
        method: 'PUT',
        body: JSON.stringify(boletos),
      })
      return
    }
    storageBoletos.saveAll(boletos)
  },

  async delete(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/boletos/${id}`, { method: 'DELETE' })
      return
    }
    storageBoletos.delete(id)
  },

  async registrarBaixa(boleto: Boleto, origem: OrigemPagamento, contaBancoId?: string): Promise<Boleto> {
    if (USING_BACKEND) {
      return request<Boleto>(`/api/boletos/${boleto.id}/baixa`, {
        method: 'POST',
        body: JSON.stringify({ origem, contaBancoId }),
      })
    }
    return registrarBaixaBoleto(boleto, origem, contaBancoId)
  },

  async reverterBaixa(boleto: Boleto): Promise<Boleto> {
    if (USING_BACKEND) {
      return request<Boleto>(`/api/boletos/${boleto.id}/reverter`, {
        method: 'POST',
      })
    }
    return reverterBaixaBoleto(boleto)
  },
}
