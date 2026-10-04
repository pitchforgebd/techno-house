#!/usr/bin/env bash
# Routine release of Techno House on the server.
#
#   cd /var/www/techno-house/current && ./deploy/deploy.sh [git-ref]
#
# git-ref defaults to origin/main; pass a tag or commit to deploy exactly that.
# Run it as the deploy user (the one PM2 runs the app as), NOT as root, and
# without NODE_ENV=production in the shell: `npm ci` has to install the dev
# dependencies because `next build` needs them. The running app gets
# NODE_ENV=production from deploy/ecosystem.config.cjs.
#
# What it does, in order — and stops at the first failure:
#   1 back up the database and uploads          (before ANY migration)
#   2 fetch and check out the release
#   3 install exact dependencies
#   4 show pending migrations, then apply them  (additive-only by policy)
#   5 build
#   6 reload the app under PM2
#   7 wait for /api/health, then run the read-only database preflight
#
# If a step fails after the checkout, the previous commit is printed together
# with the rollback command. Do not roll migrations back — see "Rollback" in
# docs/DEPLOYMENT.md.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/techno-house/current}"
REF="${1:-origin/main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
PM2_CONFIG="${PM2_CONFIG:-deploy/ecosystem.config.cjs}"

cd "$APP_DIR"
export APP_DIR

if [ "$(id -u)" -eq 0 ]; then
  echo "deploy: do not run as root (files would end up root-owned and PM2 could not write them)." >&2
  exit 1
fi
if [ ! -f .env.local ]; then
  echo "deploy: .env.local is missing in $APP_DIR (create it there first; see the runbook)." >&2
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "deploy: the working tree has local changes; refusing to switch releases over them." >&2
  git status --short --untracked-files=no >&2
  exit 1
fi

previous="$(git rev-parse HEAD)"
trap 'echo; echo "deploy FAILED. Previous release was ${previous}."; echo "Roll back the code with:  git checkout --detach ${previous} && npm ci && npm run build && pm2 reload techno-house"; echo "(migrations are additive and stay applied; restore the dump only if the SCHEMA itself is the problem)"' ERR

echo "== 1/7 backup"
./deploy/backup-db.sh

echo "== 2/7 fetch ${REF}"
git fetch --tags --prune origin
git checkout --detach "$REF"
echo "   now at $(git rev-parse --short HEAD): $(git log -1 --format=%s)"

echo "== 3/7 install"
npm ci

echo "== 4/7 migrations"
npm run db:migrate:status || true
npm run db:migrate:deploy

echo "== 5/7 build"
npm run build

echo "== 6/7 reload"
pm2 startOrReload "$PM2_CONFIG" --update-env
pm2 save >/dev/null

echo "== 7/7 verify"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [ "${healthy:-0}" != "1" ]; then
  echo "deploy: ${HEALTH_URL} did not report healthy within 60s" >&2
  false
fi
curl -fsS "$HEALTH_URL"; echo
npm run db:preflight

trap - ERR
echo
echo "deploy OK: $(git rev-parse --short HEAD) is live. Previous release: ${previous}"
