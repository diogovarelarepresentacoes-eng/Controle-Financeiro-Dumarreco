const CRM_API_BASE = (import.meta.env.VITE_CRM_API_URL as string | undefined)?.trim() || 'http://localhost:4000'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'

async function request<T>(path: string, method: HttpMethod = 'GET', body?: unknown): Promise<T> {
  try {
    const response = await fetch(`${CRM_API_BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.message ?? payload?.error ?? `Erro HTTP ${response.status}`)
    }
    return response.json() as Promise<T>
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao conectar no CRM.'
    throw new Error(`CRM indisponivel. Verifique API/DB do CRM. (${msg})`)
  }
}

export type CrmConversation = {
  id: string
  contact: {
    id: string
    name: string
    phone: string
    customerScore?: { tier: string; totalScore: number } | null
    worksites?: { id: string; name: string; stage: string | null }[]
  }
  ticket: { status: string; tags: string[] } | null
  messages: { id: string; body: string | null; direction: 'INBOUND' | 'OUTBOUND' }[]
  opportunities: {
    id: string
    name: string
    stage: { name: string }
    quotes: { id: string; total: string; status: string }[]
  }[]
}

export type MonitorCard = {
  id: string
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'AGUARDANDO_CLIENTE' | 'AGUARDANDO_ESTOQUE' | 'FECHADO'
  contactName: string
  phone: string
  updatedAt: string
  slaDueAt: string | null
  slaState: 'SEM_SLA' | 'NO_PRAZO' | 'ATRASADO'
  lastMessage: { body: string | null; direction: 'INBOUND' | 'OUTBOUND'; createdAt: string } | null
  ai: { confidence: number; requiresHuman: boolean; approved: boolean } | null
}

export type FinancePanel = {
  receivables: {
    id: string
    total: string
    status: string
    dueDate: string
    chargeLink: string | null
    installments: { id: string; number: number; amount: string; status: string; dueDate: string }[]
    payments: { id: string; amount: string; paidAt: string; method: string }[]
  }[]
  history: { id: string; action: string; createdAt: string }[]
}

export const crmGateway = {
  listConversations() {
    return request<CrmConversation[]>('/api/inbox/conversations')
  },
  monitorKanban() {
    return request<MonitorCard[]>('/api/inbox/monitor-kanban')
  },
  financeByConversation(conversationId: string) {
    return request<FinancePanel>(`/api/finance/conversation/${conversationId}`)
  },
  suggestAi(payload: unknown) {
    return request('/api/ai/suggestions', 'POST', payload)
  },
  suggestCopilot(payload: unknown) {
    return request('/api/copilot/suggest', 'POST', payload)
  },
  sendMessage(payload: unknown) {
    return request('/api/inbox/messages/send', 'POST', payload)
  },
  createReceivable(payload: unknown) {
    return request('/api/finance/receivables/from-quote', 'POST', payload)
  },
  markPayment(payload: unknown) {
    return request('/api/finance/payments', 'POST', payload)
  },
  kanbanStages() {
    return request<Array<{ id: string; name: string; opportunities: { id: string; name: string; estimatedValue: string }[] }>>('/api/kanban/stages')
  },
  moveOpportunity(payload: unknown) {
    return request('/api/kanban/move', 'POST', payload)
  },
  metricsRanking(monthRef: string) {
    return request<{ ranking: Array<{ sellerId: string; quotesSent: number; conversionRate: number; avgTicket: number; revenueEstimated: number }> }>(
      `/api/metrics/ranking?monthRef=${encodeURIComponent(monthRef)}`
    )
  },
  getWhatsAppSettings() {
    return request('/api/settings/whatsapp')
  },
  saveWhatsAppSettings(payload: unknown) {
    return request('/api/settings/whatsapp', 'PUT', payload)
  },
  testConnection() {
    return request('/api/settings/whatsapp/test-connection', 'POST', {})
  },
  testSend(payload: unknown) {
    return request('/api/settings/whatsapp/test-send', 'POST', payload)
  },
  getAiRules() {
    return request('/api/settings/ai-rules')
  },
  saveAiRules(payload: unknown) {
    return request('/api/settings/ai-rules', 'PUT', payload)
  },
  validateAiRules(payload: unknown) {
    return request('/api/settings/ai-rules/validate', 'POST', payload)
  },
  diagnostics() {
    return request('/api/settings/diagnostics')
  },
  simulateWebhook(payload: unknown) {
    return request('/api/settings/diagnostics/simulate-webhook', 'POST', payload)
  },
}
