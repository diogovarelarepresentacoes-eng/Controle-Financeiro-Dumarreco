import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { despesasController } from '../modules/despesas/controller'
import {
  CATEGORIAS_DESPESA,
  FORMAS_PAGAMENTO_DESPESA,
  type CategoriaDespesa,
  type Despesa,
  type PeriodicidadeDespesa,
  type StatusDespesa,
  type TipoDespesa,
} from '../modules/despesas/model'
import { applyCurrencyMask, formatCurrencyForInput, parseCurrencyFromInput } from '../utils/currencyMask'
import { formatDateBR } from '../utils/date'
import { storageContas } from '../services/storage'
import type { ContaBanco } from '../types'

const STATUS_OPTIONS: Array<{ value: StatusDespesa; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'atrasado', label: 'Atrasado' },
]

const TIPOS_OPTIONS: Array<{ value: TipoDespesa; label: string }> = [
  { value: 'fixa', label: 'Fixa' },
  { value: 'variavel', label: 'Variavel' },
]

const PERIODICIDADES: PeriodicidadeDespesa[] = ['mensal', 'semanal', 'anual']

const formInicial = {
  descricao: '',
  categoria: 'Outros' as CategoriaDespesa,
  tipo: 'variavel' as TipoDespesa,
  valor: '',
  dataVencimento: new Date().toISOString().slice(0, 10),
  dataPagamento: '',
  status: 'pendente' as StatusDespesa,
  formaPagamento: 'outros' as Despesa['formaPagamento'],
  origemPagamento: '' as '' | 'dinheiro' | 'conta_banco',
  contaBancoId: '',
  fornecedor: '',
  centroCusto: '',
  observacoes: '',
  recorrente: false,
  periodicidade: 'mensal' as PeriodicidadeDespesa,
}

const pagarFormInicial = {
  dataPagamento: new Date().toISOString().slice(0, 10),
  origemPagamento: '' as '' | 'dinheiro' | 'conta_banco',
  contaBancoId: '',
}

function monthRange() {
  const hoje = new Date()
  const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  return {
    inicio: `${ym}-01`,
    fim: `${ym}-31`,
  }
}

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [contas, setContas] = useState<ContaBanco[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(formInicial)
  const [filtroDataInicio, setFiltroDataInicio] = useState(monthRange().inicio)
  const [filtroDataFim, setFiltroDataFim] = useState(monthRange().fim)
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | CategoriaDespesa>('todas')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusDespesa>('todos')
  const [filtroBusca, setFiltroBusca] = useState('')

  const [pagarModalDespesa, setPagarModalDespesa] = useState<Despesa | null>(null)
  const [pagarForm, setPagarForm] = useState(pagarFormInicial)

  const competencia = despesasController.competenciaAtual()
  const [mesDashboard, setMesDashboard] = useState(String(competencia.mes).padStart(2, '0'))
  const [anoDashboard, setAnoDashboard] = useState(String(competencia.ano))

  const load = () => {
    const list = despesasController.listar({
      dataInicio: filtroDataInicio,
      dataFim: filtroDataFim,
      categoria: filtroCategoria,
      status: filtroStatus,
      busca: filtroBusca,
    })
    setDespesas(list)
    setContas(storageContas.getAll().filter((c) => c.ativo))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroDataInicio, filtroDataFim, filtroCategoria, filtroStatus, filtroBusca])

  const dashboard = useMemo(
    () => despesasController.dashboardMensal(Number(anoDashboard), Number(mesDashboard)),
    [anoDashboard, mesDashboard, despesas],
  )

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const openNew = () => {
    setEditingId(null)
    setForm(formInicial)
    setModalOpen(true)
  }

  const openEdit = (d: Despesa) => {
    setEditingId(d.id)
    setForm({
      descricao: d.descricao,
      categoria: d.categoria,
      tipo: d.tipo,
      valor: formatCurrencyForInput(d.valor),
      dataVencimento: d.dataVencimento,
      dataPagamento: d.dataPagamento ?? '',
      status: d.status,
      formaPagamento: d.formaPagamento,
      origemPagamento: d.origemPagamento ?? '',
      contaBancoId: d.contaBancoId ?? '',
      fornecedor: d.fornecedor,
      centroCusto: d.centroCusto,
      observacoes: d.observacoes,
      recorrente: d.recorrente,
      periodicidade: d.periodicidade ?? 'mensal',
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(formInicial)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseCurrencyFromInput(form.valor)

    if (!form.descricao.trim() || !form.categoria || !form.tipo || valor <= 0 || !form.dataVencimento || !form.status) {
      alert('Preencha todos os campos obrigatorios.')
      return
    }

    if (editingId) {
      if (form.status === 'pago' && !form.dataPagamento) {
        alert('Para status pago, informe a data de pagamento.')
        return
      }
      if (form.status === 'pago' && !form.origemPagamento) {
        alert('Para status pago, informe a origem do pagamento (Dinheiro ou Conta banco).')
        return
      }
      if (form.status === 'pago' && form.origemPagamento === 'conta_banco' && !form.contaBancoId) {
        alert('Selecione a conta banco utilizada no pagamento.')
        return
      }
    }

    if (form.recorrente && !form.periodicidade) {
      alert('Selecione a periodicidade da despesa recorrente.')
      return
    }

    const origemPagamento = form.status === 'pago' && form.origemPagamento ? form.origemPagamento : undefined
    const payload = {
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      valor,
      dataVencimento: form.dataVencimento,
      dataPagamento: form.dataPagamento || undefined,
      status: form.status,
      formaPagamento: editingId ? form.formaPagamento : ('outros' as const),
      origemPagamento,
      contaBancoId: origemPagamento === 'conta_banco' ? form.contaBancoId : undefined,
      fornecedor: editingId ? form.fornecedor.trim() : '',
      centroCusto: editingId ? form.centroCusto.trim() : '',
      observacoes: editingId ? form.observacoes.trim() : '',
      recorrente: form.recorrente,
      periodicidade: form.recorrente ? form.periodicidade : undefined,
    }

    try {
      if (editingId) despesasController.atualizar(editingId, payload)
      else despesasController.criar(payload)
      closeModal()
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar despesa.')
    }
  }

  const openPagar = (d: Despesa) => {
    setPagarModalDespesa(d)
    setPagarForm(pagarFormInicial)
  }

  const closePagar = () => {
    setPagarModalDespesa(null)
    setPagarForm(pagarFormInicial)
  }

  const submitPagar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!pagarModalDespesa) return
    if (!pagarForm.dataPagamento) {
      alert('Informe a data de pagamento.')
      return
    }
    if (!pagarForm.origemPagamento) {
      alert('Informe a origem do pagamento.')
      return
    }
    if (pagarForm.origemPagamento === 'conta_banco' && !pagarForm.contaBancoId) {
      alert('Selecione a conta banco.')
      return
    }
    try {
      despesasController.atualizar(pagarModalDespesa.id, {
        status: 'pago',
        dataPagamento: pagarForm.dataPagamento,
        origemPagamento: pagarForm.origemPagamento,
        contaBancoId: pagarForm.origemPagamento === 'conta_banco' ? pagarForm.contaBancoId : undefined,
      })
      closePagar()
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar pagamento.')
    }
  }

  const excluir = (id: string) => {
    if (!confirm('Deseja excluir esta despesa?')) return
    try {
      despesasController.excluir(id)
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir despesa.')
    }
  }

  const exportarRelatorioPdf = () => {
    window.print()
  }

  const dadosGrafico = dashboard.categorias.map((c) => ({
    categoria: c.categoria,
    total: Number(c.total.toFixed(2)),
  }))

  return (
    <div className="relatorios-page">
      <h1 className="page-title">Gestao de Despesas</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Cadastro, controle, recorrencia automatica e analise de custos por categoria.
      </p>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          Nova despesa
        </button>
        <button type="button" className="btn btn-secondary" onClick={exportarRelatorioPdf}>
          Exportar relatorio mensal (PDF)
        </button>
      </div>

      <div className="card no-print" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Filtros</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Data inicio</label>
            <input type="date" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data fim</label>
            <input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value as 'todas' | CategoriaDespesa)}>
              <option value="todas">Todas</option>
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as 'todos' | StatusDespesa)}>
              <option value="todos">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Busca</label>
            <input
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              placeholder="Descricao, fornecedor ou centro de custo"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-row no-print" style={{ marginBottom: 8 }}>
          <div className="form-group">
            <label>Mes dashboard</label>
            <select value={mesDashboard} onChange={(e) => setMesDashboard(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>
                  {format(new Date(2000, Number(m) - 1), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ano dashboard</label>
            <input value={anoDashboard} onChange={(e) => setAnoDashboard(e.target.value)} />
          </div>
        </div>

        <div className="grid-cards">
          <div className="card-saldo">
            <h3>Total de despesas do mes</h3>
            <div className="valor">{formatMoney(dashboard.totalDespesasMes)}</div>
          </div>
          <div className="card-saldo">
            <h3>Total pago</h3>
            <div className="valor saldo-positivo">{formatMoney(dashboard.totalPagoMes)}</div>
          </div>
          <div className="card-saldo">
            <h3>Total pendente</h3>
            <div className="valor" style={{ color: 'var(--warning)' }}>{formatMoney(dashboard.totalPendenteMes)}</div>
          </div>
          <div className="card-saldo">
            <h3>Total em atraso</h3>
            <div className="valor saldo-negativo">{formatMoney(dashboard.totalAtrasadoMes)}</div>
          </div>
          <div className="card-saldo">
            <h3>Custo fixo mensal</h3>
            <div className="valor">{formatMoney(dashboard.custoFixoMensal)}</div>
          </div>
          <div className="card-saldo">
            <h3>Custo variavel mensal</h3>
            <div className="valor">{formatMoney(dashboard.custoVariavelMensal)}</div>
          </div>
          <div className="card-saldo">
            <h3>Projecao proximo mes</h3>
            <div className="valor">{formatMoney(dashboard.totalProjetadoProximoMes)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Analise por categoria</h3>
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Total</th>
                <th>% do custo mensal</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.categorias.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--text-muted)' }}>Sem despesas no mes selecionado.</td>
                </tr>
              ) : (
                dashboard.categorias.map((c) => (
                  <tr key={c.categoria}>
                    <td>{c.categoria}</td>
                    <td>{formatMoney(c.total)}</td>
                    <td>{c.percentualDoTotal.toFixed(2)}%</td>
                    <td>{c.alertaAcimaDe30 ? <span className="badge badge-warning">Acima de 30%</span> : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="categoria" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="total" name="Total por categoria" fill="#1d9bf0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Despesas cadastradas</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descricao</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Fornecedor</th>
                <th>Centro de custo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {despesas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ color: 'var(--text-muted)' }}>
                    Nenhuma despesa encontrada para os filtros.
                  </td>
                </tr>
              ) : (
                despesas.map((d) => (
                  <tr key={d.id}>
                    <td>{d.descricao}</td>
                    <td>{d.categoria}</td>
                    <td>{d.tipo}</td>
                    <td>{formatMoney(d.valor)}</td>
                    <td>{formatDateBR(d.dataVencimento)}</td>
                    <td>{formatDateBR(d.dataPagamento)}</td>
                    <td>
                      <span className={`badge ${d.status === 'pago' ? 'badge-success' : d.status === 'atrasado' ? 'badge-warning' : 'badge-info'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.fornecedor}</td>
                    <td>{d.centroCusto}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {d.status !== 'pago' && (
                        <button type="button" className="btn btn-success" onClick={() => openPagar(d)} style={{ marginRight: 8 }}>
                          Pagar
                        </button>
                      )}
                      <button type="button" className="btn btn-secondary" onClick={() => openEdit(d)} style={{ marginRight: 8 }}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => excluir(d.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova / Editar Despesa */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar despesa' : 'Nova despesa'}</h2>
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Descricao</label>
                  <input required value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select required value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as CategoriaDespesa }))}>
                    {CATEGORIAS_DESPESA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select required value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoDespesa }))}>
                    {TIPOS_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input
                    required
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: applyCurrencyMask(e.target.value) }))}
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div className="form-group">
                  <label>Data de vencimento</label>
                  <input required type="date" value={form.dataVencimento} onChange={(e) => setForm((f) => ({ ...f, dataVencimento: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusDespesa }))}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Campos extras apenas na edicao */}
                {editingId && (
                  <>
                    <div className="form-group">
                      <label>Data de pagamento</label>
                      <input type="date" value={form.dataPagamento} onChange={(e) => setForm((f) => ({ ...f, dataPagamento: e.target.value }))} />
                    </div>
                    {form.status === 'pago' && (
                      <div className="form-group">
                        <label>Origem do pagamento</label>
                        <select
                          value={form.origemPagamento}
                          onChange={(e) => setForm((f) => ({ ...f, origemPagamento: e.target.value as '' | 'dinheiro' | 'conta_banco', contaBancoId: '' }))}
                        >
                          <option value="">Selecione...</option>
                          <option value="dinheiro">Dinheiro (caixa)</option>
                          <option value="conta_banco">Conta banco</option>
                        </select>
                      </div>
                    )}
                    {form.status === 'pago' && form.origemPagamento === 'conta_banco' && (
                      <div className="form-group">
                        <label>Conta banco</label>
                        <select
                          value={form.contaBancoId}
                          onChange={(e) => setForm((f) => ({ ...f, contaBancoId: e.target.value }))}
                        >
                          <option value="">Selecione...</option>
                          {contas.map((c) => (
                            <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label>Forma de pagamento</label>
                      <select
                        value={form.formaPagamento}
                        onChange={(e) => setForm((f) => ({ ...f, formaPagamento: e.target.value as Despesa['formaPagamento'] }))}
                      >
                        {FORMAS_PAGAMENTO_DESPESA.map((fp) => (
                          <option key={fp} value={fp}>{fp}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fornecedor</label>
                      <input value={form.fornecedor} onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Centro de custo</label>
                      <input value={form.centroCusto} onChange={(e) => setForm((f) => ({ ...f, centroCusto: e.target.value }))} />
                    </div>
                  </>
                )}
              </div>

              {editingId && (
                <div className="form-group">
                  <label>Observacoes</label>
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.recorrente}
                      onChange={(e) => setForm((f) => ({ ...f, recorrente: e.target.checked }))}
                    />
                    Despesa recorrente
                  </label>
                </div>
                {form.recorrente && (
                  <div className="form-group">
                    <label>Periodicidade</label>
                    <select value={form.periodicidade} onChange={(e) => setForm((f) => ({ ...f, periodicidade: e.target.value as PeriodicidadeDespesa }))}>
                      {PERIODICIDADES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Salvar' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mini-modal Pagar Despesa */}
      {pagarModalDespesa && (
        <div className="modal-overlay" onClick={closePagar}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h2>Pagar despesa</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              <strong>{pagarModalDespesa.descricao}</strong> — {formatMoney(pagarModalDespesa.valor)}
            </p>
            <form onSubmit={submitPagar}>
              <div className="form-row">
                <div className="form-group">
                  <label>Data de pagamento</label>
                  <input
                    required
                    type="date"
                    value={pagarForm.dataPagamento}
                    onChange={(e) => setPagarForm((f) => ({ ...f, dataPagamento: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Origem do pagamento</label>
                  <select
                    required
                    value={pagarForm.origemPagamento}
                    onChange={(e) => setPagarForm((f) => ({ ...f, origemPagamento: e.target.value as '' | 'dinheiro' | 'conta_banco', contaBancoId: '' }))}
                  >
                    <option value="">Selecione...</option>
                    <option value="dinheiro">Dinheiro (caixa)</option>
                    <option value="conta_banco">Conta banco</option>
                  </select>
                </div>
                {pagarForm.origemPagamento === 'conta_banco' && (
                  <div className="form-group">
                    <label>Conta banco</label>
                    <select
                      required
                      value={pagarForm.contaBancoId}
                      onChange={(e) => setPagarForm((f) => ({ ...f, contaBancoId: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {contas.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome} — {c.banco}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closePagar}>Cancelar</button>
                <button type="submit" className="btn btn-success">Confirmar pagamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
