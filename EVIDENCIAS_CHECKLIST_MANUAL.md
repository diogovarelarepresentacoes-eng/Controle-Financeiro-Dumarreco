## Evidências - Checklist manual (parcial / automatizado)

Data: 2026-02-17

> Limitação: neste ambiente não foi possível fazer navegação interativa (cliques/formulários) com captura de screenshots. Para mitigar, foram validadas rotas, builds e respostas HTTP básicas; e o checklist completo (passo a passo) está listado ao final para execução humana.

### Financeiro (frontend principal)

- **Build + testes**: OK (ver execução em `npm run build` e `npm test`).
- **Servidor dev**: `http://localhost:5173` respondendo 200.
- **Rotas principais respondendo 200 (dev server)**:
  - `/` (Dashboard)
  - `/produtos`
  - `/crm/inbox`

### Financeiro (API)

- **Health**: `GET http://localhost:3333/health` → 200.
- **Endpoints críticos**: ver `EVIDENCIAS_SMOKE_FINANCEIRO.md` (inclui erro 500 quando o Postgres local não aceita as credenciais do `DATABASE_URL` configurado).

### CRM (web em `crm/apps/web`)

- **Servidor dev**: `http://localhost:3001` responde `307` e redireciona para o app principal.
- **Rota de configurações**: `GET /configuracoes/whatsapp-ia` redireciona para `http://localhost:5173/crm/configuracoes`.

Observação operacional:

- Se `http://localhost:3001/` retornar 500 com erros do tipo `Cannot find module './xxx.js'`, é cache `.next` corrompido/estado inconsistente do Next dev server. A correção é parar o processo, apagar `crm/apps/web/.next` e iniciar `npm run dev:web` novamente.

### Checklist humano (para validação completa de UX/fluxos)

Financeiro:
- Produtos: listar, buscar, criar/editar, ativar/desativar; importação (preview + importar) e validações.
- Estoque: importar/preview; conferir saldo atualizado.
- Compras: criar manual, importar XML NF-e, gerar contas a pagar; exclusão com bloqueio quando pago.
- Boletos/Conta Banco/Vendas: baixa/estorno, movimentações, consistência de saldo.
- Relatórios/Faturamento: geração, impressão, consistência de totais.

CRM (no frontend principal):
- Inbox/Atendimento/Kanban/Metas/Config: verificar estados de loading/erro/vazio e integração com estoque.

