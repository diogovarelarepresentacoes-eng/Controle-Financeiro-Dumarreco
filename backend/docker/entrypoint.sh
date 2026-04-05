#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "WARNING: db push failed, trying migrate deploy..."
npx prisma migrate deploy 2>&1 || echo "WARNING: migrate deploy returned non-zero, continuing..."

echo "Seeding admin user..."
node -e "require('./dist/modules/auth/service').authService.seedAdmin().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})"

echo "Starting API..."
node dist/server.js
