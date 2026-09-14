# Phase 11

## Objective

Implement separate customer/admin authentication, staff roles, permissions, sessions, rate limits, and audit logging.

## Scope

Customer and staff auth are separate route trees and must not share a single
session cookie meaning.

## Tasks

- [x] P11-T01 Customer auth
- [x] P11-T02 Admin/staff auth
- [x] P11-T03 Sessions
- [x] P11-T04 Roles/permissions
- [x] P11-T05 Audit logs
- [x] P11-T06 Rate limits

## Completed Tasks

### P11-T01 Customer auth

- `CustomerSession` model + migration
- Argon2id password hashing (`@node-rs/argon2`)
- Register / login / logout / profile update against PostgreSQL
- httpOnly `th_customer_session` cookie; middleware gate on `/account/*`
- Removed localStorage mock customer session
- Demo customer seeded for local testing

### P11-T02 Admin/staff auth

- `StaffSession` model + migration
- Staff login / logout against `Staff` (no self-serve registration)
- httpOnly `th_staff_session` cookie, path `/admin`
- Middleware gate on `/admin/*` except login
- Removed localStorage mock staff session
- Demo staff seeded (`ops@techno-house.demo`, Admin role)

### P11-T03 Sessions

- Shared cookie flags, token-shape check, request metadata, same-origin guard
- `lastUsedAt` on customer and staff sessions (touch every 10 minutes)
- Live session caps: 5 customer, 3 staff (oldest extra deleted on login)
- Revoke-all when the owner is not `ACTIVE`
- Auth server actions require a matching `Origin` host

### P11-T04 Roles/permissions

- Staff session includes granted permission keys from the role
- Panel layout denies paths the role cannot view (longest-prefix map)
- Sidebar filtered by the same map (convenience only)
- Role list + permission matrix persist to PostgreSQL; save requires `roles.manage`
- `staffWithPermission` for mutations; staff directory remains mock

### P11-T05 Audit logs

- Append-only `writeAuditLog` (hashed IP, stripped secrets)
- Staff login / failed / blocked / logout
- Role create/update with grant add/remove keys
- Viewer at `/admin/staff/audit` (`audit.view`)

### P11-T06 Rate limits

- `AuthRateLimit` table (hashed IP/email bucket keys)
- Customer login, register, staff login, forgot-password
- Generic blocked message; no limit on logout or profile update
- Forgot-password became a same-origin server action (still no SMTP)

## Files Created

- `lib/auth/password.ts`
- `lib/auth/session-token.ts`
- `lib/auth/session-token-format.ts`
- `lib/auth/session-cookie.ts`
- `lib/auth/session-policy.ts`
- `lib/auth/request-meta.ts`
- `lib/auth/same-origin.ts`
- `lib/auth/customer-session-constants.ts`
- `lib/auth/customer-session-cookie.ts`
- `lib/auth/customer-session.ts`
- `lib/auth/customer-auth.ts`
- `lib/auth/staff-session-constants.ts`
- `lib/auth/staff-session-cookie.ts`
- `lib/auth/staff-session.ts`
- `lib/auth/staff-auth.ts`
- `lib/account/validation.ts`
- `features/account/auth-actions.ts`
- `features/account/customer-session-provider.tsx`
- `features/admin/auth-actions.ts`
- `features/admin/staff-session-provider.tsx`
- `middleware.ts`
- `prisma/migrations/20260904231647_customer_sessions/`
- `prisma/migrations/20260904234051_staff_sessions/`
- `prisma/migrations/20260904235500_session_hardening/`
- `lib/auth/permission-check.ts`
- `lib/auth/permissions.ts`
- `lib/auth/admin-path-header.ts`
- `lib/auth/admin-route-permissions.ts`
- `lib/auth/staff-roles.ts`
- `features/admin/staff/role-actions.ts`
- `features/admin/admin-forbidden-view.tsx`
- `app/(admin)/admin/(panel)/forbidden/page.tsx`
- `lib/auth/audit-log.ts`
- `features/admin/staff/admin-audit-log-view.tsx`
- `app/(admin)/admin/(panel)/staff/audit/page.tsx`
- `prisma/migrations/20260905001500_audit_view_permission/`
- `lib/auth/rate-limit.ts`
- `prisma/migrations/20260905003000_auth_rate_limit/`

## Files Modified

- Account and admin login/shell/layout
- `features/account/auth-actions.ts`, `features/account/forgot-password-form.tsx`
- `lib/auth/customer-auth.ts`, `lib/auth/staff-auth.ts`
- `prisma/schema.prisma`, `prisma/seed.ts`
- `docs/DATABASE.md`, `docs/SECURITY.md`

## Important Decisions

- Opaque DB-backed sessions (token in cookie, SHA-256 in DB) rather than JWTs
- Separate cookie names and tables for customer vs staff
- Staff cookie path is `/admin` so it is not sent on the storefront
- Staff sessions expire in 12 hours (customers 30 days)
- Password reset email deferred until SMTP (Phase 16)
- Live session caps rather than a session-list UI (P11-T03)
- RBAC enforcement: path map + `staffWithPermission`; nav hide is not the control
- Unmapped admin paths are denied
- Role grant seed does not overwrite local edits (Admin only gains new catalogue keys)
- Audit writes must not fail the originating action
- Failed staff login stores email hash, not the email
- PostgreSQL rate-limit counters instead of Redis (P11-T06)
- Concurrent extra attempts may slip through; acceptable for these windows

## Security Considerations

- No plaintext passwords; Argon2id only
- Generic login failure message; dummy hash on unknown email
- IP stored hashed when present; never log passwords or session tokens
- Middleware checks cookie presence and token shape — full validation in get*Session()
- A customer cookie cannot open `/admin`
- Disabled accounts lose every session, not only the current cookie
- Malformed session cookies never hit the database
- Panel routes require a matching view permission; role saves require `roles.manage`
- Audit log never stores passwords, tokens, or raw IP
- Auth attempt counters store hashed IP/email only
- Rate-limit failures use one generic message

## Performance Considerations

- `getCustomerSession` / `getStaffSession` are React `cache()`'d per request
- `lastUsedAt` writes are throttled to once per 10 minutes per session
- Rate-limit prune is best-effort and must not fail the auth action

## Validation Results

- `tsc --noEmit` clean; eslint clean on touched files; `db:drift` matches
- Token format, origin host matching, and customer session cap verified
- `/account/login` and `/admin/login` 200; `/account` and `/admin` 307 when unsigned
- Malformed `th_staff_session` cookie redirects from `/admin`
- Support-role path map: dashboard/orders allowed, staff/settings denied; unmapped deny
- Audit write strips `password` from metadata; unsigned `/admin/staff/audit` redirects
- Consume-until-blocked: 5th email login allowed, 6th generic block; buckets cleaned up
- `/account/forgot-password`, `/account/login`, `/account/register`, `/admin/login` 200

## Known Issues

- Forgot-password does not send email yet
- Staff directory create/edit is still mock (not permission-persisted)
- Catalog and other admin forms still mock-save; they must call `staffWithPermission` when they become real

## Deferred Work

- Staff member CRUD against PostgreSQL
- Audit coverage for catalog/order mutations when those saves become real
- OTP / reset-email rate limits when those flows exist (Phase 16)

## Next Phase Dependency

Phase 12 — Catalog Backend (requires explicit approval)

## Completion Status

COMPLETE
