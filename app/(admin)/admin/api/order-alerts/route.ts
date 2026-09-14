import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/auth/staff-session";
import { isSameOriginRequest } from "@/lib/auth/same-origin";
import {
  listStaffOrderAlerts,
  markStaffOrderAlertsRead,
} from "@/lib/orders/staff-order-alerts";

/**
 * Must live under `/admin/...` so the staff session cookie
 * (`Path=/admin`) is sent by the browser. `/api/admin/...` never receives it.
 *
 * Returns all staff IN_APP activity alerts (orders, tickets, reviews, etc.).
 */
export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await listStaffOrderAlerts(session.staffId);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Every Server Action in this app checks the origin; this route handler did
  // not, which made it the one staff mutation reachable cross-site (DSA-08).
  // A cross-site form POST cannot send `application/json`, so `request.json()`
  // threw, `ids` fell through to `undefined`, and the handler marked ALL of the
  // admin's alerts read.
  if (!(await isSameOriginRequest())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reject anything that is not a JSON body rather than treating a parse
  // failure as "no ids", which is what turned a malformed request into
  // "mark everything read".
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Expected application/json" },
      { status: 415 },
    );
  }

  let ids: string[] | undefined;
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (Array.isArray(body.ids)) {
      ids = body.ids.filter((id): id is string => typeof id === "string");
    }
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }
  await markStaffOrderAlertsRead({ staffId: session.staffId, ids });
  const data = await listStaffOrderAlerts(session.staffId);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
