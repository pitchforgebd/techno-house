/**
 * Runs a bulk-import CSV file server-side, through the exact same
 * `importProductsFromCsvText` path the Admin -> Products -> Bulk Import page
 * uses (same validation, same saveAdminProduct per row, same SKU-upsert
 * semantics). Lets the remaining SMART-catalog CSV parts be imported
 * directly on the server instead of through the browser.
 *
 *   npx tsx scripts/deploy/run-bulk-import.ts bulk-import-part-4.csv
 *
 * Safe to re-run: existing SKUs are updated in place, not duplicated.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { readFileSync } from "node:fs";
import { importProductsFromCsvText } from "../../lib/catalog/bulk-csv";
import { getPrisma } from "../../lib/db/prisma";

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: run-bulk-import.ts <csv file>");
    process.exitCode = 1;
    return;
  }

  const csvText = readFileSync(file, "utf8");
  const result = await importProductsFromCsvText(csvText);

  if (!result.ok) {
    console.error(`Import rejected: ${result.formError}`);
    process.exitCode = 1;
    return;
  }

  const { created, updated, failed, results } = result.summary;
  console.log(`\n=== ${file} ===`);
  console.log(`created: ${created}, updated: ${updated}, failed: ${failed}`);

  const failures = results.filter((row) => row.status === "failed");
  if (failures.length > 0) {
    console.log("\nFailed rows:");
    for (const row of failures) {
      console.log(`  row ${row.row} (${row.sku || "no sku"} / ${row.name}): ${row.error}`);
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
