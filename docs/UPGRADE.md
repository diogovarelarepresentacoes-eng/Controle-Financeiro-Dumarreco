# Upgrade Seguro e Persistencia de Dados

Este projeto possui duas camadas de persistencia durante a transicao:

- Frontend legado com `localStorage` (sem perda por atualizacao de tela).
- Backend Fase 2 com `PostgreSQL + Prisma` para dados de compras/contas a pagar.

## 1) Principios de seguranca

- Nunca limpar chaves de dados em atualizacoes de versao.
- Executar migracoes idempotentes no startup da aplicacao.
- Criar novas estruturas sem sobrescrever dados antigos.
- Em exclusao de registros sensiveis, preferir `soft-delete` quando houver historico financeiro.

## 2) Como as migracoes funcionam

- Arquivo: `src/services/migrations.ts`
- Chave de versao: `controle-financeiro-schema-version`
- As migracoes rodam no boot em `src/main.tsx`, via `runStorageMigrations()`.

Fluxo:

1. Le a versao atual.
2. Executa migracoes pendentes em ordem.
3. Atualiza a versao apenas apos cada migracao concluir.

## 3) Upgrade em desenvolvimento (frontend)

1. Atualize o codigo.
2. Rode:
   - `npm install`
   - `npm run dev`
3. Abra a aplicacao normalmente. As migracoes serao executadas automaticamente.

### 3.1 Conectar frontend na API (Fase 2.1)

- Crie `.env` na raiz com:
  - `VITE_API_BASE_URL=http://localhost:3333`
- Reinicie o frontend.
- A tela de compras passara a usar backend.

## 4) Backup e restore do legado (localStorage)

Como o armazenamento atual e no navegador, o backup pode ser feito exportando o `localStorage`:

- No DevTools do navegador:
  - Application > Local Storage > exportar as chaves `controle-financeiro-*`.

Restore:

- Reimportar os valores JSON das mesmas chaves no mesmo dominio da aplicacao.

## 5) Backend Fase 2 (Postgres + Prisma)

### 5.1 Rodar local sem Docker

1. Configure o banco Postgres e ajuste `backend/.env` a partir de `backend/.env.example`.
2. Instale dependencias:
   - `cd backend`
   - `npm install`
3. Gere client Prisma:
   - `npm run prisma:generate`
4. Aplique migracoes:
   - `npm run prisma:migrate`
5. Suba API:
   - `npm run dev`

### 5.1.1 Migrar dados legados para SQL

1. Exporte os dados `localStorage` para JSON (`backup-localstorage.json`).
2. Execute:
   - `cd backend`
   - `npm run migrate:legacy -- ../backup-localstorage.json`

### 5.2 Rodar com Docker (volume persistente)

- Na raiz:
  - `docker compose up -d`

Persistencia:

- Volume: `postgres_data`
- Atualizacoes de app/containers nao removem dados do volume, desde que nao execute `docker compose down -v`.

### 5.3 Deploy seguro em staging/producao

1. Backup do banco.
2. Deploy da nova versao da API.
3. Executar migracoes com:
   - `cd backend && npm run prisma:deploy`
4. Validar `GET /health`.
5. Liberar trafego.

**Nunca** usar `drop/create` em producao.

## 6) Backup e restore Postgres

Backup:

- `pg_dump -h <host> -U <user> -d <db> -Fc -f backup.dump`

Restore:

- `pg_restore -h <host> -U <user> -d <db> --clean --if-exists backup.dump`

## 7) Checklist de release

- [ ] Backup feito
- [ ] Migracoes revisadas
- [ ] Build e testes passando
- [ ] Smoke test frontend (compras, boletos, relatorios)
- [ ] Smoke test backend (`/health`, `/api/purchases`)
- [ ] Monitoramento de erros de importacao XML ativo

