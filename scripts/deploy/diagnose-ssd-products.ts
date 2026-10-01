/**
 * Read-only: lists every brand with its total product count, then every
 * product whose name mentions "SSD" / "NVMe" along with the category it is
 * ACTUALLY filed under right now — so we can see where SSD-branded uploads
 * really landed, not just where the "ssd" category thinks they are.
 *
 *   npx tsx scripts/deploy/diagnose-ssd-products.ts
 *
 * Makes no changes.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

async function main(): Promise<void> {
  const prisma = getPrisma();

  const brands = await prisma.brand.findMany({
    select: { slug: true, name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  console.log(`=== All brands (${brands.length}) ===`);
  for (const b of brands) {
    console.log(`  ${b.name} (${b.slug}) — ${b._count.products} products total`);
  }

  const ssdNamed = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: "ssd", mode: "insensitive" } },
        { name: { contains: "nvme", mode: "insensitive" } },
      ],
    },
    select: {
      name: true,
      isActive: true,
      brand: { select: { name: true } },
      category: { select: { slug: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  console.log(`\n=== Products with "SSD"/"NVMe" in the name (${ssdNamed.length}) ===`);
  for (const p of ssdNamed) {
    console.log(
      `  [${p.isActive ? "active" : "INACTIVE"}] ${p.name} — brand: ${p.brand.name} — category: ${p.category.slug} ("${p.category.name}")`,
    );
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
