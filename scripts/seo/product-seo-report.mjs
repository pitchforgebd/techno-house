#!/usr/bin/env node
/**
 * Product SEO report — SEO phase 8 (investigation only). READ-ONLY.
 *
 *   npx tsx scripts/seo/product-seo-report.mjs
 *   npx tsx scripts/seo/product-seo-report.mjs --out=docs/seo-reports/product-seo
 *
 * Reads DATABASE_URL from .env.local / .env, only SELECTs, and has no --apply
 * flag at all: nothing here can change data. As defence in depth the Prisma
 * client is wrapped so that any write call (create / update / delete / upsert /
 * $executeRaw …) throws instead of running.
 *
 * It prints which database it read, then writes to --out (git-ignored):
 *   summary.md                 data profile, 15 samples, selection counts,
 *                              title-suffix and slug reports
 *   generated.csv              the proposed SEO title / meta description /
 *                              keywords / image alt for EVERY active product
 *                              (a dry run of what a later apply step would write)
 *   samples.csv                the 15 samples with character counts
 *   profile-categories.csv, profile-brands.csv, selection-counts.csv
 *
 * The generator below is the PROPOSAL from docs/SEO-NOTES.md "Phase 8 plan":
 * deterministic, built only from database fields (name, brand, category,
 * attributes, spec chips). It states no price, stock or warranty. Nothing it
 * produces is stored anywhere; the selection step only COUNTS, it does not
 * choose products.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config as loadEnvFiles } from "dotenv";
import { isJunkAlt } from "@/lib/content/alt-text";
import { getPrisma } from "@/lib/db/prisma";
import { cleanProductName, cutAtWord, productTitle } from "@/lib/seo/page-meta";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

const arg = (name) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const OUT = path.resolve(arg("out") ?? "docs/seo-reports/product-seo");
const SITE = "Techno House";
const TITLE_MAX = 60;
const DESC_MIN = 120;
const DESC_MAX = 155;
const ALT_MAX = 125;
const SAMPLE_COUNT = 15;
const SELECT_TARGET = 500;
const PLACEHOLDER_IMAGE = "/products/placeholder.svg";

// ---------------------------------------------------------------------------
// Read-only guard
// ---------------------------------------------------------------------------

const WRITE_CALLS = new Set([
  "create", "createMany", "createManyAndReturn", "update", "updateMany",
  "upsert", "delete", "deleteMany", "$executeRaw", "$executeRawUnsafe",
  "$transaction", "$runCommandRaw",
]);
function readOnly(prisma) {
  const guard = (target) =>
    new Proxy(target, {
      get(obj, prop) {
        if (typeof prop === "string" && WRITE_CALLS.has(prop)) {
          return () => {
            throw new Error(`product-seo-report is read-only: ${prop} is blocked.`);
          };
        }
        const value = obj[prop];
        return value && typeof value === "object" && !prop.toString().startsWith("$")
          ? guard(value)
          : typeof value === "function"
            ? value.bind(obj)
            : value;
      },
    });
  return guard(prisma);
}

const databaseName = () => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").pathname.replace(/^\//, "");
  } catch {
    return "";
  }
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
async function writeCsv(file, header, rows) {
  const lines = [header.join(","), ...rows.map((row) => header.map((key) => csvCell(row[key])).join(","))];
  await writeFile(path.join(OUT, file), `﻿${lines.join("\r\n")}\r\n`, "utf8");
}
const pct = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : "n/a");
const tally = (items, key) => {
  const map = new Map();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};
const mdTable = (header, rows) =>
  [`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
const squash = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Product type (from the category chain), brand sanity
// ---------------------------------------------------------------------------

/** Catch-all / promotional categories that say nothing about what a product is. */
const UMBRELLA_CATEGORY =
  /^(?:.*\boffers?\b.*|all\b.*|for\b.*|components?|accessories|gadgets?|daily lifestyle|power|security|appliances?|server & storage|office equipment)$/iu;
const KEEP_PLURAL = new Set(["wireless", "cctv", "plus", "series", "gps", "bluetooth", "access", "ups"]);

function singular(name) {
  const words = squash(name.replace(/\([^)]*\)/g, " ")).split(" ");
  const last = words.pop() ?? "";
  let out = last;
  if (/[^aeiou]ies$/i.test(last)) out = last.replace(/ies$/i, "y");
  else if (/s$/i.test(last) && !/ss$/i.test(last) && !KEEP_PLURAL.has(last.toLowerCase())) out = last.replace(/s$/i, "");
  return [...words, out].join(" ");
}

function buildCategoryIndex(categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const chainOf = (id) => {
    const chain = [];
    const seen = new Set();
    for (let cur = byId.get(id); cur && !seen.has(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined) {
      seen.add(cur.id);
      chain.push(cur); // leaf first
    }
    return chain;
  };
  return { byId, chainOf };
}

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Singular, readable type: the first non-umbrella category from the leaf
 * upwards. `redundant` is true when the name already says it: the head noun of
 * ANY non-umbrella category in the chain appears in the name ("Desktop" for a
 * "Star PC" leaf, "Charger" for "Wireless Charger"), so the title does not repeat it.
 */
function productType(chain, name) {
  const candidates = chain
    .filter((category) => !UMBRELLA_CATEGORY.test(squash(category.name)))
    .map((category) => singular(category.name))
    .filter(Boolean);
  const type = candidates[0] ?? "";
  const head = (text) => text.split(" ").pop() ?? "";
  const redundant = candidates.some((text) => new RegExp(`\\b${escapeRe(head(text))}s?\\b`, "i").test(name));
  return { type, redundant };
}

const GENERIC_BRAND = /^(?:no ?brand|unbranded|other|others|generic|unknown|n\/a)$/i;

/** Families used for the 15 samples and the selection counts. First match wins. */
const FAMILIES = [
  { name: "laptop", re: /laptop|notebook|macbook/i, tier: 1, group: "laptop" },
  { name: "desktop", re: /desktop|gaming pc|brand pc|all-in-one|star pc/i, tier: 1, group: "desktop" },
  { name: "monitor", re: /monitor/i, tier: 1, group: "monitor" },
  { name: "processor", re: /processor/i, tier: 1, group: "component" },
  { name: "graphics card", re: /graphics card|\bgpu\b/i, tier: 1, group: "component" },
  { name: "ssd", re: /\bssd\b|nvme/i, tier: 1, group: "component" },
  { name: "ram", re: /\bram\b|memory/i, tier: 1, group: "component" },
  { name: "motherboard", re: /motherboard/i, tier: 1, group: "component" },
  { name: "printer", re: /printer/i, tier: 1, group: "printer" },
  { name: "cable", re: /cable/i, tier: 2, group: "networking cable" },
  { name: "networking", re: /network|router|switch|wifi|wi-fi/i, tier: 1, group: "networking cable" },
  { name: "camera", re: /camera|cctv|security/i, tier: 1, group: "camera" },
  { name: "accessory", re: /keyboard|mouse|headphone|headset|speaker|webcam|earbud|charger|bag|cooler/i, tier: 2, group: "accessory" },
  { name: "power supply & case", re: /power supply|\bpsu\b|casing|case/i, tier: 2, group: "component" },
];
const SAMPLE_GROUPS = ["laptop", "desktop", "monitor", "printer", "networking cable", "camera", "accessory", "component"];
function familyOf(chain) {
  const leaf = squash((chain[0]?.name ?? "").replace(/\([^)]*\)/g, " "));
  const text = chain.map((category) => category.name).join(" > ");
  return (
    FAMILIES.find((family) => family.re.test(leaf)) ??
    FAMILIES.find((family) => family.re.test(text)) ?? { name: "other", tier: 3, group: "other" }
  );
}

// ---------------------------------------------------------------------------
// The proposed generator (deterministic, database fields only)
// ---------------------------------------------------------------------------

/** Spec order per family: which attributes say most about the product. */
const SPEC_ORDER = {
  laptop: ["processor", "ram", "storage", "graphics", "size"],
  desktop: ["processor", "ram", "storage", "graphics"],
  monitor: ["size", "panel", "connectivity"],
  component: ["socket", "formFactor", "ramType", "capacity", "wattage", "cores", "coolerType", "memory", "graphics"],
  default: ["processor", "ram", "storage", "capacity", "size", "panel", "socket", "formFactor", "ramType", "wattage", "cores", "connectivity", "audioType", "coolerType", "memory", "graphics"],
};
/** How a raw value reads in a sentence. {v} = value. */
const SPEC_FORMAT = {
  processor: (v) => (/processor|cores?\b|intel|ryzen|amd|apple|snapdragon|\bm\d/i.test(v) ? v : `${v} processor`),
  ram: (v) => (/ram|memory/i.test(v) ? v : `${v} RAM`),
  storage: (v) => (/ssd|hdd|nvme|emmc|storage/i.test(v) ? v : `${v} storage`),
  size: (v) => `${v} display`,
  panel: (v) => `${v} panel`,
  socket: (v) => `${v} socket`,
  capacity: (v) => `${v} capacity`,
  memory: (v) => `${v} memory`,
  cores: (v) => v,
  formFactor: (v) => v,
  ramType: (v) => v,
  wattage: (v) => v,
  connectivity: (v) => v,
  audioType: (v) => v,
  coolerType: (v) => v,
  graphics: (v) => v,
};
const BOOLEANISH = /^(?:yes|no|true|false|none|n\/a|na|-|unknown|null)$/i;
/** `graphics` carries junk ("Headset", "Keyboard") on some products: only GPU-looking values pass. */
const VALUE_RULES = { graphics: /rtx|gtx|radeon|\brx\b|arc\b|\d+\s?gb|integrated|uhd|iris|vega|geforce|quadro/i };

function cleanSpecValue(key, raw) {
  const value = squash(raw);
  if (!value || value.length > 28 || BOOLEANISH.test(value)) return "";
  if (VALUE_RULES[key] && !VALUE_RULES[key].test(value)) return "";
  return value;
}

function pickSpecs(product, group, coreName, max) {
  const order = SPEC_ORDER[group] ?? SPEC_ORDER.default;
  const byKey = new Map(product.attributeValues.map((entry) => [entry.attribute.key, entry]));
  const haystack = coreName.toLowerCase();
  const out = [];
  const seen = new Set();
  const push = (text, value) => {
    const key = value.toLowerCase();
    // Skip a value already in the name, or one that contains / is contained in
    // a spec already chosen ("512GB" vs "512GB SSD").
    if (!text || haystack.includes(key) || [...seen].some((other) => other.includes(key) || key.includes(other))) return;
    seen.add(key);
    out.push(text);
  };
  for (const key of order) {
    const value = cleanSpecValue(key, byKey.get(key)?.value);
    if (value) push((SPEC_FORMAT[key] ?? ((v) => v))(value), value);
  }
  // Attributes not in this family's order, then spec chips, as fill.
  for (const [key, entry] of byKey) {
    if (order.includes(key) || key === "Weight" || key === "microphone") continue;
    const value = cleanSpecValue(key, entry.value);
    if (value) push((SPEC_FORMAT[key] ?? ((v) => v))(value), value);
  }
  for (const chip of [...product.specChips].sort((a, b) => a.position - b.position)) {
    const value = cleanSpecValue("chip", chip.value);
    if (!value) continue;
    const label = squash(chip.label).toLowerCase();
    push(label && !value.toLowerCase().includes(label) && value.length <= 12 ? `${value} ${label}` : value, value);
  }
  return out.slice(0, max);
}

/**
 * "{Brand} {Model} {Type} Price in Bangladesh", at most 60 characters.
 * Rules, in order:
 *  1. base = first block of the cleaned name (POS code, warranty blocks and
 *     comma-separated spec tails already dropped), brand first;
 *  2. add the type word unless the name already contains it;
 *  3. whole base fits with " Price in Bangladesh" -> use it;
 *  4. else drop the spec tail: keep the brand plus everything up to and
 *     including the first model token (a token with a digit);
 *  5. still too long -> use " Price in BD";
 *  6. still too long -> drop the type word, then cut at a word boundary;
 *  7. " | Techno House" is appended only if the result still fits in 60.
 */
function buildTitle(base, type) {
  const tokens = squash(base).split(" ").filter(Boolean);
  const modelIdx = tokens.findIndex((token, i) => i > 0 && /\d/.test(token));
  const keep = Math.min(tokens.length, modelIdx >= 0 ? modelIdx + 1 : 3);
  const withType = (slice) => {
    const text = slice.join(" ");
    return type && !new RegExp(`\\b${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i").test(text) ? `${text} ${type}` : text;
  };
  const attempts = [
    { slice: tokens, rule: "full" },
    { slice: tokens.slice(0, keep), rule: "model only (spec tail dropped)" },
  ];
  for (const suffix of [" Price in Bangladesh", " Price in BD"]) {
    for (const { slice, rule } of attempts) {
      const core = withType(slice);
      if ((core + suffix).length <= TITLE_MAX) {
        const branded = `${core}${suffix} | ${SITE}`;
        return {
          title: branded.length <= TITLE_MAX ? branded : core + suffix,
          core: slice.join(" "),
          coreWithType: core,
          rule: `${rule}${suffix.includes("BD") ? ", 'Price in BD' fallback" : ""}${branded.length <= TITLE_MAX ? " + brand suffix" : ""}`,
        };
      }
    }
  }
  const cut = cutAtWord(tokens.slice(0, keep).join(" "), TITLE_MAX - " Price in BD".length);
  return { title: `${cut} Price in BD`, core: cut, coreWithType: cut, rule: "cut at word (very long model)" };
}

/** 120–155 chars: "{Name}: spec, spec, spec. Price in BD at Techno House. Delivery in Dhaka and across Bangladesh." */
function buildDescription(core, specs) {
  const price = `Price in BD at ${SITE}.`;
  const delivery = "Delivery in Dhaka and across Bangladesh.";
  const fillers = ["Compare specs and order online.", "Order online today."];
  const flags = [];
  const assemble = (n, extra = []) => {
    const head = n > 0 ? `${core}: ${specs.slice(0, n).join(", ")}.` : `${core}.`;
    return [head, price, delivery, ...extra].join(" ");
  };
  let n = Math.min(4, specs.length);
  let text = assemble(n);
  while (text.length > DESC_MAX && n > 0) {
    n -= 1;
    text = assemble(n);
  }
  if (text.length > DESC_MAX) {
    text = [`${cutAtWord(core, 70)}.`, price, delivery].join(" ");
    flags.push("name cut");
  }
  const extra = [];
  for (const filler of fillers) {
    if (text.length >= DESC_MIN) break;
    if (assemble(n, [...extra, filler]).length <= DESC_MAX) {
      extra.push(filler);
      text = assemble(n, extra);
    }
  }
  if (n < 3) flags.push(`only ${n} spec${n === 1 ? "" : "s"}`);
  if (text.length < DESC_MIN) flags.push("under 120 chars");
  return { text, specsUsed: n, flags };
}

function generate(product, ctx) {
  const chain = ctx.chainOf(product.categoryId);
  const family = familyOf(chain);
  const brand = squash(product.brand?.name);
  const cleaned = cleanProductName(product.name, GENERIC_BRAND.test(brand) ? "" : brand);
  const base = cleaned.blocks[0] ?? squash(product.name);
  const { type, redundant } = productType(chain, cleaned.clean || product.name);
  const title = buildTitle(base, redundant ? "" : type);
  const specs = pickSpecs(product, family.group, title.coreWithType, 4);
  const description = buildDescription(title.coreWithType, specs);
  const model = title.core;
  const keywordBase = cutAtWord(model, 50).toLowerCase();
  const primary = `${keywordBase} price in bangladesh`;
  const secondary = [
    `${keywordBase} price in bd`,
    `${keywordBase} specs`,
    `${keywordBase} review`,
    type ? `${brand} ${type} price in bangladesh`.toLowerCase() : "",
  ].filter(Boolean);
  const image = [...product.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position)[0] ?? null;
  const alt = cutAtWord(title.coreWithType, ALT_MAX);
  return {
    family, type, chain, specs, specCountAll: product.attributeValues.length + product.specChips.length + product.specGroups.reduce((sum, group) => sum + group.rows.length, 0),
    seoTitle: title.title, titleRule: title.rule, metaDescription: description.text, descFlags: description.flags, specsUsed: description.specsUsed,
    primaryKeyword: primary, secondaryKeywords: secondary, imageAlt: alt, image,
  };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PRODUCT_SELECT = {
  id: true, slug: true, name: true, sku: true, modelNumber: true, categoryId: true,
  priceAmount: true, stockStatus: true, isComingSoon: true, isPreOrder: true,
  overview: true, overviewHtml: true, detailsHtml: true,
  brand: { select: { name: true } },
  images: { select: { src: true, alt: true, isPrimary: true, position: true } },
  attributeValues: { select: { value: true, attribute: { select: { key: true, label: true } } } },
  specChips: { select: { label: true, value: true, position: true } },
  specGroups: { select: { rows: { select: { id: true } } } },
  stock: { select: { quantity: true, reserved: true } },
};

async function loadProducts(prisma) {
  const all = [];
  let cursor;
  for (;;) {
    const batch = await prisma.product.findMany({
      where: { isActive: true },
      select: PRODUCT_SELECT,
      orderBy: { id: "asc" },
      take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (batch.length === 0) break;
    all.push(...batch);
    cursor = batch[batch.length - 1].id;
  }
  return all;
}

const inStock = (product) => product.stockStatus === "IN_STOCK" || product.stockStatus === "LOW_STOCK";
const hasRealImage = (product) => product.images.some((image) => image.src && image.src !== PLACEHOLDER_IMAGE);
const hasDescription = (product) =>
  product.overview.some((line) => line.trim()) || Boolean(product.overviewHtml?.trim()) || Boolean(product.detailsHtml?.trim());

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

async function main() {
  const prisma = readOnly(getPrisma());
  console.log(`database: ${databaseName()} — READ-ONLY (no --apply exists; writes are blocked)`);
  await mkdir(OUT, { recursive: true });

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } });
  const ctx = buildCategoryIndex(categories);
  const products = await loadProducts(prisma);
  const total = products.length;

  const columns = await prisma.$queryRaw`select column_name from information_schema.columns where table_name = 'Product' and column_name in ('metaTitle','metaDescription','seoTitle','seoDescription','metaKeywords')`;
  const metaColumns = columns.map((row) => row.column_name);

  // Generate for everything (also feeds profile + selection).
  const rows = products.map((product) => {
    const generated = generate(product, ctx);
    const current = productTitle(product.name, product.brand?.name ?? "");
    return { product, generated, current };
  });

  // ---- a) profile --------------------------------------------------------
  const rootOf = (row) => row.generated.chain[row.generated.chain.length - 1]?.name ?? "(none)";
  const byRoot = tally(rows, rootOf);
  const byLeaf = tally(rows, (row) => row.generated.chain[0]?.name ?? "(none)");
  const byBrand = tally(rows, (row) => squash(row.product.brand?.name) || "(none)");
  const lengths = rows.map((row) => row.product.name.length);
  const count = (predicate) => rows.filter(predicate).length;
  const withDescription = count((row) => hasDescription(row.product));
  const withOverviewHtml = count((row) => Boolean(row.product.overviewHtml?.trim()));
  const withDetailsHtml = count((row) => Boolean(row.product.detailsHtml?.trim()));
  const withAttributes = count((row) => row.product.attributeValues.length > 0);
  const withChips = count((row) => row.product.specChips.length > 0 || row.product.specGroups.length > 0);
  const withAnySpec = count((row) => row.generated.specCountAll > 0);
  const withThreeSpecs = count((row) => row.generated.specCountAll >= 3);
  const withModelNumber = count((row) => Boolean(row.product.modelNumber?.trim()));
  const withBrand = count((row) => row.product.brand?.name && !GENERIC_BRAND.test(squash(row.product.brand.name)));
  const withType = count((row) => row.generated.type);
  const withImage = count((row) => hasRealImage(row.product));
  const withPrice = count((row) => row.product.priceAmount > 0);
  const stockCounts = tally(rows, (row) => row.product.stockStatus);
  const mainAlts = rows.map((row) => row.generated.image);
  const junkAlt = mainAlts.filter((image) => image && isJunkAlt(image.alt)).length;
  const altIsName = rows.filter((row) => row.generated.image && squash(row.generated.image.alt) === squash(row.product.name)).length;

  await writeCsv("profile-categories.csv", ["root_category", "leaf_category", "products"],
    tally(rows, (row) => `${rootOf(row)}\u0000${row.generated.chain[0]?.name ?? "(none)"}`).map(([key, products]) => {
      const [root, leaf] = key.split("\u0000");
      return { root_category: root, leaf_category: leaf, products };
    }));
  await writeCsv("profile-brands.csv", ["brand", "products"], byBrand.map(([brand, products]) => ({ brand, products })));

  // ---- title suffix (item 6) --------------------------------------------
  const currentLens = rows.map((row) => row.current.length);
  const endsBd = rows.filter((row) => / Price in BD(?: \| Techno House)?$/.test(row.current)).length;
  const toBangladesh = (title) => title.replace(/ Price in BD/, " Price in Bangladesh");
  const stillFits = rows.filter((row) => toBangladesh(row.current).length <= TITLE_MAX).length;
  const withBrandSuffix = rows.filter((row) => row.current.endsWith(` | ${SITE}`)).length;
  const brandSuffixLosesTheFit = rows.filter((row) => row.current.endsWith(` | ${SITE}`) && toBangladesh(row.current).length > TITLE_MAX).length;
  const newLens = rows.map((row) => row.generated.seoTitle.length);
  const newBangladesh = rows.filter((row) => row.generated.seoTitle.includes("Price in Bangladesh")).length;
  const newChanged = rows.filter((row) => row.generated.seoTitle !== row.current).length;

  // ---- slugs (item 6) ----------------------------------------------------
  const slugLens = rows.map((row) => row.product.slug.length);
  const segs = (slug) => slug.split("-").length;
  const slugAtMax = rows.filter((row) => row.product.slug.length >= 80).length;
  const slugLongSpec = rows.filter((row) => segs(row.product.slug) >= 8 || /\d+(?:gb|tb|mhz|w|inch)/.test(row.product.slug)).length;
  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const proposedSlug = (row) => slugify(row.generated.titleCoreForSlug ?? row.generated.seoTitle.replace(/ Price in (?:Bangladesh|BD)(?: \| Techno House)?$/, "")).slice(0, 60).replace(/-+$/, "");

  // ---- samples (b) -------------------------------------------------------
  const score = (row) => [inStock(row.product), row.product.priceAmount > 0, hasRealImage(row.product), row.generated.type, row.generated.specCountAll >= 3, hasDescription(row.product)].filter(Boolean).length * 10 + Math.min(row.generated.specCountAll, 8);
  const sampleRows = [];
  const pools = new Map(SAMPLE_GROUPS.map((group) => [group, rows.filter((row) => row.generated.family.group === group).sort((a, b) => score(b) - score(a) || a.product.slug.localeCompare(b.product.slug))]));
  const usedLeaf = new Set();
  for (let pass = 0; pass < 3 && sampleRows.length < SAMPLE_COUNT; pass += 1) {
    for (const group of SAMPLE_GROUPS) {
      if (sampleRows.length >= SAMPLE_COUNT) break;
      const pool = pools.get(group);
      // First pass: a leaf category not used yet; later passes: anything left.
      const pick = pool.find((row) => !sampleRows.includes(row) && (pass > 0 || !usedLeaf.has(row.generated.chain[0]?.id)));
      if (pick) {
        sampleRows.push(pick);
        usedLeaf.add(pick.generated.chain[0]?.id);
      }
    }
  }
  const sampleOut = sampleRows.map((row) => ({
    group: row.generated.family.group, category: row.generated.chain.map((c) => c.name).reverse().join(" > "),
    name: row.product.name, current_title: row.current, current_len: row.current.length,
    seo_title: row.generated.seoTitle, seo_title_len: row.generated.seoTitle.length, title_rule: row.generated.titleRule,
    meta_description: row.generated.metaDescription, meta_description_len: row.generated.metaDescription.length,
    primary_keyword: row.generated.primaryKeyword, secondary_keywords: row.generated.secondaryKeywords.join(" | "),
    image_alt: row.generated.imageAlt, image_alt_len: row.generated.imageAlt.length, current_alt: row.generated.image?.alt ?? "",
    slug: row.product.slug, short_slug_idea: proposedSlug(row), flags: row.generated.descFlags.join("; "),
  }));
  await writeCsv("samples.csv", Object.keys(sampleOut[0] ?? { group: "" }), sampleOut);

  // ---- full generated CSV -----------------------------------------------
  const generatedOut = rows.map((row) => ({
    id: row.product.id, slug: row.product.slug, name: row.product.name, brand: squash(row.product.brand?.name), type: row.generated.type,
    category: row.generated.chain.map((c) => c.name).reverse().join(" > "),
    current_title: row.current, seo_title: row.generated.seoTitle, seo_title_len: row.generated.seoTitle.length, title_rule: row.generated.titleRule,
    meta_description: row.generated.metaDescription, meta_description_len: row.generated.metaDescription.length, specs_used: row.generated.specsUsed,
    desc_flags: row.generated.descFlags.join("; "), primary_keyword: row.generated.primaryKeyword, secondary_keywords: row.generated.secondaryKeywords.join(" | "),
    image_alt: row.generated.imageAlt, current_alt: row.generated.image?.alt ?? "", spec_count_in_db: row.generated.specCountAll,
    in_stock: inStock(row.product), price: row.product.priceAmount,
  }));
  const descLens = generatedOut.map((row) => row.meta_description_len);
  const titleCounts = new Map();
  for (const row of generatedOut) titleCounts.set(row.seo_title, (titleCounts.get(row.seo_title) ?? 0) + 1);
  const dupGroups = [...titleCounts.values()].filter((n) => n > 1);
  const dupProducts = dupGroups.reduce((sum, n) => sum + n, 0);
  const keywordCounts = new Map();
  for (const row of generatedOut) keywordCounts.set(row.primary_keyword, (keywordCounts.get(row.primary_keyword) ?? 0) + 1);
  const dupKeywordProducts = [...keywordCounts.values()].filter((n) => n > 1).reduce((sum, n) => sum + n, 0);
  // Written after the fact so generated.csv carries the duplicate flag too.
  for (const row of generatedOut) row.title_shared_with = titleCounts.get(row.seo_title) - 1;
  await writeCsv("generated.csv", Object.keys(generatedOut[0] ?? { id: "" }), generatedOut);
  const inRange = descLens.filter((len) => len >= DESC_MIN && len <= DESC_MAX).length;
  const flagged = tally(rows.flatMap((row) => row.generated.descFlags), (flag) => flag);

  // ---- c) selection counts (counts only; nothing is chosen) -------------
  const eligible = (row) =>
    row.product.priceAmount > 0 && inStock(row.product) && !row.product.isComingSoon && hasRealImage(row.product) &&
    row.generated.type && !GENERIC_BRAND.test(squash(row.product.brand?.name)) && row.generated.specCountAll >= 3;
  const eligibleRows = rows.filter(eligible);
  const eligibleByFamily = tally(eligibleRows, (row) => `${row.generated.family.name}|${row.generated.family.tier}`);
  const tier1 = eligibleRows.filter((row) => row.generated.family.tier === 1);
  const eligibleWithDescription = eligibleRows.filter((row) => hasDescription(row.product)).length;
  // Round-robin over the tier-1 families, best-completeness first: how a 500 pick would spread.
  const queues = new Map();
  for (const row of [...tier1].sort((a, b) => score(b) - score(a) || a.product.slug.localeCompare(b.product.slug))) {
    const key = row.generated.family.name;
    queues.set(key, [...(queues.get(key) ?? []), row]);
  }
  const spread = new Map();
  let taken = 0;
  while (taken < SELECT_TARGET && [...queues.values()].some((queue) => queue.length > 0)) {
    for (const [key, queue] of queues) {
      if (taken >= SELECT_TARGET || queue.length === 0) continue;
      queue.shift();
      spread.set(key, (spread.get(key) ?? 0) + 1);
      taken += 1;
    }
  }

  const orderLines = await prisma.orderItem.groupBy({
    by: ["productId"], where: { productId: { not: null }, order: { status: { not: "CANCELLED" } } }, _sum: { quantity: true }, _count: true,
  });
  const orderCount = await prisma.order.count({ where: { status: { not: "CANCELLED" } } });
  const viewGroups = await prisma.productViewEvent.groupBy({ by: ["productId"], _count: true });
  const activeIds = new Set(products.map((product) => product.id));
  const soldIds = new Set(orderLines.filter((line) => activeIds.has(line.productId)).map((line) => line.productId));
  const viewedIds = new Set(viewGroups.filter((group) => activeIds.has(group.productId)).map((group) => group.productId));
  const eligibleIds = new Set(eligibleRows.map((row) => row.product.id));
  const soldAndEligible = [...soldIds].filter((id) => eligibleIds.has(id)).length;
  const viewedAndEligible = [...viewedIds].filter((id) => eligibleIds.has(id)).length;
  const signalUnion = new Set([...soldIds, ...viewedIds]);

  const tiers = [["under 5,000", 0, 5000], ["5,000–14,999", 5000, 15000], ["15,000–39,999", 15000, 40000], ["40,000–99,999", 40000, 100000], ["100,000 and over", 100000, Infinity]];
  const priced = rows.filter((row) => row.product.priceAmount > 0 && inStock(row.product));
  const tierRows = tiers.map(([label, lo, hi]) => {
    const inTier = priced.filter((row) => row.product.priceAmount >= lo && row.product.priceAmount < hi);
    return [label, inTier.length, inTier.filter(eligible).length];
  });
  const premium = priced.filter((row) => row.product.priceAmount >= 15000);
  const premiumEligible = premium.filter(eligible).length;

  const selectionOut = [
    { method: "A sales/orders", bucket: "non-cancelled orders in DB", count: orderCount },
    { method: "A sales/orders", bucket: "active products with >=1 sold line", count: soldIds.size },
    { method: "A sales/orders", bucket: "... of which pass the data-quality filter", count: soldAndEligible },
    { method: "A sales/orders", bucket: "active products with >=1 page view event", count: viewedIds.size },
    { method: "A sales/orders", bucket: "... of which pass the data-quality filter", count: viewedAndEligible },
    { method: "A sales/orders", bucket: "products with a sale OR a view", count: signalUnion.size },
    { method: "B category+stock+data", bucket: "eligible (priced, in stock, image, type, brand, >=3 specs)", count: eligibleRows.length },
    { method: "B category+stock+data", bucket: "... in tier-1 families", count: tier1.length },
    { method: "B category+stock+data", bucket: "... with a description too", count: eligibleWithDescription },
    ...eligibleByFamily.map(([key, count]) => ({ method: "B category+stock+data", bucket: `family ${key.split("|")[0]} (tier ${key.split("|")[1]})`, count })),
    ...[...spread.entries()].map(([key, count]) => ({ method: "B category+stock+data", bucket: `round-robin pick of ${SELECT_TARGET}: ${key}`, count })),
    ...tierRows.map(([label, all, ok]) => ({ method: "C price tier", bucket: `${label} BDT: in stock + priced / also eligible`, count: `${all} / ${ok}` })),
    { method: "C price tier", bucket: "15,000+ BDT in stock / also eligible", count: `${premium.length} / ${premiumEligible}` },
  ];
  await writeCsv("selection-counts.csv", ["method", "bucket", "count"], selectionOut);

  // ---- summary.md --------------------------------------------------------
  const lenBuckets = [["40 or fewer", (n) => n <= 40], ["41–60", (n) => n > 40 && n <= 60], ["61–100", (n) => n > 60 && n <= 100], ["over 100", (n) => n > 100]];
  const slugBuckets = [["40 or fewer", (n) => n <= 40], ["41–60", (n) => n > 40 && n <= 60], ["61–79", (n) => n > 60 && n < 80], ["80 (the cap)", (n) => n >= 80]];
  const dist = (values, buckets) => buckets.map(([label, test]) => [label, values.filter(test).length, pct(values.filter(test).length, values.length)]);
  const line = (label, n) => `| ${label} | ${n} | ${pct(n, total)} |`;

  const summary = [
    `# Product SEO report (phase 8, read-only)`,
    ``,
    `Database: \`${databaseName()}\` · generated ${new Date().toISOString()} · **${total} active products**`,
    ``,
    `Nothing here was written to the database. \`generated.csv\` is the proposed output for every active product.`,
    ``,
    `## a) Data profile`,
    ``,
    `Columns that exist on Product for SEO text: ${metaColumns.length ? metaColumns.map((c) => `\`${c}\``).join(", ") : "**none** (no metaTitle / metaDescription / seoTitle / seoDescription column)"}. Products with a saved meta title/description: **${metaColumns.length ? "see column" : "0 (not storable today)"}**.`,
    ``,
    mdTable(["Coverage", "Products", "Share"], [
      ["with any description (overview, overview HTML or details HTML)", withDescription, pct(withDescription, total)],
      ["… overview HTML", withOverviewHtml, pct(withOverviewHtml, total)],
      ["… details HTML", withDetailsHtml, pct(withDetailsHtml, total)],
      ["with attribute values", withAttributes, pct(withAttributes, total)],
      ["with spec chips or spec groups", withChips, pct(withChips, total)],
      ["with any spec at all", withAnySpec, pct(withAnySpec, total)],
      ["with 3 or more specs", withThreeSpecs, pct(withThreeSpecs, total)],
      ["with a real brand (not blank / generic)", withBrand, pct(withBrand, total)],
      ["with Product.modelNumber filled", withModelNumber, pct(withModelNumber, total)],
      ["with a usable product type (non-umbrella category)", withType, pct(withType, total)],
      ["with a real image (not the placeholder)", withImage, pct(withImage, total)],
      ["with price > 0", withPrice, pct(withPrice, total)],
      ...stockCounts.map(([status, n]) => [`stock status ${status}`, n, pct(n, total)]),
      ["main-image alt is junk / empty (isJunkAlt)", junkAlt, pct(junkAlt, total)],
      ["main-image alt equals the raw product name", altIsName, pct(altIsName, total)],
    ]),
    ``,
    `**Name length** (raw \`Product.name\`): over 60 chars **${lengths.filter((n) => n > 60).length}** (${pct(lengths.filter((n) => n > 60).length, total)}), over 100 chars **${lengths.filter((n) => n > 100).length}** (${pct(lengths.filter((n) => n > 100).length, total)}); median ${[...lengths].sort((a, b) => a - b)[Math.floor(total / 2)] ?? 0}, max ${Math.max(0, ...lengths)}.`,
    ``,
    mdTable(["Name length", "Products", "Share"], dist(lengths, lenBuckets)),
    ``,
    `**By top-level category**`,
    ``,
    mdTable(["Category", "Products"], byRoot.map(([name, n]) => [name, n])),
    ``,
    `**Top 25 leaf categories** (all in profile-categories.csv)`,
    ``,
    mdTable(["Category", "Products"], byLeaf.slice(0, 25).map(([name, n]) => [name, n])),
    ``,
    `**Top 25 brands of ${byBrand.length}** (all in profile-brands.csv)`,
    ``,
    mdTable(["Brand", "Products"], byBrand.slice(0, 25).map(([name, n]) => [name, n])),
    ``,
    `## b) ${sampleOut.length} sample outputs from real products`,
    ``,
    `Generator output: ${inRange}/${total} meta descriptions are 120–155 chars; titles ${newLens.filter((n) => n <= TITLE_MAX).length}/${total} within 60 (max ${Math.max(0, ...newLens)}). Description flags: ${flagged.map(([f, n]) => `${f} ×${n}`).join(", ") || "none"}.`,
    ``,
    `**Uniqueness:** ${dupProducts} products (${pct(dupProducts, total)}) share a generated SEO title with at least one other product, in ${dupGroups.length} groups (colour / part-code variants, or the name cleaner cutting different products to the same model). ${dupKeywordProducts} share a primary keyword. An apply step must disambiguate these (see plan) or leave them for review; today's storefront titles use sibling disambiguation (\`productLabel\`), this proposal does not yet.`,
    ``,
    mdTable(["Group", "Product (raw name)", "SEO title (chars)", "Meta description (chars)", "Keyword", "Image alt"],
      sampleOut.map((s) => [s.group, cutAtWord(s.name, 70), `${s.seo_title} (${s.seo_title_len})`, `${s.meta_description} (${s.meta_description_len})`, s.primary_keyword, `${s.image_alt} (${s.image_alt_len})`])),
    ``,
    `## c) Selection counts for ~${SELECT_TARGET} (counts only, nothing selected)`,
    ``,
    `Data-quality filter: price > 0, in stock or low stock, not "coming soon", a real image, a usable type, a real brand, at least 3 specs. **${eligibleRows.length}** products pass (${pct(eligibleRows.length, total)}).`,
    ``,
    mdTable(["Method", "Bucket", "Count"], selectionOut.map((o) => [o.method, o.bucket, o.count])),
    ``,
    `## Title suffix report ("Price in BD" vs "Price in Bangladesh")`,
    ``,
    `Current storefront titles (\`productTitle\`, without sibling disambiguation): ${endsBd}/${total} end in "Price in BD"; ${withBrandSuffix} also carry " | ${SITE}". Length: median ${[...currentLens].sort((a, b) => a - b)[Math.floor(total / 2)] ?? 0}, max ${Math.max(0, ...currentLens)}.`,
    ``,
    `If the suffix were simply swapped to "Price in Bangladesh" (+9 chars): **${stillFits}** of ${total} titles still fit in 60 characters; **${total - stillFits}** would go over and need shortening; **${brandSuffixLosesTheFit}** of the ${withBrandSuffix} titles that carry " | ${SITE}" would have to lose it or lose spec text. Every title changes (${total}/${total}).`,
    ``,
    `Proposed generator: ${newBangladesh}/${total} titles use "Price in Bangladesh"; the rest fall back to "Price in BD" (model + type too long). ${newChanged}/${total} differ from today's title.`,
    ``,
    `## Slug report`,
    ``,
    mdTable(["Slug length", "Products", "Share"], dist(slugLens, slugBuckets)),
    ``,
    `Slugs at the 80-char cap (cut mid-word likely): **${slugAtMax}**; slugs with 8+ hyphen segments or an embedded spec (gb/tb/mhz/w/inch): **${slugLongSpec}** (${pct(slugLongSpec, total)}); median ${[...slugLens].sort((a, b) => a - b)[Math.floor(total / 2)] ?? 0}, max ${Math.max(0, ...slugLens)}.`,
    ``,
    mdTable(["Current slug", "Short slug idea (not applied)"], sampleOut.map((s) => [s.slug, s.short_slug_idea])),
    ``,
  ].join("\n");
  await writeFile(path.join(OUT, "summary.md"), summary);
  console.log(summary);
  console.log(`\nfiles written to ${OUT}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
