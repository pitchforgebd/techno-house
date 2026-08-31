# Techno House — Architectural Decisions

Decisions are append-only. Supersede with a new ID; do not silently rewrite history.

## AD-001 Frontend-first, PostgreSQL later

PostgreSQL is the production database. No connection, Prisma schema, or queries until Phase 10.

UI talks to repository interfaces. Mocks implement them first.

## AD-002 Separate customer and admin auth

`/account/*` and `/admin/*` are separate trees, layouts, and future session purposes.

## AD-003 PC Builder is a domain subsystem

Compatibility and totals live in `lib/domain/pc-builder`, not in React components. Engine must be unit-testable.

## AD-004 Payments are security-critical

Client never authorizes money movement. See `docs/PAYMENT_SECURITY.md`. Gateways chosen later (pending).

## AD-005 Project memory in Markdown

`project-memory/` and `phases/` are the continuation context. Do not rely on chat history.

## AD-006 Original visual identity

Reference site and any admin screenshots are IA/UX only. Tokens in `docs/DESIGN_SYSTEM.md` (teal/slate/copper). No copied assets or chrome.

## AD-007 Category-aware filters

Filter metadata is per category. Listing query is URL-driven and executed in the data layer (even when mocked).

## AD-008 App structure

Next.js App Router with `(storefront)`, `(account)`, `(admin)` groups. Shared UI primitives under `components/ui`. Feature folders under `features/`.

## AD-009 Checkout requires customer account (v1)

Aligns with common BD retail OTP checkout. Guest checkout is deferred unless product later approves it.

## AD-010 Admin screenshot URLs missing

Master spec had no dashboard image URLs. Admin IA is original, derived from the spec’s module list plus generic operations patterns. Documented in `docs/ADMIN_REFERENCE.md`.

## AD-011 Currency display

Storefront displays Bangladeshi Taka. UI convention: **৳** with tabular numerals. Authoritative currency code `BDT` in data.

## AD-012 No public API freeze in frontend phases

Do not invent versioned HTTP contracts until backend phases. Prefer server components and later server actions.

## AD-013 Next.js App Router foundation (P1-T01)

App lives at the repository root beside existing docs (not in `src/`). Stack at init: Next.js 16.3.3, React 19.2.8, TypeScript 5.9.3 (strict), Tailwind CSS 4.3.3, ESLint 9 with `eslint-config-next`.

`app/` is a Server Component tree. `lib/data` is the composition-root stub only; mock repositories are P1-T05.

`agentRules: false` so Next.js does not rewrite `CLAUDE.md`. `poweredByHeader: false`.

Route groups `(storefront)` / `(account)` / `(admin)` are deferred until those surfaces are built. Empty `features/`, `components/`, and `prisma/` folders were not created.

## AD-014 Linting and formatting (P1-T02)

ESLint stays on `eslint-config-next` (core-web-vitals + TypeScript). Prettier 3 formats application source; `eslint-config-prettier` is last in the flat config so ESLint does not fight Prettier.

Prettier does not format `docs/`, `phases/`, `project-memory/`, or `.cursor/` Markdown. EditorConfig enforces LF and 2-space indent.

ESLint 9.39.5 remains (peer of `eslint-config-next@16.3.3`); no upgrade this task.

## AD-015 Design tokens (P1-T03)

Tokens live in `app/globals.css` Tailwind v4 `@theme` (canonical names from `docs/DESIGN_SYSTEM.md`). Fonts: Plus Jakarta Sans and IBM Plex Mono via `next/font/google` (self-hosted at build). Currency display: `৳` / `BDT` in `lib/format/currency.ts`. Dark theme is not in v1. UI primitives are P1-T04.

## AD-016 Base UI primitives (P1-T04)

Primitives live in `components/ui` and use design tokens via `lib/cn`. Native HTML first; Client Components only for Tabs, Dialog, and Sheet. No icon library yet.

Internal preview: `/dev/ui` (robots noindex). Product cards and loading/empty/error states are not in this task.

## AD-017 Mock data boundary (P1-T05)

UI imports only `@/lib/data`. Repositories are interfaces; mocks live in `lib/data/mocks`. List queries paginate, filter, and sort in the data layer. Prices are integer BDT (`Money`); not authoritative for charges. No Prisma/PostgreSQL. Internal check: `/dev/data`.

## AD-018 Loading, empty, and error states (P1-T06)

Reusable `Skeleton`, `EmptyState`, and `ErrorState` in `components/ui`. App Router: `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`. User-facing errors never include stack traces or internal messages. Skeleton pulse respects `prefers-reduced-motion`.

## AD-019 Phase 01 foundation validated (P1-T07)

`format:check`, `lint`, `typecheck`, and `build` pass. Smoke tests: `/` 200, `/dev/ui` 200 (noindex), `/dev/data` 200 (repository → mock), unknown route 404 with empty state. No Prisma/PostgreSQL. UI does not import `lib/data/mocks`. Client Components limited to dialog, sheet, tabs, error boundaries, and the `/dev/ui` interactive demo.

## AD-020 Storefront utility bar (P2-T01)

Public shop chrome lives under `app/(storefront)/`. The homepage moved from `app/page.tsx` into that group so `/dev` and later `/admin` do not inherit the storefront shell.

The utility/top bar is a Server Component (`components/layout/top-bar.tsx`): support hours, nationwide delivery, EMI teaser — original copy, `primary` tokens, no client JS. Skip-to-content is in the storefront layout.

Header/search is P2-T02.

## AD-021 Storefront header search (P2-T02)

Header is a Server Component (`components/layout/site-header.tsx`): typographic wordmark to `/`, GET form to `/search?q=`. Search is the flexible, dominant control. No icon package. No account/cart/PC Builder actions (P2-T05). No live suggestions.

Query `q` is trimmed and capped at 120 characters (`lib/search/query.ts`). `/search` is a destination stub only; catalog result listings are P4-T04. Native `<form>` (no client JS). `/dev` still has no shop header.

## AD-022 Storefront category navigation (P2-T03)

Primary nav is a Server Component (`components/layout/category-nav.tsx`) fed by `categoryRepository.list()` via `toCategoryTree`. Desktop only (`hidden md:block`); mobile sheet is P2-T04.

Root categories with children use native `<details>` (click/keyboard, no hover clone, no extra JS). Leaves link to `/category/[slug]`. Extra items: Shop, Offers, PC Builder.

Category slugs are prerendered (`generateStaticParams`, `dynamicParams: false`). Unknown slugs 404. `/shop`, `/offers`, `/pc-builder`, and `/category/[slug]` are destination stubs; listings wait for later phases. UI does not import `lib/data/mocks`.

## AD-023 Storefront mobile navigation (P2-T04)

Below `md`, a text **Menu** button (no icon package) opens the existing Sheet primitive on the **left**. The sheet lists the same Shop / taxonomy / Offers / PC Builder items as desktop (`lib/catalog/primary-nav.ts`). Links close the sheet. The sheet also closes if the viewport crosses `md`.

Client JS is limited to `components/layout/mobile-nav.tsx` plus the shared Sheet. Search stays in the header (no search overlay). Account/cart/filter sheets are later tasks. `/dev` still has no shop menu.

## AD-024 Storefront account and cart actions (P2-T05)

Header actions: Account (`/account/login`), Wishlist, Compare (hidden below `md`; listed in the mobile menu), and Cart. Cart opens a right Sheet with a hardcoded empty count of 0 — display-only, not a cart store, not a charge.

`/account/login` is an explicit non-production stub (no fake session, no shortcut password). `/wishlist`, `/compare`, and `/cart` are empty destination stubs. Full cart/checkout and real customer auth wait for later phases. Account routes still sit in the storefront group so shop chrome remains; a separate `(account)` shell is Phase 08.

## AD-025 Storefront footer (P2-T06)

Footer is a Server Component (`components/layout/site-footer.tsx`): four columns Shop, Support, Company, Contact. Original copy; no newsletter form (Phase 15); no complaint widget (P2-T07). No invented phone numbers.

Legal/support destinations are placeholder pages (`ContentStub`). Copyright notes ৳ / BDT display-only. `/dev` has no shop footer. Storefront layout is a column flex so the footer sits at the bottom of short pages.

## AD-026 Complaint/support box (P2-T07)

Persistent **Help** control (`components/layout/support-box.tsx`) is a Server Component using native `<details>` (no extra client JS). Original copy. Links: request a product, report a problem (`/contact`), support hub.

**Update (2026-08-30):** Floating Help button and footer “Back to top” control removed from the storefront chrome per UI correction. Support routes (`/support`, `/contact`, `/product-request`) remain reachable from footer/nav.

`/product-request` validates on the server (name required, length caps) and **does not store or email** the payload. Success state is explicitly “not saved”. No email/phone fields (no PII collection without persistence). Phase 02 of the global shell is complete.

## AD-027 Homepage structure (P3-T01)

Homepage composition lives in `features/home`. Landmark order is fixed: hero, categories, featured, deals, PC Builder, brands, trust, content (`HOME_SECTIONS`). Original copy; no reference SEO essays. Later Phase 03 tasks fill these slots. Server Component only. Shell chrome stays in the storefront layout.

## AD-028 Homepage hero (P3-T02)

Hero is a static Server Component (`features/home/home-hero.tsx`): original headline, teal panel, geometric placeholder (reserved aspect ratio, no photos, no carousel/autoplay). CTAs: Shop catalog, Build a PC. Copper (`secondary`) is limited to a small Offers cue. ৳ mentioned as display-only. Other homepage sections remain placeholders.

## AD-029 Homepage category discovery (P3-T03)

`HomeCategories` is a Server Component that reads root categories from `categoryRepository` (`@/lib/data`, never mocks) via `toCategoryTree`. Cards link to `/category/[slug]`. Child names are a short preview only. UI does not import `lib/data/mocks`. Featured products remain a later task.

## AD-030 Homepage featured products (P3-T04)

Featured grid uses `productRepository.list({ sort: "featured", pageSize: 8 })`. Reusable `ProductCard` in `features/catalog`: image with reserved 4:3, title clamp, up to 5 specs, display-only ৳ via `formatMoney`, stock/warranty text (not color alone). Primary action is **View product** (no fake add-to-cart). `/product/[slug]` is a destination stub; gallery and cart actions wait for Phase 05. Deals section remains a placeholder.

## AD-031 Homepage deals (P3-T05)

Deals use `productRepository.list({ onSaleOnly: true, sort: "discount" })`. `onSaleOnly` is a data-layer filter (not client-side catalog dump). Copper (`secondary`) frames the section. No countdown or autoplay. `/deals` and `/flash-sale` are destination stubs. Brands remain a later task.

## AD-032 Homepage brands (P3-T06)

`HomeBrands` is a Server Component that reads `brandRepository.list()` from `@/lib/data` (never mocks). Tiles are typographic — original mock names only, no logos or scraped marks. Cards link to `/brand/[slug]` (SSG stub, `dynamicParams: false`). `/brands` is a thin index stub so “All brands” has a destination; full brand listing waits for Phase 04. Landmark order is unchanged: PC Builder placeholder still precedes brands.

## AD-033 Homepage PC Builder promo (P3-T07)

`HomePcBuilder` is a static Server Component promo only — not the Phase 07 builder. Original copy, slot-name cues (CPU, motherboard, etc.), teal geometric accent, copper limited to a small decorative bar. Primary CTA links to the existing `/pc-builder` stub. No selector, totals engine, or fake “compatible” claims. Content/trust sections remain for P3-T08.

## AD-034 Homepage trust and content (P3-T08)

`HomeTrust` and `HomeContent` finish the homepage landmarks. Trust: four original policy cues linking to existing stubs (`/warranty`, `/shipping`, `/support`, `/returns`). Content: short merchandising notes (shop, PC Builder, product request) plus Contact/About — explicitly not SEO essays; blog/newsletter deferred to Phase 15. No third-party social widgets or embeds. Phase 03 homepage is complete; Phase 04 must not start until explicitly approved.

## AD-035 Shop all-products listing (P4-T01)

`/shop` uses `ShopListing` (`features/catalog`) and `productRepository.list({ sort: "featured", pageSize: 24 })` via `@/lib/data`. Reusable `ProductGrid` wraps existing `ProductCard`. Shows product count and EmptyState when empty. No filter rail, sort control, or pagination UI yet (P4-T05 / P4-T06). Category, brand, and search listings remain later Phase 04 tasks.

## AD-036 Category listing (P4-T02)

`/category/[slug]` uses `CategoryListing` with `productRepository.list({ categorySlug })`. Parent categories include descendant products via the existing data-layer tree filter. Breadcrumbs: Home → Shop → ancestors → current. Subcategory chips when children exist. SSG + `dynamicParams: false` unchanged. Filters/sort/pagination UI still deferred.

## AD-037 Brand listing (P4-T03)

`/brand/[slug]` uses `BrandListing` with `productRepository.list({ brandSlug })`. Breadcrumbs: Home → Shop → Brands → brand. EmptyState when the brand has no products. Typographic brand identity only (no logos). `/brands` index unchanged. Filters/sort/pagination UI still deferred.

## AD-038 Search results (P4-T04)

`/search` uses `SearchListing` with `parseSearchQuery` (120-char cap) and `productRepository.list({ q })` — name/SKU match in the data layer. Empty `q` shows a prompt to use header search; no matches show EmptyState. Metadata includes the query when present. Filters/sort/pagination UI still deferred (P4-T05 / P4-T06).

## AD-039 Catalog filtering (P4-T05)

Listing filters are URL-driven GET forms (no client-side catalog dump). Query params: `stock`, `minPrice`, `maxPrice`, repeated `brand`, and category attribute keys. Parsed in `lib/catalog/listing-params.ts`; applied in `productRepository.list` (`brandSlugs`, price bounds, `filters`, `inStockOnly`). Facets (with counts) come from the data layer — category-aware via `filterKeys`, plus brand facet when not on a brand page. Desktop left rail + mobile filter Sheet. Wired on `/shop`, `/category/[slug]`, `/brand/[slug]`, and `/search`. Sort/pagination controls remain P4-T06.

## AD-040 Catalog sort and pagination (P4-T06)

`sort` and `page` are URL query params (`parseListingQuery`). Sort options: featured, newest, price asc/desc, discount. Default page size is 8 (`LISTING_PAGE_SIZE`) so pagination is exercised on the mock catalog. Sort control is a small Client Component that navigates while preserving filters; pagination links use `listingHref`. Applying filters resets page (no `page` in filter form) but preserves sort via hidden input. Wishlist/compare remains P4-T07.

## AD-041 Wishlist and compare UI (P4-T07)

Wishlist/compare use device-local `localStorage` (`useSyncExternalStore`), not accounts. Product cards and PDP stubs expose Wishlist/Compare actions. Compare is capped at 4 and restricted to the same `categorySlug`. Pages load product rows via server action `loadListProducts`. Header shows list counts when non-zero. Account-synced lists wait for Phase 08. Phase 04 catalog is complete; Phase 05 must not start until explicitly approved.

## AD-042 Product gallery (P5-T01)

PDP uses a two-column layout (gallery left, summary right on `lg+`). `ProductGallery` is a Client Component: main image at 4:3 with optional thumbnail strip when `product.images.length > 1`. First image gets `priority` for LCP. Image disclaimer copy is original placeholder text. Single-image products show main image only (no thumbnails). Mock `ridge-16-gaming-laptop` has three images to exercise the thumbnail UI. Pricing/stock block, specs, warranty, reviews, and related products remain P5-T02–T06.

## AD-043 Product pricing and stock (P5-T02)

`ProductPricing` is a Server Component on the PDP summary column. Price stack: current (৳), optional compare-at strike, optional savings line when compare-at exceeds price. Explicit display-only caption (non-authoritative). New/Sale badges plus stock badge. Availability status block uses label + prose (not color alone) for in_stock / low_stock / out_of_stock; notes warehouse/online stock only — branch checks deferred. Add-to-cart CTA remains Phase 06; wishlist/compare stay below. Specs, warranty section, reviews, and related products remain P5-T03–T06.

## AD-044 Product specifications (P5-T03)

PDP summary column shows `ProductOverview`: quick overview bullets from `product.overview` plus up to 5 key spec chips from `product.specs`. Full-width `ProductSpecifications` below the hero uses grouped tables from `product.specGroups` (existing Table primitives, zebra rows, mono keys). No tabs yet — Q&A/Reviews tabs wait for P5-T05. Ridge 16 mock gained a second Display group for multi-group demo. Warranty block, reviews, and related products remain P5-T04–T06.

## AD-045 Product warranty (P5-T04)

`ProductWarranty` sits in the PDP summary column after pricing/stock (trust cue near price). Shows `warrantyLabel` with warranty Badge tone, original catalog-cue copy, and a link to `/warranty`. No claim form or backend warranty workflow. Reviews/questions and related products remain P5-T05–T06.

## AD-046 Product reviews and questions (P5-T05)

`reviewRepository` (mock) lists reviews and questions by product slug. Types live in `lib/data/types/reviews.ts`. PDP uses `ProductDetailTabs` (Specifications / Reviews / Q&A) wrapping existing specs plus `ProductReviews` and `ProductQuestions`. Sample content for lumen and ridge; other products show EmptyState. Display-only — no submit forms or moderation; posting deferred to customer accounts. Related products remain P5-T06.

## AD-047 Related products (P5-T06)

`productRepository.listBySlugs` resolves `ProductDetail.relatedSlugs` to `ProductSummary[]` preserving slug order. `ProductRelated` renders a full-width grid via existing `ProductGrid` / `ProductCard` below the detail tabs. Empty `relatedSlugs` omits the section. Similar-products (same category) deferred — typed cross-sell only for now. Phase 05 product details are complete; add-to-cart remains Phase 06.

## AD-048 Cart UI (P6-T01)

Cart is device-local `localStorage` (`useSyncExternalStore`), not accounts or server cart. Lines store `{ slug, quantity }` only; prices load via `loadCartProducts` / `listBySlugs`. Caps: 24 lines, qty 1–10. `/cart` shows line items (image, name, unit price, qty, line total, remove) plus display-only subtotal. Header mini-cart Sheet shows live count, preview lines, and subtotal. Add to cart on PDP and product cards; out-of-stock disables add. Checkout button disabled until P6-T05. Totals are never authoritative. Coupon / shipping / payment UI remain P6-T02–T04.

## AD-049 Coupon UI (P6-T02)

Cart order summary includes a coupon field (`CartCouponForm`). Mock codes in `lib/cart/coupons.ts`: `SAVE10` (10% off) and `WELCOME500` (৳500 off). Applied code persists on `CartState.couponCode` in the same cart localStorage. Discount and estimated total are display-only previews — never authoritative. Invalid codes show an inline error. Shipping and payment remain P6-T03–T04.

## AD-050 Shipping UI (P6-T03)

Cart order summary includes shipping selection (`CartShippingForm`) driven by mock zones/areas/methods in `lib/cart/shipping.ts` (Dhaka home delivery, nationwide courier, store pickup). Selection persists as `shippingMethodId` + `shippingAreaId` on cart localStorage. Shipping line and estimated total are display-only. Full address collection waits for checkout (P6-T05). Payment mock remains P6-T04.

## AD-051 Payment UI mock (P6-T04)

Cart order summary includes `CartPaymentForm`: mock methods COD, hosted card, mobile banking, POS on delivery (`lib/cart/payment.ts`). Selection persists as `paymentMethodId`. No card number/CVV/PIN fields; no live gateway calls; explicit display-only / not-charged copy. Client remains non-authoritative for payment state. Checkout step flow remains P6-T05; confirmation P6-T06.

## AD-052 Checkout UI (P6-T05)

`/checkout` is a stepped mock flow: contact → delivery → payment → review. Contact drafts persist in localStorage; shipping/payment reuse cart store selections. Account required later (guest deferred) with link to login stub. Place mock order writes a `MockOrderSnapshot` to sessionStorage, clears the cart, and navigates to `/checkout/confirmation`. No server order, no charge. Cart and header mini-cart Checkout links enabled.

## AD-053 Confirmation receipt (P6-T06)

`/checkout/confirmation` reads a validated `MockOrderSnapshot` from sessionStorage via `readLastOrderSnapshot`. Full receipt UI: order ID/timestamp, line items with links, contact/delivery/payment summary, coupon and totals breakdown, mock disclaimer (Alert), next-steps copy, print button (`window.print`), continue shopping and account stub links. Empty state when no snapshot. Still display-only — no email/SMS, no server order.

## AD-054 PC Builder shell (P7-T01)

`/pc-builder` replaces the EmptyState stub with `PcBuilderShell`: breadcrumbs, intro, slot list (`BUILDER_SLOTS` from `lib/domain/pc-builder`), and sticky summary (empty totals, stock/compatibility placeholders, disabled save/share and add-to-cart). Selection types (`BuildSelection`, compatibility warning shapes) live in domain — no React. Select buttons disabled until P7-T02. No picker, engine, or cart wiring yet.

## AD-055 PC Builder component selector (P7-T02)

`productRepository.listByBuilderSlot` returns mock candidates for one `BuilderSlot` only (cap 48). Server actions `loadSlotCandidates` / `loadBuildProducts` feed the UI. Device-local build store (`useBuilderStore`, localStorage key `techno-house-pc-builder-v1`) holds slug-per-slot selection via domain helpers. Slot **Select** opens a right Sheet (`PcBuilderSelector`) listing image, name, brand, stock, price; choosing a part sets the slot (Change reopens). Summary counts update; estimated total stays ৳0 until P7-T05. Added HDD category + Frame 2TB HDD so every required slot has at least one candidate. Remove/rich selected cards: P7-T03.

## AD-056 PC Builder selected components (P7-T03)

Filled slots use `PcBuilderSelectedPart`: thumbnail, slot label, PDP link, brand/SKU, stock badge, display price, **Replace** (reopens picker), and **Remove** (`clearPart`). Missing catalog slug shows recovery copy while resolving uses a loading line. Summary adds **Clear all parts**. Live totals and compatibility UX remain P7-T04–T05.

## AD-057 PC Builder compatibility UX (P7-T04)

Pure `evaluateCompatibility` in `lib/domain/pc-builder/compatibility.ts` takes `CompatibilityPart[]` (slot, slug, name, attrs) — no React. Rules with mock data: CPU↔MB socket, cooler↔CPU/MB socket, RAM type↔MB, MB form factor↔case, PSU watts vs ~1.5× (CPU+GPU TDP). Missing attributes → `unknown` warning; mismatches → `incompatible`. UI (`PcBuilderCompatibility`) only displays engine results in the summary. `loadCompatibilityParts` loads attrs per selected slug via `getBySlug`. Added Volt DDR4 RAM so RAM-type conflicts are selectable. Pricing/stock rollup remains P7-T05.

## AD-058 PC Builder pricing and stock (P7-T05)

Domain `summarizeBuildPricing`, `summarizeBuildStock`, and `estimateBuildPower` in `lib/domain/pc-builder/totals.ts` (no React). Summary shows running ৳ total of loaded selected prices, stock rollup (in / low / out / unresolved), and CPU+GPU TDP draw vs PSU watts when data exists. Partial totals labeled when a selected slug has no resolved product. Display-only — not a charge. Save/share P7-T06; build-to-cart P7-T07.

## AD-059 PC Builder save/share UI (P7-T06)

Share ids are base64url encodings of slot→slug maps (`encodeShareId` / `decodeShareId`) — public product slugs only, no PII. Route `/pc-builder/share/[id]` shows a read-only mock share with display total and **Open in PC Builder** (`loadSelection`). Saved builds persist in `techno-house-pc-builder-saved-v1` (max 12, named). Summary **Save / share build** opens a Dialog for copy link, save, load, delete. Server share tokens deferred to Phase 14. Build-to-cart remains P7-T07.

## AD-060 PC Builder build-to-cart (P7-T07)

Pure `planBuildToCart` gates add: all required slots filled, every selected slug resolved, no out-of-stock lines, no incompatible engine results, and cart line capacity. Unknown compatibility is allowed with an informational note. `PcBuilderAddToCart` calls cart `addItems` (qty 1 per unique slug). Local/display cart only — server revalidation in Phase 14. Phase 07 PC Builder frontend is complete.

## AD-061 Customer login/register UI (P8-T01)

`/account/login`, `/account/register`, and `/account/forgot-password` are mock forms with client validation only. Passwords are never stored, logged, or posted to a server action. Successful login/register writes `techno-house-mock-customer-v1` (`kind: "mock-customer"`, name + email). Header Account link shows the mock name. `/account` is a signed-in landing (not the full dashboard). Explicit mock warnings; noindex. Real hashing/sessions/OTP/rate limits: Phase 11. Dashboard remains P8-T02.

## AD-062 Customer account dashboard (P8-T02)

`/account` is the signed-in overview: `AccountShell` (mock-session gate, sign out, account nav) plus snapshot counts from local cart/wishlist/compare and the latest `MockOrderSnapshot` if present. Nav: Overview, Orders, Addresses, Wishlist, Reviews, Questions, Support, Notifications, Profile. Later destinations are Coming Soon stubs (not full P8-T04–T07). Account layout is `robots: noindex`. Storefront `/wishlist` and `/compare` remain the live list UIs.

## AD-063 Customer mock orders (P8-T03)

`/account/orders` lists device-local mock orders; `/account/orders/[id]` shows tracking, items, and delivery/payment. Storage key `techno-house-mock-orders-v1` (max 20). Checkout `persistMockOrder` after the session last-order write. Status is always `placed` (later track steps are labeled as not live). Not server orders, payment, or warehouse state. Dashboard latest-order links to track. Real orders: Phase 13.

## AD-064 Account wishlist and compare (P8-T04)

`/account/wishlist` and `/account/compare` wrap the existing device-local lists (`techno-house-lists-v1`) in `AccountShell`. Shared bodies: `WishlistBody`, `CompareBody`. Storefront `/wishlist` and `/compare` stay public. Header still links there. Account nav adds Compare. Same same-category compare cap. Not server-synced lists — those wait for real accounts. Reviews/queries remain P8-T05.

## AD-065 Account reviews and questions (P8-T05)

`/account/reviews` and `/account/questions` save device-local drafts (`techno-house-mock-conversations-v1`, max 20 each). Status is always `pending`. Entries are not merged into PDP catalog reviews/Q&A (those stay sample `reviewRepository` content). Product picker loads catalog names via `loadProductPickerOptions`. No verified-purchase check, no staff answers, no moderation. Support tickets remain P8-T06.

## AD-066 Account support tickets (P8-T06)

`/account/tickets` creates and lists device-local tickets (`techno-house-mock-tickets-v1`, max 20). `/account/tickets/[id]` is a customer-only thread (max 20 messages). Status is always `open`. No staff replies, email, or server tickets. Topics: order, product, warranty, payment, other. Notifications/profile remain P8-T07.

## AD-067 Account notifications and profile (P8-T07)

`/account/profile` edits mock session name, email, and optional phone (`techno-house-mock-customer-v1`). No password storage or verification. `/account/notifications` shows a derived inbox from local orders/tickets plus a welcome item; read state and email/SMS preference toggles persist in `techno-house-mock-notifications-v1`. Toggles do not send messages. Saved addresses remain a Coming Soon stub (checkout still collects an address per mock order). Phase 08 customer frontend is complete.

## AD-068 Storefront mega-menu chrome

Three-layer chrome matches the agreed IA (not a visual clone of the reference): utility bar → logo/search/PC Builder/tools → category mega-menus.

Desktop category items with children or brands open a hover/focus panel (`components/layout/category-mega-nav.tsx`). Nested flyouts list brands for a child category. Columns come from Techno House taxonomy (`lib/catalog/mega-menu.ts`). PC Builder is a first-class header control and remains in primary nav. Mobile keeps a left sheet. Tokens stay teal/slate/copper (AD-006). Brand flyouts use `/category/[slug]?brand=`. Mega-menu brands are derived from the current catalog listing page (max 48 products).

## AD-069 Homepage visual correction (UI-T01)

Before Phase 09, storefront UI is corrected in small passes. UI-T01 is the homepage: full-bleed original hero (`/home/hero-workbench.svg`), brand as h1, one sentence, Shop / Build a PC. Sections drop boxed card grids where the link itself is enough. Product cards keep a bottom rule instead of a boxed chrome; spec chips become a plain value line. Utility top bar is not sticky; header + category nav stay sticky. Tokens unchanged (AD-006). Catalog listing, PDP, and account visual passes remain later UI tasks.

## AD-070 Hero slider and department nav

Homepage hero is a 2/1 split: left promotion slider (manual prev/next, no autoplay), right two stacked original promo tiles, then a four-item service strip. Original SVGs — not reference banners.

PC Builder is header-only (and the mobile menu). It is removed from the category bar (supersedes AD-068 on that point).

Department nav adds Techno House roots for the screenshot IA (PCs & servers, Gaming, TVs, Tablets, Phones, Gadgets, Printers, Cameras, Security, Networking, Sound, Office, Accessories, Software, Appliances) without copying competitor labels. `desktops` is now a child of `pcs-servers`. Empty departments still 404-safe via `generateStaticParams`.

## AD-071 Category nav locked to department list

Top category bar shows only: Laptop, PC and Server, Gaming, Monitor, TV, Tablet, Mobile Phone, Gadget, Printer, Camera, Security, Network, Sound, Office Items, Accessories, Software, Appliances (plus Home). Shop and Offers are not in that bar. Components is nested under PC and Server (not a top-level item); its part types still appear in that mega-menu.

## AD-072 Wider storefront containers

Content max width is `90rem` (1440px). Catalog/chrome max width is `100rem` (1600px). Slight increase so the department bar and page content fit more cleanly.

## AD-073 Top Categories homepage row

Homepage category section matches the reference IA: slanted title ribbon (“Top Categories”), rule line, “See all categories” → `/shop`, and a row of original icon shortcuts (Laptop, Processor, Mobile, Speaker, AC, TV, Gaming, Printer, GPU, Camera). Icons use Techno House tokens (teal accents), not competitor green/black chrome. Links map to existing category slugs in `lib/catalog/top-categories.ts`.

## AD-074 Brand logo grid on homepage

`Brand` includes `logoSrc`. Homepage Brands shows up to 8 original wordmark logos, a ribbon “See more” link, and an “Explore all brands” button to `/brands`. Logos are original Techno House brand marks under `/public/brands/`, not third-party trademarks. `/brands` also renders logos.

## AD-075 Storefront footer chrome (UI-T01f)

Footer follows reference IA (four columns + sub-footer), not a visual clone: `bg-text` band, teal brand mark, original copy. Columns: brand/social + Report a problem / product request + display-only track → `/account/orders`; Company; Policies; Contact without invented phone numbers. Social icons link to `/contact` until real profiles exist. Back to top → `#main-content`. Help FAB unchanged.

## AD-076 Listing product card (UI-T02)

Category/shop listings use `CatalogProductCard` (demo IA, not a clone): bordered surface, square image, title, SKU, bullet `Label - Value` specs, centered ৳ price, optional copper offer line. Homepage Featured/Deals keep the earlier compact `ProductCard`. `ProductGrid` uses the listing card only.

## AD-077 Checkout requires sign-in

Checkout is blocked without a mock customer session. Cart and header checkout CTAs send guests to `/account/login?next=/checkout` (safe relative `next` only). Register honors the same return path. Guest checkout remains out of scope.

## AD-078 Payment methods: SSLCommerz, bKash, COD

Mock payment options are SSLCommerz, bKash, and cash on delivery. POS on delivery and the older generic card/mobile mocks are removed. Still display-only — no live gateway, no card/PIN fields (AD-004, AD-051).

## AD-079 Toastify + custom confirm dialogs

Client feedback uses `react-toastify` with Techno House toast chrome (`FeedbackProvider`, `globals.css` `.th-toast*`). Confirmations (clear/remove cart) use a custom `ConfirmProvider` dialog — not SweetAlert. Add-to-cart toasts include View cart / Continue actions.

## AD-080 Category page intro (title, description, media)

Each `/category/[slug]` page shows a professional intro band: category title, original description, and either a YouTube-nocookie intro embed or an Unsplash still (`CategoryPageIntro` + `lib/catalog/category-page-content.ts`). Subcategory chips stay below the intro; product grid unchanged. Reference sites are IA only — not a visual clone. Demo accessories children include `wireless-charger` and `cables`.

## AD-081 Category SEO band below products

Category buying-guide / SEO content sits **below** the product grid (not above): headline with Techno House accent, paragraphs, optional price-range table, price note, optional popular-brands table (`CategoryPageSeo`). Structure follows common category-page IA; tokens stay Techno House (primary accents, calm table rhythm). Listing keeps a short H1 above products. Demo YouTube embeds are not shown in the SEO band (kept out of the UI for a cleaner storefront look).

## AD-082 Category listing toolbar (brand pills + price bar)

Category pages add reference-style listing chrome (IA only): brand quick-filter pills, a bordered toolbar H1 (`… Price in Bangladesh` + product count + Sort By), and a teal **Filter By** sidebar header with Reset. Bottom SEO band (AD-081) unchanged. Techno House tokens — not a visual clone of any reference brand.

## AD-083 Product detail hero + mock B2B wholesale (UI-T03)

PDP hero keeps the two-column layout (`max-w-content`, gallery + summary). `ProductSummary` drives the buy column: title, five-star rating, product ID, special/wholesale price box, savings + regular price + EMI, **For B2B** (`B2BAuthDialog`), **Check availability**, quick overview, qty + add to cart + compare + wishlist (heart icon), EMI offer row, payment/shipping/order links, and social share bar (WhatsApp, email, Facebook, Messenger, X, print, copy link). B2B wholesale mock unchanged (12% off, browser `localStorage`). Specifications / Reviews / Q&A tabs unchanged.
