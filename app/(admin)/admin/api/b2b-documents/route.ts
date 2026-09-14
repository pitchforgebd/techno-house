import { NextResponse } from "next/server";
import { getB2BDocumentKey } from "@/lib/admin/b2b-accounts";
import { readB2BDocument } from "@/lib/b2b/document-storage";
import { hasPermission } from "@/lib/auth/permissions";
import { getStaffSession } from "@/lib/auth/staff-session";

/**
 * Must live under `/admin/...` so the staff session cookie (`Path=/admin`)
 * is sent by the browser. Streams a B2B KYC document (trade licence / NID)
 * only to staff with `customer.b2b.view` — these are private documents,
 * never served from `public/`.
 */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session || !hasPermission(session, "customer.b2b.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId")?.trim() ?? "";
  const which = url.searchParams.get("which");
  if (!accountId || (which !== "licence" && which !== "nid")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const storageKey = await getB2BDocumentKey(accountId, which);
  if (!storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await readB2BDocument(storageKey);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
