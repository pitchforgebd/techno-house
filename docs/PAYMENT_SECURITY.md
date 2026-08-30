# Techno House — Payment Security

## Scope

Applies to all payment gateways, checkout payment flows, payment callbacks/webhooks, transaction records, and refunds.

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

- invalid signature
- duplicate webhook
- amount mismatch
- currency mismatch
- invalid transaction
- unauthorized refund
- repeated payment request
- payment failure
- gateway timeout/retry
