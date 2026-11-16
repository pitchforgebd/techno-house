/**
 * Similar-products ranking contract.
 *
 *   npm run test:similar-products
 *
 * The product page offers items from the product's own category; this pins
 * the order they come in (closest first) and that it is deterministic. No
 * database, no network.
 */
import { rankSimilarProducts } from "@/lib/catalog/similar-products";
import type { ProductSummary } from "@/lib/data";

let failures = 0;
function check(name: string, condition: unknown): void {
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function make(
  slug: string,
  name: string,
  over: Partial<ProductSummary> = {},
): ProductSummary {
  return {
    id: slug,
    slug,
    name,
    brandSlug: "kingston",
    brandName: "Kingston",
    categorySlug: "ram-desktop",
    price: { amount: 5000, currency: "BDT" },
    stockStatus: "in_stock",
    isComingSoon: false,
    isPreOrder: false,
    ...over,
  } as ProductSummary;
}

const current = make("self", "Kingston Fury 16GB DDR5 6000MHz Desktop RAM");
const pool = [
  make("self", current.name),
  make("ddr4", "Kingston Fury 8GB DDR4 3200MHz Desktop RAM"),
  make("ddr5-other-brand", "Corsair Vengeance 16GB DDR5 6000MHz RAM", {
    brandSlug: "corsair",
    brandName: "Corsair",
  }),
  make("ddr5-same-brand", "Kingston Fury 32GB DDR5 6000MHz Desktop RAM"),
  make("oos", "Kingston Fury 16GB DDR5 6000MHz RAM", {
    stockStatus: "out_of_stock",
  }),
  make("child-cat", "Kingston Fury 16GB DDR5 6000MHz Desktop RAM", {
    categorySlug: "ram-desktop-gaming",
  }),
];

const ranked = rankSimilarProducts(current, pool, 10);
check("the product itself is never listed", !ranked.some((p) => p.slug === "self"));
check("same brand + same DDR generation comes first", ranked[0]?.slug === "ddr5-same-brand");
check("DDR5 outranks DDR4", ranked.findIndex((p) => p.slug === "ddr5-other-brand") < ranked.findIndex((p) => p.slug === "ddr4"));
check("a sub-category item is still offered", ranked.some((p) => p.slug === "child-cat"));
check("limit is honoured", rankSimilarProducts(current, pool, 2).length === 2);
check("deterministic", JSON.stringify(rankSimilarProducts(current, pool, 10)) === JSON.stringify(ranked));

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("ok similar-products");
