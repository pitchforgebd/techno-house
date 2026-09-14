/**
 * Client-safe B2B field limits.
 *
 * Kept out of `registration.ts` on purpose: that module pulls in Prisma and
 * `next/headers`, so a Client Component importing a constant from it would
 * drag server-only code into the browser bundle and fail the build.
 */
export const B2B_COMPANY_MAX = 160;
export const B2B_NID_MAX = 40;
export const B2B_CONTACT_NAME_MAX = 120;
export const B2B_ADDRESS_MAX = 300;
