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

## AD-084 Admin shell (P9-T01)

Admin lives under `app/(admin)/admin/*` with a separate layout (no storefront chrome). Shell: grouped left sidebar (`lib/admin/nav.ts` from ADMIN_REFERENCE IA), top bar (disabled search stub, view store, mock staff), mobile nav Sheet. Mock staff session in `localStorage` (`techno-house-mock-staff-v1`) via `/admin/login` — UI only, not authorization (Phase 11). Unbuilt modules use `[...path]` placeholders. Dashboard KPIs deferred to P9-T02.

## AD-085 Admin dashboard (P9-T02)

`/admin` shows an operational dashboard (not decorative charts): 6 linked KPI cards, Needs attention queue, Catalog health (stock counts from mock `productRepository`), Recent orders table (mock), and Shortcuts. Snapshot from `loadAdminDashboard()`. Revenue/orders are display-only mocks; no chart library. Order/customer modules remain stubs until later P9 tasks.

## AD-086 Admin product management (P9-T03)

`/admin/products` lists mock catalog products in a dense table (image, name, SKU, category, price, stock, flags) with URL filters (`q`, `category`, `stock`, `sort`, `page`). `/admin/products/new` and `/admin/products/[id]` share a sectioned form (basics, pricing, inventory, read-only specs, SEO stub). Saves are mock toasts only — no catalog persistence (Phase 12). Concrete routes override the admin catch-all placeholder.

## AD-087 Admin orders and refunds (P9-T04)

Mock sales data in `lib/admin/orders-mock.ts`. Routes: `/admin/orders` (filters + pagination), `/admin/orders/unpaid`, `/admin/orders/[id]` (customer, shipping, lines, mock status save), `/admin/refunds` (status filter + reasons). Phone numbers masked in lists. No payment mutations or persistence — Phase 13.

## AD-088 Admin customers (P9-T05)

`/admin/customers` lists mock profiles (name, masked contact, orders, paid spend, joined, status) with URL filters. `/admin/customers/[id]` shows contact, KPIs, staff status/notes (mock save), and linked order history from mock sales. Emails masked in the list; full contact on detail for staff UI only. No real auth/PII store — Phase 11+.

## AD-089 Admin merchandising (P9-T06)

Merchandising routes (`/admin/marketing`, `/admin/promotions`, `/admin/flash-sales`, `/admin/deals`, `/admin/coupons`) use dedicated mock data in `lib/admin/marketing-mock.ts`, separate from storefront cart coupons in `lib/cart/coupons.ts`. List pages support URL filters and pagination; create/edit forms toast mock saves only. Marketing hub summarizes active and scheduled campaign counts.

## AD-090 Admin analytics/reports (P9-T07)

`/admin/analytics` shows mock KPIs, CSS bar trend charts, top products, traffic sources, and device split with URL period filter (`7d`/`30d`/`90d`). `/admin/reports` lists report templates with category/search filters; `/admin/reports/[id]` shows summary cards, data table, and mock Export CSV / Regenerate actions. No chart library added.

## AD-091 Admin Design Studio (P9-T08)

`/admin/design-studio` provides sectioned UI for homepage landmark visibility/order, branding (name/tagline/colors), announcement bar, header toggles, and footer toggles. Config persists in `localStorage` (`techno-house-design-studio-v1`) via `useSyncExternalStore`. Does not yet apply to the live storefront — preview/wiring deferred.

## AD-092 Admin media/support (P9-T09)

`/admin/media` grid lists mock assets from `public/` with folder/search filters and detail page for alt text (mock save). `/admin/support` lists tickets with status/priority filters; `/admin/support/[id]` shows thread, reply form, and linked order. `/admin/contacts` lists form submissions with detail for status/notes. All mutations toast locally only.

## AD-093 Admin settings/staff (P9-T10)

Settings hub under `/admin/settings` with sub-nav to business, features, languages, currency (read-only BDT), and social integrations. `/admin/staff` lists mock team with filters; `/admin/staff/[id]` edits role/status (mock); `/admin/staff/permissions` shows read-only RBAC matrix; `/admin/profile` edits mock session display name. Phase 09 admin frontend complete.

## AD-094 Admin Nexa-style UI (single-vendor)

Admin chrome redesigned from reference screenshots: dark purple sidebar (`#2c1844`), light main canvas, white stat cards, top bar with Quick Menu, horizontal tabs (Dashboard/Sales/Preorders/Earnings/Design Studio), action icons, and date widget. Dashboard widgets match reference layout without multi-vendor elements (no sellers card, no in-house vs seller splits). Techno House branding and BDT retained.

## AD-095 Admin all-products list (Nexa-style, single-vendor)

`/admin/products` redesigned to match reference product table: page title **All products**, tabs (All / Inhouse / Drafts — no seller, digital, or physical tabs), search + bulk action + filter + sort bar, dense table with thumb, name/brand, category path, mock ratings/sales, price/discount, Published/Featured/Today's deal toggles, and options menu (edit, view, clone, delete). Tab filter via `?tab=`; inhouse = non-draft mock rows; drafts proxy uses `out_of_stock`. Toggles and bulk actions toast locally only.

## AD-096 Admin add product form (Nexa-style)

`/admin/products/new` and `/admin/products/[id]` use a two-column Nexa-style form: header with Clear tempdata / Import product (create) or Duplicate / View on store (edit); main column cards for basic info (incl. URL slug), configuration, files & media (existing image previews on edit), description (toolbar stub), SEO, price/stock (incl. stock status), and read-only specs on edit; sidebar cards for product settings, refund, clubpoint, warranty (+ label), shipping, COD, VAT/tax, stock display, and frequently bought. Physical-product focus only. Same layout for create and edit. **Save & publish** / **Save & unpublish** footer actions; all saves toast locally only.

## AD-097 Admin categories (Nexa-style, storefront catalog)

`/admin/categories` lists real Techno House categories from `categoryRepository` (not reference marketplace data). Tabs: All / Root / Subcategories. Search + bulk action; table with icon, name, parent, order level, level, Featured/Hot toggles, **View more** (right drawer), and options (Edit / View products / Delete). `/admin/categories/new` and `/admin/categories/[slug]` share the same Category information form (name, slug, physical-only type, parent, order, media stubs, SEO, filter attrs). Saves toast locally only.

## AD-098 Admin brands (Nexa-style, storefront brands)

`/admin/brands` lists real Techno House brands from `brandRepository` (Lumen, Ridge, CoreLine, etc. — not reference marketplace brands). Tabs: All brands / Unused brands. Search + bulk action; table with logo, name, product qty, created date, categories + **See more** (right drawer with logo, products, category list), and options (Edit / Delete / View products). `/admin/brands/new` and `/admin/brands/[slug]` share the same Brand information form (name, slug, logo, SEO). Saves toast locally only.

## AD-099 Admin attributes (gadget-focused)

`/admin/attributes` lists electronics attributes (Processors, RAM, Storage, Graphics, Display size, Socket, Form factor, PSU wattage, Color, Refresh rate, Warranty, etc.) aligned with catalog filter keys — not clothing/furniture demo values. Table shows name + value pills; **Add new attribute** / Edit open the same right drawer (name, dynamic values + Add more, Confirm). Deletes and saves toast locally only.

## AD-100 Admin units

`/admin/units` lists sellable units for physical products (Pc, Piece, Set, Box, Pair, Unit, Pack, Bundle). Search + bulk action; table with name and options (Edit / Delete). **Add new unit** / Edit open the same centered modal (Name + Confirm). Saves toast locally only.

## AD-101 Admin notes (admin-only, single-vendor)

`/admin/notes` manages admin preset notes for product PDP sections. No seller tabs, no “Seller can access” / “Seller can add note” controls. Types: Shipping, Refund, Warranty, Delivery, Cash on delivery. Table: type + description + options. **Add new note** / Edit use the same modal (Type, Description max 900, Confirm). Saves toast locally only.

## AD-102 Admin bulk product CSV import

`/admin/catalog/import` is the Product bulk upload UI. Instructions card + **Download CSV with reference data** (product skeleton CSV + reference IDs CSV built from live categories/brands and mock units/notes/attributes). **Upload product file** browse + **Upload CSV** queues a mock toast only — no catalog persistence until Phase 12. Images/variations still require manual edit after import.

## AD-103 Admin bulk product CSV export

`/admin/catalog/export` is a simple page with one action: **Download all products CSV**. Exports the full mock catalog (id, name, slug, sku, brand, category, price, stock, warranty, flags) as a CSV file in the browser.

## AD-104 Admin warranties

`/admin/warranty` lists warranty presets (5 Year, 3 Year, 2 Year, 1 Year, Lifetime, 6 Months) with placeholder seal badges (original, not reference assets). Search + bulk action; table: warranty text, logo badge, options (Edit / Delete). **Add new warranty** / Edit use the same modal (Warranty text, Logo 40×40 browse stub, Confirm). Saves toast locally only.

## AD-105 Admin product reviews (single-vendor)

`/admin/reviews` is the rating & reviews hub. Tabs: **All reviews** / **Custom reviews** (no Seller / Admin Reviews marketplace split). Filters: search, category (not seller), sort by rating. Table: #, Product (+ thumb), Brand (not Owner CMS), Rating, Reviews (+ optional “new”), Custom reviews, kebab options (View on store / Add custom / Clear mock). Data aggregates catalog products with `reviewRepository` where present and mock rating counts elsewhere; custom counts from `MOCK_CUSTOM_REVIEWS`. `/admin/reviews/new` is Add custom review: reviewer name, image browse stub, category → product (product disabled until category), star rating, system/custom date, comment, review images stub, Save toast only.

## AD-106 Admin custom labels (single-vendor)

`/admin/labels` manages product badge labels. Storefront feature toggle card: **Show custom labels on storefront** (not “Sellers can create”). Tabs: **All custom labels** / **In house** (no Seller tab). Search + bulk action. Table: checkbox (lock for system labels), Label pill badge, Source (System / In-house — not Added by CMS), Status toggle (no Seller can access column), options Edit/Delete. Create `/admin/labels/new` and edit `/admin/labels/[id]`: Text, Background color (+ picker), Light/Dark text tone cards, Products (+ Add product picker), Save toast only.

## AD-107 Admin orders Nexa redesign (single-vendor)

`/admin/orders` (and `/admin/orders/unpaid`) use Nexa-style list: tabs **All** / **Unpaid** (no Seller / In-House marketplace tabs). Toolbar: search, bulk action, delivery status, payment status, date. Table: checkbox, Order code (+ new badge), Products count, Customer, Amount (blue bar), Delivery status, Payment method, Payment status badges (Paid / Un-Paid), Refund label, kebab options (Quick manage, View, invoice/shipping/print mocks, Delete). No Seller column. Quick Order Management modal: assign delivery boy, readonly payment status, delivery status, tracking + copy, notes, Cancel/Confirm. Detail `/admin/orders/[id]`: top controls, QR stub, customer + **Sold by: Techno House**, purple order meta, line table with VAT (not IGST), totals, print mock.

## AD-108 Admin refunds section (single-vendor)

Refunds IA under Sales: `/admin/refunds`, `/admin/refunds/disputes`, `/admin/refunds/settings`, `/admin/refunds/reasons` (+ `/new`), `/admin/refunds/categories`. List tabs: All / Pending / Approved / Rejected / Wallet / Offline (no Seller/Admin marketplace tabs). Table: #, Refund code + customer, Product, Amount, Approval (Admin badge only), Payment channel + Paid/Non-Paid, options (Refund details / View order). Detail modal with timeline + Refund now / Reject. Disputes page reuses list (empty mock until dispute rows exist). Settings: refund type global/category, refund days, dispute toggle/days, preset reasons, sticker upload stub. Reasons list with Customer / Admin reject tabs. Category refund times with alert link to settings, bulk assign, no Seller column.

## AD-109 Admin customers list (Nexa)

`/admin/customers` list: color legend (pink = blocked, purple = suspicious), **Add new customer**, tabs All / Banned / Suspicious / Verified / Unverified, search + bulk action. Table: checkbox, Name (colored when blocked/suspicious), Email, Phone, Package, Wallet balance, Verification (Verified green / Unverified amber), kebab (Log in as, Ban, Mark suspicious, Wallet recharge, View profile, Delete). `/admin/customers/new` create form (name/email/phone, mock save). Detail shows wallet + verification.

## AD-110 Marketing engagement suite (professional IA)

Marketing group separated from Merchandising. Sidebar supports nested children for **Blog** (All posts / Categories) and **Notifications** (Types / Custom / History / Settings). Routes: `/admin/marketing` overview hub; pop-ups, store alerts, sale alerts, email templates, bulk SMS, subscribers, site visitors under `/admin/marketing/*`; `/admin/blog`, `/admin/blog/categories`; `/admin/newsletter`; `/admin/notifications/*`. Clean Techno House lists (not marketplace plugin chrome). Merchandising keeps promotions/flash/deals/coupons. Content group reduced to Media library. Experience keeps Design Studio only.

## AD-111 Marketing Analytics parent nav

Insights collapsed into one expandable **Marketing Analytics** parent: Home, GA4, GTM, Meta Pixel, Meta CAPI, Google Merchant Center (+ feed), Facebook Catalogue (+ feed), Custom script, Sitemap, Global SEO, Reports. Sidebar supports multi-level nested children. Integration pages are mock settings UIs under `/admin/integrations/*`, `/admin/seo`, `/admin/sitemap`.

## AD-112 Promotion & Offers redesign (single-vendor)

Merchandising **Promotion & Offers** nested parent: Overview hub (`/admin/promotions`), Promotional products (+ add modal), Category-wise discounts, Flash deals (list tabs/toggles + create form), Today's deal products (+ add modal). Coupons remain sibling. No seller columns. Mock-only mutations (toasts). Old ribbon promotion editors under `/admin/promotions/new|[id]` kept as deep links, not primary IA.

## AD-113 Marketing section Nexa redesign

Marketing hub is a 3×3 card grid (Dynamic Pop-up, Custom Alert, Notifications, Email Templates, Newsletters, Blogs, Custom Sell Alert, Custom Visitors, Subscribers). Popups/alerts have list + create/edit forms with live preview. Sale alert is interval/product settings. Email templates use All/Admin/Customer/Common tabs (no Seller). Notifications: types (Customer/Admin + side form), send custom, empty history. Bulk SMS remains in nav only. Mock-only.

## AD-114 Marketing Analytics Nexa redesign

`/admin/analytics` is a 3×3 integration hub. Pages customized to reference: GA4 / Meta Pixel / CAPI / Catalog / Merchant Center (form + instructions), GTM & Custom Scripts (script textareas + green Update), Global SEO (meta fields + image), Sitemap (generate + history), Facebook Catalog products (single-vendor tabs, sync/export, add modal). Mock-only.

## AD-115 Report Center (single-vendor)

Insights no longer lists Reports. New **Report** group → **Report Center**: Earning Report (KPI + period charts), Product Sale, Products Stock, Products wishlist, User Searches, Wallet Recharge History. No Seller Products Sale / Commission History. Charts are CSS/SVG mock; product tables use catalog + category filter. Legacy `/admin/reports/[id]` templates remain as deep links.

## AD-116 Design Studio feature hub (no layout template pickers)

`/admin/design-studio` is a Design Studio–style card hub grouped by Techno House features: Brand & style (system, appearance, typography, logo), Content & pages (banners, CMS pages, auth), Footer widgets, Admin navbar. **No** “select homepage / select header / select footer” template pickers. Nested settings use stacked white cards + green Update (mock). Pages list + add/edit with SEO fields for storefront CMS. Experience → Design Studio nav children. Mock-only; legacy localStorage homepage config left unused by the new UI.

## AD-117 Media library (All uploaded files)

`/admin/media` matches Nexa file manager: title “All uploaded files”, purple Upload New File (mock picker), Bulk Action, Sort (newest/oldest/name), folder filter, Search, Select All, dense thumbnail grid with per-file checkbox + ⋮ menu (Details / Copy path / Delete mock). Detail page uses card + green Update. Expanded mock assets from public SVGs. Mock-only — no real storage.

## AD-118 Support & Communication (single-vendor)

Sidebar group **Communication** → **Support & Communication**: Ticket (`/admin/support` Support Desk), Product Conversations (`/admin/support/conversations`), Contacts (`/admin/contacts`). **No Seller Requests.** Support Desk: ticket-code search + table (Ticket ID, Sending Date, Subject, User, Status, Last reply, Options). Conversations & Contacts use Nexa empty “Nothing found” frown state when empty; Contacts columns include Query/Reply. Mock-only.

## AD-119 Payment Gateways admin (mock credentials)

New **Integrations** nav → **Payment Gateways** → Payment Methods (`/admin/payments`) and Offline payments (`/admin/payments/offline`). Payment Methods: stacked cards for **bKash**, **Nagad**, **SSLCommerz** (enable toggle, credential fields, sandbox toggles, blue Save). Secrets use password inputs, stay in React state only, cleared after Save toast — **not** written to localStorage or called against live APIs (AD-004). Offline page covers COD display label. Checkout mock methods remain SSLCommerz / bKash / COD (AD-078); Nagad admin config is preparatory. Live gateway work is Phase 13.

## AD-120 Setup & Configurations nav IA (placeholders)

**System** group replaced by **Setup → Setup & Configurations** with: Business Settings, Features activation, Languages, Currency, SMTP Settings, File System & Cache, Social media Logins, nested **Google** (reCAPTCHA, Map, Firebase), nested **Shipping** (method, configuration, countries, states, cities, areas, zones, carriers). Existing settings UIs kept where present; new routes use `AdminFeaturePlaceholder` until design screenshots. Shipping/SMTP removed from Operations (OTP remains).

## AD-121 Setup & Configurations full mock UI

Business Settings is a Design Studio–style hub with cards linking to general/orders/tax/pickup/invoice/tracking/shipping-label/thermal-printer. Feature Activation uses toggle cards (Infrastructure, Customer & Checkout, Promotions & Loyalty, Security & Auth) — **no Seller & Vendor**. Languages/Currency match Nexa list UIs; currency remains BDT-first (AD-006). SMTP, File System & Cache, Social OAuth credential cards, Google reCAPTCHA/Map/Firebase implemented. **Select Shipping Method** includes **Pathao** and **Steadfast** with enable toggles + API credential fields (secrets cleared on Save, not stored). Shipping Configuration supports area/product/flat/carrier-wise (no seller-wise). Location/carrier tables are mock BD data. Mock-only.

## AD-122 Staff & Roles feature-wise permissions

Staff nav: **All staffs**, **Roles**, Profile. Staff list (`/admin/staff`) matches Nexa (#, Name, Email, Phone, Role, Options) + Add New Staffs. Staff form (new/edit) has Name/Email/Phone/Password/Role. Roles list (`/admin/staff/roles`) + role form with **feature-wise permission toggles** grouped by Techno House modules (catalog, sales, refunds, customers, marketing, analytics, reports, design studio, media, support, payments, shipping Pathao/Steadfast, setup, staff, etc.). **No seller/multivendor permissions.** Old `/admin/staff/permissions` redirects to roles. Mock-only — enforcement Phase 11.

## AD-123 Remaining admin pages (OTP, Questions, PC Builder)

Filled last nav catch-alls: `/admin/otp` (SMS gateway credentials + test OTP, secrets cleared on save), `/admin/questions` (+ answer form), `/admin/pc-builder` (enable toggle, component slots, mock compatibility notes). Profile polished to Nexa Staff Information card. All sidebar hrefs now have concrete pages.

## AD-124 Storefront–admin feature gap fill (mock, no backend)

Admin coverage added for storefront features that previously had no ops UI: **Product requests** (`/admin/product-requests`), **EMI settings** (`/admin/payments/emi`), **B2B accounts** (`/admin/customers/b2b`), **Products Compare report** (`/admin/reports/compare`), **PC Builder** rules + saved builds. Feature-permission groups extended. Mock-only; **Phase 10 remains unapproved.** Storefront stubs (offers/deals/flash landings, blog, customer wallet page, popup widgets) stay storefront-side — not started as backend.

## AD-125 Admin chrome polish (labels + icons)

Feature page layouts stay. Admin **shell** only: sidebar parent groups use Lucide icons and title-case names (Home, Catalog, Sales, Customers, Promotions, Marketing, Media, Analytics, Reports, Appearance, Support, Messaging, Payments, Settings, Staff). Inactive groups stay collapsed until opened. Top tabs: Dashboard, Orders, Unpaid, Reports, Design. Quick Menu / duplicate date strip removed from the header. Reference screenshots remain IA/UX only (AD-006).

## AD-126 Homepage service bar + top categories polish

Storefront chrome only. Service strip uses icon tiles, hairline grid, and links to checkout / support / shipping. Top categories uses a standard heading (no clip-path tab), card tiles, teal icon wells, hover lift. Same 10 category destinations. Design tokens only (AD-006).

## AD-127 Product card list action icons

Wishlist and Compare on catalog/home product cards (`ProductListActions`) show Heart and swap icons beside the labels. Filled heart when saved. Behavior unchanged.

## AD-128 Homepage product cards (deal-card layout)

`ProductCard` (featured, deals rail, wishlist) uses rounded surface cards: % off + New/Sale chips on the image, warranty chip, centered title/price, **View** (ink) + **Add to cart** (soft copper wash), wishlist/compare with icons **below** those buttons — not floating on the photo. Deals section titled Best deals with See all + horizontal rail. IA/UX from a deal carousel screenshot; no copied badges/branding (AD-006). Button variants `ink` and `soft` added for this pair.

## AD-129 Product card hybrid (professional pass)

Combined catalog-grid IA (centered brand, two-line specs, save-extra line, hover cart/quick-view circles) with deal-card actions (View + Add to cart). Removed image warranty shield, Hot/Sale pills, and full-width wishlist/compare buttons. Wishlist/compare are circular icons **under** the action row. Hover overlay is cart + eye only (desktop). Tokens only (AD-006).

## AD-130 Premium ProductCard + 5-column grid

Reusable `ProductCard` keeps existing `ProductSummary` fields, `/product/[slug]` View, and `AddToCartButton`. Badge is derived (`brandName` + New, or Sale) — no schema change. Hover overlay (desktop) reveals Wishlist / Compare / Quick view with tooltips and aria-labels; touch shows the icons. Warranty uses ShieldCheck. Featured/deals/shop/wishlist grids: 2 / 3 / 4 / 5 columns, no horizontal rail. Image source unchanged. AD-006.

## AD-131 ProductCard minimal pass

Supersedes AD-130 styling (data, routes, and cart/list behavior unchanged). Pill badges dropped: `New`/`Sale` is small uppercase text over the image, discount is small text beside the struck-through price. Card is `rounded-sm` with a hairline border and a soft hover shadow; the image sits on white with generous padding and a 4% zoom. Hover icons are small square buttons in the image's top-right, hidden until hover/focus and always shown on touch. Title is medium weight (not bold), brand line removed. Buttons are `rounded-sm`: outline View + primary Add to cart. Transitions 200–300ms.

## AD-132 Storefront nav — dark three-row header

IA follows a retailer reference (rows, not branding — AD-006): **utility row** (phone, email, customer service, offers, new arrivals, brands with small icons, centered, desktop only), **header row** (logo, centered search with teal submit, PC Builder CTA, cart/wishlist/compare/account icons with count badges), **category row** (home icon + category triggers, mega panels unchanged). All three rows use `bg-text` deep slate with `primary-foreground` text — Techno House teal/copper accents, not the reference's colors. Header icon buttons share `HEADER_ACTION_CLASS` (`components/layout/header-action-class.ts`) instead of the `ghost` button variant, since `cn()` does not merge conflicting Tailwind classes. Mega panels switched to `bg-surface` so they read against the dark bar. Store phone/email in `STORE_CONTACT` (`lib/catalog/primary-nav.ts`) are display-only until Phase 16 business settings.


## AD-133 Home hero enlarged

Hero slider height moved from 288/352px to 320 / 384 / 448 / 512px (`sm` → `lg`); side promos stretch to fill the taller row on desktop (~250px each) and are 176/192px below `lg`. Headline scales to `text-display` on `lg`, body to `text-lg`, padding to `p-12`. Unsplash source raised to 1800x1100 for the larger render box. Grid split stays 2:1; carousel controls, links, and data unchanged.

## AD-134 Homepage store-information block

`HomeStoreInfo` (`features/home/home-store-info.tsx`) sits between Guides and the footer — the long-form store copy slot that BD retail references keep at the bottom of the homepage (IA only; copy is original Techno House text, AD-006). Supersedes the AD-034 "no SEO essays" stance now that the homepage is otherwise complete. Server Component, zero JS: two blocks are always visible and four more sit inside a native `<details>` `Read more` (same disclosure pattern as `mobile-nav`), so all copy stays in the DOM for crawlers. Value is internal linking — categories, PC Builder, offers/deals/flash-sale, warranty/shipping/returns, brands, support/FAQ/product-request/contact — every href an existing route. Claims are limited to what this build actually does; prices remain display-only. Registered in `HOME_SECTIONS` so Design Studio can toggle it (`mergeWithDefaults` backfills stored configs).

## AD-135 Homepage section headers + Guides / Shopping here / Brands redesign

The angled `clip-path` ribbon heading is retired. `HomeSectionHeader` (`features/home/home-section-header.tsx`) is now the single header for categories, PC Builder, brands, trust, content, and store info: `text-2xl` title, optional lede, hairline rule, right-aligned link with a sliding arrow. Bodies were differentiated so the three lower sections no longer look like the same card grid:

- **Shopping here** — dark `bg-text` band with light hairline dividers, outlined teal circular icons that fill on hover, and a teal "Learn more". Gives the lower page a contrast anchor against the white sections.
- **Guides** — three editorial cards (`rounded-sm`, hairline border, soft hover shadow + 0.5 lift) with a teal icon tile, a muted `01/02/03` index, `text-lg` title, and an arrow CTA.
- **Brands** — hairline logo wall, 9 logos plus an "All brands" cell showing the total count (5 columns x 2 rows on `sm`, 2 columns on mobile). Logos show full real colour at rest and scale up 5% on hover (changed from an earlier grayscale-until-hover treatment — AD-279 — operator wanted real brand colours visible by default). The standalone centred "Explore all brands" button is gone; the header link and the last cell cover it.

Routes, data, `EmptyState`, and copy are unchanged. `HOME_BRAND_LIMIT` 8 to 9 so the grid fills evenly.

## AD-136 Demo promotional banners (display-only)

Homepage now shows the banner slots the admin already defines, so the marketing systems have something visible on the storefront. Data: `lib/catalog/promo-banners.ts` (`PromoBanner`, slots `flash-wide` and `promo-tile`). Rendering: `features/home/home-banners.tsx` — `HomeFlashBanner` (wide strip under Top categories, linking `/flash-sale`) and `HomePromoBanners` (paired strips after Best deals, linking `/deals` and `/offers`).

Aspect ratios are taken straight from the Design Studio upload hints: `400/184` on mobile and `1370/242` from `sm` for the flash strip, `600/160` for the tiles. The flash banner reuses the `flash-end-season` id and title from `MOCK_FLASH_DEALS`, but the storefront does **not** import `lib/admin` — the copy is duplicated deliberately to keep the layers separate until a real promotions repository exists in Phase 15.

Banners are image + gradient + eyebrow/headline/CTA (Unsplash, already in `remotePatterns`); no baked-in text, no countdown timer, no discount percentages, and no scheduling. Copy avoids price claims since nothing here is a real campaign. Both sections are registered in `HOME_SECTIONS` for Design Studio visibility toggles.

## AD-137 PostgreSQL development setup (P10-T01)

Phase 10 approved by the user on 2026-09-04. Development database is the PostgreSQL **14.5** already bundled with Laragon on `127.0.0.1:5432` — no Docker, no new service, since the instance was running and reachable. Nothing was installed for this task.

Provisioning lives in `scripts/db/setup-dev-database.sql` (idempotent, source-controlled). It creates the `techno_house` login role and the `techno_house_dev` database owned by it, makes that role the owner of `public`, and revokes implicit `CREATE` from `PUBLIC`. The role gets `CREATEDB` **for development only**, so Prisma can manage its shadow database in `migrate dev` (P10-T04); production roles must not have it. The password is passed via `psql -v db_password=...` and built with `format(%L)`, so no credential is committed — psql does not interpolate `:variables` inside dollar-quoted blocks, hence `\gexec` rather than a `DO` block.

The generated connection string lives only in `.env.local` (gitignored); `.env.example` carries a placeholder. `lib/env.ts` is the single read point: `getEnv()` validates on first use that `DATABASE_URL` exists, parses, and uses the `postgresql:`/`postgres:` protocol with a host and database name, then caches. Errors never echo the value because it contains a password, and the module throws if imported from the browser (no `server-only` package installed, so the guard is a `typeof window` check).

Deliberately **not** in this task: ORM (T02), schema (T03), migrations (T04), seeds (T05), and repository implementations (T06). `lib/data` still serves mocks and no application code imports `lib/env` yet.

## AD-138 Prisma 7.10.0 as the ORM (P10-T02)

Prisma confirmed as the ORM (`docs/DATABASE.md` already named it the default). **Pinned to 7.10.0**, not the npm `latest` tag: `latest` currently resolves to `8.0.0-rc.12`, which is a release candidate and needs Node ≥ 22.18 while this machine runs 22.17. Revisit when v8 is stable.

Three Prisma 7 behaviours drove the shape of the setup:

- **No `url` in `schema.prisma`.** The CLI takes the connection string from `prisma.config.ts`; the client needs a driver adapter. Added `@prisma/adapter-pg` (Prisma 7 is Rust-free, so there is no query engine binary).
- **Generated client goes into the source tree.** `output` is now required; it writes to `lib/generated/prisma`, which is gitignored, ESLint-ignored, and rebuilt by `db:generate` plus a `postinstall` hook.
- **`.env` is not auto-loaded.** `prisma.config.ts` loads it with `dotenv` (new devDependency), reading `.env.local` before `.env` so the app and CLI share one connection string. The config reads `process.env.DATABASE_URL` rather than the `env()` helper from `prisma/config`, because that helper throws while the config is merely loaded and would break `prisma generate` wherever no database exists (CI, image builds). `lib/env.ts` remains the strict validator for application code.

`lib/db/prisma.ts` exports the singleton, caches it on `globalThis` outside production so dev hot reloads do not leak connection pools, and logs `warn`+`error` in development, `error` only in production. Repositories in `lib/data` are the only code allowed to import it.

Security: installing the CLI pulled in `deepmerge-ts` (stack exhaustion) and an unused `mysql2`, 4 high advisories. Both came only through the `prisma` devDependency, and `npm overrides` pinning `deepmerge-ts@^8.0.2` and `mysql2@^3.24.3` brought the audit to **0 vulnerabilities** with the CLI still working.

Also added `tsx` (devDependency) because the generated client uses extensionless relative imports that plain Node ESM cannot resolve; Prisma documents `tsx` for exactly this and P10-T05 needs it for `prisma db seed`. `scripts/db/check-connection.ts` (`npm run db:check`) exercises the real path — dotenv, adapter, generated client, database — and reports the connected database and server version without ever printing the credential-bearing URL.

Verified: `prisma validate`, `prisma generate`, `tsc --noEmit`, `eslint .` (3 pre-existing unrelated warnings), `npm run db:check` → connected to `techno_house_dev` (PostgreSQL 14.5), storefront still serving 200. No models, migrations, or queries — those are T03/T04.

## AD-139 Initial database schema (P10-T03)

`prisma/schema.prisma` now holds **59 models and 30 enums**, covering all 43 entities in `docs/DATABASE.md` plus the join/child records they require (`RolePermission`, `ProductAttributeValue`, `WishlistItem`, `CompareListItem`, `RefundReason`, `RefundEvent`, `PromotionProduct`, `FlashSaleItem`, `CategoryDiscount`, `ShippingCountry/State/City`, `ShippingMethodZone`, `ShippingCarrier`, `SupportMessage`, `B2BAccount`). Field names and enum values follow the existing app types in `lib/data/types` and the admin mocks, so P10-T06 repositories can map onto them without UI changes.

Decisions worth keeping:

- **Money** is an integer `...Amount` column plus `currency`, mirroring `Money` in `lib/data/types/common.ts`. No `Decimal`, because the store transacts in whole ৳ and the server recomputes totals anyway.
- **Order history is immutable.** `OrderItem` snapshots product name, SKU, and unit price; `Order` snapshots contact and shipping address. Product/variant relations on order lines are `SetNull`, never `Cascade`, so editing or removing a product cannot rewrite past orders.
- **Specs are attributes, not their own tables.** `ProductAttribute.groupLabel` builds the grouped spec table, `isFilterable` drives facets, `ProductAttributeValue.isHighlight` selects the card chips. This collapses `SpecGroup`/`SpecRow`/`SpecChip` into one structure.
- **`Product.stockStatus` is denormalised** from `ProductStock` so listing queries avoid a join; the domain layer owns keeping it in sync.
- **Payment idempotency is enforced in the database**: `@@unique([provider, transactionRef])` plus a unique `idempotencyKey`, so a replayed webhook cannot create a second payment (docs/PAYMENT_SECURITY.md).
- **Deals folded into `Promotion`** via a `kind` enum instead of a near-duplicate `Deal` table; the admin mocks had two overlapping campaign shapes (`AdminFlashSale` vs `AdminFlashDeal`) and only the flash-sale one earned a separate model.
- **Complaints absorb product requests** (`source` enum + `productWanted`), rather than a second inbox table.
- **Nothing sensitive is modelled**: `passwordHash` only, no card data, no gateway secrets (environment variables), `AnalyticsConfiguration.publicId` for public measurement ids only, and `AuditLog.ipHash` is hashed.

One fix during validation: `Staff.role` had to become optional because `roleId` is nullable.

Verified without touching any database — `prisma validate`, `prisma format`, `prisma generate`, `tsc --noEmit`, and a `prisma migrate diff --from-empty` dry run producing 60 tables, 30 enum types, 111 indexes, and 73 foreign keys. `techno_house_dev` still reports **0 tables**; applying the schema is P10-T04.

## AD-140 Migration strategy (P10-T04)

Prisma Migrate, with migrations source-controlled in `prisma/migrations/` alongside `migration_lock.toml`. Baseline `20260904153949_init` is committed and applied to `techno_house_dev`: **60 tables, 30 enums, 73 foreign keys**, verified in PostgreSQL rather than trusted from CLI output.

Scripts: `db:migrate` (dev — create + apply), `db:migrate:deploy` (staging/production/CI — apply only), `db:migrate:status`, and `db:drift` (`migrate diff --from-config-datasource --to-schema --exit-code`, exits 0 on match and 2 on drift, so CI can gate on it).

Documented rules in `docs/DATABASE.md`: forward-only (never edit an applied migration; fix with a new one); read the generated SQL before committing; commit schema and migration together; production runs `migrate deploy` after a verified backup and before the new app version starts; destructive steps are split from the deploy that stops using the column.

**No `db:reset` script exists, on purpose.** `prisma migrate reset` drops every table and `db push` bypasses migration history, so both must be typed out deliberately rather than sitting one keystroke away in `package.json`. The dev role keeps `CREATEDB` for the `migrate dev` shadow database; `migrate deploy` never needs one, so production roles still must not have it.

Prisma 7 note: `migrate diff` dropped `--to-schema-datamodel` (now `--to-schema`) and no longer accepts `--shadow-database-url`, so the drift check compares the live datasource against the schema instead of replaying migrations into a shadow database.

Verified: migration applied, `migrate status` reports up to date, `db:drift` reports no difference, `db:check` connects, `tsc --noEmit` passes, and the dev server boots and serves `/` with 200. Still no seed data and no application code reading the database — those are T05 and T06.

## AD-141 Seed strategy (P10-T05)

`prisma/seed.ts`, run with `npm run db:seed` and registered as `migrations.seed` in `prisma.config.ts`.

**The seed imports the existing mock modules instead of restating their data.** `lib/data/mocks/catalog`, `lib/data/mocks/review-repository`, `lib/cart/shipping`, and the `lib/admin` mocks are the single source, so the seeded database and the mock-backed pages cannot drift apart. That is what makes the T06 repository swap verifiable: the same slugs, prices, and specs must come out of either backend. `tsx` resolves the `@/` path aliases, so the mocks import directly.

Idempotent by upsert on natural unique columns (slug, sku, code, key). Two sets have no natural key and are replaced per owner instead: product images, and role permission grants (so a revoked permission does not linger). Reviews and questions reuse their mock ids as primary keys, which is what makes them upsertable at all. Three ordering constraints: categories are written in two passes so a parent exists before a child references it, products resolve brand/category/warranty first, and related products link in a final pass once every row exists.

**Customers, staff logins, orders, payments, and carts are deliberately not seeded.** They depend on real authentication (Phase 11), and fake credentials or fake financial records are worse than an empty table. Values the mocks lack are derived, not invented: warranty months parse from the label ("2 year warranty" → 24) and stock quantities follow the status the storefront already displays (25 / 4 / 0).

Guard: the script throws when `NODE_ENV=production`. This is demo catalogue data and must never reach a real store.

Verified: seeded 35 categories, 10 brands, 25 products, 27 images, 14 attributes, 36 attribute values, 6 warranties, 4 reviews, 3 questions, 187 permissions, 3 roles, 6 refund reasons, 2 shipping zones, 6 areas, 3 methods, and 5 PC Builder rules. (Spec chips and groups were added to the seed in AD-142.) A second run produced identical counts. Relations were checked in the database rather than inferred from counts: category parents resolve, related products preserve the mock's direction, every product has images and a stock row, the primary image is index 0, and role grants come out 187 / 174 / 21. That check surfaced one bug — `isSystem` was keyed on `"admin"` when the mock role id is `"role-admin"`, so no role was protected; fixed, and now set on update as well. `tsc --noEmit` and `eslint` pass (3 pre-existing unrelated warnings).

## AD-142 Per-product specification storage (P10-T06)

Building the repository layer surfaced a gap in the T03 schema: products carry **three distinct spec datasets**, and only one of them could be stored.

| Dataset | Rows | Purpose | Example |
| --- | --- | --- | --- |
| `attributes` | 36 | facets and filtering | `storage: "512GB"` |
| `specs` chips | 52 | product card | `Storage: "512GB SSD"` |
| `specGroups` rows | 61 in 26 groups | detail spec table | the same row under `Core` |

They are not views of one another: `north-prebuilt-desktop` shows the chip `RAM=16GB` but the table row `16GB DDR5`, 22 chips have no matching attribute, and three products (both chargers and the USB-C cable) have chips but **zero** attributes. Crucially, `ProductAttribute.groupLabel` could not hold the grouping at all, because the group belongs to the product, not the attribute — 11 keys appear under different titles on different products (`storage` under Core, Performance, Configuration, Phone, and Tablet).

Proceeding on the old schema would have shipped product cards with missing or wrong chips (three products with none) and detail tables missing 30 of 61 rows. The user approved extending the schema instead.

Migration `20260904162344_product_spec_presentation` adds `ProductSpecChip`, `ProductSpecGroup`, and `ProductSpecRow` (all per-product, all ordered) and drops `ProductAttribute.groupLabel` and `ProductAttributeValue.isHighlight`. Both dropped columns only ever held seed-derived data, and both were actively misleading: they claimed to drive presentation that provably cannot be derived from attribute definitions. `ProductAttribute` now means one thing only — the machine-comparable value that facets and filters use.

`prisma migrate dev` refuses to drop columns non-interactively, so the migration SQL was generated with `migrate diff --from-config-datasource --to-schema --script`, reviewed, committed, and applied with `migrate deploy`. `db:drift` reports no difference.

## AD-143 Repository layer on PostgreSQL (P10-T06)

Prisma repositories in `lib/data/prisma/` implement the existing interfaces; `lib/data/index.ts` binds them by default and falls back to the mocks when `DATA_SOURCE=mock`. Presentation code was not touched — it already imported `@/lib/data`, which is the whole point of the layering established in the frontend phases.

**`npm run db:parity` is the evidence.** It runs both implementations over the same 161 queries — every filter, sort, page, product detail, review, question, and builder slot — and diffs the results; it passes only on an exact match. Three real bugs came out of it rather than out of guesswork: `discount` sorting broke ties differently (the candidate query had no base `orderBy`, so equal discounts came back in arbitrary order), brand listing was alphabetical instead of curated (the homepage shows only the first nine, so this changed which brands appear), and questions were newest-first instead of oldest-first.

Seeded products now keep their catalogue id (`p-lumen-14`) instead of a cuid, so ids are stable across re-seeds and identical in both modes. Existing rows were migrated by rewriting the primary key in place — every foreign key to `Product` is `ON UPDATE CASCADE`, so children followed without deleting anything.

Ordering compromises, both documented in `docs/DATABASE.md`: `featured` sort, brand listing, and builder candidates use row creation order because `Product` and `Brand` have no `position` column (Phase 12 should add one), and `relatedSlugs` comes back in catalogue order because the link table carries no position. `discount` sort reads a three-integer projection of the matched set and sorts in memory, since `orderBy` cannot compare two columns; a stored discount column is the fix if the catalogue outgrows it.

`lib/db/prisma.ts` now exports `getPrisma()` and builds the client on first use. Creating it at import time validated `DATABASE_URL` and opened a pool merely because a module was imported, which would have made `DATA_SOURCE=mock` useless — verified by running the data layer with `DATABASE_URL` deleted from the environment.

**`next build` caught a bundling bug that `next dev` hid**: `features/admin/reports/admin-report-center-ui.tsx` is a Client Component importing `formatReportMoney` from `lib/admin/load-report-center.ts`, which reaches `@/lib/data` — dragging the `pg` driver into the browser bundle. Harmless while the data layer was pure mocks, fatal once it was not. The four-line formatter moved into the client component. An import-graph walk over all 210 client entry files (treating `"use server"` modules as RPC boundaries) confirms this was the only violation. `pg` and `@prisma/adapter-pg` are now in `serverExternalPackages`.

Verified: 161/161 parity checks match; `tsc --noEmit` and `eslint` clean; `next build` succeeds and prerenders all 25 product pages and 11 builder slot pages from the database; dev and production servers serve storefront and admin pages, including `shell-usb-c-cable`, whose three chips have no attributes and would have rendered empty under the old schema.

## AD-144 Customer authentication (P11-T01)

Customer auth is real, not mock. Passwords use Argon2id (`@node-rs/argon2`, OWASP/Lucia parameters). Sessions are opaque: a random token in the `th_customer_session` httpOnly cookie, SHA-256 of that token in `CustomerSession`. No JWT. Staff must not reuse this cookie name (docs/SECURITY.md).

Migration `20260904231647_customer_sessions` adds the table. Register, login, logout, and profile update are server actions against `User`. Failed login returns a generic message and still runs Argon2 against a dummy hash so unknown emails are not leaked by timing. Middleware only checks cookie presence on `/account/*`; `getCustomerSession()` does the real DB validation (revoked, expired, blocked, missing hash).

The localStorage mock customer session is gone. The storefront layout hydrates a `CustomerSessionProvider` from the server so header/cart/checkout stay in sync after `router.refresh()`. Password-reset email is deferred until SMTP — the forgot-password form stays honest about that. Demo credentials for local only: `customer@techno-house.demo` / `Demo-Customer-Only-11!`.

Verified: demo password verifies; session create/revoke works; `/account` redirects when unsigned; login/register return 200; `tsc --noEmit` clean.

## AD-145 Admin/staff authentication (P11-T02)

Staff auth is real and strictly separate from customers. Same opaque-session pattern: random token in cookie, SHA-256 in `StaffSession`. Cookie name is `th_staff_session` with **path `/admin`**, so it is not sent on storefront requests and cannot be confused with `th_customer_session`. Staff sessions last 12 hours (customers stay at 30 days). There is no self-serve staff registration.

Migration `20260904234051_staff_sessions` adds the table. Login/logout are server actions against `Staff`. Only `ACTIVE` staff with a password hash may sign in. Failed login uses the same generic error and dummy Argon2 hash as customers. Middleware gates `/admin/*` except `/admin/login`; `getStaffSession()` does the real DB validation.

The localStorage mock staff session is gone. The admin root layout hydrates a `StaffSessionProvider`. Token hashing is shared in `lib/auth/session-token.ts`; cookie names, tables, and paths stay separate. Permission checks on admin mutations are still P11-T04.

Demo credentials for local only: `ops@techno-house.demo` / `Demo-Staff-Only-11!` (Admin role).

Verified: demo staff password verifies; `/admin/login` 200; `/admin` and `/admin/products` redirect when unsigned; `tsc --noEmit` clean.

## AD-146 Session hardening (P11-T03)

Session create/resolve already existed for customers and staff. This task hardens the shared lifecycle without adding a device-list UI or changing cookie names/paths.

- Token shape is checked in middleware (`43` character base64url) so junk cookies never reach PostgreSQL. The regex lives in `lib/auth/session-token-format.ts` so Edge middleware does not import Node crypto.
- Cookie flags (httpOnly, Secure in production, SameSite=lax) are shared via `lib/auth/session-cookie.ts`; each caller still supplies its own name and path.
- Auth server actions require `Origin` host to match `Host` / `X-Forwarded-Host` (`lib/auth/same-origin.ts`). Next.js Server Action CSRF remains; this is defense in depth. Missing Origin is rejected.
- `lastUsedAt` on both session tables, touched at most every 10 minutes on a successful resolve. Absolute TTLs are unchanged (30 days customer, 12 hours staff).
- On login, expired and revoked rows for that owner are deleted, then live sessions above the cap are dropped oldest-first: **5** customer, **3** staff.
- If resolve finds an owner who is not `ACTIVE` (or has no password hash), every session for that owner is revoked, not only the current cookie.

Migration `20260904235500_session_hardening`. No session-management screen — listing/revoking other devices can wait until there is a product need.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; cap/origin/token-format smoke passed; `/account` and `/admin` still redirect when unsigned; a malformed staff cookie is rejected at middleware.

## AD-147 Roles and permissions (P11-T04)

Authorization is server-side and key-based (`product.view`, `roles.manage`, …), matching the seeded `Permission` catalogue. `getStaffSession()` now returns `permissions: string[]` from `RolePermission`. The admin panel layout reads the path from middleware (`x-techno-admin-path`) and redirects to `/admin/forbidden` when the role lacks a matching view permission. Longest prefix wins; unmapped paths are denied even for Admin so new pages cannot ship open. `/admin/profile` is allowed for any signed-in staff.

`staffWithPermission(key)` is the mutation guard. The first real mutation is saving a role (name + grant set) via `saveStaffRoleAction`, which also requires the P11-T03 same-origin check. The permission matrix UI reads PostgreSQL instead of `MOCK_STAFF_ROLES`. Seed no longer resets grants on every run: empty roles get the mock defaults, and the Admin system role only gains newly added catalogue keys.

The sidebar filters the same map. That is not the control. Staff list/create/edit stays mock; wiring staff CRUD is a later task. Future catalog/order mutations must call `staffWithPermission` when they stop being mock saves.

Verified: `tsc --noEmit` clean; eslint clean on touched files; Support-role path checks (dashboard/orders yes, staff/settings no, unmapped deny); unsigned `/admin/*` still 307 to login.

## AD-148 Audit logs (P11-T05)

Privileged staff actions write an append-only `AuditLog` row through `writeAuditLog`. The helper hashes IP, drops metadata keys that look like passwords/tokens/secrets, and swallows write failures so an audit outage cannot lock admins out. Failed staff login stores `emailHash` (SHA-256 of the attempted email), never the address or the password.

Covered now: staff sign-in, failed sign-in, blocked sign-in, sign-out, role create, role update (added/removed permission keys). Catalog and other mock admin saves are not audited until they become real mutations.

The viewer is `/admin/staff/audit`, gated by a new `audit.view` permission (Admin only by default). Migration `20260905001500_audit_view_permission` inserts the permission and grants it to `role-admin` so the demo staff can open the page without a re-seed.

Verified: `tsc --noEmit` clean; eslint clean on touched files; sanitize smoke (password stripped from metadata); unsigned `/admin/staff/audit` 307 to login.

## AD-149 Auth rate limits (P11-T06)

Auth, register, and forgot-password attempts are limited in PostgreSQL (`AuthRateLimit`) rather than Redis. Bucket keys are SHA-256 of IP or email — never the raw value. Missing IP shares an `unknown` bucket.

Limits apply after field validation and before Argon2 / password lookup. The user-facing message is always `Too many attempts. Try again in a few minutes.` Logout and profile update are not limited. Forgot-password is now a same-origin server action so the limit can run; SMTP is still Phase 16, so the action records the request without sending mail and without revealing whether the address exists.

Windows: customer login 10/IP and 5/email per 15 minutes; staff login 8/IP and 5/email per 15 minutes; register 5/IP per 60 minutes; forgot-password 5/IP per 15 minutes. Counters use `updateMany` with `count < limit`; a few extra concurrent attempts can slip through. Stale windows older than 24 hours are deleted best-effort. OTP has no endpoint yet, so it is not limited here.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; consume-until-blocked smoke (5 email attempts then generic block); `/account/forgot-password`, login, register, and `/admin/login` 200.

## AD-150 Category admin persistence (P12-T01)

Admin category create/edit/delete writes to the existing `Category` table. No schema change: `position`, `filterKeys`, `description`, `isActive`, and the parent relation were already there. Storefront `categoryRepository` still returns active rows only; admin list includes hidden categories and uses `_count` for products/children.

Mutations go through `saveAdminCategory` / `deleteAdminCategory` after same-origin + `category.add` / `category.edit` / `category.delete`. Delete is refused when products or child categories remain. A parent cannot be set to a descendant (cycle check). Banner/icon/cover file inputs, Featured/Hot toggles, and bulk actions stay mock. Meta title is not stored; the description field maps to `Category.description`.

`DATA_SOURCE=mock` cannot persist — the action returns that the database is required. Audit events: `category.create`, `category.update`, `category.delete`.

Verified: `tsc --noEmit` clean; eslint clean on touched files; CRUD smoke (create, cycle reject, hide from storefront repo, child-block on delete, cleanup); unsigned `/admin/categories` and `/admin/categories/new` 307; `/category/laptops` 200.

## AD-151 Brand admin persistence (P12-T02)

Admin brand create/edit/delete writes to `Brand`. Migration `20260905004500_brand_position_description` adds `description` and `position` (backfilled from `createdAt` order). Storefront `brandRepository` still returns active rows only and now orders by `position`. Admin list includes hidden brands.

Mutations go through `saveAdminBrand` / `deleteAdminBrand` after same-origin + `brand.add` / `brand.edit` / `brand.delete`. Delete is refused when products remain. Logo file inputs stay mock; existing `logoSrc` is not cleared on save. Meta title and keywords are not stored; the description field maps to `Brand.description`.

`DATA_SOURCE=mock` cannot persist. Audit events: `brand.create`, `brand.update`, `brand.delete`. Product merchandising `position` is still deferred to P12-T04.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; `db:parity` 161 checks; CRUD smoke (create, hide from storefront, slug clash, product-block on Apex, cleanup); unsigned `/admin/brands` and `/admin/brands/new` 307; `/brands` 200.

## AD-152 Attribute admin persistence (P12-T03)

Admin attribute create/edit/delete writes to `ProductAttribute`. Migration `20260905010000_attribute_allowed_values` adds `allowedValues` (backfilled from distinct product values). That array is the admin catalogue of suggested filter values; storefront facets still read `ProductAttributeValue` on products. `attribute_values.manage` is unused until a dedicated values screen exists.

Mutations go through `saveAdminAttribute` / `deleteAdminAttribute` after same-origin + `attribute.add` / `attribute.edit` / `attribute.delete`. Delete is refused while products still use the attribute. Duplicate values are collapsed case-insensitively. CamelCase keys such as `ramType` are preserved; new names slugify to kebab-case.

`DATA_SOURCE=mock` cannot persist. Audit events: `attribute.create`, `attribute.update`, `attribute.delete`. Bulk actions and the catalog import attribute list stay mock.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; CRUD smoke (create, unique key, product-block on processor, cleanup); unsigned `/admin/attributes` 307; `/category/laptops` 200.

## AD-153 Product and variant admin persistence (P12-T04)

Admin product create/edit/delete writes to `Product` and optional `ProductVariant` rows. Migration `20260905011500_product_position` adds `Product.position` (backfilled from existing `createdAt` order). Storefront `featured` sort and PC Builder candidates order by that column. Admin list/edit includes unpublished rows; the storefront repository stays active-only.

Persisted fields: name, slug, SKU, brand, category (including subcategory), price, compare-at, overview, denormalized stock status, `isNew` / `isSale` / `isActive`, `publishedAt`, warranty label, position, and variants. Image/SEO/tags/clone stay mock. Stock **quantity** waits for P12-T05. New products get a placeholder image so the storefront has something to render.

Mutations go through `saveAdminProduct` / `updateAdminProductFlags` / `deleteAdminProduct` after same-origin + `product.add` / `product.edit` / `product.delete`. Delete is refused when the product is on an order, saved PC build, flash sale, or promotion. Cart/wishlist/compare rows cascade. List published/featured/deal toggles persist. `DATA_SOURCE=mock` cannot persist. Audit events: `product.create`, `product.update`, `product.delete`. Related-product link-table position is still absent.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; `db:parity` 161 checks; CRUD smoke (create unpublished, hide from storefront, slug/SKU clash, publish, one variant, delete); unsigned `/admin/products` and `/admin/products/new` 307; `/product/lumen-14-office-laptop` 200.

## AD-154 Inventory quantity and derived stock status (P12-T05)

Admin inventory writes `ProductStock.quantity` and `lowStockThreshold`. Available units are `quantity - reserved`. `Product.stockStatus` is denormalised from that value so listings do not join stock. Quantity cannot be set below reserved (held for pending orders later). Variant rows get their own `ProductStock`. Staff cannot edit `reserved` here.

Product save upserts stock. The product list “View stock” drawer can change quantity and threshold with `product.edit`. The product-wise stock report reads available units instead of hashed mock counts. Hide-stock / display-mode toggles stay UI-only. `DATA_SOURCE=mock` cannot persist. Audit event: `inventory.update`. Migration `20260905013000_product_stock_backfill` inserts missing stock rows for products created in T04.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; `db:parity` 161 checks; inventory smoke (create at qty 4 → low_stock, variant qty 2, reserved block, qty 0 → out_of_stock, cleanup); unsigned `/admin/products` and `/admin/reports/stock` 307; `/product/lumen-14-office-laptop` 200.

## AD-155 Reviews and questions persist (P12-T06)

Staff custom reviews, moderation, and question answers write to the existing `ProductReview` and `ProductQuestion` tables. No migration. Storefront `reviewRepository` returns published reviews and answered questions only (pending questions no longer leak to the PDP). Admin lists include every status.

Staff custom reviews are `isStaffEntry=true` and published immediately. Customers submit pending reviews and questions from the product page or account; those stay off the storefront until staff publish or answer. Customers may delete their own pending rows. Reviewer/review images stay mock.

Mutations go through same-origin + `reviews.add` / `reviews.moderate` / `reviews.delete` or `questions.answer` / `questions.delete`. Customer writes require a signed-in session. `DATA_SOURCE=mock` cannot persist. Audit events: `review.create`, `review.moderate`, `review.delete`, `question.answer`, `question.delete`.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; `db:parity` 161 checks; review/question smoke (staff publish, pending hidden, moderate, reject, answer, cleanup); unsigned `/admin/reviews`, `/admin/reviews/new`, and `/admin/questions` 307; `/product/lumen-14-office-laptop` 200.

## AD-156 Search matches brand/category; filters follow isFilterable (P12-T07)

`productRepository.list` remains the search/filter backend. `q` is trimmed and capped at 120 characters, then matched case-insensitively against name, SKU, brand name/slug, and category name/slug in both the Prisma and mock implementations. Shop/search/brand listings parse URL filter params from `ProductAttribute.isFilterable` instead of the hardcoded `CATALOG_ATTRIBUTE_KEYS` list. Category pages still prefer that category's `filterKeys`. Facets without a category declaration use filterable attributes present on the matched set.

No migration. User-search logging stays mock (Phase 15). Two new parity queries cover category-slug and category-name search.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches; `db:parity` 163 checks; `/search?q=cpu-coolers` returns Frost Air CPU Cooler; `/search?q=Processors` 200; `/shop?ram=16GB` and `/category/laptops?processor=Core%205` 200.

## AD-157 Persistent cart (P13-T01)

Reuse existing `Cart` / `CartItem`. No migration. Guest carts are keyed by an
httpOnly `th_guest_cart` cookie; only the SHA-256 of that token is stored in
`Cart.sessionToken`. Signed-in carts use `userId`. Login and register merge
guest lines into the user cart (sum qty, clamp 1–10, cap 24 lines) and clear
the guest cookie. Logout leaves the user cart in the database.

Writes validate same-origin, active product, stock (out of stock cannot add),
quantity, and line cap. Coupon codes persist as strings. Shipping mock codes
map to seeded `ShippingMethod` / `ShippingArea` FKs. Payment method has no
column and stays in `localStorage`. Totals stay display-only. Checkout
place-order stays mock. `DATA_SOURCE=mock` keeps the previous device cart.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift`
matches; persist smoke (add, qty, coupon, shipping, out-of-stock reject,
merge, remove, clear, cleanup); `/cart`, `/product/lumen-14-office-laptop`,
and `/shop` 200.

## AD-158 Order creation from persisted cart (P13-T02)

Reuse existing `Order` / `OrderItem` / `Payment`. No migration. Signed-in
checkout places an order from the user cart only. The server recalculates
subtotal (current `Product.priceAmount`), mock coupon discount, shipping, tax
(0), and total. Client totals are ignored. Guest checkout stays unavailable.

The cart is locked, stock rows are locked, `ProductStock.reserved` increases,
`Product.stockStatus` is denormalised, then cart lines are cleared. A
`Payment` row is stored as `PENDING` with provider `unpaid` to record the
chosen mock method. The order is never marked paid. Customers list and open
only their own orders. Admin order UI stays mock. `DATA_SOURCE=mock` keeps
the device-local mock receipt.

Verified: `tsc --noEmit` clean; eslint clean on touched files; order smoke
(add, coupon, shipping, reject missing payment, server totals, reserved +2,
cart cleared, empty-cart reorder rejected, cleanup); `/checkout` and
`/checkout/confirmation` 200; unsigned `/account/orders` 307.

## AD-159 Payment abstraction behind adapters (P13-T03)

Order creation talks to `lib/payments` instead of a hardcoded `unpaid`
provider. `cod` is an offline adapter; SSLCommerz and bKash are hosted stubs
that record a pending payment and do not redirect or charge. Live gateway
clients wait for T04.

`applyPaymentTransition` enforces the payment state machine. `PAID` requires
a transaction reference and matching amount/currency. Same-status retries are
idempotent. Refund statuses are rejected here. No storefront server action
can mark a payment paid.

Verified: `tsc --noEmit` clean; eslint clean on touched files; abstraction
smoke (illegal transitions, stub does not charge, provider `sslcommerz`,
pending start, PAID without ref rejected, amount mismatch rejected, paid
replay idempotent, paid↛pending, cleanup); `/checkout` 200.

## AD-160 Hosted SSLCommerz / bKash start after order commit (P13-T04)

Gateway HTTP runs only after the `Order` and pending `Payment` exist, so a
retrying order number cannot mint unused hosted sessions. Credentials are
optional and are not part of `getEnv()`. Missing store keys or `APP_URL`
keep SSLCommerz / bKash deferred; COD stays offline.

A successful session start may move the payment to `PROCESSING` and return
an allow-listed `https` URL (SSLCommerz / bKash hosts only). Checkout
redirects only when that check passes. Browser return pages, SSLCommerz
IPN acknowledgement, and the bKash callback do not mark a payment paid.
Verified IPN / execute belongs to T05. No card, PIN, or OTP fields are
collected on this site.

Verified: `tsc --noEmit` clean; eslint clean on touched files; gateway
smoke (deferred without credentials, invalid redirect rejected, return
page does not pay, COD unchanged); `/checkout` and
`/checkout/payment/return` 200.

## AD-161 Verified IPN / execute is the only PAID path (P13-T05)

SSLCommerz IPN calls the official validation API with `val_id` and store
credentials. The raw POST amount/status is not trusted. When `verify_sign`
is present it must match. bKash `status=success` is not proof — the server
executes the `paymentID` (or queries status if execute is not completed)
and only then marks paid.

`PAID` still requires a transaction reference plus matching amount and
currency. Replays with the same reference are idempotent. A different
reference on an already-paid row is rejected. Missing credentials
acknowledge the callback and leave the payment unpaid. Browser return
routes still do not call `applyPaymentTransition(..., PAID)`. Refunds
wait for T06.

Verified: `tsc --noEmit` clean; eslint clean on touched files; webhook
smoke (invalid hash, amount/currency/store mismatch, unknown order,
invalid validation, valid pay, duplicate idempotent, second ref
rejected, unsigned bKash success does not pay); IPN 200; `/checkout`
and `/checkout/payment/return` 200.

## AD-162 Refund request, staff approval, then verified payout (P13-T06)

Reuse `Refund` / `RefundEvent` / `RefundReason`. Added `Payment.sessionRef`
(hosted session kept after PAID) and unique `Refund.payoutRef`. A customer
requests on their own paid order; amount is 1…remaining; one open refund
at a time. Staff with `refunds.process` approve or reject, then complete.
COD pays out offline. SSLCommerz / bKash call the gateway and store the
refund reference. Payment becomes `PARTIALLY_REFUNDED` or `REFUNDED`.
`applyPaymentTransition` still rejects refund statuses so checkout/IPN
cannot mark refunded. Completing an already-completed refund is
idempotent. Settings / reasons / category refund admin pages stay mock.

Verified: `tsc --noEmit` clean; eslint clean on touched files; `db:drift`
matches; refund smoke (over-amount, open duplicate, complete-before-approve,
partial, complete replay, checkout cannot refund, full refund, reject
cannot pay out); unsigned `/admin/refunds` and `/account/orders` 307;
`/checkout` 200.

## AD-163 Durable payment security suite without a new runner (P13-T07)

Keep the Phase 13 payment checks as `scripts/payments/check-security.ts`
and `npm run test:payments` (tsx, same pattern as `db:check`). No Jest or
Vitest. The suite covers the cases in `docs/PAYMENT_SECURITY.md`: invalid
signature, duplicate webhook, amount/currency mismatch, invalid
transaction, unauthorized refund, repeated payment, payment failure,
retry after failure, and browser return / IPN paths that must not mark
paid. It does not call live gateways or print secrets. HTTP cases skip
if the app is down.

Verified: `tsc --noEmit` clean; eslint clean on the suite; `npm run
test:payments` — 43 checks passed.

## AD-164 Slot candidates carry builder attributes, never the catalog (P14-T01)

PC Builder parts stay on `Product`. `listByBuilderSlot` returns a
`BuilderCandidate` (price, stock, slot, socket / RAM type / form factor /
TDP) for one slot, capped at 48. Selected parts load those attrs in one
`listBuilderCandidatesBySlugs` query. The client never receives the full
catalogue. Staff set the same fields on the product form; an empty slot
clears the attributes. `DATA_SOURCE=mock` still reads the in-memory
catalogue. Keyboard / mouse / accessory slots stay out of the enum.
Rules, saved builds, and build-to-cart wait for later Phase 14 tasks.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`db:parity` — 165 checks; `/pc-builder` and slot select pages 200;
unsigned `/admin/products` 307.

## AD-165 Compatibility rules persist; engine still a stub (P14-T02)

Reuse `PCCompatibilityRule`. Admin `/admin/pc-builder/rules` lists those
rows. Toggles and Save require `pc_builder.rules` and same-origin. Re-seed
updates label/type/description but does not reset `isEnabled`.
`DATA_SOURCE=mock` still reads `MOCK_PC_BUILDER_RULES` and refuses writes.

The storefront loads enabled types and passes them to
`evaluateCompatibility`. Disabled types are skipped. Omitting the set keeps
every implemented type on (callers that have not loaded rules).
`storage_interface` has no evaluator yet. New rule types and a data-driven
engine wait for T03. Staff cannot invent types the stub does not know.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`/pc-builder` 200; unsigned `/admin/pc-builder/rules` 307.

## AD-166 Table-driven compatibility engine (P14-T03)

`evaluateCompatibility` walks `PC_RULE_TYPES` and calls `RULE_EVALUATORS`.
Each persisted type has one pure evaluator. Disabled types are skipped.
Omit `enabledTypes` to run every type. Socket, RAM type, form factor, and
PSU 1.5× headroom keep the previous outcomes. Storage interface compares
`BuilderAttrs.storageInterface` on SSD/HDD versus motherboard; missing
data is `unknown`, never a false match. No new database column — the
catalog does not yet store that field. GPU clearance and invented
connectors stay out.

`npm run test:pc-builder` (`scripts/pc-builder/check-engine.ts`) covers
match, mismatch, unknown, disabled types, and storage. No Jest/Vitest.
The client still calls the pure function; server revalidation waits for
T06. Saved builds wait for T04.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`npm run test:pc-builder` — 27 checks; `/pc-builder` 200.

## AD-167 Signed-in builds persist; guests stay on-device (P14-T04)

Reuse `PCBuild` / `PCBuildItem`. A signed-in save stores name, `SAVED`
status, price snapshot, and one item per filled slot. Products must be
active. A tagged `builderSlot` must match the chosen slot. Missing parts
are rejected. Oldest extras beyond 12 are deleted. List and delete are
scoped to `userId`. Mutations need same-origin. `shareSlug` stays null.

Guests and `DATA_SOURCE=mock` keep localStorage. Device builds are not
merged on login. Share tokens and admin featured builds wait for later
tasks.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`/pc-builder` 200.

## AD-168 Opaque share slugs; public page never returns owner data (P14-T05)

Reuse `PCBuild.shareSlug`. Signed-in shares mint `thb_` plus a 43-char
base64url token (`createSessionToken`). Sharing the current selection
creates a `SHARED` row. Sharing a saved build sets `shareSlug` on that
`SAVED` row if missing. Public lookup returns name and selection only —
never `userId`, email, or other owner fields. SAVED and SHARED extras
prune separately so shares do not eat the T04 cap. Mutations need
same-origin.

Guests and `DATA_SOURCE=mock` keep `encodeShareId` / `decodeShareId`
(public product slugs only). The share page tries a persisted slug
first, then the guest decoder. Admin featured builds and server-side
revalidation wait for later tasks.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`/pc-builder` 200; guest share URL 200 with CoreLine part; missing
`thb_` slug shows invalid; public HTML has no owner identity.

## AD-169 Server snapshot is the live build authority (P14-T06)

`validateBuild` loads candidates and enabled rules, then
`assembleValidatedBuild` computes price, stock, power, and
`evaluateCompatibility`. The client sends slugs only — never prices or
attributes. Missing products and slot mismatches are issues, not silent
matches. The workspace and share page render that snapshot. Add-to-cart
still writes the display cart; a persisted cart write waits for T07.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`npm run test:pc-builder` — 35 checks; `/pc-builder` 200; guest share
shows CoreLine and a checked total.

## AD-170 Add-build revalidates then writes the existing cart path (P14-T07)

`addBuildToCart` runs `validateBuild`, then `planValidatedBuildToCart`.
Missing parts, slot mismatches, incomplete required slots, out-of-stock
lines, incompatible results, and the 24-line cap block the write.
Unknown compatibility is allowed with a note. A successful plan writes
qty 1 per unique slug through `addCartItems`. Guests and
`DATA_SOURCE=mock` apply the server plan to the device cart. Mutations
need same-origin. The client still sends slugs only. Checkout still
recalculates prices. Phase 14 is complete.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`npm run test:pc-builder` — 38 checks; `/pc-builder` 200 with
server-checked cart copy.

## AD-171 Promotion campaigns persist on `Promotion` (P15-T01)

Campaigns use existing `Promotion` rows with `kind = PROMOTION`.
Seed upserts `MOCK_ADMIN_PROMOTIONS` by slug and does not reset
status or dates. Admin list lives at `/admin/promotions/campaigns`
so the hub stays at `/admin/promotions`. Writes need same-origin
and `promotion.manage`. Audit actions are `promotion.create` and
`promotion.update`. `/offers` lists `ACTIVE` campaigns whose
optional date window includes now — name, summary, dates, and
channel only. No discount amount is stored. Flash sales, deals,
coupons, category discounts, promotional-product assignment, and
checkout application stay mock.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `promotions 4`; unsigned `/admin/promotions/campaigns`
307 to login; `/offers` 200 with “Back to school laptops”.

## AD-172 Flash campaigns persist; today's deal is `isSale` (P15-T02)

Flash deals use existing `FlashSale` rows. Seed upserts
`MOCK_FLASH_DEALS` by slug and does not reset status, featured, or
dates. Status toggle maps on → `ACTIVE`, off → `PAUSED`. Admin
list/create/edit stay at `/admin/flash-sales`. `/flash-sale` lists
`ACTIVE` campaigns whose window includes now — title and dates
only. `FlashSaleItem`, banners, and checkout markdowns stay
deferred.

Today's deal uses `Product.isSale` — the same flag as the product
form and the homepage Best deals rail. `/admin/deals` add/remove
toggles that flag. `/deals` lists `onSaleOnly` products. Writes
need `flash_deals.manage` and same-origin. `Promotion.kind = DEAL`
and the leftover `/admin/deals/new|[id]` editor stay unused/mock.
Coupons stay mock.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `flashSales 4`; unsigned `/admin/flash-sales` and
`/admin/deals` 307 to login; `/flash-sale` 200 with “End of
Season”; `/deals` 200 with “Ridge 16 Gaming Laptop”.

## AD-173 Coupons persist and redeem at checkout (P15-T03)

Coupons use existing `Coupon` rows. Seed upserts `MOCK_ADMIN_COUPONS`
by code and does not reset status, dates, or usage. Admin status is
derived from `isActive` and the date window. List/create/edit live
at `/admin/coupons`. Writes need same-origin and `coupons.add` /
`coupons.edit`.

Cart apply and order place look up a redeemable code (active, in
window, under the usage cap, min spend met). A successful order
sets `couponId` and increments `usageCount` in the same
transaction. Discount math stays in `applyCouponToSubtotal`.
`DATA_SOURCE=mock` keeps `MOCK_COUPONS`. Cart state carries
`appliedCoupon` so the preview matches the persisted definition.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `coupons 4`; unsigned `/admin/coupons` 307 to login;
`/cart` 200.

## AD-174 Blog posts persist; newsletter is subscribers (P15-T04)

Blog uses existing `BlogCategory` and `BlogPost` rows. Seed upserts
mock categories and posts by slug and does not reset category
`isActive`, post status, or `publishedAt`. Admin list/create/edit live
at `/admin/blog` and `/admin/blog/categories`. Storefront `/blog` and
`/blog/[slug]` show `PUBLISHED` posts only. Writes need same-origin
and `blog.add` / `blog.edit`.

Newsletter persist is the `NewsletterSubscriber` list, not campaign
issues (no table; SMTP wait for Phase 16). Seed upserts email mocks
and skips SMS numbers. Footer signup upserts `SUBSCRIBED`. Admin
lists live at `/admin/newsletter` and `/admin/marketing/subscribers`.
Subscriber writes need `newsletter.manage` or `subscribers.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `blogCategories 3`, `blogPosts 2`, `subscribers 1`;
unsigned `/admin/blog` and `/admin/newsletter` 307 to login; `/blog`
200 with “How to pick a gaming laptop in BD”; draft `ddr5-vs-ddr4`
is not listed and does not render body copy.

## AD-175 Notifications persist as in-app inbox rows (P15-T05)

Notifications use existing `Notification` rows. Seed upserts a welcome
in-app item for the demo customer and does not reset `readAt`.
`/account/notifications` lists `IN_APP` rows for the signed-in user.
Mark read persists `readAt`. Admin custom send creates one inbox row
per ACTIVE customer (`promo` / `info` / `alert`). History lists those
custom types only. Types and channel settings stay mock. Email/SMS/
push are not sent. Writes need same-origin; send/delete need
`notifications.manage`; customer mark-read needs a session. Links
must be same-site paths.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `notifications 1`; unsigned `/admin/notifications` and
`/account/notifications` 307 to login.

## AD-176 GA4/GTM persist public ids; official snippets only (P15-T06)

GA4 and GTM use existing `AnalyticsConfiguration` rows. Seed upserts
disabled GA4/GTM records and does not reset staff enable flags or
public ids. Admin stores the public measurement / container id only
(`G-…` / `GTM-…`). Optional GA4 property id lives in `notes`.
Service-account JSON and API tokens stay out of the database.

The storefront injects official gtag / GTM snippets when enabled and
the id validates. If GTM is on, standalone GA4 is not also injected.
Raw script paste is not persisted. Writes need same-origin and
`ga4.manage` / `gtm.manage`. Meta / Merchant Center wait for T07.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `analytics 2`; unsigned `/admin/integrations/ga4` and
`/admin/integrations/gtm` 307 to login; `/` and `/blog` 200 do not
include googletagmanager.com while tags are disabled.

## AD-177 Meta Pixel and Merchant Center persist public ids; XML feeds (P15-T07)

Meta Pixel and Merchant Center use existing `AnalyticsConfiguration`
rows (`META_PIXEL`, `MERCHANT_CENTER`). Seed upserts them disabled
and does not reset staff enable flags, public ids, or notes. Admin
stores numeric public ids only. Optional Facebook catalog ID lives
in `META_PIXEL.notes`. CAPI / Graph access tokens are not persisted
and server CAPI events are not sent.

The storefront injects the official Meta Pixel snippet when enabled
and the id validates. If GTM is on, standalone GA4 and Meta Pixel
are not also injected. `/feeds/google.xml` is published when Merchant
Center is enabled. `/feeds/facebook.xml` is published when Meta Pixel
is enabled. Feeds include active-product display fields only.
`DATA_SOURCE=mock` keeps tags and feeds off. Writes need same-origin
and `meta.manage` / `merchant.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `analytics 4`; unsigned `/admin/integrations/meta`,
`/admin/integrations/merchant-center`, and
`/admin/integrations/facebook-catalog` 307 to login; `/` 200 does
not include connect.facebook.net while the pixel is disabled;
`/feeds/google.xml` and `/feeds/facebook.xml` 404 while disabled.

## AD-178 Global SEO persist; live sitemap and robots (P15-T08)

Global SEO uses one `SEOConfiguration` row (`path = null`). Seed
creates it empty and does not reset staff title, description, or
keywords. Admin `/admin/seo` persists those fields only. Per-path
rows, OG image upload, and custom scripts stay deferred.

`/sitemap.xml` is generated on request from public pages, active
catalog, and published posts. `/robots.txt` points at the sitemap and
disallows admin, account, checkout, and `/dev/`. Files are not stored
on disk. Writes need same-origin and `seo.manage`. Sitemap refresh
needs `sitemap.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `seo 1`; unsigned `/admin/seo` and `/admin/sitemap` 307
to login; `/sitemap.xml` and `/robots.txt` 200; sitemap includes
`/product/ridge-16-gaming-laptop` and `/blog/gaming-laptop-guide`
and omits the draft blog slug; `/` title is Techno House while SEO
fields are empty.

## AD-179 Shipping methods persist; zones and courier APIs stay deferred (P16-T01)

Cart and admin shipping methods use `ShippingMethod`. Seed upserts the
three mock codes and does not reset staff name, rate, pickup, or
enable flags. Admin `/admin/shipping` edits those rows. Pathao and
Steadfast credential cards stay mock and do not persist secrets.
Zones, areas, countries, and shipping-mode configuration wait for
P16-T02. Client previews are not authoritative; order place resolves
the rate on the server. Writes need same-origin and
`shipping_method.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `shippingMethods 3`; unsigned `/admin/shipping` 307 to
login; `/cart` 200 includes Dhaka home delivery, Nationwide courier,
and Store pickup.

## AD-180 Shipping zones and areas persist; geo hierarchy stays mock (P16-T02)

Cart delivery zones and areas use `ShippingZone` / `ShippingArea`.
Seed upserts mock rows and does not reset staff name or enable flags.
Admin `/admin/shipping/zones` and `/admin/shipping/areas` edit those
fields. Public area ids are `${zoneCode}::${name}`. Countries, states,
cities, carriers, and shipping-mode configuration stay mock. Cart and
checkout list active zones and areas only. Order place resolves rates
on the server. Writes need same-origin and `zones.manage` /
`areas.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
seed reports `shippingZones 2`; unsigned `/admin/shipping/zones` and
`/admin/shipping/areas` 307 to login; `/cart` 200 includes Dhaka metro
and Mirpur.

## AD-181 OTP/SMS gateway settings persist; secrets stay in env (P16-T03)

`OtpSmsConfiguration` singleton stores provider, sender id, OTP length,
expiry, and login/registration flags. Seed upserts `local-mock` with
flags off and does not reset staff edits. API keys/secrets are never
persisted — optional `SMS_API_KEY` / `SMS_API_SECRET` placeholders live
in `.env.example` only. Admin `/admin/otp` saves non-secret fields;
test SMS stays a no-op toast. Real SMS send and OTP verify endpoints
remain deferred. Writes need same-origin and `otp.manage`.
`DATA_SOURCE=mock` refuses writes.

Verified: `tsc --noEmit` clean; eslint clean on touched files; seed
reports `otpSms 1`; unsigned `/admin/otp` 307 to login.

## AD-182 SMTP settings persist; password stays in env (P16-T04)

`SmtpConfiguration` singleton stores mailer type, host, port, username,
encryption, from address, and from name. Seed upserts `smtp` / `587` /
`tls` with empty host and from fields and does not reset staff edits.
SMTP password is never persisted — optional `SMTP_PASSWORD` lives in
`.env.example` only. Admin `/admin/smtp` saves non-secret fields; test
email stays a no-op toast. Real outbound mail remains deferred. Writes
need same-origin and `smtp.manage`. `DATA_SOURCE=mock` refuses writes.

Verified: `tsc --noEmit` clean; eslint clean on touched files; seed
reports `smtp 1`; unsigned `/admin/smtp` 307 to login.

## AD-183 Social logins, reCAPTCHA, Firebase persist; secrets in env (P16-T05)

`SocialLoginConfiguration` stores enable + public client/app id for
GOOGLE / FACEBOOK / TWITTER / APPLE. `RecaptchaConfiguration` stores
enable, site key, V3 score, and page flags. `FirebaseConfiguration`
stores enable only. Seed upserts disabled defaults and does not reset
staff edits. OAuth / reCAPTCHA / Firebase secrets stay in
`.env.example` placeholders only. Live OAuth, verify, and Firebase
wiring stay deferred. Google Map stays for P16-T06. Footer profile
URLs stay pending (no invented URLs). Writes need same-origin and
`social_logins.manage` / `google_recaptcha.manage` / `firebase.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files; seed
reports `socialLogins 4`, `recaptcha 1`, `firebase 1`; unsigned social
admin routes 307 to login.

## AD-184 Maps, chat widgets, and comments persist; no scripts/keys in DB (P16-T06)

`GoogleMapConfiguration` stores enable only; `GOOGLE_MAPS_API_KEY` stays
in env. `ChatWidgetConfiguration` stores WhatsApp / Messenger enable +
public handle (no raw scripts). `CommentSystemConfiguration` stores
enable, provider, and public app id. Seed upserts disabled defaults and
does not reset staff edits. Storefront map / floating chat / comment
plugin embeds stay deferred. Product Q&A and reviews remain on existing
tables. Writes need same-origin and `google_map.manage` /
`chat_widgets.manage` / `comment_system.manage`.

Verified: `tsc --noEmit` clean; eslint clean on touched files; seed
reports `googleMap 1`, `chatWidgets 2`, `commentSystem 1`,
`permissions 192`; unsigned map / chat / comments admin routes 307.

## AD-185 General business settings persist on SiteSettings (P16-T07)

Admin `/admin/settings/general` saves store name, legal name, support
email, phone, address, city, timezone, and tax / BIN id to the
`SiteSettings` singleton. Seed creates defaults once and no longer
overwrites staff edits on re-seed. Currency stays BDT (not edited
here). Order / tax / pickup / invoice / tracking / shipping-label /
thermal-printer cards stay mock. Writes need same-origin and
`business.manage`. `DATA_SOURCE=mock` refuses writes. Phase 16 is
complete.

Verified: `tsc --noEmit` clean; eslint clean on touched files; seed
reports `siteSettings 1`; unsigned `/admin/settings` and
`/admin/settings/general` 307 to login.

## AD-186 Non-payment security audit baseline (P17-T01)

Phase 17 hardening starts with a non-payment security audit against
`docs/SECURITY.md`. No critical or high findings. Medium items
(response headers, demo seed passwords, deferred OTP/mail) stay for
Phase 18 or when those features go live. Admin and customer post-login
`next` paths share `lib/auth/return-path.ts`. Regression suite:
`npm run test:security`. Full report: `docs/SECURITY_AUDIT_P17.md`.
Payment depth remains P17-T02 (`npm run test:payments`).

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`npm run test:security` 15 checks ok; `npm audit --omit=dev` 0 vulns.

## AD-187 Payment security audit; suite source guards (P17-T02)

Payment flows were audited against `docs/PAYMENT_SECURITY.md`. No
critical or high findings. Browser return never marks PAID; SSLCommerz
IPN and bKash execute/query remain the paid paths; refunds need
`refunds.process`. `npm run test:payments` gained source guards
(return routes must not apply transitions; config refuses `window`;
http redirects rejected) — 47 checks ok. Report:
`docs/PAYMENT_SECURITY_AUDIT_P17.md`. Live sandbox E2E and proxy log
redaction stay Phase 18.

Verified: `npm run test:payments` 47 checks ok.

## AD-188 Query/performance audit; wishlist batch load (P17-T03)

Catalog listing, indexes, sitemap caps, and cart `listBySlugs` were
reviewed against `docs/PERFORMANCE.md`. No critical/high findings.
Wishlist/compare `loadListProducts` now uses `listBySlugs` (was N+1
`getBySlug`). Medium: discount sort still loads matching ids in memory;
related-product link `position` stays a pending decision. Baseline:
`npm run test:queries`. Report:
`docs/QUERY_PERFORMANCE_AUDIT_P17.md`. Bundle/image weight is P17-T04.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`npm run test:queries` 8 checks ok.

## AD-189 Bundle/image audit; gallery padding cache fix (P17-T04)

Reviewed `next/image`, `next/font`, client/repository boundary, and
dependency weight against `docs/PERFORMANCE.md`. No critical/high
findings. PDP gallery padding no longer appends `th=` query params that
bust the image optimizer cache. Baseline: `npm run test:bundle`. Report:
`docs/BUNDLE_IMAGE_AUDIT_P17.md`. Optional `next/dynamic` splits and
live LCP budgets stay deferred (Phase 18 / polish).

Verified: `tsc --noEmit` clean; `npm run test:bundle` ok.

## AD-190 Accessibility audit; focus + Field ARIA (P17-T05)

Reviewed skip link, lang, focus visibility, labelled chrome, and dialog
patterns against `docs/DESIGN_SYSTEM.md`. High: composite search/newsletter
inputs hid keyboard focus — restored via `focus-within` outlines / admin
ring. Medium: `Field` now sets `aria-invalid` and `aria-describedby`.
Dialog/Sheet get `aria-labelledby`. Baseline: `npm run test:a11y`.
Report: `docs/ACCESSIBILITY_AUDIT_P17.md`. Hero tablist arrow keys and
full axe CI stay deferred.

Verified: `tsc --noEmit` clean; `npm run test:a11y` 10 checks ok.

## AD-191 SEO audit; noindex utilities + PDP OG (P17-T06)

Reviewed robots, sitemap, metadata, and indexing boundaries. High:
cart/wishlist/compare/search were indexable — robots disallow +
`NO_INDEX` meta (checkout/payment return too). Medium: PDP gained
description/Open Graph; root `metadataBase` from `APP_URL`; storefront
OG/Twitter defaults. Baseline: `npm run test:seo`. Report:
`docs/SEO_AUDIT_P17.md`. Per-path SEO rows and live GSC stay deferred.

Verified: `tsc --noEmit` clean; `npm run test:seo` 12 checks ok.

## AD-192 Final regression; deals server-action props (P17-T07)

Re-ran all Phase 17 baselines via `npm run test:regression`, plus
typecheck, lint, Prisma validate, and `next build`. Build failed on
`/admin/deals` because inline closures wrapping a server action were
passed to a Client Component — fixed with bound actions
(`assignTodaysDealProductsAction`, `removeTodaysDealProductAction`,
`setTodaysDealProductFlagAction`). Cleared three unused-import lint
warnings. Report: `docs/REGRESSION_P17.md`. Phase 17 complete; Phase 18
awaits approval. Middleware→proxy deprecation noted for deploy work.

Verified: `npm run test:regression` 7 suites ok; typecheck/lint clean;
`prisma validate` ok; `next build` ok.

## AD-193 Production env inventory; live deploy deferred (P18-T01)

Documented required/optional production environment variables, local vs
production rules, and a go-live checklist in `docs/DEPLOYMENT.md`.
Clarified `.env.example` (`APP_URL`, mock forbidden in production).
Added `npm run test:env`. Operator chose not to deploy yet — no VPS,
DNS, TLS, or managed Postgres was provisioned. P18-T02+ wait for
explicit approval.

Verified: `npm run test:env` 8 checks ok.

## AD-194 Admin orders from PostgreSQL + staff order alerts

Checkout already wrote real `Order` rows (`placeCustomerOrder`), but
`/admin/orders` still listed `MOCK_ADMIN_ORDERS`, so live orders never
appeared. `loadAdminOrderList` / `getAdminOrderById` now read Prisma when
`DATA_SOURCE ≠ mock` (mock path unchanged). Dashboard recent orders use
the same DB source.

On successful place, `notifyStaffOfNewOrder` creates one IN_APP
`Notification` (`type: order.placed`) per ACTIVE staff. Admin topbar
`AdminOrderAlertBell` polls `/api/admin/order-alerts`, shows unread
badge + dropdown, plays a short Web Audio chime on new unread alerts,
and optionally uses the browser Notification API after permission.
Alert delivery never fails checkout.

**Fix (AD-200):** polling URL moved from `/api/admin/order-alerts` to
`/admin/api/order-alerts`. Staff session cookie uses `Path=/admin`, so
browsers never attached it to `/api/...` (always 401). Bell now polls
the `/admin` path and refreshes on tab focus.

**Chime (AD-201):** Web Audio was silent until a user gesture (browser
autoplay policy). Shared AudioContext unlocks on first click/keypress /
bell tap; if a new order arrives while locked, the chime is queued and
plays right after unlock. Poll interval 5s.

Verified: `tsc --noEmit` clean; DB order `TH-20260905-2D59DA0A` appears
in admin list; staff alert unread count ≥ 1 after backfill.

## AD-197 Runtime mock retirement (workable store)

Operator required no mock system for a full workable site.

- Catalogue `@/lib/data` always uses Prisma repos; `DATA_SOURCE=mock`
  throws via `assertDatabaseRequired`.
- Admin customers, support tickets/contacts, staff list, and dashboard
  KPIs load from PostgreSQL.
- Customer account orders/tickets/notifications are server/DB only
  (localStorage mock inbox/orders/tickets removed from those UIs).
- Customer tickets create/reply via `lib/support/customer-tickets.ts`
  and appear in admin support.
- `.env.example` documents that `DATA_SOURCE=mock` is forbidden.

Still mock / display-only (follow-up): marketing popups/SMS/email-template
chrome, design-studio localStorage, B2B, product-requests, reports,
labels/notes/units where no write path exists yet. Type-only imports from
`*-mock.ts` files may remain.

Verified: `tsc --noEmit` clean after the batch.

## AD-198 Admin order save + printable invoice

Order quick-manage / detail status + tracking now persist via
`updateAdminOrder` (`orders.delivery_status`). Success toasts no longer
say “mock”. Invoice lives at `/admin/orders/[id]/invoice` with A4 and
thermal (`?layout=thermal`) layouts and `?print=1` auto-print. Row
actions open the real invoice instead of mock queues. Admin shell
renders invoice pages without sidebar chrome.

## AD-199 Admin media library (DB + uploads)

`/admin/media` lists `MediaAsset` from PostgreSQL (not `MOCK_ADMIN_MEDIA`).
Upload New File writes under `public/uploads/{folder}/` and creates
`MediaAsset` rows (`media.upload`). Alt update and delete are real
(`media.upload` / `media.delete`) with audit logs. On list load, the
library indexes ProductImage (including Unsplash HTTPS URLs), brand
`logoSrc`, and local `public/{products,brands,home}` files so existing
catalogue media appears. Admin thumbnails use plain `<img>` so SVG +
CDN URLs render reliably. Uploaded binaries stay gitignored under
`public/uploads/**` (`.gitkeep` kept).

Server Action body limit raised to `25mb` (`experimental.serverActions`
+ `proxyClientMaxBodySize`) so media uploads are not blocked by the
default 1 MB Next.js limit; app-level per-file cap remains 5 MB.

## AD-202 Storefront branding from SiteSettings

Admin general / Design Studio logo & contact saves were not reflected on
the storefront (hardcoded `STORE_CONTACT` + “Techno House” text; Design
Studio logo was mock-only).

- `SiteSettings` gains `logoSrc`, `logoOnDarkSrc`, `faviconSrc`.
- `getStorefrontBranding()` feeds TopBar phone/email, header/footer
  name + logo, and favicon metadata.
- Design Studio Logo uploads write to `public/uploads` + SiteSettings;
  Footer contact Update persists phone/email/address.
- Saving general settings revalidates the storefront layout.

Verified: `tsc --noEmit` clean; migration
`20260906033000_site_settings_logos` applied.

## AD-203 Admin brand logo upload

Brand create/edit had a non-functional Browse control (“uploads wait on
the media manager”). Staff can now upload a logo (saved under
`public/uploads/brands/` + MediaAsset), then Save persists `Brand.logoSrc`.
Storefront `/brands`, homepage brand grid, and brand pages already read
`logoSrc`, so uploads appear after save. Remove clears the path.

## AD-204 WordPress-style media picker

Admin image fields (category Banner / Icon / Cover, brand logo, product
thumbnail / gallery) open a modal with **Upload files** (from PC) and
**Media library** (choose existing). Selection returns a public path;
Save persists to `Category.iconSrc|bannerSrc|coverSrc`, `Brand.logoSrc`,
or `ProductImage` rows. Category gained `bannerSrc` / `coverSrc` columns
(migration `20260906130000_category_banner_cover`). Shared components:
`AdminMediaPickerModal`, `AdminMediaImageField`.

## AD-205 Simple cart + single-page checkout

Cart shows items + Price Details only (coupon kept compact). Shipping and
payment selection moved off the cart. Checkout is one page: left Delivery
(district/city/method + customer fields), right Payment + totals + Place
order. Payment labels: Cash on delivery, SSLCommerz (Sandbox), bKash
(Sandbox). Hosted redirect still requires env credentials; no on-site
card/PIN fields. Confirmation banners trimmed to one status line.

## AD-206 Hosted sandbox opens by selected method

Choosing SSLCommerz or bKash at checkout must open that provider's own
sandbox page after Place Order (not a silent confirmation). Gateway start
fails clearly when credentials are missing; checkout shows which methods
are configured. Dev `APP_URL` falls back to `http://127.0.0.1:3000` for
return/callback URLs. Operators add sandbox keys to `.env.local` and restart.

## AD-207 Admin DB payment gateway credentials

Merchant API keys for SSLCommerz / bKash / Nagad are managed under
`/admin/payments` and stored in `PaymentGatewaySetting` (secrets AES-GCM
encrypted with `GATEWAY_SECRETS_KEY`). Enable + sandbox toggles live in
admin; storefront checkout resolves config from DB first, env as fallback.
Customers never see “Sandbox” labels. Nagad is persisted for later —
not wired to checkout yet. `APP_URL` stays in env.

## AD-208 Admin login UI + obscured gate URL

Staff sign-in moved off the obvious `/admin/login` (now 404) to
`/admin/access/{ADMIN_LOGIN_SLUG}`. Default local slug `th-ops-local`;
change via `.env.local` for production. Wrong slugs 404 without
revealing the real gate. Login UI is a split operations console
(show/hide password, Caps Lock hint, rate-limit/session copy).
Middleware, redirects, and smoke tests use `adminLoginPath()`.

Verified: `tsc --noEmit` clean; eslint clean on touched files;
`test:security` baseline 16 checks ok.

## AD-209 Product form attributes wired to DB

Add/edit product “Colors” and “Attributes” selects were empty stubs.
Form options now load `ProductAttribute` rows; selecting an attribute
opens a value picker (allowed values or free text). Values persist via
`ProductAttributeValue` on save. “+ New attribute” links to
`/admin/attributes`. Colors row appears only when a Color attribute
definition exists.

Verified: `tsc --noEmit` clean; eslint clean on touched files.

## AD-210 Product form + New attribute adds extra rows

`+ New attribute` on the product form now appends another Attribute /
Value row (not a link to `/admin/attributes`). Operators can add RAM,
Storage, Graphics, etc. one after another; each row picks a definition
and value. Duplicate keys on the same product are blocked in the UI.

## AD-211 Product save accepts seeded https thumbnails

Seeded product images are Unsplash `https://` URLs. Save validation only
allowed local `/…` public paths, so editing any seeded product failed
with “Thumbnail path must be a local public path.” `normalizeProductImage`
now accepts local public paths and http(s) image URLs; `javascript:` and
other schemes stay rejected.

## AD-212 Storefront PDP shows admin-assigned attributes

The product page rendered `specGroups` / `specChips` only. Admin attribute
values live in `ProductAttributeValue` and never appeared. Detail mapping
now merges attributes into specifications (fallback when tables are empty,
or an extra “Attributes” group) and into quick-spec chips when chips are
empty. Attribute labels come from `ProductAttribute.label`.

## AD-213 Product YouTube embed + PDF specification on PDP

`Product.youtubeUrl` and `Product.pdfSpecificationSrc` store staff-entered
media. Admin product form saves a validated YouTube watch/Shorts URL and a
PDF path (upload to `/uploads/products/pdfs/…` or https PDF URL). The
storefront product page shows a privacy-enhanced YouTube embed and a PDF
download/open card below the detail tabs.

## AD-214 Editable product specification groups

Admin product form “Specifications (read-only)” is replaced with an editor
for `ProductSpecGroup` / `ProductSpecRow` (section title + label/value
rows). Save replaces groups and refreshes listing `ProductSpecChip`s from
the first rows. Storefront Specifications tab renders a grouped 3-column
table (section | label | value) like a phone spec sheet.

## AD-215 Product colours through cart and orders

Easy colour options (name + optional hex), not per-colour SKU/stock.
`ProductColor` rows are managed on the admin product form. PDP shows
swatches above Quick overview; customers must pick a colour when options
exist. Cart lines carry `colorId` (separate lines per colour). Checkout
snapshots `colorName` / `colorHex` onto `OrderItem` so admin order detail,
invoice, account order, and confirmation keep the chosen colour even if
colours are later edited.

## AD-216 Product discount percent/flat + offer dates

Admin “Discount” was bound to `compareAt` as a raw taka amount, so entering
`10` with Percent selected stored ৳10 (then discarded because it was not
greater than unit price). Date inputs were decorative stubs. Discount now
computes sale price from unit price (percent or flat), persists
`priceAmount` + `compareAtAmount`, and optional `discountStartsAt` /
`discountEndsAt`. Storefront shows strike-through + “Offer until …” only
inside the window; order placement uses the same effective price.

## AD-217 Direct special + regular price editing

PDP “Special price” / “Regular price” were already DB-backed (seeded
monitor values looked like mocks). Admin UX now matches the PDP: editable
**Special price** (`priceAmount`) and optional **Regular price**
(`compareAtAmount`), plus offer dates. Optional percent/flat is only a
“Apply to special price” helper. Empty regular price clears the strike-
through offer.

## AD-218 Colour-wise product images

When a product has colours, admin can attach optional gallery images per
colour (`ProductColorImage`, max 6). Empty colour galleries fall back to
product-level `ProductImage`s. PDP colour selection (Color variations
list) drives the main image + thumbnails together via a shared client
wrapper. No colours → unchanged regular product gallery.

## AD-219 PDP gallery actual images + hover zoom

Gallery no longer pads/duplicates to 6 frames — thumbnails match uploaded
count. First image is selected by default; thumbnail click swaps the main
stage. On desktop fine-pointer hover, a lens overlay + side zoom panel
magnifies the active main image (touch/coarse pointers skip zoom).
Main stage is a fixed `aspect-square` frame so the active image stays
inside the box (does not drop below / stretch the page).

## AD-220 Product form unit dropdown

Add/Edit product Unit select was hardcoded to Pc / Box / Set. It now loads
the same `MOCK_ADMIN_UNITS` list as Admin → Units (Pc, Piece, Set, Box,
Pair, Unit, Pack, Bundle). “+ New unit” links to `/admin/units`. Unit is
still form-UI only until a Product.unit column is persisted.

## AD-221 Product warranty presets with logo

Add/Edit product now picks from Admin → Warranty presets (5Y / 3Y / 2Y /
1Y / LT / 6M circular logo), not free-text only. Save still upserts
`ProductWarranty` by label via existing `resolveWarrantyId`. Storefront
PDP mounts `ProductWarranty` with the logo; Details tab and listing cards
show the badge too.

## AD-222 Product notes + labels on add/edit

Admin → Notes and Admin → Labels were mock catalogues not attached to
products. Product now stores `noteIds` / `labelIds` arrays. Add/Edit form
has Labels + Notes cards (and sidebar section filters). Save resolves
presets from the mock catalogues onto the storefront PDP (labels row +
notes panel) and listing cards.

## AD-223 Product request persistence

`/product-request` previously redirected to `?status=not-saved` without
writing. Submissions now create a `Complaint` with
`source = PRODUCT_REQUEST` (name, email, optional phone, productWanted,
message). Admin → Product requests lists/details those rows and can update
status + staff notes. Success redirect is `?status=sent`.

## AD-224 Contact / product-request status persistence

Admin Contacts detail still toasted “Contact updated (mock)” with no DB
write. Product-request Save is now `updateAdminProductRequest` + refresh;
Contacts Save uses `updateAdminContact` (status, reply, staffNotes) with
`contacts.view|manage`. Mock `DATA_SOURCE` updates return an error instead
of a fake success.

## AD-225 Staff activity notifications (not orders only)

Admin topbar bell previously listed only `order.placed`. Staff alerts now
include product requests, support tickets + customer replies, pending
reviews/questions, refund requests, and newsletter subscribe/re-subscribe.
`notifyStaff` / `notifyStaffSafe` fan out one IN_APP row per active staff;
list/mark-read no longer filter to orders. Contact form is still a stub —
no alert until that form persists.

## AD-226 Manual order payment Paid / Unpaid

Gateway/IPN still marks paid automatically. Staff also need an offline
override (e.g. cash on delivery). Order detail and quick-manage expose a
Paid/Unpaid select; `updateAdminOrder` writes `Order.paymentStatus` and the
latest `Payment` row (`PAID` + `paidAt`, or `PENDING` + clear `paidAt`).
Requires `orders.payment_status` (+ delivery permission for the rest of the
form). Refunded orders stay locked.

## AD-227 Unique per-order invoice QR

Order detail used a decorative fake QR grid. Each order now gets a real QR
(`qrcode` PNG data URL) on the invoice and order detail. Payload is plain
text: shop identity, order number/date/status/payment/shipping, customer,
line items (SKU/qty/totals), money breakdown, and scan id = order number.
Capped for reliable phone scanning. Dependency: `qrcode`.

## AD-228 Invoice website logo

Invoice header reads `SiteSettings.logoSrc` (fallback `logoOnDarkSrc`) via
`getAdminBusinessSettings` on each load — same asset as the storefront. No
snapshot: uploading a new logo in admin appearance/settings shows on the
next invoice open/print.

## AD-229 Public order tracking

Dedicated storefront routes inspired by BD retail track UX (IA only):
`/track` lookup (phone → order list, or order ID → detail),
`/track/[orderNumber]` stepper. Steps map DB status: placed → confirmed
(PROCESSING) → handover (SHIPPED) → completed (DELIVERED). Pending shows
as “No response”. Footer Track form and policy link point to `/track`.

## AD-230 Dynamic footer widgets

Design Studio → Footer widgets was mostly mock. `FooterSettings` singleton
stores JSON config (about copy, social URLs, addable link columns, contact
hours, module toggles, Play Store, copyright with `{year}`/`{storeName}`,
payment methods image, optional sub-footer). Contact phone/email/address
still use SiteSettings. Storefront `SiteFooter` renders from
`getFooterWidgetsConfig()` with defaults matching the previous hard-coded
links. Permission: `design_studio.manage`.

## AD-232 Remove Design Studio System setup

`/admin/design-studio/system` was mock-only and duplicated live store name
(Business settings) and favicon (Logo & favicon). Route, sidebar link, hub
card, and `AdminStudioSystemPage` removed.

## AD-233 Dynamic refund settings

Admin → Refunds → Settings was mock-only. `RefundSettings` singleton stores
refund type (global/category), global days, dispute toggle/days, sticker
path, and category→days JSON. Customer/admin reject reasons on this page
CRUD `RefundReason`. Category refunds page reads live type + days and saves
the map. Customer refund requests enforce the window from
`deliveredAt ?? placedAt`. PDP gallery shows `stickerSrc` when set.
Permission: `refunds.settings`. Separate `/admin/refunds/reasons` list UI
remains mock (reasons managed from Settings are live).

## AD-234 Account tickets client/server split

`/account/tickets` threw Turbopack `ENOENT … build-manifest.json` because
client views imported validators/constants from `lib/support/customer-tickets.ts`,
which also imports Prisma/`pg`. Moved client-safe types/helpers to
`lib/support/customer-ticket-shared.ts`; client components import only that.

