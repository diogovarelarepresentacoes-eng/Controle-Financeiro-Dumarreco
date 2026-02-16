#!/bin/sh
set -e

echo "Applying Prisma migrations (safe mode)..."
npx prisma migrate deploy

echo "Starting API..."
node dist/server.js
