export type ParsedNFeItem = {
  description: string
  ncm?: string
  quantity: number
  unitAmount: number
  totalAmount: number
}

export type ParsedNFeDuplicate = {
  number?: string
  dueDate: string
  amount: number
}

export type ParsedNFe = {
  accessKey?: string
  number?: string
  series?: string
  issueDate: string
  natureOperation?: string
  issuerName: string
  issuerCnpj?: string
  recipientName?: string
  recipientCnpj?: string
  totalProducts: number
  totalInvoice: number
  totalTaxes?: number
  items: ParsedNFeItem[]
  duplicates: ParsedNFeDuplicate[]
}

function tagValue(xml: string, tag: string): string | undefined {
  let m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i').exec(xml)
  if (m?.[1]) return m[1].trim()
  m = new RegExp(`<[^:]+:${tag}[^>]*>([^<]*)</[^:]+:${tag}>`, 'i').exec(xml)
  return m?.[1]?.trim()
}

function block(xml: string, tag: string): string | undefined {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml)
  if (m?.[1]) return m[1]
  const ns = new RegExp(`<[^:]+:${tag}[^>]*>([\\s\\S]*?)</[^:]+:${tag}>`, 'i').exec(xml)
  return ns?.[1]
}

function blockAll(xml: string, tag: string): string[] {
  const out: string[] = []
  const direct = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const ns = new RegExp(`<[^:]+:${tag}[^>]*>([\\s\\S]*?)</[^:]+:${tag}>`, 'gi')
  let m = direct.exec(xml)
  while (m) {
    out.push(m[1])
    m = direct.exec(xml)
  }
  m = ns.exec(xml)
  while (m) {
    out.push(m[1])
    m = ns.exec(xml)
  }
  return out
}

function toISODate(v?: string): string {
  if (!v) return new Date().toISOString().slice(0, 10)
  const ten = v.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ten)) return ten
  return new Date().toISOString().slice(0, 10)
}

function toNum(v?: string): number {
  const n = Number((v ?? '0').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function parseNFeXml(xmlRaw: string): ParsedNFe {
  if (!xmlRaw.trim()) {
    throw new Error('XML vazio.')
  }

  const infNFeId = /<infNFe[^>]*\bId="([^"]+)"/i.exec(xmlRaw)?.[1]
  const accessKey = infNFeId?.startsWith('NFe') ? infNFeId.slice(3) : infNFeId
  const ide = block(xmlRaw, 'ide') ?? ''
  const emit = block(xmlRaw, 'emit') ?? ''
  const dest = block(xmlRaw, 'dest') ?? ''
  const totals = block(xmlRaw, 'ICMSTot') ?? ''

  const issueDate = toISODate(tagValue(ide, 'dhEmi') ?? tagValue(ide, 'dEmi'))
  const issuerName = tagValue(emit, 'xNome') ?? ''
  if (!issuerName) throw new Error('Emitente nao encontrado no XML.')

  const items = blockAll(xmlRaw, 'det')
    .map((det) => {
      const prod = block(det, 'prod') ?? det
      const totalAmount = toNum(tagValue(prod, 'vProd'))
      return {
        description: tagValue(prod, 'xProd') ?? 'Item sem descricao',
        ncm: tagValue(prod, 'NCM'),
        quantity: toNum(tagValue(prod, 'qCom')) || 1,
        unitAmount: toNum(tagValue(prod, 'vUnCom')) || totalAmount,
        totalAmount,
      }
    })
    .filter((i) => i.totalAmount > 0)

  const totalProducts = toNum(tagValue(totals, 'vProd')) || items.reduce((s, i) => s + i.totalAmount, 0)
  const totalInvoice = toNum(tagValue(totals, 'vNF')) || totalProducts
  if (totalInvoice <= 0) throw new Error('Total da nota invalido no XML.')

  const taxes =
    toNum(tagValue(totals, 'vICMS')) +
    toNum(tagValue(totals, 'vIPI')) +
    toNum(tagValue(totals, 'vPIS')) +
    toNum(tagValue(totals, 'vCOFINS'))

  const duplicates = blockAll(xmlRaw, 'dup')
    .map((dup) => ({
      number: tagValue(dup, 'nDup'),
      dueDate: toISODate(tagValue(dup, 'dVenc')),
      amount: toNum(tagValue(dup, 'vDup')),
    }))
    .filter((d) => d.amount > 0)

  return {
    accessKey,
    number: tagValue(ide, 'nNF'),
    series: tagValue(ide, 'serie'),
    issueDate,
    natureOperation: tagValue(ide, 'natOp'),
    issuerName,
    issuerCnpj: tagValue(emit, 'CNPJ'),
    recipientName: tagValue(dest, 'xNome'),
    recipientCnpj: tagValue(dest, 'CNPJ'),
    totalProducts,
    totalInvoice,
    totalTaxes: taxes > 0 ? taxes : undefined,
    items,
    duplicates,
  }
}
