import { useEffect, useMemo, useState } from 'react'
import { crmGateway } from '../services/crmGateway'
import { StatCard } from '../components/ui/StatCard'

type RankingRow = {
  sellerId: string
  quotesSent: number
  conversionRate: number
  avgTicket: number
  revenueEstimated: number
}

export default function CrmMetas() {
  const [monthRef, setMonthRef] = useState('2026-02')
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    crmGateway
      .metricsRanking(monthRef)
      .then((response) => {
        setRanking(response.ranking)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Falha ao carregar métricas.'))
      .finally(() => setLoading(false))
  }, [monthRef])

  const totalRevenue = useMemo(() => ranking.reduce((acc, row) => acc + row.revenueEstimated, 0), [ranking])
  const avgConv = useMemo(() => (ranking.length ? ranking.reduce((acc, row) => acc + row.conversionRate, 0) / ranking.length : 0), [ranking])
  const quotes = useMemo(() => ranking.reduce((acc, row) => acc + row.quotesSent, 0), [ranking])

  return (
    <section>
      <div className="page-actions">
        <h1 className="page-title">CRM WhatsApp - Metas</h1>
        <span className="muted" style={{ fontSize: 12 }}>
          {loading ? 'Carregando...' : ' '}
        </span>
      </div>
      <div className="card">
        <div className="form-group">
          <label>Mês de referência</label>
          <input value={monthRef} onChange={(event) => setMonthRef(event.target.value)} />
        </div>
        {error ? (
          <div className="alert alert-danger">
            <p>{error}</p>
          </div>
        ) : null}
      </div>
      <div className="grid-cards">
        <StatCard title="Faturamento estimado" value={`R$ ${totalRevenue.toFixed(2)}`} />
        <StatCard title="Taxa média de conversão" value={`${avgConv.toFixed(2)}%`} />
        <StatCard title="Orçamentos enviados" value={String(quotes)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Orçamentos</th>
                <th>Conversão</th>
                <th>Ticket médio</th>
                <th>Faturamento estimado</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row) => (
                <tr key={row.sellerId}>
                  <td>{row.sellerId}</td>
                  <td>{row.quotesSent}</td>
                  <td>{row.conversionRate.toFixed(2)}%</td>
                  <td>R$ {row.avgTicket.toFixed(2)}</td>
                  <td>R$ {row.revenueEstimated.toFixed(2)}</td>
                </tr>
              ))}
              {!loading && ranking.length === 0 ? (
                <tr>
                  <td colSpan={5}>Sem dados para o período.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
