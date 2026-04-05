import { useEffect, useMemo, useState } from 'react'
import { crmGateway } from '../services/crmGateway'

type ProviderType = 'META_CLOUD_API' | 'TWILIO_WHATSAPP' | 'ZENVIA_WHATSAPP' | 'DIALOG_360' | 'CUSTOM_WEBHOOK'
type TabKey = 'WHATSAPP' | 'IA' | 'DIAG'

const PROVIDERS: Array<{ value: ProviderType; label: string }> = [
  { value: 'META_CLOUD_API', label: 'Meta WhatsApp Cloud API' },
  { value: 'TWILIO_WHATSAPP', label: 'Twilio WhatsApp' },
  { value: 'ZENVIA_WHATSAPP', label: 'Zenvia WhatsApp' },
  { value: 'DIALOG_360', label: '360dialog' },
  { value: 'CUSTOM_WEBHOOK', label: 'Outro / Custom Webhook' },
]

export default function CrmConfiguracoes() {
  const [tab, setTab] = useState<TabKey>('WHATSAPP')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openTestModal, setOpenTestModal] = useState(false)
  const [connectionResult, setConnectionResult] = useState('')
  const [checklist, setChecklist] = useState<Array<{ item: string; ok: boolean }>>([])
  const [whatsappForm, setWhatsappForm] = useState({
    accountName: '',
    phoneNumberE164: '',
    countryCode: 'BR',
    providerType: 'META_CLOUD_API' as ProviderType,
    isActive: false,
    webhookVerifyToken: '',
    config: {} as Record<string, unknown>,
  })
  const [aiForm, setAiForm] = useState({ businessRulesPrompt: '', modeDefault: 'ASSISTIDO', confidenceThreshold: 0.8 })
  const [diagnostics, setDiagnostics] = useState<{
    webhookUrl: string | null
    lastWebhook: { receivedAt: string; eventType: string; id: string } | null
    logs: Array<{ id: string; toNumber: string; providerType: string; status: string; createdAt: string }>
  }>({ webhookUrl: null, lastWebhook: null, logs: [] })
  const [testSendForm, setTestSendForm] = useState({ to: '', text: 'Olá! Este é um teste do nosso atendimento.' })

  function setConfigField(key: string, value: unknown) {
    setWhatsappForm((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }))
  }

  const CRM_API_BASE = (import.meta.env.VITE_CRM_API_URL as string | undefined)?.trim() || 'http://localhost:4000'
  const webhookUrl = useMemo(() => `${CRM_API_BASE}/api/webhooks/whatsapp/${whatsappForm.providerType}`, [CRM_API_BASE, whatsappForm.providerType])

  async function loadInitial() {
    setLoading(true)
    try {
      const [whatsappData, aiData, diagData] = await Promise.all([crmGateway.getWhatsAppSettings(), crmGateway.getAiRules(), crmGateway.diagnostics()])
      const ws = whatsappData as {
        settings: null | {
          accountName: string
          phoneNumberE164: string
          countryCode: string | null
          providerType: ProviderType
          isActive: boolean
          webhookVerifyToken: string | null
          config: Record<string, unknown>
        }
      }
      if (ws.settings) {
        setWhatsappForm({
          accountName: ws.settings.accountName,
          phoneNumberE164: ws.settings.phoneNumberE164,
          countryCode: ws.settings.countryCode ?? 'BR',
          providerType: ws.settings.providerType,
          isActive: ws.settings.isActive,
          webhookVerifyToken: ws.settings.webhookVerifyToken ?? '',
          config: ws.settings.config ?? {},
        })
      }
      const ai = aiData as { businessRulesPrompt: string; modeDefault: string; confidenceThreshold: string }
      setAiForm({
        businessRulesPrompt: ai.businessRulesPrompt,
        modeDefault: ai.modeDefault,
        confidenceThreshold: Number(ai.confidenceThreshold),
      })
      setDiagnostics(diagData as { webhookUrl: string | null; lastWebhook: { receivedAt: string; eventType: string; id: string } | null; logs: Array<{ id: string; toNumber: string; providerType: string; status: string; createdAt: string }> })
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao carregar configuracoes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitial().catch(() => undefined)
  }, [])

  async function saveWhatsApp() {
    setSaving(true)
    setFeedback('')
    try {
      const response = (await crmGateway.saveWhatsAppSettings({
        accountName: whatsappForm.accountName,
        phoneNumberE164: whatsappForm.phoneNumberE164,
        countryCode: whatsappForm.countryCode,
        providerType: whatsappForm.providerType,
        isActive: whatsappForm.isActive,
        webhookVerifyToken: whatsappForm.webhookVerifyToken || undefined,
        config: whatsappForm.config,
      })) as { validation: { ok: boolean }; checklist: Array<{ item: string; ok: boolean }> }
      setChecklist(response.checklist)
      setFeedback(response.validation.ok ? 'Configurações salvas com sucesso.' : 'Salvo com checklist pendente.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  async function validateAiPrompt() {
    const result = (await crmGateway.validateAiRules({ businessRulesPrompt: aiForm.businessRulesPrompt })) as { valid: boolean; warnings: string[] }
    setFeedback(result.valid ? 'Regras validas.' : `Warnings: ${result.warnings.join(' | ')}`)
  }

  return (
    <section>
      <div className="page-actions">
        <h1 className="page-title">CRM WhatsApp - Configurações</h1>
        <button className="btn btn-secondary btn-icon" onClick={() => loadInitial()} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          Atualizar
        </button>
      </div>
      {feedback ? (
        <div className={`alert ${feedback.includes('sucesso') ? 'alert-success' : 'alert-warning'}`} style={{ marginBottom: 16 }}>
          <p>{feedback}</p>
        </div>
      ) : null}
      <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'WHATSAPP' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('WHATSAPP')}>WhatsApp</button>
        <button className={`btn ${tab === 'IA' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('IA')}>IA</button>
        <button className={`btn ${tab === 'DIAG' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('DIAG')}>Diagnóstico</button>
        <span className="muted" style={{ alignSelf: 'center', marginLeft: 'auto' }}>{loading ? 'Carregando...' : ' '}</span>
      </div>

      {tab === 'WHATSAPP' ? (
        <div className="card">
          <div className="form-row">
            <div className="form-group"><label>Nome da conta</label><input value={whatsappForm.accountName} onChange={(e) => setWhatsappForm((p) => ({ ...p, accountName: e.target.value }))} /></div>
            <div className="form-group"><label>Número WhatsApp</label><input value={whatsappForm.phoneNumberE164} onChange={(e) => setWhatsappForm((p) => ({ ...p, phoneNumberE164: e.target.value }))} /></div>
            <div className="form-group"><label>País / DDI</label><input value={whatsappForm.countryCode} onChange={(e) => setWhatsappForm((p) => ({ ...p, countryCode: e.target.value }))} /></div>
            <div className="form-group">
              <label>Provedor</label>
              <select value={whatsappForm.providerType} onChange={(e) => setWhatsappForm((p) => ({ ...p, providerType: e.target.value as ProviderType, config: {} }))}>
                {PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Webhook URL</label><input readOnly value={webhookUrl} /></div>
            <div className="form-group"><label>Token de verificação</label><input value={whatsappForm.webhookVerifyToken} onChange={(e) => setWhatsappForm((p) => ({ ...p, webhookVerifyToken: e.target.value }))} /></div>
          </div>
          <div className="form-group">
            <label><input type="checkbox" checked={whatsappForm.isActive} onChange={(e) => setWhatsappForm((p) => ({ ...p, isActive: e.target.checked }))} /> Ativar integração</label>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Campo config 1</label><input value={String(whatsappForm.config.field_1 ?? '')} onChange={(e) => setConfigField('field_1', e.target.value)} /></div>
            <div className="form-group"><label>Campo config 2</label><input value={String(whatsappForm.config.field_2 ?? '')} onChange={(e) => setConfigField('field_2', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-icon" onClick={saveWhatsApp} disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              Salvar configurações
            </button>
            <button className="btn btn-secondary" onClick={async () => {
              setConnectionResult('')
              try {
                const result = (await crmGateway.testConnection()) as { ok: boolean; message: string }
                setConnectionResult(result.ok ? `Conexão OK: ${result.message}` : `Falha: ${result.message}`)
              } catch (e) {
                setConnectionResult(e instanceof Error ? e.message : 'Falha ao testar conexão.')
              }
            }}>Testar conexão</button>
            <button className="btn btn-secondary" onClick={() => setOpenTestModal(true)}>Testar 1ª mensagem</button>
          </div>
          {connectionResult ? <p style={{ marginTop: 8 }}>{connectionResult}</p> : null}
          {checklist.length ? (
            <ul style={{ marginTop: 10 }}>
              {checklist.map((item) => <li key={item.item}>{item.ok ? '[OK]' : '[PENDENTE]'} {item.item}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tab === 'IA' ? (
        <div className="card">
          <div className="form-group">
            <label>Prompt de regras de negócio</label>
            <textarea rows={12} value={aiForm.businessRulesPrompt} onChange={(e) => setAiForm((p) => ({ ...p, businessRulesPrompt: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Modo padrão</label>
              <select value={aiForm.modeDefault} onChange={(e) => setAiForm((p) => ({ ...p, modeDefault: e.target.value }))}>
                <option value="MANUAL">MANUAL</option>
                <option value="ASSISTIDO">ASSISTIDO</option>
                <option value="AUTO">AUTO</option>
              </select>
            </div>
            <div className="form-group">
              <label>Threshold de confiança</label>
              <input type="number" min={0} max={1} step={0.01} value={aiForm.confidenceThreshold} onChange={(e) => setAiForm((p) => ({ ...p, confidenceThreshold: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={async () => {
              setSaving(true)
              setFeedback('')
              try {
                await crmGateway.saveAiRules(aiForm)
                setFeedback('Regras de IA salvas.')
              } catch (e) {
                setFeedback(e instanceof Error ? e.message : 'Falha ao salvar regras de IA.')
              } finally {
                setSaving(false)
              }
            }}>Salvar regras</button>
            <button className="btn btn-secondary" onClick={validateAiPrompt}>Validar regras</button>
          </div>
        </div>
      ) : null}

      {tab === 'DIAG' ? (
        <div className="card">
          <p><strong>Webhook URL:</strong> {diagnostics.webhookUrl ?? webhookUrl}</p>
          <p><strong>Último webhook:</strong> {diagnostics.lastWebhook ? `${diagnostics.lastWebhook.eventType} em ${new Date(diagnostics.lastWebhook.receivedAt).toLocaleString('pt-BR')}` : 'Nenhum'}</p>
          <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={async () => {
            setSaving(true)
            setFeedback('')
            try {
              await crmGateway.simulateWebhook({ providerType: whatsappForm.providerType })
              const diag = await crmGateway.diagnostics()
              setDiagnostics(diag as { webhookUrl: string | null; lastWebhook: { receivedAt: string; eventType: string; id: string } | null; logs: Array<{ id: string; toNumber: string; providerType: string; status: string; createdAt: string }> })
              setFeedback('Webhook inbound simulado.')
            } catch (e) {
              setFeedback(e instanceof Error ? e.message : 'Falha ao simular webhook.')
            } finally {
              setSaving(false)
            }
          }}>Simular webhook inbound</button>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Destino</th><th>Provedor</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>
                {diagnostics.logs.map((log) => (
                  <tr key={log.id}><td>{log.toNumber}</td><td>{log.providerType}</td><td>{log.status}</td><td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td></tr>
                ))}
                {diagnostics.logs.length === 0 ? (
                  <tr><td colSpan={4}>Sem logs.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {openTestModal ? (
        <div className="modal-overlay no-print">
          <div className="modal">
            <h2>Testar envio da 1ª mensagem</h2>
            <div className="form-group"><label>Destino</label><input value={testSendForm.to} onChange={(e) => setTestSendForm((p) => ({ ...p, to: e.target.value }))} /></div>
            <div className="form-group"><label>Mensagem</label><textarea rows={4} value={testSendForm.text} onChange={(e) => setTestSendForm((p) => ({ ...p, text: e.target.value }))} /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setOpenTestModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={async () => {
                const result = (await crmGateway.testSend(testSendForm)) as { status: string; errorMessage?: string }
                setFeedback(result.status === 'SENT' || result.status === 'QUEUED' ? 'Mensagem de teste enviada.' : `Falha ao enviar: ${result.errorMessage ?? 'erro desconhecido'}`)
                setOpenTestModal(false)
              }}>Enviar teste</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
