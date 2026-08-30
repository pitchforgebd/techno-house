# Phase 02

## Objective

Build the public global shell: top bar, header, search, navigation, account/cart actions, footer, and complaint/support entry.

## Scope

Entire Phase 02 global storefront shell.

## Tasks

- P2-T01 Top bar
- P2-T02 Header/search
- P2-T03 Category navigation
- P2-T04 Mobile navigation
- P2-T05 Account/cart actions
- P2-T06 Footer
- P2-T07 Complaint/support box

## Completed Tasks

- P2-T01
- P2-T02
- P2-T03
- P2-T04
- P2-T05
- P2-T06
- P2-T07

## Files Created

P2-T01:

- `components/layout/top-bar.tsx`
- `app/(storefront)/layout.tsx`
- `app/(storefront)/page.tsx`

P2-T02:

- `components/layout/site-header.tsx`
- `lib/search/query.ts`
- `app/(storefront)/search/page.tsx`

P2-T03:

- `lib/catalog/category-tree.ts`
- `components/layout/category-nav.tsx`
- `app/(storefront)/category/[slug]/page.tsx`
- `app/(storefront)/shop/page.tsx`
- `app/(storefront)/offers/page.tsx`
- `app/(storefront)/pc-builder/page.tsx`

P2-T04:

- `components/layout/mobile-nav.tsx`
- `lib/catalog/primary-nav.ts`

P2-T05:

- `components/layout/header-actions.tsx`
- `components/layout/header-cart.tsx`
- `app/(storefront)/account/login/page.tsx`
- `app/(storefront)/wishlist/page.tsx`
- `app/(storefront)/compare/page.tsx`
- `app/(storefront)/cart/page.tsx`

P2-T06:

- `components/layout/site-footer.tsx`
- `components/layout/content-stub.tsx`
- `lib/catalog/footer-nav.ts`
- `app/(storefront)/about/page.tsx`
- `app/(storefront)/contact/page.tsx`
- `app/(storefront)/support/page.tsx`
- `app/(storefront)/faq/page.tsx`
- `app/(storefront)/warranty/page.tsx`
- `app/(storefront)/shipping/page.tsx`
- `app/(storefront)/returns/page.tsx`
- `app/(storefront)/privacy/page.tsx`
- `app/(storefront)/terms/page.tsx`

P2-T07:

- `components/layout/support-box.tsx`
- `lib/support/product-request.ts`
- `app/(storefront)/product-request/page.tsx`
- `app/(storefront)/product-request/actions.ts`

## Files Modified

P2-T07:

- `app/(storefront)/layout.tsx`
- `lib/catalog/footer-nav.ts`
- `components/layout/site-footer.tsx`
- `project-memory/PROJECT_STATE.md`
- `project-memory/TASKS.md`
- `project-memory/DECISIONS.md`
- `phases/PHASE_02.md`

## Important Decisions

See `project-memory/DECISIONS.md` AD-020 through AD-026. Mega-menu chrome follow-up: AD-068.

Help box is original: native disclosure, no chatbot clone, no live tickets. Product-request validates server-side and does not persist.

## Security Considerations

- `/account/login` does not authenticate, set cookies, or accept credentials.
- Header cart count is hardcoded 0; not a client-side source of truth for charges.
- Product-request does not store or log submissions; no email/phone fields.
- Search `q` is trimmed and capped at 120 characters; rendered as text (XSS-escaped).
- `/dev/*` stays outside `(storefront)` so internal kit pages do not inherit shop chrome.

## Performance Considerations

- Help box is a Server Component (`<details>`); no extra client JS.
- Footer is a Server Component.
- `/product-request` and `/search` are dynamic; most storefront stubs are static.

## Validation Results

P2-T01–T06 checklists: see prior completion.

P2-T07 checklist:

- [x] `npm run format` / lint / typecheck
- [x] `npm run build` — `/product-request` dynamic
- [x] `GET /` HTTP 200 — Help control, product-request and report-a-problem links
- [x] `GET /product-request` HTTP 200, form present
- [x] `GET /product-request?error=name` and `?status=not-saved` show alerts
- [x] `GET /dev/ui` HTTP 200, no Help box

Interactive open of the Help disclosure and form POST were not available in this session; verification used HTML from the running dev server.

## Known Issues

- npm still reports `eslint@9.39.5` as deprecated; upgrade blocked by `eslint-config-next@16.3.3` peer.
- Next.js 16.3.3 dev server returned HTTP 200 for unknown category slugs (not-found UI still rendered). Production `next start` returned 404.

## Deferred Work

- Search overlay and filter sheet.
- Catalog listings (Phase 04).
- Real cart/checkout (Phase 06) and customer auth (Phase 11).
- Persisted product requests / tickets.
- Newsletter (Phase 15).
- Separate `(account)` layout (Phase 08).
- Header search input prefill from current `q`.
- Icon set.
- Final legal copy.

## Next Phase Dependency

Phase 03 homepage may start only when explicitly approved. First task: P3-T01 Homepage structure.

## Completion Status

COMPLETE
