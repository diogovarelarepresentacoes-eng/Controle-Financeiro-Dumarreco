# Manual de Instalacao - Controle Financeiro Dumarreco

Este manual cobre:

- instalacao **local** (Windows/Linux/macOS);
- instalacao em **servidor web/VPS** (exemplo: Hostinger VPS);
- **atualizacao segura** entre pasta antiga e pasta nova sem perder informacoes.

---

## 1. Estrutura do projeto

No repositorio existem dois blocos principais:

- sistema financeiro principal (raiz + `backend/`);
- modulo CRM opcional em `crm/`.

Este manual foca no sistema principal (raiz + `backend`), com observacoes de deploy Docker.

---

## 2. Requisitos

### 2.1 Local (dev)

- Node.js 18+ (LTS recomendado)
- npm
- PostgreSQL 14+
- Git (recomendado)

### 2.2 Servidor (producao)

- VPS Linux (Ubuntu 22.04+ recomendado)
- Docker + Docker Compose
- Git
- Dominio configurado (opcional, mas recomendado)

---

## 3. Instalacao local (modo recomendado)

### 3.1 Clonar/baixar projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd "Controle Financeiro Dumarreco"
```

### 3.2 Instalar dependencias

```bash
npm install
cd backend
npm install
cd ..
```

### 3.3 Configurar ambiente

Crie/ajuste arquivo `.env` na raiz:

```env
VITE_API_BASE_URL=http://localhost:3333
VITE_CRM_API_URL=http://localhost:4000
```

Crie/ajuste `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/controle_financeiro?schema=public"
PORT=3333
```

Crie/ajuste `crm/apps/api/.env` (apenas se for usar o CRM):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm?schema=public"
WHATSAPP_WEBHOOK_SECRET="uma-chave-segura-aqui"
API_PORT=4000

# Importante: o backend do CRM consulta o estoque/produtos do sistema financeiro
FINANCE_API_URL=http://localhost:3333
```

### 3.4 Migrar banco

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
cd ..
```

### 3.5 Executar local

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- CRM API (opcional): `http://localhost:4000`

---

## 4. Instalacao em servidor web (Hostinger VPS / qualquer VPS)

> Para Hostinger compartilhada sem VPS, Node + Docker normalmente nao sao suportados. Use **Hostinger VPS**.

### 4.1 Preparar servidor

No VPS (Ubuntu):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
```

Instalar Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Reconecte no SSH.

### 4.2 Baixar projeto e subir stack

```bash
git clone <URL_DO_REPOSITORIO>
cd "Controle Financeiro Dumarreco"
cp .env.docker.example .env
docker compose up -d --build
```

Isso sobe:

- `dumarreco_db` (PostgreSQL com volume persistente);
- `dumarreco_api`;
- `dumarreco_web` (frontend build servido via Nginx).

Portas (padrao):

- Web: `http://localhost:5173` (porta 80 no container)
- API: `http://localhost:3333`

Smoke test (opcional):

- Windows (PowerShell):
  - `powershell -ExecutionPolicy Bypass -File .\\scripts\\smoke-finance.ps1`

### 4.3 Atualizacao de versao no VPS (git pull)

Sempre rode backup antes:

```bash
docker exec -i dumarreco_db pg_dump -U postgres -d controle_financeiro > backup-antes-update.sql
git pull
docker compose up -d --build
```

---

## 5. Atualizacao segura de pasta antiga para pasta nova (Windows)

Cenario:

- pasta antiga foi renomeada para `Controle Financeiro Dumarreco back`;
- voce baixou a nova pasta do GitHub.

Use o script:

`ATUALIZAR_SEGURO_NOVA_VERSAO.bat`

Ou use a versao com menu interativo:

`ATUALIZAR_SEGURO_MENU.bat`

### 5.1 O que o .bat faz

- pede/identifica a pasta antiga;
- copia arquivos de configuracao (`.env`, `backend/.env`, `crm/.env` quando existirem);
- copia pastas de backup;
- cria dump SQL dos bancos Docker se os containers estiverem rodando;
- copia dumps para a pasta nova;
- **nao apaga nada** da pasta antiga;
- cria log em `migracao_logs/`.

### 5.2 Como executar

1. Coloque o `.bat` dentro da pasta nova.
2. Clique com botao direito > **Executar como administrador** (recomendado).
3. Informe a pasta antiga (ou ENTER para padrao).
4. Aguarde finalizar e leia o log.

### 5.3 Menu interativo (recomendado para operacao)

No `ATUALIZAR_SEGURO_MENU.bat`, voce escolhe:

- `1` Somente backup SQL (Docker)
- `2` Somente migracao de configuracoes/arquivos
- `3` Fluxo completo (backup + migracao + `docker compose up -d --build`)
- `4` Sair

---

## 6. Backup e restore

### 6.1 Backup PostgreSQL (Docker)

```bash
docker exec -i dumarreco_db pg_dump -U postgres -d controle_financeiro > backup.sql
```

### 6.2 Restore PostgreSQL (Docker)

```bash
docker exec -i dumarreco_db psql -U postgres -d controle_financeiro < backup.sql
```

### 6.3 Regra de ouro

Antes de qualquer update:

1. gerar backup SQL;
2. validar backup (tamanho e data);
3. aplicar update;
4. validar sistema;
5. so depois considerar remover pasta antiga.

---

## 7. Problemas comuns

- erro de conexao com banco:
  - confira `DATABASE_URL`;
  - confirme PostgreSQL/container ativo.
- porta ocupada:
  - altere variaveis de porta no `.env`.
- frontend nao bate na API:
  - revise `VITE_API_BASE_URL`.
- update sem dados:
  - rode o `.bat` e confira log em `migracao_logs/`;
  - valide se o dump SQL foi gerado.

---

## 8. Comandos rapidos

| Acao | Comando |
|------|---------|
| Instalar frontend | `npm install` |
| Instalar backend | `cd backend && npm install` |
| Rodar backend dev | `cd backend && npm run dev` |
| Rodar frontend dev | `npm run dev` |
| Migrar banco local | `cd backend && npm run prisma:migrate` |
| Subir Docker | `docker compose up -d --build` |
| Backup Docker DB | `docker exec -i dumarreco_db pg_dump -U postgres -d controle_financeiro > backup.sql` |

---

*Controle Financeiro Dumarreco - Instalacao local e servidor (VPS)*
