# Phase 16

## Objective

Implement shipping, OTP/SMS, SMTP, social integrations, maps/chat/comments, and business configuration.

## Scope

All Phase 16 tasks complete.

## Tasks

- [x] P16-T01 Shipping
- [x] P16-T02 Zones/areas
- [x] P16-T03 OTP/SMS
- [x] P16-T04 SMTP
- [x] P16-T05 Social integrations
- [x] P16-T06 Maps/chat/comments
- [x] P16-T07 Business settings

## Completed Tasks

### P16-T01–T06

See AD-179–AD-184 and earlier phase notes.

### P16-T07 Business settings

- Persist general store identity / contact on `SiteSettings`
- Admin `/admin/settings/general` saves those fields
- Re-seed keeps staff business edits (`update: {}`)
- Currency stays BDT; other business hub cards stay mock
- Writes need same-origin and `business.manage`

## Files Created (phase highlights)

- `lib/business/fields.ts`
- `lib/business/config.ts`
- `features/admin/settings/business-actions.ts`
- Shipping / OTP / SMTP / social / maps / chat / comments libs from T01–T06

## Files Modified (T07)

- `features/admin/settings/admin-business-sub-settings.tsx`
- `app/(admin)/admin/(panel)/settings/general/page.tsx`
- `lib/auth/audit-log.ts`
- `lib/auth/admin-route-permissions.ts`
- `prisma/seed.ts`
- `docs/DATABASE.md`

## Important Decisions

- AD-179–AD-184 — prior Phase 16 tasks
- AD-185 — general business settings on `SiteSettings`; hub extras mock

## Security Considerations

- Same-origin + `business.manage` on writes
- No secrets on business settings form

## Validation Results

- `tsc --noEmit` clean
- eslint clean on touched files
- `npm run db:seed` — `siteSettings 1`
- unsigned `/admin/settings`, `/admin/settings/general` → 307

## Deferred Work

- Order / tax / pickup / invoice / tracking / label / printer persist
- Feature flags / languages persist
- Storefront footer consuming `SiteSettings` contact (phone still unpublished by policy)
- Live OAuth / SMS / SMTP / Maps / chat / comment widgets

## Next Phase Dependency

Stop until Phase 17 (P17-T01 Security audit) is approved.

## Completion Status

COMPLETE
