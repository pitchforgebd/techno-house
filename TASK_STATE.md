# TASK STATE

## Current Phase

Phase 15 — Final Production Readiness Review

## Status

COMPLETE

---

## Completed

Ran all 13 required checks from the plan. This was a review phase, so most tasks were audits (delegated to 4 parallel research passes covering migrations/indexes, authorization/validation/secrets, transaction boundaries, and a final fake-success/error-message/deployment sweep) — findings were verified against the actual codebase before acting, and only genuine, concrete issues were fixed. Nothing was fixed on the audit agents' say-so alone.

### 1–3. Migrations reviewed; no destructive migration; indexes/constraints confirmed

All 52 migrations read. No `DROP TABLE`/`TRUNCATE`/unguarded `SET NOT NULL`. The one `DROP COLUMN` pair (`ProductAttribute.groupLabel`, `ProductAttributeValue.isHighlight`) is dead seed-only data replaced by real successor tables in the same migration — confirmed unreferenced anywhere in `lib/`/`features/`/`app/`. Spot-checked indexes/uniqueness on Product, Order, Category, Brand, User/Staff, Promotion, FlashSale, Coupon — nothing missing.

### 4–5. Authorization and validation on admin mutations

Sampled all 60 `features/admin/**/*-actions.ts` files. Found and fixed: **3 server actions were missing the same-origin/CSRF guard** every sibling action has (permission checks were already present, so this was defense-in-depth, not an unauthenticated write):
- `features/admin/catalog/product-request-actions.ts` — `saveAdminProductRequestAction`
- `features/admin/support/contact-actions.ts` — `saveAdminContactAction`
- `features/admin/support/ticket-actions.ts` — `replyAdminTicketAction`, `updateAdminTicketStatusAction`

Validation was broadly healthy (length caps, enum whitelisting, permission-key validation against the real `Permission` table). One audit lead (unbounded `reply`/`staffNotes` in `updateAdminContact`) turned out to be a false positive on inspection — both are already capped (4000/2000 chars) — no fix needed there.

### 6. Transaction boundaries for multi-table operations — 2 real gaps found and fixed

- **`lib/catalog/admin-products.ts` — `persistParsed()` (used by both `saveAdminProduct` and `cloneAdminProduct`)**: wrote `Product` + `ProductImage` + `ProductVariant` + `ProductAttributeValue` + `ProductColor(Image)` + `ProductSpecGroup/Row/Chip` + `ProductStock` as separate, unguarded statements. A failure partway through (e.g. a duplicate variant SKU) could leave a real, half-written product — the create path had manual compensating deletes, the update path had none at all. Fixed by wrapping the whole write sequence in `prisma.$transaction(async (tx) => {...})`, threading `tx` through `syncVariants`/`syncAttributeValues`/`syncProductColors`/`syncSpecGroups`/`upsertProductStock` (the latter now takes an optional `db` client param, defaulting to `getPrisma()` for its other caller). A step's `{ok:false}` result is converted to a thrown `PersistRollback` so Prisma actually rolls back instead of committing partial writes. Verified against real Postgres: an update with a colliding variant SKU is rejected and the product's other field changes (e.g. name) are correctly rolled back too.
- **`lib/refunds/workflow.ts` — `completeRefund()`**: committed the refund's own `COMPLETED`/`payoutRef` record as a separate statement from the `Payment`/`Order` status sync (which has its own internal transaction). If the sync failed after a successful *external* payout, the refund row said `COMPLETED` with real money sent, while `Order`/`Payment` still showed unrefunded — and nothing ever retried the sync, since every other code path short-circuits once `refund.status === "COMPLETED"`. **Deliberately did not** just wrap both in one transaction — that would let a retry re-trigger `payoutRefund()` and pay out a second time, since rolling back `refund.status`/`payoutRef` would make the code think no payout had happened yet. Instead, the "already completed" early-return now retries just the Payment/Order sync (safe, because it's idempotent — only writes when status actually differs). Verified against real Postgres with a fixture simulating the stuck state: sync completes correctly, `payoutRef` is untouched (no double payout).

### 7. No secrets exposed

Confirmed clean. No hardcoded credentials anywhere; all gateway/SMTP/courier/SMS secrets read from `process.env` in server-only files, several encrypted at rest. No secret ever reaches a Client Component. `.env.local` gitignored.

### 8. No fake success messages remain — 1 more genuine bug found and fixed

`app/(admin)/admin/(panel)/labels/[id]/page.tsx` still read from the old hardcoded `getMockLabelById()` mock array (missed by Phase 13's `features/admin/**`-scoped sweep, since this bug was in the page file itself). The label *list* page has read real `ProductLabelPreset` rows with real cuids since Phase 3, so clicking "Edit" on any real, non-seed label 404'd — a genuinely broken reachable route, not just a display issue. Fixed:
- Added `getAdminLabelById()` (real single-row lookup, `lib/catalog/admin-presets.ts`) and `loadAdminLabelById()` (`lib/admin/load-labels.ts`), replacing the mock lookup in the edit page.
- While fixing this, found a second bug in the same form: the label editor's product-assignment picker (add/remove product buttons) only updated its own local React state — `saveLabelAction` never received `productIds` at all, so "assigning" a product to a label silently did nothing beyond the confirming toast. Fixed by threading `productIds` through `saveLabelAction` → `saveLabel()`, which now diffs the requested set against `Product.labelIds` and applies only the additions/removals in one transaction (not a full rewrite of every product).
- Verified against real Postgres: attach syncs `Product.labelIds` on both products, detach removes it from only the detached one, and `deleteLabel` still correctly detaches from all remaining products.

Confirmed still clean elsewhere: `mockProductRating()`/`mockSalesCount()` (Phase 13's documented exception, unchanged, still the only fabricated-display-data instance); flash-sale product-assignment's honest disclosure banner; all genuinely-disabled features show real "not available" state, not fake success.

### 9. Error messages are meaningful

Spot-checked products, orders, promotions, staff, settings. Server actions consistently return specific `formError` strings (e.g. "That order no longer exists.") and UI components display them via `notifyError`, not a generic string. No bare `"Something went wrong"` found. The few empty `try/catch` blocks found are all non-mutation cosmetic fallbacks (audio chime, clipboard copy), not swallowed mutation failures.

### 10. Mobile/admin UI usability

Code-level confirmation only (no browser automation available, disclosed as a limitation in every phase). The admin shell (`features/admin/admin-shell.tsx`) collapses its sidebar into a slide-over `Sheet` below the `lg:` breakpoint with a hamburger trigger; data tables wrap in `overflow-x-auto`. Reasonable responsive construction, not verified visually.

### 11. Production build

**PASS.** 140/140 pages, zero errors — re-verified twice this phase (once before starting fixes to confirm Phase 14 left it clean, once after all Phase 15 fixes).

### 12. Deployment instructions/config

Confirmed current and accurate: `docs/DEPLOYMENT.md` reflects the real (not-yet-live) target; every `.env.example` variable traces to a real `process.env` read; `docs/DATABASE.md` correctly describes the Prisma 7 driver-adapter setup (no stale Rust-engine references). Minor doc-accuracy nit noted (not fixed, out of scope): `README.md` still describes the app as "demo/mock data" in one line, which reads as stale next to the real Postgres-backed system described everywhere else.

### 13. `TASK_STATE.md` updated

This file.

### Final deliverable

Created `ADMIN_FUNCTIONALITY_AUDIT.md` (repo root) — audited routes grouped by functional area, database models, migrations, tests performed, known limitations, intentionally unavailable features, remaining manual data-entry (go-live) tasks, and a checklist against the plan's Definition of Done.

---

## Files Changed

**Modified**
- `lib/catalog/admin-presets.ts` — added `getAdminLabelById`, `syncLabelProducts`; `saveLabel` now accepts and syncs `productIds`
- `lib/admin/load-labels.ts` — added `loadAdminLabelById`
- `app/(admin)/admin/(panel)/labels/[id]/page.tsx` — real data instead of `getMockLabelById`
- `features/admin/catalog/preset-actions.ts` — `saveLabelAction` accepts `productIds`
- `features/admin/labels/admin-label-form.tsx` — actually sends `productIds` on save
- `lib/catalog/admin-products.ts` — `persistParsed()` wrapped in `$transaction`; `syncVariants`/`syncAttributeValues`/`syncProductColors`/`syncSpecGroups` now take a `tx` client
- `lib/catalog/admin-inventory.ts` — `upsertProductStock` accepts an optional transaction client
- `lib/refunds/workflow.ts` — `completeRefund`'s "already completed" path now retries the Payment/Order sync
- `features/admin/catalog/product-request-actions.ts` — added same-origin guard
- `features/admin/support/contact-actions.ts` — added same-origin guard
- `features/admin/support/ticket-actions.ts` — added same-origin guard (both actions)

**Added**
- `ADMIN_FUNCTIONALITY_AUDIT.md` — the plan's final deliverable

---

## Database Changes

None — no schema changes this phase. `db:drift`: no difference. `prisma migrate status`: up to date (52 migrations).

---

## Tests

- **TypeScript:** PASS (`npx tsc --noEmit`, dev server stopped first) — re-verified after every fix
- **Production build:** PASS (`npm run build`) — 140/140 pages, zero errors
- **ESLint:** 14 errors / 10 warnings — exactly the established baseline, unchanged
- **Real PostgreSQL:** PASS — **11/11 checks** via a temporary script (since deleted): product-save transaction rollback on a colliding variant SKU (product name change correctly rolled back too), label `productIds` attach/detach syncing `Product.labelIds` correctly on both sides, refund retry-safety (stuck Payment/Order status correctly synced on retry, `payoutRef` untouched — no double payout)
- **Regression suites:** `test:pc-builder` **44/44 PASS** (AD-276 guard, re-confirmed after every edit), `test:payments` **47/47 PASS**, `test:queries`, `test:a11y` (10), `test:seo` (12), `test:env` (8) — all PASS
- **`test:security` 1/16 FAIL** — pre-existing, unchanged, documented since Phase 13
- **`test:bundle` 4/9 FAIL** — pre-existing, surfaced in Phase 14, unchanged, confirmed unrelated to any phase's changes
- **Database:** `npx prisma migrate status` up to date; `npm run db:drift` no difference
- **Live routes:** full sweep across every functional area — storefront pages `200`, unauthenticated admin routes correctly `307`; no server errors in the dev log

---

## Known Issues

1. `test:security` 1/16 — pre-existing (4 `dangerouslySetInnerHTML` usages), unchanged.
2. `test:bundle` 4/9 — pre-existing, unrelated to any admin-functionality phase's work.
3. No browser automation available; all verification is real-database function calls plus HTTP status checks, disclosed consistently since Phase 0.
4. `README.md` describes the app as "demo/mock data" — stale wording, doc-accuracy nit only, not fixed (out of scope).

`mockProductRating()`/`mockSalesCount()` (previously listed here) was fixed post-phase — see the addendum below.

---

## Intentionally Not Implemented

- Bulk order deletion (no order-delete capability exists anywhere; orders are financial/audit records).
- CSV export for the Promotional Products / Today's Deal admin lists (no backend exists for this specific export).
- Flash-sale product-assignment does not yet affect checkout pricing — honestly disclosed via a visible banner on the flash-sale detail page, not faked.

---

## For a future phase (flagged, not this phase's scope)

- `test:bundle` 4/9 — image-loading priority on PDP gallery/homepage hero, gallery cache-busting query param, a dependency-hygiene check for a heavy chart/editor library.
- `test:security` 1/16 — a dedicated CSP/sanitization review of the 4 `dangerouslySetInnerHTML` usages (all render trusted, admin-authored content, not user input, but worth tightening).
- `README.md`'s stale "demo/mock data" framing.

---

## AD-276 Regression Guard

`test:pc-builder` **44/44 PASS**, reconfirmed after every edit this phase (and again after the post-phase addendum below). No product-mapper, compatibility-engine, or builder-candidate code was touched — the product-save transaction fix wraps existing writes, it does not change what gets written or how builder fields are computed.

---

## Next Phase

None — Phase 15 is the plan's final phase. All 13 required checks are complete and the Definition of Done checklist in `ADMIN_FUNCTIONALITY_AUDIT.md` is fully satisfied.

## Approval Required

N/A — plan complete. Any further work is a new, separately-scoped request, not a continuation of this plan.

---

## Addendum (post-Phase-15): `mockProductRating()`/`mockSalesCount()` fixed

Requested directly by the user after Phase 15 closed, scoped to exactly this one item (confirmed via a scoped question — explicitly declined to also build bulk order deletion or the promo-list CSV export, which stay "Intentionally Not Implemented" above).

`/admin/products` showed fabricated, hash-derived rating/sales numbers with no relation to real data. Fixed:
- Added `loadListStats()` to `lib/catalog/admin-products.ts` — two `groupBy` queries scoped to the current page's product ids only: `productReview.groupBy` (`status: "PUBLISHED"` only, `_avg`/`_count`) for rating, and `orderItem.groupBy` (`order.paymentStatus: "PAID"` only, `_sum: quantity`) for units sold — the exact same "sold" definition the real Product Sales report (`lib/admin/load-report-center.ts`) already uses, for consistency.
- `AdminProductListItem` gained `avgRating`/`reviewCount`/`salesCount`; `listAdminProductRecords()` now computes and attaches them per page.
- `admin-product-table.tsx` renders the real values; a product with zero published reviews now honestly shows "No reviews yet" instead of a fake star rating.
- `mockSalesCount()` deleted (no longer used anywhere). `mockProductRating()` kept — it's still legitimately used by `load-reviews.ts`'s `DATA_SOURCE=mock` fallback (no database at all) and by `load-products.ts`'s equivalent fallback for the same list, both pre-existing, intentional mock-mode-only paths, not the bug that was fixed.

**Verified against real Postgres** (temporary script, deleted after use): a product with 2 published reviews (ratings 4 and 5) and 1 pending review (rating 1) correctly shows avgRating 4.5 / reviewCount 2 (pending excluded); a paid order for 3 units and an unpaid order for 10 units correctly show salesCount 3 (unpaid excluded). 4/4 checks passed.

**Regression:** `npx tsc --noEmit` clean, `npm run build` clean (140/140 pages), ESLint unchanged (14/10 baseline), `test:pc-builder` 44/44 PASS.

**Files changed:** `lib/catalog/admin-products.ts`, `features/admin/products/admin-product-table.tsx`, `lib/admin/product-list-mock.ts`, `lib/admin/load-products.ts`.

---

## Addendum 2 (post-Phase-15): hybrid JWT session envelope

Requested directly by the user (session auth previously used only opaque, DB-backed tokens — no JWT anywhere). Scoped via a clarifying question before starting: **hybrid** — JWT for cryptographic envelope/expiry, DB stays authoritative for revocation — not pure stateless JWT (which would break instant revoke) and not JWT-only-for-one-surface.

**Design:** the session cookie now holds a signed JWT (`jose`, HS256, `SESSION_JWT_SECRET`) wrapping the existing opaque session token, instead of the raw token directly. This is purely additive at the cookie-transport layer:
- New `lib/auth/session-jwt.ts` — `signSessionJwt`/`verifySessionJwt`. The JWT payload carries only the wrapped token + expiry, **no** staffId/permissions/identity claims — caching authorization data in the token would let a revoked permission or role change stay in effect until the JWT expires, which would be a real regression against everything Phase 15 verified.
- `staff-session-cookie.ts` / `customer-session-cookie.ts` — `set*Cookie` signs the JWT, `read*Cookie` verifies it and returns the unwrapped token. Everything downstream (`createStaffSession`, `getStaffSession`, `revokeCurrentStaffSession`, the customer equivalents) is **unchanged** — they still deal in the same opaque-token abstraction; the JWT layer is fully encapsulated in the cookie functions.
- `middleware.ts` — now does a real signature + expiry check via `verifySessionJwt` (Edge runtime, `jose`'s Web Crypto backing works there) instead of only checking the cookie *looks* token-shaped. This is the actual new security value: a forged or expired cookie is now rejected at the edge, not just deferred to the server.
- No schema changes. `tokenHash`-based DB lookup, permission fetch, revocation, and audit logging are all untouched and still run fresh on every request.

**Bug found and fixed while verifying (pre-existing, not introduced by this change):** `getStaffSession()`/`getCustomerSession()` call `clearStaffSessionCookie()`/`clearCustomerSessionCookie()` when a token's DB row is missing/revoked/expired — but that function runs during a plain page render (a cached read), where Next.js forbids mutating cookies at all and throws. This has always been true of the original opaque-token code too (same call, same context) — it just took an end-to-end test of a since-invalidated session to surface it. Fixed by making both `clear*Cookie()` functions swallow that specific error (best-effort; the stale cookie naturally clears on the next real login/logout Server Action, or expires). Without this, a revoked/expired staff or customer session hit an uncaught error instead of a clean logout on its next page load.

**Verified:**
- 6/6 unit checks on `signSessionJwt`/`verifySessionJwt` directly: round-trip, tamper rejection, expiry rejection, garbage/empty-string handling — all correct, none throw.
- 4 real end-to-end scenarios against a running dev server + real Postgres: no cookie → rejected at middleware (307); non-JWT/garbage cookie → rejected at middleware (307, same as before, now via real signature check instead of shape regex); a validly-signed JWT wrapping a token with no matching `StaffSession` row → resolves to logged-out cleanly (soft redirect, confirmed no product data in the response body, no crash after the fix above); a genuine valid session (real `Staff` + `StaffSession` row) → full authenticated access, confirmed real product-table content in the response. Temp session row cleaned up after.
- `npx tsc --noEmit` clean, `npm run build` clean (140/140 pages, middleware bundle included), ESLint unchanged (14/10 baseline), `test:pc-builder` 44/44, `test:regression` — same 2 pre-existing unrelated failures (`test:security` 1/16, `test:bundle` 4/9), everything else PASS.

**New required env var:** `SESSION_JWT_SECRET` (≥32 chars) — added to `.env.example`, `.env.local` (a freshly generated value), `docs/DEPLOYMENT.md`'s required-variables table, and `docs/SECURITY.md`. **Deploying this change logs out every existing session** (old cookies hold a raw token, not a JWT, and fail `verifySessionJwt`) — expected and disclosed, a one-time "please log in again," not a bug.

**Files changed/added:** `lib/auth/session-jwt.ts` (new), `lib/auth/staff-session-cookie.ts`, `lib/auth/customer-session-cookie.ts`, `middleware.ts`, `.env.example`, `.env.local`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`. `package.json`/`package-lock.json` — added `jose`.
