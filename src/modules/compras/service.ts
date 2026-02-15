import { addMonths, format } from 'date-fns'
import type { Boleto } from '../../types'
import { storageBoletos } from '../../services/storage'
import type {
  Compra,
  CompraComRelacionamentos,
  CompraDocumento,
  CompraItem,
  FiltrosCompra,
  Fornecedor,
  ImportacaoXmlLog,
  KpisCompras,
  NFeParsed,
} from './model'
import { parseNFeXmlToCompra, competenciaMes } from './nfeParser'
import { comprasRepository } from './repository'

type CreateManualInput = {
  fornecedorNome: string
  fornecedorCnpj?: string
  dataEmissao: string
  descricao: string
  observacoes?: string
  valorTotal: number
  categoria?: string
  centroCusto?: string
  itens?: Array<{
    descricao: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
  }>
}

type ParcelamentoInput = {
  compraId: string
  descricaoBase?: string
  valorTotal: number
  parcelas: number
  primeiroVencimento: string
}

function nowIso() {
  return new Date().toISOString()
}

function getStatusPagamentoCompra(compraId: string): 'sem_contas' | 'pendente' | 'pago' {
  const contas = storageBoletos.getAll().filter((b) => b.compraId === compraId)
  if (contas.length === 0) return 'sem_contas'
  const pendente = contas.some((b) => !b.pago)
  return pendente ? 'pendente' : 'pago'
}

function upsertFornecedor(nome: string, cnpj?: string): Fornecedor {
  const list = comprasRepository.getFornecedores()
  const found = cnpj ? list.find((f) => f.cnpj === cnpj) : list.find((f) => f.razaoSocial.toLowerCase() === nome.toLowerCase())
  if (found) {
    const updated = { ...found, razaoSocial: nome, cnpj: cnpj ?? found.cnpj, atualizadoEm: nowIso() }
    comprasRepository.setFornecedores(list.map((f) => (f.id === found.id ? updated : f)))
    return updated
  }
  const novo: Fornecedor = { id: crypto.randomUUID(), cnpj, razaoSocial: nome, criadoEm: nowIso(), atualizadoEm: nowIso() }
  comprasRepository.setFornecedores([...list, novo])
  return novo
}

function logImport(entry: Omit<ImportacaoXmlLog, 'id' | 'dataHora'>) {
  const logs = comprasRepository.getLogs()
  logs.push({ id: crypto.randomUUID(), dataHora: nowIso(), ...entry })
  comprasRepository.setLogs(logs)
}

function rollback(snapshot: {
  compras: Compra[]
  itens: CompraItem[]
  docs: CompraDocumento[]
  fornecedores: Fornecedor[]
  boletos: Boleto[]
}) {
  comprasRepository.setCompras(snapshot.compras)
  comprasRepository.setItens(snapshot.itens)
  comprasRepository.setDocumentos(snapshot.docs)
  comprasRepository.setFornecedores(snapshot.fornecedores)
  storageBoletos.saveAll(snapshot.boletos)
}

function createBoletoFromDup(compra: Compra, dup: { vencimento: string; valor: number; numero?: string }): Boleto {
  return {
    id: crypto.randomUUID(),
    descricao: `Compra NF ${compra.nfeNumero ?? ''} - ${compra.fornecedorNome}${dup.numero ? ` (${dup.numero})` : ''}`.trim(),
    valor: Number(dup.valor.toFixed(2)),
    vencimento: dup.vencimento,
    pago: false,
    compraId: compra.id,
    criadoEm: nowIso(),
  }
}

function createPurchaseFromNFe(parsed: NFeParsed, xmlRaw: string, usuario: string): Compra {
  const snapshot = {
    compras: comprasRepository.getCompras(),
    itens: comprasRepository.getItens(),
    docs: comprasRepository.getDocumentos(),
    fornecedores: comprasRepository.getFornecedores(),
    boletos: storageBoletos.getAll(),
  }

  try {
    if (parsed.chaveAcesso && snapshot.compras.some((c) => c.nfeChaveAcesso === parsed.chaveAcesso && c.ativo)) {
      throw new Error(`NFe ja importada para a chave ${parsed.chaveAcesso}.`)
    }

    const fornecedor = upsertFornecedor(parsed.emitenteNome, parsed.emitenteCnpj)
    const compra: Compra = {
      id: crypto.randomUUID(),
      fornecedorId: fornecedor.id,
      fornecedorNome: fornecedor.razaoSocial,
      fornecedorCnpj: fornecedor.cnpj,
      dataEmissao: parsed.dataEmissao,
      competenciaMes: competenciaMes(parsed.dataEmissao),
      descricao: `Compra NFe ${parsed.numero ?? ''} ${parsed.naturezaOperacao ?? ''}`.trim(),
      observacoes: 'Importada via XML NF-e',
      valorTotal: parsed.totalNotaFiscal,
      categoria: undefined,
      centroCusto: undefined,
      temNotaFiscal: true,
      origem: 'xml_nfe',
      nfeNumero: parsed.numero,
      nfeSerie: parsed.serie,
      nfeChaveAcesso: parsed.chaveAcesso,
      destinatarioNome: parsed.destinatarioNome,
      destinatarioCnpj: parsed.destinatarioCnpj,
      totalProdutos: parsed.totalProdutos,
      totalNotaFiscal: parsed.totalNotaFiscal,
      totalImpostos: parsed.totalImpostos,
      ativo: true,
      criadoEm: nowIso(),
      atualizadoEm: nowIso(),
    }
    comprasRepository.setCompras([...snapshot.compras, compra])

    const itens = parsed.itens.map<CompraItem>((i) => ({
      id: crypto.randomUUID(),
      compraId: compra.id,
      descricao: i.descricao,
      ncm: i.ncm,
      quantidade: i.quantidade,
      valorUnitario: i.valorUnitario,
      valorTotal: i.valorTotal,
    }))
    comprasRepository.setItens([...snapshot.itens, ...itens])

    const doc: CompraDocumento = {
      id: crypto.randomUUID(),
      compraId: compra.id,
      tipo: 'xml_nfe',
      nomeArquivo: `nfe-${parsed.numero ?? 'sem-numero'}.xml`,
      conteudo: xmlRaw,
      chaveAcesso: parsed.chaveAcesso,
      criadoEm: nowIso(),
    }
    comprasRepository.setDocumentos([...snapshot.docs, doc])

    if (parsed.duplicatas.length > 0) {
      const boletosNovos = parsed.duplicatas.map((d) => createBoletoFromDup(compra, d))
      boletosNovos.forEach((b) => storageBoletos.save(b))
    }

    logImport({
      usuario,
      sucesso: true,
      chaveAcesso: parsed.chaveAcesso,
      compraId: compra.id,
      mensagem: 'Importacao de XML concluida.',
    })

    return compra
  } catch (err) {
    rollback(snapshot)
    logImport({
      usuario,
      sucesso: false,
      chaveAcesso: parsed.chaveAcesso,
      mensagem: err instanceof Error ? err.message : 'Falha na importacao XML.',
    })
    throw err
  }
}

export const comprasService = {
  listar: (filtros?: FiltrosCompra): CompraComRelacionamentos[] => {
    const compras = comprasRepository.getCompras().filter((c) => c.ativo)
    const itens = comprasRepository.getItens()
    const docs = comprasRepository.getDocumentos()
    const contas = storageBoletos.getAll()

    return compras
      .filter((c) => {
        const byMes = !filtros?.mesCompetencia || c.competenciaMes === filtros.mesCompetencia
        const byFornecedor = !filtros?.fornecedor || c.fornecedorNome.toLowerCase().includes(filtros.fornecedor.toLowerCase())
        const byNf =
          !filtros?.tipoNota ||
          filtros.tipoNota === 'todas' ||
          (filtros.tipoNota === 'com_nf' ? c.temNotaFiscal : !c.temNotaFiscal)
        const status = getStatusPagamentoCompra(c.id)
        const byStatus = !filtros?.statusPagamento || filtros.statusPagamento === 'todos' || filtros.statusPagamento === status
        return byMes && byFornecedor && byNf && byStatus
      })
      .sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao))
      .map((c) => ({
        compra: c,
        itens: itens.filter((i) => i.compraId === c.id),
        documentos: docs.filter((d) => d.compraId === c.id),
        contasPagar: contas.filter((b) => b.compraId === c.id),
      }))
  },

  detalhar: (compraId: string): CompraComRelacionamentos | undefined => {
    const item = comprasRepository.getCompras().find((c) => c.id === compraId && c.ativo)
    if (!item) return undefined
    return {
      compra: item,
      itens: comprasRepository.getItens().filter((i) => i.compraId === compraId),
      documentos: comprasRepository.getDocumentos().filter((d) => d.compraId === compraId),
      contasPagar: storageBoletos.getAll().filter((b) => b.compraId === compraId),
    }
  },

  criarManual: (input: CreateManualInput): Compra => {
    if (!input.fornecedorNome.trim()) throw new Error('Fornecedor obrigatorio.')
    if (!input.dataEmissao) throw new Error('Data de emissao obrigatoria.')
    if (input.valorTotal <= 0) throw new Error('Valor total deve ser maior que zero.')

    const fornecedor = upsertFornecedor(input.fornecedorNome.trim(), input.fornecedorCnpj?.trim())
    const compra: Compra = {
      id: crypto.randomUUID(),
      fornecedorId: fornecedor.id,
      fornecedorNome: fornecedor.razaoSocial,
      fornecedorCnpj: fornecedor.cnpj,
      dataEmissao: input.dataEmissao,
      competenciaMes: competenciaMes(input.dataEmissao),
      descricao: input.descricao.trim(),
      observacoes: input.observacoes?.trim() ?? '',
      valorTotal: input.valorTotal,
      categoria: input.categoria,
      centroCusto: input.centroCusto,
      temNotaFiscal: false,
      origem: 'manual',
      ativo: true,
      criadoEm: nowIso(),
      atualizadoEm: nowIso(),
    }
    comprasRepository.setCompras([...comprasRepository.getCompras(), compra])

    if (input.itens?.length) {
      const itens = input.itens.map<CompraItem>((i) => ({
        id: crypto.randomUUID(),
        compraId: compra.id,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
        valorTotal: i.valorTotal,
      }))
      comprasRepository.setItens([...comprasRepository.getItens(), ...itens])
    }

    return compra
  },

  importarXml: (xmlRaw: string, usuario = 'sistema'): Compra => {
    const parsed = parseNFeXmlToCompra(xmlRaw)
    if (!parsed) throw new Error('XML de NFe invalido ou nao reconhecido.')
    return createPurchaseFromNFe(parsed, xmlRaw, usuario)
  },

  gerarContasPagarManual: (input: ParcelamentoInput): Boleto[] => {
    const compra = comprasRepository.getCompras().find((c) => c.id === input.compraId && c.ativo)
    if (!compra) throw new Error('Compra nao encontrada.')
    if (input.valorTotal <= 0) throw new Error('Valor total invalido.')
    if (input.parcelas < 1 || input.parcelas > 60) throw new Error('Parcelas deve ser entre 1 e 60.')

    const valorParcela = input.valorTotal / input.parcelas
    const base = new Date(`${input.primeiroVencimento}T12:00:00`)
    const saida: Boleto[] = []
    for (let i = 0; i < input.parcelas; i++) {
      const venc = format(addMonths(base, i), 'yyyy-MM-dd')
      const boleto: Boleto = {
        id: crypto.randomUUID(),
        descricao: `${input.descricaoBase || compra.descricao || 'Compra'} (${i + 1}/${input.parcelas})`,
        valor: Number(valorParcela.toFixed(2)),
        vencimento: venc,
        pago: false,
        compraId: compra.id,
        criadoEm: nowIso(),
      }
      storageBoletos.save(boleto)
      saida.push(boleto)
    }
    return saida
  },

  excluirCompra: (compraId: string) => {
    const compra = comprasRepository.getCompras().find((c) => c.id === compraId)
    if (!compra) return
    const contas = storageBoletos.getAll().filter((b) => b.compraId === compraId)
    if (contas.some((b) => b.pago)) throw new Error('Compra possui contas pagas. Exclusao bloqueada para manter historico.')
    const atualizadas = comprasRepository.getCompras().map((c) => (c.id === compraId ? { ...c, ativo: false, atualizadoEm: nowIso() } : c))
    comprasRepository.setCompras(atualizadas)
  },

  kpisMensais: (mesCompetencia: string): KpisCompras => {
    const compras = comprasRepository.getCompras().filter((c) => c.ativo && c.competenciaMes === mesCompetencia)
    const totalMes = compras.reduce((s, c) => s + c.valorTotal, 0)
    const totalComNf = compras.filter((c) => c.temNotaFiscal).reduce((s, c) => s + c.valorTotal, 0)
    const totalSemNf = compras.filter((c) => !c.temNotaFiscal).reduce((s, c) => s + c.valorTotal, 0)
    const contas = storageBoletos.getAll().filter((b) => compras.some((c) => c.id === b.compraId))
    const contasPagarPagas = contas.filter((b) => b.pago).length
    const contasPagarPendentes = contas.filter((b) => !b.pago).length
    return {
      totalMes,
      totalComNf,
      totalSemNf,
      percentualComNf: totalMes > 0 ? (totalComNf / totalMes) * 100 : 0,
      percentualSemNf: totalMes > 0 ? (totalSemNf / totalMes) * 100 : 0,
      contasPagarGeradas: contas.length,
      contasPagarPendentes,
      contasPagarPagas,
    }
  },
}
