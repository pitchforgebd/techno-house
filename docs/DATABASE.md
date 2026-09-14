# Techno House — PostgreSQL Database

## Database

Production database:
PostgreSQL

ORM/data layer:
**Prisma 7.10.0** (pinned; see "ORM setup" below).

## Local development setup (P10-T01)

Target: **PostgreSQL 14+**. The development instance on this machine is the
PostgreSQL bundled with Laragon (`C:\laragon\bin\postgresql\...\bin`), listening
on `127.0.0.1:5432`.

Provision the role and database with the source-controlled bootstrap script.
It is idempotent, and the password is passed in so it is never committed:

```powershell
psql -h 127.0.0.1 -U postgres -v db_password='<choose-one>' -f scripts/db/setup-dev-database.sql
```

It creates:

| Object | Notes |
| --- | --- |
| Role `techno_house` | `LOGIN`, plus `CREATEDB` **for development only** so Prisma can manage its shadow database during `migrate dev` |
| Database `techno_house_dev` | Owned by `techno_house`; the role owns `public` and `PUBLIC` loses implicit `CREATE` |

Then copy `.env.example` to `.env.local` and set the connection string:

```text
DATABASE_URL="postgresql://techno_house:<password>@127.0.0.1:5432/techno_house_dev?schema=public"
```

`.env.local` is gitignored. `.env.example` holds placeholders only.

Verify the role can reach the database:

```powershell
psql -d "postgresql://techno_house:<password>@127.0.0.1:5432/techno_house_dev" -c "select current_database();"
```

Application code must never read `process.env.DATABASE_URL` directly — use
`getEnv()` from `lib/env.ts`, which validates the value on first use and throws
a clear error when it is missing or not a PostgreSQL URL. It is server-only; the
connection string carries a password and must not reach the browser bundle.

Production provisioning (managed instance, TLS, least-privilege role **without**
`CREATEDB`, backups) is Phase 18 and is not configured here.

## ORM setup (P10-T02)

Prisma is pinned to **7.10.0**, the newest stable release. The `latest` npm tag
currently points at `8.0.0-rc`, which is both a release candidate and requires
Node ≥ 22.18 (this machine runs 22.17). Revisit when v8 is stable.

| File | Role |
| --- | --- |
| `prisma/schema.prisma` | Datasource + generator. Models arrive in P10-T03 |
| `prisma.config.ts` | CLI config: schema path, migrations path, database URL |
| `lib/db/prisma.ts` | `PrismaClient` singleton used by the data layer |
| `lib/generated/prisma/` | Generated client — **gitignored**, rebuilt by `npm run db:generate` |

Scripts: `db:generate`, `db:validate`, `db:studio`, `db:check`. `postinstall`
runs `prisma generate` so a fresh clone has a client after `npm install`.

Three Prisma 7 behaviours shape this setup:

1. **No `url` in the schema.** The CLI reads the connection string from
   `prisma.config.ts`; the client connects through a driver adapter.
2. **Rust-free client.** PostgreSQL access goes through `@prisma/adapter-pg`,
   configured in `lib/db/prisma.ts`. There is no query engine binary.
3. **`.env` is not loaded automatically.** `prisma.config.ts` loads it with
   `dotenv`, reading `.env.local` first and then `.env`, which matches Next.js
   resolution and keeps one connection string for both the app and the CLI.

The config reads `process.env.DATABASE_URL` directly instead of the `env()`
helper from `prisma/config`, because that helper throws while the config is
merely being loaded — which would break `prisma generate` in any environment
without a database (CI, image builds). Strict validation for application code
lives in `lib/env.ts`.

Verify the whole path — env file, adapter, generated client, database:

```powershell
npm run db:check
# ok — connected to techno_house_dev (PostgreSQL 14.5)
```

Rules for application code:

- Call `getPrisma()` from `lib/db/prisma.ts`; never construct a `PrismaClient`.
  The client is created on first use, so importing the module costs nothing and
  does not require `DATABASE_URL`.
- Only `lib/data` repositories may import it. Components use repository
  interfaces, not the ORM (`docs/ARCHITECTURE.md`).
- The singleton is cached on `globalThis` outside production so dev hot reloads
  do not open a new connection pool per reload.

## Initial schema (P10-T03)

`prisma/schema.prisma` defines **59 models and 30 enums** covering every entity
listed below, plus the join and child records those entities need
(`RolePermission`, `ProductAttributeValue`, `WishlistItem`, `CompareListItem`,
`RefundReason`, `RefundEvent`, `PromotionProduct`, `FlashSaleItem`,
`CategoryDiscount`, `ShippingCountry/State/City`, `ShippingMethodZone`,
`ShippingCarrier`, `SupportMessage`, `B2BAccount`).

Modelling decisions:

- **Money** is an integer amount (`...Amount`) plus a `currency` column, matching
  the `Money` type in `lib/data/types/common.ts`. The server stays the authority
  for totals.
- **Order lines snapshot** product name, SKU, and unit price, and `Order` snapshots
  the contact and shipping address. Editing or deleting a product later must not
  rewrite historical orders, so those relations are `SetNull`, not `Cascade`.
- **Specifications** are `ProductAttribute` + `ProductAttributeValue`. The
  attribute's `groupLabel` builds the grouped spec table, `isFilterable` drives
  listing facets, and `isHighlight` selects the short chips on product cards —
  no separate spec-group tables.
- **`Product.stockStatus`** is denormalised from `ProductStock` so listings do not
  need a join; the domain layer keeps it in sync.
- **Payments** carry `@@unique([provider, transactionRef])` and a unique
  `idempotencyKey`, so a replayed webhook or retried request cannot create a
  second payment (`docs/PAYMENT_SECURITY.md`).
- **Deals and promotions** share one `Promotion` model separated by a `kind`
  enum, rather than two near-identical tables.
- **Nothing sensitive is stored**: no card data, no gateway secrets (environment
  variables only), no plaintext passwords (`passwordHash` only), and
  `AnalyticsConfiguration.publicId` holds only public measurement ids.
  `AuditLog.ipHash` is hashed, never a raw address. Auth rate-limit
  `bucketKey` values are hashed IP or email, never raw.

The schema has not been applied to any database — migrations are P10-T04. It is
verified with `prisma validate` and a `prisma migrate diff --from-empty` dry run,
which produces 60 tables, 30 enum types, 111 indexes, and 73 foreign keys.

## Migration strategy (P10-T04)

Migrations live in `prisma/migrations/` and are **source-controlled**, including
`migration_lock.toml`. The baseline is `20260904153949_init`, which creates 60
tables, 30 enum types, and 73 foreign keys.

### Commands

| Command | Use |
| --- | --- |
| `npm run db:migrate` | Development. Creates a migration from schema edits and applies it |
| `npm run db:migrate:deploy` | Staging/production and CI. Applies pending migrations only — never generates or resets |
| `npm run db:migrate:status` | Reports drift between the recorded migrations and the database |
| `npm run db:drift` | Diffs the live database against `schema.prisma`; exits 0 when they match, 2 when they do not |

### Workflow

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate -- --name short_description` (snake_case, e.g.
   `add_order_invoice_number`).
3. **Read the generated SQL** in `prisma/migrations/<timestamp>_<name>/migration.sql`
   before committing. Prisma's inference is a starting point, not a review.
4. Commit the schema change and its migration together in the same commit.
5. Run `npm run db:drift` to confirm the database matches the schema.

### Rules

- **Forward-only.** Never edit or delete a migration that has been applied
  anywhere but your own machine. Fix mistakes with a new migration.
- **Never run `prisma migrate reset` or `prisma db push` against a shared or
  production database.** `reset` drops every table; `db push` skips migration
  history entirely. Local development only, and only when losing the data is
  acceptable.
- Production deploys run `db:migrate:deploy` **after a verified backup** and
  before the new application version starts.
- Destructive steps (dropping a column or table, narrowing a type) are separated
  from the deploy that stops using them, so a rollback does not lose data.
- The dev role has `CREATEDB` so Prisma can manage its shadow database during
  `migrate dev`. Production roles must not have it — `migrate deploy` never
  needs a shadow database.

There is deliberately **no `db:reset` script**: a destructive reset should be
typed out in full, on purpose, not reachable by muscle memory.

## Seeding (P10-T05)

`prisma/seed.ts`, run with `npm run db:seed`. It is also registered as the
Prisma seed command, so `prisma migrate dev` runs it after a reset.

### Source of truth

The seed reads the **same mock modules the UI renders today** — `lib/data/mocks`,
`lib/cart/shipping`, and the `lib/admin` mocks — rather than restating the data.
One source means the database and the mock-backed pages cannot disagree, which
is what makes the P10-T06 repository swap verifiable: the same product ids,
slugs, prices, and specs come out of either backend.

### Scope

| Seeded | From |
| --- | --- |
| Categories, brands, products, images, attributes, attribute values, stock, warranties, related products | `lib/data/mocks/catalog` |
| Reviews and questions | `lib/data/mocks/review-repository` |
| Permissions, roles, role grants | `lib/admin/feature-permissions-mock` |
| Refund reasons | `lib/admin/refunds-admin-mock` |
| Shipping zones, areas, methods, method/zone rates | `lib/cart/shipping` |
| PC Builder compatibility rules | `lib/admin/pc-builder-admin-mock` |
| Store settings singleton | `lib/admin/settings-mock` |

Deliberately **not** seeded: customers, staff logins, orders, payments, and
carts. Those depend on real authentication (Phase 11), and fake credentials or
fake financial records are worse than an empty table.

Values the mocks do not carry are derived rather than invented: warranty months
are parsed from the label (`"2 year warranty"` → `24`), and stock quantities
come from the status the storefront already shows (in stock 25, low stock 4,
out of stock 0).

### Idempotency

Every write is an upsert keyed on a natural unique column — slug, sku, code, or
key — so re-running updates instead of duplicating. Row counts are identical
after the second run. Product images are replaced wholesale per owner. Role
permission grants are seeded only when a role has none; the Admin system role
also receives newly added catalogue keys and does not undo local revocations.
Reviews and questions reuse their mock ids as primary keys, which is what
makes them upsertable.

Ordering matters in three places: categories are written in two passes so a
parent exists before a child points at it, products resolve brand/category/
warranty first, and related products are linked in a final pass once every
product row exists.

### Safety

The script refuses to run when `NODE_ENV=production`. This is demo catalogue
data; it must never reach a real store. It is additive and never deletes a
table, but it will overwrite edits made through the admin UI to any record it
owns.

### Verifying

The run prints row counts. A healthy local seed reports 35 categories, 10
brands, 25 products, 52 spec chips, 26 spec groups, 61 spec rows, 14
attributes, 188 permissions, 3 roles, 1 demo customer, and 1 demo staff.

### Demo customer (P11-T01)

Local development only — never use these credentials in production:

| Field | Value |
| --- | --- |
| Email | `customer@techno-house.demo` |
| Password | `Demo-Customer-Only-11!` |

The password is hashed with Argon2id before insert. Re-seeding rotates the hash
to match this password.

### Demo staff (P11-T02)

| Field | Value |
| --- | --- |
| Email | `ops@techno-house.demo` |
| Password | `Demo-Staff-Only-11!` |
| Role | Admin (`role-admin`) |

## Customer authentication (P11-T01)

Customer accounts live in `User`. Sessions are opaque tokens in
`CustomerSession` (SHA-256 of the cookie value). Cookie name:
`th_customer_session` (httpOnly, SameSite=Lax, Secure in production, path `/`).

| Concern | Location |
| --- | --- |
| Password hashing | `lib/auth/password.ts` (`@node-rs/argon2`) |
| Session cookie helpers | `lib/auth/customer-session-cookie.ts` |
| Session resolve / create / revoke | `lib/auth/customer-session.ts` |
| Register / login / profile | `lib/auth/customer-auth.ts` |
| Server actions | `features/account/auth-actions.ts` |
| Route gate | `middleware.ts` (cookie presence + token shape on `/account/*`) |

Failed login returns a generic error and still spends Argon2 time against a
dummy hash so missing emails are not revealed by timing alone.

## Persistent cart (P13-T01)

Storefront carts persist to `Cart` / `CartItem` when `DATA_SOURCE` is not
`mock`. No new tables. Lines are product-level (`variantId` null). Coupon
codes stay as strings. Shipping method/area mock codes map to seeded
`ShippingMethod.code` and `ShippingArea` name/zone FKs. Payment method is not
on `Cart` and stays device-local.

Guest carts use an opaque `th_guest_cart` cookie (httpOnly, SameSite=Lax,
Secure in production, path `/`). `Cart.sessionToken` stores the SHA-256 of
that token, never the raw value. Signed-in carts are keyed by `userId`.
Login and register merge the guest cart into the user cart (sum qty, clamp
1–10, cap 24 lines), then clear the guest cookie. Logout leaves the user cart
in the database.

Server validation: product exists and `isActive`, out-of-stock cannot be
added, quantity 1–10, max 24 lines, same-origin. Totals remain display-only.

| Concern | Location |
| --- | --- |
| Cookie helpers | `lib/cart/guest-cart-cookie.ts` |
| Persist / merge | `lib/cart/persist.ts` |
| Server actions | `features/cart/cart-actions.ts` |
| Storefront hydrate | `features/cart/cart-provider.tsx` |

`DATA_SOURCE=mock` keeps the previous localStorage cart.

## Order creation (P13-T02)

Signed-in checkout writes `Order` / `OrderItem` from the persisted user cart.
No new tables. The server recalculates subtotal, coupon discount,
shipping, tax (0), and total from current product prices and cart contents.
Client-posted totals are ignored.

Stock is reserved (`ProductStock.reserved`) inside the same transaction, then
`Product.stockStatus` is denormalised. The cart is cleared after a successful
place. A `Payment` row is created as `PENDING` through the payment
abstraction (`cod`, `sslcommerz`, or `bkash`). Hosted providers start a
gateway session after the order exists when credentials are present.
Nothing is marked paid from checkout or browser return URLs.

Guest checkout is not available. `DATA_SOURCE=mock` keeps the previous
device-local mock order.

| Concern | Location |
| --- | --- |
| Place order | `lib/orders/create-order.ts` |
| Customer reads | `lib/orders/customer-orders.ts` |
| Server action | `features/checkout/checkout-actions.ts` |

## Payment abstraction (P13-T03)

Order code talks to `lib/payments` only — not to a gateway client. Adapters
are `cod` (offline, stays pending) and hosted SSLCommerz / bKash clients.
Status changes go through `applyPaymentTransition` with a strict state
machine. Moving to `PAID` requires a transaction reference plus matching
amount and currency. There is no storefront action that can mark a payment
paid. Refund states are rejected here and wait for P13-T06.

| Concern | Location |
| --- | --- |
| Status machine | `lib/payments/status.ts` |
| Adapters | `lib/payments/adapters.ts` |
| Apply / start helpers | `lib/payments/service.ts` |

## Gateway integration (P13-T04)

Optional SSLCommerz and bKash credentials live in environment variables and
are **not** required by `getEnv()`. Missing keys or `APP_URL` keep those
methods deferred so local checkout still works. When configured, a hosted
session starts **after** the order and pending payment row exist. A
successful start may move the payment to `PROCESSING` and return an
allow-listed `https` checkout URL. Browser success/fail/cancel pages do not
mark a payment paid. Verified IPN/execute is T05.

| Concern | Location |
| --- | --- |
| Optional config | `lib/payments/config.ts` |
| SSLCommerz session | `lib/payments/sslcommerz.ts` |
| bKash session | `lib/payments/bkash.ts` |
| Redirect allow-list | `lib/payments/redirect.ts` |
| Browser return page | `app/(storefront)/checkout/payment/return/page.tsx` |

## Webhook verification (P13-T05)

`PAID` is applied only after the server confirms the event with the
gateway. SSLCommerz IPN calls the validation API (`val_id` + store
credentials) and uses that response — not the raw POST — for amount,
currency, `tran_id`, and the transaction reference. An optional
`verify_sign` hash is checked when present. bKash `status=success` is
not enough: the server execute (or status query) must return
`Completed`. Replays with the same reference stay paid; a different
reference on an already-paid row is rejected. Missing credentials
acknowledge the callback and leave the payment unpaid. Refunds are T06.

| Concern | Location |
| --- | --- |
| Confirm / reject helpers | `lib/payments/confirm.ts` |
| SSLCommerz IPN + validation | `lib/payments/sslcommerz.ts` |
| bKash execute / query | `lib/payments/bkash.ts` |
| IPN route | `app/api/payments/sslcommerz/ipn/route.ts` |
| bKash callback | `app/api/payments/bkash/callback/route.ts` |

## Refund workflow (P13-T06)

Reuse `Refund` / `RefundEvent` / `RefundReason`. No new refund tables.
`Payment.sessionRef` keeps the hosted session id after `PAID` so a bKash
refund can still send `paymentID`. `Refund.payoutRef` is unique so a
retried complete cannot pay out twice.

A customer may request on their own paid order, one open refund at a
time, amount 1…remaining. Staff with `refunds.process` approve or
reject, then “Refund now” pays out: COD is offline; SSLCommerz / bKash
call the gateway. The payment becomes `PARTIALLY_REFUNDED` or
`REFUNDED`. `applyPaymentTransition` still rejects those statuses.
`DATA_SOURCE=mock` keeps the previous mock admin list. Settings /
reasons / category refund pages stay mock.

| Concern | Location |
| --- | --- |
| Workflow | `lib/refunds/workflow.ts` |
| Refund state machine | `lib/refunds/status.ts` |
| Admin list | `lib/admin/load-refunds.ts` |
| Staff actions | `features/admin/refunds/refund-actions.ts` |
| Customer request | `features/account/refund-actions.ts` |
| Security suite | `scripts/payments/check-security.ts` (`npm run test:payments`) |

## Staff authentication (P11-T02)

Staff accounts live in `Staff`. Sessions are opaque tokens in `StaffSession`.
Cookie name: `th_staff_session` (httpOnly, SameSite=Lax, Secure in production,
**path `/admin`**). A customer session cookie cannot open admin, and a staff
cookie is not sent on storefront requests.

There is no self-serve staff registration.

| Concern | Location |
| --- | --- |
| Session cookie helpers | `lib/auth/staff-session-cookie.ts` |
| Session resolve / create / revoke | `lib/auth/staff-session.ts` |
| Login / logout | `lib/auth/staff-auth.ts` |
| Server actions | `features/admin/auth-actions.ts` |
| Route gate | `middleware.ts` (cookie presence + token shape on `/admin/*` except login) |

## Roles and permissions (P11-T04)

Staff sessions include the permission keys granted to their role
(`RolePermission` → `Permission.key`). The admin panel layout denies paths
the role cannot view (`lib/auth/admin-route-permissions.ts`). Sidebar items
are filtered the same way; that is convenience only.

Role list and the permission matrix read and write PostgreSQL. Saving a role
requires `roles.manage` plus the same-origin check. The staff directory form
is still mock (staff CRUD is not this task).

Unmapped admin paths are denied, including for Admin — add a route rule when
adding a page. `/admin/profile` and `/admin/forbidden` are open to any signed-in
staff.

| Concern | Location |
| --- | --- |
| Pure hasPermission helpers | `lib/auth/permission-check.ts` |
| Mutation guard | `lib/auth/permissions.ts` (`staffWithPermission`) |
| Path → view permission | `lib/auth/admin-route-permissions.ts` |
| Role list / save | `lib/auth/staff-roles.ts` |
| Role server action | `features/admin/staff/role-actions.ts` |

## Audit log (P11-T05)

`AuditLog` is append-only. Writes go through `writeAuditLog` in
`lib/auth/audit-log.ts`. Passwords, tokens, cookies, and secrets are stripped
from metadata; IP is stored as `ipHash` only. A failed write is logged to the
server console and does not roll back the action.

Covered now: staff sign-in, failed sign-in, blocked sign-in, sign-out, role
create, role update (grant add/remove keys, not the full catalogue), category
create/update/delete, brand create/update/delete, attribute create/update/delete. Other mock admin saves are
not audited until they become real mutations. Failed sign-in stores
`emailHash`, not the address.

The viewer is `/admin/staff/audit` (`audit.view`). Migration
`20260905001500_audit_view_permission` adds that permission and grants it to
the Admin system role.

## Auth rate limits (P11-T06)

`AuthRateLimit` is a rolling counter, not an audit trail. One row per
`bucketKey` (hashed IP or email). Helpers live in `lib/auth/rate-limit.ts`.
Windows that start more than 24 hours ago are pruned best-effort on consume.

| Bucket | Limit | Window |
| --- | --- | --- |
| customer.login.ip | 10 | 15 min |
| customer.login.email | 5 | 15 min |
| staff.login.ip | 8 | 15 min |
| staff.login.email | 5 | 15 min |
| customer.register.ip | 5 | 60 min |
| customer.forgot.ip | 5 | 15 min |

Migration `20260905003000_auth_rate_limit` creates the table.

## Category admin (P12-T01)

Storefront `categoryRepository.list()` / `getBySlug()` still return **active**
rows only. Admin list/edit reads every `Category` row (including hidden) via
`lib/catalog/admin-categories.ts`. Writes persist `name`, `slug`, `parentId`,
`position`, `filterKeys`, `description`, and `isActive`.

Delete is refused when the category still has products or child categories.
Create/edit/delete require `category.add` / `category.edit` / `category.delete`
and the same-origin check. Banner/icon/cover file fields and Featured/Hot
toggles are still UI-only.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/category-input.ts` |
| Persist / list-all | `lib/catalog/admin-categories.ts` |
| Server actions | `features/admin/categories/category-actions.ts` |

## Brand admin (P12-T02)

Storefront `brandRepository.list()` / `getBySlug()` still return **active**
rows only, ordered by `position`. Admin list/edit reads every `Brand` row via
`lib/catalog/admin-brands.ts`. Writes persist `name`, `slug`, `position`,
`description`, and `isActive`. Existing `logoSrc` is left unchanged (uploads
wait on the media manager).

Delete is refused when the brand still has products. Create/edit/delete
require `brand.add` / `brand.edit` / `brand.delete` and the same-origin check.

Migration `20260905004500_brand_position_description` adds `description` and
`position`, and backfills position from existing `createdAt` order.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/brand-input.ts` |
| Persist / list-all | `lib/catalog/admin-brands.ts` |
| Server actions | `features/admin/brands/brand-actions.ts` |

## Attribute admin (P12-T03)

`ProductAttribute` is the filter-key definition. `allowedValues` is the admin
catalogue of suggested values; storefront facets still read
`ProductAttributeValue` rows on products. Admin create/edit persist `label`,
`key`, `allowedValues`, `isFilterable`, and `position`.

Delete is refused while any product still has a value for that attribute.
Create/edit/delete require `attribute.add` / `attribute.edit` /
`attribute.delete` and the same-origin check. `attribute_values.manage` is
unused until a dedicated values screen exists.

Migration `20260905010000_attribute_allowed_values` adds `allowedValues` and
backfills distinct product values.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/attribute-input.ts` |
| Persist / list-all | `lib/catalog/admin-attributes.ts` |
| Server actions | `features/admin/attributes/attribute-actions.ts` |

## Product admin (P12-T04)

Storefront `productRepository` still returns **active** rows only, ordered by
`position` for `featured`. Admin list/edit reads every `Product` row
(including unpublished) via `lib/catalog/admin-products.ts`. Writes persist
name, slug, SKU, brand, category, price, compare-at, overview, stock status,
`isNew` / `isSale` / `isActive`, `publishedAt`, warranty, `position`,
PC Builder slot / attributes (P14-T01), and `ProductVariant` rows.

Delete is refused when the product is on an order, saved PC build, flash sale,
or promotion. Image uploads and SEO tags are not stored here. New products get
a placeholder image.

Migration `20260905011500_product_position` adds `position` and backfills from
existing `createdAt` order.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/product-input.ts` |
| Persist / list-all | `lib/catalog/admin-products.ts` |
| Server actions | `features/admin/products/product-actions.ts` |

## PC Builder component data (P14-T01)

Builder parts are ordinary products. `Product.builderSlot` plus
`builderSocket` / `builderRamType` / `builderFormFactor` / `builderTdpWatts`
are the component record. No extra table. Storefront reads active rows only,
one slot at a time (`listByBuilderSlot`, cap 48). Selected build parts load
the same attributes in one `listBuilderCandidatesBySlugs` query. Shop
listings do not select those columns.

Admin product save writes the slot and attributes after server validation.
Clearing the slot nulls the attributes. `DATA_SOURCE=mock` keeps the
in-memory catalogue. Keyboard / mouse / accessory slots are not in the
enum.

| Concern | Location |
| --- | --- |
| Candidate type | `lib/data/types/catalog.ts` (`BuilderCandidate`) |
| Repository | `listByBuilderSlot` / `listBuilderCandidatesBySlugs` |
| Domain mapping | `lib/domain/pc-builder/components.ts` |
| Admin input | `lib/catalog/product-input.ts` |

## PC Builder compatibility rules (P14-T02)

`PCCompatibilityRule` is the rule catalogue (key, type, label, description,
`isEnabled`). Seed copies `MOCK_PC_BUILDER_RULES` and does not reset
`isEnabled` on later runs. Admin `/admin/pc-builder/rules` lists the rows.
Toggles require `pc_builder.rules` and same-origin. `DATA_SOURCE=mock`
returns the in-memory list and refuses writes.

The storefront reads enabled types and skips disabled checks. The engine
(`lib/domain/pc-builder/compatibility.ts`) has one evaluator per type,
including storage interface. That attribute is not a database column yet,
so seeded drives/boards yield `unknown` if the rule is enabled. Staff
cannot add new types.

| Concern | Location |
| --- | --- |
| Domain types | `lib/domain/pc-builder/rules.ts` |
| List / toggle | `lib/pc-builder/rules.ts` |
| Server actions | `features/admin/pc-builder/rule-actions.ts` |

## PC Builder saved builds (P14-T04)

`PCBuild` / `PCBuildItem` store a signed-in customer's named selection.
Status is `SAVED`. Each item is one slot plus an active product. The
server resolves slugs and rejects a part whose `builderSlot` does not
match. A user may keep 12 SAVED builds; older SAVED rows are deleted.
List and delete are scoped to `userId`. Save/delete require same-origin.

Guests and `DATA_SOURCE=mock` use the existing localStorage key. Device
builds are not merged on login. Admin featured-build pages stay mock.

| Concern | Location |
| --- | --- |
| Persist / list / delete | `lib/pc-builder/saved-builds.ts` |
| Server actions | `features/pc-builder/build-actions.ts` |
| Device fallback | `features/pc-builder/use-saved-builds.ts` |

## PC Builder shareable builds (P14-T05)

`PCBuild.shareSlug` is an opaque public token (`thb_` + 43-char
base64url). Sharing the current selection creates a `SHARED` row.
Sharing a saved build sets `shareSlug` on that `SAVED` row if missing.
SHARED extras prune separately (cap 12). Public lookup by slug returns
name and slot→product slugs only — never `userId` or other owner data.

Guests and `DATA_SOURCE=mock` keep client-encoded slug maps
(`encodeShareId`). The share page tries a persisted slug first, then
the guest decoder. Share create/update require same-origin.

| Concern | Location |
| --- | --- |
| Mint / resolve | `lib/pc-builder/share.ts` |
| Guest encode / decode | `lib/domain/pc-builder/share.ts` |
| Public page | `app/(storefront)/pc-builder/share/[id]/page.tsx` |

## PC Builder server validation (P14-T06)

`validateBuild` loads active candidates by slug and the enabled rule
types, then `assembleValidatedBuild` prices, stocks, and runs the
engine. Missing or wrong-slot parts become issues. The client sends
slugs only. No new tables.

| Concern | Location |
| --- | --- |
| Pure snapshot | `lib/domain/pc-builder/validate.ts` |
| Load + evaluate | `lib/pc-builder/validate-build.ts` |
| Storefront action | `features/pc-builder/actions.ts` |

## PC Builder build-to-cart (P14-T07)

`addBuildToCart` revalidates the live build, then
`planValidatedBuildToCart` gates the write. A successful plan writes
qty 1 per unique slug through `addCartItems` onto the existing
`Cart` / `CartItem` rows. No new tables. Guests and `DATA_SOURCE=mock`
keep the device cart after the server plan. Same-origin is required.
Checkout still recalculates prices.

| Concern | Location |
| --- | --- |
| Plan + issues | `lib/domain/pc-builder/build-to-cart.ts` |
| Revalidate + write | `lib/pc-builder/add-to-cart.ts` |
| Server action | `features/pc-builder/build-actions.ts` |

## Promotion campaigns (P15-T01)

`Promotion` rows with `kind = PROMOTION` are the campaign catalogue
(name, slug, channel, status, summary, priority, optional dates).
Seed upserts `MOCK_ADMIN_PROMOTIONS` by slug. Re-seed updates name,
channel, summary, and priority only — staff status and dates stay.
The storefront `/offers` page lists `ACTIVE` campaigns whose date
window includes now. There is no discount amount on this table;
flash sales and deals stay mock until later tasks.

Writes need `promotion.manage` and same-origin. `DATA_SOURCE=mock`
refuses writes.

| Concern | Location |
| --- | --- |
| Persist | `lib/marketing/promotions.ts` |
| Server action | `features/admin/promotions/promotion-actions.ts` |
| Seed | `prisma/seed.ts` |

## Flash sales and today's deal (P15-T02)

`FlashSale` is the flash-deal catalogue (title, slug, status, featured,
required start/end). Seed upserts `MOCK_FLASH_DEALS` by slug (`flash-*`
ids). Re-seed updates title only — staff status, featured, and dates
stay. Storefront `/flash-sale` lists `ACTIVE` rows in the current
window. `FlashSaleItem` and checkout markdowns stay deferred.

Today's deal uses existing `Product.isSale` (the same flag as the
product form and homepage Best deals rail). `/deals` lists `onSaleOnly`
products. `Promotion.kind = DEAL` is unused.

Writes need `flash_deals.manage` and same-origin. `DATA_SOURCE=mock`
refuses writes.

| Concern | Location |
| --- | --- |
| Flash persist | `lib/marketing/flash-sales.ts` |
| Flash dates | `lib/marketing/flash-sale-dates.ts` |
| Deal persist | `lib/marketing/deals.ts` |
| Server actions | `features/admin/flash-sales/flash-sale-actions.ts`, `features/admin/deals/deal-actions.ts` |
| Seed | `prisma/seed.ts` |

## Coupons (P15-T03)

`Coupon` is the promo-code catalogue (code, kind, value, label, min
spend, usage limit/count, `isActive`, optional dates). Seed upserts
`MOCK_ADMIN_COUPONS` by code. Re-seed updates kind, value, label, min
spend, and usage limit only — staff status, dates, and usage stay.
Admin status is derived: disabled when `isActive` is false, otherwise
scheduled / expired / active from the date window.

Cart apply and order place look up a redeemable code (active, in
window, under the usage cap, min spend met). A successful order sets
`Order.couponId` / `couponCode` and increments `usageCount` in the
same transaction. `DATA_SOURCE=mock` keeps `lib/cart/coupons`.

Writes need `coupons.add` / `coupons.edit` and same-origin.

| Concern | Location |
| --- | --- |
| Persist + redeem | `lib/marketing/coupons.ts` |
| Discount math | `lib/cart/coupons.ts` |
| Server action | `features/admin/coupons/coupon-actions.ts` |
| Seed | `prisma/seed.ts` |

## Blog and newsletter (P15-T04)

`BlogCategory` and `BlogPost` are the editorial catalogue. Seed upserts
`MOCK_BLOG_CATEGORIES` by slug and `MOCK_BLOG_POSTS` by slug, including
original excerpt/body. Re-seed updates category name and post
title/excerpt/body/category only — staff status, `isActive`, and
`publishedAt` stay. The storefront `/blog` and `/blog/[slug]` return
`PUBLISHED` title/excerpt/body only.

`NewsletterSubscriber` is the opt-in list. Seed upserts email rows from
`MOCK_SUBSCRIBERS` (SMS numbers are skipped). Re-seed keeps status.
`/admin/newsletter` and `/admin/marketing/subscribers` list the same
rows. Footer signup upserts `SUBSCRIBED`. Campaign issues
(`MOCK_NEWSLETTERS`) are not persisted — there is no campaign table.
SMTP send waits for Phase 16.

Writes need same-origin. Post/category writes need `blog.add` /
`blog.edit`. Subscriber status needs `newsletter.manage` or
`subscribers.manage`. Public subscribe is unauthenticated.

| Concern | Location |
| --- | --- |
| Blog persist | `lib/content/blog.ts` |
| Newsletter persist | `lib/content/newsletter.ts` |
| Server actions | `features/admin/blog/blog-actions.ts`, `features/newsletter/newsletter-actions.ts` |
| Seed | `prisma/seed.ts` |

## Notifications (P15-T05)

`Notification` is the in-app inbox (user, channel, type, title, body,
href, readAt, sentAt). Seed upserts a welcome row for the demo
customer (`ntf-welcome-demo`). Re-seed updates title/body/href only —
`readAt` stays. `/account/notifications` lists `IN_APP` rows for the
signed-in customer. Mark read sets `readAt`.

Admin custom send creates one `IN_APP` row per matching ACTIVE
customer (`promo` / `info` / `alert`). History lists those custom
types only. Types catalogue and channel settings stay mock — no
tables. Email/SMS/push delivery waits for Phase 16.

Writes need same-origin. Customer mark-read needs a session. Admin
send/delete need `notifications.manage`. Links must be same-site
paths starting with `/`.

| Concern | Location |
| --- | --- |
| Persist | `lib/notifications/inbox.ts` |
| Server actions | `features/account/notification-actions.ts`, `features/admin/notifications/notification-actions.ts` |
| Seed | `prisma/seed.ts` |

## GA4 and GTM (P15-T06)

`AnalyticsConfiguration` stores public measurement ids only (`publicId`)
plus `isEnabled`. Seed upserts disabled `GA4` and `GTM` rows and does
not reset staff ids or enable flags. GA4 `notes` holds an optional
numeric property id. Service-account JSON and API tokens stay out of
the database.

The storefront injects official gtag / GTM snippets when a row is
enabled and the id matches `G-…` or `GTM-…`. If GTM is enabled, GA4
is not also injected (avoid double-firing). Raw script paste is not
persisted.

Writes need same-origin and `ga4.manage` / `gtm.manage`.

| Concern | Location |
| --- | --- |
| Persist | `lib/analytics/config.ts` |
| Id checks | `lib/analytics/ids.ts` |
| Server actions | `features/admin/analytics/analytics-actions.ts` |
| Storefront tags | `components/analytics/storefront-analytics.tsx` |
| Seed | `prisma/seed.ts` |

## Meta Pixel and Merchant Center (P15-T07)

`META_PIXEL` and `MERCHANT_CENTER` rows use the same
`AnalyticsConfiguration` table. Seed upserts them disabled and does
not reset staff ids, enable flags, or notes. Pixel / merchant
`publicId` is digits only. Optional Facebook catalog ID lives in
`META_PIXEL.notes`. CAPI and Graph access tokens stay out of the
database.

The storefront injects the official Meta Pixel snippet when enabled
and the id is valid. If GTM is enabled, standalone GA4 and Meta Pixel
are not also injected. `/feeds/google.xml` publishes when Merchant
Center is enabled. `/feeds/facebook.xml` publishes when Meta Pixel is
enabled. Both feeds list active products (display fields only) and
return 404 when the matching row is off or `DATA_SOURCE=mock`.

Writes need same-origin and `meta.manage` / `merchant.manage`.

| Concern | Location |
| --- | --- |
| Persist | `lib/analytics/config.ts` |
| Id checks | `lib/analytics/ids.ts` |
| Server actions | `features/admin/analytics/analytics-actions.ts` |
| Storefront tags | `components/analytics/storefront-analytics.tsx` |
| Catalog feeds | `lib/analytics/feeds.ts` |
| Seed | `prisma/seed.ts` |

## Global SEO and sitemap (P15-T08)

One `SEOConfiguration` row with `path = null` holds site-wide title,
description, and keywords. Seed creates that row if missing and does
not reset staff copy. Per-path SEO rows and `ogImageMediaId` stay
unused. Custom scripts are not persisted (XSS).

The storefront default metadata reads that row (fallback title /
description when empty). `/sitemap.xml` lists public pages, active
categories/brands/products, and published posts. `/robots.txt`
disallows `/admin/`, `/account/`, `/dev/`, `/checkout/`, `/cart`,
`/wishlist`, `/compare`, and `/search`.
`DATA_SOURCE=mock` refuses SEO writes and keeps sitemap static paths
only.

Phase 17 SEO audit (P17-T06): `docs/SEO_AUDIT_P17.md`. Baseline:
`npm run test:seo`.

Writes need same-origin and `seo.manage`. Sitemap cache refresh needs
`sitemap.manage`.

| Concern | Location |
| --- | --- |
| Persist | `lib/seo/config.ts` |
| Field checks | `lib/seo/fields.ts` |
| Sitemap URLs | `lib/seo/sitemap.ts` |
| Server actions | `features/admin/analytics/seo-actions.ts` |
| Routes | `app/sitemap.ts`, `app/robots.ts` |
| Seed | `prisma/seed.ts` |

## Shipping methods (P16-T01)

`ShippingMethod` is the source of truth for delivery options and
base rates. Seed upserts `dhaka_home`, `nationwide_courier`, and
`store_pickup` and does not reset staff name, rate, pickup, or
enable flags. Zone / area rows stay seed-only until P16-T02.
Pathao / Steadfast tokens are not stored.

Cart and checkout list active methods. Order place resolves the rate
from those rows. Writes need same-origin and `shipping_method.manage`.

| Concern | Location |
| --- | --- |
| Persist | `lib/shipping/methods.ts` |
| Server rate | `lib/shipping/resolve.ts` |
| Server actions | `features/admin/shipping/shipping-actions.ts` |
| Seed | `prisma/seed.ts` |

## Shipping zones and areas (P16-T02)

`ShippingZone` and `ShippingArea` drive cart delivery choices.
Seed upserts mock zones/areas and does not reset staff name or
enable flags. Public area ids are `${zoneCode}::${name}`. Countries,
states, cities, and carriers stay mock. Cart and checkout list only
active zones and areas. Order place resolves rates against those
rows. Writes need same-origin and `zones.manage` / `areas.manage`.

| Concern | Location |
| --- | --- |
| Persist | `lib/shipping/locations.ts` |
| Server rate | `lib/shipping/resolve.ts` |
| Server actions | `features/admin/shipping/shipping-actions.ts` |
| Seed | `prisma/seed.ts` |

## OTP / SMS gateway settings (P16-T03)

`OtpSmsConfiguration` is a singleton for non-secret SMS gateway
settings: provider, sender id, OTP length, expiry minutes, and
login/registration feature flags. Seed upserts `local-mock` with both
flags off and does not reset staff edits. API keys and secrets are
environment-only (see `.env.example`); they are never stored in the
database. Real SMS send and OTP verify endpoints stay deferred — flags
store intent only. Test SMS in admin stays a no-op toast.

Writes need same-origin and `otp.manage`. `DATA_SOURCE=mock` refuses
writes.

| Concern | Location |
| --- | --- |
| Persist | `lib/otp/config.ts` |
| Field checks | `lib/otp/fields.ts` |
| Server actions | `features/admin/otp/otp-actions.ts` |
| Seed | `prisma/seed.ts` |

## SMTP settings (P16-T04)

`SmtpConfiguration` is a singleton for non-secret outbound mail
settings: mailer type, host, port, username, encryption, from address,
and from name. Seed upserts `smtp` / port `587` / `tls` with empty
host and from fields, and does not reset staff edits. The SMTP password
is environment-only (`SMTP_PASSWORD` in `.env.example`); it is never
stored in the database. Real mail send stays deferred — test email in
admin is a no-op toast.

Writes need same-origin and `smtp.manage`. `DATA_SOURCE=mock` refuses
writes.

| Concern | Location |
| --- | --- |
| Persist | `lib/smtp/config.ts` |
| Field checks | `lib/smtp/fields.ts` |
| Server actions | `features/admin/settings/smtp-actions.ts` |
| Seed | `prisma/seed.ts` |

## Social integrations (P16-T05)

`SocialLoginConfiguration` rows (GOOGLE / FACEBOOK / TWITTER / APPLE)
store enable flags and public client / app ids. Seed upserts them
disabled and does not reset staff edits. Client secrets stay in env
(`.env.example`). Live OAuth is deferred.

`RecaptchaConfiguration` singleton stores enable, public site key, V3
score threshold, and applicable-page flags. Secret key is env-only.
Widget / verify wiring is deferred.

`FirebaseConfiguration` singleton stores the enable flag only. Project
credentials stay in env. Push / analytics wiring is deferred.

Google Map settings stay deferred to P16-T06. Footer profile URLs stay
pending (no invented URLs).

Writes need same-origin and `social_logins.manage` /
`google_recaptcha.manage` / `firebase.manage`. `DATA_SOURCE=mock`
refuses writes.

| Concern | Location |
| --- | --- |
| Social logins | `lib/social/login-config.ts` |
| reCAPTCHA | `lib/social/recaptcha-config.ts` |
| Firebase | `lib/social/firebase-config.ts` |
| Server actions | `features/admin/settings/social-actions.ts` |
| Seed | `prisma/seed.ts` |

## Maps, chat, and comments (P16-T06)

`GoogleMapConfiguration` singleton stores the enable flag only. The
Maps API key is environment-only (`GOOGLE_MAPS_API_KEY`). Maps JS /
Places wiring is deferred.

`ChatWidgetConfiguration` rows (WHATSAPP / MESSENGER) store enable and
a public handle (phone or page id). Raw chat scripts are never stored.
Floating chat UI is deferred.

`CommentSystemConfiguration` singleton stores enable, provider, and
public app id. Plugin embed wiring is deferred. Product Q&A / reviews
remain on existing tables.

Seed upserts disabled defaults and does not reset staff edits. Writes
need same-origin and `google_map.manage` / `chat_widgets.manage` /
`comment_system.manage`. `DATA_SOURCE=mock` refuses writes.

| Concern | Location |
| --- | --- |
| Google Map | `lib/maps/config.ts` |
| Chat widgets | `lib/chat/config.ts` |
| Comments | `lib/comments/config.ts` |
| Server actions | `features/admin/settings/maps-chat-actions.ts` |
| Seed | `prisma/seed.ts` |

## Business settings (P16-T07)

`SiteSettings` singleton stores store name, legal name, support email,
phone, address, city, timezone, and tax / BIN id. Currency stays BDT
(not edited on this form). Seed creates defaults on first run and does
not reset staff edits on re-seed. Admin `/admin/settings/general`
persists those fields. Order / tax / pickup / invoice / tracking /
shipping-label / thermal-printer hub cards stay mock. Feature flags,
languages, and currency pages stay mock / read-only as before.

Writes need same-origin and `business.manage`. `DATA_SOURCE=mock`
refuses writes.

| Concern | Location |
| --- | --- |
| Persist | `lib/business/config.ts` |
| Field checks | `lib/business/fields.ts` |
| Server actions | `features/admin/settings/business-actions.ts` |
| Seed | `prisma/seed.ts` |

## Inventory (P12-T05)

`ProductStock.quantity` is the source of truth. Available units are
`quantity - reserved`. `Product.stockStatus` is denormalised from that
(`out_of_stock` when available is 0, `low_stock` when available is at or
below `lowStockThreshold`, otherwise `in_stock`). Quantity cannot be set
below reserved units (held for pending orders in Phase 13).

Admin product save upserts product-level stock and optional variant stock.
The product list “View stock” drawer can update quantity and threshold
without opening the full form. The product-wise stock report reads available
units. `reserved` is not edited in admin.

Migration `20260905013000_product_stock_backfill` inserts missing
`ProductStock` rows for products created before this task.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/inventory-input.ts` |
| Persist | `lib/catalog/admin-inventory.ts` |
| Server actions | `features/admin/products/product-actions.ts` |

## Reviews and questions (P12-T06)

Existing `ProductReview` and `ProductQuestion` tables are reused (no
migration). Storefront `reviewRepository` returns **published** reviews and
**answered** questions only. Admin lists include pending and rejected rows.

Staff custom reviews persist as `isStaffEntry=true` and `PUBLISHED`.
Moderation can publish or reject. Customers submit pending reviews and
questions from the product page or account; those stay off the storefront
until staff publish or answer. Reviewer/question images stay mock.

Create/moderate/delete require `reviews.add` / `reviews.moderate` /
`reviews.delete`. Answer/delete questions require `questions.answer` /
`questions.delete`. Customer writes require a signed-in session.

| Concern | Location |
| --- | --- |
| Input parsing | `lib/catalog/review-input.ts`, `lib/catalog/question-input.ts` |
| Admin persist | `lib/catalog/admin-reviews.ts`, `lib/catalog/admin-questions.ts` |
| Customer persist | `lib/catalog/customer-reviews.ts` |
| Server actions | `features/admin/reviews/review-actions.ts`, `features/admin/questions/question-actions.ts`, `features/account/conversation-actions.ts` |

## Search and filters (P12-T07)

Storefront `productRepository.list` is the search/filter backend. `q` is
trimmed and capped at 120 characters, then matched case-insensitively against
product name, SKU, brand name/slug, and category name/slug. Attribute filters
still require every selected key to match (`AND` across keys, `OR` within a
key). Shop/search/brand URL params accept `ProductAttribute` rows with
`isFilterable=true`. Category pages still prefer that category's `filterKeys`.

No new table or migration. User-search logging stays mock (Phase 15).

| Concern | Location |
| --- | --- |
| Query cap | `lib/search/query.ts` |
| Filterable keys | `lib/catalog/filter-keys.ts` |
| Prisma list/facets | `lib/data/prisma/product-repository.ts` |
| Mock list | `lib/data/mocks/query.ts` |

## Session hardening (P11-T03)

Shared helpers sit in `lib/auth/`. Cookie names, tables, and paths stay
separate; only the token format, cookie flags, request metadata, origin check,
and lifecycle policy are shared.

| Concern | Location |
| --- | --- |
| Token format (middleware-safe) | `lib/auth/session-token-format.ts` |
| Cookie flags | `lib/auth/session-cookie.ts` |
| Request IP / user-agent | `lib/auth/request-meta.ts` |
| Same-origin check | `lib/auth/same-origin.ts` |
| Caps, prune, revoke-all, lastUsedAt | `lib/auth/session-policy.ts` |

`CustomerSession.lastUsedAt` / `StaffSession.lastUsedAt` record the last
successful resolve. The row is rewritten at most every 10 minutes.

On login, expired and already-revoked rows for that owner are deleted, then
live sessions above the cap are removed oldest-first (5 customer, 3 staff).
If `get*Session()` finds an owner who is not `ACTIVE`, every session for that
owner is revoked.

Migration: `20260904235500_session_hardening`.

## Repository layer (P10-T06)

Pages read PostgreSQL through the repositories in `lib/data/prisma/`, bound in
the composition root at `lib/data/index.ts`. Presentation code imports
`@/lib/data` and gets an interface; it never sees Prisma.

| Setting | Effect |
| --- | --- |
| `DATA_SOURCE` unset | Repositories read PostgreSQL (default) |
| `DATA_SOURCE=mock` | Repositories read the in-memory catalogue; no database needed |

### Proving the two agree

`npm run db:parity` runs both implementations over the same 165 queries — every
listing filter, sort, page, product detail, review, question, and PC Builder
slot (including candidate attrs) — and diffs the results. It passes only when the database returns exactly
what the mocks return, which is what makes `DATA_SOURCE` a safe switch. Run it
after changing a repository or the seed.

Object key order is ignored (the mocks are hand-written literals); array order
is not, because list ordering is meaningful.

### Ordering

`featured` sort and PC Builder candidates use `Product.position` (P12-T04).
`Brand.position` was added in P12-T02; the storefront brand list orders by
that column.

The one remaining difference from the mocks is `relatedSlugs` ordering: the
link table carries no position, so related products come back in catalogue
order. The parity check compares them as a set.

### Rules the layer depends on

- **Never import `lib/data/prisma/*` or `lib/db/prisma.ts` outside `lib/data`.**
  Call `getPrisma()` from a repository, nothing else.
- **Client Components may import types from `@/lib/data` but never values.** A
  value import pulls the `pg` driver into the browser bundle and fails the
  build. `next build` is the check that catches this — `next dev` does not.
- `pg` and `@prisma/adapter-pg` are listed in `serverExternalPackages` in
  `next.config.ts` because the driver requires Node built-ins.

## Expected domain entities

- User
- Staff
- Role
- Permission
- Category
- Brand
- Product
- ProductVariant
- ProductAttribute
- ProductImage
- ProductStock
- ProductWarranty
- ProductReview
- ProductQuestion
- Cart
- CartItem
- Wishlist
- CompareList
- Order
- OrderItem
- Payment
- Refund
- Coupon
- Promotion
- FlashSale
- ShippingMethod
- ShippingArea
- ShippingZone
- Address
- BlogPost
- BlogCategory
- NewsletterSubscriber
- Notification
- SupportTicket
- Complaint
- MediaAsset
- PCBuild
- PCBuildItem
- PCCompatibilityRule
- AnalyticsConfiguration
- SEOConfiguration
- OtpSmsConfiguration
- SmtpConfiguration
- SocialLoginConfiguration
- RecaptchaConfiguration
- FirebaseConfiguration
- GoogleMapConfiguration
- ChatWidgetConfiguration
- CommentSystemConfiguration
- SiteSettings
- AuditLog
- AuthRateLimit

## Rules

- migrations are source-controlled
- no destructive production resets
- use indexes intentionally
- use database constraints for integrity
- use transactions for atomic workflows
- keep database access out of UI
