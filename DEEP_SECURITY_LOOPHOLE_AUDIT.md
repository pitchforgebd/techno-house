# Deep Security & Logic Audit

**Date:** 2026-09-13
**Target:** Techno House — storefront, customer account, B2B panel, admin panel
**Baseline:** working tree on `main`
**Type:** Defensive white-box audit. Source review + non-destructive local probing.
**Application changes made:** none.

---

## Executive Summary

This pass deliberately went where the first audit (`SECURITY_AUDIT.md`) only
sampled: business logic, concurrency, privilege containment, and cross-feature
interactions. It found **4 High and 3 Medium issues that the first audit did
not report**, none of which are detectable by the pattern-matching that a
standard review uses.

**The headline is not a missing check — it is a systematic misuse of
read-modify-write on shared counters.** The codebase knows the correct pattern
and uses it in exactly three places (`rate-limit.ts`, `coupons.ts`,
`otp/challenge.ts`, all using atomic `{ increment }`). Every other
counter that matters — `ProductStock.reserved`, `User.walletAmount`, and the
refund payout guard — reads a value, computes a new absolute value in
JavaScript, and writes it back. Two of those three are money or inventory.

The second theme is **privilege containment**. Authorization is enforced
consistently and well (the first audit's "193 actions, all guarded" holds up
under re-checking). But *what a permission is allowed to grant* is never
constrained, so three separate admin permissions silently confer full Admin.

| | Count |
| --- | --- |
| Critical | 0 |
| High | 4 |
| Medium | 3 |
| Low | 7 |
| Informational | 3 |

### Finding table

| ID | Severity | Area | Exploitability | Impact | Confirmed? |
| -- | -------- | ---- | -------------- | ------ | ---------- |
| DSA-01 | **High** | Inventory / order | Trivial — any customer, no race needed | Oversell; silent stock-ledger corruption on ordinary orders | **CONFIRMED** (PoC) |
| DSA-02 | **High** | Inventory / availability | Trivial — one customer account | Permanent inventory exhaustion; catalogue-wide business DoS | **CONFIRMED** (code path) |
| DSA-03 | **High** | Admin authorization | Easy — any staff holding one of 3 permissions | Vertical privilege escalation to full Admin | **CONFIRMED** (code path) |
| DSA-04 | **High** | Refunds / money | Moderate — needs concurrency, `refunds.process` | Duplicate real gateway payout | **CONFIRMED** (code path; not executed) |
| DSA-05 | Medium | Order tracking | Trivial — unauthenticated | Full order enumeration, volume intelligence, courier tracking-code leak | **CONFIRMED** (code path) |
| DSA-06 | Medium | Wallet / money | Moderate — needs concurrency, `customer.edit` | Lost update; balance diverges from ledger | **CONFIRMED** (code path) |
| DSA-07 | Medium | Refunds | Moderate — needs concurrency, any customer | Multiple concurrent refund requests on one order | **CONFIRMED** (code path) |
| DSA-08 | Low | Admin API / CSRF | Low | Cross-site "mark all alerts read" nuisance | CONFIRMED |
| DSA-09 | Low | Account | Low | Address cap bypass | CONFIRMED |
| DSA-10 | Low | B2B | Low | Suspended reseller clears own SUSPENDED state | RESOLVED (AD-335) |
| DSA-11 | Low | Upload | Low | No content/magic-byte validation | CONFIRMED |
| DSA-12 | Low | Order | Low | Lock-ordering deadlock under concurrent orders | UNCONFIRMED / THEORETICAL |
| DSA-13 | Low | SMTP | Low — needs `smtp.manage` | Blind internal port probe | UNCONFIRMED / THEORETICAL |
| DSA-14 | Low | Coupons | Trivial | One customer reuses a coupon indefinitely | CONFIRMED (design gap) |

---

## Threat Model

Audited from four positions:

| Attacker | Assumed access | Primary questions |
| --- | --- | --- |
| **Unauthenticated** | None | Public endpoints, enumeration, registration/OTP abuse, payment callbacks, SSRF, redirects |
| **Customer** | One legitimate account (free to create) | IDOR on every owned resource, price/discount/stock manipulation, B2B escalation, refund abuse |
| **B2B buyer** | Approved wholesale account | Status bypass, negotiated-price exposure, cross-account access |
| **Low-privilege staff** | One granted permission | Horizontal and vertical escalation, permission confusion, alternate code paths bypassing UI limits |

Explicitly **not** downgraded for requiring a login. A customer account costs
one registration; a low-privilege staff account is the normal state of most
employees.

---

## Attack Surface Inventory

| Category | Count | Reviewed |
| --- | --- | --- |
| Storefront pages (public + customer) | 62 | Yes |
| Customer account pages | 15 | Yes |
| B2B panel pages | 12 | Yes — all 12 individually |
| Admin pages | 165 | Route→permission map reviewed; mutations reviewed via actions |
| Route handlers (`route.ts`) | 12 | Yes — all 12 |
| Admin server actions | 193 | Yes — scripted sweep + manual read of all flagged |
| Customer / B2B server actions | 35 | Yes |
| Payment callbacks / IPN | 4 | Yes |
| Upload endpoints | 2 (admin media, B2B KYC) | Yes |
| File retrieval endpoints | 2 (`/uploads/*` static, `/admin/api/b2b-documents`) | Yes |
| Feeds / public XML | 2 | Yes |
| Cron / internal endpoints | 0 | N/A — none exist |

---

## Critical Findings

None.

---

## High Findings

### DSA-01 — Stock reservation is a lost update; availability is not accumulated across cart lines

```text
ID:           DSA-01
Severity:     HIGH
Title:        Two cart lines sharing one stock row both pass the availability
              check, and the second reservation write silently discards the first
```

**Affected files / functions**

- `lib/orders/create-order.ts` → `placeCustomerOrderForUser`
  - lines **311-313** — availability check
  - lines **353-354** — per-line snapshot of `reserved`
  - lines **478-487** — reservation write
- `prisma/schema.prisma` → `ProductStock` (line 685, `productId @unique`),
  `CartItem` (line 799, `@@unique([cartId, productId, variantId, colorId])`)

**Attacker:** any signed-in customer. **Required privileges:** one ordinary
customer account. **No race or timing required** — this is deterministic
single-request behaviour.

**Root cause**

Two independent defects that compound:

1. `ProductStock` has `productId @unique` — **one stock row per product**.
   `ProductColor` carries no stock of its own. But `CartItem` is unique on
   `(cartId, productId, variantId, colorId)`, so **the same product in two
   colours is two cart lines pointing at one stock row.**

2. The availability loop reads a snapshot once, before the loop, and each line
   compares against that same unmutated snapshot:

   ```ts
   const stock = stockById.get(stockRow.id) ?? stockRow;        // :311
   const available = Math.max(0, stock.quantity - stock.reserved); // :312
   if (available < quantity) { … }                                 // :313
   ```

   Nothing subtracts an accepted line's quantity before the next line is
   checked, so N lines on one stock row each get to spend the *full* available
   quantity.

3. The reservation write uses an **absolute value derived from that same stale
   snapshot**, not an atomic increment:

   ```ts
   for (const line of lines) {
     const nextReserved = line.reserved + line.quantity;  // :479  line.reserved is the pre-loop snapshot
     await tx.productStock.update({
       where: { id: line.stockId },
       data: { reserved: nextReserved },                  // :487  SET, not increment
     });
   }
   ```

   For two lines on one stock row, the second `update` overwrites the first.

**Why existing controls do not stop it**

The transaction and the `SELECT … FOR UPDATE` on `ProductStock` (line 209) are
real and correct — but they defend against *other transactions*. This defect is
**inside a single transaction**: one snapshot read, two absolute writes. A row
lock cannot help. This is precisely why the bug survived an audit that checked
for locking.

**Attack path**

1. Find any product with ≥2 colours (colour is a normal storefront option).
2. Note available stock — say `quantity 5, reserved 0`.
3. Add colour A × 5 to cart. Add colour B × 5. Two `CartItem` rows, one
   `ProductStock` row.
4. Check out. Both lines see `available = 5` and pass.
5. Order is created for **10 units against 5 on hand**.
6. `reserved` ends at 5, not 10.

**The non-malicious case is worse**, because it happens constantly: a customer
honestly buying 2 red + 3 blue reserves **3**, not 5. Two units are sold and
never reserved, so the shop resells them.

**Impact**

- Direct oversell — orders accepted for stock that does not exist.
- Silent, cumulative corruption of `ProductStock.reserved` on every ordinary
  multi-colour order. Because nothing ever recomputes `reserved` from orders,
  the error is permanent and compounding.
- Downstream: `deriveStockStatus`, low-stock alerts, and the storefront
  availability badge all read from this counter, so they lie too.

**Evidence / PoC** (non-destructive; touches no database, replays the exact
arithmetic of both loops)

```js
const stockRow = { id: "stock_1", quantity: 5, reserved: 0 };
const cartItems = [                       // permitted by @@unique([cartId,productId,variantId,colorId])
  { colorId: "red",  quantity: 5, stock: stockRow },
  { colorId: "blue", quantity: 5, stock: stockRow },   // same ProductStock row
];
const stockById = new Map([[stockRow.id, { ...stockRow }]]); // one read, before the loop

const lines = [];
for (const item of cartItems) {
  const stock = stockById.get(item.stock.id);                     // :311
  const available = Math.max(0, stock.quantity - stock.reserved); // :312
  if (available < item.quantity) continue;                        // :313
  lines.push({ stockId: stock.id, quantity: item.quantity, reserved: stock.reserved }); // :354
}
let dbReserved = stockRow.reserved;
for (const line of lines) dbReserved = line.reserved + line.quantity; // :479 + :487
```

Output:

```text
  line red:  qty 5 vs available 5 -> ACCEPTED
  line blue: qty 5 vs available 5 -> ACCEPTED
  reserve write: reserved = 0 + 5 = 5
  reserve write: reserved = 0 + 5 = 5
  units sold in this order: 10      (on hand: 5)
  units actually reserved  : 5
  OVERSOLD by 5 units
```

And the everyday case (100 in stock, honest order of 2 red + 3 blue):

```text
  reserved should be : 5
  reserved actually  : 3
  units sold but never reserved: 2
```

**Recommended fix**

1. Accumulate per stock row while checking:
   ```ts
   const takenByStock = new Map<string, number>();
   const taken = takenByStock.get(stock.id) ?? 0;
   if (stock.quantity - stock.reserved - taken < quantity) throw …;
   takenByStock.set(stock.id, taken + quantity);
   ```
2. Make the write atomic and per stock row, not per line:
   ```ts
   for (const [stockId, qty] of takenByStock) {
     await tx.productStock.update({
       where: { id: stockId },
       data: { reserved: { increment: qty } },
     });
   }
   ```
3. Add a DB `CHECK (reserved <= quantity)` so this class of bug fails loudly.

**Regression test:** place an order with two colour lines of one product summing
to exactly the available quantity, assert the order is rejected; then one
summing to less, assert `reserved` equals the **sum** of both lines.

---

### DSA-02 — Stock reservations are never released, and `quantity` is never decremented

```text
ID:           DSA-02
Severity:     HIGH
Title:        `reserved` only ever grows; cancelling an order does not release
              stock, so any customer can permanently exhaust the catalogue
```

**Affected files / functions**

- `lib/orders/create-order.ts:478-489` — the only writer of `reserved` (always upward)
- `lib/orders/admin-orders.ts:184-214` — order status change, including `CANCELLED`
- `lib/catalog/admin-inventory.ts:46-52` — blocks `quantity < reserved`

**Attacker:** any signed-in customer. **Required privileges:** one account.

**Root cause**

A repository-wide search for writes to `ProductStock.reserved` returns exactly
one site — the increment at order creation. **Nothing anywhere decrements it.**
Nothing decrements `quantity` on fulfilment either. Setting an order to
`CANCELLED` writes `cancelledAt` and payment status and never touches stock:

```ts
if (status === "CANCELLED") {
  data.cancelledAt = existing.cancelledAt ?? now;   // admin-orders.ts:184-186
}
// … transaction updates Order and Payment only — no ProductStock write
```

Since `available = quantity - reserved` and `reserved` is monotonic, every
product's availability ratchets down to zero and never recovers.

**Why existing controls do not stop it**

There is no control here at all — the release path was never written. Worse,
the one repair route fights back: `admin-inventory.ts:49` refuses to set
`quantity` below `reserved`, so an admin trying to fix a poisoned product must
first inflate `quantity` past the phantom reservations.

**Attack path**

1. Register one account (registration is rate-limited 5/hour/IP, and that IP
   limit is bypassable — see `SECURITY_AUDIT.md` F-04).
2. Add every product to the cart at its full available quantity.
3. Check out with **Cash on Delivery** — `planPaymentStart` treats `cod` as an
   offline flow, so the order is created and stock reserved with **no payment
   whatsoever**.
4. Never pay. Cancel, or simply abandon.
5. Repeat once per product. The catalogue now reads "out of stock" permanently.

**Impact**

- Complete, cheap, persistent denial of sales across the whole catalogue.
- Recovery is manual, per-product, and obstructed by the inventory guard.
- Even without an attacker, this happens organically: every abandoned or
  cancelled order leaks stock forever. The store will slowly stop selling.

**Evidence**

```text
$ grep -rn "reserved" --include=*.ts lib | grep -v generated
  → the only write is lib/orders/create-order.ts:487  data: { reserved: nextReserved }
$ grep -n "stock\|productStock\|reserved" lib/orders/admin-orders.ts
  → (no matches)
```

**Recommended fix**

- On `CANCELLED` (and on payment `FAILED`/`EXPIRED`), decrement `reserved` by
  each order line's quantity, atomically, guarded by an
  `if (!order.stockReleased)` flag so it cannot run twice.
- On `DELIVERED`, convert the reservation: `quantity: { decrement: n }` and
  `reserved: { decrement: n }` in one transaction.
- Add a sweeper for PENDING unpaid orders older than the payment window.
- Add the `CHECK (reserved <= quantity)` from DSA-01.

**Regression test:** place an order, assert `reserved` rose; cancel it, assert
`reserved` returned to its original value; deliver another, assert `quantity`
fell and `reserved` returned.

---

### DSA-03 — Three admin permissions each silently confer full Admin

```text
ID:           DSA-03
Severity:     HIGH
Title:        No privilege-containment rule: staff.add / staff.edit /
              roles.manage each allow escalation to Admin, and system roles
              are not protected
```

**Affected files / functions**

- `lib/admin/save-staff.ts:49-107` → `saveStaff` (role assignment unconstrained)
- `features/admin/staff/staff-actions.ts:23` → guard is `staff.add` / `staff.edit`
- `lib/auth/staff-roles.ts:91-207` → `saveStaffRole` (grant set unconstrained)
- `lib/admin/feature-permissions-mock.ts:260-266` — all three are ordinary,
  grantable permissions in the catalogue
- `features/admin/staff/admin-role-form.tsx:137` — the UI offers every
  permission as a checkbox

**Attacker:** any staff member holding **one** of `staff.add`, `staff.edit`, or
`roles.manage`.

**Root cause**

Authorization asks *"may you perform this operation?"* but never *"may you
grant this level of privilege?"*. There is no rule that a grant must be a
subset of the granter's own permissions, and `Role.isSystem` — which exists in
the schema — is **never read as a guard anywhere in the codebase** (a
repo-wide search shows it used only for `orderBy` and display).

**Attack path — three independent vectors**

*Vector A — `staff.add`:*
```
saveStaffAction({ fullName, email: "me2@…", phone, roleKey: "admin",
                  status: "active", password: "…" })
```
`saveStaff` validates the role merely *exists* (`save-staff.ts:72-78`) and
creates the account. Sign in as it. Full Admin.

*Vector B — `staff.edit`:* call `saveStaffAction` with `id = <your own staffId>`
and `roleKey: "admin"`. The only self-protection in the function is:
```ts
if (input.id === input.actor.staffId && input.status !== "active")  // :67
  return { ok: false, formError: "You cannot disable your own account." };
```
It blocks self-*disable*. It does not block self-*promote*.

*Vector C — `roles.manage`:* call `saveStaffRoleAction` with your own role's key
and `permissionIds = <every permission>`. `saveStaffRole` deletes and recreates
the grants with no subset check and no `isSystem` check. The same call can strip
permissions from the **Admin** system role — remove `roles.manage` from every
role and role management is permanently unreachable without direct DB access.

**Why existing controls do not stop it**

The permission checks themselves are present and correct — the escalation
happens *through* an authorized call. `MANAGER_DENIED`
(`feature-permissions-mock.ts:280-299`) shows the authors intended these to be
admin-tier, but it is used **only** at line 342 to seed the default Manager
role. It is not an enforcement boundary, and the role editor happily offers
these permissions for any custom role.

**Impact**

An operator granting a "Shop Manager" or "HR" role the innocuous-looking
*"Edit staff"* checkbox has, without any warning, granted full Admin —
including payment-gateway credentials, customer PII, refunds, and the Custom
Scripts box (which is stored XSS on every storefront page by design).

**Evidence**

```text
$ grep -rn "isSystem" --include=*.ts lib features app | grep -v generated
  lib/auth/staff-roles.ts:31   orderBy: [{ isSystem: "desc" }, …]
  lib/auth/staff-roles.ts:36,47,61,74  select / map only
  lib/auth/staff-roles.ts:190  isSystem: false   (on create)
  → never used in a conditional guard
```

**Recommended fix**

1. In `saveStaff`: reject when the target role's permission set is not a subset
   of the actor's, and reject any change to the actor's own `roleKey`.
2. In `saveStaffRole`: reject `permissionIds` not held by the actor; refuse to
   modify a role where `isSystem === true`; refuse to edit the actor's own role.
3. Guarantee at least one Admin-role holder survives every mutation.
4. Mark `staff.add`, `staff.edit`, `roles.manage` as admin-tier in the role
   editor UI with an explicit warning.

**Regression test:** as a role holding only `staff.edit`, attempt to set your
own `roleKey` to `admin` and to create an admin-role staff member — both must
be rejected.

---

### DSA-04 — `completeRefund` moves real money outside any lock or transaction

```text
ID:           DSA-04
Severity:     HIGH
Title:        Concurrent refund completion can call the payment gateway twice
              for one refund; the unique constraint meant to prevent it is
              consulted only after the money has left
```

**Affected files / functions**

- `lib/refunds/workflow.ts:411-500` → `completeRefund`
- `lib/refunds/workflow.ts:543-589` → `payoutRefund`
- `prisma/schema.prisma:1042` — `payoutRef String? @unique`

**Attacker:** staff holding `refunds.process`, or an accidental double
submission. **Required privileges:** `refunds.process`.

**Root cause**

The money-moving path is a plain read → check → act sequence with **no
`$transaction` and no row lock**:

```ts
const refund = await prisma.refund.findUnique({ where: { id: input.refundId }, … }); // unlocked read
if (refund.status === "COMPLETED") { … return; }          // stale check
const remaining = await refundableRemaining(…);            // unlocked aggregate
if (refund.amount > remaining) return fail(…);
let payoutRef = refund.payoutRef;
if (!payoutRef) {
  const paidOut = await payoutRefund({ … });               // ← REAL GATEWAY CALL, real money
  payoutRef = paidOut.ref;
}
await prisma.refund.update({ … status: "COMPLETED", payoutRef … });
```

Two concurrent calls both read `status: "APPROVED"` and `payoutRef: null`, both
pass every guard, and **both call `payoutRefund`**.

**Why existing controls do not stop it**

This is the interesting part. The schema comment says:

> `/// Gateway refund reference. Unique so a retried complete cannot pay out twice.`

That constraint protects the **sequential retry** case only, and even there the
real protection is the `if (!payoutRef)` guard. In the concurrent case it is
useless: `refundSslcommerzPayment` / `refundBkashPayment` each return a
*different* gateway reference, so the two writes do not collide — and both
target the same row anyway, so last-write-wins. The constraint is evaluated
**after** two real refunds have already been issued.

The same file demonstrates the correct pattern 300 lines earlier —
`applyPaymentRefundStatus` (line 114-115) wraps its work in `$transaction` with
`SELECT … FOR UPDATE`. The money path does not.

**Attack path**

1. Two support staff open the same approved refund and both click "Complete"
   within the same second. (The UI has `disabled={pending}` at
   `admin-refund-detail-modal.tsx:175-198`, but that is a **client-side**
   control and does not bind a direct server-action call.)
2. Both requests pass `status !== "COMPLETED"` and `payoutRef == null`.
3. Two refunds are issued to the customer's bKash / SSLCommerz account.

A malicious insider can do this deliberately in a loop.

**Impact**

Direct, repeatable financial loss. Note the related second-order case: DSA-07
allows several `REQUESTED` refunds to exist on one order, and `completeRefund`
checks `refund.amount > remaining` per refund against an unlocked aggregate, so
two separate refunds can also each pass and together exceed the payment.

**Evidence**

```text
$ grep -n "FOR UPDATE\|\$transaction" lib/refunds/workflow.ts
  114:  await prisma.$transaction(async (tx) => {          ← applyPaymentRefundStatus
  115:    await tx.$queryRaw`SELECT id FROM "Payment" … FOR UPDATE`;
  → completeRefund (411-500) contains neither
```

**Reproduction:** not performed. Demonstrating it would require issuing real
refunds against a payment gateway, which this audit's rules forbid. The defect
is established from the code path; the concurrency window is the full duration
of an outbound HTTP call to the gateway (hundreds of milliseconds), which is
very wide.

**Recommended fix**

Wrap the whole of `completeRefund` in a transaction that begins with
`SELECT id FROM "Refund" WHERE id = $1 FOR UPDATE`, re-read status and
`payoutRef` **inside** the lock, and claim the refund before paying out — e.g.
an atomic `updateMany({ where: { id, status: "APPROVED", payoutRef: null },
data: { payoutStatus: "PROCESSING" } })` and proceed only if `count === 1`.
Keep the existing "already COMPLETED" resync branch.

**Regression test:** fire two `completeRefundAction` calls for one refund
concurrently against a stubbed gateway; assert the stub was invoked exactly
once and the second call returned a failure or an idempotent success.

---

## Medium Findings

### DSA-05 — Public order tracking + sequential order numbers = full order enumeration

```text
ID:           DSA-05
Severity:     MEDIUM
Title:        Unauthenticated, unthrottled tracking lookup over a predictable
              six-digit sequence leaks order volume and courier tracking codes
```

**Affected files / functions**

- `lib/orders/public-tracking.ts:189-224` → `getPublicOrderTracking`
- `lib/orders/public-tracking.ts:145-186` → `listPublicOrdersByPhone`
- `app/(storefront)/track/[orderNumber]/page.tsx:23`
- `lib/orders/order-number.ts` — numbers are `nextval`, i.e. `100001, 100002, …`

**Attacker:** unauthenticated. **Required privileges:** none. `/track` is not in
the middleware matcher and needs no session.

**Root cause**

`getPublicOrderTracking` looks an order up by `id` **or** `number` with no
second factor — no phone, no email, no token:

```ts
where: { OR: [{ id: key }, { number: key }] },
select: { id, number, placedAt, status, shippingMethodLabel, trackingCode },
```

Separately, order numbers were changed to a strict Postgres sequence. Each
change is defensible alone; **together** they turn a tracking page into an
enumeration oracle over the entire order table.

**Attack path**

1. `GET /track/100001`, `/track/100002`, … The found/not-found difference is
   the oracle.
2. Binary-search the highest number that resolves → **exact lifetime order
   count**. Repeat weekly → **orders per week**, i.e. revenue trend.
3. Harvest `trackingCode` for every order.
4. Separately, `listPublicOrdersByPhone` maps a phone number to that person's
   order list. Bangladeshi mobile numbers are a small, dense keyspace
   (`01[3-9]` + 8 digits) and there is no rate limit.

**Why existing controls do not stop it**

There are none on this path — no authentication, no rate limit, and the phone
lookup deliberately exists for guests. The `select` **is** commendably tight:
no name, email, address, items or amounts are returned. That restraint is what
keeps this Medium rather than High.

**Impact**

- Competitive intelligence: precise order volume and growth.
- Courier tracking codes for every order. Whether a tracking code alone yields
  the recipient's name and address depends on the courier's own portal
  (Pathao / Steadfast) — **UNCONFIRMED**, as testing it would mean attacking a
  third party. If it does, this becomes a bulk PII exposure.
- Phone-number oracle: confirm whether a given number belongs to a customer.

**Evidence**

Endpoint confirmed reachable unauthenticated (three probes returned HTTP 200
with a rendered page). A positive hit was **not** demonstrated because the
sequential test orders had been cleaned up and this phase forbids creating
data. The found/not-found branch is unambiguous in the source.

**Recommended fix**

- Require a second factor to view a tracking detail: order number **plus** the
  last 4 digits of the phone, or a per-order unguessable token in the link.
- Rate-limit `/track` by IP **and** by queried key (reuse `consumeBucket`).
- Consider not returning `trackingCode` until the second factor is satisfied.
- If order numbers must stay short and public, decouple them: keep the
  sequential number internal and give the customer a random public reference.

**Regression test:** assert `/track/{n}` without a second factor returns the
same response for an existing and a non-existing order number.

---

### DSA-06 — Wallet adjustment is a lost update

```text
ID:           DSA-06
Severity:     MEDIUM
Title:        Read-modify-write on User.walletAmount inside a transaction but
              without a row lock; balance and ledger diverge
```

**Affected files:** `lib/admin/save-customer.ts:251-311` → `adjustCustomerWallet`
**Attacker:** staff with `customer.edit`.

**Root cause**

```ts
return prisma.$transaction(async (tx) => {
  const existing = await tx.user.findUnique({ where: { id }, select: { walletAmount: true } }); // no lock
  const nextBalance = existing.walletAmount + input.amount;
  if (nextBalance < 0) return fail(…);
  await tx.user.update({ where: { id }, data: { walletAmount: nextBalance } });  // absolute set
  await tx.walletTransaction.create({ data: { amount, balanceAfter: nextBalance, … } });
});
```

`$transaction` gives atomicity, not isolation. Prisma runs at Postgres's default
**READ COMMITTED**, under which two concurrent transactions both read the same
`walletAmount` and both write the same absolute result — one update is lost.

**Impact**

- Two concurrent +500 credits on a balance of 100 → ledger records +1000, but
  `walletAmount` reads 600.
- Two concurrent −100 debits on a balance of 100 both pass the `nextBalance < 0`
  check → 200 deducted from a 100 balance.
- **The `WalletTransaction` ledger and `User.walletAmount` permanently
  disagree**, which is the worst outcome for a money balance: any later
  reconciliation must guess which is right.

**Recommended fix**

`data: { walletAmount: { increment: input.amount } }`, and enforce the floor in
the database rather than in JavaScript — either a `CHECK (walletAmount >= 0)`
or a conditional `updateMany({ where: { id, walletAmount: { gte: -amount } } })`
and treat `count === 0` as insufficient funds.

**Regression test:** fire two concurrent adjustments; assert the final balance
equals the sum of the ledger rows.

---

### DSA-07 — Concurrent refund requests can open several refunds on one order

```text
ID:           DSA-07
Severity:     MEDIUM
Title:        The "a refund is already in progress" guard is an unlocked
              read-then-create
```

**Affected files:** `lib/refunds/workflow.ts:219-300` → `requestRefundForUser`
**Attacker:** any customer with a paid order.

**Root cause**

```ts
const remaining = await refundableRemaining(order.id, payment.amount);   // unlocked
if (!Number.isInteger(input.amount) || input.amount < 1 || input.amount > remaining) …
const open = await prisma.refund.findFirst({ where: { orderId, status: { in: ["REQUESTED","APPROVED"] } } });
if (open) return fail("A refund is already in progress for this order.");
const created = await prisma.refund.create({ … });                       // no transaction, no lock
```

N concurrent requests all observe no open refund and all create one, each for
up to the full remaining amount.

**Impact**

Alone this is a queue-pollution and staff-confusion issue. **Chained with
DSA-04** it is a path to over-refund: several `APPROVED` refunds each pass
`completeRefund`'s unlocked `refund.amount > remaining` check and together
exceed the payment.

**Recommended fix**

Run the check and the create in one transaction with
`SELECT … FROM "Order" WHERE id = $1 FOR UPDATE`, or add a partial unique index:
`CREATE UNIQUE INDEX ON "Refund"("orderId") WHERE status IN ('REQUESTED','APPROVED')`.

---

## Low Findings

**DSA-08 — `/admin/api/order-alerts` POST has no same-origin check.**
`app/(admin)/admin/api/order-alerts/route.ts:25`. Every Server Action in the
app calls `isSameOriginRequest()`; this route handler does not. A cross-site
form POST cannot send `application/json`, so `request.json()` throws, `ids`
falls to `undefined`, and `markStaffOrderAlertsRead` marks **all** the admin's
alerts read. Nuisance only — no data is read or destroyed. Add the same-origin
check and reject non-JSON content types.

**DSA-09 — Address limit is a TOCTOU.** `lib/account/addresses.ts:153-190`.
`count()` then `create()` with no lock; concurrent saves both pass
`existingCount >= ADDRESS_LIMIT`. Impact: a customer stores more than 20
addresses. Fix with a conditional insert or a per-user count constraint.

**DSA-10 — A suspended B2B account can clear its own SUSPENDED state.**
`lib/b2b/applications.ts:128-158`. `applyForB2B` refuses to re-apply unless
`status === "SUSPENDED"`, and then resets the row to `PENDING` and clears
`approvedAt`. A suspended reseller can therefore erase the suspension marker and
re-enter the approval queue looking like a fresh applicant. It does **not**
grant access — staff approval is still required — but it destroys the signal the
approver needs. Keep a separate immutable `suspendedAt` / `suspensionReason`
and surface it on the approval screen.

> **Resolved (AD-335).** The chosen fix was simpler than the one recommended
> above and closes the hole rather than annotating it: **no existing account may
> re-apply, in any state.** `SUSPENDED` is written by exactly one code path —
> `setB2BAccountSuspended`, a staff enforcement action — and the only route back
> to `ACTIVE` is a staff member lifting it, so re-application from `SUSPENDED`
> was never a legitimate transition. A wholesale account now has exactly one
> creation event and every state change after it belongs to staff. A suspended
> buyer is told to contact support rather than being invited into a loop that
> cannot succeed. The check-then-create race is closed by the existing
> `B2BAccount.userId` unique constraint, with P2002 handled. Adding
> `suspendedAt` / `suspensionReason` is still worth doing for the approver's
> benefit, but it is no longer load-bearing. Covered by three checks in
> `npm run test:hardening`.

**DSA-11 — Uploads are validated by extension and client-declared MIME only.**
`lib/media/admin-media.ts:409-430`. No magic-byte inspection; `toDbKind` trusts
`file.type` from the browser. Static serving is extension-driven, which
incidentally limits the damage (an SVG renamed `.png` is served as `image/png`
and will not execute). Defense-in-depth: sniff the content signature and reject
mismatches. Relates to F-02 in `SECURITY_AUDIT.md`.

**DSA-12 — Lock-ordering deadlock. UNCONFIRMED / THEORETICAL.**
`lib/orders/create-order.ts:209-211` locks `ProductStock` rows in cart-item
order. Two concurrent orders containing the same two products in opposite cart
order can deadlock. Postgres detects this and aborts one transaction, so the
outcome is a failed checkout, not corruption. Sort `stockIds` before locking.

**DSA-13 — SMTP host is operator-configurable and dialled server-side.
UNCONFIRMED / THEORETICAL.** `lib/smtp/config.ts`. A holder of `smtp.manage`
could point the host at an internal address and use "send test" as a blind
port probe. Requires an admin-tier permission and yields little; noted for
completeness. Every `fetch()` target in the codebase is a hard-coded constant,
so there is **no SSRF through the HTTP layer** (see below).

**DSA-14 — Coupons have no per-customer usage limit.** `prisma/schema.prisma:1090`
has `usageLimit` and `usageCount` but no per-user cap, and no `CouponRedemption`
table records who redeemed what. One customer can therefore redeem the same
coupon on unlimited orders until the global limit is exhausted — and if
`usageLimit` is null, forever. This may be intended; flagging it because a
percentage-off coupon with no limit is an unbounded discount. Fix by recording
redemptions per user and checking a `perUserLimit`.

---

## Informational Findings

**INF-01 — Coupon usage is not released when an order is cancelled or payment
fails.** `incrementCouponUsage` runs inside the order transaction and nothing
decrements it. This **fails closed** (the coupon is over-consumed, not
under-consumed), so it is a customer-experience and marketing-accuracy issue
rather than a security one. Contrast with DSA-02, where the equivalent omission
fails open.

**INF-02 — Sequential order numbers leak volume even without DSA-05.** Noted
when the sequence was introduced; DSA-05 is what makes it remotely observable.
If DSA-05 is fixed by adding a second factor, this reduces to the original
accepted risk (a customer who places two orders can infer volume between them).

**INF-03 — `consumeAll` keeps consuming buckets after one has already failed.**
`lib/auth/rate-limit.ts:69-80`. A request already rejected on the IP bucket
still burns a count from the email bucket. Errs toward stricter; harmless.

---

## Business Logic Review

| Rule | Verdict |
| --- | --- |
| Product / variant price | **Safe.** Recomputed from the DB inside the order transaction; the browser's value is never read. |
| Discount / sale pricing | **Safe.** `effectiveStorefrontPricing` runs server-side with DB timestamps. |
| B2B pricing | **Safe.** Status and negotiated terms are read inside the same transaction; PENDING/SUSPENDED silently gets retail. |
| B2B minimum quantity | **Safe.** Enforced server-side at `create-order.ts:337`. |
| Quantity bounds | **Safe.** Integer, `>= 1`, `<= MAX_LINE_QTY`; negative and zero rejected. |
| Shipping charge | **Safe.** `resolvePersistedShippingRate` from DB by method + area + weight. |
| Tax | Hard-coded `0`. Not a vulnerability; note it before launching taxed regions. |
| Coupon validity, min spend, window | **Safe.** Re-resolved server-side at order time. |
| Coupon usage limit | **Safe under concurrency** — atomic conditional `updateMany`. One of only three correct counters in the codebase. |
| Coupon per-customer limit | **DSA-14** — does not exist. |
| Order total | **Safe.** `subtotal - discount + shipping + tax`, all server-computed, floored at 0. |
| Currency | **Safe.** Hard-coded `"BDT"` on every write. |
| Order / payment status | **Safe from the customer.** No customer-reachable action mutates either. |
| Stock availability | **DSA-01** — not accumulated across lines. |
| Stock reservation | **DSA-01** (lost update) and **DSA-02** (never released). |
| Cart ownership | **Safe.** Resolved by `userId` from the session. |
| Duplicate cart lines | Permitted by design (colour variants) — the trigger for DSA-01. |
| Refund eligibility, window, amount | **Safe** in isolation; **DSA-07** under concurrency. |
| Refund payout | **DSA-04.** |
| Wallet | **DSA-06.** |

---

## Authorization Matrix

| Surface | AuthN | AuthZ | Same-origin | Verdict |
| --- | --- | --- | --- | --- |
| Storefront public pages | — | — | — | OK |
| Customer pages (`/account/*`) | Middleware + page guard | Session-scoped queries | n/a | OK |
| B2B pages (`/b2b/*`) | Per-page guard (all 12 verified) | `ACTIVE` status re-checked at the data layer | n/a | OK — but no middleware backstop (F-10) |
| Customer server actions (35) | `getCustomerSession` | `userId` from session, never from input | Yes, except `ticket-actions.ts` | OK |
| Admin pages (165) | `requireStaffSession` | `canAccessAdminPath` on a middleware-set header | n/a | OK |
| Admin server actions (193) | `getStaffSession` | Permission per action | Yes, all | OK — but see **DSA-03** for what a permission may grant |
| `/admin/api/b2b-documents` | Yes | `customer.b2b.view` | n/a (GET) | OK |
| `/admin/api/order-alerts` | Yes | Self-scoped by `staffId` | **No** | **DSA-08** |
| Payment callbacks (4) | n/a (gateway) | Server-side validation API | n/a | OK |
| `/track/*` | **None by design** | **None** | n/a | **DSA-05** |
| Feeds (2) | None by design | None | n/a | OK — public catalogue data only |

**Vertical escalation:** found — DSA-03 (three vectors).
**Horizontal escalation between staff:** none found.
**Customer → staff:** none found.
**Customer → B2B:** none found; `applyForB2B` hard-codes `status: "PENDING"`,
accepts no pricing fields, and takes `userId` from the session.

---

## Race Condition Review

| Path | Protection | Verdict |
| --- | --- | --- |
| Order placement — cart | `$transaction` + `SELECT … FOR UPDATE` on `Cart` | **Correct** |
| Order placement — stock across transactions | `FOR UPDATE` on each `ProductStock` | **Correct** |
| Order placement — stock within one transaction | none needed, but snapshot is reused | **DSA-01** |
| Order number allocation | `nextval` sequence | **Correct** |
| Coupon redemption | Atomic conditional `updateMany` | **Correct** |
| Payment transition | `$transaction` + `FOR UPDATE` on `Payment` + duplicate-ref check | **Correct** |
| Refund → payment status sync | `$transaction` + `FOR UPDATE` | **Correct** |
| **Refund payout** | **none** | **DSA-04** |
| **Refund request** | **none** | **DSA-07** |
| **Wallet adjustment** | `$transaction`, **no row lock**, absolute write | **DSA-06** |
| Address limit | none | DSA-09 |
| OTP attempts | Atomic `{ increment }` | **Correct** |
| Login rate limit | Atomic conditional `updateMany` | **Correct** |
| Session cap | Prune after insert — can briefly exceed the cap | Acceptable |

**The pattern to take away:** the codebase contains exactly **three** atomic
counter updates (`rate-limit.ts:64`, `coupons.ts:412`, `otp/challenge.ts:184`),
and every one is correct. Every counter *outside* that set — `reserved`,
`walletAmount`, the refund payout guard — is a read-modify-write with an
absolute value, and every one of those is a finding. A single lint rule
forbidding absolute writes to counter columns would have caught DSA-01, DSA-04
and DSA-06.

---

## Payment State Machine Review

Re-verified independently. No invalid transition found.

| Transition | Guard | Verdict |
| --- | --- | --- |
| `PENDING → PROCESSING` | `preparePaymentStart`, idempotency key | OK |
| `PENDING → PAID` | Gateway **validation API** called server-side; status, `store_id`, currency, and amount matched against **both** `payment.amount` and `order.totalAmount`; duplicate `transactionRef` rejected; `FOR UPDATE` | OK |
| Browser return URL → PAID | **Explicitly refused** — `sslcommerz/return/route.ts` only redirects | OK |
| `PAID → FAILED` | `rejectGatewayPayment` refuses when `status === "PAID"` | OK |
| `PAID → REFUNDED / PARTIALLY_REFUNDED` | `paymentTransitionError` + `FOR UPDATE` | OK |
| Callback replay / duplicate | Duplicate `transactionRef` rejected | OK |
| Payment for another user's order | Order resolved by `number` from the gateway payload; amount+currency+provider must match | OK |
| Amount / currency mismatch | Rejected | OK |
| Unsigned IPN | Signature checked when present; authority is the server-side validation call, not the payload | OK |

The **refund** half of the machine is where the defect is (DSA-04), not the
payment half. The first audit's assessment of the payment path holds.

---

## File Upload Review

`upload → validation → storage → database → retrieval → response headers`

| Stage | Admin media (`public/uploads`) | B2B KYC (`private-uploads`) |
| --- | --- | --- |
| Who | Staff with `media.upload` | Any customer (self-service application) |
| Extension | Allowlist incl. **`.svg`** | Allowlist, **no SVG** |
| Content / magic bytes | **No** (DSA-11) | **No** (DSA-11) |
| Size | 5 MB, max 20 files | 8 MB |
| Filename | `randomUUID()` + ext — traversal impossible | `randomUUID()` + ext |
| Location | Inside `public/` — web-served | **Outside** `public/` — not web-served |
| Retrieval | Static, no auth | Authenticated route, `customer.b2b.view`, key regex-validated |
| Headers | Only `Content-Type` — no `nosniff`, no `Content-Disposition` (F-01/F-02) | `Cache-Control: private, no-store` |

The **customer-reachable** upload path (B2B KYC) is the better-designed of the
two: no SVG, stored outside the web root, retrieval gated. The riskier path
requires staff privilege. No new IDOR: media IDs are not user-addressable, and
`readB2BDocument` validates the key against `/^[a-f0-9-]+\.(jpg|jpeg|png|webp|pdf)$/i`
before touching the filesystem.

---

## Session Review

The brief's key question — *if a role, permission, B2B status or account status
changes, can an existing session still use the old privilege?* — **No.**

- `getStaffSession` (`lib/auth/staff-session.ts:74-130`) joins
  `staff → role → permissions` on **every request**. A permission removed in
  the admin takes effect on the staff member's very next request.
- `staff.status !== "ACTIVE"` revokes **all** that member's sessions
  immediately.
- Customer sessions re-read `user.status` per request and revoke on non-ACTIVE.
- B2B status is never cached in the session — `create-order` and
  `getMyB2BPriceList` both re-read `B2BAccount.status` at use time, inside the
  transaction in the order case.
- The JWT carries **only** the opaque token (`session-jwt.ts` payload `{ tok }`).
  No authorization data is trusted from it. Confirmed by reading the sign and
  verify functions.

No session fixation: every login mints a fresh 32-byte token. Password change
revokes all other sessions and re-issues the current one.

---

## API / Server Action Review

Second, deeper pass over the 193 admin actions and 35 customer/B2B actions.

- **Guard coverage:** re-confirmed. Every admin action reaches a permission
  check, either directly or through a file-local `guard()` / `actorOrReject()` /
  `actor()` / `staffForGateway()` helper. The scripted sweep initially flagged
  13 actions; reading each showed all 13 delegate to a guarded helper or to
  another guarded action.
- **Authorization before mutation:** yes in every case examined.
- **Defence repeated at the data layer:** yes for customer resources — the
  `lib/` functions independently re-scope by session `userId` rather than
  trusting the action.
- **Trusted IDs:** no customer-supplied `userId` / `customerId` is ever used to
  scope a query. `notification-actions.ts` is the model: the action takes the
  id from the session and passes it down.
- **Same operation via another action:** checked. `deal-actions.ts` exposes
  three thin wrappers that all funnel into one guarded action — correct.
- **Mass assignment:** only one spread reaches a Prisma `data` object
  (`addresses.ts:171,183`), and it spreads `parse()`'s output — an explicit
  allowlist of ten scalar fields — not raw input. No action accepts `role`,
  `permissions`, `status`, `isAdmin`, `verified`, `balance`, `discount`,
  `price`, `isApproved`, `userId` or `customerId` from the client. **The
  privilege problem in DSA-03 is not mass assignment** — `roleKey` is a
  legitimate, intended parameter that simply lacks a containment rule.

---

## Previously Audited Controls Re-verified

Independently re-checked rather than assumed:

| Prior claim | Re-verified? |
| --- | --- |
| 193 admin actions all authorized | **Holds.** Re-swept with a different method; 13 false positives resolved by reading. |
| No IDOR | **Holds** for customer resources. But see DSA-05 — public tracking is not an IDOR (it is public by design) and was outside the earlier IDOR sweep. |
| SQL injection safe | **Holds.** All `$queryRaw` are tagged templates; no `Prisma.raw`, no `*Unsafe`. |
| XSS handled | **Holds, and extended.** The admin panel contains **no** HTML sink, no `innerHTML`, no `srcDoc`, no `eval` — so customer-supplied text (tickets, complaints, reviews, names) cannot reach an admin as markup. Customer→admin stored XSS is not possible. |
| Payment verification strong | **Holds** for the payment half. The refund half is DSA-04. |
| `npm audit` clean | **Holds** — 0 across the full tree. |
| Session model sound | **Holds**, and the permission-freshness question resolves positively. |
| No SSRF | **Confirmed.** Every `fetch()` target is a hard-coded constant selected by a boolean (`live`). Only the SMTP host is operator-configurable (DSA-13). |

---

## Areas With No Finding

- **Order pricing and totals** — the strongest code in the application.
- **Payment confirmation and state machine** (refund payout excepted).
- **Customer IDOR surface** — orders, tickets, refunds, addresses, notifications
  all scoped by session `userId` at the data layer.
- **B2B privilege boundary** — no customer→B2B escalation, no status bypass, no
  negotiated-price exposure to non-ACTIVE accounts.
- **KYC document access** — correctly designed.
- **Mass assignment** — none found.
- **SSRF via HTTP** — none.
- **Admin-panel XSS** — no sinks at all.
- **OAuth** — state CSRF handled; provider identity bound to the cookie.
- **OTP** — CSPRNG, hashed, expiring, single-use, attempt-capped, send-limited.
- **Cross-staff horizontal escalation** — none found.

---

## Recommended Remediation Order

**Fix before the next order is placed**

1. **DSA-01** — accumulate availability per stock row; use `{ increment }`.
   Add `CHECK (reserved <= quantity)`. *Small change, currently corrupting data
   on every multi-colour order.*
2. **DSA-02** — release `reserved` on cancel / payment failure; decrement
   `quantity` on delivery; add a sweeper for stale PENDING orders.

**Fix this week**

3. **DSA-04** — lock and claim the refund before calling the gateway.
4. **DSA-03** — add the permission-subset rule, protect `isSystem` roles, block
   self-promotion.
5. **DSA-06** — atomic `{ increment }` on `walletAmount` + a DB floor.

**Fix this month**

6. **DSA-05** — second factor and rate limit on `/track`.
7. **DSA-07** — partial unique index on open refunds per order.
8. DSA-08 … DSA-14.

**Note on sequencing:** DSA-01 and DSA-02 are the same subsystem and should be
fixed together in one change with one migration, or the `CHECK` constraint added
for DSA-01 will start rejecting writes on already-corrupted rows.

---

## Residual Risk

- **Data already corrupted.** DSA-01 and DSA-02 have been live for as long as
  colour variants and cancellations have existed. Fixing the code does not
  repair `ProductStock`. Plan a one-off reconciliation that recomputes
  `reserved` from open orders before enabling any `CHECK` constraint.
- **Findings carried over from `SECURITY_AUDIT.md` are unchanged** — in
  particular F-01 (no security headers) and F-02 (inline SVG), which amplify
  DSA-03: a staff account escalated to Admin gains the Custom Scripts box, and
  with no CSP that is unrestricted JavaScript on every storefront page.
- **Concurrency findings are probabilistic.** DSA-04, DSA-06 and DSA-07 may
  never have fired in production, or may have fired and been written off as
  accounting noise. Absence of complaints is not evidence they are safe.
- **Not modelled:** the courier portals' own authorization (relevant to DSA-05),
  the gateways' server-side idempotency (which may partially blunt DSA-04 —
  unknown, and not something to rely on), and infrastructure.

---

## Audit Limitations

- **No application code was modified.** No fixes applied.
- **No exploit was executed end to end.** DSA-04 would require issuing real
  refunds; DSA-02 would require poisoning real inventory; DSA-05's positive-hit
  demonstration would require creating an order. All were ruled out by this
  phase's own rules. Every "CONFIRMED" above means *confirmed from the complete
  code path*, with DSA-01 additionally confirmed by an executable arithmetic PoC.
- **No live penetration testing, fuzzing, or authenticated crawling** of the 165
  admin pages. Admin coverage came from the 193 server actions and the route→
  permission map, which is where the mutations live — but a page-level issue
  that bypasses both would not have been seen.
- **Concurrency was reasoned about, not measured.** I did not run parallel load
  against the database to observe interleaving; Postgres isolation semantics
  under Prisma's default READ COMMITTED were applied analytically.
- **The database was not queried directly** — credential access was unavailable
  in this environment — so all schema reasoning comes from
  `prisma/schema.prisma` and the migration history, not from the live catalog.
- **Third-party behaviour was not tested** (courier portals, payment gateways,
  SMTP endpoints). Claims touching them are labelled UNCONFIRMED.
- Temporary PoC scripts were written outside the application source and deleted;
  their full content is reproduced inline under DSA-01.
```

---

# Addendum — Phase 0 Re-Audit (2026-09-13)

Re-audit before remediation, per the remediation brief. No application code was
modified. Focus was ground neither earlier pass covered: the OAuth identity
layer, the admin route-group boundary, and OTP enforcement uniformity.

All 14 findings above were re-verified as still present — no application file has
been modified since the audit (confirmed with `find -newermt`).

## New findings

### P0-01 — Pre-registration account hijack via OAuth email auto-linking · **HIGH**

**Files:** `lib/social/oauth-login.ts:50-63`, `lib/auth/customer-auth.ts:53-146`
**Attacker:** unauthenticated; needs only the victim's email address.

Registration **never verifies the email address.** `registerCustomer` creates the
account with `status: "ACTIVE"` immediately; the OTP challenge, when enabled, is
sent to the *phone*, not the email. `User.emailVerifiedAt` exists in the schema
but no code path ever sets it (see P0-05).

Separately, `completeSocialLogin` links a new provider identity into any existing
account that shares the email:

```ts
const existingUser = await prisma.user.findUnique({ where: { email }, … });
if (existingUser) { … userId = existingUser.id; }        // :51-63
await prisma.socialLoginAccount.create({ provider, providerAccountId, userId });
```

**Attack path**

1. Attacker registers on Techno House with `victim@gmail.com` and a password of
   their choosing. No proof of email ownership is required. (Registration is
   rate-limited per IP, and that limit is bypassable — `SECURITY_AUDIT.md` F-04.)
2. The real victim later clicks "Sign in with Google" using that same address.
   Google asserts `email_verified: true`, so the guard at line 44 passes.
3. The victim's Google identity is linked **into the attacker's account**.
4. The victim then uses that account normally — filling it with their real name,
   phone, delivery addresses and order history — while the attacker retains the
   password and can sign in at any time.

This is the documented *classic-federated merge* variant of pre-hijacking. The
`emailVerified` guard does not help: it proves the **victim** owns the email, not
that the pre-existing account does.

**Why existing controls do not stop it.** The account-linking decision trusts
`User.email` as an identity assertion, but nothing in the registration flow ever
established that the account holder controls that address.

**Recommended fix (for a later approved phase)**

- Do not auto-link on email alone. When an unlinked provider identity matches an
  existing account, require proof of control of that account first — sign in with
  the password, or confirm a link sent to the email.
- Implement email verification at registration and populate `emailVerifiedAt`;
  auto-link only when both sides are verified.
- Notify the account owner whenever a social identity is linked.

---

### P0-02 — Facebook: "has an email" is treated as "email is verified" · **MEDIUM** · UNCONFIRMED

**File:** `lib/social/oauth-providers.ts:140-147`

```ts
// Facebook's Graph API only ever returns an email it has confirmed —
// there is no separate "verified" flag to check, unlike Google.
emailVerified: Boolean(profileData.email),
```

Google is handled correctly (`Boolean(profileData.email_verified)`, line 91).
The Facebook branch substitutes presence for verification. The comment's premise
— that Facebook only ever returns confirmed emails — is not a guarantee Facebook
documents, and standard OAuth guidance is not to auto-link accounts on a Facebook
email precisely because no verification claim is available.

If the premise is wrong even in edge cases (accounts created by phone, legacy
accounts, unconfirmed address changes), this collapses P0-01 into a direct
one-step takeover: register a Facebook account on the victim's email, sign in,
get linked into their Techno House account.

**UNCONFIRMED** — confirming it would require testing Facebook's own behaviour,
which is out of scope. The fix is the same as P0-01 and does not depend on
resolving the question: stop auto-linking by email.

**Conditional:** only live if Facebook login is enabled in Admin → Social Logins.

---

### P0-03 — Social sign-up cannot produce a usable session · **MEDIUM (reliability)**

**Files:** `lib/social/oauth-login.ts:65-75`, `lib/auth/customer-session.ts:107-111`

A user created through OAuth is written with `passwordHash: null`. But session
resolution treats a null password hash as a disabled account and revokes
everything:

```ts
if (row.user.status !== "ACTIVE" || !row.user.passwordHash) {
  await revokeAllCustomerSessions(row.user.id);
  await clearCustomerSessionCookie();
  return null;
}
```

A brand-new social user is therefore signed in by the callback and signed out
again on their very next request. **Social sign-up is broken for new users.**

This *fails closed*, so it is not itself a vulnerability — but it is
security-relevant twice over. First, it explains why P0-01 works specifically
against pre-registered accounts: those have a password hash, so the link
succeeds. Second, the obvious "fix" — deleting the `!passwordHash` check — would
silently weaken the disabled-account path. The correct fix distinguishes "no
password set" from "account disabled" (e.g. allow the session when a linked
social account exists).

**Conditional:** only observable if a social provider is enabled.

---

### P0-04 — OTP on login/registration is silently skipped for accounts with no phone · **MEDIUM**

**Files:** `lib/auth/customer-auth.ts:193` and `:104`

```ts
if (otpConfig.otpLogin && user.phone) { … }          // login
if (otpConfig.otpRegistration && phone) { … }        // registration
```

When an operator enables "OTP on login", it applies only to accounts that happen
to have a phone number on file. Phone is optional at registration
(`emptyPhoneToNull`), so an account without one authenticates with a password
alone — with no warning to the operator and no indication in the admin UI.

An attacker holding a stolen or credential-stuffed password needs only for the
target account to lack a phone number. This is a policy-enforcement gap rather
than an attacker-triggered bypass, but the control is not uniform and the
operator cannot see which accounts are exempt.

**Fix:** either refuse sign-in without a second factor while the policy is on
(forcing phone enrolment), or surface the exempt-account count in the OTP
settings screen so the gap is visible.

---

### P0-05 — `emailVerifiedAt` is never set; the admin "Verified" filter is permanently empty · **LOW**

**Files:** `lib/admin/load-customers.ts:126,157,179,220-230`,
`lib/auth/customer-auth.ts:400`

The schema, the admin list column and the admin filter all model a
verified-email state, but the **only** write anywhere in the codebase *clears*
it (on email change). Nothing sets it. Every customer therefore reads as
unverified, the "Verified" filter returns nothing, and staff have a field that
looks like a trust signal but carries none. This is the root cause of P0-01's
first half.

## Re-verified negative results (new ground, no finding)

- **Admin route-group boundary.** Only four things live outside
  `app/(admin)/admin/(panel)/`: the obscured login gate, the legacy
  `/admin/login` stub, and the two API routes — both of which perform their own
  session and permission checks. Every real admin page inherits the
  `canAccessAdminPath` gate.
- **Permission map defaults to deny.** `permissionKeysForAdminPath` returns `[]`
  for an unmatched path and `hasAnyPermission` returns `false` for an empty key
  list, so an unmapped admin route is inaccessible rather than open.
- **Login hardening.** Dummy-hash timing equalisation, identical error text and
  the account-status check are all correct; no user enumeration.
- **OAuth state CSRF.** Unchanged and correct — 24-byte CSPRNG state in an
  httpOnly cookie, compared against the callback parameter with the provider
  identity bound alongside.
