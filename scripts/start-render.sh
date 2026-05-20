#!/bin/sh
# Script de inicialização para o Render.
# Roda migrate + seed antes de levantar o servidor.
# DATABASE_URL deve ser injetada pelo Render como variável de ambiente.
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não está definida. Configure no painel do Render."
  exit 1
fi

echo "▶ Running DB migrations..."
DATABASE_URL="$DATABASE_URL" ./lib/db/node_modules/drizzle-kit/bin.cjs migrate --config ./lib/db/drizzle.config.ts

echo "▶ Running seed..."
pnpm --filter @workspace/scripts run seed

echo "▶ Starting server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
