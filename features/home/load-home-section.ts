import { productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";
import type { HomeSectionId } from "@/lib/marketing/home-section-input";
import { getHomeSectionSlugs } from "@/lib/marketing/home-sections";

/**
 * Products for one homepage section (AD-357): the staff-chosen list in the
 * order they set, or — when nothing is chosen, or none of the chosen products
 * is published any more — the section's automatic list, so it is never blank.
 * Exactly the chosen products are shown: a short list is not padded with others.
 */
export async function loadHomeSectionProducts(
  section: HomeSectionId,
  automatic: () => Promise<ProductSummary[]>,
): Promise<ProductSummary[]> {
  const slugs = await getHomeSectionSlugs(section);
  if (slugs.length > 0) {
    // Keeps the order of `slugs` and returns published products only.
    const chosen = await productRepository.listBySlugs(slugs);
    if (chosen.length > 0) {
      return chosen;
    }
  }
  return automatic();
}
