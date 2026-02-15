import { format } from 'date-fns'
import type { NFeDuplicata, NFeItem, NFeParsed } from './model'

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
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const reNs = new RegExp(`<[^:]+:${tag}[^>]*>([\\s\\S]*?)</[^:]+:${tag}>`, 'gi')
  let m = re.exec(xml)
  while (m) {
    out.push(m[1])
    m = re.exec(xml)
  }
  m = reNs.exec(xml)
  while (m) {
    out.push(m[1])
    m = reNs.exec(xml)
  }
  return out
}

function toDateISO(v?: string): string {
  if (!v) return new Date().toISOString().slice(0, 10)
  const iso = v.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(v)) return v.split('/').join('-')
  return new Date().toISOString().slice(0, 10)
}

function toNum(v?: string): number {
  const n = Number((v ?? '0').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function parseNFeXmlToCompra(xml: string): NFeParsed | null {
  if (!xml.trim()) return null

  const infNFeId = /<infNFe[^>]*\bId="([^"]+)"/i.exec(xml)?.[1]
  const chaveAcesso = infNFeId?.startsWith('NFe') ? infNFeId.slice(3) : infNFeId
  const ide = block(xml, 'ide') ?? ''
  const emit = block(xml, 'emit') ?? ''
  const dest = block(xml, 'dest') ?? ''
  const total = block(xml, 'ICMSTot') ?? ''

  const numero = tagValue(ide, 'nNF')
  const serie = tagValue(ide, 'serie')
  const dataEmissao = toDateISO(tagValue(ide, 'dhEmi') ?? tagValue(ide, 'dEmi'))
  const naturezaOperacao = tagValue(ide, 'natOp')
  const emitenteNome = tagValue(emit, 'xNome') ?? 'Fornecedor NFe'
  const emitenteCnpj = tagValue(emit, 'CNPJ')
  const destinatarioNome = tagValue(dest, 'xNome')
  const destinatarioCnpj = tagValue(dest, 'CNPJ')

  const itens: NFeItem[] = blockAll(xml, 'det').map((d) => {
    const prod = block(d, 'prod') ?? d
    const quantidade = toNum(tagValue(prod, 'qCom') ?? tagValue(prod, 'qTrib'))
    const valorUnitario = toNum(tagValue(prod, 'vUnCom') ?? tagValue(prod, 'vUnTrib'))
    const valorTotal = toNum(tagValue(prod, 'vProd'))
    return {
      descricao: tagValue(prod, 'xProd') ?? 'Item sem descricao',
      ncm: tagValue(prod, 'NCM'),
      quantidade: quantidade || 1,
      valorUnitario: valorUnitario || valorTotal,
      valorTotal,
    }
  }).filter((i) => i.valorTotal > 0)

  const totalProdutos = toNum(tagValue(total, 'vProd'))
  const totalNotaFiscal = toNum(tagValue(total, 'vNF'))
  const impostos = toNum(tagValue(total, 'vICMS')) + toNum(tagValue(total, 'vIPI')) + toNum(tagValue(total, 'vPIS')) + toNum(tagValue(total, 'vCOFINS'))
  const totalImpostos = impostos > 0 ? impostos : undefined

  const duplicatas: NFeDuplicata[] = blockAll(xml, 'dup')
    .map((dup) => ({
      numero: tagValue(dup, 'nDup'),
      vencimento: toDateISO(tagValue(dup, 'dVenc')),
      valor: toNum(tagValue(dup, 'vDup')),
    }))
    .filter((d) => d.valor > 0)

  const valorValidacao = totalNotaFiscal || totalProdutos || itens.reduce((s, i) => s + i.valorTotal, 0)
  if (valorValidacao <= 0) return null

  return {
    chaveAcesso,
    numero,
    serie,
    dataEmissao,
    emitenteNome,
    emitenteCnpj,
    destinatarioNome,
    destinatarioCnpj,
    naturezaOperacao,
    itens,
    totalProdutos: totalProdutos || itens.reduce((s, i) => s + i.valorTotal, 0),
    totalNotaFiscal: totalNotaFiscal || totalProdutos || itens.reduce((s, i) => s + i.valorTotal, 0),
    totalImpostos,
    duplicatas,
  }
}

export function competenciaMes(dataISO: string): string {
  return format(new Date(`${dataISO}T12:00:00`), 'yyyy-MM')
}
