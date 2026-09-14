# Final regression — Phase 17 (P17-T07)

**Date:** 2026-09-05  
**Scope:** Re-run all Phase 17 hardening baselines plus typecheck, lint,
Prisma validate, and production `next build`. Fix any launch-blocking
regressions found.  
**Out of scope:** Live sandbox payment E2E, production deploy smoke →
**Phase 18**.

## Method

- Orchestrator: `npm run test:regression` (security, payments, queries,
  bundle, a11y, seo, pc-builder)
- `npm run typecheck`, `npm run lint`, `npx prisma validate`
- `npm run build`

## Summary

| Check | Result |
| --- | --- |
| `test:regression` (7 suites) | ok |
| `typecheck` | ok |
| `lint` | ok (0 errors; unused-import warnings fixed) |
| `prisma validate` | ok |
| `next build` | ok after deals fix |

**Verdict:** Phase 17 hardening baselines are green. Production build
succeeds. One build-blocking Client/Server Actions wiring bug on
`/admin/deals` was fixed in this task.

## Findings / fixes

### High (fixed)

1. **`/admin/deals` prerender failed**  
   Page passed inline closures wrapping a server action into a Client
   Component (`persist.assign/remove/setFlag`). Next.js rejects that
   during static generation. Fixed by exporting bound server actions
   (`assignTodaysDealProductsAction`, `removeTodaysDealProductAction`,
   `setTodaysDealProductFlagAction`) and passing those references.

### Low (fixed)

1. **Unused imports** in `admin-emi-settings`, `admin-feature-flags`,
   `admin-languages-settings` (eslint warnings).

### Noted (not blocking)

- Next.js 16 warns that the `middleware` file convention is deprecated
  in favor of `proxy` — migrate in Phase 18 if required by the target
  Next version.
- Live payment sandbox and production URL smoke remain Phase 18.

## How to re-run

```bash
npm run test:regression
npm run typecheck
npm run lint
npx prisma validate
npm run build
```
