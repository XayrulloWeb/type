#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: sh ops/restore-postgres.sh backups/nova-type-TIMESTAMP.dump"
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "RESTORE_NOVA_TYPE" ]; then
  echo "Set CONFIRM_RESTORE=RESTORE_NOVA_TYPE to confirm destructive restore."
  exit 1
fi

docker compose --env-file .env.production -f docker-compose.production.yml exec -T db \
  pg_restore --clean --if-exists --no-owner -U "${POSTGRES_USER:-nova_type}" -d "${POSTGRES_DB:-nova_type}" < "$1"
