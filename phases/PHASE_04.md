# Phase 04

## Objective

Build shop, category, brand, search, filtering, sorting, pagination, wishlist and compare experiences.

## Scope

P4-T01–T07 complete: catalog listings, filters, sort/pagination, and device-local wishlist/compare.

## Tasks

- P4-T01 Shop page
- P4-T02 Category page
- P4-T03 Brand page
- P4-T04 Search page
- P4-T05 Filtering
- P4-T06 Sorting/pagination
- P4-T07 Wishlist/compare UI

## Completed Tasks

- P4-T01
- P4-T02
- P4-T03
- P4-T04
- P4-T05
- P4-T06
- P4-T07

## Files Created

P4-T01:

- `features/catalog/product-grid.tsx`
- `features/catalog/shop-listing.tsx`

P4-T02:

- `features/catalog/category-listing.tsx`

P4-T03:

- `features/catalog/brand-listing.tsx`

P4-T04:

- `features/catalog/search-listing.tsx`

P4-T05:

- `lib/catalog/listing-params.ts`
- `features/catalog/catalog-filters-form.tsx`
- `features/catalog/catalog-filters-mobile.tsx`
- `features/catalog/catalog-listing-body.tsx`

P4-T06:

- `features/catalog/catalog-sort-control.tsx`

P4-T07:

- `lib/catalog/lists.ts`
- `features/lists/use-lists-store.ts`
- `features/lists/actions.ts`
- `features/lists/product-list-actions.tsx`
- `features/lists/wishlist-view.tsx`
- `features/lists/compare-view.tsx`
- `features/lists/header-list-links.tsx`

## Files Modified

P4-T07:

- `features/catalog/product-card.tsx`
- `components/layout/header-actions.tsx`
- `app/(storefront)/wishlist/page.tsx`
- `app/(storefront)/compare/page.tsx`
- `app/(storefront)/product/[slug]/page.tsx`
- `project-memory/PROJECT_STATE.md`
- `project-memory/TASKS.md`
- `project-memory/DECISIONS.md`
- `phases/PHASE_04.md`

## Important Decisions

See `project-memory/DECISIONS.md` AD-035–AD-041.

Wishlist/compare are device-local; account sync is Phase 08.

## Security Considerations

- Lists are not server-persisted; no PII.
- Product hydrate via server action + repository (not mocks from UI).
- Prices remain display-only (৳).

## Performance Considerations

- List state is client-only; products loaded by slug set (capped).
- Compare table is modest (max 4 columns).

## Validation Results

P4-T01–T06 checklists: see prior completion.

P4-T07 checklist:

- [x] `npm run format` / lint / typecheck
- [x] `npm run build`
- [x] `GET /shop` — Wishlist/Compare actions on cards
- [x] `GET /wishlist` and `/compare` — empty states with device-local copy
- [x] `GET /product/lumen-14-office-laptop` — list actions
- [x] `GET /dev/ui` — no storefront list chrome

Interactive click-through of localStorage toggles was not automated; empty states and action markup verified via HTML.

## Known Issues

- npm still reports `eslint@9.39.5` as deprecated; upgrade blocked by `eslint-config-next@16.3.3` peer.
- Next.js 16.3.3 dev may return HTTP 200 for unknown category slugs; production returns 404.

## Deferred Work

- Account-synced wishlist/compare (Phase 08).
- Full PDP gallery/cart (Phase 05 / 06).

## Next Phase Dependency

Phase 05 product details may start only when explicitly approved. Phase 04 is complete.

## Completion Status

COMPLETE (P4-T01–T07)
