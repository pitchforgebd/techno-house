# Admin Functionality Audit

Final deliverable of `docs/ADMIN_FUNCTIONALITY_PHASE_PLAN.md`, written at the close of Phase 15 (Final Production Readiness Review). This document describes the **current, verified state** of the admin system — not a phase-by-phase diary (that history lives in each phase's now-superseded `TASK_STATE.md` entry and this session's transcript). Where a claim below is about behavior, it was checked against real PostgreSQL, `tsc`, ESLint, or an actual `npm run build`, not assumed from reading code.

## Scope and method

Phases 0–9 turned every hardcoded/mock admin surface identified by the original plan into real, database-backed CRUD with server-side authorization and validation (settings saves, deals/refunds/promotions, fully-fake pages, product/catalog actions, bulk actions, feature flags, filesystem, PC Builder settings, OTP/social login). Phases 10–13 finished the remaining gaps (languages/currency, reports/statistics, dead-code removal, a full truthfulness re-audit). Phase 14 was the first time `npm run build` was run to completion in this engagement and found — and fixed — three client/server module-boundary bugs and the real cause of the long-standing `P2037 TooManyConnections` build failure (a Prisma singleton-caching bug, not a database limitation). Phase 15 (this phase) re-verified everything end-to-end and additionally audited migrations, indexes/constraints, authorization, validation, secrets, and transaction boundaries — areas the earlier phases touched incidentally but never reviewed as a dedicated pass.

## Audited routes — final status

All ~140 routes under `/admin/**` are real, database-backed, and auth-gated (session via `middleware.ts`, permission via `staffWithPermission()`/`hasAnyPermission()` in each server action). Grouped by area:

| Area | Routes | Status | DB models |
|---|---|---|---|
| Dashboard & catalog export/import | `/admin`, `/admin/catalog/export`, `/admin/catalog/import` | Real | `Product` + related |
| Products | `/admin/products`, `/[id]`, `/new` | Real, transactional save (Phase 15 fix) | `Product`, `ProductImage`, `ProductVariant`, `ProductAttributeValue`, `ProductColor(Image)`, `ProductSpecGroup/Row/Chip`, `ProductStock` |
| Categories / Brands / Attributes / Units / Notes / Labels / Warranty | `/admin/categories*`, `/brands*`, `/attributes`, `/units`, `/notes`, `/labels*`, `/warranty` | Real. **Fixed this phase**: `/admin/labels/[id]` was reading from a hardcoded mock array (`getMockLabelById`) and 404'd on every real, non-seed label — now reads the real `ProductLabelPreset` row. Also fixed: the label form's product-assignment picker updated its own on-screen list but never actually saved that assignment — now syncs `Product.labelIds` for real | `Category`, `Brand`, `ProductAttribute`, `ProductUnit`, `ProductNotePreset`, `ProductLabelPreset`, `ProductWarranty` |
| Orders | `/admin/orders*`, `/unpaid`, `/[id]`, `/invoice` | Real, incl. bulk status changes that preserve existing tracking/notes (Phase 13) | `Order`, `OrderItem`, `Payment` |
| Promotions / Deals / Flash sales / Coupons / Category discounts | `/admin/promotions*`, `/deals*`, `/flash-sales*`, `/coupons*` | Real | `Promotion`, `PromotionProduct`, `FlashSale`, `FlashSaleItem`, `Coupon`, `CategoryDiscount` |
| Refunds | `/admin/refunds*` | Real. **Fixed this phase**: a refund whose external payout succeeded but whose Payment/Order status sync then failed is now retried automatically on the next `completeRefund` call instead of staying permanently stuck out of sync | `Refund`, `RefundEvent`, `RefundReason` |
| Reports | `/admin/reports*` | Real queries (Phase 11) | `Order`, `Product`, `SearchLog`, wallet/wishlist tables |
| Customers / B2B | `/admin/customers*` | Real | `User`, `B2BAccount`, `WalletTransaction` |
| Staff / Roles / Permissions | `/admin/staff*` | Real, RBAC-backed | `Staff`, `Role`, `Permission`, `RolePermission`, `AuditLog` |
| Marketing (alerts, popups, sale alerts, subscribers, visitors, SMS, email templates) | `/admin/marketing*`, `/newsletter` | Real | `Alert`, `Popup`, `SaleAlertSettings`, `NewsletterSubscriber`, `SmsCampaign`, `EmailTemplate`, `VisitorWidgetSettings` |
| Support (tickets, contacts, product requests) | `/admin/support*`, `/contacts*`, `/product-requests*` | Real. **Fixed this phase**: 3 server actions (`saveAdminProductRequestAction`, `saveAdminContactAction`, `replyAdminTicketAction`, `updateAdminTicketStatusAction`) were missing the same-origin/CSRF guard every sibling action has — permission checks were already present, so this was defense-in-depth, not an open write hole | `SupportTicket`, `SupportMessage`, `Complaint` |
| Reviews / Questions | `/admin/reviews*`, `/questions*` | Real | `ProductReview`, `ProductQuestion` |
| Shipping | `/admin/shipping*` | Real | `ShippingCountry/State/City/Zone/Area/Method(Zone)/Carrier`, `District`, `Upazila` |
| Payments & offline/EMI | `/admin/payments*` | Real, secrets encrypted at rest | `PaymentGatewaySetting`, `OfflinePaymentSettings`, `EmiSettings` |
| PC Builder | `/admin/pc-builder*` | Real, settings affect the live builder; AD-276 compatibility engine untouched by any phase | `PCBuild`, `PCBuildItem`, `PCCompatibilityRule`, `PcBuilderSettings`, `PcBuilderSlotConfig` |
| Design Studio (theme, banners, logo, typography, footer, pages) | `/admin/design-studio*` | Real | `DesignThemeSettings`, `HomeBanner`, `FooterSettings`, `ContentPage` |
| Settings (general, tax, invoice, languages, currency, tracking, thermal printer, pickup points, shipping label, comments, chat) | `/admin/settings*` | Real, incl. Phase 10's language/currency completion | `SiteSettings`, `StoreOperationsSettings`, `LanguageSetting`, `ChatWidgetConfiguration`, `CommentSystemConfiguration` |
| Integrations (GA4, GTM, Meta/Meta CAPI, Facebook catalog, Merchant Center, custom script) | `/admin/integrations*` | Real | `AnalyticsConfiguration`, `CustomScriptSettings` |
| Google (Firebase, Maps, reCAPTCHA), SMTP, OTP, Social login | `/admin/settings/google*`, `/smtp`, `/otp`, part of `/settings/social` | Real | `FirebaseConfiguration`, `GoogleMapConfiguration`, `RecaptchaConfiguration`, `SmtpConfiguration`, `OtpSmsConfiguration`, `SocialLoginConfiguration/Account` |
| Notifications | `/admin/notifications*` | Real | `Notification`, `NotificationTypeSetting`, `NotificationSettings` |
| Media library | `/admin/media*` | Real, real file storage | `MediaAsset` |
| SEO & sitemap | `/admin/seo`, `/sitemap` | Real | `SEOConfiguration` |
| Blog | `/admin/blog*` | Real | `BlogPost`, `BlogCategory` |
| Filesystem settings | `/admin/settings/filesystem` | Real (Phase 7) | `FilesystemSettings` |
| Feature flags | part of `/admin/settings/features` | Real, actually gates behavior (Phase 6) | `FeatureFlagSetting` |

## Database

- **110 Prisma models**, all backed by real PostgreSQL tables — no in-memory/mock data source in production configuration (`DATA_SOURCE=mock` remains available for local dev without a database, and every mutating service function checks it and fails closed with an honest error rather than pretending to save).
- **52 migrations**, reviewed this phase: no destructive migration (no `DROP TABLE`/`TRUNCATE`, the one `DROP COLUMN` pair was for genuinely dead seed-only fields replaced in the same migration by their real successor tables), no unindexed foreign keys or missing uniqueness constraints found on the models that need them (`Product.slug/sku/barcode`, `Order.number`, `User/Staff.email`, `Category/Brand.slug`, `Promotion/FlashSale.slug`, `Coupon.code`, etc.).
- `npx prisma migrate status`: up to date. `npm run db:drift`: no difference between schema and migrations.
- **Transaction boundaries** (audited this phase): order placement, order status updates, wallet adjustments, and preset note/label deletion were already correctly transactional. Two gaps were found and fixed:
  - `saveAdminProduct`/`cloneAdminProduct` (`lib/catalog/admin-products.ts`) wrote to `Product` + `ProductImage` + `ProductVariant` + `ProductAttributeValue` + `ProductColor(Image)` + `ProductSpecGroup/Row/Chip` + `ProductStock` as separate, unguarded statements — a failure partway through could leave a real product half-written (verified: this is now wrapped in one `$transaction`, and a failure correctly rolls back every write including the `Product` row itself, verified against real Postgres).
  - `completeRefund` (`lib/refunds/workflow.ts`) committed the refund's own `COMPLETED`/`payoutRef` record separately from the `Payment`/`Order` status sync — a sync failure after a successful external payout left real money sent with no record of it on the order. This is **deliberately not** simply wrapped in one transaction (doing so would let a retry attempt a second real-world payout); instead the "already completed" path now retries just the Payment/Order sync, which is safe because it's idempotent. Verified against real Postgres with a simulated stuck-sync fixture.

## Authorization, validation, secrets (audited this phase)

- **Authorization**: sampled all 60 `features/admin/**/*-actions.ts` files. Every mutating action checks `staffWithPermission()`/`hasAnyPermission()` before doing real work. Three files (product requests, contacts, tickets) were missing the same-origin/CSRF guard that every sibling file has — fixed; this was defense-in-depth (permission checks were already present), not an unauthenticated write.
- **Validation**: broadly healthy — length caps, numeric bounds, and enum whitelisting are the norm (e.g. role/permission keys are validated against the real `Permission` table rather than trusted as strings; ticket/contact status and priority go through explicit whitelists; bulk actions cap batch size at 500 items).
- **Secrets**: no hardcoded credentials found anywhere in source. All gateway/SMTP/courier/SMS secrets are read from `process.env` inside server-only `lib/` modules and encrypted at rest where applicable (`lib/payments/secret-crypto.ts`, `lib/shipping/courier-secret-crypto.ts`). No secret value is ever passed to a Client Component. `.env.local` is gitignored; only `.env.example` (placeholders) is tracked.
- **Session model** (added post-Phase-15, at the user's request): staff and customer sessions are DB-backed (`StaffSession`/`CustomerSession`, hashed opaque token, instant revocation, fresh permission lookup every request) with a signed JWT envelope layered on top (`lib/auth/session-jwt.ts`) purely for cryptographic verification at the Edge — `middleware.ts` can reject a tampered/expired cookie before the request reaches a page, without a DB round-trip. The JWT carries no authorization data, so revoking a session or changing a permission still takes effect immediately, exactly as before. See `docs/SECURITY.md` for detail.

## Tests performed (this phase, against the final state)

- `npx tsc --noEmit`: clean
- `npm run build`: **clean, 140/140 pages, zero errors** (dev server stopped first, per the established convention)
- `npm run lint`: 14 errors / 10 warnings — unchanged, established baseline
- `npm run test:pc-builder` (AD-276 guard): **44/44 PASS**, re-confirmed after every edit this phase
- `npm run test:payments`: 47/47 PASS
- `npm run test:queries`, `test:a11y` (10), `test:seo` (12), `test:env` (8): all PASS
- `npx prisma migrate status` / `npm run db:drift`: clean
- Real-PostgreSQL verification (temporary script, deleted after use): 11/11 checks — product-save transaction rollback, label `productIds` attach/detach sync, refund retry-safety — all directly exercised against live data, not asserted from reading code
- Live-route sweep across every functional area (Authentication, Catalog, Promotions, Settings, PC Builder, Orders, Support): correct `200`/`307` status, no server errors in the dev log

## Known limitations

1. **`test:security` 1/16** — 4 uses of `dangerouslySetInnerHTML` (blog post body rendering, storefront theme-CSS injection, a custom-script slot, CMS content pages). Pre-existing since before Phase 13 discovered and documented it; not touched by this phase. These are rendering trusted, admin-authored content (not user input), but the baseline check flags the pattern regardless — worth a dedicated CSP/sanitization review in a future pass.
2. **`test:bundle` 4/9** — PDP gallery and homepage hero don't mark their primary image `priority` for `next/image`; a gallery cache-busting query param conflicts with Next's image cache; a "heavy chart/editor library" dependency flag. Newly surfaced in Phase 14 (the aggregator test had apparently never been run to completion before either) but confirmed unrelated to any admin-functionality phase's changes — genuine image-loading/perf and dependency-hygiene work, out of scope for this plan.
3. No browser automation is available in this environment. All UI-level verification in every phase relied on real-database checks through the exact functions the pages/actions call, plus HTTP status checks against a live dev server. Mobile/responsive usability was confirmed at the code level (the admin shell collapses to a slide-over nav below the `lg:` breakpoint, tables scroll horizontally) but never visually confirmed on an actual small viewport.

**Resolved after Phase 15 closed** (user asked for it directly): `mockProductRating()`/`mockSalesCount()` on `/admin/products` — previously fabricated, hash-derived rating/sales numbers — now come from real `ProductReview` averages (published reviews only) and real `OrderItem.quantity` summed across paid orders (`lib/catalog/admin-products.ts`, `loadListStats`), scoped per-page for efficiency. Verified against real Postgres: average correctly excludes non-published reviews, sales count correctly excludes unpaid orders. Production build and all regression suites re-confirmed clean after this change.

## Intentionally unavailable features

- **Bulk order deletion** — no order-delete capability exists anywhere (orders are financial/audit records); the fake "Delete" bulk-action option was removed rather than building this.
- **CSV export for the Promotional Products / Today's Deal admin lists** — no backend exists for this specific export (distinct from the real Report Center CSV export, which works); the fake "Export" option was removed.
- **Flash-sale product-assignment pricing** — the flash-sale detail page discloses via a visible banner that assigning products to a flash sale does not yet make checkout apply the flash-sale price; checkout still uses catalogue pricing. Honestly disclosed, not faked.

## Remaining manual data-entry tasks (go-live checklist)

None of these are code gaps — they are real-world configuration only a human with the relevant credentials/accounts can enter, via the already-real admin settings pages:

- Payment gateway credentials (bKash, Nagad, SSLCommerz) under Admin → Payments
- SMTP credentials under Admin → SMTP
- SMS gateway API key under Admin → Settings → OTP/SMS
- Courier/shipping carrier API credentials under Admin → Shipping → Carriers
- Google services: Maps API key, reCAPTCHA keys, Firebase config, GA4/GTM/Meta CAPI ids under their respective Integrations pages
- Initial staff accounts, roles, and permission assignments under Admin → Staff
- Production `DATABASE_URL`, `APP_URL`, and the secret-encryption keys (`GATEWAY_SECRETS_KEY`, `COURIER_SECRETS_KEY`, `STORAGE_SECRETS_KEY`) in the deploy environment — all documented in `.env.example`

## Definition of Done — checklist against `docs/ADMIN_FUNCTIONALITY_PHASE_PLAN.md`

- [x] No reachable fake save reports success (Phases 0–13 fixed every instance found; this phase's re-sweep found and fixed one more — the label edit page)
- [x] No mock array is presented as persistent data (the last one — `labels/[id]`'s `getMockLabelById` — fixed this phase)
- [x] All implemented CRUD operations persist to the database
- [x] All admin mutations have server-side validation and authorization (3 missing CSRF guards fixed this phase)
- [x] Settings that claim to control behavior actually control that behavior (feature flags, Phase 6)
- [x] Reports/statistics shown as live data come from real queries (Phase 11)
- [x] PC Builder settings affect the live PC Builder where intended (Phase 8)
- [x] PC Builder compatibility behavior from AD-276 remains intact (44/44, reconfirmed after every phase since)
- [x] PC Builder-origin orders remain traceable (`buildBatchId`/`builderSlot`, untouched by any phase)
- [x] Intentionally unavailable features are clearly disclosed rather than faked
- [x] TypeScript, ESLint, build, and relevant tests pass (see Tests above)
- [x] `TASK_STATE.md` and this document accurately describe the final state
