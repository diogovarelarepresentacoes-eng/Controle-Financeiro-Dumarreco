# Backend Fase 2

API REST para o modulo de compras mensal com PostgreSQL + Prisma.

## Stack

- Node.js
- Express
- Prisma ORM
- PostgreSQL

## Como rodar

1. Copie `backend/.env.example` para `backend/.env` e ajuste o `DATABASE_URL`.
2. Instale dependencias:
   - `cd backend`
   - `npm install`
3. Gere client:
   - `npm run prisma:generate`
4. Aplique migracoes:
   - `npm run prisma:migrate` (dev)
   - ou `npm run prisma:deploy` (staging/prod)
5. Inicie a API:
   - `npm run dev`

## Integracao Frontend (Fase 2.1)

No frontend (raiz do projeto), configure:

- `VITE_API_BASE_URL=http://localhost:3333`

Com essa variavel definida, a tela de compras usa a API backend.
Sem ela, a tela continua em modo legado (`localStorage`).

## Endpoints principais

- `GET /health`
- `GET /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases/manual`
- `POST /api/purchases/import-xml`
- `POST /api/purchases/:id/generate-payables`
- `DELETE /api/purchases/:id`

## Regras implementadas

- Dedupe por chave de acesso da NF-e.
- Importacao XML atomica com transacao.
- Geracao automatica de contas a pagar por duplicatas no XML.
- Geracao manual de parcelamento quando necessario.
- Soft-delete de compras e bloqueio de exclusao com contas pagas.

## Migracao de dados legados

1. Exporte os dados do `localStorage` para um arquivo JSON.
2. Rode:
   - `cd backend`
   - `npm run migrate:legacy -- ../backup-localstorage.json`

Esse script migra fornecedores, compras, itens, documentos e boletos vinculados em `compraId` para tabelas SQL.
