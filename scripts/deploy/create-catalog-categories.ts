/**
 * Production category-tree bootstrap.
 *
 *   npm run catalog:bootstrap-categories
 *
 * `prisma/seed.ts` refuses to run in production because it loads demo
 * *products*, customers, and orders. The category taxonomy is different: it
 * is structural reference data (the same tree the header mega-menu and
 * listing filters are built around — "Laptop", "Processors", "Graphics
 * cards", ...), not fake storefront content, so it is safe to bootstrap on
 * its own here.
 *
 * Creates ONLY Category rows (name, slug, parent, filterKeys) from the same
 * `mockCategories` reference list `prisma/seed.ts` uses for this exact
 * section. No products, brands, or anything else. Idempotent upsert by slug
 * — safe to re-run.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { mockCategories } from "../../lib/data/mocks/catalog";

async function main(): Promise<void> {
  const prisma = getPrisma();

  // Two passes: create/update every row first, then link parents — a child
  // can otherwise be upserted before the parent row it needs to reference exists.
  for (const [index, category] of mockCategories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        filterKeys: [...category.filterKeys],
        position: index,
      },
      update: {
        name: category.name,
        filterKeys: [...category.filterKeys],
        position: index,
      },
    });
  }

  for (const category of mockCategories) {
    const parentId = category.parentSlug
      ? (
          await prisma.category.findUniqueOrThrow({
            where: { slug: category.parentSlug },
            select: { id: true },
          })
        ).id
      : null;
    await prisma.category.update({
      where: { slug: category.slug },
      data: { parentId },
    });
  }

  console.log(`ok — ${mockCategories.length} categories created/updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
