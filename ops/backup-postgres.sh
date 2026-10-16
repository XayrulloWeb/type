#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

docker compose --env-file .env.production -f docker-compose.production.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-nova_type}" -d "${POSTGRES_DB:-nova_type}" -Fc \
  > "$BACKUP_DIR/nova-type-$STAMP.dump"

find "$BACKUP_DIR" -type f -name 'nova-type-*.dump' -mtime "+$RETENTION_DAYS" -delete
echo "Backup created: $BACKUP_DIR/nova-type-$STAMP.dump"
