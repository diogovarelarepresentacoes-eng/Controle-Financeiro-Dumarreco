# CRM WhatsApp + Financeiro (MVP)

Monorepo com:

- `apps/api`: API Node.js + Express + Prisma + PostgreSQL
- `apps/web`: frontend legado (agora apenas redireciona para o frontend principal em `/crm/*`)
- `packages/shared`: tipos/constantes compartilhados

## 1) Requisitos

- Node 20+
- Docker + Docker Compose

## 2) Setup rapido

```bash
cd crm
cp .env.example .env
npm install
cd apps/api
npx prisma generate
npx prisma migrate dev --name init_crm_mvp
npx prisma db seed
cd ../..
npm run dev:api
npm run dev:web
```

Observação: a UI operacional do CRM foi unificada no frontend principal do projeto (`http://localhost:5173/crm/*`). O `apps/web` permanece apenas como compatibilidade de redirecionamento.

## 3) Rodar com Docker

```bash
cd crm
docker compose up -d --build
```

Antes de atualizar em ambiente com dados reais:

```bash
cd crm
npm run db:backup
npm run db:migrate:status
```

- API: `http://localhost:4000/health`
- Web: `http://localhost:3001`

## 4) Webhook WhatsApp (teste local)

Endpoint:

- `POST /api/whatsapp/webhook/inbound`

Header obrigatorio:

- `x-webhook-signature: sha256=<hmac_hex>`

Onde `hmac_hex` = HMAC-SHA256 do body JSON com `WHATSAPP_WEBHOOK_SECRET`.

Exemplo payload:

```json
{
  "storeCode": "MATRIZ",
  "from": "55999999999",
  "contactName": "Cliente Teste",
  "type": "text",
  "text": "Olá, quero orçamento de cimento"
}
```

Ao receber inbound, a API:

1. Normaliza tipo da mensagem
2. Cria/atualiza `contact`
3. Cria `conversation` + `ticket` (se nao existir aberto)
4. Cria `message` inbound
5. Registra auditoria em `audit_logs`

## 5) Fluxo financeiro integrado

Ao aprovar orçamento (`/api/quotes/:id/approve-whatsapp`) ou mover oportunidade para `FECHADO - GANHO`, a API cria automaticamente:

- `receivables`
- `receivable_installments`
- evento de auditoria `TITULO_GERADO`

Endpoints financeiros do MVP:

- `POST /api/finance/receivables/from-quote`
- `GET /api/finance/conversation/:conversationId`
- `POST /api/finance/payments` (conciliação manual)
- `POST /api/finance/jobs/reminders/run` (disparo manual de lembretes)

Job automático:

- roda por `setInterval` usando `REMINDER_JOB_INTERVAL_MINUTES`
- envia lembretes em D-3, D0 e D+3
- atualiza status para `COBRANDO` e registra auditoria

## 6) Sales Copilot + Risco + Score (novo)

### Sales Copilot

Endpoint:

- `POST /api/copilot/suggest`

Retorna:

- `suggestion`
- `confidence`
- `requires_human`
- `reasoning`
- `closure_probability`
- `estimated_ticket`
- `repurchase_chance`

### Customer Score (job diário)

Tabela: `CustomerScore`

Classificação automática:

- `PREMIUM`
- `RECORRENTE`
- `OBRA_GRANDE`
- `SENSIVEL_PRECO`
- `NOVO_CLIENTE`

Job:

- `POST /api/scoring/jobs/run` (manual)
- intervalo automático por `CUSTOMER_SCORE_JOB_INTERVAL_HOURS`

### Risk Engine (anti-risco comercial)

Regras:

- desconto acima do limite da role
- pedido alto para cliente novo
- parcelamento fora da regra
- promessa de prazo sem estoque
- menção a PROCON/processo

Saída:

- `RiskLevel`: `BAIXO`, `MEDIO`, `ALTO`
- bloqueio para `ALTO` + aprovação de supervisor

### Recuperação de orçamento

Job automático por `QUOTE_RECOVERY_JOB_INTERVAL_MINUTES`:

- após 24h sem resposta: cria follow-up sugerido
- após 72h: cria tarefa para atendente

## 7) Configurações > WhatsApp & IA

Tela: `http://localhost:3001/configuracoes/whatsapp-ia`

Abas:

- **WhatsApp**: configura conta, provedor, credenciais, testa conexão e envia 1a mensagem de teste.
- **IA (Regras de negocio)**: prompt empresarial, validação e restauração do padrão.
- **Testes & Diagnóstico**: webhook URL, último webhook recebido, simulação inbound e logs de envio.

Endpoints:

- `GET /api/settings/whatsapp`
- `PUT /api/settings/whatsapp`
- `POST /api/settings/whatsapp/test-connection`
- `POST /api/settings/whatsapp/test-send`
- `GET /api/settings/ai-rules`
- `PUT /api/settings/ai-rules`
- `POST /api/settings/ai-rules/validate`
- `GET /api/settings/diagnostics`
- `POST /api/settings/diagnostics/simulate-webhook`
- `POST /api/webhooks/whatsapp/:provider`

Configuração por provedor:

- **Meta Cloud API**: `phone_number_id`, `whatsapp_business_account_id`, `access_token`, `verify_token`, `version`.
- **Twilio**: `account_sid`, `auth_token`, `from_number`.
- **Zenvia**: `api_token`, `channel_id`.
- **360dialog**: `api_key`, `phone_number`.
- **Custom**: `inbound_webhook_secret`, `outbound_endpoint_url`.

Variáveis novas:

- `SECRET_KEY` (criptografia de credenciais)
- `APP_BASE_URL` (geração de webhook_url)

## 8) Anti-alucinacao (obrigatorio no MVP)

- Modo `ASSISTIDO`: sempre exige aprovacao humana para envio.
- Bloqueio automatico para temas sensiveis: preco, desconto, parcelamento, juros/multa, frete, prazo/entrega, estoque, fiscal/garantia.
- `confidence < 0.80` => `requires_human = true`
- Sem fonte interna (`sources`) => IA responde: `Preciso confirmar essa informacao com um atendente.`
- Modo `AUTO`: apenas FAQ segura (`horario/endereco/contato`) com `confidence >= 0.9` e fonte.

## 9) Testes minimos

```bash
cd crm
npm run test:api
```

Cobertura MVP exigida:

- webhook inbound cria conversation/message
- aprovação de quote gera receivable
- policy engine bloqueia condições comerciais
- job de lembrete seleciona títulos corretos
- salvar configs WhatsApp
- mascaramento de tokens
- test-connection com campos faltantes
- test-send registrando log
- risk engine bloqueando desconto indevido
- IA sem aprovação humana não pode ser enviada

## 10) Modulo de Produtos + Estoque por Planilha

Menu web:

- `Cadastros > Produtos`
- `Cadastros > Importar Produtos (Planilha)`
- `Estoque > Atualizar Estoque (Planilha)`
- `Relatorios > Historico de Atualizacoes`

Endpoints novos:

- `GET /api/products?search=&page=&limit=`
- `POST /api/products`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/activate`
- `GET /api/products/:id`
- `POST /api/products/import` (multipart)
- `POST /api/stock/import` (multipart)
- `GET /api/import-jobs/:id`
- `GET /api/import-jobs/:id/errors/export`

Formato aceito de planilha (CSV ou XLSX):

- `codigo_do_produto`
- `descricao_do_produto`
- `preco_a_prazo`
- `saldo_estoque`

Exemplo CSV:

```csv
codigo_do_produto,descricao_do_produto,preco_a_prazo,saldo_estoque
CIM-001,Cimento 50kg,39.90,85
ARG-020,Argamassa AC2 20kg,24.50,42
```

Regras de importacao:

- codigo vazio => erro de linha
- `preco_a_prazo` e `saldo_estoque` devem ser `>= 0`
- duplicatas no arquivo: mantem ultima ocorrencia (registra warning)
- `INSERT_ONLY`: so novos, existentes ficam ignorados
- `UPSERT_ALL`: cria novos e atualiza existentes (descricao/preco/estoque)
- no estoque:
  - `SET`: substitui saldo
  - `ADD`: soma ao saldo atual
  - `create_if_missing=true`: cria produto automaticamente

Integração IA anti-alucinacao:

- Ao detectar pergunta de estoque/disponibilidade, o backend consulta produto/estoque no banco antes de salvar sugestao IA.
- Se nao encontrar item, resposta segura padrao:
  - `Nao encontrei esse item no sistema. Pode confirmar o codigo ou a descricao?`
- Policy engine exige consulta de estoque para temas de disponibilidade.

## 11) Seguranca e boas praticas

- Nunca use `prisma migrate reset` em ambiente com dados reais.
- Use `prisma migrate deploy` em producao.
- Seed idempotente para nao apagar dados.
- Webhook protegido por assinatura.
- Logs de auditoria para acoes sensiveis.
- Credenciais de provedores armazenadas criptografadas (`configJson`).

### Atualizacao segura sem perda de dados

- O container da API agora espera o banco ficar disponivel antes de migrar.
- A seed no startup fica **desativada por padrao** (`RUN_SEED_ON_STARTUP=false`).
- Para startup inicial com base vazia, ative seed explicitamente.
- Para atualizacoes, rode backup antes de subir nova versao.
- Se migracao falhar, a API nao sobe (evita app rodando com schema inconsistente).

## 12) Variáveis de ambiente

- `REMINDER_JOB_INTERVAL_MINUTES`
- `CUSTOMER_SCORE_JOB_INTERVAL_HOURS`
- `QUOTE_RECOVERY_JOB_INTERVAL_MINUTES`
- `SECRET_KEY`
- `APP_BASE_URL`
- `RUN_SEED_ON_STARTUP`
- `BACKUP_BEFORE_MIGRATE`
