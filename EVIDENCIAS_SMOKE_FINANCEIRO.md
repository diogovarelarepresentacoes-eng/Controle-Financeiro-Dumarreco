## Evidências - Smoke test financeiro

Data: 2026-02-17

### 1) Docker Compose (não executado neste ambiente)

Ao tentar executar `docker compose up -d --build`, o comando `docker` não estava disponível no PATH (erro: comando não reconhecido).

> Observação: o `docker-compose.yml` existe e está configurado para subir `db` (Postgres) + `api` (backend) e apontar `DATABASE_URL` para o serviço `db`.

### 2) Smoke test via HTTP (API local)

Foi iniciada a API local em `http://localhost:3333` e executados requests básicos.

#### Execução via script

O script `scripts/smoke-finance.ps1` foi executado e **falhou** (status 1) porque endpoints que dependem do Postgres retornaram 500 quando o Postgres local não aceitou credenciais.

#### `/health`

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok"}
```

#### `/api/products` (falha por credencial do Postgres local)

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{"error":"... Authentication failed against database server ..."}
```

#### `POST /api/products/import/preview` (sem arquivo)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{"error":"Arquivo obrigatorio."}
```

### 3) Correção aplicada para estabilizar a API em erro

Antes, uma exceção em handlers `async` derrubava o processo do backend (Express 4 não captura automaticamente promise rejections).

Foi adicionado um wrapper `asyncHandler` e aplicado nas rotas de `products` e `purchases`, garantindo que erros (ex.: falha de conexão/credencial do banco) retornem 500 via middleware sem derrubar o servidor.

