# Techno House — Deployment

Updated: 2026-10-04
Revised for the security / business-logic remediation (AD-330…AD-336).
**The site is live** at https://technohouse.com.bd on a single VPS (Ubuntu,
Nginx, local PostgreSQL, the app in `/home/deploy/techno-house` run as the
`deploy` user, configuration in `.env`; DNS via Cloudflare; mail on the same
box). It has been live since 2026-09-18 and is updated by `git pull` on the
server. The production database is **separate from the development one**
(different catalogue, real orders): anything run against `techno_house_dev`
has NOT happened on production. (An earlier revision of this file said "no live
deploy yet"; that was stale and has been corrected.)

`docs/DEPLOY_VPS_RUNBOOK.md` is a from-scratch build for a NEW server, a
staging copy or disaster recovery — it is not how the live site is updated.
Why a persistent-disk VPS and not Vercel still holds: admin uploads are written
to local disk and `next start` does not serve files added after the build
(Nginx serves `/uploads/`; it is already doing so on the live server).

## Target

Must be deployable to:
- VPS
- cloud VM
- container-based hosting
- compatible managed Node.js hosting

**Status:** Application hardening and the remediation are complete. Live
hosting, DNS, TLS termination and managed PostgreSQL are **not** configured
yet. This document says what production must look like.

> **Read this before the first deploy.** Two things below will stop the
> application from starting if they are missing, by design: `ADMIN_LOGIN_SLUG`
> and `SESSION_JWT_SECRET`. A third — the stale-order scheduler — will not stop
> it starting, but will silently leave a real inventory defect unfixed.

## Production components

- Next.js/Node runtime
- PostgreSQL
- reverse proxy such as Nginx
- HTTPS
- process manager or container runtime
- environment variables/secrets
- migrations
- backups
- logs
- health checks
- a scheduler for the stale-order sweep

## Deployment principles

- no hosting-vendor lock-in in core business logic
- separate development/staging/production environments
- never use production credentials locally
- never commit `.env` secrets
- maintain `.env.example`
- never run `prisma db seed` / demo seed against production
  (`prisma/seed.ts` already refuses `NODE_ENV=production`)

## Environment inventory

Names only. Never commit values; fill them on the host, out of band.

### Required — the app will not start or not function without these

| Variable | Purpose | If missing |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection, validated by `lib/env.ts` | Throws at first database use |
| `NODE_ENV=production` | Set by the process manager / host | Dev fallbacks stay active, HSTS is not sent |
| `APP_URL` | Public HTTPS origin — sitemap, robots, OG `metadataBase`, payment return URLs | Gateway callbacks cannot be built |
| `SESSION_JWT_SECRET` | Signs staff and customer session JWTs. At least 32 random characters | **Nobody can sign in, staff or customer.** Changing it later logs everyone out |
| `ADMIN_LOGIN_SLUG` | The obscured staff sign-in path, `/admin/access/{slug}`. 8–64 characters of letters, digits, `_` or `-` | **The admin panel throws on startup.** Deliberate (F-14): the development default is published in this repository, so falling back to it silently would put the gate at a publicly known address |

`DATA_SOURCE` must be **unset** (or anything other than `mock`) so the
catalogue, cart and orders use PostgreSQL. `mock` is forbidden in production.

### Required if the corresponding feature is used

These three are **not interchangeable**. Each is derived separately with a
per-purpose salt (`lib/security/secret-key.ts`), so they are three distinct
values. Each must be at least 32 characters in production, or 32 random bytes
as hex/base64. Generate with `openssl rand -base64 48`.

| Variable | Encrypts | If missing |
| --- | --- | --- |
| `GATEWAY_SECRETS_KEY` | Payment gateway credentials stored in admin | Saved gateway secrets cannot be decrypted |
| `STORAGE_SECRETS_KEY` | S3/Backblaze credentials stored in admin | Saved storage secrets cannot be decrypted |
| `COURIER_SECRETS_KEY` | Courier API credentials stored in admin | Saved courier secrets cannot be decrypted |

**Rotating one of these makes every secret encrypted under the old value
unreadable.** Re-enter those credentials in admin after a rotation.

### Recommended

| Variable | Purpose | Default if unset |
| --- | --- | --- |
| `TRUSTED_PROXY_HOPS` | How many proxy hops to trust in `X-Forwarded-For`, counted from the right. Behind Cloudflare alone this is `1` | `1` |
| `STALE_SWEEP_TOKEN` | Bearer token for `POST /api/internal/sweep-stale-orders` | Unset — the endpoint returns **404** and does not exist |
| `STALE_ORDER_RELEASE_HOURS` | Abandonment window before an unpaid hosted-gateway order is cancelled and its stock returned | `24`. An invalid value falls back to 24 rather than clamping |
| `PAYMENT_PUBLIC_BASE_URL` | Overrides `APP_URL` for gateway callbacks | Falls back to `APP_URL` |

Set `TRUSTED_PROXY_HOPS` to match the real topology. Too high and a client can
spoof its own IP into the rate limiter; too low and every request appears to
come from the proxy, so one abusive client rate-limits everyone.

### Optional integrations

`SSLCOMMERZ_*`, `BKASH_*`, `SMTP_PASSWORD`, `SMS_API_KEY` / `SMS_API_SECRET`,
`META_CAPI_ACCESS_TOKEN`, social OAuth secrets, reCAPTCHA, Google Maps — see
`.env.example`. Gateway credentials may also be entered in admin, where they
are encrypted with `GATEWAY_SECRETS_KEY`. Nagad is admin-only and has no
environment variables.

### Local vs production

| Concern | Local (Laragon) | Production |
| --- | --- | --- |
| Secrets file | `.env.local`, gitignored | Host secrets / vault — never the repo |
| `APP_URL` | Optional, falls back to `http://127.0.0.1:3000` | Required public HTTPS origin |
| `ADMIN_LOGIN_SLUG` | Optional, falls back to a published default | **Required** — startup fails without it |
| `DATA_SOURCE=mock` | Allowed for UI without a database | Forbidden |
| Seed | Demo catalogue only | Never |

---

## Build, start and restart

```bash
npm ci                    # postinstall runs `prisma generate`
npm run db:migrate:deploy # apply migrations — NEVER `db:migrate` in production
npm run build             # next build
npm start                 # next start
```

`npm run db:migrate` is `prisma migrate dev`. It is interactive, can offer to
**reset the database**, and must never be pointed at production. Production
uses `db:migrate:deploy`, which only applies pending migrations and never drops
anything.

Restart is whatever the process manager provides (`pm2 restart <app>`,
`systemctl restart <unit>`, or the host's Node app restart). The application
holds no state outside PostgreSQL and `public/uploads`, so a restart is safe at
any time.

### Migration procedure

1. **Back up the database first.** Every migration to date is additive, but
   that is a property of these migrations, not of migrations in general.
2. `npm run db:migrate:status` — confirm what is pending.
3. `npm run db:migrate:deploy`.
4. `npm run db:preflight` — read-only invariant check (below).
5. Restart the application.

Migrations are applied **before** the new build starts serving, because every
migration in this repository is additive and backward-compatible: the old code
runs unchanged against the new schema. A future migration that is *not*
backward-compatible must be split into expand → deploy → contract, or the old
process will error between the migration and the restart.

### Database preflight

```bash
npm run db:preflight
```

Read-only. Issues SELECTs only, writes nothing, and is safe against production
at any time. Checks eleven invariants — stock ledger bounds, wallet balances,
impossible order/payment pairings, duplicate open refunds, orphaned
reservations, and whether abandoned checkouts are accumulating (which is how a
stopped scheduler shows up). Exits non-zero on a critical violation.

It never repairs anything. If it reports a problem, take a backup and
investigate with `npm run orders:stale:inspect` and `npm run inventory:inspect`
— both read-only — before considering a repair.

### Backups

Required before every migration and on a schedule thereafter. `pg_dump` of the
application database is sufficient; there is no state elsewhere except
`public/uploads`.

**`public/uploads` must be on persistent storage and must be backed up.**
Admin media is written to local disk (`lib/media/admin-media.ts`). On a host
with an ephemeral filesystem — most container platforms — uploaded images are
lost on every redeploy, and the `MediaAsset` rows then point at files that no
longer exist. On a VPS or cPanel account with a normal disk this is fine.

### Rollback

1. Restart the previous application build. Because every migration to date is
   additive, the previous build runs against the migrated schema unchanged.
2. **Do not roll a migration back to undo a bad deploy.** There are no
   down-migrations here, and reversing an additive migration means dropping a
   column that newer rows are using. Restore from backup instead, and only if
   the schema itself is the problem.
3. If the rollback is because of data written by the bad build, restore the
   backup — do not hand-edit rows.

---

## Cron / scheduler — required

The abandoned-checkout sweep **does not run on its own**, and without it a
fixed inventory defect quietly returns: an order reserves stock the moment it
is placed, so every customer who reaches the payment gateway and closes the tab
holds those units permanently.

Pick one.

**Host cron / Task Scheduler**, hourly:

```
0 * * * * cd /path/to/app && /usr/bin/npm run orders:stale -- --apply >> /var/log/techno-house-sweep.log 2>&1
```

**HTTP scheduler** (Vercel Cron, cron-job.org, an uptime pinger) — set
`STALE_SWEEP_TOKEN` first:

```
POST https://<APP_URL>/api/internal/sweep-stale-orders
Authorization: Bearer <STALE_SWEEP_TOKEN>
```

Frequency barely matters. `STALE_ORDER_RELEASE_HOURS` decides *which* orders
qualify, so hourly and daily release the same orders — hourly just releases
them sooner after they qualify. Hourly is recommended so the log shows the job
is alive.

**Before the first production run**, inspect rather than sweep:

```bash
npm run orders:stale:inspect   # read-only, shows every field that would change
```

A first run on a long-lived database may find a large backlog. Read the list
before applying it.

---

## Health check

```
GET /api/health
200  {"status":"ok","database":"up"}
503  {"status":"degraded","database":"down"}
```

Unauthenticated and deliberately uninformative — no version, no migration
state, no error text. It runs `SELECT 1`, so it distinguishes "the process is
listening" from "the process can serve requests", which matters here because
the app runs a `max: 5` pool against a single Postgres instance.

Point the process manager and the uptime monitor at it. Do not let a CDN cache
it (it sends `no-store`).

---

## Post-deployment smoke tests

Run against the live origin, in this order. None of them moves money.

| # | Check | Expected |
| --- | --- | --- |
| 1 | `GET /api/health` | 200, `database: up` |
| 2 | `GET /` | 200, products render |
| 3 | `GET /product/<a real slug>` | 200, price and stock render |
| 4 | `GET /cart` | 200 |
| 5 | `GET /checkout` | 200 |
| 6 | `GET /admin` while signed out | Redirects to `/admin/access/<slug>` |
| 7 | `GET /admin/login` | The not-found page. **Status is 200, not 404** — see the note below |
| 8 | `GET /admin/access/wrong-slug` | The not-found page, and **no sign-in form**. Must not redirect to the real slug |
| 9 | `GET /admin/access/<real slug>` | 200, sign-in form |
| 10 | Sign in as staff | Lands on the dashboard |
| 11 | Register a test customer, sign in, open `/account/orders` | 200, empty list |
| 12 | `PROBE_ENV=production APP_URL=https://<host> npm run test:headers` | 14 checks pass, including HSTS present with `max-age` >= 1 year |
| 13 | `POST /api/internal/sweep-stale-orders` with no auth header | 401 if the token is set, 404 if it is not |
| 14 | `npm run db:preflight` | Passes |
| 15 | Place one cash-on-delivery order end to end | Order appears in admin; stock `reserved` increases by the quantity |

> **Known soft-404 on `/admin/*`.** `app/(admin)/layout.tsx` is
> `force-dynamic`, so the response starts streaming before the page calls
> `notFound()` and the status has already been committed as 200. The *body* is
> the not-found page and no sign-in form is rendered, so nothing is exposed —
> but monitoring and any WAF rule that counts 404s will not see these as
> failures. Rate-limit admin paths by **request count**, not by response
> status (see the Cloudflare notes). Storefront paths that match no route at
> all still return a real 404.

Check 15 is the one that proves the deployment: it exercises the database, the
order path, the stock reservation and the admin read in a single pass, without
involving a gateway. Cancel the order afterwards and confirm `reserved` returns
to its previous value.

**Do not smoke-test with a real card or a real bKash payment.** Use the
gateways' sandbox credentials, and switch `SSLCOMMERZ_LIVE` / `BKASH_LIVE` on
only after the sandbox flow is confirmed end to end.

---

## Production checklist

- [x] Build succeeds (`npm run build`)
- [x] Environment inventory documented (above)
- [x] `.env.example` lists production-relevant keys
- [x] Security headers implemented (`next.config.ts`)
- [x] Health check endpoint implemented (`/api/health`)
- [x] Database preflight implemented (`npm run db:preflight`)
- [x] Rollback procedure written (above)
- [x] Post-deployment smoke tests written (above)
- [x] First-deploy runbook, Nginx/PM2 configs, deploy and backup scripts
      (`docs/DEPLOY_VPS_RUNBOOK.md`, `deploy/`) — rehearsed locally
- [x] A backup restored into a clean database with every row (local test)
- [ ] `ADMIN_LOGIN_SLUG` set on the host
- [ ] `SESSION_JWT_SECRET` set on the host
- [ ] `GATEWAY_SECRETS_KEY` / `STORAGE_SECRETS_KEY` / `COURIER_SECRETS_KEY` set for the features in use
- [ ] `TRUSTED_PROXY_HOPS` set to match the real proxy topology
- [ ] Stale-order scheduler installed and its first run reviewed
- [ ] Migrations verified against production Postgres
- [ ] Process manager / reverse proxy / HTTPS configured
- [ ] Backups scheduled, and a restore tested at least once
- [ ] `public/uploads` on persistent, backed-up storage
- [ ] Smoke tests passed against the live origin

## How to validate env docs

```bash
npm run test:env
```

## Deferred (explicit — no deploy yet)

- Choosing a cloud/VPS provider
- Provisioning managed PostgreSQL
- Pointing a real domain / TLS certificates
- Live payment credentials
