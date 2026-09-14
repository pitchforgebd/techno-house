# Techno House — Payment Security

## Scope

Applies to all payment gateways, checkout payment flows, payment callbacks/webhooks, transaction records, and refunds.

Implementation (P13-T05): `lib/payments` starts hosted SSLCommerz / bKash /
Nagad sessions after the order exists when credentials are present. Browser
return URLs and unsigned query params must not mark a payment paid.
SSLCommerz IPN is confirmed with the validation API. bKash `status=success`
is confirmed with execute/query. Nagad's callback is confirmed with the
gateway's verify endpoint (AD-241) — its RSA request/response shapes are
best-effort from public docs and untested against a live Nagad sandbox;
confirm against Nagad's current integration guide before relying on it in
production. Refunds (P13-T06) require a customer request, staff approval,
and a verified payout — Nagad has no automated refund call wired, so those
fall through to "cannot be refunded here" until Nagad's refund API is
confirmed. The browser cannot complete a refund.

Verified against the official docs (AD-242, developer.bka.sh /
developer.sslcommerz.com): SSLCommerz's session-create and IPN-validate
calls matched exactly; its refund call used the wrong field name
(`refe_id`, fixed to `refund_trans_id`). bKash's Create Payment and
Execute Payment endpoints were wrong (Create was hitting the
agreement/mode-0001 path instead of the one-time mode-0011 path at
`/tokenized/checkout/payment/create`; Execute needs `paymentID` as a URL
path segment at `/tokenized/checkout/execute/{paymentID}`, not a JSON
body field) — checkout likely failed against a real bKash account before
this fix. bKash's refund call was on the wrong path/version entirely and
read response fields with the wrong casing (`refundTrxID` vs the real
`refundTrxId`), so refunds silently never matched a ref even had the
call succeeded — fixed to `bkashRefundUrl()` (a "v2" path) with
`paymentId`/`trxId`/`refundAmount`/`refundTrxId`. bKash's query-payment
fallback (only used when Execute doesn't immediately report
"Completed") is filed under a different, non-"tokenized" product family
in bKash's own docs — best-effort, not fully confirmed; verify against
sandbox if that fallback path ever actually fires.

Payment security checks (P13-T07 / P17-T02): `npm run test:payments`
(`scripts/payments/check-security.ts`). Phase 17 audit report:
`docs/PAYMENT_SECURITY_AUDIT_P17.md`.

## Golden rule

The client is never authoritative for financial state.

The server must calculate:
- product price
- quantity
- discount
- shipping
- tax if applicable
- final total
- currency

## Payment state

Use a controlled state machine such as:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Exact states may be refined during implementation.

## Webhooks

For each gateway:
- verify signature where supported
- validate event type
- validate order/transaction mapping
- validate amount
- validate currency
- validate expected state
- use idempotency
- prevent duplicate processing

## Idempotency

A repeated callback/request must not:
- create duplicate orders
- create duplicate payments
- deduct stock twice
- issue duplicate refunds

Use unique transaction/reference constraints.

## Secrets

Keep private credentials server-side.

Never commit them to Git.

Use environment variables or an appropriate secret manager.

## Card data

Prefer provider-hosted or tokenized payment flows. Avoid handling raw card data in the application unless explicitly required and appropriately reviewed.

## Refunds

```text
Customer request
→ eligibility validation
→ authorized approval
→ gateway operation
→ verified result
→ database update
→ audit log
```

Frontend must never directly issue refunds.

## Required tests

Covered by `npm run test:payments`:

- invalid signature
- duplicate webhook
- amount mismatch
- currency mismatch
- invalid transaction
- unauthorized refund
- repeated payment request
- payment failure
- gateway timeout/retry (missing credentials / invalid validation stay unpaid;
  HTTP cases skip if the app is down)
