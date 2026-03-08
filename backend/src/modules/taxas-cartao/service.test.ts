import { beforeEach, describe, expect, it, vi } from 'vitest'

const taxaCartaoMock = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  taxaCartao: taxaCartaoMock,
}))

vi.mock('../../infra/prismaClient', () => ({
  prisma: prismaMock,
}))

import { calcularValorLiquidoCartao, taxasCartaoService } from './service'

describe('calcularValorLiquidoCartao', () => {
  it('calcula débito corretamente', () => {
    const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(1000, 1.99)
    expect(valorTaxa).toBe(19.9)
    expect(valorLiquido).toBe(980.1)
  })

  it('calcula crédito 3x com taxa 4%', () => {
    const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(1000, 4)
    expect(valorTaxa).toBe(40)
    expect(valorLiquido).toBe(960)
  })

  it('arredonda monetário com 2 casas decimais', () => {
    const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(123.45, 2.5)
    expect(valorTaxa).toBe(3.09)
    expect(valorLiquido).toBe(120.36)
  })
})

describe('taxasCartaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findByModalidade retorna taxa ativa', async () => {
    taxaCartaoMock.findFirst.mockResolvedValueOnce({
      id: 't1',
      descricao: 'Crédito 3x',
      tipoCartao: 'credito',
      quantidadeParcelas: 3,
      taxaPercentual: 3.99,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await taxasCartaoService.findByModalidade('credito', 3)
    expect(result).not.toBeNull()
    expect(result?.descricao).toBe('Crédito 3x')
    expect(result?.taxaPercentual).toBe(3.99)
  })

  it('findByModalidade retorna null quando não existe taxa', async () => {
    taxaCartaoMock.findFirst.mockResolvedValueOnce(null)

    const result = await taxasCartaoService.findByModalidade('credito', 15)
    expect(result).toBeNull()
  })

  it('create rejeita duplicata ativa', async () => {
    taxaCartaoMock.findFirst.mockResolvedValueOnce({
      id: 'existente',
      tipoCartao: 'credito',
      quantidadeParcelas: 3,
      ativo: true,
    })

    await expect(
      taxasCartaoService.create({
        descricao: 'Crédito 3x',
        tipoCartao: 'credito',
        quantidadeParcelas: 3,
        taxaPercentual: 4,
      })
    ).rejects.toThrow(/ja existe taxa ativa/i)
    expect(taxaCartaoMock.create).not.toHaveBeenCalled()
  })

  it('create insere nova taxa quando não há duplicata', async () => {
    taxaCartaoMock.findFirst.mockResolvedValueOnce(null)
    taxaCartaoMock.create.mockResolvedValueOnce({
      id: 'nova',
      descricao: 'Crédito 5x',
      tipoCartao: 'credito',
      quantidadeParcelas: 5,
      taxaPercentual: 4.99,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await taxasCartaoService.create({
      descricao: 'Crédito 5x',
      tipoCartao: 'credito',
      quantidadeParcelas: 5,
      taxaPercentual: 4.99,
    })

    expect(result.descricao).toBe('Crédito 5x')
    expect(taxaCartaoMock.create).toHaveBeenCalledTimes(1)
  })
})
