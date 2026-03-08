## Relatório de pendências e bugs

Data: 2026-02-17

### Resumo executivo

- **Automated checks** (build/typecheck/testes) passaram no frontend, backend e CRM API.
- Foram encontrados pontos de **robustez operacional** (API derrubando processo em erro async), **dependência de Docker** para smoke test completo, e **módulos ainda em `localStorage`** que não seguem a arquitetura “API + Postgres”.

---

### Bugs (reproduzidos)

#### 1) Backend caía (crash) quando um handler async lançava exceção

- **Prioridade**: P0 (derruba API)
- **Impacto**: um erro de banco em uma rota derrubava o processo Node (Express 4 não captura promise rejections em handlers `async` sem wrapper).
- **Como reproduzir (antes da correção)**:
  - Iniciar `backend` e fazer `GET /api/products` com banco indisponível/credencial inválida.
  - O processo encerrava.
- **Correção aplicada**:
  - Wrapper `asyncHandler` + aplicação nas rotas `products` e `purchases` para encaminhar erros ao middleware e responder 500 sem crash.

#### 2) Financeiro: endpoints críticos retornam 500 quando `DATABASE_URL` aponta para Postgres local com credencial inválida

- **Prioridade**: P0/P1 (bloqueia uso sem Docker ou sem Postgres corretamente configurado)
- **Como reproduzir**:
  - Subir API local com `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/controle_financeiro?schema=public"` e ter um Postgres em `localhost:5432` que não aceite essas credenciais.
  - `GET /api/products` retorna 500 (com mensagem de autenticação falha).
- **Nota**:
  - No Docker Compose do financeiro, a URL usa `db:5432` e deve funcionar com o password padrão; o problema aparece em ambiente local com Postgres já instalado/configurado diferente.

#### 3) CRM API: jobs de reminder/quote recovery falham quando não existe Postgres na porta configurada

- **Prioridade**: P1 (ruído em dev; pode virar incidente se for prod)
- **Como reproduzir**:
  - Rodar `crm` API com `DATABASE_URL` apontando para `localhost:5434` sem Postgres rodando nessa porta.
  - Logs mostram `Can't reach database server at localhost:5434`.
- **Nota**:
  - O `crm/docker-compose.yml` expõe `5434:5432` para o Postgres do CRM (ok para Docker).
  - O `crm/.env.example` aponta para `localhost:5432` (potencial inconsistência de documentação/config).

---

### Pendências (features/migrações/melhorias)

#### A) Docker: stack completa do financeiro (frontend + api + db)

- **Prioridade**: P1
- **Situação atual**: `docker-compose.yml` do financeiro sobe apenas `db` + `api`.
- **Necessidade**: adicionar serviço `web` (build do Vite + servir estático) **ou** documentar fluxo híbrido oficial (frontend local + API Docker) e como testar rotas SPA em produção (fallback).

#### B) Arquitetura: módulos ainda em `localStorage` (modo legado)

- **Prioridade**: P1/P2 (depende do roadmap)
- **Evidência**:
  - `src/services/storage.ts` mantém: contas, boletos, movimentações, vendas, faturamento mensal, etc.
  - `src/services/migrations.ts` mantém migrações de schema do `localStorage`.
  - `src/services/purchasesGateway.ts` opera em modo híbrido: **API** quando `VITE_API_BASE_URL` está definido; caso contrário usa controller legado (local).
- **Decisão pendente**:
  - Definir se o objetivo é **migração definitiva** para backend (API + Postgres) para todos os módulos (despesas/boletos/vendas/conta banco/faturamento) ou manter parte local.

#### C) Testes/contratos para produtos/estoque/importações

- **Prioridade**: P2
- **Gap**: hoje há testes críticos de compras e CRM API, mas faltam testes automatizados focados em:
  - `GET /api/products`, `search`, `stock/batch`
  - fluxos de importação (preview/import + validações).

---

### Plano de validação (aceite)

- **Automated**: `npm run build` + `npm test` na raiz; `backend` build+test; `crm` build+test.
- **Smoke API**: `scripts/smoke-finance.ps1` + evidências em `EVIDENCIAS_SMOKE_FINANCEIRO.md`.
- **Manual**: checklist detalhado em `EVIDENCIAS_CHECKLIST_MANUAL.md`.

