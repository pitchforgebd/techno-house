# Phase 15

## Objective

Implement promotions, coupons, blog, newsletter, notifications, analytics, Meta integrations, feeds, sitemap, and SEO configuration.

## Scope

P15-T01 persists promotion campaigns (`kind = PROMOTION`).
P15-T02 persists flash campaigns and today's deal product flags.
P15-T03 persists coupons and redeems them at cart/order.
P15-T04 persists blog posts/categories and newsletter subscribers.
P15-T05 persists in-app notification inbox rows.
P15-T06 persists public GA4/GTM measurement ids.
P15-T07 persists public Meta Pixel / Merchant Center ids and catalog feeds.
P15-T08 persists global SEO and serves sitemap / robots.

## Tasks

- [x] P15-T01 Promotions
- [x] P15-T02 Flash sales/deals
- [x] P15-T03 Coupons
- [x] P15-T04 Blog/newsletter
- [x] P15-T05 Notifications
- [x] P15-T06 GA4/GTM
- [x] P15-T07 Meta integrations/catalog
- [x] P15-T08 Sitemap/global SEO

## Completed Tasks

### P15-T01 Promotions

- Seed `MOCK_ADMIN_PROMOTIONS` onto `Promotion` (`kind = PROMOTION`)
- Re-seed keeps staff status and dates
- Admin list/create/edit at `/admin/promotions/campaigns`
- Hub and nav gain a Campaigns entry with persist counts
- `/offers` lists active campaigns in the current date window
- Writes need `promotion.manage` + same-origin
- Audit `promotion.create` / `promotion.update`
- Flash/deals/coupons/category discounts stay mock
- No checkout discount application

### P15-T02 Flash sales/deals

- Seed `MOCK_FLASH_DEALS` onto `FlashSale`
- Re-seed keeps staff status, featured, and dates
- Admin list toggles status/featured and can delete
- Create/edit persist title and start/end (UTC)
- `/flash-sale` lists active campaigns in the current window
- Today's deal add/remove toggles `Product.isSale`
- `/deals` lists `onSaleOnly` products (same as homepage Best deals)
- Writes need `flash_deals.manage` + same-origin
- Flash product items, banners, and checkout markdowns stay deferred
- Leftover `/admin/deals/new|[id]` editor stays mock

### P15-T03 Coupons

- Seed `MOCK_ADMIN_COUPONS` onto `Coupon`
- Re-seed keeps staff status, dates, and usage
- Admin list/create/edit at `/admin/coupons`
- Status is derived from `isActive` and the date window
- Cart apply checks active window, min spend, and usage cap
- Order place sets `couponId` and increments `usageCount`
- Discount math stays in `applyCouponToSubtotal`
- `DATA_SOURCE=mock` keeps `MOCK_COUPONS`
- Writes need `coupons.add` / `coupons.edit` + same-origin

### P15-T04 Blog/newsletter

- Seed `MOCK_BLOG_CATEGORIES` / `MOCK_BLOG_POSTS` onto `BlogCategory` /
  `BlogPost` with original excerpt/body
- Re-seed keeps category `isActive`, post status, and `publishedAt`
- Admin list/create/edit at `/admin/blog` and `/admin/blog/categories`
- `/blog` and `/blog/[slug]` list `PUBLISHED` posts only
- Seed email rows from `MOCK_SUBSCRIBERS` onto `NewsletterSubscriber`
  (SMS numbers skipped)
- Re-seed keeps subscriber status
- `/admin/newsletter` and `/admin/marketing/subscribers` list subscribers
- Footer signup upserts `SUBSCRIBED`
- Campaign issues (`MOCK_NEWSLETTERS`) stay mock — no table
- Writes need same-origin; posts/categories need `blog.add` / `blog.edit`;
  subscriber status needs `newsletter.manage` or `subscribers.manage`

### P15-T05 Notifications

- Seed a welcome `Notification` for the demo customer
- Re-seed keeps `readAt`
- `/account/notifications` lists `IN_APP` rows for the signed-in user
- Mark read / mark all read persist `readAt`
- Admin custom send creates one inbox row per ACTIVE customer
- History lists `promo` / `info` / `alert` only
- Types catalogue and channel settings stay mock
- Email/SMS/push delivery stays deferred
- Writes need same-origin; send/delete need `notifications.manage`

### P15-T06 GA4/GTM

- Seed disabled `AnalyticsConfiguration` rows for GA4 and GTM
- Re-seed keeps staff enable flags and public ids
- Admin forms persist measurement / container ids only
- Storefront injects official snippets when enabled and the id is valid
- GTM enabled suppresses the standalone GA4 snippet
- Raw script paste is not stored
- Writes need same-origin and `ga4.manage` / `gtm.manage`

### P15-T07 Meta integrations/catalog

- Seed disabled `AnalyticsConfiguration` rows for META_PIXEL and
  MERCHANT_CENTER
- Re-seed keeps staff enable flags, public ids, and notes
- Admin Meta Pixel persists enable + numeric pixel ID
- Facebook catalog persists catalog ID only (`META_PIXEL.notes`)
- Merchant Center persists enable + numeric merchant ID
- CAPI page is read-only; tokens are not stored
- Storefront injects the official pixel snippet when enabled
- GTM enabled suppresses standalone GA4 and Meta Pixel
- `/feeds/facebook.xml` when Meta Pixel is enabled
- `/feeds/google.xml` when Merchant Center is enabled
- Feeds list active-product display fields only
- Writes need same-origin and `meta.manage` / `merchant.manage`

### P15-T08 Sitemap/global SEO

- Seed one `SEOConfiguration` row with `path = null`
- Re-seed keeps staff title, description, and keywords
- Admin `/admin/seo` persists those fields only
- Storefront default metadata reads the same row
- `/sitemap.xml` lists public pages, active catalog, published posts
- `/robots.txt` disallows admin, account, checkout, and `/dev/`
- Sitemap files are not stored on disk
- Custom scripts and OG image persist stay deferred
- Writes need same-origin and `seo.manage`
- Sitemap refresh needs `sitemap.manage`

## Files Created

- `lib/marketing/promotions.ts`
- `lib/marketing/flash-sales.ts`
- `lib/marketing/flash-sale-dates.ts`
- `lib/marketing/deals.ts`
- `features/admin/promotions/promotion-actions.ts`
- `features/admin/flash-sales/flash-sale-actions.ts`
- `features/admin/deals/deal-actions.ts`
- `features/admin/coupons/coupon-actions.ts`
- `lib/marketing/coupons.ts`
- `app/(admin)/admin/(panel)/promotions/campaigns/page.tsx`
- `lib/content/blog.ts`
- `lib/content/newsletter.ts`
- `lib/content/newsletter-types.ts`
- `lib/content/slug.ts`
- `features/admin/blog/blog-actions.ts`
- `features/newsletter/newsletter-actions.ts`
- `features/admin/marketing/admin-blog-post-form.tsx`
- `features/admin/marketing/admin-subscriber-list.tsx`
- `components/layout/footer-newsletter-form.tsx`
- `app/(admin)/admin/(panel)/blog/new/page.tsx`
- `app/(admin)/admin/(panel)/blog/[id]/page.tsx`
- `app/(storefront)/blog/page.tsx`
- `app/(storefront)/blog/[slug]/page.tsx`
- `app/(storefront)/blog/not-found.tsx`
- `lib/notifications/inbox.ts`
- `lib/notifications/types.ts`
- `features/admin/notifications/notification-actions.ts`
- `features/account/notification-actions.ts`
- `lib/analytics/config.ts`
- `lib/analytics/ids.ts`
- `features/admin/analytics/analytics-actions.ts`
- `components/analytics/storefront-analytics.tsx`
- `lib/analytics/feeds.ts`
- `app/feeds/google.xml/route.ts`
- `app/feeds/facebook.xml/route.ts`
- `lib/seo/config.ts`
- `lib/seo/fields.ts`
- `lib/seo/sitemap.ts`
- `lib/seo/public-origin.ts`
- `features/admin/analytics/seo-actions.ts`
- `app/sitemap.ts`
- `app/robots.ts`

## Files Modified

- `lib/auth/audit-log.ts`
- `lib/admin/load-marketing.ts`
- `lib/admin/load-promotions-offers.ts`
- `lib/admin/nav.ts`
- `lib/admin/promotions-offers-mock.ts`
- `prisma/seed.ts`
- `features/admin/marketing/admin-promotion-list.tsx`
- `features/admin/marketing/admin-promotion-detail.tsx`
- `features/admin/marketing/admin-promotion-hub.tsx`
- `features/admin/marketing/admin-flash-sale-list.tsx`
- `features/admin/marketing/admin-flash-sale-detail.tsx`
- `features/admin/marketing/admin-promo-product-channel-list.tsx`
- `features/admin/marketing/admin-promo-product-picker-modal.tsx`
- `features/admin/analytics/admin-facebook-catalog-products.tsx`
- `app/(admin)/admin/(panel)/promotions/[id]/page.tsx`
- `app/(admin)/admin/(panel)/flash-sales/page.tsx`
- `app/(admin)/admin/(panel)/flash-sales/[id]/page.tsx`
- `app/(admin)/admin/(panel)/deals/page.tsx`
- `app/(storefront)/offers/page.tsx`
- `app/(storefront)/flash-sale/page.tsx`
- `app/(storefront)/deals/page.tsx`
- `app/(admin)/admin/(panel)/coupons/page.tsx`
- `app/(admin)/admin/(panel)/coupons/[id]/page.tsx`
- `features/admin/marketing/admin-coupon-list.tsx`
- `features/admin/marketing/admin-coupon-form.tsx`
- `lib/cart/coupons.ts`
- `lib/cart/cart.ts`
- `lib/cart/persist.ts`
- `lib/orders/create-order.ts`
- `features/cart/use-cart-store.ts`
- `features/cart/cart-view.tsx`
- `features/cart/cart-coupon-form.tsx`
- `features/checkout/checkout-view.tsx`
- `docs/DATABASE.md`
- `docs/INFORMATION_ARCHITECTURE.md`
- `features/admin/marketing/admin-blog-post-list.tsx`
- `features/admin/marketing/admin-blog-category-list.tsx`
- `features/admin/marketing/admin-marketing-hub.tsx`
- `components/layout/site-footer.tsx`
- `lib/catalog/footer-nav.ts`
- `lib/admin/engagement-mock.ts`
- `app/(admin)/admin/(panel)/blog/page.tsx`
- `app/(admin)/admin/(panel)/blog/categories/page.tsx`
- `app/(admin)/admin/(panel)/newsletter/page.tsx`
- `app/(admin)/admin/(panel)/marketing/subscribers/page.tsx`
- `features/account/account-notifications-view.tsx`
- `features/admin/marketing/admin-notification-pages.tsx`
- `app/(storefront)/account/notifications/page.tsx`
- `app/(admin)/admin/(panel)/notifications/history/page.tsx`
- `features/admin/analytics/admin-analytics-nexa-pages.tsx`
- `app/(admin)/admin/(panel)/integrations/ga4/page.tsx`
- `app/(admin)/admin/(panel)/integrations/gtm/page.tsx`
- `app/(storefront)/layout.tsx`
- `app/(admin)/admin/(panel)/integrations/meta/page.tsx`
- `app/(admin)/admin/(panel)/integrations/meta-capi/page.tsx`
- `app/(admin)/admin/(panel)/integrations/facebook-catalog/page.tsx`
- `app/(admin)/admin/(panel)/integrations/facebook-catalog/feed/page.tsx`
- `app/(admin)/admin/(panel)/integrations/merchant-center/page.tsx`
- `app/(admin)/admin/(panel)/integrations/merchant-center/feed/page.tsx`
- `app/(admin)/admin/(panel)/seo/page.tsx`
- `app/(admin)/admin/(panel)/sitemap/page.tsx`
- `app/(storefront)/page.tsx`

## Important Decisions

- AD-171 — campaigns persist on `Promotion`; list at `/campaigns`
- AD-172 — flash campaigns persist on `FlashSale`; today's deal is `isSale`
- AD-173 — coupons persist on `Coupon` and redeem at checkout
- AD-174 — blog persists; newsletter persist is subscribers, not issues
- AD-175 — notifications persist as in-app inbox rows
- AD-176 — GA4/GTM persist public ids; official snippets only
- AD-177 — Meta Pixel / Merchant Center persist public ids; XML feeds
- AD-178 — global SEO persist; live sitemap and robots

## Security Considerations

- Same-origin on writes
- `promotion.manage` for campaign save
- `flash_deals.manage` for flash and today's deal writes
- `coupons.add` / `coupons.edit` for coupon save
- `blog.add` / `blog.edit` for post and category writes
- `newsletter.manage` or `subscribers.manage` for subscriber status
- Public subscribe is same-origin only
- Public pages return display fields only
- Unsigned admin lists redirect to login
- `notifications.manage` for custom send/delete
- Customer mark-read needs a signed-in session
- `ga4.manage` / `gtm.manage` for analytics save
- `meta.manage` / `merchant.manage` for Meta and Merchant writes
- Public measurement ids only; no raw script persist
- No CAPI / Graph token persist
- `seo.manage` for global SEO save
- `sitemap.manage` for sitemap cache refresh
- No custom-script persist (XSS)

## Performance Considerations

- Admin flash list loads all `FlashSale` rows then filters in memory
  (campaign count is small)

## Validation Results

- `tsc --noEmit` clean
- eslint clean on touched files
- `npm run db:seed` — `promotions 4`, `flashSales 4`, `coupons 4`,
  `blogCategories 3`, `blogPosts 2`, `subscribers 1`,
  `notifications 1`, `analytics 4`, `seo 1`
- unsigned `/admin/flash-sales`, `/admin/deals`, `/admin/coupons`,
  `/admin/blog`, `/admin/newsletter`, `/admin/notifications`,
  `/admin/integrations/ga4`, `/admin/integrations/gtm`,
  `/admin/integrations/meta`, `/admin/integrations/merchant-center`,
  `/admin/integrations/facebook-catalog`, `/admin/seo`,
  `/admin/sitemap` → 307
- `/flash-sale` 200 includes “End of Season”
- `/deals` 200 includes “Ridge 16 Gaming Laptop”
- `/cart` 200
- `/blog` 200 includes “How to pick a gaming laptop in BD”; draft
  “DDR5 vs DDR4” is not listed
- `/blog/gaming-laptop-guide` 200 includes body copy
- `/blog/ddr5-vs-ddr4` shows the not-found UI (HTTP 200 in this Next
  16 / Turbopack setup; draft body is not rendered)
- unsigned `/account/notifications` → 307 to login
- `/` and `/blog` 200 do not include googletagmanager.com while tags
  are disabled
- `/` 200 does not include connect.facebook.net while the pixel is
  disabled
- `/feeds/google.xml` and `/feeds/facebook.xml` → 404 while disabled
- `/sitemap.xml` 200 includes `/product/ridge-16-gaming-laptop` and
  `/blog/gaming-laptop-guide`; draft blog slug is omitted
- `/robots.txt` 200 disallows `/admin/` and points at `/sitemap.xml`
- `/` title is Techno House while SEO fields are empty

## Known Issues

- Browser click-through of admin create/edit/toggle was not available
  (HTTP checks only)

## Deferred Work

- Flash deal product items and banners
- Category discounts and promotional-product assignment
- Applying campaign discounts at checkout
- `/offers/[slug]` and flash detail routes
- Leftover `/admin/deals/new|[id]` campaign editor
- Newsletter campaign issues and SMTP send
- Blog cover media uploads
- SMS subscriber numbers
- Notification type catalogue and channel settings persist
- Email/SMS/push delivery
- Order/ticket event fan-out into the inbox
- CAPI server events and access-token storage
- Facebook Graph / Merchant API catalog upload
- Facebook catalog product assignment persist
- GA4 Data API dashboard figures
- Per-path SEO rows and OG image persist
- Custom script persist

## Next Phase Dependency

Phase 15 complete. Stop until P16-T01 is approved.

## Completion Status

COMPLETE — T01–T08
