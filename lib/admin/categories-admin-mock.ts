import type { Category } from "@/lib/data";

export type AdminCategoryRow = {
  slug: string;
  name: string;
  parentSlug: string | null;
  parentName: string | null;
  filterKeys: string[];
  /** Depth in tree: 0 = root. */
  level: number;
  /** Display order — higher = higher priority (mock). */
  orderLevel: number;
  productCount: number;
  childCount: number;
  featured: boolean;
  hot: boolean;
  isActive: boolean;
  /** Icon key for lucide mapping. */
  iconKey: string;
  iconSrc: string | null;
  bannerSrc: string | null;
  coverSrc: string | null;
  metaTitle: string;
  metaDescription: string;
  bannerHint: string | null;
  coverHint: string | null;
};

function categoryDepth(
  category: Category,
  bySlug: Map<string, Category>,
): number {
  let depth = 0;
  let current: Category | undefined = category;
  const seen = new Set<string>();
  while (current?.parentSlug) {
    if (seen.has(current.slug)) {
      break;
    }
    seen.add(current.slug);
    depth += 1;
    current = bySlug.get(current.parentSlug);
  }
  return depth;
}

function hashOrder(slug: string): number {
  let hash = 0;
  for (const char of slug) {
    hash = (hash + char.charCodeAt(0) * 13) % 40;
  }
  return 40 - hash;
}

/** Map catalog slugs to admin icon keys (design-only; lucide). */
export function categoryIconKey(slug: string): string {
  const map: Record<string, string> = {
    laptops: "laptop",
    "gaming-laptops": "laptop",
    "pcs-servers": "server",
    desktops: "monitor",
    servers: "server",
    components: "cpu",
    cpu: "cpu",
    "cpu-coolers": "fan",
    motherboards: "circuit",
    ram: "memory",
    "graphics-cards": "gpu",
    ssd: "harddrive",
    hdd: "harddrive",
    psu: "zap",
    cases: "box",
    "case-fans": "fan",
    gaming: "gamepad",
    monitors: "monitor",
    tvs: "tv",
    tablets: "tablet",
    phones: "phone",
    gadgets: "watch",
    printers: "printer",
    cameras: "camera",
    security: "shield",
    networking: "wifi",
    routers: "wifi",
    switches: "network",
    sound: "speaker",
    office: "briefcase",
    accessories: "cable",
    "wireless-charger": "battery",
    cables: "cable",
    software: "app",
    appliances: "air",
  };
  return map[slug] ?? "folder";
}

export function buildAdminCategoryRows(
  categories: Category[],
  productCounts: Map<string, number>,
): AdminCategoryRow[] {
  const bySlug = new Map(categories.map((item) => [item.slug, item]));
  const childCount = new Map<string, number>();
  for (const category of categories) {
    if (category.parentSlug) {
      childCount.set(
        category.parentSlug,
        (childCount.get(category.parentSlug) ?? 0) + 1,
      );
    }
  }

  return categories.map((category) => {
    const level = categoryDepth(category, bySlug);
    const parent = category.parentSlug ? bySlug.get(category.parentSlug) : null;
    return {
      slug: category.slug,
      name: category.name,
      parentSlug: category.parentSlug,
      parentName: parent?.name ?? null,
      filterKeys: category.filterKeys,
      level,
      orderLevel: hashOrder(category.slug),
      productCount: productCounts.get(category.slug) ?? 0,
      childCount: childCount.get(category.slug) ?? 0,
      featured: level === 0 && hashOrder(category.slug) > 28,
      hot: category.slug === "laptops" || category.slug === "phones",
      isActive: true,
      iconKey: categoryIconKey(category.slug),
      iconSrc: null,
      bannerSrc: null,
      coverSrc: null,
      metaTitle: `${category.name} | Techno House`,
      metaDescription: `Shop ${category.name} at Techno House. Prices in ৳.`,
      bannerHint: level === 0 ? "banner" : null,
      coverHint: level === 0 ? "cover" : null,
    };
  });
}
