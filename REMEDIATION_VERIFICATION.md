# Remediation Verification

**Date:** 2026-09-14
**Scope:** Phase 20 — final verification of the "Complete Security, Business
Logic & Reliability Remediation" brief.
**Type:** Verification. The only code written for *this* phase was this
document; everything it describes was built in earlier phases.

Written for the person who takes this to production and maintains it
afterwards — not a summary for the author. It says what was fixed, what proves
it, what is deliberately still open, and what must be done before deploying.

---

## 1. How this was verified

Nothing below is asserted from memory. Each row was re-checked today against
the working tree and the live database:

| What | How |
| --- | --- |
| Every fix is present in code | Grep for the specific guard, not the finding ID — a comment mentioning a finding is not a fix |
| Every database change is applied | `pg_constraint` / `pg_indexes` queried directly |
| Data invariants actually hold | Counting queries against the live tables, not application code |
| Every guard is load-bearing | The guard was reverted and the suite re-run; a guard whose removal breaks nothing is not tested |
| The application still works | 16 suites, `tsc --noEmit`, `npm run lint`, `npm run build`, live HTTP probes |

The load-bearing check is the one that matters most and the one most often
skipped. A test that passes both with and without the fix is decoration, and
this engagement produced two of them before they were caught — both are
described in §6.

---

## 2. Current state

| Gate | Result |
| --- | --- |
| Test suites | **16 / 16 green — 382 checks** |
| `tsc --noEmit` | **0 errors** |
| `npm run lint` | **0 errors**, 8 pre-existing unused-variable warnings |
| `npm run build` | **exit 0** |
| Live storefront (`/`, `/cart`, `/checkout`) | 200 |
| `POST /api/internal/sweep-stale-orders` with no token configured | 404 (correct — the endpoint does not exist until opted into) |

### Suites

| Command | Checks | Covers |
| --- | --- | --- |
| `npm run test:security` | 17 | Project's own baseline |
| `npm run test:payments` | 53 | Gateway verification, amount binding, idempotency |
| `npm run test:privilege` | 11 | DSA-03 privilege containment |
| `npm run test:wallet` | 11 | DSA-06 wallet arithmetic under concurrency |
| `npm run test:tracking` | 11 | DSA-05 order-tracking privacy |
| `npm run test:routes` | 12 | Route→permission coverage (live probes) |
| `npm run test:hardening` | 60 | DSA-09/10/11/12/13, F-03/10/13/14/15/16 |
| `npm run test:headers` | 12 | F-01 response headers (live probes) |
| `npm run test:social` | 12 | OAuth account-linking hijack |
| `npm run test:clientip` | 23 | F-04 proxy-aware client IP |
| `npm run test:authhardening` | 31 | F-05/F-07 lockout and password policy |
| `npm run test:secretcrypto` | 21 | F-06 key derivation |
| `npm run test:tax` | 35 | Order money: VAT, service charge, minimum, auto-confirm |
| `npm run test:inventory` | 33 | DSA-01/02, DSA-14 |
| `npm run test:staleorders` | 32 | Abandoned-checkout stock release |
| `npm run test:env` | 8 | Deployment documentation |

Three suites include checks that fetch the running application and **skip
silently when the dev server is down**: with no server, `test:payments` reports
51 instead of 53, `test:routes` reports 8 instead of 12, and `test:headers`
reports nothing at all. That is deliberate, but it means a CI run without a
server reports fewer checks rather than failing — check the number, not just
the exit code. The counts above were taken with the server up.

---

## 3. Finding disposition

### `SECURITY_AUDIT.md` — F-series

| ID | Severity | Status | Evidence |
| --- | --- | --- | --- |
| F-01 | **High** | Fixed (partial by design) | `frame-ancestors 'none'` + `X-Frame-Options: DENY` + nosniff + Referrer-Policy + Permissions-Policy **enforced**; full CSP is **Report-Only** — see §7 |
| F-02 | Medium | Fixed | `/uploads/*` served with `Content-Security-Policy: sandbox`; content-signature validation added (DSA-11) |
| F-03 | Medium | Fixed | `lib/auth/return-path.ts` validates *positively* — resolve against an opaque base, then require the origin to match. 8 escape vectors pinned, including the backslash one that defeated the old blocklist |
| F-04 | Medium | Fixed | `lib/auth/client-ip.ts` — platform headers first, then XFF read from the **right** by `TRUSTED_PROXY_HOPS` (default 1; 0 ignores XFF) |
| F-05 | Medium | Fixed | `Staff.failedLoginAttempts` / `lockedUntil` |
| F-06 | Medium | Fixed | `lib/security/secret-key.ts` — scrypt (N=16384) with a per-purpose salt; full-entropy keys used directly; 32-char production minimum |
| F-07 | Medium | Fixed | `lib/account/weak-passwords.ts`. **Sign-in checks presence only** — see §6 |
| F-08 | Low | Fixed | Baseline green |
| F-09 | Low | **Accepted risk** | Custom Scripts is deliberate raw injection. Not a code fix — see §7 |
| F-10 | Low | Fixed | Middleware matcher covers `/b2b/:path*`, with `B2B_PUBLIC` for login/register |
| F-11 | Low | Fixed | `isSameOriginRequest()` now in `ticket-actions.ts`; 81 action files use it |
| F-12 | Low | Fixed | Public complaint / product-request / support forms rate-limited |
| F-13 | Low | Fixed | `path.relative(publicRoot, abs)` replaces the `startsWith` prefix check |
| F-14 | Low | Fixed | Production **throws** rather than falling back to the published default slug — see §8 |
| F-15 | Low | Fixed | `.gitignore` negation ordered after the broad `.env*` pattern |
| F-16 | Low | Fixed | `consumeAll` returns on first refusal instead of burning remaining buckets |

### `DEEP_SECURITY_LOOPHOLE_AUDIT.md` — DSA-series

| ID | Severity | Status | Evidence |
| --- | --- | --- | --- |
| DSA-01 | **High** | Fixed | `claimedByStock` accumulates availability across cart lines sharing one stock row; reservation is one additive `{ increment }` per row |
| DSA-02 | **High** | Fixed | `lib/orders/stock-reservation.ts` — release / convert / re-reserve, each behind an atomic `stockState` claim |
| DSA-03 | **High** | Fixed | `lib/auth/privilege-containment.ts` — no staff member may grant a permission they do not hold, strand administration, or edit their own role |
| DSA-04 | **High** | Fixed | Atomic `updateMany` claim on `payoutStatus` **before** the gateway call |
| DSA-05 | Medium | Fixed | Tracking resolves by shape: explicit `TH-…` → order, 10+ digits → phone |
| DSA-06 | Medium | Fixed | Conditional `updateMany` with `walletAmount: { gte: -amount }` + database CHECK |
| DSA-07 | Medium | Fixed | Check and create inside one transaction behind `SELECT … FOR UPDATE`; partial unique index as the real guard |
| DSA-08 | Low | Fixed | The admin alerts route is no longer the one staff mutation reachable cross-site |
| DSA-09 | Low | Fixed | Address count and insert in one transaction |
| DSA-10 | Low | Fixed | **No existing wholesale account may re-apply, in any state** |
| DSA-11 | Low | Fixed | `lib/media/file-signature.ts` — magic-byte validation, extension/content mismatch refused |
| DSA-12 | Low | Fixed | Stock ids de-duplicated and **sorted** before the `FOR UPDATE` loop |
| DSA-13 | Low | Fixed | `normalizeSmtpHost` refuses loopback, RFC1918, link-local, and `.internal`/`.local` |
| DSA-14 | Low | Fixed | `Coupon.perUserLimit` + `CouponRedemption` ledger, checked under a row lock |

### `ADMIN_FUNCTIONALITY_VERIFICATION.md` — F17-series

| ID | Status | Notes |
| --- | --- | --- |
| F17-01 | Fixed / labelled | VAT, service charge, order minimum and auto-confirm wired, each with a no-op default. Pickup, invoice, tracking, label and printer carry a visible "Saved but not yet applied" notice. `orderCodePrefix` deliberately not wired — see §7 |
| F17-02 | Open (Low) | Currency format settings remain persist-only. Store is BDT-only in practice |
| F17-03 | Open (Informational) | `getOtpFeatureFlags` is dead code; safe to delete |
| F17-04 | Open (Low) | Delivery-boy roster is four hardcoded names stored inside free-text `staffNotes`. Needs a `DeliveryAgent` table |
| F17-05 | By design | Firebase / reCAPTCHA deferred, documented in the schema |

### Not in any audit — found while remediating

| Issue | Status |
| --- | --- |
| Abandoned checkouts held reserved stock **forever** — every abandoned cart permanently lowered a product's availability | Fixed: `lib/orders/stale-orders.ts` + sweep. **Requires scheduling — see §8** |
| Connection-pool deadlock: `writeAuditLog` uses the pooled global client and was being called inside interactive transactions, so 5 concurrent adjustments held all 5 pool connections and each waited for a sixth | Fixed: audit writes moved after commit, in three places |
| The checkout summary computed its total independently (`subtotal − discount + shipping`), so once VAT was wired it quoted one figure and charged another | Fixed: the summary now derives its total with the **same pure functions** the server charges with |

---

## 4. Database changes

Six migrations. **Every one is additive.** No table was rewritten, no column
dropped or retyped, no data modified, no row deleted.

| Migration | What it does |
| --- | --- |
| `20260912211917_order_stock_state` | `OrderStockState` enum + `Order.stockState` (default RESERVED); `CHECK (reserved >= 0 AND reserved <= quantity)` on `ProductStock` |
| `20260913050831_refund_payout_claim` | `PROCESSING` payout status; partial unique index `Refund_one_open_per_order` |
| `20260913061500_wallet_non_negative` | `CHECK ("walletAmount" >= 0)` on `User` |
| `20260913064711_staff_login_lockout` | `Staff.failedLoginAttempts`, `Staff.lockedUntil` |
| `20260913154048_coupon_per_user_limit` | `Coupon.perUserLimit` (nullable) + `CouponRedemption` table |
| `20260913190000_order_service_charge` | `Order.serviceChargeAmount` (default 0) + non-negative CHECK |

### Verified present in the live database

```
Order   | Order_service_charge_non_negative    | CHECK (("serviceChargeAmount" >= 0))
ProductStock | ProductStock_reserved_within_quantity | CHECK (reserved >= 0 AND reserved <= quantity)
User    | User_wallet_non_negative             | CHECK (("walletAmount" >= 0))
Refund_one_open_per_order     — partial unique on ("orderId") WHERE status IN (REQUESTED, APPROVED)
CouponRedemption_orderId_key  — unique on ("orderId")
```

### Verified invariants hold

```
stock rows violating the reserved window: 0
negative wallets:                         0
orders with a negative service charge:    0
orders with more than one open refund:    0
```

The database now refuses the impossible states rather than relying on the
application to avoid them. That distinction is the point: the application layer
is where the bugs were.

---

## 5. The pattern behind most of the findings

Worth recording because it predicts where the next one will be.

The single most common defect was **read-modify-write on a shared counter**.
The codebase used atomic `{ increment }` correctly in exactly three places
(`rate-limit.ts`, `coupons.ts`, `otp/challenge.ts`). Every other counter —
`ProductStock.reserved`, `User.walletAmount`, the refund payout guard, the
address cap, the coupon per-customer count — read a value, computed a new one in
JavaScript, and wrote it back absolutely. Each was a lost update waiting for two
concurrent requests.

The fixes share one shape: make the database decide. A conditional
`updateMany` whose `where` clause carries the precondition, a `SELECT … FOR
UPDATE` before a check that must stay true, or a constraint that refuses the
bad row outright. `claimed.count === 1` is the whole mechanism — exactly one
caller can win that write.

---

## 6. Two false passes, and what they teach

Both were caught by reverting the fix rather than by reading the test.

**The inventory suite's first case** asserted only that an order was rejected.
It was passing against a *shipping-fixture* failure, not the oversell guard.
Tightened to assert the rejection reason matches `/enough stock/`.

**The B2B re-application test** used junk bytes for the uploaded PNG. With the
account guard deleted the application was still refused — by
`verifyFileSignature`, not by the guard under test. It now uses real PNG bytes
and asserts the refusal *reason*.

The rule both point at: **a test that asserts only "it failed" will pass for
the wrong reason.** Assert why.

A third near-miss is worth recording because it was a shipping regression, not
a test flaw: the F-07 password-strength work initially applied the new rules in
`validateLoginInput`, which runs at **sign-in**. That would have locked out
every existing account with a weak password, with no recovery — password reset
is not implemented. Sign-in now checks presence only, pinned by three tests.

---

## 7. Residual risks — deliberately not fixed

Each of these is a decision, not an oversight.

**Full CSP is Report-Only.** Only `frame-ancestors 'none'` is enforced.
Enforcing the rest needs a report-collection period and an explicit exception
for Custom Scripts (F-09), which injects third-party `<script>` tags by design.
Turning it on without that will break tracking and chat widgets.

**F-09 Custom Scripts is raw injection, by design.** Sanitizing it would break
the feature. Treat `custom_scripts.manage` as an administrative capability —
give it to the Admin role only, never to shop managers or marketing staff, and
review `CUSTOM_SCRIPTS_UPDATE` audit entries as routine.

**`orderCodePrefix` is not wired.** Order numbers come from the
`order_number_seq` Postgres sequence as bare digits, by explicit design. The
stored prefix defaults to `"TH-"`, so wiring it would change the format of every
future order number without anyone having asked. The field carries an inline
"Not applied" hint instead.

**Five settings sections save but are not read** — pickup points, invoice,
order tracking, shipping label, thermal printer. These are missing *features*,
not missing function calls: there is no pickup flow at checkout and no print
path. Each screen now says so.

**F17-02 / F17-03 / F17-04 remain open.** Currency formatting is persist-only,
`getOtpFeatureFlags` is dead code, and the delivery-boy roster is four
hardcoded names stored inside free-text `staffNotes` where a staff member
editing notes can corrupt the assignment. F17-04 is the one with real
operational cost and needs a `DeliveryAgent` table.

**A late payment on a swept order is refused, not auto-recovered.** `CANCELLED`
is terminal, so a gateway confirmation arriving after the sweep is rejected and
needs a human. That is the correct outcome — those units may already have been
sold — but it is a manual step, and with a 24-hour window it should be close to
unreachable.

**DSA-12 and DSA-13 were theoretical and remain unexercised.** Both are fixed;
neither was reproduced as a live exploit.

---

## 8. Before this goes to production

### Required

- **`ADMIN_LOGIN_SLUG` must be set.** F-14 made this a deliberate hard failure:
  in production the application **throws on startup** rather than falling back
  to a publicly known default. A deploy that forgets it will not boot.
- **The three secret-encryption keys must each be at least 32 characters**
  (F-06): `GATEWAY_SECRETS_KEY`, `STORAGE_SECRETS_KEY`, `COURIER_SECRETS_KEY`.
  Each is derived separately with a per-purpose salt, so they are three
  distinct values, not one shared key. Only the ones whose feature is in use
  are needed — but a missing key makes that feature's stored secrets
  undecryptable, not merely unconfigured.

### Required for the stock fix to actually work

The abandoned-checkout sweep **does not run on its own**. This project has no
cron infrastructure, so it must be triggered externally — otherwise abandoned
checkouts resume accumulating against product availability and that fix is
inert. Either:

```bash
# a host cron / Task Scheduler entry, hourly
npm run orders:stale -- --apply
```

or set `STALE_SWEEP_TOKEN` and point any HTTP scheduler at:

```bash
curl -X POST -H "Authorization: Bearer $STALE_SWEEP_TOKEN" \
     https://…/api/internal/sweep-stale-orders
```

Frequency barely matters — the *window* decides which orders qualify, so hourly
and daily release the same orders, just sooner or later. With
`STALE_SWEEP_TOKEN` unset the endpoint returns 404 and does not exist.

### Optional

- `STALE_ORDER_RELEASE_HOURS` — abandonment window, default 24. An invalid or
  out-of-range value falls back to 24 rather than clamping, so a typo of `0`
  cannot start cancelling checkouts that are minutes old.
- `TRUSTED_PROXY_HOPS` — default 1. Set to `0` to ignore `X-Forwarded-For`
  entirely if the app is not behind a proxy.

---

## 9. One item awaiting a decision

The sweeper's dry run against the **development** database found four real
abandoned orders holding stock:

```
window: 24h — orders placed before 2026-09-12T18:17:13.681Z
TH-20260905-8366F196  189h old  1 unit  sslcommerz  total=92650
TH-20260905-440567CE  188h old  1 unit  sslcommerz  total=21580
TH-20260905-9739FBB4  188h old  1 unit  sslcommerz  total=92580
TH-20260906-971B7EA5  173h old  1 unit  sslcommerz  total=79050
```

Applying would set each to `CANCELLED`, mark its payment `CANCELLED`, and
return one unit to available stock. **This has not been run.** The sweep script
is dry-run by default and requires an explicit `--apply`.

The same will be true of production on first run. Run the dry run there first
and read the list before applying — the output is per-order precisely so that a
human can approve it, rather than being asked to approve "47 orders".

---

## 10. What this verification does not cover

Stated plainly, because a verification document that implies more coverage than
it has is worse than none.

- **No penetration test was performed.** Findings were traced through source
  and exercised against a development database. Nothing was run against a
  production deployment, and no real payment request was ever sent.
- **Gateway behaviour is unverified against live gateways.** SSLCommerz, bKash
  and Nagad flows are covered by code review and by tests that stand in for the
  gateway. Hosted-checkout fixtures rewrite a COD payment row's provider rather
  than driving a real session.
- **Load and concurrency were exercised, not proven.** The race fixes are
  demonstrated by tests that run concurrent operations and by reverting each
  guard. That is evidence, not a proof, and it is not a load test.
- **The 165 admin screens were classified by tracing read paths in source**, not
  by exercising each one in a browser. A control that renders but does nothing
  would not necessarily surface.
- **`npm run lint` reports 8 warnings**, all pre-existing unused variables.
  None were introduced by this work and none were cleaned up, to keep the diff
  attributable.
- **This verification was performed by the same agent that wrote the fixes.**
  That is a real limitation on its independence. The mitigations are that every
  claim here is backed by a command whose output is reproducible, and that each
  guard was proved load-bearing by breaking it — but an independent review
  would still be worth having before launch.
