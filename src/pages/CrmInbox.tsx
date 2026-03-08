import { useEffect, useMemo, useState } from 'react'
import { crmGateway, type CrmConversation, type FinancePanel } from '../services/crmGateway'
import { productsGateway, type Product } from '../services/productsGateway'

type Suggestion = { id: string; responseDraft: string; requiresHuman: boolean; policy?: { reason: string } }
type CopilotSuggestion = {
  suggestion: string
  confidence: number
  requires_human: boolean
  reasoning: string
  closure_probability: number
  estimated_ticket: number
  repurchase_chance: number
}

export default function CrmInbox() {
  const [conversations, setConversations] = useState<CrmConversation[]>([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [copilot, setCopilot] = useState<CopilotSuggestion | null>(null)
  const [financePanel, setFinancePanel] = useState<FinancePanel | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingFinance, setLoadingFinance] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [feedback, setFeedback] = useState('')

  const active = useMemo(() => conversations.find((conversation) => conversation.id === activeId) ?? null, [conversations, activeId])

  async function loadConversations() {
    setLoadingConversations(true)
    try {
      const data = await crmGateway.listConversations()
      setConversations(data)
      if (!activeId && data[0]) setActiveId(data[0].id)
      setFeedback('')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao carregar conversas.')
    } finally {
      setLoadingConversations(false)
    }
  }

  useEffect(() => {
    loadConversations().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!activeId) return
    setLoadingFinance(true)
    crmGateway
      .financeByConversation(activeId)
      .then(setFinancePanel)
      .catch(() => setFinancePanel(null))
      .finally(() => setLoadingFinance(false))
  }, [activeId])

  async function suggestWithIa() {
    if (!active) return
    const lastInbound = active.messages.find((message) => message.direction === 'INBOUND')
    const response = (await crmGateway.suggestAi({
      conversationId: active.id,
      userMessage: lastInbound?.body ?? 'Cliente sem texto.',
      mode: 'ASSISTIDO',
      confidence: 0.85,
      draft: 'Obrigado pelo contato. Vou confirmar os itens com a loja e ja retorno.',
      sources: ['politica-atendimento.md'],
      inputContextIds: active.messages.map((message) => message.id),
    })) as Suggestion
    setSuggestion(response)
    setDraft(response.responseDraft)
  }

  async function runSalesCopilot() {
    if (!active) return
    const data = (await crmGateway.suggestCopilot({ conversationId: active.id })) as CopilotSuggestion
    setCopilot(data)
  }

  async function approveAndSend() {
    if (!active || !draft.trim()) return
    setLoadingSend(true)
    setFeedback('')
    try {
      await crmGateway.sendMessage({ conversationId: active.id, body: draft, aiSuggestionId: suggestion?.id })
      setDraft('')
      setSuggestion(null)
      await loadConversations()
      setLoadingFinance(true)
      const panel = await crmGateway.financeByConversation(active.id)
      setFinancePanel(panel)
      setFeedback('Mensagem enviada.')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao enviar mensagem.')
    } finally {
      setLoadingFinance(false)
      setLoadingSend(false)
    }
  }

  async function searchProducts() {
    if (!productQuery.trim()) {
      setProductResults([])
      return
    }
    setLoadingProducts(true)
    try {
      const result = await productsGateway.search(productQuery, 8)
      setProductResults(result.items)
      setFeedback('')
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Falha ao buscar produtos.')
      setProductResults([])
    } finally {
      setLoadingProducts(false)
    }
  }

  return (
    <section>
      <div className="page-actions">
        <h1 className="page-title">CRM WhatsApp - Inbox</h1>
        <button className="btn btn-secondary btn-icon" onClick={() => loadConversations()} disabled={loadingConversations}>
          {loadingConversations ? <span className="spinner" /> : null}
          Atualizar
        </button>
      </div>
      {feedback ? (
        <div className={`alert ${feedback.includes('sucesso') || feedback === 'Mensagem enviada.' ? 'alert-success' : 'alert-warning'}`}>
          <p>{feedback}</p>
        </div>
      ) : null}
      <div className="crm-inbox-grid">
        <div className="card">
          <div className="crm-card-head">
            <strong>Conversas</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              {loadingConversations ? 'Carregando...' : `${conversations.length} itens`}
            </span>
          </div>
          <div className="crm-scroll-list">
            {!loadingConversations && conversations.length === 0 ? <div className="empty-state">Nenhuma conversa.</div> : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={`btn btn-secondary crm-list-item ${activeId === conversation.id ? 'active' : ''}`}
                onClick={() => setActiveId(conversation.id)}
              >
                <div><strong>{conversation.contact.name}</strong></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{conversation.contact.phone}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="crm-card-head">
            <h2>Chat</h2>
            <span className="muted" style={{ fontSize: 12 }}>
              {active ? `${active.contact.name}` : 'Selecione uma conversa'}
            </span>
          </div>
          <div className="crm-chat-messages">
            {active?.messages?.length ? (
              active.messages
                .slice()
                .reverse()
                .map((message) => (
                  <div key={message.id} className={message.direction === 'INBOUND' ? 'crm-msg-inbound' : 'crm-msg-outbound'}>
                    {message.body ?? '[midia]'}
                  </div>
                ))
            ) : (
              <div className="empty-state">Selecione uma conversa.</div>
            )}
          </div>
          <div className="crm-chat-actions">
            <button className="btn btn-secondary" onClick={suggestWithIa}>Sugerir resposta IA</button>
            <button className="btn btn-secondary" onClick={runSalesCopilot}>Gerar Sales Copilot</button>
            <button className="btn btn-primary btn-icon" onClick={approveAndSend} disabled={!active || !draft.trim() || loadingSend}>
              {loadingSend ? <span className="spinner" /> : null}
              Aprovar e enviar
            </button>
          </div>
          {suggestion ? <p style={{ marginBottom: 8 }}>Revisao humana: {suggestion.requiresHuman ? 'obrigatoria' : 'nao'}.</p> : null}
          <textarea rows={5} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Rascunho para envio..." />
        </div>

        <div className="card">
          <div className="crm-card-head">
            <h2>Painel lateral</h2>
            <span className="muted" style={{ fontSize: 12 }}>
              {loadingFinance ? 'Atualizando...' : ' '}
            </span>
          </div>
          <div className="crm-panel">
            <div><strong>Cliente:</strong> {active?.contact.name ?? '-'}</div>
            <div><strong>Ticket:</strong> {active?.ticket?.status ?? '-'}</div>
            <div>
              <strong>Financeiro:</strong> {financePanel?.receivables?.[0]?.status ?? '-'} / R$ {Number(financePanel?.receivables?.[0]?.total ?? 0).toFixed(2)}
            </div>
          </div>
          {copilot ? (
            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              <strong>Copilot</strong>
              <p style={{ marginTop: 6 }}>{copilot.suggestion}</p>
              <p style={{ fontSize: 12 }}>Fechamento: {copilot.closure_probability.toFixed(1)}%</p>
            </div>
          ) : null}

          <div>
            <strong>Produtos / Estoque</strong>
            <div className="crm-inline" style={{ marginTop: 8 }}>
              <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar codigo ou descricao" />
              <button className="btn btn-secondary btn-icon" onClick={searchProducts} disabled={loadingProducts || !productQuery.trim()}>
                {loadingProducts ? <span className="spinner" /> : null}
                Buscar
              </button>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!loadingProducts && productQuery.trim() && productResults.length === 0 ? (
                <div className="empty-state">Nenhum produto encontrado.</div>
              ) : null}
              {productResults.map((item) => (
                <div key={item.id} className="crm-product-result">
                  <strong>{item.code} - {item.description}</strong>
                  <p>Saldo: {Number(item.stockBalance).toFixed(3)} {item.unit ?? 'UN'}</p>
                  <p>Preco: R$ {Number(item.priceInstallment).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
