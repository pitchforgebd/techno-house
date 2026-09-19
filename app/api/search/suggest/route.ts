import { NextResponse } from "next/server";
import { productRepository } from "@/lib/data";
import { normalizeSearchNeedle } from "@/lib/search/query";

const SUGGESTION_LIMIT = 6;
const MIN_QUERY_LENGTH = 2;

/**
 * Header search-as-you-type dropdown (GET /api/search/suggest?q=...).
 * Public, read-only, no side effects — same data the /search page shows,
 * just a small cheap slice of it for a live preview while typing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = normalizeSearchNeedle(url.searchParams.get("q"));
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { items: [], total: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const result = await productRepository.searchSuggestions(
    q,
    SUGGESTION_LIMIT,
  );
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
