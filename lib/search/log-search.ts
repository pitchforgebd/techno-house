/**
 * Real storefront search logging (AD-270), feeding Admin → Reports → User
 * Searches. query is stored lowercased/trimmed so counting by exact text is
 * correct without extra normalization at read time.
 */
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

const QUERY_MAX = 120;

export async function recordSearchQuery(input: {
  query: string;
  resultCount: number;
}): Promise<void> {
  const query = input.query.trim().toLowerCase().slice(0, QUERY_MAX);
  if (!query || !usesDatabase()) {
    return;
  }
  try {
    await getPrisma().searchLog.create({
      data: { query, resultCount: Math.max(0, input.resultCount) },
    });
  } catch {
    // A logging failure must never break real search results.
  }
}
