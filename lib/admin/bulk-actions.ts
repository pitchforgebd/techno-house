/**
 * Client-safe half of the bulk-action helpers (Phase 14 split). The
 * origin-guard (`guardBulkOrigin`, in `bulk-actions-server.ts`) depends on
 * `next/headers` via `lib/auth/same-origin.ts` — keeping it out of this file
 * is required, not cosmetic: many admin list components (`admin-*-list.tsx`,
 * `admin-*-filters.tsx`) import `summarizeBulkResult` directly, and pulling
 * a `next/headers` import into that chain breaks the production build.
 */

export type BulkActionResult =
  | {
      ok: true;
      succeeded: number;
      failed: number;
      failures: { id: string; reason: string }[];
    }
  | { ok: false; formError: string };

/**
 * Runs a real per-row mutation for every selected id and reports an accurate
 * succeeded/failed count instead of a single all-or-nothing result — each
 * row's existing single-item guard (permission already checked once by the
 * caller; in-use / FK / soft-delete rules live in the per-item function
 * itself) can reject independently without failing the whole batch.
 */
export async function runBulkAction(
  ids: string[],
  run: (id: string) => Promise<{ ok: boolean; formError?: string }>,
): Promise<BulkActionResult> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) {
    return { ok: false, formError: "Select at least one row first." };
  }
  const failures: { id: string; reason: string }[] = [];
  let succeeded = 0;
  for (const id of unique) {
    const result = await run(id);
    if (result.ok) {
      succeeded += 1;
    } else {
      failures.push({ id, reason: result.formError ?? "Failed." });
    }
  }
  return { ok: true, succeeded, failed: failures.length, failures };
}

export function summarizeBulkResult(
  result: BulkActionResult,
  verb: string,
): { message: string; tone: "success" | "error" } {
  if (!result.ok) {
    return { message: result.formError, tone: "error" };
  }
  if (result.failed === 0) {
    return {
      message: `${result.succeeded} ${verb}`,
      tone: "success",
    };
  }
  if (result.succeeded === 0) {
    return {
      message: `None ${verb} — ${result.failed} skipped (${result.failures[0]?.reason ?? "failed"})`,
      tone: "error",
    };
  }
  return {
    message: `${result.succeeded} ${verb}, ${result.failed} skipped (${result.failures[0]?.reason ?? "failed"})`,
    tone: "error",
  };
}
