/**
 * "Similar products" rail on the single product page.
 *
 * The candidates are always the product's own category (the page asks the
 * repository for that), so a RAM page lists RAM, a processor page lists
 * processors. This ranks them so the closest ones come first — the same
 * 4 "featured" items on every RAM page made the rail feel unrelated to the
 * product being viewed. Pure and deterministic: no randomness, so the page
 * stays cacheable and the rail does not reshuffle on refresh.
 */
import type { ProductSummary } from "@/lib/data";

/** Words that appear in many names and say nothing about what the product is. */
const STOP_WORDS = new Set([
  "the", "with", "and", "for", "new", "pc", "gb", "series", "edition",
]);

/** Lower-case alphanumeric tokens: "DDR5", "16GB", "6000MHz", "A520M". */
function nameTokens(name: string, brandName: string): Set<string> {
  // The brand is scored on its own, so its words are not counted twice.
  const brandWords = new Set(brandName.toLowerCase().split(/[^a-z0-9]+/));
  return new Set(
    name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token) && !brandWords.has(token)),
  );
}

function isAvailable(product: ProductSummary): boolean {
  return (
    !product.isComingSoon &&
    (product.stockStatus !== "out_of_stock" || product.isPreOrder)
  );
}

/**
 * Closest first: the exact same category, shared name words (DDR generation, capacity, speed, socket…)
 * count most, then the same brand, then being orderable. Equal scores fall
 * back to the nearer price, then to the incoming (featured) order.
 */
export function rankSimilarProducts(
  current: ProductSummary,
  candidates: ProductSummary[],
  limit: number,
): ProductSummary[] {
  const ownTokens = nameTokens(current.name, current.brandName);
  const ownPrice = current.price.amount;

  return candidates
    .filter((item) => item.slug !== current.slug)
    .map((item, index) => {
      let shared = 0;
      for (const token of nameTokens(item.name, item.brandName)) {
        if (ownTokens.has(token)) {
          shared += 1;
        }
      }
      // A product filed straight under a parent category is offered its
      // sub-categories' items too; the exact category still comes first.
      const score =
        (item.categorySlug === current.categorySlug ? 6 : 0) +
        shared * 3 +
        (item.brandSlug === current.brandSlug ? 2 : 0) +
        (isAvailable(item) ? 2 : 0);
      return {
        item,
        index,
        score,
        priceGap: Math.abs(item.price.amount - ownPrice),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.priceGap - b.priceGap || a.index - b.index,
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}
