import type { Despesa } from '../modules/despesas/model'
import type { DeletedRecurrenceMarker } from '../modules/despesas/repository'
import { USING_BACKEND, request } from './apiHelper'
import { despesasRepository } from '../modules/despesas/repository'
import { registrarPagamentoDespesa as localRegistrarPagamento, reverterPagamentoDespesa as localReverterPagamento } from './storage'

export const despesasGateway = {
  usingBackend: USING_BACKEND,

  async ensureSeed(): Promise<void> {
    if (!USING_BACKEND) despesasRepository.ensureSeed()
  },

  async getAll(): Promise<Despesa[]> {
    if (USING_BACKEND) return request<Despesa[]>('/api/despesas')
    return despesasRepository.getAll()
  },

  async getById(id: string): Promise<Despesa | undefined> {
    if (USING_BACKEND) {
      try {
        return await request<Despesa>(`/api/despesas/${id}`)
      } catch {
        return undefined
      }
    }
    return despesasRepository.getById(id)
  },

  async save(despesa: Despesa): Promise<Despesa> {
    if (USING_BACKEND) {
      const existing = await this.getById(despesa.id)
      if (existing) {
        return request<Despesa>(`/api/despesas/${despesa.id}`, {
          method: 'PUT',
          body: JSON.stringify(despesa),
        })
      }
      return request<Despesa>('/api/despesas', {
        method: 'POST',
        body: JSON.stringify(despesa),
      })
    }
    return despesasRepository.save(despesa)
  },

  async saveAll(list: Despesa[]): Promise<void> {
    if (USING_BACKEND) {
      await request('/api/despesas/save-all', {
        method: 'PUT',
        body: JSON.stringify(list),
      })
      return
    }
    despesasRepository.saveAll(list)
  },

  async delete(id: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/despesas/${id}`, { method: 'DELETE' })
      return
    }
    despesasRepository.delete(id)
  },

  async registrarPagamento(despesa: Despesa, origemPagamento: 'dinheiro' | 'conta_banco', contaBancoId?: string, dataPagamento?: string): Promise<Despesa> {
    if (USING_BACKEND) {
      return request<Despesa>(`/api/despesas/${despesa.id}/pagamento`, {
        method: 'POST',
        body: JSON.stringify({ origemPagamento, contaBancoId, dataPagamento }),
      })
    }
    const updated: Despesa = {
      ...despesa,
      status: 'pago',
      dataPagamento: dataPagamento ?? new Date().toISOString().slice(0, 10),
      origemPagamento,
      contaBancoId,
      atualizadoEm: new Date().toISOString(),
    }
    despesasRepository.save(updated)
    localRegistrarPagamento(updated)
    return updated
  },

  async reverterPagamento(despesa: Despesa): Promise<Despesa> {
    if (USING_BACKEND) {
      return request<Despesa>(`/api/despesas/${despesa.id}/reverter-pagamento`, {
        method: 'POST',
      })
    }
    localReverterPagamento(despesa)
    const updated: Despesa = {
      ...despesa,
      status: 'pendente',
      dataPagamento: undefined,
      origemPagamento: undefined,
      contaBancoId: undefined,
      atualizadoEm: new Date().toISOString(),
    }
    despesasRepository.save(updated)
    return updated
  },

  async getDeletedRecurrenceMarkers(): Promise<DeletedRecurrenceMarker[]> {
    if (USING_BACKEND) return request<DeletedRecurrenceMarker[]>('/api/despesas/deleted-recurrence-markers')
    return despesasRepository.getDeletedRecurrenceMarkers()
  },

  async addDeletedRecurrenceMarker(marker: Omit<DeletedRecurrenceMarker, 'deletedAt'>): Promise<void> {
    if (USING_BACKEND) {
      await request('/api/despesas/deleted-recurrence-markers', {
        method: 'POST',
        body: JSON.stringify(marker),
      })
      return
    }
    despesasRepository.addDeletedRecurrenceMarker(marker)
  },

  async clearDeletedRecurrenceMarkersByOrigem(origemId: string): Promise<void> {
    if (USING_BACKEND) {
      await request(`/api/despesas/deleted-recurrence-markers/${origemId}`, {
        method: 'DELETE',
      })
      return
    }
    despesasRepository.clearDeletedRecurrenceMarkersByOrigem(origemId)
  },
}
