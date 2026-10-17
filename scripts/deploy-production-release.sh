#!/usr/bin/env bash
set -euo pipefail

app_root="/var/www/nova-type"
source_dir="$app_root/source"
release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git -C "$source_dir" rev-parse --short HEAD)"
release_dir="$app_root/releases/$release_id"

set -a
. "$app_root/shared/.env.production"
set +a

export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=768

cd "$source_dir"
npm run build

mkdir -p "$release_dir/.next"
cp -a .next/standalone/. "$release_dir/"
cp -a public "$release_dir/public"
cp -a .next/static "$release_dir/.next/static"

ln -sfn "$release_dir" "$app_root/current.new"
mv -Tf "$app_root/current.new" "$app_root/current"

pm2 restart nova-type --update-env
pm2 save

echo "Published release $release_id"
