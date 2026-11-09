/**
 * READ-ONLY audit of the SEO phase 2 titles/descriptions over the real
 * catalogue (whatever DATABASE_URL points at). Writes nothing to the DB.
 *
 *   npm run seo:audit-meta                 # summary + duplicate groups
 *   npm run seo:audit-meta -- --csv=x.csv  # also every product's title/description
 *
 * Mirrors what the pages do: same-brand siblings for unique wording, the
 * product page's "price hidden" rule, EMI only when eligible.
 */
import { writeFileSync } from "node:fs";
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "@/lib/db/prisma";
import { getEmiConfig } from "@/lib/payments/emi-config";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  TITLE_MAX,
  brandMeta,
  categoryMeta,
  categoryParentQualifier,
  productDescription,
  productTitle,
} from "@/lib/seo/page-meta";
import { brandTopCategories } from "@/lib/seo/page-metadata";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main(): Promise<void> {
  // Same as the other tsx scripts: .env.local locally, .env on the server.
  loadEnvFiles({ path: [".env.local", ".env"], quiet: true });
  const csvArg = process.argv.find((arg) => arg.startsWith("--csv="));
  const prisma = getPrisma();
  const emiConfig = await getEmiConfig();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      name: true,
      priceAmount: true,
      stockStatus: true,
      isComingSoon: true,
      isPreOrder: true,
      brand: { select: { name: true, slug: true } },
      warranty: { select: { label: true } },
    },
  });
  const byBrand = new Map<string, string[]>();
  for (const product of products) {
    const list = byBrand.get(product.brand.slug) ?? [];
    list.push(product.name);
    byBrand.set(product.brand.slug, list);
  }

  const rows: { slug: string; name: string; title: string; description: string }[] = [];
  for (const product of products) {
    const siblings = (byBrand.get(product.brand.slug) ?? []).filter(
      (name) => name !== product.name,
    );
    const priceHidden =
      product.isComingSoon ||
      (product.stockStatus === "OUT_OF_STOCK" && !product.isPreOrder);
    const emi =
      !priceHidden &&
      emiConfig.enabled &&
      emiConfig.tenureMonths.length > 0 &&
      product.priceAmount >= emiConfig.minOrderAmount;
    rows.push({
      slug: product.slug,
      name: product.name,
      title: productTitle(product.name, product.brand.name, siblings),
      description: productDescription({
        name: product.name,
        brandName: product.brand.name,
        displayPrice: priceHidden ? null : product.priceAmount,
        isPreOrder: product.isPreOrder,
        isComingSoon: product.isComingSoon,
        warrantyLabel: product.warranty?.label ?? "",
        emi,
        siblingNames: siblings,
      }),
    });
  }

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    groups.set(row.title, [...(groups.get(row.title) ?? []), row]);
  }
  const duplicates = [...groups].filter(([, list]) => list.length > 1);
  const titleLong = rows.filter((row) => row.title.length > TITLE_MAX).length;
  const descShort = rows.filter((row) => row.description.length < DESCRIPTION_MIN).length;
  const descLong = rows.filter((row) => row.description.length > DESCRIPTION_MAX).length;

  console.log(`products: ${rows.length}`);
  console.log(`titles > ${TITLE_MAX}: ${titleLong}`);
  console.log(`descriptions < ${DESCRIPTION_MIN}: ${descShort}, > ${DESCRIPTION_MAX}: ${descLong}`);
  console.log(
    `duplicate titles: ${duplicates.length} groups, ${duplicates.reduce((sum, [, list]) => sum + list.length, 0)} products`,
  );
  for (const [title, list] of duplicates) {
    console.log(`\n  "${title}"`);
    for (const row of list) {
      console.log(`     /product/${row.slug}  <  ${row.name}`);
    }
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, parent: { select: { slug: true } } },
  });
  const categoryLikes = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    parentSlug: category.parent?.slug ?? null,
  }));
  const categoryTitles = categoryLikes.map(
    (category) =>
      categoryMeta(category, undefined, categoryParentQualifier(category, categoryLikes)).title,
  );
  console.log(
    `\ncategories: ${categories.length}, titles > ${TITLE_MAX}: ${categoryTitles.filter((t) => t.length > TITLE_MAX).length}, duplicate titles: ${categoryTitles.length - new Set(categoryTitles).size}`,
  );
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    select: { slug: true, name: true },
  });
  const brandTitles: string[] = [];
  for (const brand of brands) {
    brandTitles.push(brandMeta(brand, await brandTopCategories(brand.slug)).title);
  }
  console.log(
    `brands: ${brands.length}, titles > ${TITLE_MAX}: ${brandTitles.filter((t) => t.length > TITLE_MAX).length}, duplicate titles: ${brandTitles.length - new Set(brandTitles).size}`,
  );

  if (csvArg) {
    const path = csvArg.slice("--csv=".length);
    const lines = [
      "slug,name,title,title_length,description,description_length",
      ...rows.map((row) =>
        [row.slug, row.name, row.title, row.title.length, row.description, row.description.length]
          .map(csvCell)
          .join(","),
      ),
    ];
    writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
    console.log(`\nwrote ${rows.length} rows to ${path}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
