# Payment security audit — Phase 17 (P17-T02)

**Date:** 2026-09-05  
**Scope:** Checkout payments, gateway callbacks/IPN, payment state machine,
refunds, secrets handling — against `docs/PAYMENT_SECURITY.md` and
`.cursor/rules/07-payment.mdc`.  
**Companion:** Non-payment baseline is `docs/SECURITY_AUDIT_P17.md` (P17-T01).

## Method

- Checklist review of golden rule, state machine, webhooks, idempotency,
  secrets, card data, and refund flow
- Source review of `lib/payments/*`, API routes, checkout place-order,
  refund actions
- `npm run test:payments` (expanded with source guards in this task)

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | Live gateway ops / logging of query-auth APIs |
| Low | 1 | Optional HTTP cases skip if app not running |

**Verdict:** Payment controls from P13-T03–T07 hold. Browser cannot mark
paid. IPN / bKash execute paths require server-side confirmation. Refunds
need customer request + staff `refunds.process`. Suite green.

## Findings

### Pass

- **Golden rule:** `placeCustomerOrder` recalculates line totals, shipping,
  discount, and tax on the server; checkout action does not accept a client
  total
- **PAID transition:** `applyPaymentTransition` requires transaction ref +
  matching amount/currency; rejects refund statuses (refund workflow only)
- **Browser return:** SSLCommerz return route only redirects; storefront
  return page loads owned orders for display and never applies PAID
- **IPN:** SSLCommerz IPN validates signature then validation API before pay
- **bKash:** `status=success` alone does not pay; execute/query required
- **Redirect allow-list:** https only; sslcommerz / bkash hosts
- **Secrets:** `getPaymentGatewayConfig()` throws if called in the browser;
  credentials only from env; not returned to Client Components
- **Idempotency:** `Payment.@@unique([provider, transactionRef])` and
  unique `idempotencyKey`; transition lock uses `FOR UPDATE`
- **Order ownership:** `getCustomerOrderByNumber` scopes by signed-in
  `userId`
- **Refunds:** customer request + same-origin; staff approve/reject/complete
  need `refunds.process` + same-origin; payout refs stored for gateway
  methods
- **Card data:** hosted / tokenized flows only — no card/CVV fields in app
- **Automated suite:** `npm run test:payments` includes invalid signature,
  duplicate webhook, amount/currency mismatch, unauthorized refund, browser
  display-only status, and new source guards

### Medium

1. **Live sandbox/production credentials not configured locally**  
   Hosted checkout stays deferred without env secrets and a public
   `APP_URL` / `PAYMENT_PUBLIC_BASE_URL`. Expected until Phase 18 / ops
   setup. Do not treat “deferred” as “untested forever” — re-run the suite
   with sandbox credentials before go-live.

2. **SSLCommerz validation API uses `store_passwd` in request query**  
   Required by the provider API. Ensure production access logs / reverse
   proxies do not retain full query strings for those outbound calls
   (Phase 18 logging guidance).

### Low

1. **HTTP live checks** in the suite skip when the Next app is not listening.
   Unit/DB cases still run. Prefer running the app during CI smoke when
   payment routes are in scope.

## Fixes shipped in P17-T02

- Extended `scripts/payments/check-security.ts` with source guards:
  - SSLCommerz browser return must not apply payment transitions
  - Storefront return page must not process IPN/bKash pay
  - Payment config must refuse `window`
  - `http://` gateway redirects rejected

## Deferred

| Item | Owner |
| --- | --- |
| Sandbox end-to-end with real credentials | Phase 18 / ops |
| Proxy log redaction for gateway query auth | Phase 18 |
| Nagad / other gateways | not in v1 |

## How to re-run

```bash
npm run test:payments
npm run test:security
```
