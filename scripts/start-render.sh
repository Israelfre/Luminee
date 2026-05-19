#!/bin/sh
# Script de inicialização para o Render.
# Roda migrate + seed antes de levantar o servidor.
# DATABASE_URL deve ser injetada pelo Render como variável de ambiente.
set -e

echo "▶ Running DB migrations..."
pnpm --dir lib/db run migrate

echo "▶ Running seed..."
pnpm --filter @workspace/scripts run seed

echo "▶ Starting server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
