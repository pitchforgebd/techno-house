# Admin Reference Analysis

Analyzed: 2026-08-29  
Task: P0-T02

## Source limitation

The master specification lists admin **capabilities** but does **not** contain dashboard image URLs.

No admin screenshot assets exist in this repository.

This analysis therefore uses:

1. The admin requirement list in `docs/TECHNO_HOUSE_CURSOR_MASTER_SPEC.md`
2. Common single-vendor e-commerce operations IA (layout patterns only — not copied UI kits)
3. Original Techno House admin information architecture

Do not copy any third-party admin theme, HTML/CSS, component library demo, or screenshot.

---

## Reference layout patterns (generic, not branded)

Typical production admin shells share these **structural** traits:

| Pattern | Why it works | Techno House use |
| --- | --- | --- |
| Persistent left sidebar, grouped | Dozens of modules need scanability | Yes — collapsible groups |
| Top bar: search, store link, staff identity | Context switching | Yes |
| Dashboard = KPI cards + short tables + charts | Managers need exceptions, not vanity | Yes — operational, not decorative |
| List pages = filters + dense table + row actions | Catalog/orders volume | Yes |
| Detail pages = header summary + tabs | Orders, products, customers are multi-entity | Yes |
| Settings as nested groups | Payments, shipping, SEO, staff | Yes — not one infinite form |
| Mobile: sidebar → sheet | Staff on phones | Yes, secondary |

Rejected patterns:

- Icon-only sidebars without labels as the default
- Nested 4-level menus
- Dashboard widgets that duplicate analytics tools without actions
- Tables without filters or empty states

---

## Dashboard hierarchy

Priority of the home `/admin` screen:

1. **Needs attention** — unpaid orders, low stock, open tickets, failed payments (when backend exists)
2. **Today** — orders, revenue (masked/mocked in frontend phases), new customers
3. **Catalog health** — out of stock, missing images, unpublished
4. **Shortcuts** — create product, view orders, PC Builder rules (later)

KPI cards should be few (4–6), linked to filtered list pages.

Charts are secondary; they must not block first paint with heavy client bundles.

---

## Tables

Standard list anatomy:

```text
Page title + primary CTA
Filter bar (status, date, search, category)
Bulk actions (where permissioned)
Table (sticky header)
Pagination
Empty / error / loading states
```

Core columns by domain:

- Products: image, name, SKU, category, price, stock, status
- Orders: number, customer, date, total, payment, fulfillment
- Customers: name, contact (masked where needed), orders, spend, joined
- Refunds: order, amount, status, requested, resolved
- Tickets: id, customer, topic, status, updated

Row click opens detail. Destructive actions need confirmation and server permission later.

---

## Cards (admin)

Use cards for:

- KPI metrics
- Form sections (product pricing vs SEO vs inventory)
- Empty states
- Settings clusters

Do not use storefront product-card styling in admin.

---

## Filters and forms

- Filters must map to query params so staff can share URLs.
- Product form is long: split into sections or steps (basics, media, specs/attributes, pricing, inventory, warranty, SEO).
- Attribute/spec fields are **category-dependent** (same idea as storefront facets).
- Validation messages inline; never rely on browser-only checks after backend exists.

---

## Settings structure

Group settings so the sidebar stays short:

| Group | Examples |
| --- | --- |
| Store | business profile, currency, languages, feature flags |
| Commerce | tax/display currency, coupons engine toggles |
| Payments | methods, offline payments (secrets never in client) |
| Shipping | zones, areas, methods, rates |
| Communications | SMTP, OTP/SMS providers |
| Integrations | GA4, GTM, Meta Pixel/CAPI, catalogue feed, social logins |
| SEO | sitemap, defaults, robots |
| Appearance | Design Studio, media |
| Access | staff, roles, permissions, audit |

---

## Sidebar organization (original Techno House)

Default expanded groups:

1. **Overview** — Dashboard
2. **Catalog** — Products, Categories, Brands, Attributes, Units, Warranty, Notes, Bulk import/export, Reviews, Questions
3. **Sales** — Orders, Unpaid orders, Refunds
4. **Customers** — Customers
5. **Merchandising** — Promotions, Flash sales, Deals, Coupons
6. **Content** — Blog, Newsletter, Media
7. **Insights** — Analytics, Reports, GA4/GTM/Meta, Sitemap/SEO
8. **Experience** — Design Studio, Notifications
9. **Support** — Tickets, Contacts, Product conversations
10. **Operations** — Shipping, Payments, OTP/SMS, SMTP
11. **System** — Business settings, Features, Languages, Currency, Social logins, Integrations
12. **Staff** — Staff, Permissions, Profile

PC Builder admin (compatibility rules, featured builds) belongs under **Catalog** or a dedicated **PC Builder** group when Phase 14 is in scope. Frontend admin (Phase 09) should reserve the nav item.

---

## Authorization (documented now, implemented later)

- Admin lives only under `/admin/*`
- No shared session cookie purpose with `/account/*`
- UI hiding is not security; every mutation is server-authorized in Phase 11+
- Frontend Phase 09 uses a mock staff user and permission map for **UI states only**

---

## Original visual direction (admin)

- Dense, calm, high-contrast tables
- Neutral slate surfaces; primary teal from storefront tokens for actions
- No glassmorphism, no storefront hero banners
- 12–14px body in tables; 16px+ for titles
- Clear status badges (payment, fulfillment, stock)

See `docs/DESIGN_SYSTEM.md` for shared tokens. Admin may use a denser spacing scale on tables only.
