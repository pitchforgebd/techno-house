/**
 * Product page meta: stored text renders, no stored text = today's output.
 *
 *   npm run test:seo-product-meta                       # offline (source pins)
 *   npm run test:seo-product-meta -- --base=http://127.0.0.1:3200 --old=http://127.0.0.1:3201 [--sample=60]
 *
 * Offline: generateMetadata resolves stored text through resolveProductMeta and
 * the repository / admin selects carry the new columns.
 *
 * Live (needs DATABASE_URL = the DB both servers use; read-only):
 *  - NEW build (--base) vs PREVIOUS build (--old, the code before phase 8,
 *    same database): for a spread of products WITHOUT stored meta the
 *    <title>, meta description, og:title and og:description must be
 *    byte-identical, i.e. a page with no stored meta keeps today's output.
 *  - for products WITH stored metaTitle / metaDescription the NEW build must
 *    render them verbatim as <title>, meta description and og:*; a stored
 *    title-only product keeps the template description.
 * Exit code 1 on any failure.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

// --- offline -------------------------------------------------------------------

const page = read("app/(storefront)/product/[slug]/page.tsx");
check("generateMetadata resolves stored meta through resolveProductMeta", page.includes("resolveProductMeta(variant ? {} : product, {"));
check("template title/description are still computed (fallback)", page.includes("const templateTitle = productTitle(") && page.includes("const templateDescription = productDescription({"));
check("stored text applies to the plain product URL only (variant links keep the variant title)", page.includes("variant ? {} : product"));
check("storefront select reads metaTitle + metaDescription", /metaTitle: true,\s*metaDescription: true,/.test(read("lib/data/prisma/product-repository.ts")));
check("admin editor select reads the SEO columns + source", /metaTitle: true,\s*metaDescription: true,\s*seoSource: true,/.test(read("lib/catalog/admin-products.ts")));
check("admin save decides the write with planSeoMetaWrite", read("lib/catalog/admin-products.ts").includes("...planSeoMetaWrite(parsed, existing)"));
const form = read("features/admin/products/admin-product-form.tsx");
check("admin form submits metaTitle + metaDescription", /overviewHtml,\s*detailsHtml,\s*metaTitle,\s*metaDescription,/.test(form));
check("admin form no longer keeps throw-away seoTitle/seoDescription state", !form.includes("setSeoTitle") && !form.includes("setSeoDescription"));
check("admin form has 60 / 155 counters and a suggestion", form.includes("SEO_TITLE_MAX") && form.includes("SEO_DESC_MAX") && form.includes("Use suggestion"));
check("migration is additive and nullable", /ADD COLUMN\s+"metaTitle" TEXT,/.test(read("prisma/migrations/20261111120000_product_seo_meta/migration.sql")) && !/NOT NULL|DROP /i.test(read("prisma/migrations/20261111120000_product_seo_meta/migration.sql").replace(/--.*$/gm, "")));
check("JSON-LD builder untouched by phase 8 (no meta fields)", !read("lib/seo/json-ld.ts").includes("metaTitle"));

// --- live ----------------------------------------------------------------------

const decode = (text: string) =>
  text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
type Head = { title: string; description: string; ogTitle: string; ogDescription: string };
async function head(base: string, slug: string): Promise<Head | null> {
  const response = await fetch(`${base}/product/${encodeURIComponent(slug)}`, { headers: { "User-Agent": "Googlebot" } });
  if (response.status !== 200) return null;
  const html = await response.text();
  const top = html.slice(0, html.indexOf("</head>") > 0 ? html.indexOf("</head>") : 60000);
  const meta = (attr: string, key: string) => decode(top.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? "");
  return {
    title: decode(top.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    description: meta("name", "description"),
    ogTitle: meta("property", "og:title"),
    ogDescription: meta("property", "og:description"),
  };
}

async function live(base: string, old: string | undefined): Promise<void> {
  const { getPrisma } = await import("@/lib/db/prisma");
  const prisma = getPrisma();
  const sample = Number(arg("sample") ?? 60);
  const ids = await prisma.product.findMany({ where: { isActive: true, metaTitle: null, metaDescription: null }, select: { slug: true }, orderBy: { id: "asc" } });
  const step = Math.max(1, Math.floor(ids.length / sample));
  const plain = ids.filter((_, i) => i % step === 0).slice(0, sample).map((row) => row.slug);
  check("sampled products without stored meta", plain.length > 0);
  if (old) {
    let same = 0;
    for (const slug of plain) {
      const [a, b] = await Promise.all([head(base, slug), head(old, slug)]);
      check(`${slug}: renders on both builds`, Boolean(a && b));
      if (!a || !b) continue;
      const equal = a.title === b.title && a.description === b.description && a.ogTitle === b.ogTitle && a.ogDescription === b.ogDescription;
      check(`${slug}: no stored meta -> identical title/description/og to the previous build`, equal, equal ? "" : `new  ${JSON.stringify(a)}\n  old  ${JSON.stringify(b)}`);
      if (equal) same += 1;
    }
    console.log(`identical to the previous build: ${same}/${plain.length} products without stored meta`);
  } else {
    console.log("note: no --old build given; the identical-to-previous-build comparison was skipped");
  }

  const stored = await prisma.product.findMany({ where: { isActive: true, OR: [{ metaTitle: { not: null } }, { metaDescription: { not: null } }] }, select: { slug: true, metaTitle: true, metaDescription: true }, take: 25 });
  check("at least one product with stored meta to check", stored.length > 0, "store some with apply-product-seo.mjs --apply on the test DB first");
  for (const row of stored) {
    const [a, b] = await Promise.all([head(base, row.slug), old ? head(old, row.slug) : Promise.resolve(null)]);
    check(`${row.slug}: renders`, Boolean(a));
    if (!a) continue;
    if (row.metaTitle) {
      check(`${row.slug}: <title> is the stored title verbatim`, a.title === row.metaTitle, `${a.title} vs ${row.metaTitle}`);
      check(`${row.slug}: og:title is the stored title`, a.ogTitle === row.metaTitle);
    }
    if (row.metaDescription) {
      check(`${row.slug}: meta description is the stored text verbatim`, a.description === row.metaDescription, `${a.description} vs ${row.metaDescription}`);
      check(`${row.slug}: og:description is the stored text`, a.ogDescription === row.metaDescription);
    }
    if (!row.metaDescription && b) {
      check(`${row.slug}: title-only product keeps the template description`, a.description === b.description);
    }
    if (!row.metaTitle && b) {
      check(`${row.slug}: description-only product keeps the template title`, a.title === b.title);
    }
  }
  console.log(`stored-meta products checked: ${stored.length}`);
  await prisma.$disconnect();
}

async function main(): Promise<void> {
  const base = arg("base")?.replace(/\/$/, "");
  if (base) await live(base, arg("old")?.replace(/\/$/, ""));
  console.log(failures === 0 ? `ok ${checks} product-meta checks` : `failed ${failures}/${checks} product-meta checks`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
