#!/bin/sh
set -e

echo "Aguardando banco de dados..."
RETRIES=30
until npx prisma db execute --stdin --url "$DATABASE_URL" >/dev/null 2>&1 <<'SQL' || [ $RETRIES -eq 0 ]
SELECT 1;
SQL
do
  echo "Banco ainda indisponivel, aguardando..."
  RETRIES=$((RETRIES - 1))
  sleep 2
done

if [ $RETRIES -eq 0 ]; then
  echo "Falha ao conectar no banco."
  exit 1
fi

if [ "$BACKUP_BEFORE_MIGRATE" = "true" ]; then
  if [ -n "$DATABASE_URL" ] && command -v pg_dump >/dev/null 2>&1; then
    mkdir -p /tmp/backups
    BACKUP_FILE="/tmp/backups/pre-migrate-$(date +%Y%m%d-%H%M%S).sql"
    echo "Gerando backup pre-migrate em $BACKUP_FILE"
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || echo "Aviso: falha no backup pre-migrate."
  else
    echo "Aviso: BACKUP_BEFORE_MIGRATE=true, mas pg_dump/DATABASE_URL indisponivel."
  fi
fi

echo "Aplicando migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED_ON_STARTUP" = "true" ]; then
  echo "RUN_SEED_ON_STARTUP=true, executando seed..."
  npx prisma db seed
else
  echo "Seed desativado no startup."
fi

node dist/server.js
