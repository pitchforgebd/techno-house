/**
 * Server-only half of the bulk-action helpers (Phase 14 split).
 * `guardBulkOrigin` needs `next/headers` (via `lib/auth/same-origin.ts`) —
 * only import this from server action files (`"use server"`), never from a
 * Client Component. See `bulk-actions.ts` for the client-safe pieces
 * (`runBulkAction`, `summarizeBulkResult`, the `BulkActionResult` type).
 */
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";
import type { BulkActionResult } from "@/lib/admin/bulk-actions";

export async function guardBulkOrigin(): Promise<BulkActionResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}
