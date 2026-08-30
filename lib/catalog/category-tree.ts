import type { Category } from "@/lib/data/types";

export type CategoryNode = Category & { children: Category[] };

export function toCategoryTree(categories: Category[]): CategoryNode[] {
  const childrenByParent = new Map<string, Category[]>();

  for (const category of categories) {
    if (!category.parentSlug) {
      continue;
    }
    const siblings = childrenByParent.get(category.parentSlug) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parentSlug, siblings);
  }

  return categories
    .filter((category) => category.parentSlug === null)
    .map((category) => ({
      ...category,
      children: childrenByParent.get(category.slug) ?? [],
    }));
}

/** Root slug plus every descendant. Used for mega-menu brand grouping. */
export function categoryAndDescendantSlugs(
  rootSlug: string,
  categories: Category[],
): Set<string> {
  const slugs = new Set<string>([rootSlug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (
        category.parentSlug &&
        slugs.has(category.parentSlug) &&
        !slugs.has(category.slug)
      ) {
        slugs.add(category.slug);
        grew = true;
      }
    }
  }
  return slugs;
}
