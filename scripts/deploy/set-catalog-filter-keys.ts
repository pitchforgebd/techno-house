/**
 * Category filterKeys bootstrap for the SMART catalog import (2026-09).
 *
 *   npm run catalog:bootstrap-filter-keys -- --dry-run   # report only
 *   npm run catalog:bootstrap-filter-keys                # apply
 *
 * Targets only the top-volume categories from the SMART import that had no
 * filter facets configured yet: Photocopier, IP Camera, Operating System,
 * Server, Headphone. (Laptop, RAM (Desktop), Casing, Motherboard, Monitor
 * already have filterKeys from the original taxonomy rebuild.)
 *
 * Deliberately NOT a re-run of rebuild-catalog-taxonomy.ts — that script
 * also reassigns products off old categories, which isn't safe to replay
 * against the live catalog. This only sets `filterKeys` on five specific,
 * already-existing category rows. Run
 * `npm run catalog:bootstrap-attributes` first so every key here resolves
 * to a real ProductAttribute (see scripts/deploy/create-product-attributes.ts).
 *
 * Idempotent — safe to re-run, always sets the exact list below.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

const CATEGORY_FILTER_KEYS: { slug: string; filterKeys: string[] }[] = [
  {
    slug: "photocopier",
    filterKeys: ["printTechnology", "function", "printColor", "paperSize", "duplex"],
  },
  {
    slug: "ip-camera",
    filterKeys: ["resolution", "cameraType", "connectivity", "nightVision"],
  },
  {
    slug: "operating-system",
    filterKeys: ["licenseType", "platform"],
  },
  {
    slug: "server",
    filterKeys: ["processor", "ram", "storage", "formFactor", "raid"],
  },
  {
    slug: "headphone",
    filterKeys: ["audioType", "connectivity", "microphone"],
  },
];

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  const existing = await prisma.category.findMany({
    where: { slug: { in: CATEGORY_FILTER_KEYS.map((c) => c.slug) } },
    select: { slug: true, filterKeys: true },
  });
  const existingBySlug = new Map(existing.map((row) => [row.slug, row.filterKeys]));

  const missing = CATEGORY_FILTER_KEYS.filter((c) => !existingBySlug.has(c.slug));
  if (missing.length > 0) {
    console.error(
      "These category slugs don't exist — fix the slug before running:",
      missing.map((c) => c.slug),
    );
    process.exitCode = 1;
    return;
  }

  for (const c of CATEGORY_FILTER_KEYS) {
    const before = existingBySlug.get(c.slug) ?? [];
    console.log(`${c.slug}: [${before.join(", ")}] -> [${c.filterKeys.join(", ")}]`);
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    return;
  }

  for (const c of CATEGORY_FILTER_KEYS) {
    await prisma.category.update({
      where: { slug: c.slug },
      data: { filterKeys: c.filterKeys },
    });
  }
  console.log(`\nUpdated filterKeys on ${CATEGORY_FILTER_KEYS.length} categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
