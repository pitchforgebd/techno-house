# Techno House — Information Architecture & Route Inventory

Updated: 2026-08-29  
Task: P0-T03

Public and admin routes below are **approved for implementation planning**. Additional routes require a documented decision.

Frontend phases use these routes with mock data. PostgreSQL is not connected until Phase 10.

---

## Storefront map

```text
Home
├── Shop / Category / Brand / Search
├── Product
├── Compare / Wishlist
├── Cart → Checkout → Confirmation
├── PC Builder
├── Offers / Deals / Flash sale
├── Blog
└── Company / Support
```

Customer area is a separate tree under `/account/*`.  
Admin is a separate tree under `/admin/*`.

---

## Public routes

| Route | Purpose | Phase |
| --- | --- | --- |
| `/` | Homepage | 03 |
| `/shop` | All-products listing | 04 |
| `/category/[slug]` | Category listing | 04 |
| `/brand/[slug]` | Brand listing | 04 |
| `/product/[slug]` | Product detail | 05 |
| `/search` | Search results | 04 |
| `/compare` | Product compare | 04/08 |
| `/wishlist` | Wishlist | 04/08 |
| `/cart` | Cart | 06 |
| `/checkout` | Checkout UI | 06 |
| `/checkout/confirmation` | Order confirmation UI | 06 |
| `/pc-builder` | PC Builder | 07 |
| `/pc-builder/share/[id]` | Shared build (mock id) | 07 |
| `/offers` | Promotions landing | 03/15 |
| `/flash-sale` | Flash sale | 03/15 |
| `/deals` | Deals | 03/15 |
| `/blog` | Blog index | 15 |
| `/blog/[slug]` | Blog post | 15 |
| `/about` | About | 02/08 |
| `/contact` | Contact | 02 |
| `/faq` | FAQ | 02 |
| `/support` | Support hub | 02 |
| `/warranty` | Warranty policy page | 02 |
| `/shipping` | Shipping info | 02 |
| `/returns` | Returns/refunds info | 02 |
| `/privacy` | Privacy | 02 |
| `/terms` | Terms | 02 |

### Optional public utilities (shell)

| Route | Purpose | Phase |
| --- | --- | --- |
| `/track` | Guest order track UI | 08 |
| `/product-request` | “Didn’t find it” form | 02 |
| `/brands` | Brand index | 04 |

---

## Customer account routes

All require a customer session **after** Phase 11. Phase 08 ships UI with mock session.

| Route | Purpose |
| --- | --- |
| `/account/login` | Login |
| `/account/register` | Register |
| `/account/forgot-password` | Reset request |
| `/account` | Dashboard |
| `/account/orders` | Order list |
| `/account/orders/[id]` | Order detail / track |
| `/account/addresses` | Addresses |
| `/account/wishlist` | Account wishlist |
| `/account/compare` | Saved compare set (optional alias) |
| `/account/reviews` | Reviews |
| `/account/questions` | Product questions |
| `/account/tickets` | Support tickets |
| `/account/tickets/[id]` | Ticket thread |
| `/account/notifications` | Notifications |
| `/account/profile` | Profile |

Customer auth UI must not live under `/admin`.

---

## Admin routes

Phase 09 ships UI with mock staff. Real RBAC in Phase 11.

| Route | Purpose |
| --- | --- |
| `/admin/login` | Staff login (separate) |
| `/admin` | Dashboard |
| `/admin/products` | Product list |
| `/admin/products/new` | Create |
| `/admin/products/[id]` | Edit |
| `/admin/categories` | Categories |
| `/admin/brands` | Brands |
| `/admin/attributes` | Attributes |
| `/admin/units` | Units |
| `/admin/warranty` | Warranty templates |
| `/admin/notes` | Internal notes |
| `/admin/catalog/import` | Bulk import |
| `/admin/catalog/export` | Bulk export |
| `/admin/reviews` | Reviews moderation |
| `/admin/questions` | Product Q&A |
| `/admin/orders` | Orders |
| `/admin/orders/unpaid` | Unpaid orders |
| `/admin/orders/[id]` | Order detail |
| `/admin/refunds` | Refunds |
| `/admin/customers` | Customers |
| `/admin/customers/[id]` | Customer detail |
| `/admin/promotions` | Promotions |
| `/admin/flash-sales` | Flash sales |
| `/admin/deals` | Deals |
| `/admin/coupons` | Coupons |
| `/admin/marketing` | Marketing hub |
| `/admin/blog` | Blog |
| `/admin/newsletter` | Newsletter |
| `/admin/notifications` | Notifications |
| `/admin/analytics` | Analytics |
| `/admin/reports` | Reports |
| `/admin/integrations/ga4` | GA4 |
| `/admin/integrations/gtm` | GTM |
| `/admin/integrations/meta` | Meta Pixel/CAPI/catalogue |
| `/admin/seo` | SEO |
| `/admin/sitemap` | Sitemap controls |
| `/admin/design-studio` | Design Studio |
| `/admin/media` | Media manager |
| `/admin/support` | Tickets |
| `/admin/contacts` | Contact submissions |
| `/admin/pc-builder` | Builder rules / featured builds (reserved) |
| `/admin/payments` | Payment methods |
| `/admin/payments/offline` | Offline payments |
| `/admin/otp` | OTP/SMS |
| `/admin/smtp` | SMTP |
| `/admin/shipping` | Shipping |
| `/admin/shipping/zones` | Zones/areas |
| `/admin/settings` | Business settings |
| `/admin/settings/features` | Feature flags |
| `/admin/settings/languages` | Languages |
| `/admin/settings/currency` | Currency |
| `/admin/settings/social` | Social logins / integrations |
| `/admin/staff` | Staff |
| `/admin/staff/permissions` | Roles/permissions |
| `/admin/profile` | Staff profile |

---

## Catalog taxonomy (storefront)

Slugs are stable identifiers for mock data and later PostgreSQL.

| Group | Example slugs |
| --- | --- |
| Laptops | `laptops`, `gaming-laptops`, `business-laptops` |
| PCs & servers | `pcs-servers`, `desktops`, `servers` |
| Components | `components`, `cpu`, `cpu-coolers`, `motherboards`, `ram`, `graphics-cards`, `ssd`, `hdd`, `psu`, `cases`, `case-fans` |
| Displays | `monitors`, `tvs` |
| Devices | `tablets`, `phones`, `gadgets`, `cameras` |
| Networking | `networking`, `routers`, `switches` |
| Peripherals | `sound`, `accessories` |
| Print & office | `printers`, `office`, `software` |
| Other | `gaming`, `security`, `appliances` |

Filters are defined per category in mock attribute metadata, not hardcoded in each page component.

---

## Navigation IA (storefront)

**Utility bar:** support hours, contact, nationwide delivery, Help, Offers, New arrivals, Brands (original copy).

**Header:** logo, search, PC Builder, cart, wishlist, compare, account.

**Primary nav:** Home + department list only (Laptop through Appliances). PC Builder is header-only. Shop and Offers stay in utility/footer/mobile sheet.

**Footer:** Dark brand band — brand/social, complaint & product-request CTAs, display-only track field; Company links; Policies; Contact (no invented phone numbers). Sub-footer disclaimer + ©.

**Mobile:** menu sheet (nested categories + shop-by-brand), header search, cart sheet. Search overlay and filter sheet remain later work.

---

## Data entities the UI must assume

Aligned with `docs/DATABASE.md` but consumed via repositories, not tables:

Product, Variant, Category, Brand, Attribute, Image, Stock, Warranty, Review, Question, Cart, CartItem, Wishlist, Compare set, Coupon (display), Shipping method (display), PCBuild, PCBuildItem.

---

## Out of scope for frontend phases

- Real payment capture
- Real OTP providers
- PostgreSQL / Prisma queries
- Production session cookies
- Admin mutations that persist beyond mock
