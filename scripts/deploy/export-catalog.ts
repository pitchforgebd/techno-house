/**
 * Catalogue-only export for a first production deploy.
 *
 *   npm run catalog:export                       # writes ./catalog-export/
 *   npm run catalog:export -- --out=some/dir --no-uploads
 *
 * Reads the CURRENT database (normally the development one) and writes the
 * product catalogue — and nothing else — as one JSON-lines file per table plus
 * a manifest and, unless `--no-uploads`, a tarball of `public/uploads`. Read
 * only: it never writes to the database.
 *
 * What it leaves out on purpose (see catalog-tables.ts for the allowlist):
 *  - staff, customers, orders, carts, payments, reviews, promotions, analytics,
 *    audit logs and every settings table that can hold a secret;
 *  - the demo seed's fictional products (matched by slug against the seed's own
 *    `mockProducts`) and any brand that only those products used;
 *  - stock reservations: `reserved` is forced to 0, because the orders that
 *    held those units are not coming along (a non-zero value would be a ghost
 *    reservation that `db:preflight` flags and checkout can never release);
 *  - `MediaAsset.uploadedByStaffId`: set to null, the staff do not exist there.
 *
 * Restore with `npm run catalog:import` against a database that already has
 * its migrations applied. See docs/DEPLOY_VPS_RUNBOOK.md.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { mockBrands, mockProducts } from "../../lib/data/mocks/catalog";
import {
  CATALOG_TABLES,
  RELATED_PRODUCTS_TABLE,
  serializeRow,
  type Delegate,
} from "./catalog-tables";

type Row = Record<string, unknown>;

function argValue(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const out = argValue("out") ?? "catalog-export";
  const withUploads = !process.argv.includes("--no-uploads");
  const prisma = getPrisma();
  const db = prisma as unknown as Record<string, Delegate>;

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // --- which products are real ------------------------------------------------
  const demoSlugs = new Set(mockProducts.map((product) => product.slug));
  const allProducts = (await db.product!.findMany()) as Row[];
  const demoProducts = allProducts.filter((p) => demoSlugs.has(String(p.slug)));
  const demoIds = new Set(demoProducts.map((p) => String(p.id)));
  const products = allProducts.filter((p) => !demoIds.has(String(p.id)));
  const keptIds = new Set(products.map((p) => String(p.id)));

  // --- per-table rows ---------------------------------------------------------
  const rows = new Map<string, Row[]>();
  const keptBrandIds = new Set(products.map((p) => String(p.brandId)));
  const demoBrandSlugs = new Set(mockBrands.map((brand) => brand.slug));
  const excludedBrands: string[] = [];

  for (const { delegate } of CATALOG_TABLES) {
    if (delegate === "product") {
      rows.set(delegate, products);
      continue;
    }
    const all = (await db[delegate]!.findMany()) as Row[];
    let kept = all;
    if (delegate === "brand") {
      kept = all.filter((brand) => {
        const demoOnly =
          demoBrandSlugs.has(String(brand.slug)) && !keptBrandIds.has(String(brand.id));
        if (demoOnly) excludedBrands.push(String(brand.name));
        return !demoOnly;
      });
    } else if (delegate === "mediaAsset") {
      kept = all.map((asset) => ({ ...asset, uploadedByStaffId: null }));
    } else if (
      all.length > 0 &&
      "productId" in (all[0] as Row)
    ) {
      kept = all.filter((row) => keptIds.has(String(row.productId)));
    }
    rows.set(delegate, kept);
  }

  // Tables keyed by a parent that is itself filtered.
  const keptColorIds = new Set((rows.get("productColor") ?? []).map((r) => String(r.id)));
  rows.set(
    "productColorImage",
    (rows.get("productColorImage") ?? []).filter((r) => keptColorIds.has(String(r.colorId))),
  );
  const keptGroupIds = new Set((rows.get("productSpecGroup") ?? []).map((r) => String(r.id)));
  rows.set(
    "productSpecRow",
    (rows.get("productSpecRow") ?? []).filter((r) => keptGroupIds.has(String(r.groupId))),
  );

  // Ghost reservations: the orders that held these units are not exported.
  let zeroedReserved = 0;
  rows.set(
    "productStock",
    (rows.get("productStock") ?? []).map((stock) => {
      if (Number(stock.reserved) !== 0) zeroedReserved += Number(stock.reserved);
      return { ...stock, reserved: 0 };
    }),
  );

  // --- related products (implicit join table) ----------------------------------
  const related = (
    await prisma.$queryRawUnsafe<{ A: string; B: string }[]>(
      `SELECT "A", "B" FROM "${RELATED_PRODUCTS_TABLE}"`,
    )
  ).filter((pair) => keptIds.has(pair.A) && keptIds.has(pair.B));

  // --- write ------------------------------------------------------------------
  const counts: Record<string, number> = {};
  const uploadRefs = new Set<string>();
  for (const { delegate, table } of CATALOG_TABLES) {
    const list = rows.get(delegate) ?? [];
    const text = list.map(serializeRow).join("\n");
    writeFileSync(join(out, `${table}.jsonl`), text ? `${text}\n` : "");
    counts[table] = list.length;
    for (const piece of text.split('"')) {
      if (piece.startsWith("/uploads/")) uploadRefs.add(piece);
    }
  }
  writeFileSync(
    join(out, `${RELATED_PRODUCTS_TABLE}.jsonl`),
    related.length ? `${related.map((pair) => JSON.stringify(pair)).join("\n")}\n` : "",
  );
  counts[RELATED_PRODUCTS_TABLE] = related.length;

  const missingUploads = [...uploadRefs].filter(
    (ref) => !existsSync(join("public", decodeURIComponent(ref.split("?")[0]!))),
  );

  const migrations = await prisma.$queryRawUnsafe<{ n: number; last: string }[]>(
    `SELECT COUNT(*)::int AS n, MAX(migration_name) AS last FROM _prisma_migrations WHERE finished_at IS NOT NULL`,
  );

  if (withUploads && existsSync(join("public", "uploads"))) {
    execFileSync("tar", ["-czf", join(out, "uploads.tar.gz"), "-C", "public", "uploads"], {
      stdio: "inherit",
    });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    counts,
    migrations: { applied: migrations[0]?.n ?? 0, last: migrations[0]?.last ?? "" },
    excluded: {
      demoProducts: demoProducts.map((p) => `${String(p.sku)} — ${String(p.name)}`),
      demoOnlyBrands: excludedBrands,
    },
    normalised: {
      reservedUnitsZeroed: zeroedReserved,
      mediaStaffLinksCleared: (rows.get("mediaAsset") ?? []).length,
    },
    uploads: {
      referenced: uploadRefs.size,
      missingOnDisk: missingUploads,
      tarball: withUploads && existsSync(join(out, "uploads.tar.gz")),
    },
  };
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Catalogue exported to ${out}/`);
  console.table(counts);
  console.log(
    `Excluded ${demoProducts.length} demo product(s) and ${excludedBrands.length} demo-only brand(s).`,
  );
  console.log(`Zeroed ${zeroedReserved} reserved unit(s); cleared staff links on media assets.`);
  console.log(
    `Uploads referenced: ${uploadRefs.size}; missing on disk: ${missingUploads.length}${
      missingUploads.length ? ` (e.g. ${missingUploads.slice(0, 3).join(", ")})` : ""
    }.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
