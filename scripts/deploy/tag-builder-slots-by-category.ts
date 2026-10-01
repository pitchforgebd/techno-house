/**
 * Bulk-assigns Product.builderSlot by real category, for every PC Builder
 * slot that has no dedicated bulk-CSV column (see lib/catalog/bulk-csv.ts's
 * fieldsFromCsvRow comment — builderSlot is never set by bulk import).
 *
 * Sets builderSlot on every ACTIVE product in the mapped categories, so
 * real bulk-imported products become selectable in the matching PC Builder
 * slot. Does not touch builderSocket/builderRamType/builderFormFactor/
 * builderTdpWatts/builderStorageInterface — those compatibility fields are
 * a separate, deliberately out-of-scope follow-up.
 *
 * Idempotent: re-running just re-sets the same values.
 *
 *   npx tsx scripts/deploy/tag-builder-slots-by-category.ts --dry-run
 *   npx tsx scripts/deploy/tag-builder-slots-by-category.ts
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import type { BuilderSlot } from "../../lib/generated/prisma/enums";

const SLOT_CATEGORY_SLUGS: { slot: BuilderSlot; categorySlugs: string[] }[] = [
  { slot: "CPU", categorySlugs: ["processor"] },
  { slot: "CPU_COOLER", categorySlugs: ["cpu-cooler"] },
  { slot: "MOTHERBOARD", categorySlugs: ["motherboard"] },
  { slot: "RAM", categorySlugs: ["ram-desktop"] },
  { slot: "GPU", categorySlugs: ["graphics-card"] },
  { slot: "SSD", categorySlugs: ["ssd", "nvme-ssd"] },
  { slot: "HDD", categorySlugs: ["hard-disk-drive"] },
  { slot: "PSU", categorySlugs: ["power-supply"] },
  { slot: "CASE", categorySlugs: ["casing"] },
  { slot: "CASE_FANS", categorySlugs: ["casing-cooler"] },
  { slot: "MONITOR", categorySlugs: ["monitor"] },
  { slot: "KEYBOARD", categorySlugs: ["keyboard"] },
  { slot: "MOUSE", categorySlugs: ["mouse"] },
  { slot: "UPS", categorySlugs: ["ups"] },
  { slot: "SPEAKER", categorySlugs: ["speaker-and-home-theater"] },
  { slot: "HEADPHONE", categorySlugs: ["headphone"] },
  { slot: "NETWORK_ADAPTER", categorySlugs: ["wifi-adapter", "lan-card"] },
  { slot: "ANTIVIRUS", categorySlugs: ["antivirus"] },
];

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  for (const { slot, categorySlugs } of SLOT_CATEGORY_SLUGS) {
    const categories = await prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
      select: { id: true, slug: true },
    });
    const foundSlugs = new Set(categories.map((c) => c.slug));
    const missing = categorySlugs.filter((slug) => !foundSlugs.has(slug));
    if (missing.length > 0) {
      console.log(`${slot}: category slug(s) not found, skipping them: ${missing.join(", ")}`);
    }
    if (categories.length === 0) {
      console.log(`${slot}: no matching category found at all — skipped.\n`);
      continue;
    }

    const candidates = await prisma.product.findMany({
      where: {
        categoryId: { in: categories.map((c) => c.id) },
        isActive: true,
      },
      select: { id: true, name: true, builderSlot: true },
    });

    const toChange = candidates.filter((p) => p.builderSlot !== slot);
    console.log(
      `${slot} (${categorySlugs.join(", ")}): ${candidates.length} active product(s), ${toChange.length} need updating`,
    );

    if (!dryRun && toChange.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: toChange.map((p) => p.id) } },
        data: { builderSlot: slot },
      });
    }
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
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
