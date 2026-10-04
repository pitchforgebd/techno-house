#!/usr/bin/env bash
# Back up the database (pg_dump, custom format) and the uploads directory.
#
#   ./deploy/backup-db.sh
#
# Run it before every migration (deploy.sh does) and nightly from cron. A
# restore is `pg_restore --clean --if-exists --no-owner -d <db> <file>`; test one
# at least once before you need it.
#
# Environment (all optional):
#   APP_DIR     /var/www/techno-house/current   where .env.local lives
#   UPLOADS_DIR $APP_DIR/public/uploads         staff-uploaded media
#   BACKUP_DIR  /var/backups/techno-house
#   KEEP        14                              how many of each to keep
set -euo pipefail
umask 077   # the dump contains customer data

APP_DIR="${APP_DIR:-/var/www/techno-house/current}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/public/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/techno-house}"
KEEP="${KEEP:-14}"

env_file="$APP_DIR/.env.local"
if [ ! -f "$env_file" ]; then
  echo "backup: $env_file not found" >&2
  exit 1
fi

# Read DATABASE_URL only. The file is dotenv, not shell: do not `source` it.
url="$(grep -E '^DATABASE_URL=' "$env_file" | head -n1 | cut -d= -f2-)"
url="${url%\"}"; url="${url#\"}"; url="${url%\'}"; url="${url#\'}"
# libpq rejects Prisma's `?schema=public` query parameter.
url="${url%%\?*}"
if [ -z "$url" ]; then
  echo "backup: DATABASE_URL is not set in $env_file" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"

db_file="$BACKUP_DIR/db-$stamp.dump"
pg_dump --format=custom --no-owner --file "$db_file" "$url"
echo "backup: database -> $db_file ($(du -h "$db_file" | cut -f1))"

if [ -d "$UPLOADS_DIR" ]; then
  uploads_file="$BACKUP_DIR/uploads-$stamp.tar.gz"
  tar -czf "$uploads_file" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  echo "backup: uploads  -> $uploads_file ($(du -h "$uploads_file" | cut -f1))"
fi

# Retention: newest $KEEP of each kind.
prune() {
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/$1 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
    rm -f -- "$old"
  done
}
prune 'db-*.dump'
prune 'uploads-*.tar.gz'
