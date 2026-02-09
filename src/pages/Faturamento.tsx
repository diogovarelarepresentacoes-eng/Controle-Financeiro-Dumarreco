import { useState, useMemo, useCallback } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, getYear } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { storageVendas, storageBoletos, storageFaturamentoMensal } from '../services/storage'
import type { FaturamentoMensal as FaturamentoMensalType } from '../types'
import { applyCurrencyMask, parseCurrencyFromInput, formatCurrencyForInput } from '../utils/currencyMask'

const MESES_NOMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO ', 'OUTUBRO ', 'NOVEMBRO', 'DEZEMBRO',
]

export type LinhaFaturamento = {
  ano: number
  mes: number
  mesLabel: string
  compras: number
  vendaCartao: number
  faturamento: number
  acordo: number
  mercadoria: number
  total: number
  totalAnoAnterior: number
  percCresc: number | null
  // Tabela 2
  inventarioInicio: number
  compraSemNota: number
  inventarioFim: number
  custoMercVendidas: number
  despesas: number
  lucroBruto: number
  lucroLiq: number
  percFat: number | null
  faturamentoMensalId?: string
}

function buildLinhasAno(
  ano: number,
  vendas: { data: string; valor: number; formaPagamento: string }[],
  boletos: { pago: boolean; dataPagamento?: string; valor: number }[],
  faturamentoMensal: FaturamentoMensalType[],
  totaisAnoAnterior: number[] // total por mês (1-12) do ano anterior
): LinhaFaturamento[] {
  const linhas: LinhaFaturamento[] = []
  let inventarioInicioAnterior = 0

  for (let mes = 1; mes <= 12; mes++) {
    const inicio = startOfMonth(new Date(ano, mes - 1))
    const fim = endOfMonth(inicio)
    const vendasNoMes = vendas.filter((v) => {
      const d = parseISO(v.data)
      return d >= inicio && d <= fim
    })
    const faturamento = vendasNoMes.reduce((s, v) => s + v.valor, 0)
    const vendaCartao = vendasNoMes
      .filter((v) => v.formaPagamento === 'debito' || v.formaPagamento === 'credito')
      .reduce((s, v) => s + v.valor, 0)
    const boletosPagosNoMes = boletos
      .filter((b) => b.pago && b.dataPagamento)
      .filter((b) => {
        const d = parseISO(b.dataPagamento!)
        return d >= inicio && d <= fim
      })
    const despesas = boletosPagosNoMes.reduce((s, b) => s + b.valor, 0)

    const compl = faturamentoMensal.find((f) => f.ano === ano && f.mes === mes)
    const compras = compl?.comprasDoMes ?? 0
    const compraSemNota = compl?.compraSemNota ?? 0
    const acordo = compl?.acordos ?? 0
    const mercadoria = compl?.mercadorias ?? 0
    const inventarioInicio = compl !== undefined ? compl.valorInventarioInicio : inventarioInicioAnterior
    const inventarioFim = compl?.valorInventarioFim ?? 0

    const total = faturamento + acordo + mercadoria
    const totalAnt = totaisAnoAnterior[mes - 1] ?? 0
    const percCresc = totalAnt > 0 ? (total - totalAnt) / totalAnt : null

    const custoMercVendidas = inventarioInicio + compras + compraSemNota - inventarioFim
    const lucroBruto = faturamento - custoMercVendidas
    const lucroLiq = lucroBruto - despesas
    const percFat = faturamento > 0 ? lucroLiq / faturamento : null

    linhas.push({
      ano,
      mes,
      mesLabel: MESES_NOMES[mes - 1],
      compras,
      vendaCartao,
      faturamento,
      acordo,
      mercadoria,
      total,
      totalAnoAnterior: totalAnt,
      percCresc: percCresc !== null ? percCresc : null,
      inventarioInicio,
      compraSemNota,
      inventarioFim,
      custoMercVendidas,
      despesas,
      lucroBruto,
      lucroLiq,
      percFat,
      faturamentoMensalId: compl?.id,
    })
    inventarioInicioAnterior = inventarioFim
  }
  return linhas
}

export default function Faturamento() {
  const anoAtual = new Date().getFullYear()
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)
  const [vendas, setVendas] = useState(() => storageVendas.getAll())
  const [boletos, setBoletos] = useState(() => storageBoletos.getAll())
  const [faturamentoMensal, setFaturamentoMensal] = useState(() => storageFaturamentoMensal.getAll())
  const [modalMes, setModalMes] = useState<{ ano: number; mes: number } | null>(null)
  const [form, setForm] = useState({
    valorInventarioInicio: '',
    valorInventarioFim: '',
    comprasDoMes: '',
    compraSemNota: '',
    acordos: '',
    mercadorias: '',
  })

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const formatPerc = (v: number) => `${(v * 100).toFixed(2)}%`

  const reload = useCallback(() => {
    setVendas(storageVendas.getAll())
    setBoletos(storageBoletos.getAll())
    setFaturamentoMensal(storageFaturamentoMensal.getAll())
  }, [])

  const totaisAnoAnterior = useMemo(() => {
    const linhasAnt = buildLinhasAno(anoSelecionado - 1, vendas, boletos, faturamentoMensal, [])
    return linhasAnt.map((l) => l.total)
  }, [anoSelecionado, vendas, boletos, faturamentoMensal])

  const linhas = useMemo(
    () => buildLinhasAno(anoSelecionado, vendas, boletos, faturamentoMensal, totaisAnoAnterior),
    [anoSelecionado, vendas, boletos, faturamentoMensal, totaisAnoAnterior]
  )

  const totais = useMemo(() => ({
    compras: linhas.reduce((s, l) => s + l.compras, 0),
    vendaCartao: linhas.reduce((s, l) => s + l.vendaCartao, 0),
    faturamento: linhas.reduce((s, l) => s + l.faturamento, 0),
    acordo: linhas.reduce((s, l) => s + l.acordo, 0),
    mercadoria: linhas.reduce((s, l) => s + l.mercadoria, 0),
    total: linhas.reduce((s, l) => s + l.total, 0),
    despesas: linhas.reduce((s, l) => s + l.despesas, 0),
    lucroBruto: linhas.reduce((s, l) => s + l.lucroBruto, 0),
    lucroLiq: linhas.reduce((s, l) => s + l.lucroLiq, 0),
  }), [linhas])

  const medias = useMemo(() => ({
    compras: linhas.length ? totais.compras / 12 : 0,
    vendaCartao: linhas.length ? totais.vendaCartao / 12 : 0,
    faturamento: linhas.length ? totais.faturamento / 12 : 0,
    acordo: linhas.length ? totais.acordo / 12 : 0,
    mercadoria: linhas.length ? totais.mercadoria / 12 : 0,
    total: linhas.length ? totais.total / 12 : 0,
  }), [linhas.length, totais])

  const totalAnoAnterior = totaisAnoAnterior.reduce((s, t) => s + t, 0)
  const percCrescAnual = totalAnoAnterior > 0 ? (totais.total - totalAnoAnterior) / totalAnoAnterior : null

  const abrirModal = (ano: number, mes: number) => {
    const compl = faturamentoMensal.find((f) => f.ano === ano && f.mes === mes)
    const invInicioSugerido = mes === 1 ? 0 : faturamentoMensal.find((f) => f.ano === ano && f.mes === mes - 1)?.valorInventarioFim ?? 0
    const v = (n: number) => (n === 0 ? '0,00' : formatCurrencyForInput(n) || '0,00')
    setForm({
      valorInventarioInicio: compl ? v(compl.valorInventarioInicio) : v(invInicioSugerido),
      valorInventarioFim: compl ? v(compl.valorInventarioFim) : '0,00',
      comprasDoMes: compl ? v(compl.comprasDoMes) : '0,00',
      compraSemNota: compl ? v(compl.compraSemNota) : '0,00',
      acordos: compl ? v(compl.acordos) : '0,00',
      mercadorias: compl ? v(compl.mercadorias) : '0,00',
    })
    setModalMes({ ano, mes })
  }

  const salvarDadosMes = (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalMes) return
    const existente = faturamentoMensal.find((f) => f.ano === modalMes.ano && f.mes === modalMes.mes)
    const item: FaturamentoMensalType = {
      id: existente?.id ?? crypto.randomUUID(),
      ano: modalMes.ano,
      mes: modalMes.mes,
      valorInventarioInicio: parseCurrencyFromInput(form.valorInventarioInicio),
      valorInventarioFim: parseCurrencyFromInput(form.valorInventarioFim),
      comprasDoMes: parseCurrencyFromInput(form.comprasDoMes),
      compraSemNota: parseCurrencyFromInput(form.compraSemNota),
      acordos: parseCurrencyFromInput(form.acordos),
      mercadorias: parseCurrencyFromInput(form.mercadorias),
      criadoEm: existente?.criadoEm ?? new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
    storageFaturamentoMensal.save(item)
    reload()
    setModalMes(null)
  }

  const dadosGraficoLinha = useMemo(() => linhas.map((d) => ({ mes: d.mesLabel.slice(0, 3), total: d.total, faturamento: d.faturamento })), [linhas])
  const dadosGraficoBarras = useMemo(() => {
    const anos = [anoSelecionado - 1, anoSelecionado]
    return anos.map((a) => ({
      ano: String(a),
      total: buildLinhasAno(a, vendas, boletos, faturamentoMensal, []).reduce((s, l) => s + l.total, 0),
    }))
  }, [anoSelecionado, vendas, boletos, faturamentoMensal])

  const anosDisponiveis = useMemo(() => {
    const anos = new Set<number>()
    vendas.forEach((v) => anos.add(getYear(parseISO(v.data))))
    faturamentoMensal.forEach((f) => anos.add(f.ano))
    anos.add(anoAtual)
    anos.add(anoAtual - 1)
    return Array.from(anos).sort((a, b) => b - a)
  }, [vendas, faturamentoMensal, anoAtual])

  return (
    <div className="faturamento-page relatorios-page">
      <h1 className="page-title no-print">Acompanhamento do Faturamento</h1>
      <p className="no-print" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        Estrutura igual à planilha: faturamento e venda cartão vêm das <strong>Vendas</strong>, despesas dos <strong>Boletos pagos</strong>. Informe apenas o <strong>inventário</strong> (início e fim do mês) e, se quiser, compras, acordo e mercadoria.
      </p>

      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Ano</label>
          <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))}>
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Imprimir / Salvar em PDF
        </button>
      </div>

      {/* Tabela 1 - Igual planilha: COMPRAS | VENDA CARTÃO | FATURAMENTO | ACORDO | MERCADORIA | TOTAL | ANO ANTERIOR | % CRESC. */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="relatorio-titulo">Planilha de Acompanhamento do Faturamento</h2>
        <p className="relatorio-periodo">Ano {anoSelecionado}</p>
        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>{anoSelecionado}</th>
                <th>COMPRAS</th>
                <th>VENDA CARTÃO</th>
                <th>FATURAMENTO</th>
                <th>ACORDO</th>
                <th>MERCADORIA</th>
                <th>TOTAL</th>
                <th>ANO {anoSelecionado - 1}</th>
                <th>% CRESC.</th>
                <th className="no-print">Editar</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={`${l.ano}-${l.mes}`}>
                  <td><strong>{l.mesLabel}</strong></td>
                  <td>{formatMoney(l.compras)}</td>
                  <td>{formatMoney(l.vendaCartao)}</td>
                  <td>{formatMoney(l.faturamento)}</td>
                  <td>{formatMoney(l.acordo)}</td>
                  <td>{formatMoney(l.mercadoria)}</td>
                  <td className="saldo-positivo">{formatMoney(l.total)}</td>
                  <td>{formatMoney(l.totalAnoAnterior)}</td>
                  <td>{l.percCresc !== null ? formatPerc(l.percCresc) : '—'}</td>
                  <td className="no-print">
                    <button type="button" className="btn btn-secondary" onClick={() => abrirModal(l.ano, l.mes)}>
                      Dados do mês
                    </button>
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: 'var(--bg-input)' }}>
                <td>TOTAL</td>
                <td>{formatMoney(totais.compras)}</td>
                <td>{formatMoney(totais.vendaCartao)}</td>
                <td>{formatMoney(totais.faturamento)}</td>
                <td>{formatMoney(totais.acordo)}</td>
                <td>{formatMoney(totais.mercadoria)}</td>
                <td>{formatMoney(totais.total)}</td>
                <td>{formatMoney(totalAnoAnterior)}</td>
                <td>{percCrescAnual !== null ? formatPerc(percCrescAnual) : '—'}</td>
                <td className="no-print" />
              </tr>
              <tr style={{ fontWeight: 600 }}>
                <td>MEDIA ANUAL</td>
                <td>{formatMoney(medias.compras)}</td>
                <td>{formatMoney(medias.vendaCartao)}</td>
                <td>{formatMoney(medias.faturamento)}</td>
                <td>{formatMoney(medias.acordo)}</td>
                <td>{formatMoney(medias.mercadoria)}</td>
                <td>{formatMoney(medias.total)}</td>
                <td>{formatMoney(totalAnoAnterior / 12)}</td>
                <td>{percCrescAnual !== null ? formatPerc(percCrescAnual) : '—'}</td>
                <td className="no-print" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela 2 - INICIO MÊS VLR INVENT. | COMPRAS | COMPRA S/NOTA | FINAL MÊS VLR INVENT. | CUSTO | FATURAMENTO | LUCRO BRUTO | DESPESAS | LUCRO LIQ. | %/FAT */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Inventário e resultado</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          Inventário início/fim do mês: informe em &quot;Dados do mês&quot;. Despesas = boletos pagos no mês. Custo = Inventário início + Compras + Compra s/nota − Inventário fim.
        </p>
        <div className="table-wrap">
          <table className="relatorio-tabela">
            <thead>
              <tr>
                <th>MÊS</th>
                <th>INICIO MÊS<br />VLR INVENT.</th>
                <th>COMPRAS<br />NO MÊS</th>
                <th>COMPRA<br />S/NOTA</th>
                <th>FINAL MÊS<br />VLR INVENT.</th>
                <th>CUSTO MERC.<br />VENDIDAS</th>
                <th>FATURAMENTO</th>
                <th>LUCRO BRUTO</th>
                <th>DESPESAS</th>
                <th>LUCRO LIQ.</th>
                <th>%/FAT</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={`t2-${l.ano}-${l.mes}`}>
                  <td><strong>{l.mesLabel}</strong></td>
                  <td>{formatMoney(l.inventarioInicio)}</td>
                  <td>{formatMoney(l.compras)}</td>
                  <td>{formatMoney(l.compraSemNota)}</td>
                  <td>{formatMoney(l.inventarioFim)}</td>
                  <td>{formatMoney(l.custoMercVendidas)}</td>
                  <td>{formatMoney(l.faturamento)}</td>
                  <td className={l.lucroBruto >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(l.lucroBruto)}</td>
                  <td>{formatMoney(l.despesas)}</td>
                  <td className={l.lucroLiq >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(l.lucroLiq)}</td>
                  <td>{l.percFat !== null ? formatPerc(l.percFat) : '—'}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: 'var(--bg-input)' }}>
                <td>TOTAL</td>
                <td>{formatMoney(linhas.reduce((s, l) => s + l.inventarioInicio, 0))}</td>
                <td>{formatMoney(totais.compras)}</td>
                <td>{formatMoney(linhas.reduce((s, l) => s + l.compraSemNota, 0))}</td>
                <td>{formatMoney(linhas.reduce((s, l) => s + l.inventarioFim, 0))}</td>
                <td>{formatMoney(linhas.reduce((s, l) => s + l.custoMercVendidas, 0))}</td>
                <td>{formatMoney(totais.faturamento)}</td>
                <td className={totais.lucroBruto >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(totais.lucroBruto)}</td>
                <td>{formatMoney(totais.despesas)}</td>
                <td className={totais.lucroLiq >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>{formatMoney(totais.lucroLiq)}</td>
                <td>{totais.faturamento > 0 ? formatPerc(totais.lucroLiq / totais.faturamento) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos */}
      <div className="card no-print" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Evolução mensal (TOTAL) e comparativo anual</h3>
        <div style={{ width: '100%', height: 300, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGraficoLinha} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: number) => [formatMoney(v), '']} labelFormatter={(_, p) => p[0]?.payload?.mes ?? ''} />
              <Line type="monotone" dataKey="total" name="Total" stroke="var(--primary)" strokeWidth={2} dot={{ fill: 'var(--primary)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoBarras} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ano" stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: number) => [formatMoney(v), 'Total']} />
              <Bar dataKey="total" name="Total anual" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="relatorio-rodape" style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Controle Financeiro Dumarreco — Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
      </p>

      {modalMes && (
        <div className="modal-overlay" onClick={() => setModalMes(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Dados do mês — {MESES_NOMES[modalMes.mes - 1]} {modalMes.ano}</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Faturamento e venda cartão vêm das vendas; despesas dos boletos pagos. Informe inventário (início e fim do mês) e, se desejar, compras, acordo e mercadoria.
            </p>
            <form onSubmit={salvarDadosMes}>
              <div className="form-group">
                <label>Inventário início do mês (R$)</label>
                <input value={form.valorInventarioInicio} onChange={(e) => setForm((f) => ({ ...f, valorInventarioInicio: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Inventário fim do mês (R$)</label>
                <input value={form.valorInventarioFim} onChange={(e) => setForm((f) => ({ ...f, valorInventarioFim: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Compras no mês (R$)</label>
                <input value={form.comprasDoMes} onChange={(e) => setForm((f) => ({ ...f, comprasDoMes: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Compra s/ nota (R$)</label>
                <input value={form.compraSemNota} onChange={(e) => setForm((f) => ({ ...f, compraSemNota: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Acordo (R$)</label>
                <input value={form.acordos} onChange={(e) => setForm((f) => ({ ...f, acordos: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="form-group">
                <label>Mercadoria (R$)</label>
                <input value={form.mercadorias} onChange={(e) => setForm((f) => ({ ...f, mercadorias: applyCurrencyMask(e.target.value) }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalMes(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
