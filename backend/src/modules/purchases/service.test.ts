import { beforeEach, describe, expect, it, vi } from 'vitest'

const txMock = vi.hoisted(() => ({
  supplier: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  purchase: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  purchaseItem: {
    createMany: vi.fn(),
  },
  purchaseDocument: {
    create: vi.fn(),
  },
  payable: {
    createMany: vi.fn(),
    create: vi.fn(),
  },
  xmlImportLog: {
    create: vi.fn(),
  },
}))

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (tx: typeof txMock) => unknown) => fn(txMock)),
}))

vi.mock('../../infra/prismaClient', () => ({
  prisma: prismaMock,
}))

import { purchasesService } from './service'

const sampleXml = `
<nfeProc>
  <NFe>
    <infNFe Id="NFeCHAVE1234567890123456789012345678901234567890">
      <ide><nNF>10</nNF><serie>1</serie><dhEmi>2026-02-01T10:00:00-03:00</dhEmi></ide>
      <emit><xNome>Fornecedor Teste</xNome><CNPJ>12345678000199</CNPJ></emit>
      <dest><xNome>Minha Empresa</xNome><CNPJ>99887766000155</CNPJ></dest>
      <det><prod><xProd>Produto X</xProd><qCom>2</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod></det>
      <total><ICMSTot><vProd>20.00</vProd><vNF>20.00</vNF></ICMSTot></total>
      <cobr><dup><nDup>001</nDup><dVenc>2026-03-10</dVenc><vDup>20.00</vDup></dup></cobr>
    </infNFe>
  </NFe>
</nfeProc>
`

describe('purchasesService critical rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    txMock.supplier.findUnique.mockResolvedValue(null)
    txMock.supplier.create.mockResolvedValue({ id: 'supplier-1', legalName: 'Fornecedor Teste', cnpj: '12345678000199' })
    txMock.purchase.findUnique.mockResolvedValue(null)
    txMock.purchase.create.mockResolvedValue({ id: 'purchase-1' })
    txMock.purchaseItem.createMany.mockResolvedValue({ count: 1 })
    txMock.purchaseDocument.create.mockResolvedValue({ id: 'doc-1' })
    txMock.payable.createMany.mockResolvedValue({ count: 1 })
    txMock.payable.create.mockResolvedValue({ id: 'payable-1' })
    txMock.xmlImportLog.create.mockResolvedValue({ id: 'log-1' })
  })

  it('blocks duplicate XML by access key', async () => {
    txMock.purchase.findUnique.mockResolvedValueOnce({ id: 'already-exists' })

    await expect(purchasesService.importNFeXmlToPurchase(sampleXml, 'tester')).rejects.toThrow(/ja importada/i)
    expect(txMock.xmlImportLog.create).toHaveBeenCalled()
  })

  it('keeps import atomic via transaction when payable creation fails', async () => {
    txMock.payable.createMany.mockRejectedValueOnce(new Error('fail-payables'))

    await expect(purchasesService.importNFeXmlToPurchase(sampleXml, 'tester')).rejects.toThrow('fail-payables')
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)
  })

  it('creates manual installments for a purchase', async () => {
    txMock.purchase.findUnique.mockResolvedValueOnce({
      id: 'purchase-1',
      deletedAt: null,
      description: 'Compra manual',
      supplier: { legalName: 'Fornecedor Teste' },
    })

    await purchasesService.generatePayablesFromPurchase({
      purchaseId: 'purchase-1',
      totalAmount: 300,
      installments: 3,
      firstDueDate: '2026-02-20',
      descriptionBase: 'Parcelamento',
    })

    expect(txMock.payable.create).toHaveBeenCalledTimes(3)
  })
})
