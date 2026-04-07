#!/bin/sh
set -e
DOMAIN="${SSL_DOMAIN:-dumarreco.tech}"
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
  echo "nginx: certificados encontrados para ${DOMAIN}, usando HTTPS."
  cp /docker/nginx-ssl.conf /etc/nginx/conf.d/default.conf
else
  echo "nginx: sem certificados SSL ainda, apenas HTTP (porta 80)."
  cp /docker/nginx-http.conf /etc/nginx/conf.d/default.conf
fi
exec nginx -g 'daemon off;'
