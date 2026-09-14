import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

/**
 * Health check for a process manager, load balancer or uptime monitor.
 *
 *   GET /api/health   ->  200 {"status":"ok","database":"up"}
 *                          503 {"status":"degraded","database":"down"}
 *
 * `docs/DEPLOYMENT.md` has carried an unticked "health check endpoint live"
 * item since the deployment inventory was written; this is it.
 *
 * ## Why it touches the database
 *
 * A health check that only proves Node is listening will keep reporting
 * healthy while every page 500s on a dead connection pool — which is the
 * failure this app is actually likely to have, given it runs a `max: 5` pool
 * against one Postgres instance. `SELECT 1` is the cheapest query that
 * distinguishes "the process is up" from "the process can serve requests".
 *
 * ## What it deliberately does not say
 *
 * No version, no commit, no migration state, no row counts, no environment
 * detail, no error text. This endpoint is unauthenticated by necessity — a
 * load balancer has no session — so everything it returns is public. A health
 * endpoint that reports the schema version is a reconnaissance endpoint.
 *
 * The failure branch returns a fixed string rather than the caught error for
 * the same reason: a connection error message contains the database host, the
 * port, and often the username.
 *
 * `no-store` because a cached health check is not a health check, and this
 * response would otherwise be a candidate for edge caching behind a CDN.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
