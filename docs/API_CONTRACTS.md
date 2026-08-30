# Techno House — API Contracts

## Principles

- typed request/response contracts
- server-side validation
- authorization before sensitive operations
- safe errors
- versioning only when needed
- idempotency for retryable financial operations

## Contract categories

### Catalog
- products
- categories
- brands
- search
- filters

### Customer
- authentication
- profile
- addresses
- wishlist
- compare
- orders
- reviews
- tickets

### Admin
- products
- orders
- refunds
- customers
- marketing
- settings
- staff

### Payment
- create/initiate payment
- callback/webhook
- payment status
- refund

## Documentation rule

Document important request/response shapes and state transitions as backend implementation begins.

Do not invent public API contracts prematurely during frontend-only phases.
