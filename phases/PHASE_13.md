# Phase 13

## Objective

Implement orders, payment abstraction, payment gateway integration, verified
webhooks, refunds, idempotency, and payment security tests.

## Scope

Persist the storefront cart, then create real orders and payments. The client
is never authoritative for financial state. T01 is cart persistence only.

## Tasks

- [x] P13-T01 Persistent cart
- [x] P13-T02 Order creation
- [x] P13-T03 Payment abstraction
- [x] P13-T04 Gateway integration
- [x] P13-T05 Webhook verification
- [x] P13-T06 Refund workflow
- [x] P13-T07 Payment security tests

## Completed Tasks

### P13-T01 Persistent cart

- Guest carts keyed by hashed `th_guest_cart` cookie token
- Signed-in carts keyed by `userId`
- Login/register merge guest lines into the user cart
- Server validates product, stock, qty 1–10, and 24-line cap
- Coupon and shipping persist; payment method stays device-local
- Totals remain display-only; checkout place-order stays mock
- `DATA_SOURCE=mock` keeps localStorage

### P13-T02 Order creation

- Signed-in checkout creates `Order` / `OrderItem` from the user cart
- Server recalculates price, coupon, shipping, tax, and total
- Stock reserved in the same transaction; cart cleared on success
- Payment row stored as pending/`unpaid`; never marked paid
- Account orders and confirmation read the customer's own orders
- Guest checkout remains unavailable
- `DATA_SOURCE=mock` keeps the device-local mock receipt

### P13-T03 Payment abstraction

- `lib/payments` adapters sit between orders and any future gateway
- COD is offline/pending; SSLCommerz and bKash are hosted stubs
- `applyPaymentTransition` enforces the status machine
- `PAID` needs a transaction reference and matching amount/currency
- No storefront action marks a payment paid
- Live gateway HTTP clients wait for T04

### P13-T04 Gateway integration

- Optional SSLCommerz / bKash credentials; missing keys stay deferred
- Hosted session starts after the order and payment row exist
- Checkout redirects only to allow-listed `https` gateway hosts
- Browser return pages do not mark paid
- Successful start may move the payment to `PROCESSING`
- COD is unchanged (offline, pending)
- `DATA_SOURCE=mock` still uses the device-local mock receipt

### P13-T05 Webhook verification

- SSLCommerz IPN is confirmed through the validation API, not the raw POST
- Optional `verify_sign` hash is checked when present
- bKash `status=success` runs execute, then status query if needed
- `PAID` needs matching amount, currency, order number, and transaction ref
- Duplicate events with the same ref are idempotent
- A different ref on an already-paid row is rejected
- Browser return routes still do not mark paid
- Missing credentials acknowledge the callback and leave the payment unpaid

### P13-T06 Refund workflow

- Customer requests a refund on their own paid order
- One open refund at a time; amount capped to remaining
- Staff with `refunds.process` approve, reject, or pay out
- COD completes offline; SSLCommerz / bKash call the gateway
- Payment becomes PARTIALLY_REFUNDED or REFUNDED
- Checkout `applyPaymentTransition` still cannot mark refunded
- `Payment.sessionRef` and `Refund.payoutRef` added
- `DATA_SOURCE=mock` keeps the mock admin list

### P13-T07 Payment security tests

- Durable suite at `scripts/payments/check-security.ts`
- Run with `npm run test:payments`
- Covers the cases in `docs/PAYMENT_SECURITY.md`
- 43 checks: signatures, webhooks, amounts, refunds, browser return
- Does not call live gateways or print secrets

## Files Created

- `lib/cart/guest-cart-constants.ts`
- `lib/cart/guest-cart-cookie.ts`
- `lib/cart/persist.ts`
- `features/cart/cart-actions.ts`
- `features/cart/cart-provider.tsx`
- `lib/orders/order-number.ts`
- `lib/orders/order-view.ts`
- `lib/orders/create-order.ts`
- `lib/orders/customer-orders.ts`
- `features/checkout/checkout-actions.ts`
- `lib/payments/status.ts`
- `lib/payments/adapters.ts`
- `lib/payments/service.ts`
- `lib/payments/config.ts`
- `lib/payments/http.ts`
- `lib/payments/redirect.ts`
- `lib/payments/return.ts`
- `lib/payments/sslcommerz.ts`
- `lib/payments/bkash.ts`
- `features/checkout/payment-return-view.tsx`
- `app/(storefront)/checkout/payment/return/page.tsx`
- `app/api/payments/sslcommerz/return/route.ts`
- `app/api/payments/sslcommerz/ipn/route.ts`
- `app/api/payments/bkash/callback/route.ts`
- `lib/payments/amount.ts`
- `lib/payments/callback-fields.ts`
- `lib/payments/confirm.ts`
- `lib/refunds/codes.ts`
- `lib/refunds/status.ts`
- `lib/refunds/workflow.ts`
- `features/admin/refunds/refund-actions.ts`
- `features/account/refund-actions.ts`
- `features/account/account-refund-request.tsx`
- `prisma/migrations/20260905123000_refund_workflow_refs/migration.sql`
- `scripts/payments/check-security.ts`

## Files Modified

- `lib/cart/cart.ts`
- `lib/auth/customer-auth.ts`
- `features/cart/use-cart-store.ts`
- `features/cart/cart-view.tsx`, coupon form, add-to-cart button
- `features/product/product-summary.tsx`
- `features/product/product-similar-sidebar.tsx`
- `features/pc-builder/pc-builder-add-to-cart.tsx`
- `app/(storefront)/layout.tsx`
- `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`
- Checkout view/confirmation; account dashboard/orders/detail pages
- `lib/payments/adapters.ts`, `lib/payments/service.ts`
- `lib/orders/create-order.ts`, `lib/orders/order-view.ts`, `lib/orders/customer-orders.ts`
- `.env.example` (placeholders only)
- `lib/payments/sslcommerz.ts`, `lib/payments/bkash.ts`, `lib/payments/service.ts`
- `docs/PAYMENT_SECURITY.md`, `docs/SECURITY.md`
- `prisma/schema.prisma` (`Payment.sessionRef`, `Refund.payoutRef`)
- Admin refund list/detail; account order detail
- `lib/payments/status.ts` (PAID → refunded states)
- `package.json` (`test:payments`)

## Important Decisions

- Reuse existing `Cart` / `CartItem`; no migration (AD-157)
- Store the hash of the guest token in `Cart.sessionToken`
- Map shipping mock codes to seeded ShippingMethod/ShippingArea FKs
- Payment method has no column — keep it client-only until T03
- Variant lines are not used yet (PDP is slug-only; `variantId` null)
- Order totals always recalculated server-side (AD-158)
- Pending `Payment` row records method only; gateway work is T03
- Payment adapters isolate order code from gateways (AD-159)
- Hosted gateway HTTP runs after the order is committed (AD-160)
- Browser return is never treated as paid
- Only validated IPN / executed bKash payments become PAID (AD-161)
- Refunds require request, staff approval, then verified payout (AD-162)
- Payment security suite is a durable tsx check, not a new test runner (AD-163)

## Security Considerations

- Same-origin on every cart mutation
- Guest token is opaque; only the hash is stored
- Guest cookie is not an auth session and does not open `/account`
- Out-of-stock products cannot be added
- Display totals are not charges
- Place-order requires a signed-in session + same-origin
- Customers can only read their own orders
- Orders are never marked paid from the browser
- `PAID` transitions require a transaction reference and matching totals
- Gateway secrets stay server-side and are optional at boot
- Checkout only follows allow-listed HTTPS hosts
- IPN/callback verification does not trust browser query params
- Amount, currency, order, and transaction ref must match before PAID
- Customers can only request refunds on their own paid orders
- Staff need `refunds.process` to approve, reject, or pay out
- Checkout cannot mark a payment refunded

## Performance Considerations

- Cart is loaded once in the storefront layout and remounts on login/logout
- Empty guests do not create a cookie or row until the first write

## Validation Results

- `tsc --noEmit` clean; eslint clean on touched files
- `db:drift` matches
- Persist smoke: add, qty, coupon, shipping, out-of-stock reject, login
  merge, remove, clear, cleanup
- `/cart`, `/product/lumen-14-office-laptop`, and `/shop` 200
- Order smoke: server totals, reserved +2, cart cleared, empty reorder
  rejected, cleanup
- `/checkout` and `/checkout/confirmation` 200; unsigned `/account/orders` 307
- Payment abstraction smoke: illegal transitions, stub does not charge,
  amount/ref checks, paid replay idempotent, cleanup
- `/checkout` 200
- Gateway smoke: missing credentials stay deferred; invalid redirect
  rejected; return page does not pay; COD unchanged
- `/checkout` and `/checkout/payment/return` 200
- Webhook smoke: invalid hash, amount/currency/store mismatch, unknown
  order, invalid validation, valid pay, duplicate idempotent, second ref
  rejected, unsigned bKash success does not pay
- IPN 200 without credentials; browser return 200; SSLCommerz return 303
- Refund smoke: over-amount rejected, one open refund, complete before
  approve rejected, partial → PARTIALLY_REFUNDED, complete idempotent,
  checkout cannot mark REFUNDED, full → REFUNDED, reject cannot pay out
- Unsigned `/admin/refunds` and `/account/orders` 307; `/checkout` 200
- `db:drift` matches after `20260905123000_refund_workflow_refs`
- `npm run test:payments` — 43 checks passed

## Known Issues

- Existing device-local carts are not imported into the database
- PostgreSQL unique on `(cartId, productId, variantId)` does not collide
  when `variantId` is null; uniqueness is enforced in application code
- Admin order list is still mock
- Hosted checkout needs live credentials and a public `APP_URL`
- Live IPN/execute still needs public `APP_URL` and gateway credentials

## Deferred Work

- Admin refund settings / reasons / category pages still mock
- Admin order list/detail against PostgreSQL
- Authoritative tax
- Wishlist/compare persistence

## Next Phase Dependency

Phase 13 is complete. Do not start P14-T01 until explicitly approved.

## Completion Status

COMPLETE
