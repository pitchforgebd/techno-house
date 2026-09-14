import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/db/prisma";
import { sweepStaleOrders } from "@/lib/orders/stale-orders";

/**
 * Scheduler entry point for the abandoned-checkout sweep.
 *
 *   curl -X POST -H "Authorization: Bearer $STALE_SWEEP_TOKEN" \
 *        https://…/api/internal/sweep-stale-orders
 *
 * This exists because the project has no cron infrastructure and the sweep has
 * to run *somehow* — an inventory repair that only runs when a developer
 * remembers to type a command is not a repair. Any external scheduler that can
 * make an HTTP request will do: Vercel Cron, a host cron with curl, an uptime
 * pinger.
 *
 * ## Why this is safe to expose
 *
 * **It is off unless a token is configured.** With `STALE_SWEEP_TOKEN` unset
 * the route answers 404 — not 401 — so a deployment that has not opted in does
 * not even advertise that the endpoint exists. Opting in is a deliberate act.
 *
 * **The token is compared in constant time**, and only after a length check,
 * because `===` on secrets leaks their prefix through timing. `timingSafeEqual`
 * throws on a length mismatch, which is itself a comparison that has to happen
 * first — so the length is checked explicitly rather than caught.
 *
 * **The token is the whole of the authorization.** There is no staff session
 * here and there should not be: a scheduler has no session. That is exactly why
 * the endpoint does only one thing, takes no parameters that change what it
 * touches, and cannot be pointed at a particular order. The worst a leaked
 * token buys is running a sweep that was going to run anyway.
 *
 * POST only. A sweep changes data, and a GET-able mutation gets fired by link
 * prefetchers, security scanners and browser address bars.
 */
export async function POST(request: Request) {
  const expected = process.env.STALE_SWEEP_TOKEN?.trim();
  if (!expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  const presented = header.startsWith(prefix) ? header.slice(prefix.length) : "";

  const a = Buffer.from(presented, "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const prisma = getPrisma();
  try {
    const result = await sweepStaleOrders(prisma);
    // The released order numbers are deliberately not echoed: a scheduler logs
    // its response bodies somewhere, and that somewhere is rarely as protected
    // as the database. Counts are enough to alert on; the audit log has the
    // detail, attributed and queryable.
    return NextResponse.json(
      {
        ok: true,
        found: result.found,
        released: result.released,
        skipped: result.skipped,
        unitsReturned: result.unitsReturned,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
