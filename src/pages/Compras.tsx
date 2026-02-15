import { useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import type { CompraComRelacionamentos, FiltroNf, FiltroStatusPagamento } from '../modules/compras/model'
import { applyCurrencyMask, parseCurrencyFromInput } from '../utils/currencyMask'
import { purchasesGateway } from '../services/purchasesGateway'

const hoje = new Date()
const mesAtual = format(startOfMonth(hoje), 'yyyy-MM')

export default function Compras() {
  const [lista, setLista] = useState<CompraComRelacionamentos[]>([])
  const [mesCompetencia, setMesCompetencia] = useState(mesAtual)
  const [filtroFornecedor, setFiltroFornecedor] = useState('')
  const [filtroNf, setFiltroNf] = useState<FiltroNf>('todas')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusPagamento>('todos')
  const [modalManual, setModalManual] = useState(false)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [modalParcelarCompraId, setModalParcelarCompraId] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erroTela, setErroTela] = useState<string | null>(null)
  const [resultadoImportacao, setResultadoImportacao] = useState<{ ok: number; erros: number; mensagens: string[] } | null>(null)
  const inputXmlRef = useRef<HTMLInputElement>(null)

  const [manualForm, setManualForm] = useState({
    fornecedorNome: '',
    fornecedorCnpj: '',
    dataEmissao: new Date().toISOString().slice(0, 10),
    descricao: '',
    observacoes: '',
    valorTotal: '',
    categoria: '',
    centroCusto: '',
  })

  const [parcelamentoForm, setParcelamentoForm] = useState({
    valorTotal: '',
    parcelas: 1,
    primeiroVencimento: new Date().toISOString().slice(0, 10),
    descricaoBase: '',
  })

  const load = async () => {
    setCarregando(true)
    setErroTela(null)
    try {
      const data = await purchasesGateway.list({
        mesCompetencia,
        fornecedor: filtroFornecedor,
        tipoNota: filtroNf,
        statusPagamento: filtroStatus,
      })
      setLista(data)
    } catch (err) {
      setErroTela(err instanceof Error ? err.message : 'Falha ao carregar compras.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void load()
  }, [mesCompetencia, filtroFornecedor, filtroNf, filtroStatus])

  const kpis = useMemo(() => {
    const comprasMes = lista.filter((i) => i.compra.competenciaMes === mesCompetencia)
    const totalMes = comprasMes.reduce((s, c) => s + c.compra.valorTotal, 0)
    const totalComNf = comprasMes.filter((c) => c.compra.temNotaFiscal).reduce((s, c) => s + c.compra.valorTotal, 0)
    const totalSemNf = comprasMes.filter((c) => !c.compra.temNotaFiscal).reduce((s, c) => s + c.compra.valorTotal, 0)
    const contas = comprasMes.flatMap((c) => c.contasPagar)
    const contasPagarPagas = contas.filter((c) => c.pago).length
    const contasPagarPendentes = contas.filter((c) => !c.pago).length
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
  }, [lista, mesCompetencia])
  const detalhe = detalheId ? lista.find((x) => x.compra.id === detalheId) : undefined
  const compraParaParcelar = modalParcelarCompraId ? lista.find((x) => x.compra.id === modalParcelarCompraId) : undefined

  const formatMoney = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const criarCompraManual = async (e: React.FormEvent) => {
    e.preventDefault()
    const valorTotal = parseCurrencyFromInput(manualForm.valorTotal)
    try {
      await purchasesGateway.createManual({
        fornecedorNome: manualForm.fornecedorNome,
        fornecedorCnpj: manualForm.fornecedorCnpj || undefined,
        dataEmissao: manualForm.dataEmissao,
        descricao: manualForm.descricao,
        observacoes: manualForm.observacoes,
        valorTotal,
        categoria: manualForm.categoria || undefined,
        centroCusto: manualForm.centroCusto || undefined,
      })
      setModalManual(false)
      setManualForm({
        fornecedorNome: '',
        fornecedorCnpj: '',
        dataEmissao: new Date().toISOString().slice(0, 10),
        descricao: '',
        observacoes: '',
        valorTotal: '',
        categoria: '',
        centroCusto: '',
      })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao criar compra manual.')
    }
  }

  const lerArquivoComoTexto = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file, 'UTF-8')
    })

  const importarXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setImportando(true)
    let ok = 0
    let erros = 0
    const mensagens: string[] = []

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (!f.name.toLowerCase().endsWith('.xml')) {
        erros++
        mensagens.push(`${f.name}: arquivo ignorado (nao e XML).`)
        continue
      }
      try {
        const xml = await lerArquivoComoTexto(f)
        const compra = await purchasesGateway.importXml(xml, 'usuario_local')
        ok++
        const chave = (compra as { nfeChaveAcesso?: string; nfeAccessKey?: string }).nfeChaveAcesso
          ?? (compra as { nfeAccessKey?: string }).nfeAccessKey
          ?? 'sem-chave'
        mensagens.push(`${f.name}: importado com sucesso (${chave}).`)
      } catch (err) {
        erros++
        mensagens.push(`${f.name}: ${err instanceof Error ? err.message : 'falha ao importar XML.'}`)
      }
    }

    setImportando(false)
    setResultadoImportacao({ ok, erros, mensagens })
    e.target.value = ''
    await load()
  }

  const abrirModalParcelamento = (compraId: string) => {
    const compra = lista.find((x) => x.compra.id === compraId)
    setModalParcelarCompraId(compraId)
    setParcelamentoForm({
      valorTotal: compra ? formatMoney(compra.compra.valorTotal) : '',
      parcelas: 1,
      primeiroVencimento: new Date().toISOString().slice(0, 10),
      descricaoBase: compra?.compra.descricao ?? '',
    })
  }

  const gerarParcelamentoManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalParcelarCompraId) return
    try {
      await purchasesGateway.generatePayables({
        compraId: modalParcelarCompraId,
        valorTotal: parseCurrencyFromInput(parcelamentoForm.valorTotal),
        parcelas: parcelamentoForm.parcelas,
        primeiroVencimento: parcelamentoForm.primeiroVencimento,
        descricaoBase: parcelamentoForm.descricaoBase,
      })
      setModalParcelarCompraId(null)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao gerar contas a pagar.')
    }
  }

  const excluirCompra = async (id: string) => {
    if (!confirm('Deseja excluir esta compra?')) return
    try {
      await purchasesGateway.remove(id)
      if (detalheId === id) setDetalheId(null)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir compra.')
    }
  }

  return (
    <>
      <h1 className="page-title">Compras Mensal</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Controle de compras com e sem nota fiscal, incluindo importacao de XML NF-e integrada ao contas a pagar.
      </p>
      {!purchasesGateway.usingBackend && (
        <p style={{ color: 'var(--warning)', marginBottom: 12 }}>
          API backend nao configurada (`VITE_API_BASE_URL`). Tela operando em modo local (legado).
        </p>
      )}
      {erroTela && (
        <p style={{ color: 'var(--danger)', marginBottom: 12 }}>
          {erroTela}
        </p>
      )}

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="button" onClick={() => setModalManual(true)}>Nova compra manual</button>
        <input ref={inputXmlRef} type="file" accept=".xml" multiple onChange={importarXml} style={{ display: 'none' }} />
        <button className="btn btn-secondary" type="button" onClick={() => inputXmlRef.current?.click()} disabled={importando}>
          {importando ? 'Importando...' : 'Importar XML NF-e'}
        </button>
      </div>

      {resultadoImportacao && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Resultado da importacao</h3>
          <p style={{ marginBottom: 8 }}>
            <span className="saldo-positivo">{resultadoImportacao.ok} sucesso(s)</span> e{' '}
            <span className="saldo-negativo">{resultadoImportacao.erros} erro(s)</span>.
          </p>
          <ul style={{ paddingLeft: 16 }}>
            {resultadoImportacao.mensagens.map((m, i) => (
              <li key={`${i}-${m}`} style={{ marginBottom: 4 }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card no-print" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Filtros</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Competencia (mes)</label>
            <input type="month" value={mesCompetencia} onChange={(e) => setMesCompetencia(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Fornecedor</label>
            <input value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
          </div>
          <div className="form-group">
            <label>Com/Sem NF</label>
            <select value={filtroNf} onChange={(e) => setFiltroNf(e.target.value as FiltroNf)}>
              <option value="todas">Todas</option>
              <option value="com_nf">Com nota fiscal</option>
              <option value="sem_nf">Sem nota fiscal</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status pagamento</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as FiltroStatusPagamento)}>
              <option value="todos">Todos</option>
              <option value="sem_contas">Sem contas a pagar</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: 20 }}>
        <div className="card-saldo">
          <h3>Total do mes</h3>
          <div className="valor">{formatMoney(kpis.totalMes)}</div>
        </div>
        <div className="card-saldo">
          <h3>% com NF</h3>
          <div className="valor">{kpis.percentualComNf.toFixed(2)}%</div>
        </div>
        <div className="card-saldo">
          <h3>% sem NF</h3>
          <div className="valor">{kpis.percentualSemNf.toFixed(2)}%</div>
        </div>
        <div className="card-saldo">
          <h3>Contas a pagar geradas</h3>
          <div className="valor">{kpis.contasPagarGeradas}</div>
        </div>
        <div className="card-saldo">
          <h3>Pendente vs Pago</h3>
          <div className="valor">{kpis.contasPagarPendentes} / {kpis.contasPagarPagas}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Compras do mes</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emissao</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>NF</th>
                <th>Status contas</th>
                <th>Categoria / Centro custo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={7} style={{ color: 'var(--text-muted)', padding: 16 }}>Carregando compras...</td>
                </tr>
              )}
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ color: 'var(--text-muted)', padding: 16 }}>Nenhuma compra encontrada.</td>
                </tr>
              ) : (
                lista.map(({ compra, contasPagar }) => {
                  const status = contasPagar.length === 0 ? 'sem_contas' : contasPagar.some((b) => !b.pago) ? 'pendente' : 'pago'
                  return (
                    <tr key={compra.id}>
                      <td>{format(new Date(`${compra.dataEmissao}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}</td>
                      <td>{compra.fornecedorNome}</td>
                      <td>{formatMoney(compra.valorTotal)}</td>
                      <td>{compra.temNotaFiscal ? 'Com NF' : 'Sem NF'}</td>
                      <td>{status}</td>
                      <td>{`${compra.categoria ?? '-'} / ${compra.centroCusto ?? '-'}`}</td>
                      <td>
                        <button type="button" className="btn btn-secondary" onClick={() => setDetalheId(compra.id)} style={{ marginRight: 8 }}>
                          Detalhar
                        </button>
                        {contasPagar.length === 0 && (
                          <button type="button" className="btn btn-primary" onClick={() => abrirModalParcelamento(compra.id)} style={{ marginRight: 8 }}>
                            Gerar contas a pagar
                          </button>
                        )}
                        <button type="button" className="btn btn-danger" onClick={() => excluirCompra(compra.id)}>Excluir</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalhe && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 10 }}>Detalhe da compra</h3>
          <p><strong>Fornecedor:</strong> {detalhe.compra.fornecedorNome} {detalhe.compra.fornecedorCnpj ? `(${detalhe.compra.fornecedorCnpj})` : ''}</p>
          <p><strong>Descricao:</strong> {detalhe.compra.descricao}</p>
          <p><strong>Chave NF:</strong> {detalhe.compra.nfeChaveAcesso ?? '-'}</p>
          <p><strong>Valor total:</strong> {formatMoney(detalhe.compra.valorTotal)}</p>
          <p><strong>Contas a pagar vinculadas:</strong> {detalhe.contasPagar.length}</p>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>NCM</th>
                  <th>Qtde</th>
                  <th>Unit</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {detalhe.itens.length === 0 ? (
                  <tr><td colSpan={5} style={{ color: 'var(--text-muted)' }}>Sem itens cadastrados.</td></tr>
                ) : (
                  detalhe.itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.descricao}</td>
                      <td>{i.ncm ?? '-'}</td>
                      <td>{i.quantidade}</td>
                      <td>{formatMoney(i.valorUnitario)}</td>
                      <td>{formatMoney(i.valorTotal)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalManual && (
        <div className="modal-overlay" onClick={() => setModalManual(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <h2>Nova compra manual (sem NF)</h2>
            <form onSubmit={criarCompraManual}>
              <div className="form-row">
                <div className="form-group">
                  <label>Fornecedor *</label>
                  <input required value={manualForm.fornecedorNome} onChange={(e) => setManualForm((f) => ({ ...f, fornecedorNome: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>CNPJ fornecedor</label>
                  <input value={manualForm.fornecedorCnpj} onChange={(e) => setManualForm((f) => ({ ...f, fornecedorCnpj: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Data emissao/compra *</label>
                  <input required type="date" value={manualForm.dataEmissao} onChange={(e) => setManualForm((f) => ({ ...f, dataEmissao: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Valor total *</label>
                  <input
                    required
                    value={manualForm.valorTotal}
                    onChange={(e) => setManualForm((f) => ({ ...f, valorTotal: applyCurrencyMask(e.target.value) }))}
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <input value={manualForm.categoria} onChange={(e) => setManualForm((f) => ({ ...f, categoria: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Centro de custo</label>
                  <input value={manualForm.centroCusto} onChange={(e) => setManualForm((f) => ({ ...f, centroCusto: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Descricao</label>
                <input value={manualForm.descricao} onChange={(e) => setManualForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Observacoes</label>
                <textarea rows={3} value={manualForm.observacoes} onChange={(e) => setManualForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalManual(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Cadastrar compra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {compraParaParcelar && (
        <div className="modal-overlay" onClick={() => setModalParcelarCompraId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Gerar contas a pagar - {compraParaParcelar.compra.fornecedorNome}</h2>
            <form onSubmit={gerarParcelamentoManual}>
              <div className="form-group">
                <label>Descricao base</label>
                <input value={parcelamentoForm.descricaoBase} onChange={(e) => setParcelamentoForm((f) => ({ ...f, descricaoBase: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Valor total</label>
                  <input
                    required
                    value={parcelamentoForm.valorTotal}
                    onChange={(e) => setParcelamentoForm((f) => ({ ...f, valorTotal: applyCurrencyMask(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label>Parcelas</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={parcelamentoForm.parcelas}
                    onChange={(e) => setParcelamentoForm((f) => ({ ...f, parcelas: Math.max(1, Math.min(60, Number(e.target.value) || 1)) }))}
                  />
                </div>
                <div className="form-group">
                  <label>Primeiro vencimento</label>
                  <input
                    required
                    type="date"
                    value={parcelamentoForm.primeiroVencimento}
                    onChange={(e) => setParcelamentoForm((f) => ({ ...f, primeiroVencimento: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalParcelarCompraId(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Gerar contas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
