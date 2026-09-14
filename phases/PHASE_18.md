# Phase 18

## Objective

Prepare VPS/cloud production deployment, PostgreSQL, Docker/process management, reverse proxy, HTTPS, backups, logging, health checks, and rollback.

## Scope

P18-T01 documents the production environment inventory only.
**Live deploy is deferred** (operator choice, 2026-09-05). Do not
provision hosts, DNS, or TLS until explicitly approved.

## Tasks

- [x] P18-T01 Production environment
- [ ] P18-T02 PostgreSQL production
- [ ] P18-T03 Docker/VPS setup
- [ ] P18-T04 Reverse proxy/HTTPS
- [ ] P18-T05 Backups/logging
- [ ] P18-T06 Health checks
- [ ] P18-T07 Rollback procedure
- [ ] P18-T08 Production smoke test

## Completed Tasks

### P18-T01 Production environment

- Expanded `docs/DEPLOYMENT.md` with required/optional env inventory,
  local vs production matrix, and go-live checklist
- Clarified `.env.example` (APP_URL, mock forbidden in production)
- Added `npm run test:env`
- No host provisioned; no secrets committed — AD-193

## Files Created

- `scripts/deploy/check-env-example.ts`

## Files Modified

- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`
- `.env.example`
- `package.json`

## Important Decisions

- AD-193 — P18-T01 env inventory only; live deploy deferred by operator

## Security Considerations

- Secrets stay out of the repo; production must not use `DATA_SOURCE=mock`
- Demo seed already refuses `NODE_ENV=production`

## Validation Results

- `npm run test:env` — 8 checks ok

## Deferred Work

- P18-T02–T08 (Postgres host, Docker/VPS, HTTPS, backups, health,
  rollback, smoke) — wait for deploy approval
- Middleware → proxy migration (Next 16 warning)

## Next Phase Dependency

Stop until the operator explicitly requests production/deploy work
(P18-T02+). Manual testing of Phases 01–17 is in progress.

## Completion Status

PAUSED after T01 — live deploy deferred
