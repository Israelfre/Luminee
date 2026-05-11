#!/usr/bin/env bash
# Run on Render as a pre-deploy or start command step.
# Applies DB migrations and seeds demo salon if empty.
set -e

echo "→ Running DB migrations..."
pnpm --filter @workspace/db run push

echo "→ Seeding demo salon (if empty)..."
pnpm --filter @workspace/scripts run seed

echo "→ Done."
