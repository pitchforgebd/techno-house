# Phase 12

## Objective

Implement catalog/product/category/brand/attribute/inventory/review/query backend functionality.

## Scope

Replace mock catalog admin writes with PostgreSQL, task by task. Storefront
read repositories from P10-T06 stay the storefront contract.

## Tasks

- [x] P12-T01 Categories
- [x] P12-T02 Brands
- [x] P12-T03 Attributes
- [x] P12-T04 Products/variants
- [x] P12-T05 Inventory
- [x] P12-T06 Reviews/questions
- [x] P12-T07 Search/filter backend

## Completed Tasks

### P12-T01 Categories

- Admin create/edit/delete persist to `Category`
- Hidden (`isActive=false`) categories stay off the storefront list
- Delete blocked when products or child categories exist
- Cycle-safe parent assignment
- Audit: `category.create` / `category.update` / `category.delete`

### P12-T02 Brands

- Admin create/edit/delete persist to `Brand`
- `Brand.position` + `description`; storefront list orders by position
- Hidden brands stay off the storefront list
- Delete blocked when products exist
- Audit: `brand.create` / `brand.update` / `brand.delete`

### P12-T03 Attributes

- Admin create/edit/delete persist to `ProductAttribute`
- `allowedValues` is the admin suggestion list; facets still use product values
- Delete blocked while products use the attribute
- Audit: `attribute.create` / `attribute.update` / `attribute.delete`

### P12-T04 Products/variants

- Admin create/edit/delete persist to `Product` and `ProductVariant`
- `Product.position`; storefront `featured` sort and builder candidates use it
- Unpublished products stay off the storefront list
- Delete blocked when the product is on an order, saved PC build, or campaign
- List published/featured/deal toggles persist
- Audit: `product.create` / `product.update` / `product.delete`

### P12-T05 Inventory

- `ProductStock.quantity` and `lowStockThreshold` persist
- `Product.stockStatus` is derived from available units (`quantity - reserved`)
- Variant stock rows persist with the product save
- List “View stock” drawer updates quantity without the full form
- Stock report reads available units
- Quantity cannot go below reserved
- Audit: `inventory.update`

### P12-T06 Reviews/questions

- Staff custom reviews persist as published `ProductReview` rows (`isStaffEntry`)
- Moderate publish/reject; pending/rejected stay off the storefront
- Customer PDP/account submits create pending reviews and questions
- Question answers persist (`answer`, `answeredBy`, `answeredAt`, `ANSWERED`)
- Storefront repository shows published reviews and answered questions only
- Audit: `review.create` / `review.moderate` / `review.delete` /
  `question.answer` / `question.delete`

### P12-T07 Search/filter backend

- `q` matches name, SKU, brand name/slug, and category name/slug
- Query trimmed and capped at 120 characters in both repositories
- Shop/search/brand URL filters use `isFilterable` attribute keys
- Category pages still prefer `Category.filterKeys`
- Facets without a category declaration use filterable attributes on the match set
- No new table; user-search report stays mock

## Files Created

- `lib/catalog/category-input.ts`
- `lib/catalog/admin-categories.ts`
- `features/admin/categories/category-actions.ts`
- `lib/catalog/brand-input.ts`
- `lib/catalog/admin-brands.ts`
- `features/admin/brands/brand-actions.ts`
- `prisma/migrations/20260905004500_brand_position_description/`
- `lib/catalog/attribute-input.ts`
- `lib/catalog/admin-attributes.ts`
- `features/admin/attributes/attribute-actions.ts`
- `prisma/migrations/20260905010000_attribute_allowed_values/`
- `lib/catalog/product-input.ts`
- `lib/catalog/admin-products.ts`
- `features/admin/products/product-actions.ts`
- `prisma/migrations/20260905011500_product_position/`
- `lib/catalog/inventory-input.ts`
- `lib/catalog/admin-inventory.ts`
- `features/admin/products/admin-product-stock-drawer.tsx`
- `prisma/migrations/20260905013000_product_stock_backfill/`
- `lib/catalog/review-input.ts`
- `lib/catalog/question-input.ts`
- `lib/catalog/admin-reviews.ts`
- `lib/catalog/admin-questions.ts`
- `lib/catalog/customer-reviews.ts`
- `lib/admin/load-questions.ts`
- `features/admin/reviews/review-actions.ts`
- `features/admin/reviews/admin-product-reviews.tsx`
- `features/admin/questions/question-actions.ts`
- `features/account/conversation-actions.ts`
- `app/(admin)/admin/(panel)/reviews/[slug]/page.tsx`
- `lib/catalog/filter-keys.ts`

## Files Modified

- Admin category / brand / attribute / product / review / question list, forms, pages
- `lib/admin/load-*.ts` and related mocks
- `lib/data/prisma/brand-repository.ts`, `lib/data/prisma/product-repository.ts`, `lib/data/prisma/review-repository.ts`, `prisma/seed.ts`
- Product and account review/question views
- `lib/auth/audit-log.ts`
- `docs/DATABASE.md`, `docs/SECURITY.md`
- Storefront shop/search/brand/category listings; `lib/search/query.ts`; `lib/data/mocks/query.ts`; `scripts/db/check-parity.ts`

## Important Decisions

- Reuse existing `Category` columns; no migration for T01
- `Brand.position` added in T02; `Product.position` added in T04
- Attribute suggestions stored as `allowedValues`, not a new options table
- Storefront repositories stay active-only
- Media uploads remain mock
- `Product.stockStatus` is denormalised from `ProductStock` (T05)
- `reserved` is not staff-editable until orders exist
- Storefront reviews/questions stay published/answered-only (T06)
- Customer writes start pending; staff custom reviews publish immediately
- Search matches brand and category as well as name/SKU (T07)
- Shop-wide filter keys come from `isFilterable`, not a hardcoded list

## Security Considerations

- Same-origin + `staffWithPermission` on every mutation
- Customer writes require a signed-in session + same-origin
- Nav hide is not the control
- Audit writes must not fail the save

## Performance Considerations

- Admin product/child counts use Prisma `_count` instead of scanning 500 products

## Validation Results

- `tsc --noEmit` clean; eslint clean on touched files
- Category CRUD smoke; unsigned `/admin/categories` 307; `/category/laptops` 200
- Brand CRUD smoke; `db:drift` matches; `db:parity` 161 checks
- Unsigned `/admin/brands` 307; `/brands` 200
- Attribute CRUD smoke; unsigned `/admin/attributes` 307
- Product CRUD smoke; `db:drift` matches; `db:parity` 161 checks
- Unsigned `/admin/products` and `/admin/products/new` 307; `/product/lumen-14-office-laptop` 200
- Inventory smoke (low stock, variant qty, reserved block, out of stock, cleanup)
- `db:drift` matches; `db:parity` 161 checks
- Unsigned `/admin/reports/stock` 307
- Review/question smoke (staff publish, pending hidden, moderate, reject,
  question answer, cleanup)
- `db:drift` matches; `db:parity` 161 checks
- Unsigned `/admin/reviews`, `/admin/reviews/new`, `/admin/questions` 307
- `/product/lumen-14-office-laptop` 200
- Search/filter: `db:parity` 163 checks; `/search?q=cpu-coolers` and
  `/search?q=Processors` 200 and return the matching cooler / CPU products

## Known Issues

- Banner/icon/cover/logo file fields do not upload
- Category Featured/Hot toggles and bulk actions are still mock
- Meta title is not stored on category or brand
- Attribute bulk actions and catalog-import attribute list stay mock
- Product image/SEO/tags/clone stay mock
- Hide-stock / show-quantity display toggles are not stored
- Reviewer and review image uploads stay mock

## Deferred Work

- Dedicated `attribute_values.manage` screen
- Catalog media once the media manager exists
- Related-product link-table position
- Staff editing of reserved units (orders, Phase 13)
- User-search logging (Phase 15)

## Next Phase Dependency

Phase 13 — Orders/Payments/Refunds (P13-T01 Persistent cart)

## Completion Status

COMPLETE
