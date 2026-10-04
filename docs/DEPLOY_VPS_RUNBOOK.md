# Techno House — VPS deploy runbook

First deploy and routine releases on a single Linux VPS (Nginx + PM2 +
PostgreSQL). Companion to `docs/DEPLOYMENT.md`, which holds the policy,
environment inventory and the smoke-test list; this file is the step-by-step.

## What is verified, and what is not

Rehearsed on a fresh local database with the production build, in production
mode (`next start`), before this was written:

- all 78 migrations apply to an empty database;
- the bootstrap scripts below, the catalogue import, and `db:preflight`
  (11 invariants, 0 violations) on the result;
- the storefront, PC Builder (DDR4 board offers only DDR4 RAM), the admin panel
  and the alert bell, all served from the restored catalogue;
- `deploy/backup-db.sh` produces a dump that `pg_restore`s into a clean database
  with every row;
- `deploy/nginx-techno-house.conf` passes `nginx -t` (syntax only).

**Not verifiable without the real server:** `deploy.sh` end to end, PM2 start-up
on boot, TLS issuance, real-traffic behaviour, file permissions (`umask 077`
in the backup script), and anything involving live payments, e-mail or SMS.
Watch the first real run of each.

## You provide

- a VPS (Ubuntu 22.04/24.04 LTS, 2 GB RAM or more — the TypeScript step of the
  build alone used about 0.5 GB here, so leave headroom, and add swap if the
  build is killed — and 20 GB of disk), root/sudo SSH;
- a domain with an A record pointing at it;
- read access to the GitHub repo from the server (a deploy key or token);
- the catalogue bundle (below), copied from the development machine.

## 1. Server packages

```bash
sudo apt update && sudo apt install -y nginx postgresql git curl tar certbot
# Node 22 LTS (>= 20.9 is required). Use NodeSource or nvm, then:
sudo npm install -g pm2
```

```bash
sudo adduser --disabled-password --gecos "" techno
sudo mkdir -p /var/www/techno-house /var/log/techno-house /var/backups/techno-house /var/www/certbot
sudo chown -R techno:techno /var/www/techno-house /var/log/techno-house /var/backups/techno-house
```

## 2. Database

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE techno_house LOGIN PASSWORD 'CHANGE-ME-LONG-RANDOM';
CREATE DATABASE techno_house OWNER techno_house;
SQL
```

Keep PostgreSQL listening on localhost only.

## 3. Code and configuration

As the `techno` user:

```bash
git clone git@github.com:pitchforgebd/techno-house.git /var/www/techno-house/current
cd /var/www/techno-house/current
```

Create `/var/www/techno-house/current/.env.local` (gitignored, so checkouts
never touch it; `chmod 600`). Names only — generate every secret with
`openssl rand -base64 48`, and use a **different** value for each:

```
DATABASE_URL="postgresql://techno_house:PASSWORD@127.0.0.1:5432/techno_house?schema=public"
APP_URL="https://YOUR-DOMAIN"
SESSION_JWT_SECRET="..."
ADMIN_LOGIN_SLUG="..."          # 8-64 chars; must NOT be th-ops-local
GATEWAY_SECRETS_KEY="..."
STORAGE_SECRETS_KEY="..."
COURIER_SECRETS_KEY="..."
TRUSTED_PROXY_HOPS=1            # Nginx is the only proxy
STALE_ORDER_RELEASE_HOURS=24
```

Do **not** set `DATA_SOURCE` or `NODE_ENV` here (PM2 sets `NODE_ENV`). The app
refuses to start the admin if `ADMIN_LOGIN_SLUG` is still the published
development default — that guard was seen working during the rehearsal. The
staff sign-in address is `https://YOUR-DOMAIN/admin/access/<ADMIN_LOGIN_SLUG>`.
Optional integrations (SMTP, SMS, payment gateways, Meta, reCAPTCHA) are listed
in `.env.example`; payment credentials can also be entered later in admin.

## 4. The catalogue bundle (once, from the development machine)

```bash
npm run catalog:export
scp -r catalog-export techno@YOUR-SERVER:~/
```

It carries the product catalogue and nothing else: no staff, customers, orders
or settings; the demo seed's fictional products and brands are left out; stock
reservations are zeroed; `public/uploads` comes along as `uploads.tar.gz`.
(`catalog-export/` is gitignored — it is data, not source.)

## 5. First bring-up (this exact order was rehearsed)

```bash
cd /var/www/techno-house/current
npm ci
npm run db:migrate:deploy                     # never `db:migrate` in production
OWNER_EMAIL=you@example.com OWNER_NAME="Your Name" OWNER_PASSWORD='...' \
  npm run staff:bootstrap-owner               # roles, permissions, first admin
npm run shipping:bootstrap-districts
npm run shipping:bootstrap-methods
npm run pcbuilder:bootstrap-rules             # see the warning below
npm run catalog:import -- ~/catalog-export    # refuses a database that already has products
tar -xzf ~/catalog-export/uploads.tar.gz -C public/
npm run db:preflight                          # expect: PREFLIGHT PASSED
npm run build
pm2 start deploy/ecosystem.config.cjs && pm2 save
pm2 startup                                   # run the command it prints, as root
```

> **`pcbuilder:bootstrap-rules` is not optional.** The five compatibility rules
> were only ever created by `prisma/seed.ts`, which refuses to run in
> production. With no rows the storefront treats every check as disabled and the
> PC Builder shows every part — silently, with no error. Socket, RAM type, PSU
> wattage and form factor start enabled; storage interface starts off (turn it on
> in Admin → PC Builder → Compatibility rules once motherboards carry their
> drive-interface data).

Do **not** run `prisma db seed`, and skip the `catalog:bootstrap-*` scripts: the
bundle already contains the brands, categories, attributes, units and warranty
presets, and the import is the single source for them.

## 6. Nginx and TLS

```bash
sudo cp deploy/nginx-techno-house.conf /etc/nginx/sites-available/techno-house
sudo sed -i 's/example\.com/YOUR-DOMAIN/g' /etc/nginx/sites-available/techno-house
```

Get the certificate first (comment the `443` server block out for this run if
Nginx refuses to start without it), then enable the site:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d YOUR-DOMAIN -d www.YOUR-DOMAIN
sudo ln -s /etc/nginx/sites-available/techno-house /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Why Nginx serves `/uploads/` itself.** Confirmed in the rehearsal: `next start`
only serves files that existed when the app was *built*; a file written to
`public/uploads` afterwards returns 404. Everything staff upload later would
break, so Nginx answers `/uploads/` straight from `current/public/uploads` (git
ignores that directory's contents, so a release never touches it). It also adds
the `nosniff` and `Content-Security-Policy: sandbox` headers the app would add,
which stop an uploaded SVG from running script.

**Cloudflare.** If you put Cloudflare in front as well, `$remote_addr` becomes a
Cloudflare address and rate limiting would treat everyone as one client. Add
Nginx `real_ip` configuration for Cloudflare's ranges (`set_real_ip_from ...;
real_ip_header CF-Connecting-IP;`) and test it before relying on rate limits.
It is not included because it has to be checked against the live setup.

## 7. Scheduler and backups (`crontab -e` as `techno`)

```
0 * * * *  cd /var/www/techno-house/current && npm run orders:stale -- --apply >> /var/log/techno-house/sweep.log 2>&1
30 2 * * * cd /var/www/techno-house/current && ./deploy/backup-db.sh >> /var/log/techno-house/backup.log 2>&1
```

The first line is **required**: without it abandoned checkouts hold stock
forever (`docs/DEPLOYMENT.md`, "Cron / scheduler"). Before the first real run
look at what it would do: `npm run orders:stale:inspect`. Copy
`/var/backups/techno-house` off the server regularly — backups on the same disk
are not backups. Test a restore once:
`pg_restore --clean --if-exists --no-owner -d <db> db-<stamp>.dump`.

## 8. Smoke tests against the live origin

Run the list in `docs/DEPLOYMENT.md` ("Post-deployment smoke tests"), plus:

| Check | Expected |
| --- | --- |
| `PROBE_ENV=production APP_URL=https://YOUR-DOMAIN npm run test:headers` | 14 checks pass, HSTS present |
| Sign in at `/admin/access/<slug>`, open Admin → PC Builder → Compatibility data | Coverage cards render |
| Upload an image in Admin → Media, open its `/uploads/...` URL | 200 — proves the Nginx alias, not Next, is serving it |
| Open `/pc-builder`, pick a DDR4 motherboard, open RAM | Only DDR4 RAM is offered |

## 9. Routine release and rollback

```bash
cd /var/www/techno-house/current && ./deploy/deploy.sh          # origin/main
cd /var/www/techno-house/current && ./deploy/deploy.sh v1.2.0   # or a tag/commit
```

It backs up, checks out, installs, applies migrations, builds, reloads PM2, waits
for `/api/health` and runs `db:preflight`, stopping at the first failure and
printing the previous commit. Rollback = check out that commit, `npm ci`,
`npm run build`, `pm2 reload techno-house`. **Never roll a migration back**
(there are no down-migrations; every one so far is additive); restore the dump
only if the schema itself is the problem. The build rewrites `.next` in place, so
expect a short blip during step 5-6.

## 10. After go-live — set in the admin by the client

- Shipping methods and rates (confirm they are active and priced before taking
  an order), payment gateways in **sandbox** first, SMTP/SMS, store settings,
  logo, footer and banners.
- Staff accounts and roles (the bootstrap script made one owner and nothing
  else; there is no demo staff).
- PC Builder: Admin → PC Builder → Compatibility data. Fill the parts marked
  Missing (use "Auto-fill from product names" first). Staff guide:
  `docs/PC_BUILDER_STAFF_GUIDE.md`.

## Known notes

- `/admin/*` not-found pages return HTTP 200 (documented soft-404 in
  `docs/DEPLOYMENT.md`); rate-limit admin paths by request count, not status.
- The build prints a `middleware` → `proxy` deprecation notice; it is harmless
  today and is a tracked follow-up, not a deploy blocker.
- Product images that point at `images.unsplash.com` are allowed by the image
  config; anything else must be uploaded or the host added to `next.config.ts`.
