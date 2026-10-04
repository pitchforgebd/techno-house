/**
 * Restores a catalogue bundle written by `export-catalog.ts`.
 *
 *   npm run catalog:import -- <bundle-dir>
 *   npm run catalog:import -- <bundle-dir> --allow-nonempty   # re-run / top up
 *
 * Meant for a NEW database that already has its migrations applied
 * (`npm run db:migrate:deploy`). Safe by construction:
 *  - it refuses to run if the target already holds products, unless
 *    `--allow-nonempty` is given (then rows that already exist are skipped, so
 *    a half-finished run can simply be repeated — it never overwrites);
 *  - it refuses if the target has fewer applied migrations than the bundle was
 *    exported from (the columns might not exist yet);
 *  - tables are inserted parents-first, categories by depth;
 *  - afterwards it checks the counts against the manifest, that every product
 *    has a stock row, and that no stock is reserved.
 *
 * It never touches staff, customers, orders or settings, and only ever inserts.
 * Exits non-zero if anything does not add up.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import {
  CATALOG_TABLES,
  RELATED_PRODUCTS_TABLE,
  reviveRow,
  type Delegate,
} from "./catalog-tables";

type Row = Record<string, unknown>;

const CHUNK = 500;

function readRows(dir: string, table: string): Row[] {
  const file = join(dir, `${table}.jsonl`);
  if (!existsSync(file)) {
    throw new Error(`Bundle is missing ${table}.jsonl`);
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(reviveRow);
}

/** Parents before children, so a self-referencing table never inserts a child first. */
function byDepth(rows: Row[]): Row[] {
  const parentOf = new Map(rows.map((row) => [String(row.id), row.parentId as string | null]));
  const depth = (id: string): number => {
    let d = 0;
    let cursor = parentOf.get(id) ?? null;
    while (cursor && d < 50) {
      d += 1;
      cursor = parentOf.get(cursor) ?? null;
    }
    return d;
  };
  return [...rows].sort((a, b) => depth(String(a.id)) - depth(String(b.id)));
}

async function main(): Promise<void> {
  const dir = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const allowNonEmpty = process.argv.includes("--allow-nonempty");
  if (!dir || !existsSync(join(dir, "manifest.json"))) {
    console.error("Usage: import-catalog.ts <bundle-dir> [--allow-nonempty]");
    process.exitCode = 1;
    return;
  }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
    counts: Record<string, number>;
    migrations: { applied: number; last: string };
  };
  const prisma = getPrisma();
  const db = prisma as unknown as Record<string, Delegate>;

  const target = await prisma.$queryRawUnsafe<{ db: string }[]>(`SELECT current_database() AS db`);
  console.log(`Importing into database "${target[0]?.db}".`);

  const migrations = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
  );
  if ((migrations[0]?.n ?? 0) < manifest.migrations.applied) {
    console.error(
      `Target has ${migrations[0]?.n ?? 0} applied migrations; the bundle needs ${manifest.migrations.applied}. Run \`npm run db:migrate:deploy\` first.`,
    );
    process.exitCode = 1;
    return;
  }
  const existing = await db.product!.count();
  if (existing > 0 && !allowNonEmpty) {
    console.error(
      `Target already has ${existing} product(s). Refusing to import into a populated catalogue (use --allow-nonempty to top up; existing rows are never overwritten).`,
    );
    process.exitCode = 1;
    return;
  }

  for (const { delegate, table } of CATALOG_TABLES) {
    let rows = readRows(dir, table);
    if (delegate === "category") rows = byDepth(rows);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const result = await db[delegate]!.createMany({
        data: rows.slice(i, i + CHUNK),
        skipDuplicates: true,
      });
      inserted += result.count;
    }
    console.log(`  ${table.padEnd(24)} ${String(inserted).padStart(5)} inserted of ${rows.length}`);
  }

  const pairs = readRows(dir, RELATED_PRODUCTS_TABLE) as { A: string; B: string }[];
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const slice = pairs.slice(i, i + CHUNK);
    const values = slice.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(", ");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${RELATED_PRODUCTS_TABLE}" ("A", "B") VALUES ${values} ON CONFLICT DO NOTHING`,
      ...slice.flatMap((pair) => [pair.A, pair.B]),
    );
  }
  console.log(`  ${RELATED_PRODUCTS_TABLE.padEnd(24)} ${String(pairs.length).padStart(5)} pairs`);

  // --- verify ----------------------------------------------------------------
  const problems: string[] = [];
  for (const { delegate, table } of CATALOG_TABLES) {
    const actual = await db[delegate]!.count();
    const wanted = manifest.counts[table] ?? 0;
    if (actual < wanted) problems.push(`${table}: ${actual} rows, bundle has ${wanted}`);
  }
  const stats = await prisma.$queryRawUnsafe<
    { products: number; stocked: number; reserved: number }[]
  >(
    `SELECT (SELECT COUNT(*) FROM "Product")::int AS products,
            (SELECT COUNT(*) FROM "ProductStock")::int AS stocked,
            (SELECT COALESCE(SUM(reserved), 0) FROM "ProductStock")::int AS reserved`,
  );
  const s = stats[0]!;
  if (s.products !== s.stocked) problems.push(`${s.products} products but ${s.stocked} stock rows`);
  if (s.reserved !== 0) problems.push(`${s.reserved} unit(s) reserved with no orders to hold them`);

  if (problems.length > 0) {
    console.error("\nImport finished but the checks failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\nImport complete and verified: ${s.products} products, every one with a stock row, nothing reserved.`,
  );
  console.log("Next: extract uploads.tar.gz into public/, then run the smoke tests in docs/DEPLOY_VPS_RUNBOOK.md.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
