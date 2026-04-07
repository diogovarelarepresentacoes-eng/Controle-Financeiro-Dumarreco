#!/bin/sh
# Renovar certificado SSL (cron no servidor, ex.: 0 3 * * *)
set -e
cd /var/www/controle-financeiro
docker compose --env-file .env.docker --profile cert run --rm certbot renew
docker compose --env-file .env.docker up -d --force-recreate web
