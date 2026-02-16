# Checklist de Seguranca para Atualizacoes

Use este checklist sempre antes e durante atualizacoes de codigo.

## Antes da atualizacao

- [ ] Confirmar backup recente do banco (`scripts/windows/backup_db.bat`).
- [ ] Garantir que `.env.docker` esta correto (usuario, senha, portas).
- [ ] Confirmar que o volume `dumarreco_postgres_data` existe:
  - `docker volume ls`
- [ ] Nunca planejar uso de `prisma migrate reset`.

## Durante a atualizacao

- [ ] Executar atualizacao segura:
  - `scripts/windows/update_safe.bat`
  - ou `docker compose --env-file .env.docker up -d --build`
- [ ] Nao usar `docker compose down -v`.
- [ ] Confirmar containers `db` e `api` saudaveis:
  - `docker compose ps`

## Depois da atualizacao

- [ ] Validar endpoint de saude:
  - `GET http://localhost:3333/health`
- [ ] Validar que dados anteriores permanecem no sistema.
- [ ] Registrar versao/commit implantado.
- [ ] Armazenar backup gerado no procedimento.

## Regras de ouro

- Banco sempre em volume nomeado persistente.
- Migracao de schema somente com `prisma migrate deploy` (prod) e `prisma migrate dev` (dev).
- Seeds sempre idempotentes (upsert), sem deletes em massa.
- Nunca executar comandos destrutivos em producao.
