import type { Compra, CompraDocumento, CompraItem, Fornecedor, ImportacaoXmlLog } from './model'

const KEY_COMPRAS = 'controle-financeiro-compras'
const KEY_COMPRAS_ITENS = 'controle-financeiro-compras-itens'
const KEY_COMPRAS_DOCUMENTOS = 'controle-financeiro-compras-documentos'
const KEY_FORNECEDORES = 'controle-financeiro-fornecedores'
const KEY_IMPORT_LOGS = 'controle-financeiro-importacao-xml-logs'

function getSafe<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function setSafe<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list))
}

export const comprasRepository = {
  getCompras: () => getSafe<Compra>(KEY_COMPRAS),
  setCompras: (list: Compra[]) => setSafe(KEY_COMPRAS, list),
  getItens: () => getSafe<CompraItem>(KEY_COMPRAS_ITENS),
  setItens: (list: CompraItem[]) => setSafe(KEY_COMPRAS_ITENS, list),
  getDocumentos: () => getSafe<CompraDocumento>(KEY_COMPRAS_DOCUMENTOS),
  setDocumentos: (list: CompraDocumento[]) => setSafe(KEY_COMPRAS_DOCUMENTOS, list),
  getFornecedores: () => getSafe<Fornecedor>(KEY_FORNECEDORES),
  setFornecedores: (list: Fornecedor[]) => setSafe(KEY_FORNECEDORES, list),
  getLogs: () => getSafe<ImportacaoXmlLog>(KEY_IMPORT_LOGS),
  setLogs: (list: ImportacaoXmlLog[]) => setSafe(KEY_IMPORT_LOGS, list),
}
