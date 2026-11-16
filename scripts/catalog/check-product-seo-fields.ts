/**
 * Product form "SEO meta tags" card persists every field (AD-412).
 *
 *   npm run test:product-seo-fields
 *
 * Operator: "SEO meta tags e kichu add kore refresh dile dekha jay na, input
 * box gula khali thake". Meta title / description already saved; the Meta
 * image box was a read-only placeholder and both Tags boxes (one here, one in
 * Product configuration) were never submitted. Against the real database this
 * pins: meta image + tags save, load back into the editor, stay untouched by
 * a save that omits them (bulk CSV), clear when blanked, are validated, feed
 * site search; and that the form no longer carries the dead inputs.
 * Fixtures use `SEOFIELDS-` SKUs and are removed in `finally`.
 */
import { readFileSync } from "node:fs";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let failures = 0;
let passes = 0;

function check(label: string, ok: unknown, detail?: string): void {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.error(`fail ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main(): Promise<void> {
  const { getPrisma } = await import("../../lib/db/prisma");
  const { saveAdminProduct, getAdminProductRecord } = await import(
    "../../lib/catalog/admin-products"
  );
  const { parseSearchTags, splitSearchTags } = await import(
    "../../lib/catalog/product-input"
  );
  const { productRepository } = await import("../../lib/data");

  // --- pure -----------------------------------------------------------------
  const tags = parseSearchTags([" Gaming  Case ", "gaming case", "mini,tower", ""]);
  check(
    "tags are trimmed, de-duplicated case-insensitively and lose stored commas",
    tags.ok && tags.value === "Gaming Case, mini tower",
    JSON.stringify(tags),
  );
  check("no tags store null", (() => {
    const empty = parseSearchTags(["", "  "]);
    return empty.ok && empty.value === null;
  })());
  check("over 30 tags is refused", !parseSearchTags(Array.from({ length: 31 }, (_, i) => `t${i}`)).ok);
  check("an over-long tag is refused", !parseSearchTags(["x".repeat(41)]).ok);
  check("stored tags split back", splitSearchTags("a, b ,c").join("|") === "a|b|c");

  // --- source guards ---------------------------------------------------------
  const form = readFileSync("features/admin/products/admin-product-form.tsx", "utf8");
  check("the product form no longer has an unsaved Tags box", !form.includes('id="product-tags"'));
  check(
    "Meta image is a real media picker, not a read-only placeholder",
    /<AdminFormUploadBox\s+label="Meta image"/.test(form) && !form.includes('placeholder="Choose file"'),
  );
  check("the form submits meta image and tags", /metaImageSrc,\s*searchTags,/.test(form));

  // --- database ----------------------------------------------------------------
  const prisma = getPrisma();
  const brand = await prisma.brand.findFirst({ select: { slug: true } });
  const category = await prisma.category.findFirst({
    where: { isActive: true },
    select: { slug: true },
  });
  if (!brand || !category) {
    console.error("fail fixtures — need a Brand and a Category.");
    process.exitCode = 1;
    return;
  }
  const stamp = Date.now();
  const sku = `SEOFIELDS-${stamp}`;
  const slug = `seofields-${stamp}`;
  const base = {
    name: "Seo Fields Probe Case",
    slug,
    sku,
    brandSlug: brand.slug,
    categorySlug: category.slug,
    position: "",
    weightGrams: "",
    price: "1000",
    compareAt: "",
    discountStartsAt: "",
    discountEndsAt: "",
    overview: "",
    quantity: "3",
    lowStockThreshold: "1",
    isActive: true,
    isNew: false,
    isSale: false,
    isComingSoon: false,
    isPreOrder: false,
    warrantyEnabled: false,
    warrantyLabel: "",
    builderSlot: "",
    builderSocket: "",
    builderRamType: "",
    builderFormFactor: "",
    builderTdpWatts: "",
    builderStorageInterface: "",
    youtubeUrl: "",
    pdfSpecificationSrc: "",
  };
  const IMAGE = "/uploads/products/seo-share.png";
  const TAG = `zqx${stamp}`;
  try {
    const created = await saveAdminProduct({
      fields: {
        ...base,
        metaTitle: "Probe Meta Title",
        metaDescription: "Probe meta description.",
        metaImageSrc: IMAGE,
        searchTags: [`${TAG} gaming case`, "mini tower"],
      },
    });
    check("a product saves with meta image and tags", created.ok, JSON.stringify(created));
    if (!created.ok) {
      return;
    }
    const row = () =>
      prisma.product.findUnique({
        where: { id: created.id },
        select: { metaTitle: true, metaImageSrc: true, searchTags: true },
      });
    let saved = await row();
    check(
      "meta image and tags are stored",
      saved?.metaImageSrc === IMAGE && saved.searchTags === `${TAG} gaming case, mini tower`,
      JSON.stringify(saved),
    );
    const editor = await getAdminProductRecord(created.id);
    check(
      "the editor loads them back (what the form shows after a refresh)",
      editor?.metaImageSrc === IMAGE &&
        editor.searchTags?.join("|") === `${TAG} gaming case|mini tower` &&
        editor.metaTitle === "Probe Meta Title",
      JSON.stringify({ img: editor?.metaImageSrc, tags: editor?.searchTags }),
    );

    // A save that omits them (bulk CSV import) leaves them alone.
    const csv = await saveAdminProduct({ currentId: created.id, fields: { ...base } });
    saved = await row();
    check(
      "a save without these fields leaves them untouched",
      csv.ok && saved?.metaImageSrc === IMAGE && saved.searchTags?.startsWith(TAG),
      JSON.stringify(saved),
    );

    const found = await productRepository.list({ q: TAG, page: 1, pageSize: 10, sort: "featured" });
    check(
      "site search finds the product by a tag",
      found.items.some((item) => item.slug === slug),
      `${found.total} hits`,
    );
    const partial = await productRepository.list({ q: `${TAG} gaming`, page: 1, pageSize: 10, sort: "featured" });
    check(
      "…including part of a tag",
      partial.items.some((item) => item.slug === slug),
    );
    const suggestions = await productRepository.searchSuggestions(TAG, 5);
    check(
      "header search suggestions find it by a tag",
      suggestions.items.some((item) => item.slug === slug),
    );
    const detail = await productRepository.getBySlug(slug);
    check("the product page gets the meta image", detail?.metaImageSrc === IMAGE);

    const bad = await saveAdminProduct({
      currentId: created.id,
      fields: { ...base, metaImageSrc: "javascript:alert(1)", searchTags: [] },
    });
    check("an unsafe meta image is refused", !bad.ok);

    const cleared = await saveAdminProduct({
      currentId: created.id,
      fields: { ...base, metaImageSrc: "", searchTags: [] },
    });
    saved = await row();
    check(
      "blanking them clears them",
      cleared.ok && saved?.metaImageSrc === null && saved.searchTags === null,
      JSON.stringify(saved),
    );
  } finally {
    await prisma.product.deleteMany({ where: { sku: { startsWith: "SEOFIELDS-" } } });
    const left = await prisma.product.count({ where: { sku: { startsWith: "SEOFIELDS-" } } });
    check("fixtures are cleaned up", left === 0, `left=${left}`);
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`product seo fields failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`product seo fields ok — ${passes} checks`);
}

main().catch((error) => {
  console.error("product seo fields crashed:", error);
  process.exitCode = 1;
});
