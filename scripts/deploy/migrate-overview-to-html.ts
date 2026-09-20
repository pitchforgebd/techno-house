/**
 * One-time backfill: existing `Product.overview` (plain-text bullet array)
 * -> `Product.overviewHtml` (the new "Quick overview" rich-text field).
 *
 *   npm run catalog:migrate-overview-html -- --dry-run   # report only
 *   npm run catalog:migrate-overview-html                # apply
 *
 * Before this, "Quick overview" (the buy box) rendered `overview` directly
 * — every existing product's overview bullets are real content a shopper
 * already sees, so this preserves it as the equivalent HTML bullet list
 * rather than starting every product with an empty Quick overview.
 *
 * Only touches products with a non-empty `overview` and no `overviewHtml`
 * yet, so it never overwrites content someone has already written directly
 * in the new admin editor. Idempotent — a second run finds nothing left to
 * migrate.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function overviewToHtml(overview: string[]): string {
  const items = overview
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  const candidates = await prisma.product.findMany({
    where: { overviewHtml: null, NOT: { overview: { isEmpty: true } } },
    select: { id: true, slug: true, overview: true },
  });

  console.log(`${candidates.length} product(s) with overview but no overviewHtml.`);

  if (dryRun) {
    for (const product of candidates.slice(0, 10)) {
      console.log(`  ${product.slug}: ${overviewToHtml(product.overview)}`);
    }
    if (candidates.length > 10) {
      console.log(`  … and ${candidates.length - 10} more`);
    }
    console.log("\nDry run — no changes made.");
    return;
  }

  let migrated = 0;
  for (const product of candidates) {
    await prisma.product.update({
      where: { id: product.id },
      data: { overviewHtml: overviewToHtml(product.overview) },
    });
    migrated += 1;
  }
  console.log(`\nMigrated ${migrated} product(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
