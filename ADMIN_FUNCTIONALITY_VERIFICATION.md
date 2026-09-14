# Admin Functionality Verification

**Date:** 2026-09-13
**Scope:** Phase 17 of the remediation brief — classify every admin surface as
fully functional / intentionally read-only / incomplete / fake / dead / a
security risk.
**Type:** Audit. **No code was changed.**

## Why this exists alongside `ADMIN_FUNCTIONALITY_AUDIT.md`

That document, written at the close of a previous engagement, states:

> All ~140 routes under `/admin/**` are real, database-backed, and auth-gated.

That is **true as far as it goes** — and this pass confirms the auth-gating and
the persistence. But "database-backed" and "functional" are not the same claim,
and for one whole settings group they come apart: the values save, reload into
the form correctly, and are then read by nothing else in the application.

This engagement has already found several confident claims in this codebase
that did not survive checking — `Role.isSystem` was never read as a guard,
`emailVerifiedAt` was never written, and a schema comment asserted that a
unique constraint "prevents a retried complete paying out twice" when it was
only consulted after the money had already moved. So the useful work here was
verifying the central claim rather than re-cataloguing 165 pages.

## Method

1. Enumerated all 165 admin pages and the 94 route→permission rules.
2. Traced every runtime import from a `*-mock` module into admin code.
3. For every admin-configurable settings getter, searched for a consumer
   outside the admin panel — then followed one level of indirection, because
   several are read through a sibling or wrapper function.
4. Verified each remaining candidate by hand.

**A correction to my own method, recorded because it changes how much to trust
the numbers:** my first scan searched `lib`, `features` and `app` but omitted
`components/`, and reported "12 of 29 settings have no effect". That was wrong —
`getStorefrontAnalyticsTags` is consumed from `components/analytics/`. The
figures below come from the corrected scan plus individual verification.

## Verdict summary

| Classification | Count | Notes |
| --- | --- | --- |
| Reachable and auth-gated | **165 / 165** | Every page has a permission rule; unmapped routes deny by default, and there are none |
| Genuinely persist-only | **5 sections** | Pickup, invoice, tracking, label, printer — now labelled in the UI; see F17-01 |
| Dead code | **1 function** | `getOtpFeatureFlags` — see F17-03 |
| Fake data source | **1** | Delivery-boy list — see F17-04 |
| Deferred by design | **2** | Firebase, reCAPTCHA — documented in the schema |
| Security risk | **0** | Nothing found beyond what the security audits already cover |

---

## F17-01 — Store Operations settings are persist-only · **Medium (business impact)**

**Affects:** `/admin/settings/orders`, and the tax, pickup-points, invoice,
order-tracking, shipping-label and thermal-printer sections.

Everything an admin enters here is validated, saved, audit-logged and read back
correctly. **Nothing else in the application ever reads it.**
`getStoreOperationsSettings()` is the module's only reader, and it has zero
consumers outside the admin panel.

The clearest consequence is tax. `lib/orders/create-order.ts:426`:

```ts
const taxAmount = 0;
```

So a VAT rate saved in Admin → Settings has **no effect on any order total**.
The field accepts a percentage, validates it, stores it as basis points, and
the checkout charges zero regardless.

The same holds for the rest of the group: pickup points are not offered at
checkout, the invoice settings do not reach the invoice view, the order-tracking
and shipping-label settings do not reach the courier flow, and the thermal
printer settings are not consulted when printing.

**This is not a bug in the save path** — that works exactly as written. It is a
missing read path, and the risk is that the screens look authoritative. An
operator who sets a 5% VAT rate has every reason to believe orders now carry
5% VAT.

**Recommendation:** either wire the values through (tax is the one with real
financial consequence) or mark the sections clearly as not-yet-applied in the
UI. Do not leave them looking live.

> **Resolved (AD-333, AD-335).** Both halves of that recommendation were taken,
> split by whether wiring was a missing function call or a product decision.
>
> **Wired, each with a default that is an exact no-op**, so nothing changes
> until an operator sets a value:
>
> | Setting | Where it now acts | Default |
> | --- | --- | --- |
> | VAT rate + inclusive/exclusive | `create-order`, via `computeOrderTax` | 0% — no tax |
> | Service charge | `create-order`, on its own `Order.serviceChargeAmount` column | 0 — none |
> | Minimum order amount | `create-order`, refused server-side | 0 — no minimum |
> | Auto-confirm paid orders | `applyPaymentTransition`, guarded on `status: PENDING` | off |
>
> The checkout summary now derives its displayed total with the **same pure
> functions** the server charges with, which closes a gap the VAT wiring opened
> on its own: the summary previously computed `subtotal − discount + shipping`
> independently, so an exclusive VAT rate would have quoted one figure and
> charged another.
>
> **Flagged, not wired** — pickup points, invoice, order tracking, shipping
> label and thermal printer each carry a visible "Saved but not yet applied"
> notice on their admin screen. These are not missing function calls: there is
> no pickup flow at checkout to attach a pickup point to and no print feature
> for a label size to configure. The notice exists because the failure mode is
> silent — a screen that saves successfully is indistinguishable from a screen
> that works.
>
> **Deliberately not wired:** `orderCodePrefix`. Order numbers are issued from
> the `order_number_seq` Postgres sequence as bare digits by explicit design
> (`lib/orders/order-number.ts`). Applying the stored prefix — which defaults to
> `"TH-"` — would change the format of every future order number without anyone
> having asked for it. The field carries an inline "Not applied" hint instead.
>
> Covered by `npm run test:tax` (35 checks).

---

## F17-02 — Currency format settings are persist-only · **Low**

**Affects:** `/admin/settings/currency`

`getCurrencyFormat()`'s only consumer is the admin page that renders the form.
`formatMoney` (`lib/format/currency.ts`) uses a fixed `CURRENCY_SYMBOL` constant
and `toLocaleString("en-US")`, so symbol, placement and decimal settings do not
change a single rendered price.

Lower impact than F17-01 because the store is BDT-only in practice, but the
screen implies otherwise.

---

## F17-03 — `getOtpFeatureFlags` is dead code · **Informational**

`lib/otp/config.ts:106`. Zero consumers anywhere — including inside the admin
panel. `getAdminOtpConfig()` is the function actually used by
`lib/auth/customer-auth.ts`.

Harmless, but it is the kind of function someone later edits believing it
controls OTP behaviour. Safe to delete; nothing imports it.

---

## F17-04 — The delivery-boy list is hardcoded, and stored in a text field · **Low**

**Affects:** `/admin/orders/[id]`, and the order quick-edit modal.

Two separate issues, and the first is less bad than it looks:

1. **It does persist.** `updateAdminOrder` takes the selected name and writes it
   into `Order.staffNotes` as a `Delivery: <name>` line, stripping any previous
   one; the UI parses it back out on read. So an assignment survives a reload.
2. **The list of names is fiction.** `MOCK_DELIVERY_BOYS` in
   `lib/admin/orders-mock.ts` is four hardcoded names — `Karim Ali`,
   `Rafiq Hossain`, `Nayeem Khan`, `Sajid Rahman`. An operator cannot add their
   own riders, so the feature is unusable for a real delivery team.
3. **There is no `deliveryBoy` column.** Storing it inside free-text
   `staffNotes` means a staff member editing notes can corrupt the assignment,
   and it cannot be filtered, grouped or reported on.

**Recommendation:** a `DeliveryAgent` table and an `Order.deliveryAgentId`
column. Until then the dropdown should not imply a real roster.

---

## F17-05 — Firebase and reCAPTCHA settings are deferred by design · **Informational**

`getAdminFirebaseConfig` and `getAdminRecaptchaConfig` have no consumers outside
the admin panel. Unlike F17-01 this is **already documented** — the schema
comment on `RecaptchaConfiguration` says "Widget/verify wiring is deferred".

Recorded here only so a future audit does not re-report it as a discovery.

---

## Verified working — do not re-investigate

These looked like candidates in a first pass and are **not** findings. Each is
read by the storefront through a sibling or wrapper function, which a naive
grep for the admin getter misses:

| Setting | Reached by |
| --- | --- |
| Analytics (GA4 / GTM / Meta Pixel) | `getStorefrontAnalyticsTags` → `components/analytics/storefront-analytics.tsx` |
| Custom Scripts | `getStorefrontCustomScripts` → storefront layout |
| Theme / colours / fonts | `getStorefrontThemeCss`, `getAuthPageTheme` |
| Home banners | `getStorefrontHomeBanners` → `features/home/home-page.tsx` |
| Filesystem / storage driver | `getActiveStorageDriver` → B2B document upload |
| Admin nav theme | Admin-only **by design** — it themes the admin panel |

Also confirmed sound: all 165 pages carry a permission rule; the 14 runtime
imports from `*-mock` modules are, with the single exception of
`MOCK_DELIVERY_BOYS`, importing helper functions and constants that merely live
in badly-named files (`folderLabel`, `NOTE_TYPES`, `FEATURE_PERMISSION_GROUPS`,
`categoryPathLabel`). Those filenames are misleading and worth renaming, but the
code behind them is real.

## Known from earlier work, restated for completeness

- **PC Builder settings are persist-only by explicit operator choice**
  (`project-memory/PROJECT_STATE.md`, AD-275). The live builder still shows
  every slot regardless of the admin toggles. Not a new finding.

## Limitations

- Classification is based on tracing read paths in source, not on exercising
  all 165 screens in a browser. A setting could in principle be consumed
  through dynamic access that a symbol search would not see; nothing in this
  codebase's style suggests that, but it was not ruled out empirically.
- "Fully functional" here means the save path works and the value is consumed
  somewhere real. It does not mean each feature's behaviour was tested against
  its intended business rule.
- Admin **pages** were classified by their data and action wiring. Individual
  UI controls within a page (a button that renders but does nothing) would not
  necessarily surface, apart from the delivery-boy case which came up via the
  mock-import trace.
