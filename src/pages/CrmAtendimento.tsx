import { useEffect, useMemo, useState } from 'react'
import { crmGateway, type MonitorCard } from '../services/crmGateway'

const COLUMNS: Array<MonitorCard['status']> = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_ESTOQUE', 'FECHADO']
const LABEL: Record<MonitorCard['status'], string> = {
  ABERTO: 'Aberto',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  AGUARDANDO_ESTOQUE: 'Aguardando estoque',
  FECHADO: 'Fechado',
}

export default function CrmAtendimento() {
  const [cards, setCards] = useState<MonitorCard[]>([])
  const [lastRefreshAt, setLastRefreshAt] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function load(showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      const data = await crmGateway.monitorKanban()
      setCards(data)
      setLastRefreshAt(new Date().toLocaleTimeString('pt-BR'))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar monitoramento.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    load(true).catch(() => undefined)
    const timer = window.setInterval(() => load(false).catch(() => undefined), 5000)
    return () => window.clearInterval(timer)
  }, [])

  const grouped = useMemo(() => {
    const map: Record<MonitorCard['status'], MonitorCard[]> = {
      ABERTO: [],
      EM_ATENDIMENTO: [],
      AGUARDANDO_CLIENTE: [],
      AGUARDANDO_ESTOQUE: [],
      FECHADO: [],
    }
    for (const card of cards) map[card.status].push(card)
    return map
  }, [cards])

  return (
    <section>
      <div className="page-actions">
        <h1 className="page-title">CRM WhatsApp - Atendimento</h1>
        <button className="btn btn-secondary btn-icon" onClick={() => load(true)} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          Atualizar agora
        </button>
      </div>
      <div className="card">
        <p className="muted">Monitoramento em tempo real. Atualizado: {lastRefreshAt || '-'}</p>
        {error ? (
          <div className="alert alert-danger" style={{ marginTop: 10 }}>
            <p>{error}</p>
          </div>
        ) : null}
      </div>
      <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {COLUMNS.map((column) => (
          <div key={column} className="card">
            <div className="crm-card-head">
              <strong>{LABEL[column]}</strong>
              <span className="badge badge-info">{grouped[column].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[column].map((card) => (
                <article key={card.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  <strong>{card.contactName}</strong>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.phone}</p>
                  <p style={{ marginTop: 4 }}>{card.lastMessage?.body ?? '[sem mensagem]'}</p>
                  <p style={{ marginTop: 6, fontSize: 12 }}>
                    SLA: <strong>{card.slaState}</strong> | IA: {card.ai ? `${(card.ai.confidence * 100).toFixed(0)}%` : '-'}
                  </p>
                </article>
              ))}
              {!loading && grouped[column].length === 0 ? <div className="empty-state">Nenhum ticket.</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
