# Reference Website Analysis

Reference:
https://www.ryans.com/

Analyzed: 2026-08-29

## Purpose

This document records UX and information-architecture observations only.

The final Techno House implementation must be original.

Do not copy source code, HTML/CSS, text/content, images, branding, logo, exact visual design, or distinctive graphics.

## Originality boundary

Techno House must use its own:

- typography
- color system
- spacing
- card styling
- navigation treatment
- banners
- visual identity
- content/assets
- product copy, legal copy, and marketing language

The reference is a **shopping-journey map**, not a design or content source.

---

## Analysis log

### 1. Information architecture

Observed public journey:

```text
Discover (home / categories / brands / search)
→ Browse (category / brand / shop listing)
→ Refine (filters / sort / stock)
→ Inspect (product detail / compare / quick view)
→ Decide (wishlist, EMI, availability)
→ Cart → Checkout (account + OTP) → Confirmation / track
```

Parallel journeys:

- PC Builder (component-by-component assembly)
- Offers / deals / flash-style merchandising
- Content (blog, buying guides)
- Support (FAQ, warranty, contact, complaint/product-request)
- Branch / pickup / delivery information

### 2. Header / navigation

Observed:

- Persistent **mini-cart** in the chrome: item count + subtotal, with View Cart / Checkout.
- Header search is a primary discovery tool (FAQ confirms search bar + category menu + brand pages).
- Category menu is the second discovery path; it is deep and product-type heavy.
- Account/login is reachable from the chrome; checkout requires sign-in or registration plus OTP.
- Trust strip above merchandising: EMI, 24/7 support, card-payment reassurance, nationwide cash-on-delivery.
- Persistent utility: **Didn't find your product?** request form and order **Track**.

Techno House adaptation:

- Keep a **three-layer chrome**: utility/trust bar → logo + search + account/cart → category navigation.
- Do not copy label wording, icon set, or visual treatment.
- Search must remain the dominant header control on all breakpoints.
- Mini-cart preview is useful; keep it accessible and not layout-shifting.
- PC Builder must be a first-class header action, not buried.

### 3. Category system

Observed top-level commercial groups (from homepage, FAQ, compare product-type list, and category URLs):

- Laptops and laptop accessories
- Desktop PCs (brand PC, AIO, mini PC, house-brand PCs, workstations)
- Desktop components (CPU, motherboard, RAM, GPU, SSD/HDD, PSU, case, cooler, fans)
- Monitors and display
- Peripherals (keyboard, mouse, headset, speakers)
- Networking (router, switch, access point, cabling, satellite internet)
- Printers / office / UPS
- Mobile / tablet / wearables
- Cameras / drones / studio
- Gaming hardware and furniture
- Smart home / appliances (broader than Techno House core scope)
- Security, POS, servers (B2B-adjacent)

Category pages are **hierarchical**: parent (e.g. Desktop PC) → child (e.g. Brand Desktop PC). URLs use `/category/[slug]`.

Facet filters are **category-aware** and very deep. Laptop listing example (facet counts shown beside each value):

- Price range (min/max + submit)
- Exclude out of stock
- Brand
- Processor brand / type / generation / NPU
- Display size, panel type
- RAM, HDD, SSD, SSD type/generation
- Graphics chipset and memory
- OS, weight, warranty, LAN, fingerprint, backlight, and more

Desktop-component listings use different facets (cooler type, PSU category, RAM type, motherboard support, fan size, etc.).

Techno House adaptation:

- Use a **shallower, clearer taxonomy** than the reference’s very long compare-type list.
- Keep category-aware filters; do not use one generic filter set for all products.
- Show facet counts.
- Always provide **Reset** and **Exclude out of stock**.
- Price filter must be URL-driven (Phase 04), not client-only catalog dumps.

Proposed Techno House catalog groups (original naming, not copied):

1. Laptops
2. Desktop PCs
3. Components
4. Monitors
5. Storage
6. Networking
7. Peripherals
8. Printers & office
9. Power (UPS / PSU accessories as merchandised)
10. Gadgets
11. Offers

Exact slugs are in `docs/INFORMATION_ARCHITECTURE.md`.

### 4. Search

Observed:

- Header search is a primary entry.
- Category pages also include a listing-level search/filter interaction.
- Compare page has a type-then-product search.

Techno House adaptation:

- `/search` as a dedicated results page with query in the URL.
- Instant suggestions later; Phase 04 can ship a results page first.
- Empty, typo, and zero-result states with category shortcuts.
- Do not send the full catalog to the browser.

### 5. Brand discovery

Observed:

- Homepage **Top Brands** strip.
- Brand used as a first-class filter on listings.
- Brand-oriented category URLs exist (e.g. brand nested under a product class).

Techno House adaptation:

- `/brand/[slug]` pages.
- Brand logos only from licensed/original assets, never scraped from the reference.
- Brand filter on catalog listings.

### 6. Filtering, sorting, pagination

Observed sort on laptop listing:

- Customized by brand
- Newest
- Price low → high
- Price high → low
- Discount high → low

Observed listing tools:

- Product count in heading
- View-mode control
- Left-rail filters with Reset
- Dense spec bullets on cards

Techno House adaptation:

- Sort: featured, newest, price asc/desc, discount.
- Skip “customized by brand” as a sort — brand is a filter, not a sort.
- Pagination (or cursor) server-side; never infinite-dump of thousands of SKUs.
- Filters and sort in query string.
- Mobile: filters in a sheet/drawer, not a squeezed left rail.

### 7. Product discovery (home)

Observed homepage modules:

- Trust/utility strip
- Top Categories
- Collections / featured product grid
- Top Brands
- Long SEO/category narrative blocks (laptops, gaming, PC build, networking, appliances, phones, office, cameras)
- Trust pillars (price, online/in-store, warranty, payments, delivery, advice)
- Branch directory
- Product-request and track utilities
- Footer

Product tiles on home show: truncated title, product id, price, optional extra-save offer.

Techno House adaptation:

- Keep modular homepage: hero, categories, featured, deals, PC Builder promo, brands, trust, content.
- **Do not** reproduce the reference’s long SEO essays or branch copy.
- Prefer scannable cards and short original merchandising copy.
- House-brand PCs can exist later as “prebuilt desktops”; not required in frontend mock as a copied line.

### 8. Product cards

Observed card information density:

- Image
- Long spec-heavy title
- Internal product id
- 6–8 category-specific spec bullets (example laptop: processor, generation, RAM, storage, graphics memory, chipset, display, color)
- Price in local currency
- Optional save/offer callout
- Actions: Add to Cart, Compare, Favorite, Quick View

Techno House adaptation:

- Cards must communicate: product, price, availability, warranty cue, and primary action (`04-frontend` rule).
- Cap visible specs at **4–5** to reduce clutter; remainder on PDP.
- Show regular vs sale price when discounted.
- Stock badge (in stock / low / out).
- Do not display raw internal catalog codes as the main heading.
- Quick view is optional; prefer fast PDP navigation.
- Original card geometry, type, and chrome — not a visual clone.

### 9. Product details

Observed PDP structure (component example: PSU):

- Image disclaimer
- Title + manufacturer model
- Review count
- Product id, brand
- Special vs regular price, EMI teaser
- Check Availability (zone → branch stock)
- Quick overview bullets
- Quantity, Add to Cart, Compare
- EMI plans
- Payment / shipping / order-procedure links
- Tabs: Specifications, Details, Q&A, Reviews
- Grouped spec tables (general, cooling, performance, connectors, warranty, etc.)
- Similar products (same category)
- Related products (cross-sell components)

FAQ-confirmed behaviors:

- Branch-level stock via Check Availability
- Specs may be manufacturer-sourced; mismatches can be refunded within a stated window
- Compare from listing or `/compare`

Techno House adaptation:

- Gallery, price stack, stock, warranty, key specs, CTAs, then tabs.
- Structured spec tables, not a blob of text.
- Availability: start with **warehouse/online stock** in mock data; branch-level stock is a later backend concern.
- Q&A and reviews UI in Phase 05; no live moderation yet.
- Related + similar from typed relations, not scraped catalogs.

### 10. Cart

Observed:

- Header mini-cart: count + subtotal.
- View Cart and Checkout shortcuts.
- Empty cart still exposes the chrome and utilities.

Techno House adaptation:

- `/cart` full page plus header preview.
- Line items: image, name, unit price, qty, line total, remove.
- Coupon field in UI (Phase 06); totals are **display-only** until backend.
- Never treat client totals as authoritative (payment phase).

### 11. Checkout

Observed (order-procedure and FAQ):

1. Cart
2. Sign in / register + OTP
3. Shipping method: home delivery, courier, store pickup
4. Payment: cash on delivery, card, POS on delivery, internet banking, mobile banking
5. Tracking in customer dashboard after SMS/shipping events

Delivery model is Bangladesh-specific: city home delivery vs nationwide courier vs pickup.

Techno House adaptation:

- Checkout UI with steps: contact → delivery → payment → review.
- Mock payment methods only in frontend phases (no live gateways).
- Guest checkout is **out of scope for v1** if OTP-account is chosen; document as: account required at checkout, matching common BD retail practice. Revisit if product wants guest checkout.
- Shipping UI uses zones/areas as data, not hardcoded city essays from the reference.

### 12. Customer account

Observed:

- Login via mobile or email
- OTP for verification
- Forgot password via mobile or email
- Account settings; phone/email changes may require support
- Order tracking dashboard states: placed → confirmed → handover/ready for pickup
- Checkout requires an account

Techno House adaptation:

- Separate customer auth at `/account/*` (no admin crossover).
- Frontend phases: UI only, typed mock session, **not** production auth.
- Account nav: overview, orders, addresses, wishlist, compare, reviews, tickets, profile.

### 13. Wishlist and compare

Observed:

- Favorite on cards
- Compare on cards, listing, and PDP
- `/compare` with **select product type first**, then search products
- Compare types include the full hardware taxonomy (CPU, motherboard, RAM, GPU, etc.)

Techno House adaptation:

- `/wishlist` and `/compare`
- Compare limited to **same product type**; show a clear empty state
- Persist compare/wishlist in mock client state first; server later

### 14. Content / blog / support

Observed:

- `/blog` with buying guides and news
- Footer: store, new arrival, blog, glossary, EMI, repair/services, warranty, branches, about
- Legal: cookie, privacy, terms, payment method, return/refund, order procedure
- FAQ, warranty policy, complaint box, product-request form
- Helpline + chatbot mentioned in content
- Dual-language content appears on some policy pages (not a requirement to copy)

Techno House adaptation:

- Original support pages: about, contact, FAQ, support, warranty, shipping, returns
- Blog routes reserved
- Complaint/support entry in the shell (Phase 02)
- No copied policy text

### 15. PC Builder

Live `/pc-builder` was behind a bot challenge during this analysis. Observations from public title, component catalog, compare types, and published build-guide slot lists:

Typical slots:

- CPU
- CPU cooler
- Motherboard
- RAM
- GPU
- SSD
- HDD
- PSU
- Case
- Case fans
- Optional: monitor, keyboard, mouse, UPS

UX expectations to meet (original UI):

- Slot list with Select / Replace / Remove
- Running total and stock per part
- Compatibility warnings
- Save / share
- Add whole build to cart

Techno House architecture (mandatory):

```text
PC Builder UI
→ domain/service
→ compatibility engine (testable)
→ product repository
```

No compatibility rules inside React components. Frontend phases: mock repository + stub engine that can return compatible / incompatible / unknown.

### 16. Promotional sections

Observed:

- Homepage collections
- Per-product “save extra” / online-order save
- EMI teasers on PDP and trust bar
- Flash/deals routes reserved in our spec even when not fully exercised in this pass

Techno House adaptation:

- `/offers`, `/deals`, `/flash-sale` as first-class merchandising routes
- Badge system: sale, deal, new, low stock — original styling

### 17. Footer

Observed clusters:

- Company / store info
- Shopping helpers (new arrival, blog, EMI, warranty, branches)
- Customer service and legal
- Contact, map, phones, email
- Product request + track repeated from chrome

Techno House adaptation:

- Four-column footer: shop, support, company, contact
- Newsletter later (Phase 15)
- Original legal copy in later content work; Phase 02 can use placeholder pages

### 18. Mobile UX

Not fully instrumented with device lab in this pass (some routes bot-gated). Inferred from dense filters, mini-cart, and catalog scale:

Risks if cloned naively:

- Left-rail filters unusable on small screens
- Spec-heavy cards overflowing
- Mega-menu overload
- Mini-cart covering CTAs

Techno House adaptation:

- Mobile-first: hamburger + search + cart
- Category sheet, filter sheet, cart sheet
- Sticky add-to-cart on PDP
- Specs collapsed under “key specs”
- Touch targets ≥ 44px
- No hover-only actions

### 19. Customer experience patterns worth keeping (as IA, not visuals)

- Trust signals near price (warranty, EMI, delivery)
- Category-aware filters with counts
- Spec-first product cards for technical goods
- Branch/availability concept (defer full branch inventory)
- Product request when catalog misses a SKU
- Order tracking states
- Compare by product type
- PC Builder as a peer to catalog, not a blog widget

### 20. Patterns explicitly rejected

- Copying red/orange retail chrome or logo lockups
- Copying product IDs, titles, prices, or images
- Copying mega-menu labels verbatim
- Unbounded facet lists that bury useful filters
- SEO walls of duplicated category copy on every listing
- Client-side full-catalog filtering
- Visual clone of cards, banners, or footer art

---

## Sources used (this session)

Fetched or retrieved as readable content:

- `https://www.ryans.com/` (homepage)
- `https://www.ryans.com/category/laptop-all-laptop` (listing, facets, sort, cards)
- `https://www.ryans.com/category/desktop-pc` and brand-desktop child
- Desktop component category (partial; later request bot-gated)
- Product detail example (PSU)
- `https://www.ryans.com/compare`
- `https://www.ryans.com/page/faq`
- `https://www.ryans.com/page/warranty`
- `https://www.ryans.com/blog`
- Public snippets: order procedure, payment method, home delivery

Not fully available:

- Live PC Builder DOM (Cloudflare challenge)
- `sitemap.xml` (HTTP 500)
- Dashboard screenshot URLs (not present in the master spec; see `docs/ADMIN_REFERENCE.md`)

---

## Handoff

Customer IA and route inventory: `docs/INFORMATION_ARCHITECTURE.md`  
Admin IA: `docs/ADMIN_REFERENCE.md`  
Visual identity: `docs/DESIGN_SYSTEM.md`
