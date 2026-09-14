# Admin Real-Functionality Development Plan

## Project Goal

Convert the remaining fake/mock admin functionality into production-ready, database-backed functionality without breaking any existing working features.

### Critical rules

- Never show a success toast unless the operation actually succeeds and persists.
- Never replace working functionality with mock behavior.
- Reuse existing repository/service/server-action patterns where possible.
- Validate all mutations server-side.
- Respect existing authentication, authorization, validation, audit/logging, and error-handling conventions.
- Do not invent new business rules when an existing implementation already defines them.
- Every phase must be tested before moving to the next phase.
- After each phase, update `TASK_STATE.md` with completed work, tests, known issues, and the next phase.
- Prefer small, reversible changes over large rewrites.
- Do not silently change storefront behavior unless the phase explicitly requires it.
- If a feature is intentionally unavailable, show an honest "Not available yet" / "Coming soon" state instead of a fake success message.

---

# Phase 0 — Baseline Audit & Safety Check

## Objective

Create a reliable baseline before changing the admin system.

## Tasks

1. Inventory every item listed in this document.
2. Trace each route from UI → server action/API → repository/service → Prisma/database.
3. Identify:
   - existing database models
   - existing migrations
   - existing server actions
   - existing repositories
   - existing validation schemas
   - existing permissions
   - existing tests
4. Confirm which functionality is genuinely working before modification.
5. Create/update `TASK_STATE.md`.
6. Run the existing project checks:
   - TypeScript
   - ESLint
   - relevant tests
   - payment tests if available
   - production build if practical

## Exit Criteria

- Baseline is recorded.
- No existing working functionality is knowingly removed.
- A phase-by-phase implementation map exists.

---

# Phase 1 — Real Admin Settings Saves

## Priority

🔴 Highest priority.

## Reason

These pages currently give the admin the impression that settings were saved even when the save is only a mock/toast.

## Scope

Fix all of these:

- `/admin/settings/orders`
- `/admin/settings/tax`
- `/admin/settings/pickup-points`
- `/admin/settings/invoice`
- `/admin/settings/tracking`
- `/admin/settings/shipping-label`
- `/admin/settings/thermal-printer`

Also inspect the shared settings component used by these routes so the fix is architectural where appropriate rather than seven duplicated implementations.

## Tasks

For each setting:

1. Identify the intended database source of truth.
2. If the schema already exists:
   - implement the real read path if necessary
   - implement the real save/update action
   - validate input server-side
   - enforce admin permissions
3. If schema does not exist:
   - design the smallest appropriate model/config structure
   - create Prisma migration
   - use the project's existing configuration conventions
4. Replace hardcoded `onSave` handlers.
5. Remove mock success messages.
6. Return real mutation errors to the UI.
7. Reload the setting from the database after saving.
8. Verify persistence after page refresh.
9. Verify invalid input cannot corrupt configuration.
10. Preserve existing UI/UX unless a change is required for correctness.

## Special Check

`shipping-label` contains some real functionality. Do not rewrite working file behavior unnecessarily; only make the identified fake siblings real.

## Verification

For every route:

- Open page.
- Load current DB value.
- Change value.
- Save.
- Confirm real success.
- Refresh page.
- Confirm value remains.
- Restart/reload application if practical and confirm persistence.
- Test validation/error state.
- Confirm no fake toast remains.

## Exit Criteria

All seven settings pages have genuine persistence and verified reload behavior.

---

# Phase 2 — Deals, Refund Reasons & Promotion Assignment

## Scope

### Deals

- `/admin/deals/new`
- `/admin/deals/[id]`

Current problem:
- create/edit reports mock success.

Required:
- real create
- real update
- real validation
- real persistence
- real error handling
- real reload/edit behavior

The existing deals list toggle is already real. Preserve it.

### Refund Reasons

- `/admin/refunds/reasons/new`

The reasons list is real. Implement the missing create flow against the same data source.

Verify:
- create
- list visibility
- edit/delete if already supported by the existing design
- validation
- duplicate handling if required by existing schema/business rules

### Promotion Products

- `/admin/promotions/products`

Replace hardcoded assigned-product arrays with real database-backed assignment.

Verify:
- existing assignments load
- assign product
- remove product
- refresh persistence
- inactive/nonexistent products are handled correctly

### Category Discounts

- `/admin/promotions/category-discounts`

Replace hardcoded discount percentages and dates with real persisted values.

Verify:
- create/update
- category association
- percentage validation
- date validation
- persistence
- edit/reload
- conflict/overlap behavior according to existing business rules

## Exit Criteria

All four areas perform real CRUD/mutation operations and no mock-save messaging remains.

---

# Phase 3 — Fully Fake Admin Pages

## Scope

Convert these mock pages into real database-backed functionality:

- `/admin/units`
- `/admin/warranty`
- `/admin/notes`
- `/admin/labels`

## Important

Do not confuse warranty presets with product-level warranty.

The existing product-level warranty functionality is real. This phase concerns the preset manager.

## Tasks

For each page:

1. Determine whether a corresponding Prisma model already exists.
2. Reuse existing models if available.
3. Otherwise create the required schema/migration.
4. Implement:
   - list
   - create
   - edit
   - delete/archive according to existing UX
   - search/filter if the existing page provides it
5. Add server-side validation.
6. Add permission checks.
7. Replace mock arrays.
8. Replace fake save toasts.
9. Verify persistence after refresh.

## Exit Criteria

Each page is backed by real persistent data.

---

# Phase 4 — Product & Catalog Fake Actions

## Scope

Audit and implement fake buttons on real pages.

### Product form

Investigate and implement where supported:

- Import product
- Product duplicated
- New category
- New brand
- Barcode generated
- Temp data cleared
- New flash sale
- Add frequently bought item

### Product list

- Product cloned

### Category list

- Featured category toggle
- Hot category toggle

## Method

Do not blindly implement every button.

For every action:

1. Trace intended behavior.
2. Determine required database mutation.
3. Check whether an existing implementation already exists elsewhere.
4. Implement using existing domain/repository patterns.
5. If the feature is not actually designed/specified:
   - remove misleading success behavior
   - use an honest unavailable state
   - document it in `TASK_STATE.md`

## Exit Criteria

No reachable button claims an operation succeeded when it did not.

---

# Phase 5 — Bulk Actions

## Scope

Audit bulk-action dropdowns on:

- products
- categories
- brands
- attributes
- labels
- notes
- units
- warranty
- flash sales

## Tasks

For each bulk action:

1. List every available action.
2. Trace its current implementation.
3. Classify:
   - real
   - partially real
   - fake
   - intentionally unavailable
4. Implement real server-side bulk mutations where appropriate.
5. Validate selected IDs server-side.
6. Enforce permissions.
7. Use transactions for multi-row operations when appropriate.
8. Return accurate success/failure counts.
9. Do not report all rows as successful if some failed.
10. Add confirmation UI for destructive operations.

## Exit Criteria

Bulk actions are truthful, safe, and persistent.

---

# Phase 6 — Settings That Save but Are Not Consumed

## 6.1 Feature Flags

Route:

`/admin/settings/features`

Current issue:
- 19 flags save successfully.
- Application code does not read them.

## Tasks

1. Inventory all 19 flags.
2. Search the entire codebase for each flag.
3. Determine intended consumer for each.
4. Connect relevant storefront/admin behavior to the persisted flags.
5. Remove or clearly mark obsolete flags.
6. Do not create behavior based solely on the flag name without verifying intended semantics.

## Verification

For each active flag:

- OFF → feature disabled where intended.
- ON → feature enabled where intended.
- refresh → setting persists.
- unauthorized users cannot modify it.

---

# Phase 7 — Filesystem Settings

## Route

`/admin/settings/filesystem`

## Current issue

Settings save, but uploads always use local disk.

## Tasks

1. Trace current upload abstraction.
2. Determine intended storage providers from existing code/config.
3. Connect settings to the actual upload implementation.
4. Preserve local disk as a valid fallback if that is already the supported architecture.
5. Never expose credentials/secrets to the client.
6. Test upload, read, replacement, and deletion behavior.

## Exit Criteria

Filesystem settings actually influence the upload system.

---

# Phase 8 — PC Builder Admin Settings

## Route

`/admin/pc-builder`

## Objective

Make admin PC Builder settings actually control the live storefront.

## Tasks

1. Inventory every setting.
2. Trace where each setting is intended to affect the PC Builder.
3. Connect settings to the storefront/domain logic.
4. Ensure server-side enforcement where the setting affects business rules.
5. Test both enabled and disabled states.
6. Do not break AD-276 compatibility filtering/ranking.

## Special Requirement

Preserve the existing AD-276 behavior:

- controlled builder attributes
- `builderStorageInterface`
- `rankCandidatesForSlot()`
- definite mismatches hidden by default
- unknown/missing data remains visible
- build/cart traceability via `buildBatchId` and `builderSlot`

## Exit Criteria

PC Builder settings have observable, tested storefront effects.

---

# Phase 9 — OTP & Social Login Completion

## OTP

Route:

`/admin/otp`

Current state:
- configuration and test SMS are real
- actual login OTP flow is not wired

## Tasks

1. Trace current authentication architecture.
2. Connect OTP settings to actual login flow if OTP login is intended.
3. Implement:
   - OTP generation
   - expiry
   - attempt limits
   - verification
   - invalid/expired handling
   - appropriate rate limiting
4. Never expose OTP values in logs or client responses.

## Social Login

Route:

`/admin/settings/social`

Current state:
- settings save
- social login does not work

## Tasks

1. Identify supported providers already represented by configuration.
2. Verify provider credentials/configuration handling.
3. Connect providers to the existing authentication system.
4. Handle callback errors safely.
5. Do not enable a provider merely because its settings exist.

## Exit Criteria

Only configured and supported authentication methods are exposed as active.

---

# Phase 10 — Languages & Currency Completion

## Routes

- `/admin/settings/languages`
- `/admin/settings/currency`

## Tasks

### Languages

Audit every field and classify it as:

- real
- fake
- unused
- incomplete

Implement missing persistence and actual consumption where intended.

### Currency

Audit:

- currency creation
- editing
- activation
- default currency
- display
- pricing behavior
- conversion behavior if supported

The existing real parts must remain intact.

## Exit Criteria

No currency/language control appears functional unless the underlying behavior actually uses it.

---

# Phase 11 — Reports & Promotion Statistics

## Scope

### Report detail

- "Report regeneration started"

Trace whether regeneration is actually implemented.

If implemented:
- connect the button to the real job/action
- show real status

If not implemented:
- remove fake success
- show an honest unavailable state

### Promotions overview

Replace the hardcoded statistic with a real aggregate query.

## Exit Criteria

Displayed report/promotion metrics are sourced from real data.

---

# Phase 12 — Dead Code & Fake-UI Cleanup

## Scope

Review:

- `admin-engagement-list.tsx`
- `admin-integration-settings.tsx`

These are currently dead/unreachable code.

## Tasks

1. Confirm they are genuinely unreachable.
2. Search for imports/usages.
3. Decide whether to:
   - remove dead code
   - connect it to a real route
   - keep it only if intentionally reserved
4. Remove misleading fake toasts from code that can never be used.
5. Run TypeScript and lint after cleanup.

## Exit Criteria

No unnecessary dead mock admin functionality remains.

---

# Phase 13 — Full Admin Truthfulness Audit

## Objective

Perform a final project-wide audit for fake behavior.

## Search Patterns

Search for patterns such as:

- `mock`
- `fake`
- `hardcoded`
- `notifySuccess`
- `toast.success`
- `"saved"`
- `"created"`
- `"updated"`
- `"deleted"`
- `setTimeout`
- static arrays used as persistence
- placeholder server actions
- TODO/FIXME around admin mutations

Do not treat every occurrence as a bug. Trace each one.

## Classification

Every admin mutation must end in exactly one of:

1. Real persistent functionality.
2. Clearly disabled/unavailable functionality.
3. Read-only functionality with no mutation claim.

Never:

```text
Click Save
→ fake delay
→ "Saved successfully"
→ database unchanged
```

## Exit Criteria

No reachable admin action falsely claims successful persistence.

---

# Phase 14 — End-to-End Regression Testing

## Test Areas

### Authentication
- admin login
- authorization
- session behavior

### Catalog
- products
- categories
- brands
- attributes
- units
- labels
- notes
- warranty

### Promotions
- deals
- promotions
- category discounts
- product assignments
- flash sales

### Settings
- orders
- tax
- pickup points
- invoice
- tracking
- shipping label
- thermal printer
- filesystem
- feature flags
- language
- currency
- social
- OTP
- PC Builder

### PC Builder
- selection
- compatibility filtering
- unknown data handling
- cart
- order traceability

### Orders
- normal cart order
- PC Builder order
- admin order detail
- PC Build badge
- buildBatchId consistency

## Required Checks

- TypeScript
- ESLint
- production build
- existing automated tests
- payment tests
- database migration verification
- representative browser/manual tests

## Exit Criteria

All existing working functionality remains operational and newly implemented functionality persists correctly.

---

# Phase 15 — Final Production Readiness Review

## Tasks

1. Review all Prisma migrations.
2. Confirm no accidental destructive migration.
3. Confirm indexes/constraints where needed.
4. Confirm authorization on all admin mutations.
5. Confirm validation on all server actions.
6. Confirm transaction boundaries for multi-table operations.
7. Confirm no secrets are exposed.
8. Confirm no fake success messages remain on reachable routes.
9. Confirm error messages are meaningful.
10. Confirm mobile/admin UI remains usable.
11. Confirm production build.
12. Confirm deployment instructions/config changes.
13. Update `TASK_STATE.md`.

## Final Deliverable

Create/update:

`ADMIN_FUNCTIONALITY_AUDIT.md`

It should contain:

- all audited routes
- final status
- database models used
- migrations added
- tests performed
- known limitations
- intentionally unavailable features
- remaining manual data-entry tasks

---

# Phase Execution Rules

## Do not jump phases

Complete one phase, test it, document it, then move forward.

## After every phase

Update `TASK_STATE.md`:

```text
Phase: X
Status: COMPLETE / BLOCKED
Completed:
- ...

Files changed:
- ...

Database changes:
- ...

Tests:
- ...

Known issues:
- ...

Next phase:
- ...
```

## If blocked

Do not fake completion.

Record:

```text
Status: BLOCKED
Reason: ...
Required decision/input: ...
```

Then continue only with phases that do not depend on the blocker.

---

# Definition of Done

The admin system is considered complete only when:

- No reachable fake save reports success.
- No mock array is presented as persistent data.
- All implemented CRUD operations persist to the database.
- All admin mutations have server-side validation and authorization.
- Settings that claim to control behavior actually control that behavior.
- Reports/statistics shown as live data come from real queries.
- PC Builder settings affect the live PC Builder where intended.
- PC Builder compatibility behavior from AD-276 remains intact.
- PC Builder-origin orders remain traceable.
- Intentionally unavailable features are clearly disclosed rather than faked.
- TypeScript, ESLint, build, and relevant tests pass.
- `TASK_STATE.md` and `ADMIN_FUNCTIONALITY_AUDIT.md` accurately describe the final state.

# Recommended Execution Order

1. Phase 0 — Baseline
2. Phase 1 — Settings saves
3. Phase 2 — Deals / refunds / promotions
4. Phase 3 — Fully fake pages
5. Phase 4 — Product/catalog actions
6. Phase 5 — Bulk actions
7. Phase 6 — Feature flags
8. Phase 7 — Filesystem
9. Phase 8 — PC Builder settings
10. Phase 9 — OTP/social login
11. Phase 10 — Languages/currency
12. Phase 11 — Reports/statistics
13. Phase 12 — Dead code cleanup
14. Phase 13 — Final fake-behavior audit
15. Phase 14 — Regression testing
16. Phase 15 — Production readiness
