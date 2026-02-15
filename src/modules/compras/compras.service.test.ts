import { beforeEach, describe, expect, it } from 'vitest'
import { comprasService } from './service'
import { comprasRepository } from './repository'
import { storageBoletos } from '../../services/storage'

class LocalStorageMock {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const nfeXmlComDuplicata = `
<nfeProc>
  <NFe>
    <infNFe Id="NFe12345678901234567890123456789012345678901234">
      <ide>
        <nNF>1209</nNF>
        <serie>1</serie>
        <dhEmi>2026-02-10T10:00:00-03:00</dhEmi>
        <natOp>Compra para estoque</natOp>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Fornecedor ABC LTDA</xNome>
      </emit>
      <dest>
        <CNPJ>99887766000155</CNPJ>
        <xNome>Dumarreco Materiais</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <xProd>Cimento CP-II</xProd>
          <NCM>25232910</NCM>
          <qCom>10</qCom>
          <vUnCom>35.00</vUnCom>
          <vProd>350.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vProd>350.00</vProd>
          <vNF>350.00</vNF>
          <vICMS>42.00</vICMS>
        </ICMSTot>
      </total>
      <cobr>
        <dup>
          <nDup>001</nDup>
          <dVenc>2026-03-10</dVenc>
          <vDup>200.00</vDup>
        </dup>
        <dup>
          <nDup>002</nDup>
          <dVenc>2026-04-10</dVenc>
          <vDup>150.00</vDup>
        </dup>
      </cobr>
    </infNFe>
  </NFe>
</nfeProc>
`

describe('comprasService', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).localStorage = new LocalStorageMock()
  })

  it('bloqueia importacao duplicada por chave de acesso', () => {
    const compra = comprasService.importarXml(nfeXmlComDuplicata, 'tester')
    expect(compra.nfeChaveAcesso).toBe('12345678901234567890123456789012345678901234')

    expect(() => comprasService.importarXml(nfeXmlComDuplicata, 'tester')).toThrow(/ja importada/i)
    expect(comprasRepository.getCompras().length).toBe(1)
  })

  it('mantem atomicidade quando falha ao gerar contas a pagar', () => {
    const original = storageBoletos.save
    let calls = 0
    storageBoletos.save = ((boleto) => {
      calls += 1
      if (calls === 2) throw new Error('falha simulada')
      return original(boleto)
    }) as typeof storageBoletos.save

    expect(() => comprasService.importarXml(nfeXmlComDuplicata, 'tester')).toThrow(/falha simulada/i)
    expect(comprasRepository.getCompras().length).toBe(0)
    expect(comprasRepository.getItens().length).toBe(0)
    expect(comprasRepository.getDocumentos().length).toBe(0)
    expect(storageBoletos.getAll().length).toBe(0)

    storageBoletos.save = original
  })

  it('gera parcelamento manual vinculado a compra', () => {
    const compra = comprasService.criarManual({
      fornecedorNome: 'Fornecedor Sem NF',
      dataEmissao: '2026-02-01',
      descricao: 'Compra sem nota',
      valorTotal: 900,
      observacoes: 'manual',
      categoria: 'Outros',
      centroCusto: 'Loja',
    })

    const parcelas = comprasService.gerarContasPagarManual({
      compraId: compra.id,
      valorTotal: 900,
      parcelas: 3,
      primeiroVencimento: '2026-02-15',
      descricaoBase: 'Parcelamento compra manual',
    })

    expect(parcelas).toHaveLength(3)
    expect(parcelas.every((p) => p.compraId === compra.id)).toBe(true)
    expect(parcelas[0].valor).toBeCloseTo(300, 2)
  })
})
