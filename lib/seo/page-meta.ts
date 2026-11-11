/**
 * Title / description templates (SEO phase 2 — plan items B1–B4, B6 and the
 * keyword map in docs/SEO-FIX-PLAN.md section 3).
 *
 *   - titles ≤ 60 characters, ending in " | Techno House" only when it fits
 *   - descriptions 140–160 characters where the inputs allow it
 *   - nothing here states a price, a feature or an offer the page does not
 *     show: product prices follow the same "hidden when Up Coming / out of
 *     stock (unless Pre Order)" rule as the product page, EMI is mentioned
 *     only when the EMI teaser would be shown
 *
 * Pure functions (no database access) so they can be checked offline:
 * `npm run test:seo-meta`.
 */

export const SITE_NAME = "Techno House";
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

const SUFFIX = ` | ${SITE_NAME}`;

/** Year used in "Price in Bangladesh {YEAR}" — the Dhaka calendar year. */
export function seoYear(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(now);
}

/** First candidate that fits `max`; otherwise the last one cut at a word. */
export function fitTitle(candidates: string[], max = TITLE_MAX): string {
  for (const candidate of candidates) {
    if (candidate.length <= max) {
      return candidate;
    }
  }
  return cutAtWord(candidates[candidates.length - 1] ?? SITE_NAME, max);
}

/** Cut at the last word boundary at or before `max` (no ellipsis). */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  const slice = text.slice(0, max + 1);
  const space = slice.lastIndexOf(" ");
  const cut = (space > max * 0.5 ? slice.slice(0, space) : text.slice(0, max)).trim();
  return cut.replace(/[\s,;:&/+\-–|(]+$/u, "").trim();
}

/**
 * `required` sentences always kept (cut at a word if they alone exceed
 * `max`); `optional` entries appended in order while the total stays
 * ≤ `max`, stopping once it reaches `min`. An entry that is an array is a
 * set of alternatives — the first one that fits is used, the rest skipped —
 * so a shorter fallback never repeats a longer sentence's point.
 */
export function fitDescription(
  required: string[],
  optional: (string | string[])[] = [],
  min = DESCRIPTION_MIN,
  max = DESCRIPTION_MAX,
): string {
  let text = required.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (text.length > max) {
    const cut = cutAtWord(text, max - 1);
    return /[.!?]$/.test(cut) ? cut : `${cut}.`;
  }
  for (const entry of optional) {
    if (text.length >= min) {
      break;
    }
    for (const sentence of Array.isArray(entry) ? entry : [entry]) {
      const next = `${text} ${sentence}`.trim();
      if (sentence && next.length <= max) {
        text = next;
        break;
      }
    }
  }
  return text;
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Gaming Laptop" → "gaming laptop"; acronyms ("SSD", "CC", "UPS") kept. */
function lowerWords(text: string): string {
  return text.replace(/\b[A-Z][a-z]+\b/gu, (word) => word.toLowerCase());
}

// ---------------------------------------------------------------------------
// Categories (B1, B9)
// ---------------------------------------------------------------------------

type CategoryKeyword = {
  /** Words before "Price in Bangladesh" in the H1 and title. */
  heading: string;
  /** Description; `{Y}` is replaced with the year. */
  description: string;
};

/**
 * Keyword map section 3.2, keyed by the REAL slug (checked against the live
 * sitemap 2026-11-09). "ram" has no category of its own — its keyword is on
 * `ram-desktop`; see docs/SEO-NOTES.md "Keyword-map slugs".
 */
export const CATEGORY_KEYWORDS: Record<string, CategoryKeyword> = {
  laptop: {
    heading: "Laptop",
    description:
      "Laptop price in BD {Y}: compare the best laptops in Bangladesh for study, office and gaming from HP, Lenovo, ASUS, Dell and Acer, with warranty and delivery.",
  },
  "gaming-pc": {
    heading: "Gaming PC",
    description:
      "Gaming PC price in Bangladesh {Y}: RTX gaming computers and custom gaming PC builds in BD with Intel and Ryzen options, compared by specs, price and warranty.",
  },
  desktop: {
    heading: "Desktop PC",
    description:
      "Desktop PC price in Bangladesh {Y}: brand PCs, office PCs and all-in-one desktops from HP, Dell, Lenovo and more. Compare brand PC price in BD at Techno House.",
  },
  monitor: {
    heading: "Monitor",
    description:
      "Monitor price in Bangladesh {Y}: gaming monitors, 144Hz and 27 inch monitors, 4K and office displays from top brands. Compare gaming monitor price in BD.",
  },
  processor: {
    heading: "Processor",
    description:
      "Processor price in Bangladesh {Y}: AMD Ryzen and Intel Core CPUs for gaming and work. Compare Ryzen processor and Intel Core i5 price in BD at Techno House.",
  },
  "graphics-card": {
    heading: "Graphics Card",
    description:
      "Graphics card price in Bangladesh {Y}: NVIDIA GeForce RTX and AMD Radeon GPUs for gaming and creative work. Compare GPU price in BD, specs and warranty.",
  },
  "ram-desktop": {
    heading: "Desktop RAM",
    description:
      "RAM price in Bangladesh {Y}: DDR4 and DDR5 desktop RAM in 8GB, 16GB and 32GB from Corsair, G.Skill, Kingston and more. Compare DDR5 RAM price in BD.",
  },
  "nvme-ssd": {
    heading: "NVMe SSD",
    description:
      "NVMe SSD price in Bangladesh {Y}: M.2 NVMe drives in 512GB, 1TB and 2TB capacities. Compare SSD price in BD, 1TB SSD price, speed and warranty at Techno House.",
  },
  motherboard: {
    heading: "Motherboard",
    description:
      "Motherboard price in Bangladesh {Y}: Intel and AMD AM5 motherboards, including B650, B850 and Z790 boards. Compare AM5 motherboard price in BD and warranty.",
  },
  "power-supply": {
    heading: "Power Supply",
    description:
      "Power supply price in Bangladesh {Y}: PSUs from 450W to 750W and beyond, including 80 Plus units from top brands. Compare PSU price in BD at Techno House.",
  },
  casing: {
    heading: "PC Casing",
    description:
      "PC casing price in Bangladesh {Y}: gaming casings, ATX and micro-ATX cases with RGB fans and tempered glass. Compare gaming casing price in BD at Techno House.",
  },
  "cpu-cooler": {
    heading: "CPU Cooler",
    description:
      "CPU cooler price in BD {Y}: air coolers and AIO liquid coolers for Intel and AMD sockets. Compare liquid cooler price in BD, fan size and warranty at Techno House.",
  },
  phone: {
    heading: "Mobile Phone",
    description:
      "Mobile phone price in Bangladesh {Y}: smartphones from Honor, Samsung, Xiaomi, Realme and more. Compare smartphone price in BD and Honor phone price here.",
  },
  tablet: {
    heading: "Tablet",
    description:
      "Tablet price in Bangladesh {Y}: tablets for study, work and entertainment. Compare tab price in BD, storage, display size and warranty at Techno House.",
  },
  "smart-watch": {
    heading: "Smart Watch",
    description:
      "Smart watch price in Bangladesh {Y}: fitness and calling smartwatches from Huawei, Honor, Xiaomi and more. Compare Huawei watch price in BD at Techno House.",
  },
  earbuds: {
    heading: "Earbuds",
    description:
      "Earbuds price in Bangladesh {Y}: true wireless earbuds with ANC, long battery life and low-latency modes. Compare wireless earbuds price in BD at Techno House.",
  },
  headphone: {
    heading: "Headphone",
    description:
      "Headphone price in Bangladesh {Y}: gaming headphones, wireless and Bluetooth headphones from top brands. Compare gaming headphone price in BD at Techno House.",
  },
  keyboard: {
    heading: "Keyboard",
    description:
      "Keyboard price in Bangladesh {Y}: gaming, mechanical, wireless and office keyboards from top brands. Compare gaming keyboard price in BD at Techno House.",
  },
  mouse: {
    heading: "Mouse",
    description:
      "Mouse price in Bangladesh {Y}: gaming, wireless and office mice from Logitech, Razer, Rapoo and more. Compare gaming mouse price in BD at Techno House.",
  },
  printer: {
    heading: "Printer",
    description:
      "Printer price in Bangladesh {Y}: ink tank, laser and all-in-one printers from Epson, Canon, HP and Brother. Compare ink tank printer price in BD at Techno House.",
  },
  networking: {
    heading: "Router & Networking",
    description:
      "Router price in Bangladesh {Y}: WiFi routers, network switches, access points and cables. Compare WiFi router and network switch price in BD at Techno House.",
  },
  security: {
    heading: "CC Camera & Security",
    description:
      "CC camera price in Bangladesh {Y}: IP cameras, WiFi cameras, CCTV packages, NVR/DVR and access control. Compare CCTV package price in BD at Techno House.",
  },
  camera: {
    heading: "DSLR & Camera",
    description:
      "DSLR camera price in Bangladesh {Y}: DSLR, mirrorless, action and digital cameras with lenses and accessories. Compare mirrorless camera price in BD.",
  },
  tv: {
    heading: "TV & Smart TV",
    description:
      "Smart TV price in Bangladesh {Y}: Android, 4K and LED TVs in popular sizes. Compare 43 inch TV price in BD and Android TV price at Techno House.",
  },
  appliance: {
    heading: "AC & Home Appliance",
    description:
      "AC price in Bangladesh {Y}: air conditioners, fridges, washing machines and kitchen appliances. Compare home appliance price in BD with warranty at Techno House.",
  },
  ups: {
    heading: "UPS",
    description:
      "UPS price in Bangladesh {Y}: offline and online UPS for PCs, routers and offices, plus UPS batteries. Compare online UPS price in BD and backup time here.",
  },
  software: {
    heading: "Windows 11 Pro & Software",
    description:
      "Windows 11 Pro price in Bangladesh {Y}: Windows, Microsoft Office 365, antivirus and design software licenses. Compare antivirus and Office 365 price in BD.",
  },
  gaming: {
    heading: "Gaming Accessories",
    description:
      "Gaming accessories price in Bangladesh {Y}: gamepads, gaming chairs, consoles, racing wheels and VR. Compare gamepad and gaming chair price in BD at Techno House.",
  },
};

export type CategoryMeta = { title: string; description: string; h1: string };

type CategoryLike = { slug: string; name: string; parentSlug?: string | null };

/**
 * Parent's name when another category has the same name ("Intel PC" under
 * both Gaming PC and Star PC), so titles and H1s stay unique.
 */
export function categoryParentQualifier(
  category: CategoryLike,
  all: CategoryLike[],
): string | undefined {
  const key = category.name.trim().toLowerCase();
  const twins = all.filter((other) => other.name.trim().toLowerCase() === key);
  if (twins.length < 2 || !category.parentSlug) {
    return undefined;
  }
  return all.find((other) => other.slug === category.parentSlug)?.name.trim();
}

export function categoryMeta(
  category: { slug: string; name: string },
  year: string = seoYear(),
  parentName?: string,
): CategoryMeta {
  const keyword = CATEGORY_KEYWORDS[category.slug];
  const heading =
    keyword?.heading ??
    (parentName
      ? `${category.name.trim()} (${parentName})`
      : category.name.trim());
  const title = fitTitle([
    `${heading} Price in Bangladesh ${year}${SUFFIX}`,
    `${heading} Price in BD ${year}${SUFFIX}`,
    `${heading} Price in Bangladesh ${year}`,
    `${heading} Price in BD ${year}`,
    `${heading} Price in BD`,
  ]);
  const description = keyword
    ? fitDescription([keyword.description.replace("{Y}", year)])
    : fitDescription(
        [
          `${heading} price in Bangladesh ${year}: compare ${heading} models, specs and prices from top brands at ${SITE_NAME}.`,
        ],
        [
          [
            "Shop with warranty and delivery across Bangladesh.",
            "Warranty and delivery across Bangladesh.",
            "Delivery across Bangladesh.",
          ],
          ["Order online today.", "Buy online."],
        ],
      );
  return { title, description, h1: `${heading} Price in Bangladesh` };
}

// ---------------------------------------------------------------------------
// Brands (B2)
// ---------------------------------------------------------------------------

type BrandKeyword = {
  /** Product type after the brand name, e.g. "Laptop". */
  type: string;
  /** "Bangladesh" when the keyword is "... price in bangladesh". */
  region: "Bangladesh" | "BD";
  /** false when `type` is not a product category (Corsair's "PC Parts & Gaming Gear"). */
  listType?: boolean;
};

/** Keyword map section 3.3 — every slug exists on the live site. */
export const BRAND_KEYWORDS: Record<string, BrandKeyword> = {
  asus: { type: "Laptop", region: "Bangladesh" },
  hp: { type: "Laptop", region: "Bangladesh" },
  lenovo: { type: "Laptop", region: "Bangladesh" },
  dell: { type: "Laptop", region: "Bangladesh" },
  acer: { type: "Laptop", region: "Bangladesh" },
  msi: { type: "Laptop", region: "Bangladesh" },
  gigabyte: { type: "Motherboard", region: "BD" },
  apple: { type: "MacBook", region: "Bangladesh" },
  intel: { type: "Processor", region: "Bangladesh" },
  amd: { type: "Ryzen", region: "Bangladesh" },
  corsair: { type: "PC Parts & Gaming Gear", region: "BD", listType: false },
  epson: { type: "Printer", region: "Bangladesh" },
};

export type BrandMeta = { title: string; description: string; h1: string };

/**
 * `topCategories` = names of the brand's own categories by product count
 * (from the database), so the description lists what the brand page really
 * shows. The first one is the "main product type" for brands outside the
 * keyword map.
 */
export function brandMeta(
  brand: { slug: string; name: string },
  topCategories: string[],
  year: string = seoYear(),
): BrandMeta {
  const name = brand.name.trim();
  const keyword = BRAND_KEYWORDS[brand.slug];
  const type = keyword?.type ?? topCategories[0];
  const head = type ? `${name} ${type}` : name;
  const title = fitTitle(
    keyword?.region === "Bangladesh"
      ? [`${head} Price in Bangladesh${SUFFIX}`, `${head} Price in BD${SUFFIX}`, `${head} Price in BD`]
      : [`${head} Price in BD${SUFFIX}`, `${name} Price in BD${SUFFIX}`, `${head} Price in BD`],
  );
  // Keyword brands always list their keyword type first, so the description
  // agrees with the title even when another category has more products.
  const lines = (
    keyword && keyword.listType !== false
      ? [
          keyword.type,
          ...topCategories.filter(
            (name) => !name.toLowerCase().includes(keyword.type.toLowerCase()),
          ),
        ]
      : topCategories
  ).slice(0, 3);
  const range =
    lines.length > 1
      ? `${lines.slice(0, -1).join(", ")} and ${lines[lines.length - 1]}`
      : lines[0];
  const description = fitDescription(
    [
      `${head} price in ${keyword?.region === "BD" ? "BD" : "Bangladesh"} ${year}:`,
      range
        ? `shop ${name} ${lowerWords(range)} at ${SITE_NAME}.`
        : `shop ${name} products at ${SITE_NAME}.`,
    ],
    [
      [
        "Compare specs and prices, with warranty and delivery across Bangladesh.",
        "Compare specs and prices, with delivery across Bangladesh.",
        "Warranty and delivery across Bangladesh.",
        "Delivery across Bangladesh.",
      ],
      ["Order online today.", "Buy online."],
    ],
  );
  return {
    title,
    description: upperFirst(description),
    h1: keyword ? `${head} Price in ${keyword.region === "BD" ? "BD" : "Bangladesh"}` : name,
  };
}

// ---------------------------------------------------------------------------
// Products (B3, B4)
// ---------------------------------------------------------------------------

/** Room for the short name before " Price in BD". */
const PRODUCT_NAME_MAX = TITLE_MAX - " Price in BD".length;

/** Shouted English words in POS names; brand/model tokens are never touched. */
const SHOUTED_WORDS = new Set(
  (
    "with without for and of the to in on plus power cord mini camera dome color colour laptop cooler single " +
    "dual fan fans inch keyboard mouse combo wireless wired bangla gaming graphics card motherboard processor " +
    "monitor speaker speakers cable adapter battery charger printer assembly spring fixing transfer cleaner " +
    "control panel desktop black white silver blue red grey gray gold green pink purple edition built lens " +
    "distance metal plastic replacement warranty tower case chassis series external internal portable drive " +
    "hard disk solid state memory headphone headset earphone microphone router switch port ports office home " +
    "smart watch phone tablet airflow bullet outdoor indoor night vision network digital video recorder unit " +
    "kit set box stand holder mount bag cover sleeve pad table chair desk light lamp shredder scanner toner " +
    "drum ink cartridge paper roller fuser belt sensor board module door lock access terminal reader"
  ).split(" "),
);

export function softenShouting(text: string): string {
  return text.replace(/\b[A-Z]{2,}\b/gu, (word) =>
    SHOUTED_WORDS.has(word.toLowerCase())
      ? word.charAt(0) + word.slice(1).toLowerCase()
      : word,
  );
}

const STOP_WORDS = new Set(
  "with without for and of the to in on plus by from at".split(" "),
);

const TRAILING_JUNK =
  /(?:[\s,;:&/+\-–—|(]|\b(?:with|without|for|and|of|to|in|on|plus|w)\b)+$/iu;

function trimTrailing(text: string): string {
  let out = text.trim();
  for (let i = 0; i < 4; i += 1) {
    const next = out.replace(TRAILING_JUNK, "").trim();
    if (next === out) {
      break;
    }
    out = next;
  }
  return out;
}

/** A comma/paren block that only states a warranty or a duration ("2Y", "(3 Years)"). */
function isWarrantyBlock(block: string): boolean {
  return (
    /^\d+\s*(?:years?|yrs?|y|months?|m)\b\.?$/iu.test(block) ||
    /^\d+\s*y\s*w$/iu.test(block) ||
    /\bwarranty\b/iu.test(block)
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type CleanProductName = {
  /** Readable full name (no POS code, ®/™, warranty blocks). */
  clean: string;
  /** Comma/paren/" - " separated blocks of `clean`; [0] is the model. */
  blocks: string[];
  /** POS part code removed from the front, if any. */
  code: string | null;
};

/**
 * Turns a raw POS product name into something readable:
 * "C11CL31503, EPSON EM-C8100 Colour-MFP A3,(Print,Copy,Scan), … Warranty-1y"
 * → "EPSON EM-C8100 Colour-MFP A3 …". A leading code is removed when it is
 * followed by "#" (any length ≥ 4) or by "," and at least 8 characters long
 * with a digit — so a short model like "BY-MM1," stays. The brand is put in
 * front when the name does not mention it (a part named only "FIXING
 * ASSEMBLY"), and written in the store's own casing when it leads the name.
 */
export function cleanProductName(name: string, brandName = ""): CleanProductName {
  // A product page compares its name with every same-brand sibling, so the
  // same names are cleaned on every request — memoised per server process.
  const key = `${brandName}\u0000${name}`;
  const cached = CLEAN_CACHE.get(key);
  if (cached) {
    return cached;
  }
  const result = cleanProductNameUncached(name, brandName);
  if (CLEAN_CACHE.size >= CLEAN_CACHE_MAX) {
    CLEAN_CACHE.clear();
  }
  CLEAN_CACHE.set(key, result);
  return result;
}

const CLEAN_CACHE = new Map<string, CleanProductName>();
const CLEAN_CACHE_MAX = 50_000;

function cleanProductNameUncached(name: string, brandName: string): CleanProductName {
  let text = name.replace(/[®™©]/gu, "").replace(/\s+/g, " ").trim();
  let code: string | null = null;
  const hashCode = text.match(/^([A-Za-z0-9][A-Za-z0-9./+-]{3,})\s*#\s*/u);
  const commaCode = text.match(/^([A-Z0-9][A-Z0-9./+-]{7,})\s*,\s*/u);
  const lead =
    hashCode ??
    (commaCode && /\d/.test(commaCode[1] ?? "") ? commaCode : null);
  if (lead) {
    code = lead[1] ?? null;
    text = text.slice(lead[0].length);
  }
  text = text
    .replace(/\s*#\s*/gu, " ")
    .replace(/\(?\b(?:no|without)\s+warranty\b\)?/giu, " ")
    .replace(
      /\b\d+\s*(?:years?|yrs?|months?)\s+(?:official\s+|replacement\s+)?warranty\b/giu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  text = softenShouting(text);

  const blocks = text
    .split(/\s*(?:,|\(|\)|\[|\]|_|\s[-–—]\s|\s[-–—]|[-–—]\s|\|)\s*/u)
    .map((block) => trimTrailing(block.replace(/^[-–—/\s]+/u, "")))
    .filter((block) => block.length > 0 && !isWarrantyBlock(block));

  const brand = brandName.trim();
  const first = blocks[0];
  if (first !== undefined && brand) {
    const leading = new RegExp(`^${escapeRegExp(brand)}\\b`, "iu");
    const anywhere = new RegExp(`\\b${escapeRegExp(brand)}\\b`, "iu");
    if (leading.test(first)) {
      blocks[0] = first.replace(leading, brand);
    } else if (!anywhere.test(text)) {
      blocks[0] = `${brand} ${first}`;
    }
  }
  return { clean: blocks.join(" "), blocks, code };
}

/** Model block first, then short spec blocks while they fit in `max`. */
function shortFromBlocks(blocks: string[], max: number): string {
  if (blocks.length === 0) {
    return "";
  }
  let out = trimTrailing(cutAtWord(blocks[0] ?? "", max));
  for (const block of blocks.slice(1)) {
    if (block.length > 32 || /^[A-Z0-9#./+-]{8,}$/u.test(block)) {
      continue;
    }
    const next = `${out} ${block}`;
    if (next.length > max) {
      break;
    }
    out = next;
  }
  return trimTrailing(out);
}

export function shortProductName(
  name: string,
  max = PRODUCT_NAME_MAX,
  brandName = "",
): string {
  const { blocks } = cleanProductName(name, brandName);
  return shortFromBlocks(blocks, max) || cutAtWord(name.trim(), max);
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/[\s/]+/u).filter(Boolean);
}

/**
 * The name used in a product's title and description. Same as
 * `shortProductName` unless another product of the same brand gets the same
 * short name (colour / part-code variants) — then the words only this
 * product's name has are added, and failing that its part code, so the
 * titles stay unique. Identical names in the database stay identical.
 */
export function productLabel(
  name: string,
  brandName: string,
  siblingNames: string[] = [],
  max = PRODUCT_NAME_MAX,
): string {
  const own = cleanProductName(name, brandName);
  const short = shortFromBlocks(own.blocks, max) || cutAtWord(name.trim(), max);
  const rivals = siblingNames
    .filter((other) => other.trim() !== name.trim())
    .map((other) => cleanProductName(other, brandName))
    .filter((other) => shortFromBlocks(other.blocks, max) === short);
  if (rivals.length === 0) {
    return short;
  }
  const shortWords = new Set(wordsOf(short));
  // Greedy: add words of this product's name (in order) until every rival
  // is missing at least one of them; then the part code if still needed.
  // 1–2 letter tags such as "(N)" / "(S)" are not used — names that differ
  // only by those are duplicate listings, reported rather than papered over.
  let unresolved = rivals.map((rival) => ({
    words: new Set(wordsOf(rival.clean)),
    code: rival.code?.toLowerCase() ?? null,
  }));
  const tokens: string[] = [];
  for (const word of own.clean.split(/\s+/u)) {
    if (unresolved.length === 0) {
      break;
    }
    if (/^[\p{L}©]{1,2}$/u.test(word) || STOP_WORDS.has(word.toLowerCase())) {
      continue;
    }
    const parts = wordsOf(word).filter((part) => !shortWords.has(part));
    if (parts.length === 0) {
      continue;
    }
    const separates = (rival: { words: Set<string> }) =>
      parts.some((part) => !rival.words.has(part));
    if (unresolved.some(separates)) {
      tokens.push(word);
      unresolved = unresolved.filter((rival) => !separates(rival));
    }
  }
  if (
    unresolved.length > 0 &&
    own.code &&
    unresolved.some((rival) => rival.code !== own.code!.toLowerCase())
  ) {
    tokens.push(own.code);
  }
  if (tokens.length === 0) {
    return short;
  }
  // The distinguishing tokens get up to (max − 32) chars as whole tokens;
  // the base then keeps as many whole words of the short name as still fit,
  // never fewer than ~32 chars' worth, so the model code survives.
  const limit = max - Math.min(short.length, 32) - 1;
  let extra = "";
  for (const token of tokens) {
    const next = extra ? `${extra} ${token}` : token;
    if (next.length > limit) {
      break;
    }
    extra = next;
  }
  if (!extra) {
    extra = cutAtWord(tokens[0] ?? "", limit);
  }
  const base = wholeWords(short, max - extra.length - 1);
  return dedupeWords(trimTrailing(`${base} ${extra}`));
}

/** Leading whole words of `text` within `max` (always at least one word). */
function wholeWords(text: string, max: number): string {
  const parts = text.split(/\s+/u);
  let out = parts[0] ?? "";
  for (const part of parts.slice(1)) {
    if (`${out} ${part}`.length > max) {
      break;
    }
    out = `${out} ${part}`;
  }
  return trimTrailing(out);
}

/** Drops a word that repeats one already in the label ("2-Port 2-Port"). */
function dedupeWords(text: string): string {
  const seen = new Set<string>();
  return text
    .split(/\s+/u)
    .filter((word) => {
      const key = word.toLowerCase();
      if (key.length > 2 && seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .join(" ");
}

export function productTitle(
  name: string,
  brandName = "",
  siblingNames: string[] = [],
): string {
  const label = productLabel(name, brandName, siblingNames);
  const { clean } = cleanProductName(name, brandName);
  const candidates = [`${label} Price in BD${SUFFIX}`, `${label} Price in BD`];
  if (clean && label === shortProductName(name, PRODUCT_NAME_MAX, brandName)) {
    // Not disambiguated: the whole clean name may fit with the suffix.
    candidates.unshift(`${clean} Price in BD${SUFFIX}`);
  }
  return fitTitle(candidates);
}

export type ProductMetaInput = {
  name: string;
  brandName: string;
  /** Price the page shows (BDT), or null when the page hides the price. */
  displayPrice: number | null;
  isPreOrder: boolean;
  isComingSoon: boolean;
  warrantyLabel: string;
  /** EMI teaser shown on the page for this product. */
  emi: boolean;
  /** Other active products of the same brand (for unique wording). */
  siblingNames?: string[];
};

function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString("en-US")}`;
}

/** "1 year warranty" style phrase, or "" when there is none worth stating. */
function warrantyPhrase(label: string): string {
  const clean = label.replace(/\s+/g, " ").trim();
  if (!clean || /^(?:no|none|n\/a|without)\b/i.test(clean)) {
    return "";
  }
  const lower = clean.toLowerCase();
  return /warranty/.test(lower) ? lower : `${lower} warranty`;
}

export function productDescription(input: ProductMetaInput): string {
  const short = productLabel(
    input.name,
    input.brandName,
    input.siblingNames ?? [],
    72,
  );
  const brand = input.brandName.trim();
  const warranty = warrantyPhrase(input.warrantyLabel);
  const lead =
    input.displayPrice != null
      ? `${short} price in BD is ${formatTaka(input.displayPrice)}${input.isPreOrder ? " (pre-order)" : ""}.`
      : input.isComingSoon
        ? `${short} is coming soon to ${SITE_NAME}.`
        : `${short} price in BD and availability at ${SITE_NAME}.`;
  const optional = [
    warranty && brand ? `${upperFirst(warranty)}, genuine ${brand}.` : "",
    warranty && !brand ? `${upperFirst(warranty)}.` : "",
    !warranty && brand ? `Genuine ${brand} product.` : "",
    input.emi ? "EMI available." : "",
    "Delivery across Bangladesh.",
    [`Order online from ${SITE_NAME}.`, "Order online today.", "Buy online."],
    ["Check specs, reviews and stock.", "Check specs and stock."],
  ].filter((entry) => entry.length > 0);
  return fitDescription([lead], optional);
}

// ---------------------------------------------------------------------------
// Static pages (B6)
// ---------------------------------------------------------------------------

export type StaticPageMeta = { title: string; description: string };

/**
 * Hand-written per page. The content pages (about, warranty, …) are still
 * placeholders on the live site, so their descriptions say what the page is
 * for rather than promising details it does not contain yet.
 */
export const STATIC_PAGE_META: Record<string, StaticPageMeta> = {
  "/about": {
    title: "About Techno House | Computer Shop in Dhaka",
    description:
      "Techno House is a computer and laptop shop on New Elephant Road, Dhaka, selling laptops, PC parts, monitors and gadgets online across Bangladesh.",
  },
  "/contact": {
    title: "Contact Techno House | Computer Shop, Elephant Road",
    description:
      "Contact Techno House, a laptop and computer shop at 85 Laboratory Road, New Elephant Road, Dhaka-1205. Call, email or visit us, open 9 AM to 10 PM.",
  },
  "/faq": {
    title: "FAQ: Orders, Delivery & Warranty | Techno House",
    description:
      "Frequently asked questions about shopping at Techno House: placing an order, payment options, delivery across Bangladesh, warranty claims and returns.",
  },
  "/support": {
    title: "Customer Support | Techno House",
    description:
      "Need help with a Techno House order, delivery, warranty claim or product question? Send our support desk a message and the team in Dhaka will reply.",
  },
  "/warranty": {
    title: "Warranty Policy | Techno House",
    description:
      "Warranty information for products bought from Techno House: warranty periods, how to make a warranty claim and how service is handled in Dhaka, Bangladesh.",
  },
  "/shipping": {
    title: "Shipping & Delivery in Bangladesh | Techno House",
    description:
      "Shipping and delivery information for Techno House orders: where we deliver in Bangladesh, delivery charges inside and outside Dhaka, and delivery times.",
  },
  "/returns": {
    title: "Return & Refund Policy | Techno House",
    description:
      "Return and refund policy for Techno House orders: which products can be returned, the time limit, the condition required and how refunds are processed.",
  },
  "/terms": {
    title: "Terms & Conditions | Techno House",
    description:
      "The terms and conditions for using the Techno House website and buying laptops, computers and electronics from Techno House online in Bangladesh.",
  },
  "/privacy": {
    title: "Privacy Policy | Techno House",
    description:
      "How Techno House collects, uses and protects your personal information when you browse technohouse.com.bd, create an account or place an order online.",
  },
  "/digital-commerce-guideline": {
    title: "Digital Commerce Guideline 2021 | Techno House",
    description:
      "ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১: the Bangladesh Ministry of Commerce digital commerce guideline that Techno House follows for online orders.",
  },
  "/brands": {
    title: "Laptop & Computer Brands in Bangladesh | Techno House",
    description:
      "All laptop brands in Bangladesh and computer brands in BD at Techno House: ASUS, HP, Lenovo, Dell, Acer, MSI, Gigabyte, Apple, Intel, AMD and many more.",
  },
  "/offers": {
    title: "Laptop Offers & Computer Offers in BD | Techno House",
    description:
      "Current laptop offers in BD and computer offer prices at Techno House: limited-time campaigns and discounts on laptops, PC parts, monitors and gadgets.",
  },
  "/deals": {
    title: "Tech Deals in Bangladesh | Techno House",
    description:
      "Tech deals in Bangladesh at Techno House: discounted laptops, monitors, PC components and accessories in one list. Find the best computer offer price in BD.",
  },
  "/flash-sale": {
    title: "Flash Sale: Limited-Time Tech Deals | Techno House",
    description:
      "Techno House flash sale: limited-time prices on laptops, PC parts, monitors and gadgets in Bangladesh. Check the countdown and order before the deal ends.",
  },
  "/pc-builder": {
    title: "PC Builder Bangladesh: Build Your PC Online | Techno House",
    description:
      "PC builder Bangladesh: pick a processor, motherboard, RAM, graphics card and more with compatibility checks and a live total. Get your PC build price in BD.",
  },
  "/blog": {
    title: "Tech Blog: Buying Guides & Tips | Techno House",
    description:
      "Buying guides, comparisons and tech tips from Techno House to help you choose the right laptop, PC parts, monitor or gadget to buy in Bangladesh.",
  },
  "/shop": {
    title: "Shop Laptops, PC Parts & Electronics | Techno House",
    description:
      "Shop all products at Techno House: laptops, desktop PCs, PC components, monitors, phones, networking and accessories with delivery across Bangladesh.",
  },
  "/complaint": {
    title: "Submit a Complaint | Techno House",
    description:
      "Had a problem with a Techno House order, product or service? Submit a complaint with your order details and our team will review it and get back to you.",
  },
  "/product-request": {
    title: "Request a Product | Techno House",
    description:
      "Can't find the laptop, PC part or gadget you need? Send Techno House a product request and our team will check availability and price for you in Bangladesh.",
  },
  "/track": {
    title: "Track Your Order | Techno House",
    description:
      "Track your Techno House order with your order number or phone number and see its current status, from confirmation and packing to delivery in Bangladesh.",
  },
};

export function staticPageMeta(path: string): StaticPageMeta {
  const meta = STATIC_PAGE_META[path];
  if (!meta) {
    throw new Error(`No static SEO meta for ${path}`);
  }
  return meta;
}
