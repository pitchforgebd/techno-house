# Security audit — Phase 17 (P17-T01)

**Date:** 2026-09-05  
**Scope:** Non-payment application security against `docs/SECURITY.md`.  
**Out of scope here:** Payment gateway / webhook / refund cases → **P17-T02**.  
**Production headers / HTTPS / secrets ops:** planned for **Phase 18**.

## Method

- Checklist review of auth, sessions, CSRF/same-origin, RBAC, XSS, secrets,
  rate limits, redirects, logging, and middleware gates
- Source search for `dangerouslySetInnerHTML`, hardcoded secrets, and
  server actions missing same-origin / staff permission guards
- `npm audit --omit=dev`
- Automated baseline: `npm run test:security`

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | No launch-blocking auth/XSS/secret issues found |
| High | 0 | — |
| Medium | 3 | Expected Phase 18 gaps + demo seed passwords |
| Low | 2 | Read-only catalog actions; admin redirect hardening done |

**Verdict:** Baseline controls from Phases 11–16 hold. No critical fixes
required for P17-T01 beyond redirect helper consolidation and a
regression suite. Payment depth stays in P17-T02.

## Findings

### Pass

- Customer and staff sessions: Argon2id passwords, opaque tokens, separate
  cookies (`th_customer_session` / `th_staff_session`), httpOnly +
  `sameSite: lax`, `secure` in production
- Middleware cookie-shape gates on `/account/*` and `/admin/*` (full
  validation still in `getCustomerSession` / `getStaffSession`)
- Auth and privileged mutations use same-origin checks
- Admin mutations use `staffWithPermission` (login actions correctly exempt)
- Open-redirect defenses on customer and admin `next` params
- Auth rate limits (`AuthRateLimit`) for login / register / forgot-password
- Audit log strips password/token/secret metadata keys; IP hashed
- No `dangerouslySetInnerHTML` in app / components / features / lib sources
- `.env` / `.env.local` gitignored; only `.env.example` committed (no secrets)
- `poweredByHeader: false` in Next config
- `npm audit --omit=dev` → 0 vulnerabilities (this machine)

### Medium

1. **Security response headers not set yet**  
   CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
   `Permissions-Policy` are documented for Phase 18. Acceptable until
   HTTPS / reverse-proxy work lands.

2. **Demo seed credentials**  
   `prisma/seed.ts` creates local-only demo customer/staff passwords.
   Must never be used as production accounts (Phase 18 deploy checklist).

3. **Forgot-password / OTP / outbound mail still deferred**  
   Rate-limited where endpoints exist; email/SMS delivery not live.
   No extra exposure today; remain aware before enabling send paths.

### Low

1. **Read-only catalog server actions** (`features/cart/actions.ts`,
   `lists/actions.ts`, `pc-builder/actions.ts`, `account/actions.ts`)
   load public product data without same-origin. Public catalogue data;
   not a privilege boundary. Optional hardening later.

2. **Admin post-login `next` helper** previously lived only in the login
   form and did not reject embedded `://`. Consolidated into
   `lib/auth/return-path.ts` (`safeAdminReturnPath`) as part of this task.

## Fixes shipped in P17-T01

- Shared `safeReturnPath` / `safeAdminReturnPath` in `lib/auth/return-path.ts`
- Admin login form uses the shared helper
- `scripts/security/check-baseline.ts` + `npm run test:security`

## Deferred

| Item | Owner |
| --- | --- |
| Payment security deep audit | P17-T02 |
| Security headers + HTTPS | Phase 18 |
| Production secrets / seed policy | Phase 18 |
| OTP rate-limit buckets when send/verify exists | when OTP ships |
| CSP tuning against admin/analytics scripts | Phase 18 |

## How to re-run

```bash
npm run test:security
npm run test:payments
npm audit --omit=dev
```
