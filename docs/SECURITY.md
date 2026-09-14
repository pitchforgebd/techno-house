# Techno House — Security

Updated: 2026-09-05  
Task: P17-T01 / P17-T02 (was P0-T06)

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

## Phase 17 audits (P17-T01 / P17-T02)

Non-payment baseline review completed 2026-09-05. Report:
`docs/SECURITY_AUDIT_P17.md`. Automated checks: `npm run test:security`.
Payment-specific audit completed **P17-T02** —
`docs/PAYMENT_SECURITY_AUDIT_P17.md` (`npm run test:payments`). Production
headers / HTTPS remain **Phase 18**.

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
- Admin UI routes can render mock data but staff **login** is real as of P11-T02.
  Panel routes and role-grant saves are permission-checked as of P11-T04.
  Future mutations must call `staffWithPermission`. Category, brand,
  attribute, and product create/edit/delete (P12-T01–T04) already do.

Customer auth (P11-T01) and staff auth (P11-T02) are live: Argon2id password
hashes, opaque session rows, separate cookies (`th_customer_session` vs
`th_staff_session`). Mock localStorage sessions were removed.

Staff sign-in URL is obscured (AD-208): `/admin/access/{ADMIN_LOGIN_SLUG}`
(default local slug `th-ops-local`). Legacy `/admin/login` and wrong slugs
return 404 and must not redirect to the real gate. Change the slug in
production. Obscurity is an extra layer only — rate limits, Argon2id, and
session cookies remain the real controls.

Guest carts (P13-T01) use a third cookie, `th_guest_cart` (path `/`). It is
not an auth session: the raw token is only in the cookie; `Cart.sessionToken`
stores the SHA-256 hash. Cart mutations require same-origin. The client is
never authoritative for prices or payment state.

Order creation (P13-T02) requires a signed-in customer and same-origin.
Totals, stock reservation, and payment status are server-only. Place-order
does not mark an order paid. Customers can only read their own orders by
number.

Payment abstraction (P13-T03) keeps gateway clients behind adapters. Checkout
only starts a pending payment. `PAID` requires a server-side transition with
a transaction reference and matching amount/currency. No Client Component or
server action marks an order paid.

Gateway integration (P13-T04) may redirect to SSLCommerz or bKash after the
order exists. Credentials stay server-side and are optional at boot. Return
URLs and `status=success` query params are not treated as paid. Checkout
only follows `https` URLs on allow-listed gateway hosts.

Webhook verification (P13-T05) marks `PAID` only after a server-to-gateway
check: SSLCommerz validation API, or bKash execute/query. Amount, currency,
order number, and transaction reference must match. Invalid signatures,
unknown orders, and amount mismatches stay unpaid. Duplicate events are
idempotent. The SSLCommerz browser return route still does not pay.

Refund workflow (P13-T06): a signed-in customer may request a refund on a
paid order they own. Amount is capped to the remaining refundable total.
Staff need `refunds.process` plus same-origin to approve, reject, or pay
out. COD completes offline. SSLCommerz / bKash call the gateway and store
`payoutRef`. `applyPaymentTransition` still rejects refund statuses —
only the refund workflow may set `REFUNDED` / `PARTIALLY_REFUNDED`.
Audit events: `refund.request`, `refund.approve`, `refund.reject`,
`refund.complete`.

Payment security tests (P13-T07): `npm run test:payments` covers invalid
signatures, duplicate webhooks, amount/currency mismatches, invalid
transactions, unauthorized refunds, repeated payment requests, payment
failure, and browser-return / IPN paths that must not mark paid.

Session hardening (P11-T03): `lastUsedAt` is touched at most every 10 minutes;
live sessions are capped (5 customer, 3 staff); a blocked/disabled account
revokes every session for that owner; auth server actions require a matching
`Origin` host (defense in depth on top of Next.js Server Action CSRF).

Session JWT envelope (P19-T01): the session cookie holds a signed JWT
(`SESSION_JWT_SECRET`, HS256, via `jose`) wrapping the opaque session token,
not the raw token directly. This is additive to the DB-backed model above,
not a replacement — revocation, permission freshness, and account-status
checks still happen fresh from `StaffSession`/`CustomerSession` on every
request; the JWT carries no permissions or identity claims, only the
wrapped token and an expiry. What it changes: `middleware.ts` (Edge runtime,
no DB access) can now cryptographically verify signature + expiry itself,
rejecting a tampered or expired cookie before the request ever reaches a
page — previously it only checked that the cookie *looked* token-shaped.
Changing `SESSION_JWT_SECRET` invalidates every existing session instantly
(forces re-login everywhere), independent of the DB rows.

RBAC (P11-T04): `getStaffSession()` loads granted permission keys from the
staff member's role. The panel layout refuses paths the role cannot view.
Saving role grants requires `roles.manage`. Category create/edit/delete
require `category.add` / `category.edit` / `category.delete`. Brand
create/edit/delete require `brand.add` / `brand.edit` / `brand.delete`. Attribute
create/edit/delete require `attribute.add` / `attribute.edit` /
`attribute.delete`. Product create/edit/delete and list flag toggles require
`product.add` / `product.edit` / `product.delete`. Inventory quantity and
threshold updates also require `product.edit`. Custom review create requires
`reviews.add`; publish/reject requires `reviews.moderate`; review delete
requires `reviews.delete`. Question answers require `questions.answer`;
question delete requires `questions.delete`. Customer review/question submits
require a signed-in session and same-origin. Nav hiding is not the control.

Audit log (P11-T05): privileged staff actions are appended to `AuditLog` via
`writeAuditLog`. The viewer is `/admin/staff/audit` (`audit.view`). Metadata
never includes passwords, tokens, or secrets; IP is hashed. Failed staff
sign-in records `emailHash` only.

Auth rate limits (P11-T06): customer login/register, staff login, and
forgot-password consume hashed IP/email buckets in `AuthRateLimit` before
password work. The client always sees a generic retry message. Logout and
profile updates are not limited. OTP gateway settings persist (P16-T03),
but send/verify endpoints are not implemented yet, so OTP has no rate-limit
bucket. Forgot-password is rate-limited but still does not send email
(SMTP settings persist in P16-T04; outbound mail remains deferred).

## Requirements (implementation by phase)

- secure password hashing (11)
- secure sessions/cookies (11)
- server-side authorization (11+)
- RBAC (11)
- input validation (ongoing)
- output safety / XSS (ongoing)
- rate limiting on auth, OTP, reset, abuse-prone endpoints (11 — P11-T06 for login/register/forgot-password; OTP when that flow exists)
- CSRF protection where applicable (11 — auth mutations, P11-T03)
- injection prevention (10+)
- safe file uploads (09 UI / 12 backend)
- security headers + HTTPS (18)
- audit logging for admin (11 — P11-T05)
- safe error handling (ongoing)
- secrets management (18)

## Admin

Sensitive operations require explicit server-side permission checks
(`staffWithPermission` / the panel path map).

UI-only permission hiding in the sidebar is a convenience, not a control.

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

`AuditLog` follows the same exclusions. `writeAuditLog` strips sensitive
metadata keys and stores `ipHash` instead of the address.

## Headers (production)

Plan for: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (with HTTPS). Exact values at Phase 18 (P18-T04). Env inventory: `docs/DEPLOYMENT.md` (P18-T01).

## Incident priority

Critical/High security issues take priority over normal feature work.

## Audit

Review security at:

- authentication phase
- payment phase
- production hardening phase — **P17-T01** non-payment baseline and
  **P17-T02** payment audit done; see `docs/SECURITY_AUDIT_P17.md` and
  `docs/PAYMENT_SECURITY_AUDIT_P17.md`
- before launch
