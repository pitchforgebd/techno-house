import type { Brand, Category, ProductSummary } from "@/lib/data";

export type AdminBrandRow = {
  slug: string;
  name: string;
  logoSrc: string;
  productCount: number;
  createdLabel: string;
  categories: { slug: string; name: string }[];
  metaTitle: string;
  metaDescription: string;
  position: number;
  isActive: boolean;
};

function mockCreatedLabel(slug: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  let hash = 0;
  for (const char of slug) {
    hash = (hash + char.charCodeAt(0)) % 300;
  }
  const day = 1 + (hash % 28);
  const month = months[hash % 12];
  const year = 2024 + (hash % 3);
  return `${String(day).padStart(2, "0")} ${month}, ${year}`;
}

export function buildAdminBrandRows(
  brands: Brand[],
  products: ProductSummary[],
  categories: Category[],
): AdminBrandRow[] {
  const categoryBySlug = new Map(categories.map((item) => [item.slug, item]));

  return brands.map((brand, index) => {
    const brandProducts = products.filter(
      (product) => product.brandSlug === brand.slug,
    );
    const categorySlugs = [
      ...new Set(brandProducts.map((product) => product.categorySlug)),
    ];
    const brandCategories = categorySlugs
      .map((slug) => {
        const category = categoryBySlug.get(slug);
        return category
          ? { slug: category.slug, name: category.name }
          : { slug, name: slug };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      slug: brand.slug,
      name: brand.name,
      logoSrc: brand.logoSrc,
      productCount: brandProducts.length,
      createdLabel: mockCreatedLabel(brand.slug),
      categories: brandCategories,
      metaTitle: `${brand.name} | Techno House`,
      metaDescription: `Shop ${brand.name} products at Techno House.`,
      position: index,
      isActive: true,
    };
  });
}

export function truncateCategoryLabel(
  categories: { name: string }[],
  maxChars = 42,
): { text: string; truncated: boolean } {
  if (categories.length === 0) {
    return { text: "—", truncated: false };
  }
  const full = categories.map((item) => item.name).join(", ");
  if (full.length <= maxChars) {
    return { text: full, truncated: false };
  }
  return { text: `${full.slice(0, maxChars).trimEnd()}…`, truncated: true };
}
