/**
 * Read-only report of products that look like the same item listed twice.
 *
 *   npm run catalog:find-duplicates                      # every category
 *   npm run catalog:find-duplicates -- --category=motherboard
 *   npm run catalog:find-duplicates -- --category=motherboard --exact-only
 *   npm run catalog:find-duplicates -- --category=motherboard --active-only
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
 * It only reads. It never changes, hides or deletes anything — a person decides
 * which listing to keep (usually the one with stock, or the older one) and
 * switches the other off in Admin → Products.
 *
 * Treat "similar names" as "possible" only.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

const NOISE = new Set([
  "PROMOTIONAL",
  "MARKETING",
  "GIFT",
  "SAMPLE",
  "WARRANTY",
  "YEAR",
  "YEARS",
  "YR",
]);

type Item = {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
  priceAmount: number;
  createdAt: Date;
  key: string;
  stock: number;
};

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function normalise(name: string, brandName: string): string {
  const brandTokens = new Set(
    brandName.toUpperCase().replace(/[^A-Z0-9]+/g, " ").split(" ").filter(Boolean),
  );
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !brandTokens.has(token) && !NOISE.has(token))
    .join(" ");
}

/** True when the shorter key is a real model string (not a stray word) found inside the longer. */
function contained(shorter: string, longer: string): boolean {
  return (
    shorter.length >= 8 &&
    shorter.split(" ").length >= 2 &&
    /[0-9]/.test(shorter) &&
    ` ${longer} `.includes(` ${shorter} `)
  );
}

function groupItems(items: Item[]): Item[][] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      const x = items[a]!.key;
      const y = items[b]!.key;
      if (!x || !y) continue;
      const same =
        x === y || (x.length <= y.length ? contained(x, y) : contained(y, x));
      if (same) parent[find(a)] = find(b);
    }
  }
  const groups = new Map<number, Item[]>();
  items.forEach((item, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}

async function main(): Promise<void> {
  const categorySlug = arg("category");
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
      stock: { select: { quantity: true } },
    },
  });

  const buckets = new Map<string, Item[]>();
  const categoryOf = new Map<string, string>();
  for (const row of rows) {
    const bucket = `${row.brandId}|${row.categoryId}`;
    categoryOf.set(bucket, `${row.brand.name} / ${row.category.slug}`);
    const item: Item = {
      id: row.id,
      sku: row.sku,
      name: row.name.replace(/\s+/g, " ").trim(),
      isActive: row.isActive,
      priceAmount: Number(row.priceAmount),
      createdAt: row.createdAt,
      key: normalise(row.name, row.brand.name),
      stock: Number(row.stock?.quantity ?? 0),
    };
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), item]);
  }

  const found: { label: string; group: Item[]; exact: boolean }[] = [];
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
    const baseTokens = new Set(base.key.split(" "));
    const ordered = [...group].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    for (const item of ordered) {
      console.log(
        `  ${item.isActive ? "A" : "-"}  ${item.sku.padEnd(34)} ৳${String(item.priceAmount).padStart(7)}  stock ${String(item.stock).padStart(3)}  ${item.createdAt.toISOString().slice(0, 10)}  ${item.name.slice(0, 70)}`,
      );
      if (!exact && item !== base) {
        const added = item.key.split(" ").filter((token) => !baseTokens.has(token));
        console.log(
          `       adds: ${added.length ? `+${added.slice(0, 8).join(" +")}${added.length > 8 ? " …" : ""}` : "(nothing — same words, different order)"}`,
        );
      }
    }
  }
  console.log(
    `\n${found.length} group(s) (${exactGroups} same-name), ${extra} extra listing(s). A = active, - = inactive. Oldest first.`,
  );
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
