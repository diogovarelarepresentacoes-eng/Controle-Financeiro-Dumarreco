/**
 * Extrai dados de um XML de Nota Fiscal Eletrônica (NFe) para gerar um boleto.
 * Suporta o layout padrão da NFe (Portal da Nota Fiscal Eletrônica).
 */

export interface NFeDados {
  descricao: string
  valor: number
  vencimento: string
  nNF?: string
  dEmi?: string
  xNomeEmit?: string
  natOp?: string
}

function getTextoTag(xml: string, tag: string): string | undefined {
  // Tag sem prefixo: <nNF>...</nNF>
  let match = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i').exec(xml)
  if (match) return match[1]?.trim()
  // Tag com prefixo de namespace: <nfe:nNF>...</nfe:nNF>
  match = new RegExp(`<[^:]+:${tag}[^>]*>([^<]*)</[^:]+:${tag}>`, 'i').exec(xml)
  return match?.[1]?.trim()
}

/**
 * Converte data NFe (YYYY-MM-DD) para o mesmo formato.
 * NFe usa dEmi no formato AAAA-MM-DD.
 */
function normalizarData(val: string | undefined): string {
  if (!val || val.length < 10) return new Date().toISOString().slice(0, 10)
  const d = val.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10)
}

/**
 * Parse de um XML de NFe (string) e retorna os dados para criar um boleto.
 * Retorna null se o XML não for reconhecido ou estiver inválido.
 */
export function parseNFeXml(xml: string): NFeDados | null {
  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) return null

  const nNF = getTextoTag(xml, 'nNF')
  const dEmi = getTextoTag(xml, 'dEmi')
  const vNF = getTextoTag(xml, 'vNF')
  const xNome = getTextoTag(xml, 'xNome') // primeiro geralmente é do emitente
  const natOp = getTextoTag(xml, 'natOp')

  const valor = parseFloat((vNF || '0').replace(',', '.'))
  if (isNaN(valor) || valor <= 0) return null

  const numeroNFe = nNF || 'NFe'
  const emitente = xNome || ''
  const natureza = natOp || ''
  const descricao = [numeroNFe, natureza, emitente].filter(Boolean).join(' - ') || `NFe ${numeroNFe}`

  return {
    descricao: descricao.slice(0, 200),
    valor,
    vencimento: normalizarData(dEmi),
    nNF,
    dEmi,
    xNomeEmit: xNome,
    natOp,
  }
}

/**
 * Processa múltiplos XMLs (ex.: vários arquivos ou um XML com mais de uma NFe).
 * Retorna array de NFeDados (ignora entradas inválidas).
 */
export function parseNFeXmlMultiplo(xml: string): NFeDados[] {
  const resultados: NFeDados[] = []
  const unico = parseNFeXml(xml)
  if (unico) resultados.push(unico)
  return resultados
}
