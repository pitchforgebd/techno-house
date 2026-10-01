import { categoryAndDescendantSlugs } from "@/lib/catalog/category-tree";
import type { CategoryNode } from "@/lib/catalog/category-tree";
import { BRAND_FACET_KEY } from "@/lib/catalog/listing-params";
import type { Category } from "@/lib/data/types";

export type MegaMenuLink = {
  href: string;
  label: string;
  children?: MegaMenuLink[];
};

export type MegaMenuColumn = {
  title: string;
  links: MegaMenuLink[];
};

export type MegaMenuPanel = {
  slug: string;
  name: string;
  href: string;
  columns: MegaMenuColumn[];
};

export type MegaBrand = {
  slug: string;
  name: string;
};

/** Grouped links under the Component department — original Techno House grouping. */
const COMPONENT_COLUMNS: ReadonlyArray<{
  title: string;
  slugs: readonly string[];
}> = [
  {
    title: "Compute",
    slugs: ["processor", "cpu-cooler", "motherboard", "ram-desktop", "ram-laptop"],
  },
  {
    title: "Graphics & storage",
    slugs: [
      "graphics-card",
      "ssd",
      "portable-ssd",
      "hard-disk-drive",
      "portable-hard-disk-drive",
    ],
  },
  {
    title: "Chassis & power",
    slugs: ["power-supply", "casing", "casing-cooler"],
  },
];

const BRAND_COLUMN_SLUGS = new Set(["laptop", "desktop", "monitor"]);

export function collectBrandsByCategorySlug(
  products: Array<{
    categorySlug: string;
    brandSlug: string;
    brandName: string;
  }>,
  categories: Category[],
  brands: MegaBrand[] = [],
): Record<string, MegaBrand[]> {
  const result: Record<string, MegaBrand[]> = {};
  const brandNameBySlug = new Map(brands.map((brand) => [brand.slug, brand.name]));

  for (const category of categories) {
    const tree = categoryAndDescendantSlugs(category.slug, categories);
    const seen = new Map<string, string>();
    for (const product of products) {
      if (tree.has(product.categorySlug) && !seen.has(product.brandSlug)) {
        seen.set(product.brandSlug, product.brandName);
      }
    }
    // Admin-curated brands for this exact category, shown even with no
    // matching product yet (see Category.extraBrandSlugs) — deliberately
    // not inherited by descendants, since the admin picked them for this
    // specific category, not its whole subtree.
    for (const slug of category.extraBrandSlugs) {
      if (!seen.has(slug)) {
        const name = brandNameBySlug.get(slug);
        if (name) {
          seen.set(slug, name);
        }
      }
    }
    result[category.slug] = [...seen.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  return result;
}

function brandHref(categorySlug: string, brandSlug: string): string {
  return `/category/${categorySlug}?${BRAND_FACET_KEY}=${encodeURIComponent(brandSlug)}`;
}

function brandFlyout(
  categorySlug: string,
  brands: MegaBrand[],
): MegaMenuLink[] | undefined {
  if (brands.length === 0) {
    return undefined;
  }
  return [
    { href: `/category/${categorySlug}`, label: "All brands" },
    ...brands.map((brand) => ({
      href: brandHref(categorySlug, brand.slug),
      label: brand.name,
    })),
  ];
}

/** Direct children only, keyed by parent slug — built once per request. */
function buildChildrenBySlug(categories: Category[]): Map<string, Category[]> {
  const map = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parentSlug) {
      continue;
    }
    const siblings = map.get(category.parentSlug) ?? [];
    siblings.push(category);
    map.set(category.parentSlug, siblings);
  }
  return map;
}

function childLink(
  child: { slug: string; name: string },
  brandsByCategory: Record<string, MegaBrand[]>,
  childrenBySlug: Map<string, Category[]>,
): MegaMenuLink {
  // A category with its own real sub-categories (e.g. Star PC > Intel PC /
  // Ryzen PC, or SSD > NVMe SSD) shows those links first — that's the real
  // taxonomy. Brand links (from real products anywhere in this category's
  // tree, or admin-curated via Category.extraBrandSlugs) are appended below
  // them rather than replaced: a grandchild subcategory and "shop by brand"
  // both being useful is the common case (e.g. SSD has only one real
  // subcategory today, but a dozen real SSD brands).
  const grandchildren = childrenBySlug.get(child.slug) ?? [];
  const grandchildLinks = grandchildren.map((grandchild) => ({
    href: `/category/${grandchild.slug}`,
    label: grandchild.name,
  }));
  const brandLinks = brandFlyout(child.slug, brandsByCategory[child.slug] ?? []);
  const children = [...grandchildLinks, ...(brandLinks ?? [])];
  return {
    href: `/category/${child.slug}`,
    label: child.name,
    children,
  };
}

/**
 * Deep departments (Office Equipment has 29 direct children, Accessories 28,
 * Networking 22, …) would otherwise render one endless single-item-wide
 * column — legible on Star Tech's site only because it wraps the same list
 * across two bare `<ul>`s. This does the equivalent: split a long column
 * into up to `MAX_SPLIT_COLUMNS` balanced ones, titling only the first so
 * the rest read as a continuation rather than a new group. Capped so a
 * split column plus an optional trailing brand column never exceeds the
 * 4-column grid the panel renders.
 */
const MAX_COLUMN_LINKS = 9;
const MAX_SPLIT_COLUMNS = 3;

function splitColumn(title: string, links: MegaMenuLink[]): MegaMenuColumn[] {
  if (links.length <= MAX_COLUMN_LINKS) {
    return [{ title, links }];
  }
  const columnCount = Math.min(
    MAX_SPLIT_COLUMNS,
    Math.ceil(links.length / MAX_COLUMN_LINKS),
  );
  const perColumn = Math.ceil(links.length / columnCount);
  const columns: MegaMenuColumn[] = [];
  for (let i = 0; i < links.length; i += perColumn) {
    columns.push({
      title: i === 0 ? title : "",
      links: links.slice(i, i + perColumn),
    });
  }
  return columns;
}

function brandColumn(
  categorySlug: string,
  title: string,
  brands: MegaBrand[],
): MegaMenuColumn | null {
  if (brands.length === 0) {
    return null;
  }
  return {
    title,
    links: [
      { href: `/category/${categorySlug}`, label: "All brands" },
      ...brands.map((brand) => ({
        href: brandHref(categorySlug, brand.slug),
        label: brand.name,
      })),
    ],
  };
}

function groupedComponentColumns(
  componentChildren: Category[],
  brandsByCategory: Record<string, MegaBrand[]>,
  childrenBySlug: Map<string, Category[]>,
): MegaMenuColumn[] {
  const bySlug = new Map(componentChildren.map((child) => [child.slug, child]));
  const used = new Set<string>();
  const columns: MegaMenuColumn[] = [];

  for (const group of COMPONENT_COLUMNS) {
    const links: MegaMenuLink[] = [];
    for (const slug of group.slugs) {
      const child = bySlug.get(slug);
      if (!child) {
        continue;
      }
      used.add(slug);
      links.push(childLink(child, brandsByCategory, childrenBySlug));
    }
    if (links.length > 0) {
      columns.push({ title: group.title, links });
    }
  }

  const leftover = componentChildren.filter((child) => !used.has(child.slug));
  if (leftover.length > 0) {
    columns.push({
      title: "More",
      links: leftover.map((child) =>
        childLink(child, brandsByCategory, childrenBySlug),
      ),
    });
  }

  return columns;
}

function columnsForNode(
  node: CategoryNode,
  brandsByCategory: Record<string, MegaBrand[]>,
  childrenBySlug: Map<string, Category[]>,
): MegaMenuColumn[] {
  if (node.slug === "component") {
    const columns = groupedComponentColumns(
      node.children,
      brandsByCategory,
      childrenBySlug,
    );
    // "All Component" rides at the top of the first group rather than its
    // own near-empty column — matching how every other department's "All X"
    // is just the first row of its column, not a column of its own.
    const firstColumn = columns[0];
    if (firstColumn) {
      columns[0] = {
        ...firstColumn,
        links: [
          { href: `/category/${node.slug}`, label: `All ${node.name}` },
          ...firstColumn.links,
        ],
      };
    }
    return columns;
  }

  const columns: MegaMenuColumn[] = splitColumn(node.name, [
    { href: `/category/${node.slug}`, label: `All ${node.name}` },
    ...node.children.map((child) =>
      childLink(child, brandsByCategory, childrenBySlug),
    ),
  ]);

  if (BRAND_COLUMN_SLUGS.has(node.slug)) {
    const brands = brandColumn(
      node.slug,
      "Shop by brand",
      brandsByCategory[node.slug] ?? [],
    );
    if (brands) {
      columns.push(...splitColumn(brands.title, brands.links));
    }
  }

  return columns;
}

export function buildMegaMenuPanels(
  tree: CategoryNode[],
  brandsByCategory: Record<string, MegaBrand[]>,
  categories: Category[],
): MegaMenuPanel[] {
  const childrenBySlug = buildChildrenBySlug(categories);
  return tree.map((node) => ({
    slug: node.slug,
    name: node.name,
    href: `/category/${node.slug}`,
    columns: columnsForNode(node, brandsByCategory, childrenBySlug),
  }));
}

export function hasMegaMenu(panel: MegaMenuPanel): boolean {
  const linkCount = panel.columns.reduce(
    (count, column) => count + column.links.length,
    0,
  );
  return (
    linkCount > 1 ||
    panel.columns.some((column) =>
      column.links.some((link) => (link.children?.length ?? 0) > 0),
    )
  );
}
