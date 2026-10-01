/**
 * Read-only: for each bulk-import CSV part file given, checks how many of
 * its SKUs actually exist in the database right now. Finds which parts of
 * the original 5-way split SMART-catalog CSV were never actually uploaded.
 *
 *   npx tsx scripts/deploy/diagnose-missing-import-rows.ts bulk-import-part-3.csv bulk-import-part-4.csv bulk-import-part-5.csv
 *
 * Makes no changes.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { getPrisma } from "../../lib/db/prisma";

async function main(): Promise<void> {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: diagnose-missing-import-rows.ts <csv file> [more csv files...]");
    process.exitCode = 1;
    return;
  }

  const prisma = getPrisma();

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const rows = parsed.data;
    const skus = rows.map((row) => row.sku).filter((sku): sku is string => !!sku);

    const existing = await prisma.product.findMany({
      where: { sku: { in: skus } },
      select: { sku: true },
    });
    const existingSkus = new Set(existing.map((row) => row.sku));
    const missing = skus.filter((sku) => !existingSkus.has(sku));

    console.log(`\n=== ${file} ===`);
    console.log(`  total rows: ${skus.length}`);
    console.log(`  already in DB: ${existingSkus.size}`);
    console.log(`  MISSING (never imported): ${missing.length}`);

    if (missing.length > 0) {
      const byCategory = new Map<string, number>();
      for (const row of rows) {
        if (row.sku && !existingSkus.has(row.sku)) {
          byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
        }
      }
      console.log("  missing rows by category:");
      for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${category}: ${count}`);
      }
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
