/**
 * Read-only: shows how many products are currently assigned to each PC
 * Builder slot (Product.builderSlot). The bulk CSV importer never sets this
 * field (no column for it — see fieldsFromCsvRow's comment in
 * lib/catalog/bulk-csv.ts), so every bulk-imported product defaults to no
 * slot at all; only products edited one-by-one in the admin form (or the
 * original demo seed) have ever gotten a builderSlot value.
 *
 *   npx tsx scripts/deploy/diagnose-pc-builder.ts
 *
 * Makes no changes.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

const ALL_SLOTS = [
  "CPU",
  "CPU_COOLER",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "SSD",
  "HDD",
  "PSU",
  "CASE",
  "CASE_FANS",
  "MONITOR",
] as const;

async function main(): Promise<void> {
  const prisma = getPrisma();

  const totalWithSlot = await prisma.product.count({
    where: { builderSlot: { not: null } },
  });
  const totalProducts = await prisma.product.count();
  console.log(
    `Products with a PC Builder slot set: ${totalWithSlot} / ${totalProducts} total products\n`,
  );

  for (const slot of ALL_SLOTS) {
    const products = await prisma.product.findMany({
      where: { builderSlot: slot },
      select: {
        name: true,
        isActive: true,
        brand: { select: { name: true } },
        category: { select: { slug: true } },
      },
      orderBy: { name: "asc" },
    });
    console.log(`=== ${slot} (${products.length}) ===`);
    for (const p of products) {
      console.log(
        `  [${p.isActive ? "active" : "INACTIVE"}] ${p.brand.name} — ${p.name} (category: ${p.category.slug})`,
      );
    }
    if (products.length === 0) {
      console.log("  (none)");
    }
    console.log("");
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
