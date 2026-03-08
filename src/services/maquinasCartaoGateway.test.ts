import { beforeEach, describe, expect, it, vi } from 'vitest'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
})

const originalEnv = import.meta.env
vi.stubGlobal('import.meta.env', { ...originalEnv, VITE_API_BASE_URL: '' })

import { maquinasCartaoGateway } from './maquinasCartaoGateway'

describe('maquinasCartaoGateway (localStorage)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.mocked(localStorageMock.setItem).mockClear()
    vi.mocked(localStorageMock.getItem).mockClear()
  })

  it('list retorna máquinas com seed padrão quando vazio', async () => {
    const maquinas = await maquinasCartaoGateway.list()
    expect(maquinas.length).toBeGreaterThanOrEqual(1)
    expect(maquinas[0].nome).toBe('Stone')
    expect(maquinas[0].adquirente).toBe('Stone')
  })

  it('getTaxaByModalidade retorna taxa para débito', async () => {
    const maquinas = await maquinasCartaoGateway.list()
    const maquinaId = maquinas[0].id

    const taxa = await maquinasCartaoGateway.getTaxaByModalidade(maquinaId, 'debito', 1)
    expect(taxa).not.toBeNull()
    expect(taxa?.tipoCartao).toBe('debito')
    expect(taxa?.parcelas).toBe(1)
    expect(taxa?.taxaPercentual).toBe(1.99)
  })

  it('getTaxaByModalidade retorna taxa para crédito 3x', async () => {
    const maquinas = await maquinasCartaoGateway.list()
    const maquinaId = maquinas[0].id

    const taxa = await maquinasCartaoGateway.getTaxaByModalidade(maquinaId, 'credito', 3)
    expect(taxa).not.toBeNull()
    expect(taxa?.tipoCartao).toBe('credito')
    expect(taxa?.parcelas).toBe(3)
    expect(taxa?.taxaPercentual).toBe(3.99)
  })

  it('createMaquina adiciona nova máquina', async () => {
    const maquina = await maquinasCartaoGateway.createMaquina({
      nome: 'Cielo',
      adquirente: 'Cielo',
      descricao: 'Máquina Cielo',
    })

    expect(maquina.nome).toBe('Cielo')
    expect(maquina.adquirente).toBe('Cielo')

    const lista = await maquinasCartaoGateway.list()
    expect(lista.some((m) => m.nome === 'Cielo')).toBe(true)
  })

  it('createTaxa adiciona taxa à máquina nova', async () => {
    const maquina = await maquinasCartaoGateway.createMaquina({
      nome: 'Cielo Test',
      adquirente: 'Cielo',
    })

    const taxa = await maquinasCartaoGateway.createTaxa(maquina.id, {
      tipoCartao: 'credito',
      parcelas: 3,
      taxaPercentual: 4.5,
    })

    expect(taxa.parcelas).toBe(3)
    expect(taxa.taxaPercentual).toBe(4.5)

    const encontrada = await maquinasCartaoGateway.getTaxaByModalidade(maquina.id, 'credito', 3)
    expect(encontrada?.taxaPercentual).toBe(4.5)
  })
})
