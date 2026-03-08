import { useEffect, useState } from 'react'
import { crmGateway } from '../services/crmGateway'

type Stage = { id: string; name: string; opportunities: { id: string; name: string; estimatedValue: string }[] }

export default function CrmKanban() {
  const [stages, setStages] = useState<Stage[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await crmGateway.kanbanStages()
      setStages(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar kanban.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function move(opportunityId: string, toStageId: string) {
    setMovingId(opportunityId)
    try {
      await crmGateway.moveOpportunity({ opportunityId, toStageId })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao mover oportunidade.')
    } finally {
      setMovingId(null)
    }
  }

  return (
    <section>
      <div className="page-actions">
        <h1 className="page-title">CRM WhatsApp - Kanban</h1>
        <button className="btn btn-secondary btn-icon" onClick={() => load()} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          Atualizar
        </button>
      </div>
      {error ? (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      ) : null}
      <div className="form-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {!loading && stages.length === 0 ? (
          <div className="card">
            <div className="empty-state">Sem colunas para exibir.</div>
          </div>
        ) : null}
        {stages.map((stage) => (
          <div key={stage.id} className="card">
            <div className="crm-card-head">
              <h2>{stage.name}</h2>
              <span className="badge badge-info">{stage.opportunities.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stage.opportunities.map((opportunity) => (
                <article key={opportunity.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
                  <p><strong>{opportunity.name}</strong></p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>R$ {opportunity.estimatedValue}</p>
                  <select
                    style={{ marginTop: 8 }}
                    defaultValue={stage.id}
                    disabled={movingId === opportunity.id}
                    onChange={(event) => move(opportunity.id, event.target.value)}
                  >
                    {stages.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  {movingId === opportunity.id ? (
                    <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      <span className="spinner" /> Movendo...
                    </p>
                  ) : null}
                </article>
              ))}
              {!loading && stage.opportunities.length === 0 ? <div className="empty-state">Sem oportunidades.</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
