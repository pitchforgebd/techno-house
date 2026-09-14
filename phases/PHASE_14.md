# Phase 14

## Objective

Implement server-side PC Builder data, compatibility engine, saved builds,
shareable builds, and build-to-cart validation.

## Scope

Serve builder slot candidates, persist rules, and run a pure
compatibility engine. T03 is the engine only — not saved/shareable
builds, not build-to-cart.

## Tasks

- [x] P14-T01 Component data
- [x] P14-T02 Compatibility rules
- [x] P14-T03 Compatibility engine
- [x] P14-T04 Saved builds
- [x] P14-T05 Shareable builds
- [x] P14-T06 Server-side validation
- [x] P14-T07 Build-to-cart

## Completed Tasks

### P14-T01 Component data

- Slot candidates come from `productRepository.listByBuilderSlot`
- Each candidate includes price, stock, `builderSlot`, and `builderAttrs`
- Selected parts load attrs in one query (`listBuilderCandidatesBySlugs`)
- Staff assign slot / socket / RAM type / form factor / TDP on product save
- Clearing the slot clears builder attributes
- `DATA_SOURCE=mock` still uses the in-memory catalogue
- No new tables; existing `Product` builder columns are the source

### P14-T02 Compatibility rules

- Rules persist on `PCCompatibilityRule` (seeded from the admin mock list)
- Admin list/toggle/save go through `lib/pc-builder/rules.ts`
- `pc_builder.rules` + same-origin required; mock source refuses writes
- Re-seed does not reset `isEnabled`
- Storefront skips disabled rule types in the stub engine
- `storage_interface` evaluator added in T03

### P14-T03 Compatibility engine

- `RULE_EVALUATORS` maps each `PcBuilderRuleType` to a pure function
- `evaluateCompatibility` walks the table and skips disabled types
- Storage interface is unknown without `BuilderAttrs.storageInterface`
- PSU / socket / RAM / form-factor outcomes stay the same
- `npm run test:pc-builder` — 27 checks, no database
- No new tables or GPU-clearance inventing

### P14-T04 Saved builds

- Signed-in saves write `PCBuild` / `PCBuildItem` (`SAVED`, no share slug)
- Server checks name, at least one part, active products, slot match
- Cap 12 per user; oldest extras are pruned
- List/delete are owner-only; mutations need same-origin
- Guests and `DATA_SOURCE=mock` keep device-local storage
- Share tokens and admin build list stay deferred

### P14-T05 Shareable builds

- Signed-in shares mint `thb_` + 43-char base64url on `PCBuild.shareSlug`
- Sharing the current selection creates a `SHARED` row
- Sharing a saved build sets `shareSlug` on that `SAVED` row if missing
- Public lookup returns name + selection only — never owner identity
- Guests and `DATA_SOURCE=mock` keep `encodeShareId` / `decodeShareId`
- SAVED and SHARED extras prune separately (cap 12 each)
- Same-origin on create/share mutations
- Admin featured-build pages stay mock

### P14-T06 Server-side validation

- `validateBuild` loads live candidates and enabled rules
- Pure `assembleValidatedBuild` prices, stocks, and runs the engine
- Missing or wrong-slot parts become issues, not silent matches
- Workspace and share page render the server snapshot
- Client still sends slugs only — never prices or attributes
- Build-to-cart write stays deferred

### P14-T07 Build-to-cart

- `addBuildToCart` revalidates, then `planValidatedBuildToCart` gates the write
- Missing parts, slot mismatches, incomplete required slots, stock, and
  compatibility still block
- Unknown compatibility is allowed with a note
- Persisted carts write through `addCartItems` (qty 1 per unique slug)
- Guests and `DATA_SOURCE=mock` keep the device cart after a server plan
- Same-origin on the write; client still sends slugs only

## Files Created

- `lib/domain/pc-builder/components.ts`
- `lib/domain/pc-builder/rules.ts`
- `lib/pc-builder/rules.ts`
- `features/admin/pc-builder/rule-actions.ts`
- `scripts/pc-builder/check-engine.ts`
- `lib/pc-builder/saved-builds.ts`
- `features/pc-builder/build-actions.ts`
- `lib/pc-builder/share.ts`
- `lib/domain/pc-builder/validate.ts`
- `lib/pc-builder/validate-build.ts`
- `lib/pc-builder/add-to-cart.ts`

## Files Modified

- `lib/data/types/catalog.ts`
- `lib/data/types/index.ts`
- `lib/data/index.ts`
- `lib/data/repositories/product-repository.ts`
- `lib/data/prisma/mappers.ts`
- `lib/data/prisma/product-repository.ts`
- `lib/data/mocks/query.ts`
- `lib/data/mocks/product-repository.ts`
- `lib/domain/pc-builder/index.ts`
- `lib/domain/pc-builder/compatibility.ts`
- `features/pc-builder/actions.ts`
- `features/pc-builder/pc-builder-select-view.tsx`
- `lib/catalog/product-input.ts`
- `lib/catalog/admin-products.ts`
- `features/admin/products/admin-product-form.tsx`
- `scripts/db/check-parity.ts`
- `lib/admin/pc-builder-admin-mock.ts`
- `lib/auth/audit-log.ts`
- `prisma/seed.ts`
- `features/admin/pc-builder/admin-pc-builder-rules.tsx`
- `features/admin/pc-builder/admin-pc-builder-settings.tsx`
- `app/(admin)/admin/(panel)/pc-builder/rules/page.tsx`
- `features/pc-builder/pc-builder-workspace.tsx`
- `features/pc-builder/pc-builder-compatibility.tsx`
- `package.json`
- `features/pc-builder/use-saved-builds.ts`
- `features/pc-builder/pc-builder-save-share.tsx`
- `features/pc-builder/pc-builder-share-view.tsx`
- `app/(storefront)/pc-builder/share/[id]/page.tsx`
- `lib/domain/pc-builder/share.ts`
- `lib/domain/pc-builder/saved-builds.ts`
- `features/pc-builder/pc-builder-summary.tsx`
- `scripts/pc-builder/check-engine.ts`
- `lib/domain/pc-builder/build-to-cart.ts`
- `features/pc-builder/pc-builder-add-to-cart.tsx`
- `features/cart/use-cart-store.ts`

## Important Decisions

- AD-164: slot candidates carry builder attributes; never the full catalog
- AD-165: compatibility rules persist; engine stays a stub until T03
- AD-166: table-driven engine; storage unknown without interface data
- AD-167: signed-in builds persist; guests stay on-device
- AD-168: opaque share slugs; public page never returns owner data
- AD-169: server snapshot is the live build authority; client sends slugs only
- AD-170: add-build revalidates then writes the existing cart path

## Security Considerations

- Storefront still reads active products only
- Admin builder fields go through the existing product save path
  (`product.add` / `product.edit` + same-origin)
- Slot and attribute values are validated on the server
- Keyboard / mouse / accessory slots stay out of the enum
- Rule toggles require `pc_builder.rules` and same-origin
- Audit `pc_builder.rule.update` stores no secrets
- Saved builds are listed only for the signed-in owner
- Save/delete require same-origin; clients never send product ids as truth
- Share mutations need same-origin; public share lookup selects no user fields
- Build revalidation accepts slugs only; prices and attrs come from the catalogue
- Build-to-cart needs same-origin; cart lines still go through `addCartItems`

## Performance Considerations

- Candidates are fetched per slot, capped at 48
- Compatibility snapshots batch-load selected slugs instead of N+1
  `getBySlug` calls
- Shop listings do not select builder columns
- Rule table is five rows; storefront loads enabled types once per refresh
- Engine is pure in-memory; `test:pc-builder` needs no database
- Workspace and share page share one `validateBuild` snapshot per request

## Validation Results

- `tsc --noEmit` clean; eslint clean on touched files
- `npm run db:parity` — 165 checks matched
- `/pc-builder`, `/pc-builder/select/cpu`, `/pc-builder/select/motherboard`,
  `/pc-builder/select/monitor` 200
- CPU select HTML includes seeded CoreLine parts
- Unsigned `/admin/products` 307
- `/pc-builder` 200 after T02; unsigned `/admin/pc-builder/rules` 307
- `npm run test:pc-builder` — 27 checks passed
- `/pc-builder` 200 after T03
- `/pc-builder` 200 after T04
- Guest share URL 200 with CoreLine part; missing `thb_` slug shows invalid
- Public share HTML has no owner identity
- `npm run test:pc-builder` — 35 checks passed
- `/pc-builder` 200 after T06; guest share shows CoreLine and checked total
- `npm run test:pc-builder` — 38 checks passed
- `/pc-builder` 200 after T07 with server-checked cart copy

## Known Issues

- Admin PC Builder builds pages still use mocks
- Admin PC Builder settings (slot enable) still mock
- Existing Next on :3000 was hung compiling `/pc-builder` and was restarted

## Deferred Work

- Persist `storageInterface` on products when reliable data exists
- Keyboard / mouse / accessory slots until product data exists

## Next Phase Dependency

Phase 14 is complete. Do not start P15-T01 until explicitly approved.

## Completion Status

COMPLETE
