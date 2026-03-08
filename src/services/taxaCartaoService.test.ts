import { describe, expect, it } from 'vitest'
import { calcularValorLiquidoCartao } from './taxaCartaoService'

describe('taxaCartaoService', () => {
  describe('calcularValorLiquidoCartao', () => {
    it('calcula débito corretamente', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(1000, 1.99)
      expect(valorTaxa).toBe(19.9)
      expect(valorLiquido).toBe(980.1)
    })

    it('calcula crédito à vista corretamente', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(500, 2.99)
      expect(valorTaxa).toBe(14.95)
      expect(valorLiquido).toBe(485.05)
    })

    it('calcula crédito parcelado 3x corretamente', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(1000, 4)
      expect(valorTaxa).toBe(40)
      expect(valorLiquido).toBe(960)
    })

    it('exemplo Stone Crédito 3x: R$ 1000 com taxa 3.99%', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(1000, 3.99)
      expect(valorTaxa).toBe(39.9)
      expect(valorLiquido).toBe(960.1)
    })

    it('retorna valor líquido correto quando taxa é zero', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(100, 0)
      expect(valorTaxa).toBe(0)
      expect(valorLiquido).toBe(100)
    })

    it('arredonda corretamente com 2 casas decimais', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(100, 3.333)
      expect(valorTaxa).toBe(3.33)
      expect(valorLiquido).toBe(96.67)
    })

    it('arredonda valor da taxa corretamente em casos complexos', () => {
      const { valorTaxa, valorLiquido } = calcularValorLiquidoCartao(123.45, 2.5)
      expect(valorTaxa).toBe(3.09)
      expect(valorLiquido).toBe(120.36)
    })
  })
})
