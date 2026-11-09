import { loadNavMenuPayload } from "@/lib/catalog/nav-menu";

/**
 * Mega-menu panels + mobile drawer tree, loaded by the menus on first use
 * (SEO phase 4, D6) instead of being embedded in every page. Static and
 * rebuilt at most every 5 minutes — the same freshness the pages themselves
 * have — so it costs one cached response, not a DB query per visitor.
 */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  return Response.json(await loadNavMenuPayload());
}
