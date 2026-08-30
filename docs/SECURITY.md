# Techno House — Security

Updated: 2026-08-29  
Task: P0-T06

## Security objectives

Protect:

- customer accounts
- admin/staff accounts
- personal data
- orders
- inventory
- payment records
- gateway credentials
- site configuration

## Baseline (applies from Phase 01 onward)

- No hardcoded secrets
- No committed `.env` files with credentials (only `.env.example` without secrets)
- No client-side authorization as the real control
- No client-side prices as source of truth for charges
- No sensitive stack traces in production UI
- No production auth shortcuts (shared passwords, disabled checks, hardcoded admin)
- No payment secrets in the browser
- Server-side validation and authorization when any mutation exists

Frontend phases still:

- Do not fake a “secure” login that will be copy-pasted to production
- Mock sessions must be obviously mock (e.g. in-memory flag), not a permanent bypass
- Admin UI routes can render mock data but must not be documented as protected until Phase 11

## Requirements (implementation by phase)

- secure password hashing (11)
- secure sessions/cookies (11)
- server-side authorization (11+)
- RBAC (11)
- input validation (ongoing)
- output safety / XSS (ongoing)
- rate limiting on auth, OTP, reset, abuse-prone endpoints (11)
- CSRF protection where applicable (11)
- injection prevention (10+)
- safe file uploads (09 UI / 12 backend)
- security headers + HTTPS (18)
- audit logging for admin (11)
- safe error handling (ongoing)
- secrets management (18)

## Admin

Sensitive operations require explicit server-side permission checks.

UI-only permission hiding in Phase 09 is a convenience, not a control.

Customer and staff auth are separate route trees and must not share a single “isLoggedIn” cookie meaning.

## Payments (critical — Phase 13)

See `docs/PAYMENT_SECURITY.md` and `.cursor/rules/07-payment.mdc`.

Golden rule: the client is never authoritative for financial state.

## Logging

Do not log:

- passwords
- authentication tokens
- gateway secrets
- card numbers
- CVV
- OTP codes
- unnecessary personal information

## Headers (production)

Plan for: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (with HTTPS). Exact values at Phase 18.

## Incident priority

Critical/High security issues take priority over normal feature work.

## Audit

Review security at:

- authentication phase
- payment phase
- production hardening phase
- before launch
