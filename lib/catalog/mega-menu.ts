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

/** Grouped component links under PC and Server — original Techno House grouping. */
const COMPONENT_COLUMNS: ReadonlyArray<{
  title: string;
  slugs: readonly string[];
}> = [
  {
    title: "Compute",
    slugs: ["cpu", "cpu-coolers", "motherboards", "ram"],
  },
  {
    title: "Graphics & storage",
    slugs: ["graphics-cards", "ssd", "hdd"],
  },
  {
    title: "Chassis & power",
    slugs: ["psu", "cases", "case-fans"],
  },
];

const BRAND_COLUMN_SLUGS = new Set([
  "laptops",
  "desktops",
  "pcs-servers",
  "monitors",
]);

export function collectBrandsByCategorySlug(
  products: Array<{
    categorySlug: string;
    brandSlug: string;
    brandName: string;
  }>,
  categories: Category[],
): Record<string, MegaBrand[]> {
  const result: Record<string, MegaBrand[]> = {};

  for (const category of categories) {
    const tree = categoryAndDescendantSlugs(category.slug, categories);
    const seen = new Map<string, string>();
    for (const product of products) {
      if (tree.has(product.categorySlug) && !seen.has(product.brandSlug)) {
        seen.set(product.brandSlug, product.brandName);
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

function childLink(
  child: { slug: string; name: string },
  brandsByCategory: Record<string, MegaBrand[]>,
): MegaMenuLink {
  return {
    href: `/category/${child.slug}`,
    label: child.name,
    children: brandFlyout(child.slug, brandsByCategory[child.slug] ?? []),
  };
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
      links.push(childLink(child, brandsByCategory));
    }
    if (links.length > 0) {
      columns.push({ title: group.title, links });
    }
  }

  const leftover = componentChildren.filter((child) => !used.has(child.slug));
  if (leftover.length > 0) {
    columns.push({
      title: "More",
      links: leftover.map((child) => childLink(child, brandsByCategory)),
    });
  }

  return columns;
}

function pcsServersColumns(
  node: CategoryNode,
  brandsByCategory: Record<string, MegaBrand[]>,
  categories: Category[],
): MegaMenuColumn[] {
  const pcChildren = node.children.filter(
    (child) => child.slug !== "components",
  );
  const componentChildren = categories.filter(
    (category) => category.parentSlug === "components",
  );

  return [
    {
      title: node.name,
      links: [
        { href: `/category/${node.slug}`, label: `All ${node.name}` },
        ...pcChildren.map((child) => childLink(child, brandsByCategory)),
        {
          href: "/category/components",
          label: "Components",
        },
      ],
    },
    ...groupedComponentColumns(componentChildren, brandsByCategory),
  ];
}

function columnsForNode(
  node: CategoryNode,
  brandsByCategory: Record<string, MegaBrand[]>,
  categories: Category[],
): MegaMenuColumn[] {
  if (node.slug === "pcs-servers") {
    return pcsServersColumns(node, brandsByCategory, categories);
  }

  if (node.slug === "components") {
    return [
      {
        title: node.name,
        links: [{ href: `/category/${node.slug}`, label: `All ${node.name}` }],
      },
      ...groupedComponentColumns(node.children, brandsByCategory),
    ];
  }

  const columns: MegaMenuColumn[] = [
    {
      title: node.name,
      links: [
        { href: `/category/${node.slug}`, label: `All ${node.name}` },
        ...node.children.map((child) => childLink(child, brandsByCategory)),
      ],
    },
  ];

  if (BRAND_COLUMN_SLUGS.has(node.slug)) {
    const brands = brandColumn(
      node.slug,
      "Shop by brand",
      brandsByCategory[node.slug] ?? [],
    );
    if (brands) {
      columns.push(brands);
    }
  }

  return columns;
}

export function buildMegaMenuPanels(
  tree: CategoryNode[],
  brandsByCategory: Record<string, MegaBrand[]>,
  categories: Category[],
): MegaMenuPanel[] {
  return tree.map((node) => ({
    slug: node.slug,
    name: node.name,
    href: `/category/${node.slug}`,
    columns: columnsForNode(node, brandsByCategory, categories),
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
