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

/**
 * Walks parentSlug up to the top of the tree. Categories can nest more than
 * one level deep (e.g. Components under PC and Server, with CPU/RAM/etc
 * under Components) — anything that only checks `!parentSlug` treats a
 * mid-tree node as a leaf and a leaf's true root gets missed.
 */
export function categoryRootSlug(
  slug: string,
  categories: Category[],
): string {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  let current = bySlug.get(slug);
  const seen = new Set<string>();
  while (current?.parentSlug && !seen.has(current.slug)) {
    seen.add(current.slug);
    current = bySlug.get(current.parentSlug);
  }
  return current?.slug ?? slug;
}

/**
 * Every descendant of `rootSlug` at any depth, in pre-order (parents before
 * their own children), each tagged with how many levels below the root it
 * sits. Lets a flat <select> represent an arbitrarily deep category tree —
 * filtering by `parentSlug === rootSlug` alone only reaches direct children.
 */
export function categoryDescendantsWithDepth(
  rootSlug: string,
  categories: Category[],
): (Category & { depth: number })[] {
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentSlug) {
      continue;
    }
    const siblings = childrenByParent.get(category.parentSlug) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parentSlug, siblings);
  }

  const result: (Category & { depth: number })[] = [];
  const walk = (parentSlug: string, depth: number) => {
    for (const child of childrenByParent.get(parentSlug) ?? []) {
      result.push({ ...child, depth });
      walk(child.slug, depth + 1);
    }
  };
  walk(rootSlug, 0);
  return result;
}

/**
 * A category's ancestor chain, root-first (immediate parent last). Used to
 * build breadcrumb trails that reflect the real nesting depth instead of
 * assuming a fixed number of levels.
 */
export function categoryAncestors(
  category: Category,
  categories: Category[],
): Category[] {
  const bySlug = new Map(categories.map((item) => [item.slug, item]));
  const chain: Category[] = [];
  let parentSlug = category.parentSlug;
  const seen = new Set<string>();
  while (parentSlug && !seen.has(parentSlug)) {
    seen.add(parentSlug);
    const parent = bySlug.get(parentSlug);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    parentSlug = parent.parentSlug;
  }
  return chain;
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
