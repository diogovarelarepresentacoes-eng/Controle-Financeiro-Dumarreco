import { beforeEach, describe, expect, it, vi } from 'vitest'

const maquinaCartaoMock = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const taxaMaquinaCartaoMock = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  maquinaCartao: maquinaCartaoMock,
  taxaMaquinaCartao: taxaMaquinaCartaoMock,
}))

vi.mock('../../infra/prismaClient', () => ({
  prisma: prismaMock,
}))

import { maquinasCartaoService } from './service'

describe('maquinasCartaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findByModalidade retorna taxa ativa', async () => {
    taxaMaquinaCartaoMock.findFirst.mockResolvedValueOnce({
      id: 't1',
      maquinaCartaoId: 'm1',
      tipoCartao: 'credito',
      parcelas: 3,
      taxaPercentual: 3.99,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await maquinasCartaoService.findByModalidade('m1', 'credito', 3)
    expect(result).not.toBeNull()
    expect(result?.tipoCartao).toBe('credito')
    expect(result?.parcelas).toBe(3)
    expect(result?.taxaPercentual).toBe(3.99)
  })

  it('findByModalidade retorna null quando não existe taxa', async () => {
    taxaMaquinaCartaoMock.findFirst.mockResolvedValueOnce(null)

    const result = await maquinasCartaoService.findByModalidade('m1', 'credito', 15)
    expect(result).toBeNull()
  })

  it('createTaxa rejeita duplicata ativa', async () => {
    taxaMaquinaCartaoMock.findFirst.mockResolvedValueOnce({
      id: 'existente',
      maquinaCartaoId: 'm1',
      tipoCartao: 'credito',
      parcelas: 3,
      ativo: true,
    })

    await expect(
      maquinasCartaoService.createTaxa('m1', {
        tipoCartao: 'credito',
        parcelas: 3,
        taxaPercentual: 4,
      })
    ).rejects.toThrow(/ja existe taxa ativa/i)
    expect(taxaMaquinaCartaoMock.create).not.toHaveBeenCalled()
  })

  it('createTaxa insere nova taxa quando não há duplicata', async () => {
    taxaMaquinaCartaoMock.findFirst.mockResolvedValueOnce(null)
    taxaMaquinaCartaoMock.create.mockResolvedValueOnce({
      id: 'nova',
      maquinaCartaoId: 'm1',
      tipoCartao: 'credito',
      parcelas: 5,
      taxaPercentual: 4.99,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await maquinasCartaoService.createTaxa('m1', {
      tipoCartao: 'credito',
      parcelas: 5,
      taxaPercentual: 4.99,
    })

    expect(result.parcelas).toBe(5)
    expect(result.taxaPercentual).toBe(4.99)
    expect(taxaMaquinaCartaoMock.create).toHaveBeenCalledTimes(1)
  })

  it('createMaquina cria nova máquina', async () => {
    maquinaCartaoMock.create.mockResolvedValueOnce({
      id: 'm1',
      nome: 'Stone',
      adquirente: 'Stone',
      descricao: 'Máquina 1',
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await maquinasCartaoService.createMaquina({
      nome: 'Stone',
      adquirente: 'Stone',
      descricao: 'Máquina 1',
    })

    expect(result.nome).toBe('Stone')
    expect(result.adquirente).toBe('Stone')
    expect(maquinaCartaoMock.create).toHaveBeenCalledTimes(1)
  })
})
