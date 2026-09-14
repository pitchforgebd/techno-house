/**
 * Query / performance baseline (P17-T03).
 *
 *   npm run test:queries
 *
 * Static guards against known regressions. Not a load test.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function main(): void {
  const root = process.cwd();

  const listsActions = readFileSync(
    join(root, "features/lists/actions.ts"),
    "utf8",
  );
  check(
    "wishlist/compare uses listBySlugs (no per-slug getBySlug loop)",
    listsActions.includes("listBySlugs") && !listsActions.includes("getBySlug"),
  );

  const cartActions = readFileSync(
    join(root, "features/cart/actions.ts"),
    "utf8",
  );
  check(
    "cart product load uses listBySlugs",
    cartActions.includes("listBySlugs"),
  );

  const productRepo = readFileSync(
    join(root, "lib/data/prisma/product-repository.ts"),
    "utf8",
  );
  check(
    "product list caps page size",
    productRepo.includes("MAX_PAGE_SIZE") &&
      productRepo.includes("normalizePage"),
  );
  check(
    "builder slot candidates are capped",
    productRepo.includes("MAX_SLOT_CANDIDATES"),
  );
  check(
    "product list uses select summaries",
    productRepo.includes("SUMMARY_SELECT"),
  );

  const sitemap = readFileSync(join(root, "lib/seo/sitemap.ts"), "utf8");
  check(
    "sitemap product crawl is capped",
    sitemap.includes("PRODUCT_LIMIT") &&
      sitemap.includes("take: PRODUCT_LIMIT"),
  );

  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  check(
    "Product has listing indexes",
    schema.includes("@@index([isActive, position])") &&
      schema.includes("@@index([categoryId])") &&
      schema.includes("@@index([brandId])"),
  );
  check(
    "ProductReview has product/status index",
    schema.includes("@@index([productId, status])"),
  );

  console.log(
    failures === 0
      ? `query baseline ok (${checks} checks)`
      : `query baseline failed (${failures}/${checks})`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
