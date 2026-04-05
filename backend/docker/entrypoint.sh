#!/bin/sh
set -e

echo "Syncing database schema (safe mode - no data loss)..."
npx prisma db push --skip-generate 2>&1 || {
  echo "WARNING: prisma db push failed (possibly destructive change). Trying migrate deploy..."
  npx prisma migrate deploy 2>&1 || echo "WARNING: migrate deploy returned non-zero, continuing..."
}

echo "Seeding admin user..."
node -e "require('./dist/modules/auth/service').authService.seedAdmin().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})"

echo "Starting API..."
node dist/server.js
