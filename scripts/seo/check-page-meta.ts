/**
 * SEO phase 2 template checks (titles, descriptions, H1s, demoted headings).
 *
 *   npm run test:seo-meta
 *
 * Pure functions only; no server, no database. `npm run seo:audit-meta` runs
 * the same templates over the real catalogue (read-only).
 */
import { demoteHeadings } from "@/lib/content/demote-headings";
import {
  BRAND_KEYWORDS,
  CATEGORY_KEYWORDS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  STATIC_PAGE_META,
  TITLE_MAX,
  brandMeta,
  categoryMeta,
  categoryParentQualifier,
  cleanProductName,
  productDescription,
  productLabel,
  productTitle,
  shortProductName,
} from "@/lib/seo/page-meta";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

function equal(name: string, actual: unknown, expected: unknown): void {
  check(name, actual === expected, `expected ${String(expected)}\n  actual   ${String(actual)}`);
}

const YEAR = "2026";
const titles = new Set<string>();
const descriptions = new Set<string>();

// --- categories ------------------------------------------------------------
for (const slug of Object.keys(CATEGORY_KEYWORDS)) {
  const meta = categoryMeta({ slug, name: slug }, YEAR);
  const heading = CATEGORY_KEYWORDS[slug]!.heading;
  check(`category ${slug}: title ≤ ${TITLE_MAX}`, meta.title.length <= TITLE_MAX, `${meta.title.length} ${meta.title}`);
  check(`category ${slug}: title has heading + year`, meta.title.startsWith(`${heading} Price in`) && meta.title.includes(YEAR), meta.title);
  check(
    `category ${slug}: description ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}`,
    meta.description.length >= DESCRIPTION_MIN && meta.description.length <= DESCRIPTION_MAX,
    `${meta.description.length} ${meta.description}`,
  );
  check(`category ${slug}: no {Y} placeholder left`, !meta.description.includes("{Y}"));
  equal(`category ${slug}: H1`, meta.h1, `${heading} Price in Bangladesh`);
  check(`category ${slug}: unique title`, !titles.has(meta.title));
  check(`category ${slug}: unique description`, !descriptions.has(meta.description));
  titles.add(meta.title);
  descriptions.add(meta.description);
}
equal(
  "category laptop title",
  categoryMeta({ slug: "laptop", name: "Laptop" }, YEAR).title,
  "Laptop Price in Bangladesh 2026 | Techno House",
);
equal(
  "unmapped category uses its own name",
  categoryMeta({ slug: "webcam", name: "Webcam" }, YEAR).title,
  "Webcam Price in Bangladesh 2026 | Techno House",
);
const longName = categoryMeta({ slug: "x", name: "Interactive Flat Panel Display Systems" }, YEAR);
check("long category name falls back to a title ≤ 60", longName.title.length <= TITLE_MAX, longName.title);
const fallbackDesc = categoryMeta({ slug: "webcam", name: "Webcam" }, YEAR).description;
check(
  "unmapped category description 140–160",
  fallbackDesc.length >= DESCRIPTION_MIN && fallbackDesc.length <= DESCRIPTION_MAX,
  `${fallbackDesc.length} ${fallbackDesc}`,
);
check("no category text claims display-only prices", !/display-only|not a charge/i.test(fallbackDesc));

{
  const all = [
    { slug: "gaming-pc", name: "Gaming PC", parentSlug: null },
    { slug: "star-pc", name: "Star PC", parentSlug: null },
    { slug: "gaming-pc-intel", name: "Intel PC", parentSlug: "gaming-pc" },
    { slug: "star-pc-intel", name: "Intel PC", parentSlug: "star-pc" },
  ];
  const a = categoryMeta(all[2]!, YEAR, categoryParentQualifier(all[2]!, all));
  const b = categoryMeta(all[3]!, YEAR, categoryParentQualifier(all[3]!, all));
  check("same-named categories get different titles", a.title !== b.title, `${a.title} / ${b.title}`);
  equal("same-named category H1 names its parent", a.h1, "Intel PC (Gaming PC) Price in Bangladesh");
  check("qualified title ≤ 60", a.title.length <= TITLE_MAX, a.title);
  equal("unique name is not qualified", categoryParentQualifier(all[0]!, all), undefined);
}

// --- brands ----------------------------------------------------------------
const BRAND_NAMES: Record<string, string> = {
  asus: "ASUS", hp: "HP", lenovo: "Lenovo", dell: "Dell", acer: "Acer", msi: "MSI",
  gigabyte: "Gigabyte", apple: "Apple", intel: "Intel", amd: "AMD", corsair: "Corsair", epson: "Epson",
};
for (const slug of Object.keys(BRAND_KEYWORDS)) {
  const meta = brandMeta({ slug, name: BRAND_NAMES[slug]! }, ["Laptop", "Monitor", "SSD"], YEAR);
  check(`brand ${slug}: title ≤ ${TITLE_MAX}`, meta.title.length <= TITLE_MAX, `${meta.title.length} ${meta.title}`);
  check(`brand ${slug}: title has type`, meta.title.includes(BRAND_KEYWORDS[slug]!.type), meta.title);
  check(
    `brand ${slug}: description ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}`,
    meta.description.length >= DESCRIPTION_MIN && meta.description.length <= DESCRIPTION_MAX,
    `${meta.description.length} ${meta.description}`,
  );
  check(`brand ${slug}: unique title`, !titles.has(meta.title));
  titles.add(meta.title);
}
equal("ASUS title", brandMeta({ slug: "asus", name: "ASUS" }, [], YEAR).title, "ASUS Laptop Price in Bangladesh | Techno House");
equal("ASUS H1", brandMeta({ slug: "asus", name: "ASUS" }, [], YEAR).h1, "ASUS Laptop Price in Bangladesh");
equal("Gigabyte title (BD keyword)", brandMeta({ slug: "gigabyte", name: "Gigabyte" }, [], YEAR).title, "Gigabyte Motherboard Price in BD | Techno House");
equal(
  "other brand: main product type from its categories",
  brandMeta({ slug: "hikvision", name: "Hikvision" }, ["IP Camera", "NVR"], YEAR).title,
  "Hikvision IP Camera Price in BD | Techno House",
);
equal("other brand keeps its name as H1", brandMeta({ slug: "hikvision", name: "Hikvision" }, ["IP Camera"], YEAR).h1, "Hikvision");
equal("brand without products", brandMeta({ slug: "x", name: "Zebra" }, [], YEAR).title, "Zebra Price in BD | Techno House");
const hik = brandMeta({ slug: "hikvision", name: "Hikvision" }, ["IP Camera", "NVR", "CC Camera Package"], YEAR).description;
check("brand description lists its categories, acronyms kept", hik.includes("IP camera, NVR and CC camera package"), hik);

// --- static pages ----------------------------------------------------------
for (const [path, meta] of Object.entries(STATIC_PAGE_META)) {
  check(`static ${path}: title ≤ ${TITLE_MAX}`, meta.title.length <= TITLE_MAX, `${meta.title.length} ${meta.title}`);
  check(
    `static ${path}: description ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}`,
    meta.description.length >= DESCRIPTION_MIN && meta.description.length <= DESCRIPTION_MAX,
    `${meta.description.length} ${meta.description}`,
  );
  check(`static ${path}: unique title`, !titles.has(meta.title), meta.title);
  check(`static ${path}: unique description`, !descriptions.has(meta.description));
  titles.add(meta.title);
  descriptions.add(meta.description);
}
for (const path of [
  "/about", "/privacy", "/faq", "/contact", "/terms", "/warranty", "/returns", "/support",
  "/shipping", "/offers", "/flash-sale", "/pc-builder", "/deals", "/brands", "/blog",
]) {
  check(`static ${path} has hand-written meta`, Boolean(STATIC_PAGE_META[path]));
}

// --- product names ---------------------------------------------------------
equal("POS code before '#' removed", cleanProductName("3813C001AA # Canon DADF-BA1", "Canon").clean, "Canon DADF-BA1");
equal("long code before ',' removed", cleanProductName("C11CL31503, EPSON EM-C8100 Colour-MFP A3", "Epson").blocks[0], "Epson EM-C8100 Colour-MFP A3");
equal("short model before ',' kept", cleanProductName("BY-MM1, Cardioid Condenser Microphone, Black", "Boya").blocks[0], "Boya BY-MM1");
equal("brand added when missing", cleanProductName("FM1-V234-010000 # FIXING ASSEMBLY", "Canon").clean, "Canon Fixing Assembly");
equal("stray '#' and ® removed", cleanProductName("GIGABYTE INTEL® # Z790 D AX DDR5", "Gigabyte").blocks[0], "Gigabyte INTEL Z790 D AX DDR5");
check(
  "warranty blocks dropped",
  !/warranty|\b2Y\b|3YW/i.test(cleanProductName("Edifier W240TN Black ANC 1 Year Warranty, 2Y, 3YW", "Edifier").clean),
  cleanProductName("Edifier W240TN Black ANC 1 Year Warranty, 2Y, 3YW", "Edifier").clean,
);
const hp = "HP Victus Gaming 15-fa1393TX Laptop,Intel Core i5-13420H-2.10 To 4.60 GHz,8 GB DDR4,512 GB SSD,4 GB NVIDIA GeForce RTX 2050,15.6\"FHD-144Hz,BL,Wi-Fi6,BT,WC,Win11Home,Mica Silver,2Y,";
const hpTitle = productTitle(hp, "HP");
check("long laptop title ≤ 60 and keeps the model", hpTitle.length <= TITLE_MAX && hpTitle.includes("15-fa1393TX"), hpTitle);
check("long title ends with Price in BD", /Price in BD( \| Techno House)?$/.test(hpTitle), hpTitle);
equal("short name gets the full suffix", productTitle("Shell USB-C Cable 1m", "Shell"), "Shell USB-C Cable 1m Price in BD | Techno House");
check("no dangling 'with'", !/\bwith$/i.test(shortProductName("Canon EOS RP Mirrorless Digital Camera with lense for PUST", 48, "Canon")));

const variants = [
  "Corsair VENGEANCE RGB PRO 16GB (2x8GB) DDR4 3200MHz C16 Memory Kit - Black, CMW16GX4M2E3200C16",
  "Corsair VENGEANCE RGB PRO 16GB (2x8GB) DDR4 3200MHz C16 Memory Kit - White, CMW16GX4M2E3200C16W",
];
const variantTitles = variants.map((name) => productTitle(name, "Corsair", variants));
check("colour variants get different titles", variantTitles[0] !== variantTitles[1], variantTitles.join(" / "));
check("variant titles ≤ 60", variantTitles.every((title) => title.length <= TITLE_MAX), variantTitles.join(" / "));
const plugs = [
  "VCR600-2 # CAT6 Modular Plug Unshielded Double Part With Boot Cap",
  "VCR600 # CAT6 Modular Plug Unshielded Double Part",
];
const plugLabels = plugs.map((name) => productLabel(name, "Vivanco", plugs));
check("stop-word is never the only difference", plugLabels[0] !== plugLabels[1] && !/With$/.test(plugLabels[0]!), plugLabels.join(" / "));
const faceplates = [
  "28868-2 # M12CFS Modular Shuttered Faceplate, 2-Port, White",
  "760003038 # M12CFS Modular Shuttered Faceplate, 2-Port, White",
  "1427003-2 # M12CFS Modular Shuttered Faceplate, 1-Port, White",
];
const faceplateTitles = faceplates.map((name) => productTitle(name, "CommScope", faceplates));
check("identical names fall back to their part codes", new Set(faceplateTitles).size === 3, faceplateTitles.join(" / "));

// --- product descriptions ----------------------------------------------------
const base = {
  name: "Volt B650 Micro-ATX Board",
  brandName: "Volt",
  isPreOrder: false,
  isComingSoon: false,
  warrantyLabel: "3 Year",
  emi: true,
};
const priced = productDescription({ ...base, displayPrice: 16800 });
check("price shown when the page shows it", priced.includes("৳16,800"), priced);
check("EMI mentioned when eligible", priced.includes("EMI"), priced);
check("warranty mentioned", priced.includes("3 year warranty"), priced);
check("priced description 140–160", priced.length >= DESCRIPTION_MIN && priced.length <= DESCRIPTION_MAX, `${priced.length} ${priced}`);
const hidden = productDescription({ ...base, displayPrice: null, emi: false });
check("no price when the page hides it", !hidden.includes("৳"), hidden);
check("no EMI when not eligible", !hidden.includes("EMI"), hidden);
check("hidden-price description 140–160", hidden.length >= DESCRIPTION_MIN && hidden.length <= DESCRIPTION_MAX, `${hidden.length} ${hidden}`);
const soon = productDescription({ ...base, displayPrice: null, isComingSoon: true, emi: false });
check("Up Coming says coming soon", soon.includes("coming soon"), soon);
const pre = productDescription({ ...base, displayPrice: 16800, isPreOrder: true });
check("pre-order is labelled", pre.includes("(pre-order)"), pre);
const noWarranty = productDescription({ ...base, warrantyLabel: "No warranty", displayPrice: 500 });
check("'No warranty' is never stated as a warranty", !/no warranty warranty|No warranty,/i.test(noWarranty), noWarranty);
const longDesc = productDescription({ ...base, name: hp, brandName: "HP", displayPrice: 145000 });
check("long product description ≤ 160", longDesc.length <= DESCRIPTION_MAX, `${longDesc.length} ${longDesc}`);

// --- demoted headings --------------------------------------------------------
equal(
  "marquee <h3> becomes a styled div, text unchanged",
  demoteHeadings("<h3><strong>নোটিশ</strong>The website is currently under development</h3><p></p>"),
  '<div class="th-heading-like th-heading-h3"><strong>নোটিশ</strong>The website is currently under development</div><p></p>',
);
equal("all heading levels", demoteHeadings("<H2>a</H2><h4 >b</h4 >"), '<div class="th-heading-like th-heading-h2">a</div><div class="th-heading-like th-heading-h4">b</div>');
equal("no headings → unchanged", demoteHeadings("<p><b>x</b></p>"), "<p><b>x</b></p>");

console.log(failures === 0 ? `ok ${checks} page-meta checks` : `failed ${failures}/${checks} page-meta checks`);
if (failures > 0) {
  process.exit(1);
}
