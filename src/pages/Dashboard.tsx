import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  getDay,
  parseISO,
} from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { storageContas, storageBoletos, storageVendas, getSaldoDinheiro } from '../services/storage'
import type { Boleto } from '../types'

type VendasPorData = {
  data: string
  dataFormatada: string
  pix: number
  dinheiro: number
  debito: number
  credito: number
  total: number
}

type VendasPorMes = {
  mes: string
  mesAno: string
  total: number
  pix: number
  dinheiro: number
  debito: number
  credito: number
}

export default function Dashboard() {
  const [contas] = useState(() => storageContas.getAll())
  const [vendas] = useState(() => storageVendas.getAll())
  const [boletos] = useState(() => storageBoletos.getAll())
  const [mesCalendario, setMesCalendario] = useState(() => new Date())

  const totalSaldoBancario = contas.reduce((s, c) => s + c.saldoAtual, 0)
  const saldoDinheiro = getSaldoDinheiro()
  const boletosPendentes = boletos.filter((b) => !b.pago)
  const totalPendente = boletosPendentes.reduce((s, b) => s + b.valor, 0)
  const totalVendas = vendas.reduce((s, v) => s + v.valor, 0)

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  // Entradas de vendas agrupadas por data (para a tabela)
  const vendasPorData: VendasPorData[] = useMemo(() => {
    const map = new Map<string, { pix: number; dinheiro: number; debito: number; credito: number }>()
    vendas.forEach((v) => {
      const key = v.data
      const cur = map.get(key) ?? { pix: 0, dinheiro: 0, debito: 0, credito: 0 }
      cur[v.formaPagamento] += v.valor
      map.set(key, cur)
    })
    return Array.from(map.entries())
      .map(([data, vals]) => ({
        data,
        dataFormatada: format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR }),
        pix: vals.pix,
        dinheiro: vals.dinheiro,
        debito: vals.debito,
        credito: vals.credito,
        total: vals.pix + vals.dinheiro + vals.debito + vals.credito,
      }))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [vendas])

  // Dados mensais para o gráfico (últimos 12 meses)
  const dadosGraficoMensal: VendasPorMes[] = useMemo(() => {
    const meses: VendasPorMes[] = []
    const hoje = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(hoje, i)
      const inicio = startOfMonth(d)
      const fim = endOfMonth(d)
      const vendasNoMes = vendas.filter((v) => {
        const vd = parseISO(v.data)
        return vd >= inicio && vd <= fim
      })
      const pix = vendasNoMes.filter((v) => v.formaPagamento === 'pix').reduce((s, v) => s + v.valor, 0)
      const dinheiro = vendasNoMes.filter((v) => v.formaPagamento === 'dinheiro').reduce((s, v) => s + v.valor, 0)
      const debito = vendasNoMes.filter((v) => v.formaPagamento === 'debito').reduce((s, v) => s + v.valor, 0)
      const credito = vendasNoMes.filter((v) => v.formaPagamento === 'credito').reduce((s, v) => s + v.valor, 0)
      meses.push({
        mes: format(d, 'MMM', { locale: ptBR }),
        mesAno: format(d, 'MM/yyyy', { locale: ptBR }),
        total: pix + dinheiro + debito + credito,
        pix,
        dinheiro,
        debito,
        credito,
      })
    }
    return meses
  }, [vendas])

  // Boletos por data de vencimento (para o calendário)
  const boletosPorVencimento = useMemo(() => {
    const map = new Map<string, Boleto[]>()
    boletos.forEach((b) => {
      if (!b.vencimento) return
      const key = b.vencimento
      const list = map.get(key) ?? []
      list.push(b)
      map.set(key, list)
    })
    return map
  }, [boletos])

  // Dias do mês para o calendário
  const diasCalendario = useMemo(() => {
    const inicio = startOfMonth(mesCalendario)
    const fim = endOfMonth(mesCalendario)
    return eachDayOfInterval({ start: inicio, end: fim })
  }, [mesCalendario])

  // Primeiro dia do mês para alinhar (domingo = 0)
  const primeiroDiaSemana = getDay(startOfMonth(mesCalendario))
  const diasVaziosInicio = Array.from({ length: primeiroDiaSemana }, (_, i) => i)

  return (
    <>
      <h1 className="page-title">Dashboard</h1>

      <div className="grid-cards" style={{ marginBottom: 32 }}>
        <div className="card-saldo">
          <h3>Saldo bancário total</h3>
          <div className={`valor ${totalSaldoBancario >= 0 ? 'saldo-positivo' : 'saldo-negativo'}`}>
            {formatMoney(totalSaldoBancario)}
          </div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Soma do saldo atual de todas as contas banco
          </p>
        </div>
        <div className="card-saldo">
          <h3>Saldo em dinheiro</h3>
          <div className={`valor ${saldoDinheiro >= 0 ? 'saldo-positivo' : 'saldo-negativo'}`}>
            {formatMoney(saldoDinheiro)}
          </div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Vendas em dinheiro menos boletos pagos em dinheiro
          </p>
        </div>
        <div className="card-saldo">
          <h3>Total de vendas</h3>
          <div className="valor saldo-positivo">{formatMoney(totalVendas)}</div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            PIX, dinheiro, débito e crédito
          </p>
          <Link to="/vendas" style={{ display: 'inline-block', marginTop: 8, fontSize: '0.9rem' }}>
            Controle de Vendas →
          </Link>
        </div>
        <div className="card-saldo">
          <h3>Boletos pendentes</h3>
          <div className="valor" style={{ color: 'var(--warning)' }}>
            {formatMoney(totalPendente)}
          </div>
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {boletosPendentes.length} boleto(s) aguardando pagamento
          </p>
          {boletosPendentes.length > 0 && (
            <Link to="/baixa-boleto" style={{ display: 'inline-block', marginTop: 8, fontSize: '0.9rem' }}>
              Dar baixa →
            </Link>
          )}
        </div>
      </div>

      {/* Entradas de vendas por data */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Entradas de vendas por data</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          Valores por forma de pagamento (PIX, dinheiro, débito e crédito) em cada dia.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>PIX</th>
                <th>Dinheiro</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {vendasPorData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    Nenhuma venda registrada.
                  </td>
                </tr>
              ) : (
                vendasPorData.map((row) => (
                  <tr key={row.data}>
                    <td><strong>{row.dataFormatada}</strong></td>
                    <td>{formatMoney(row.pix)}</td>
                    <td>{formatMoney(row.dinheiro)}</td>
                    <td>{formatMoney(row.debito)}</td>
                    <td>{formatMoney(row.credito)}</td>
                    <td className="saldo-positivo">{formatMoney(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico mensal */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Vendas por mês</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
          Gráfico dos últimos 12 meses. Interaja passando o mouse sobre as barras.
        </p>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoMensal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)' }}
                formatter={(value: number, name: string) => [formatMoney(value), name]}
                labelFormatter={(_, payload) => payload[0]?.payload?.mesAno ?? ''}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>}
              />
              <Bar dataKey="pix" name="PIX" fill="#00ba7c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dinheiro" name="Dinheiro" fill="#ffad1f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="debito" name="Débito" fill="#1d9bf0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="credito" name="Crédito" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendário de vencimentos dos boletos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Calendário de boletos</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesCalendario((m) => subMonths(m, 1))}
            >
              ← Anterior
            </button>
            <span style={{ minWidth: 140, textAlign: 'center', fontWeight: 600 }}>
              {format(mesCalendario, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setMesCalendario((m) => addMonths(m, 1))}
            >
              Próximo →
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
          Datas em destaque são vencimentos de boletos cadastrados.
        </p>
        <div className="dashboard-calendario">
          <div className="calendario-semana-header">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="calendario-dia-header">{d}</div>
            ))}
          </div>
          <div className="calendario-grid">
            {diasVaziosInicio.map((i) => (
              <div key={`empty-${i}`} className="calendario-dia calendario-dia-vazio" />
            ))}
            {diasCalendario.map((dia) => {
              const key = format(dia, 'yyyy-MM-dd')
              const boletosNoDia = boletosPorVencimento.get(key) ?? []
              const temBoleto = boletosNoDia.length > 0
              const hoje = isSameDay(dia, new Date())
              return (
                <div
                  key={key}
                  className={`calendario-dia ${temBoleto ? 'calendario-dia-boleto' : ''} ${hoje ? 'calendario-dia-hoje' : ''}`}
                  title={temBoleto ? boletosNoDia.map((b) => `${b.descricao}: ${formatMoney(b.valor)}${b.pago ? ' (pago)' : ''}`).join('\n') : ''}
                >
                  <span className="calendario-dia-numero">{format(dia, 'd')}</span>
                  {temBoleto && (
                    <span className="calendario-dia-badge" title={boletosNoDia.map((b) => b.descricao).join(', ')}>
                      {boletosNoDia.length} boleto(s)
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span><span className="calendario-legenda-dot calendario-dia-boleto" /> Dia com vencimento de boleto</span>
          <span><span className="calendario-legenda-dot calendario-dia-hoje" /> Hoje</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Saldo por conta banco</h3>
        {contas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Nenhuma conta cadastrada.{' '}
            <Link to="/contas-banco">Cadastrar conta banco</Link>
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Banco</th>
                  <th>Saldo atual</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong></td>
                    <td>{c.banco}</td>
                    <td className={c.saldoAtual >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>
                      {formatMoney(c.saldoAtual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          O saldo é atualizado com as vendas (PIX, débito, crédito) em Controle de Vendas e com as baixas de boleto pela opção &quot;Conta banco&quot;.
        </p>
      </div>
    </>
  )
}
