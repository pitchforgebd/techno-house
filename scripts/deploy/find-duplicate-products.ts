/**
 * Read-only report of products that look like the same item listed twice.
 *
 *   npm run catalog:find-duplicates                      # every category
 *   npm run catalog:find-duplicates -- --category=motherboard
 *   npm run catalog:find-duplicates -- --category=motherboard --exact-only
 *   npm run catalog:find-duplicates -- --category=motherboard --active-only
 *   npm run catalog:find-duplicates -- --category=motherboard --csv=dups-motherboard.csv
 *
 * Why it exists: two product lists were loaded into the same shop with
 * different SKU schemes (a hand-made list with `GB-…` SKUs and the SMART POS
 * export with `GIG-…`), so the same board can be on sale twice. SKUs cannot
 * reveal that; names can.
 *
 * Two products are grouped when, within the SAME brand and category, their
 * names match after normalising (upper-case, punctuation and the brand's own
 * name removed):
 *   - "same name"      — identical after normalising: a real duplicate;
 *   - "similar names"  — one name's model text sits inside the other's longer
 *     one. This is where VARIANTS show up ("Z890-P", "Z890-P WIFI", "Z890-P
 *     WIFI6E" are three different boards), so every listing shows the words it
 *     adds to the group's shortest name (`+WIFI6E`) — read those to tell a
 *     variant from the same board with a longer title.
 * Different brands never group: an MSI and a Gigabyte "B650M GAMING WIFI" are
 * different products. `--exact-only` hides the "similar names" groups.
 *
 * `--csv=<file>` also writes a worksheet (see `duplicate-listings.ts`): inside
 * each group, listings that differ only by spec filler are TWINS with a
 * suggested KEEP / DEACTIVATE; listings that differ by a real word are
 * VARIANTS marked LEAVE. A KEEP/DEACTIVATE is only suggested when both twins
 * agree on the memory type (the `builderRamType` tag, else the title); when it
 * is missing on one or they differ ("X" next to "X DDR4" is usually the DDR5
 * and the DDR4 board) the rows are REVIEW and nothing is suggested for
 * deactivation. The file is created, never overwritten, and has an empty
 * `your_decision` column to fill in.
 *
 * It only reads. It never changes, hides or deletes anything — a person decides
 * which listing to keep (usually the one with stock, or the older one) and
 * switches the other off in Admin → Products.
 *
 * Treat "similar names" as "possible" only.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import {
  addedTokens,
  buildWorksheetCsv,
  formatAddsForConsole,
  groupItems,
  normalise,
  proposeGroup,
  summariseWorksheet,
  type DuplicateItem,
  type WorksheetRow,
} from "./duplicate-listings";

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const categorySlug = arg("category");
  const csvPath = arg("csv");
  const activeOnly = process.argv.includes("--active-only");
  const exactOnly = process.argv.includes("--exact-only");
  const prisma = getPrisma();

  const rows = await prisma.product.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    select: {
      id: true,
      sku: true,
      name: true,
      isActive: true,
      priceAmount: true,
      createdAt: true,
      brandId: true,
      categoryId: true,
      brand: { select: { name: true } },
      category: { select: { slug: true } },
      builderRamType: true,
      stock: { select: { quantity: true } },
    },
  });

  const buckets = new Map<string, DuplicateItem[]>();
  const categoryOf = new Map<string, string>();
  for (const row of rows) {
    const bucket = `${row.brandId}|${row.categoryId}`;
    categoryOf.set(bucket, `${row.brand.name} / ${row.category.slug}`);
    const item: DuplicateItem = {
      id: row.id,
      sku: row.sku,
      name: row.name.replace(/\s+/g, " ").trim(),
      isActive: row.isActive,
      priceAmount: Number(row.priceAmount),
      createdAt: row.createdAt,
      key: normalise(row.name, row.brand.name),
      stock: Number(row.stock?.quantity ?? 0),
      ramType: row.builderRamType,
    };
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), item]);
  }

  const found: { label: string; group: DuplicateItem[]; exact: boolean }[] = [];
  for (const [bucket, items] of buckets) {
    for (const group of groupItems(items)) {
      const exact = group.every((item) => item.key === group[0]!.key);
      if (exactOnly && !exact) continue;
      found.push({ label: categoryOf.get(bucket) ?? bucket, group, exact });
    }
  }
  found.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      b.group.length - a.group.length ||
      a.label.localeCompare(b.label),
  );

  const scope = categorySlug ? `category "${categorySlug}"` : "all categories";
  console.log(
    `Scanned ${rows.length} product(s) in ${scope}${activeOnly ? " (active only)" : ""}.`,
  );
  if (found.length === 0) {
    console.log("No possible duplicates found.");
    return;
  }
  let extra = 0;
  let exactGroups = 0;
  for (const { label, group, exact } of found) {
    extra += group.length - 1;
    if (exact) exactGroups += 1;
    console.log(
      `\n=== ${label} — ${group.length} listings, ${exact ? "SAME NAME (real duplicate)" : "similar names (check the differences — may be variants)"} ===`,
    );
    const base = [...group].sort((a, b) => a.key.length - b.key.length)[0]!;
    const ordered = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const item of ordered) {
      console.log(
        `  ${item.isActive ? "A" : "-"}  ${item.sku.padEnd(34)} ৳${String(item.priceAmount).padStart(7)}  stock ${String(item.stock).padStart(3)}  ${item.createdAt.toISOString().slice(0, 10)}  ${item.name.slice(0, 70)}`,
      );
      if (!exact && item !== base) {
        console.log(`       adds: ${formatAddsForConsole(addedTokens(item, group))}`);
      }
    }
  }
  console.log(
    `\n${found.length} group(s) (${exactGroups} same-name), ${extra} extra listing(s). A = active, - = inactive. Oldest first.`,
  );

  if (csvPath) {
    const worksheet: WorksheetRow[] = found.flatMap(({ label, group }, index) =>
      proposeGroup(group).map((row) => ({ ...row, group: index + 1, category: label })),
    );
    const target = resolve(csvPath);
    try {
      writeFileSync(target, buildWorksheetCsv(worksheet), { flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        console.error(`\nNot written: ${target} already exists (it is never overwritten). Pick another name.`);
        process.exitCode = 1;
        return;
      }
      throw error;
    }
    const s = summariseWorksheet(worksheet);
    console.log(
      `\nWorksheet written to ${target}\n` +
        `  twin sets (same board, one to keep): ${s.twinSets}\n` +
        `  suggested DEACTIVATE: ${s.deactivate}   already inactive: ${s.alreadyOff}\n` +
        `  REVIEW (memory type unclear or different, nothing suggested): ${s.review}\n` +
        `  LEAVE (variants / no twin): ${s.leave}`,
    );
  }
  console.log("Read-only: nothing was changed. Switch the unwanted listing off in Admin → Products.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
