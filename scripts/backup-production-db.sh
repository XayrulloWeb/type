#!/usr/bin/env bash
set -euo pipefail
umask 077

app_root="/var/www/nova-type"
backup_dir="$app_root/backups"
env_file="$app_root/shared/.env.production"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
resolved_backup_dir="$(readlink -f "$backup_dir")"
if [[ "$resolved_backup_dir" != "/var/www/nova-type/backups" ]]; then
  echo "Refusing to use unexpected backup directory: $resolved_backup_dir" >&2
  exit 1
fi

set -a
. "$env_file"
set +a

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary_file="$resolved_backup_dir/.nova_type_$timestamp.sql.gz.tmp"
backup_file="$resolved_backup_dir/nova_type_$timestamp.sql.gz"

cleanup() {
  rm -f -- "$temporary_file"
}
trap cleanup EXIT

pg_dump_url="${DATABASE_URL%%\?schema=*}"
pg_dump --no-owner --no-privileges "$pg_dump_url" | gzip -9 > "$temporary_file"
gzip -t "$temporary_file"
mv -- "$temporary_file" "$backup_file"
trap - EXIT

find "$resolved_backup_dir" -maxdepth 1 -type f -name 'nova_type_*.sql.gz' -mtime +14 -delete
echo "Created $backup_file"
