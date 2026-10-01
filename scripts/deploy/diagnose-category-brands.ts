/**
 * Read-only diagnostic: why doesn't a category's mega-menu brand flyout /
 * category-page brand filter show brands for products that were uploaded
 * "brand-wise" (e.g. SSD)?
 *
 * Checks, for every category matching the given slugs (or all SSD-ish
 * categories if none given):
 *   - the exact category row(s) that slug resolves to (catches duplicates
 *     from the old demo taxonomy vs the real SMART-import taxonomy)
 *   - how many products are directly assigned to it, active or not
 *   - the distinct brands among those products
 *
 *   npx tsx scripts/deploy/diagnose-category-brands.ts ssd portable-ssd
 *   npx tsx scripts/deploy/diagnose-category-brands.ts          # defaults to ssd-ish slugs
 *
 * Read-only. Makes no changes.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

async function main(): Promise<void> {
  const prisma = getPrisma();
  const argSlugs = process.argv.slice(2);

  const slugs =
    argSlugs.length > 0
      ? argSlugs
      : (
          await prisma.category.findMany({
            where: { slug: { contains: "ssd" } },
            select: { slug: true },
          })
        ).map((row) => row.slug);

  if (slugs.length === 0) {
    console.log("No matching categories found.");
    return;
  }

  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, name: true, parentId: true, filterKeys: true },
  });

  if (categories.length === 0) {
    console.log(`No category rows found for slugs: ${slugs.join(", ")}`);
    return;
  }

  const parentIds = categories.map((c) => c.parentId).filter((id): id is string => !!id);
  const parents = await prisma.category.findMany({
    where: { id: { in: parentIds } },
    select: { id: true, slug: true },
  });
  const parentSlugById = new Map(parents.map((p) => [p.id, p.slug]));

  for (const cat of categories) {
    const products = await prisma.product.findMany({
      where: { categoryId: cat.id },
      select: {
        id: true,
        name: true,
        isActive: true,
        brand: { select: { slug: true, name: true } },
      },
    });

    const children = await prisma.category.count({ where: { parentId: cat.id } });

    console.log(`\n=== ${cat.slug} ("${cat.name}") ===`);
    console.log(`  id: ${cat.id}`);
    console.log(`  parent: ${cat.parentId ? (parentSlugById.get(cat.parentId) ?? cat.parentId) : "(top-level)"}`);
    console.log(`  children: ${children}`);
    console.log(`  filterKeys: [${cat.filterKeys.join(", ")}]`);
    console.log(`  products directly assigned: ${products.length}`);
    console.log(`  of those, active: ${products.filter((p) => p.isActive).length}`);

    const byBrand = new Map<string, number>();
    for (const p of products) {
      const key = `${p.brand.name} (${p.brand.slug})`;
      byBrand.set(key, (byBrand.get(key) ?? 0) + 1);
    }
    if (byBrand.size > 0) {
      console.log("  brands:");
      for (const [brand, count] of byBrand) {
        console.log(`    - ${brand}: ${count}`);
      }
    } else {
      console.log("  brands: (none — no products found on this exact category row)");
    }
  }

  // Also flag any OTHER category row whose name looks like it could be a
  // duplicate of one we just checked (same word, different slug) — this is
  // how the old demo taxonomy and the new SMART-import taxonomy coexist.
  const allCats = await prisma.category.findMany({
    select: { slug: true, name: true },
  });
  for (const cat of categories) {
    const nameLower = cat.name.toLowerCase();
    const lookalikes = allCats.filter(
      (other) => other.slug !== cat.slug && other.name.toLowerCase() === nameLower,
    );
    if (lookalikes.length > 0) {
      console.log(
        `\n!! "${cat.name}" also exists as a separate category row: ${lookalikes
          .map((l) => l.slug)
          .join(", ")} — products may be split across both.`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
