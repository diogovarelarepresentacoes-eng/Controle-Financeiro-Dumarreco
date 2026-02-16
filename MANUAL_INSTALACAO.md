# Manual de Instalação - Controle Financeiro Dumarreco (Computador Local)

Este manual descreve como instalar e executar o sistema em **um computador local**.

Ele cobre dois modos:

- **Modo A (rápido):** somente frontend (dados no navegador/localStorage).
- **Modo B (recomendado):** frontend + backend + PostgreSQL (Fase 2/2.1).

---

## 1. Requisitos

### 1.1 Obrigatórios

- **Node.js 18+** (recomendado LTS)  
  Download: https://nodejs.org/
- **Git** (opcional, mas recomendado)  
  Download: https://git-scm.com/
- **Windows 10/11** (ou Linux/macOS equivalente)

### 1.2 Para modo recomendado (com backend)

- **PostgreSQL 14+** instalado localmente  
  Download: https://www.postgresql.org/download/

---

## 2. Baixar o projeto

1. Copie a pasta do projeto para o computador local  
   Exemplo: `C:\ControleFinanceiroDumarreco`
2. Abra o **PowerShell** nessa pasta.

---

## 3. Instalar dependências

### 3.1 Frontend (raiz)

```cmd
cd C:\ControleFinanceiroDumarreco
npm install
```

### 3.2 Backend (pasta backend)

```cmd
cd C:\ControleFinanceiroDumarreco\backend
npm install
```

---

## 4. Configurar ambiente

### 4.1 Frontend

Na raiz do projeto, crie o arquivo `.env`:

```env
VITE_API_BASE_URL=http://localhost:3333
```

> Se este arquivo não existir, a tela de compras funciona em modo legado (localStorage).

### 4.2 Backend

Na pasta `backend`, copie `.env.example` para `.env` e ajuste:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/controle_financeiro?schema=public"
PORT=3333
```

Troque usuário/senha conforme seu PostgreSQL local.

---

## 5. Preparar banco de dados (modo recomendado)

Na pasta `backend`:

```cmd
npm run prisma:generate
npm run prisma:migrate
```

Isso cria/aplica as tabelas necessárias (compras, itens, documentos, contas a pagar vinculadas etc.) sem apagar dados existentes no banco.

---

## 6. Executar o sistema local

### 6.1 Terminal 1 - backend

```cmd
cd C:\ControleFinanceiroDumarreco\backend
npm run dev
```

API disponível em: `http://localhost:3333`

### 6.2 Terminal 2 - frontend

```cmd
cd C:\ControleFinanceiroDumarreco
npm run dev
```

Frontend disponível em: `http://localhost:5173`

---

## 7. Modo rápido (sem backend)

Se quiser abrir só o frontend (sem PostgreSQL/API):

```cmd
cd C:\ControleFinanceiroDumarreco
npm run dev
```

Nesse modo, os dados ficam no navegador (`localStorage`) da máquina.

---

## 8. Migrar dados legados do navegador para SQL (opcional)

Se você já usava dados no localStorage e quer levar para PostgreSQL:

1. Exporte os dados do navegador para um JSON (backup).
2. Execute:

```cmd
cd C:\ControleFinanceiroDumarreco\backend
npm run migrate:legacy -- ../backup-localstorage.json
```

---

## 9. Build para uso local em produção

### 9.1 Frontend build

```cmd
cd C:\ControleFinanceiroDumarreco
npm run build
npm run servidor
```

Acesse em: `http://localhost:4173`

### 9.2 Backend produção local

```cmd
cd C:\ControleFinanceiroDumarreco\backend
npm run build
npm run prisma:deploy
npm run start
```

---

## 10. Backup e restore

### 10.1 PostgreSQL

Backup:

```cmd
pg_dump -h localhost -U postgres -d controle_financeiro -Fc -f backup.dump
```

Restore:

```cmd
pg_restore -h localhost -U postgres -d controle_financeiro --clean --if-exists backup.dump
```

### 10.2 localStorage (modo legado)

- Abra DevTools do navegador > Application > Local Storage
- Exporte as chaves `controle-financeiro-*`

---

## 11. Problemas comuns

- **Erro de conexão com banco**
  - Verifique `DATABASE_URL` no `backend/.env`
  - Verifique se PostgreSQL está iniciado
- **Porta 3333 ocupada**
  - Altere `PORT` no `backend/.env`
- **Porta 5173 ocupada**
  - Rode `npm run dev -- --port 5174`
- **Frontend não usa backend**
  - Confirme `VITE_API_BASE_URL` na raiz e reinicie `npm run dev`
- **Dados não aparecem entre navegadores**
  - Em modo legado, cada navegador possui seu próprio armazenamento local

---

## 12. Resumo rápido de comandos

| Ação | Comando |
|------|---------|
| Instalar frontend | `npm install` |
| Instalar backend | `cd backend && npm install` |
| Subir frontend dev | `npm run dev` |
| Subir backend dev | `cd backend && npm run dev` |
| Gerar client Prisma | `cd backend && npm run prisma:generate` |
| Rodar migração DB | `cd backend && npm run prisma:migrate` |
| Migrar legado p/ SQL | `cd backend && npm run migrate:legacy -- ../backup-localstorage.json` |

---

*Controle Financeiro Dumarreco - Manual de Instalação em Computador Local*
