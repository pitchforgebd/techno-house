/**
 * Product SEO generator v2 (SEO phase 8). PURE: no database, no I/O.
 *
 * Builds a proposed SEO title, meta description, primary keyword and main-image
 * alt for a product from fields the database already holds (name, brand,
 * category chain, attributes / spec rows). Nothing here states a price, stock,
 * warranty or delivery time: the closing sentence is fixed and neutral.
 *
 * Rules (decided with the owner, docs/SEO-NOTES.md "Phase 8"):
 *  - Title "{Brand} {Model} {Type} Price in Bangladesh", at most 60 characters.
 *    The model code and the product type are NEVER cut. Too long -> "Price in
 *    BD", still with model + type. " | Techno House" only when it still fits.
 *  - Meta description 120-155 characters: 3-4 real specs chosen by per-family
 *    templates, junk values dropped, then a neutral closing sentence (4
 *    deterministic variants picked by a hash of the product id).
 *  - Title collisions are resolved by adding the distinguishing spec (RAM,
 *    storage, capacity, size, colour, part code); if two products still collide
 *    they are flagged `needsReview` and must not be written.
 *  - Image alt "{Brand} {Model} {Type}" always includes the type.
 */
import { formFactorOf, formFactorsIn } from "@/lib/catalog/form-factor";
import { extractGpuChipFromName, extractGpuMemoryFromName } from "@/lib/catalog/gpu-extract";
import { extractNameSpecs, type NameSpecs } from "@/lib/catalog/spec-extract";
import { applyCasing, casingOfToken, isShoutedWord, titleCaseShouted } from "@/lib/seo/casing";
import { claimEvidence, findBadSpecPhrases, unsupportedClaims } from "@/lib/seo/claims";
import { cutAtWord, softenShouting } from "@/lib/seo/page-meta";

export const SEO_TITLE_MAX = 60;
export const SEO_DESC_MIN = 120;
export const SEO_DESC_MAX = 155;
export const SEO_ALT_MAX = 125;
/** Hard server-side caps for stored text (the admin counters advise 60 / 155). */
export const META_TITLE_STORE_MAX = 100;
export const META_DESCRIPTION_STORE_MAX = 200;
const SITE = "Techno House";

export type SpecFact = { key?: string; label: string; value: string };

export type SeoProductInput = {
  id: string;
  name: string;
  sku?: string | null;
  modelNumber?: string | null;
  brand: string;
  /** Category names, leaf first, then its ancestors. */
  categoryChain: string[];
  /** Attribute values, spec rows and spec chips, in any order. */
  specs: SpecFact[];
};

export type SeoResult = {
  id: string;
  title: string;
  /** Title without the "Price in …" / brand suffix: brand + model core + type. The keyword and alt use it. */
  titleCore: string;
  /** How the title was built (for the review CSV). */
  titleRule: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  imageAlt: string;
  family: FamilyId;
  /** Weight for batch selection (3 = priority family, 1 = other). */
  familyWeight: 1 | 3;
  type: string;
  specsUsed: string[];
  /** Spec phrases the data supports (up to 4), whether or not they all fit in 155 chars. */
  specsAvailable: number;
  /** e.g. few_specs, no_model_token, title_over_60, title_collision, model_token_lost, foreign_code. */
  flags: string[];
  /** Model-looking tokens of the name's model core that are missing from the title (must be empty). */
  modelTokensLost: string[];
  /** Characters / patterns in the title, keyword or description outside the safe set (must be empty). */
  badChars: string[];
  /** Spec values that are zero or empty in the description (must be empty). */
  zeroSpecs: string[];
  /** A form factor in the description that the raw name contradicts (must be empty). */
  claimConflicts: string[];
  /** Machine-looking spec wording: "8GB size", "6.57 inch, 6.57 inches", one quantity twice (must be empty). */
  badSpecPhrases: string[];
  /** Claims (microphone, ANC, wireless, in-ear ...) the name / trusted specs do not back: dropped before writing. */
  unsupportedClaims: string[];
  /** How many stored specs were dropped because of such a claim (what the description would otherwise have stated). */
  claimSpecsDropped: number;
  /** Set when the title still collides with another product after disambiguation. */
  collisionGroup: string | null;
  /** True when the result must not be written without a human look. */
  needsReview: boolean;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const squash = (text: string) => text.replace(/\s+/g, " ").trim();
const g = (match: RegExpMatchArray | null, index: number) => match?.[index] ?? "";
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const trimNum = (text: string) => text.replace(/\.0+$/, "");

/** FNV-1a: the same product id always picks the same wording variant. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// Families (leaf category first, then the whole chain; first match wins)
// ---------------------------------------------------------------------------

export type FamilyId =
  | "laptop" | "desktop" | "monitor" | "motherboard" | "gpu" | "processor" | "ram"
  | "ssd" | "hdd" | "psu" | "case" | "cooler" | "large-format-printer" | "printer"
  | "camera" | "nvr" | "router" | "switch" | "cable" | "ip-phone" | "flat-panel"
  | "capture-card" | "headphone" | "speaker" | "keyboard" | "mouse" | "ups" | "other";

type Family = { id: FamilyId; re: RegExp; weight: 1 | 3 };

/** weight 3: tier-1 families + low-competition families from the owner's brief. */
const FAMILIES: Family[] = [
  { id: "large-format-printer", re: /large format/i, weight: 3 },
  { id: "flat-panel", re: /interactive|flat panel|smart board/i, weight: 3 },
  { id: "capture-card", re: /capture card/i, weight: 3 },
  { id: "ip-phone", re: /ip phone|voip|sip phone/i, weight: 3 },
  { id: "nvr", re: /\bnvr\b|\bdvr\b|\bxvr\b|video recorder/i, weight: 3 },
  { id: "camera", re: /ip camera|cc ?camera|cctv|camera/i, weight: 3 },
  { id: "motherboard", re: /motherboard/i, weight: 3 },
  { id: "gpu", re: /graphics card|\bgpu\b|video card/i, weight: 3 },
  { id: "processor", re: /processor|\bcpu\b(?!\s*cooler)/i, weight: 3 },
  { id: "ram", re: /\bram\b|memory module/i, weight: 3 },
  { id: "laptop", re: /laptop|notebook|macbook/i, weight: 3 },
  { id: "monitor", re: /monitor/i, weight: 3 },
  { id: "desktop", re: /desktop|gaming pc|brand pc|all-in-one|star pc/i, weight: 3 },
  { id: "cable", re: /\butp\b|fib(?:er|re)|patch|cable|cord/i, weight: 3 },
  { id: "ssd", re: /\bssd\b|nvme/i, weight: 1 },
  { id: "hdd", re: /hard disk|\bhdd\b|hard drive/i, weight: 1 },
  { id: "psu", re: /power supply|\bpsu\b/i, weight: 1 },
  { id: "case", re: /casing|\bcase\b|cabinet|chassis/i, weight: 1 },
  { id: "cooler", re: /cooler|cooling|heatsink|radiator/i, weight: 1 },
  { id: "printer", re: /printer|photocopier|copier|scanner/i, weight: 1 },
  { id: "router", re: /router|access point|wifi|wi-fi|wireless/i, weight: 1 },
  { id: "switch", re: /switch|network/i, weight: 1 },
  { id: "headphone", re: /headphone|headset|earphone|earbud/i, weight: 1 },
  { id: "speaker", re: /speaker|soundbar|home theater/i, weight: 1 },
  { id: "keyboard", re: /keyboard/i, weight: 1 },
  { id: "mouse", re: /\bmouse\b|mice/i, weight: 1 },
  { id: "ups", re: /\bups\b|\bups\/|inverter|stabilizer/i, weight: 1 },
];

/** Catch-all / promotional categories that say nothing about what a product is. */
const UMBRELLA =
  /^(?:.*\boffers?\b.*|all\b.*|for\b.*|components?|accessories|gadgets?|daily lifestyle|power|security|appliances?|server & storage|office equipment)$/iu;
const KEEP_PLURAL = new Set(["wireless", "cctv", "plus", "series", "gps", "bluetooth", "access", "ups"]);

function singular(name: string): string {
  const words = squash(name.replace(/\([^)]*\)/g, " ")).split(" ");
  const last = words.pop() ?? "";
  let out = last;
  if (/[^aeiou]ies$/i.test(last)) out = last.replace(/ies$/i, "y");
  else if (/s$/i.test(last) && !/ss$/i.test(last) && !KEEP_PLURAL.has(last.toLowerCase())) out = last.replace(/s$/i, "");
  return [...words, out].join(" ");
}

function familyOf(chain: string[]): Family {
  const leaf = squash((chain[0] ?? "").replace(/\([^)]*\)/g, " "));
  const all = chain.join(" > ");
  return (
    FAMILIES.find((family) => family.re.test(leaf)) ??
    FAMILIES.find((family) => family.re.test(all)) ?? { id: "other", re: /$^/, weight: 1 }
  );
}

/**
 * A leaf that names a bucket, not a product ("Mobile Accessories", "Laptop Accessories", "Computer Peripherals"):
 * a phone sitting in "Mobile Accessories" must never be called "Mobile Accessory", and its parent ("Phone") would be
 * just as wrong for the accessories next to it. Such a leaf means: no category type, the raw name must state one.
 */
const GENERIC_LEAF = /\b(?:accessor(?:y|ies)|gadgets?|components?|peripherals?|equipment|products?|items?|miscellaneous|others?)$/iu;

/** Readable product type candidates, leaf first: umbrella categories skipped. */
function typeCandidates(chain: string[]): string[] {
  const leaf = squash((chain[0] ?? "").replace(/\([^)]*\)/g, " "));
  if (leaf && !UMBRELLA.test(leaf) && GENERIC_LEAF.test(leaf)) return [];
  return chain
    .filter((name) => name && !UMBRELLA.test(squash(name)))
    .map(singular)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Specs: junk filter + per-family slot templates
// ---------------------------------------------------------------------------

const BOOLEANISH = /^(?:yes|no|true|false|y|n)$/i;
const EMPTYISH =
  /^(?:default|n\/a|na|none|nil|null|unknown|other|others|standard|normal|not (?:available|applicable|supported|specified)|-+|\.+|\?+|0)$/i;
/** Words a spec phrase must never carry (we make no such claims). */
const CLAIM_WORDS = /\b(?:price|prices|stock|warranty|guarantee|genuine|official|order|buy|available|availability|taka|bdt|tk)\b|৳/i;

/** A value that says nothing ("Default", "N/A", "POS Printer item", "Air Air"). */
export function isJunkValue(raw: string, brand = ""): boolean {
  const value = squash(raw);
  if (!value || value.length > 40) return true;
  if (EMPTYISH.test(value) || BOOLEANISH.test(value)) return true;
  if (/\bdefault\b/i.test(value) || /\bitem\b/i.test(value) || /https?:|www\./i.test(value)) return true;
  if (!/[a-z0-9]/i.test(value)) return true;
  if (brand && value.toLowerCase() === brand.toLowerCase()) return true;
  return hasRepeatedWord(value);
}

function hasRepeatedWord(text: string): boolean {
  const seen = new Set<string>();
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)) {
    if (seen.has(word)) return true;
    seen.add(word);
  }
  return false;
}

type Ctx = { brand: string };
type Slot = {
  keys: string[];
  label: RegExp;
  /** Boolean-ish values (Yes / Supported) are a real answer for this slot. */
  allowBool?: boolean;
  read: (value: string, ctx: Ctx) => string | null;
};

const GB = /(\d+(?:\.\d+)?)\s?(TB|GB)\b/i;
const INCH = /(\d{1,3}(?:\.\d{1,2})?)\s?(?:inch(?:es)?|in\b|"|”|″)/i;
const CPU_OK = /(core\s?(?:i[3579]|ultra|\d)|\bi[3579]-?\d|ryzen|athlon|celeron|pentium|xeon|threadripper|epyc|apple m\d|\bm[1-9]\b|snapdragon|\bn\d{2,3}\b)/i;
const GPU_OK = /(rtx|gtx|geforce|radeon|\brx\s?\d|arc\s?[ab]\d|quadro|iris|uhd graphics|vega|integrated)/i;
const SOCKET_OK = /^(AM[3-5]\+?|LGA\s?\d{3,4}|FM[12]\+?|sTRX?\d|SP[35]|TR4|sWRX8)/i;

const SLOTS: Record<string, Slot> = {
  cpu: { keys: ["processor"], label: /^(processor|cpu|processor (?:model|name|type)|cpu (?:model|name|type))$/i, read: (v) => (CPU_OK.test(v) && v.length <= 32 ? squash(v.replace(/\s*processor$/i, "")) : null) },
  ram: { keys: ["ram"], label: /^(ram|memory|system memory|ram size|memory size|installed memory)$/i, read: (v) => { const m = v.match(GB); return m && Number(m[1]) >= 1 ? `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()} RAM` : null; } },
  storage: { keys: ["storage"], label: /^(storage|storage capacity|ssd|hdd|hard disk|hard drive|disk|drive capacity|ssd capacity)$/i, read: (v) => { const m = v.match(GB); if (!m) return null; const type = g(v.match(/(NVMe|SSD|HDD|eMMC)/i), 1); return `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()} ${type ? type.replace(/^nvme$/i, "NVMe SSD").toUpperCase().replace("NVME SSD", "NVMe SSD") : "storage"}`; } },
  display_size: { keys: ["size"], label: /^(display|screen|display size|screen size|size|panel size|monitor size)$/i, read: (v) => { const m = v.match(INCH); return m ? `${trimNum(g(m, 1))} inch display` : null; } },
  resolution: { keys: [], label: /^(resolution|display resolution|screen resolution|max resolution|maximum resolution|native resolution)$/i, read: (v) => { const d = v.match(/(\d{3,4})\s?[x×*]\s?(\d{3,4})/); if (d) return `${g(d, 1)}x${g(d, 2)} resolution`; const t = v.match(/\b(4K|8K|2K|UHD|QHD|WQHD|FHD|Full ?HD|HD)\b/i); return t ? `${g(t, 1).toUpperCase().replace(/^FULL ?HD$/, "Full HD")} resolution` : null; } },
  refresh: { keys: [], label: /^(refresh rate|refresh|max refresh rate)$/i, read: (v) => { const m = v.match(/(\d{2,3})\s?hz\b/i); return m ? `${g(m, 1)}Hz refresh rate` : null; } },
  panel: { keys: ["panel"], label: /^(panel|panel type|display type|screen type)$/i, read: (v) => { const m = v.match(/^(IPS|VA|TN|OLED|AMOLED|PLS|AMVA|MVA)\b/i); return m ? `${g(m, 1).toUpperCase()} panel` : null; } },
  gpu_chip: { keys: ["graphics"], label: /^(graphics|gpu|graphics chip|chipset|gpu model|graphics processor|video card|graphics card)$/i, read: (v) => (GPU_OK.test(v) && v.length <= 32 ? squash(v) : null) },
  vram: { keys: ["memory"], label: /^(memory|video memory|vram|graphics memory|memory size|memory capacity)$/i, read: (v) => { const m = v.match(GB); if (!m) return null; const t = g(v.match(/(GDDR\d[A-Z]?|HBM\d?[A-Z]?)/i), 1).toUpperCase(); return `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()} ${t || "VRAM"}`; } },
  socket: { keys: ["socket"], label: /^(socket|cpu socket|socket type|supported socket)$/i, read: (v) => (SOCKET_OK.test(v) ? `${squash(v).toUpperCase().replace(/^LGA\s/, "LGA")} socket` : null) },
  mb_chipset: { keys: [], label: /^chipset$/i, read: (v) => { const m = v.match(/\b([ABHXZQWC]\d{2,3}[A-Z]?|TRX\d+|WRX\d+)\b/i); return m ? `${g(m, 1).toUpperCase()} chipset` : null; } },
  form_factor: { keys: ["formFactor"], label: /^(form factor|motherboard form factor|board size|supported form factor)$/i, read: (v) => { const ff = formFactorOf(v); return ff ? `${ff} form factor` : null; } },
  mem_type: { keys: ["ramType"], label: /^(memory type|ram type|supported memory|memory support|memory)$/i, read: (v) => { const m = v.match(/DDR[2-5]\w*/i); return m ? `${m[0].toUpperCase()} memory` : null; } },
  mem_speed: { keys: [], label: /^(speed|memory speed|frequency|clock speed|bus|bus speed)$/i, read: (v) => { const m = v.match(/(\d{3,5})\s?(MHz|MT\/s)/i); return m ? `${g(m, 1)}${g(m, 2).replace(/mt\/s/i, "MT/s").replace(/mhz/i, "MHz")}` : null; } },
  ram_capacity: { keys: ["capacity", "ram"], label: /^(capacity|memory capacity|ram capacity|size|memory size|total capacity)$/i, read: (v) => { const m = v.match(GB); return m ? `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()}` : null; } },
  ram_kit: { keys: [], label: /^(kit|modules?|configuration|kit configuration)$/i, read: (v) => { const m = v.match(/(\d)\s?[x×]\s?(\d+)\s?(GB)/i); return m ? `${g(m, 1)}x${g(m, 2)}GB kit` : null; } },
  cas: { keys: [], label: /^(cas latency|latency|timings?|cl)$/i, read: (v) => { const m = v.match(/\bCL?\s?(\d{2})\b/i); return m ? `CL${g(m, 1)} latency` : null; } },
  cores: { keys: ["cores"], label: /^(cores|core count|number of cores|total cores|cpu cores)$/i, read: (v) => { const m = v.match(/(\d{1,3})/); return m && Number(m[1]) <= 128 ? `${g(m, 1)} cores` : null; } },
  threads: { keys: [], label: /^(threads|thread count|number of threads|total threads)$/i, read: (v) => { const m = v.match(/(\d{1,3})/); return m && Number(m[1]) <= 256 ? `${g(m, 1)} threads` : null; } },
  base_clock: { keys: [], label: /^(base (?:clock|frequency|speed)|processor base frequency|clock speed|base)$/i, read: (v) => { const m = v.match(/(\d(?:\.\d+)?)\s?GHz/i); return m ? `${g(m, 1)}GHz base` : null; } },
  boost_clock: { keys: [], label: /^(max turbo frequency|boost (?:clock|frequency)|max boost clock|turbo|max frequency|max turbo)$/i, read: (v) => { const m = v.match(/(\d(?:\.\d+)?)\s?GHz/i); return m ? `${g(m, 1)}GHz boost` : null; } },
  wattage: { keys: ["wattage"], label: /^(wattage|power|power output|rated power|max power|psu wattage|capacity)$/i, read: (v) => { const m = v.match(/(\d{3,4})\s?W\b/i); return m ? `${g(m, 1)}W` : null; } },
  efficiency: { keys: [], label: /(efficiency|certification|80 ?plus)/i, read: (v) => { const m = v.match(/(white|bronze|silver|gold|platinum|titanium)/i); return m ? `80 Plus ${g(m, 1).replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase())}` : null; } },
  modular: { keys: [], label: /modular/i, allowBool: true, read: (v) => { const m = v.match(/(fully|semi|non)[- ]?modular/i); return m ? `${g(m, 1).replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase())} modular` : null; } },
  cooler_type: { keys: ["coolerType"], label: /^(cooler type|cooling type|type|cooling method)$/i, read: (v) => (/^(air|liquid|aio|water)/i.test(v) ? (/^air/i.test(v) ? "Air cooling" : "Liquid cooling") : null) },
  fan_size: { keys: ["size"], label: /(fan size|fan)/i, read: (v) => { const m = v.match(/(\d{2,3})\s?mm/i); return m ? `${g(m, 1)}mm fan` : null; } },
  tdp: { keys: [], label: /^(tdp|max tdp|thermal design power|tdp support)$/i, read: (v) => { const m = v.match(/(\d{2,3})\s?W/i); return m ? `${g(m, 1)}W TDP` : null; } },
  case_type: { keys: [], label: /^(case type|type|form factor|case size)$/i, read: (v) => { const m = v.match(/(Mini|Mid|Full|Super)[- ]?Tower|\bCube\b/i); return m ? `${squash(m[0]).replace(/^./, (c) => c.toUpperCase())} case` : null; } },
  side_panel: { keys: [], label: /(side panel|window)/i, read: (v) => { const m = v.match(/(tempered glass|acrylic|mesh|glass)/i); return m ? `${g(m, 1).toLowerCase().replace(/^./, (c) => c.toUpperCase())} side panel` : null; } },
  connectivity: { keys: ["connectivity"], label: /^(connectivity|connection|connection type|interface|connector|interface type)$/i, read: (v) => (/^(wireless|bluetooth|wired|usb(?:[- ]?[ac])?|wi-?fi|2\.4g|ethernet|hdmi|displayport|sata|pcie|nvme|m\.2)/i.test(v) && v.length <= 28 ? squash(v) : null) },
  net_speed: { keys: [], label: /^(speed|data rate|max speed|network speed|wifi speed|wireless speed|transfer rate)$/i, read: (v) => { const m = v.match(/(\d+(?:\.\d+)?)\s?(Mbps|Gbps)/i); return m ? `${trimNum(g(m, 1))}${g(m, 2).replace(/mbps/i, "Mbps").replace(/gbps/i, "Gbps")}` : null; } },
  wifi_std: { keys: [], label: /^(wi-?fi (?:standard|type)|wireless standard|standard|protocol)$/i, read: (v) => { const m = v.match(/(Wi-?Fi ?[4-7]|802\.11[a-z/]+|\bAX\d{3,4}|\bAC\d{3,4}|\bN\d{3})/i); if (!m) return null; const w = squash(g(m, 1)); return /^802/.test(w) ? w.toLowerCase() : w.toUpperCase().replace("WI-FI", "Wi-Fi").replace("WIFI", "Wi-Fi"); } },
  net_ports: { keys: [], label: /^(ports?|lan ports?|ethernet ports?|number of ports|port count|total ports)$/i, read: (v) => { const m = v.match(/(\d{1,3})/); return m && Number(m[1]) >= 1 && Number(m[1]) <= 96 ? `${g(m, 1)} ports` : null; } },
  poe: { keys: [], label: /^(poe|power over ethernet|poe support)$/i, allowBool: true, read: (v) => (/^(yes|supported|802\.3a[ft]|true)/i.test(v) ? "PoE support" : null) },
  cable_cat: { keys: [], label: /^(category|cable category|type|grade|cable type)$/i, read: (v) => { const m = v.match(/cat\.?\s?([5-8][ea]?)/i); return m ? `Cat${g(m, 1).toLowerCase().replace(/a$/, "A")}` : null; } },
  cable_len: { keys: [], label: /^(length|cable length)$/i, read: (v) => { const m = v.match(/(\d+(?:\.\d+)?)\s?(m|meters?|ft|feet|cm)\b/i); return m ? `${trimNum(g(m, 1))}${/^m/i.test(g(m, 2)) && g(m, 2).toLowerCase() !== "m" ? "m" : g(m, 2).toLowerCase()} length` : null; } },
  cable_shield: { keys: [], label: /(shield|type|cable type)/i, read: (v) => { const m = v.match(/\b(UTP|STP|FTP|SFTP|U\/UTP|F\/UTP)\b/i); return m ? g(m, 1).toUpperCase() : null; } },
  fiber: { keys: [], label: /(fib(?:er|re)|mode|type|grade)/i, read: (v) => { const m = v.match(/(OM[1-5]|OS[12]|single[- ]mode|multi[- ]?mode)/i); return m ? `${squash(g(m, 1)).replace(/^./, (c) => c.toUpperCase())} fiber` : null; } },
  cable_conn: { keys: [], label: /^(connector|connectors|connector type|connection)$/i, read: (v) => (v.length <= 24 && /[a-z]/i.test(v) ? squash(v) : null) },
  cam_res: { keys: [], label: /^(resolution|camera resolution|video resolution|max resolution|pixels|max\.? resolution)$/i, read: (v) => { const m = v.match(/(\d{1,2}(?:\.\d)?)\s?(MP|megapixels?)/i); return m ? `${trimNum(g(m, 1))}MP` : null; } },
  lens: { keys: [], label: /^(lens|focal length|lens size)$/i, read: (v) => { const m = v.match(/(\d(?:\.\d+)?)\s?mm/i); return m ? `${trimNum(g(m, 1))}mm lens` : null; } },
  ir: { keys: [], label: /^(ir distance|ir range|night vision|infrared distance|ir)$/i, read: (v) => { const m = v.match(/(\d{2,3})\s?(?:m|mtr|meters?)\b/i); return m ? `${g(m, 1)}m IR` : null; } },
  cam_type: { keys: [], label: /^(type|camera type|form|shape|style)$/i, read: (v) => { const m = v.match(/(bullet|dome|ptz|turret|box|cube)/i); return m ? `${g(m, 1).toLowerCase().replace(/^./, (c) => c.toUpperCase()).replace(/^Ptz$/, "PTZ")} camera` : null; } },
  channels: { keys: [], label: /^(channels?|video channels?|number of channels|max channels|ch)$/i, read: (v) => { const m = v.match(/(\d{1,3})/); return m && Number(m[1]) >= 1 ? `${g(m, 1)}-channel` : null; } },
  bays: { keys: [], label: /^(hdd bays?|sata|storage bays|disk slots|hdd|hard disk)$/i, read: (v) => { const m = v.match(/(\d{1,2})/); return m && Number(m[1]) <= 24 ? `${g(m, 1)} HDD bay${g(m, 1) === "1" ? "" : "s"}` : null; } },
  print_tech: { keys: [], label: /^(print (?:technology|type)|printing technology|printer type|type|technology)$/i, read: (v) => { const m = v.match(/(laser|inkjet|thermal|dot matrix|ink tank|led|solid ink)/i); return m ? `${squash(g(m, 1)).replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase())} printing` : null; } },
  print_speed: { keys: [], label: /(print speed|speed|ppm)/i, read: (v) => { const m = v.match(/(\d{1,3})\s?(?:ppm|pages)/i); return m ? `${g(m, 1)}ppm` : null; } },
  print_res: { keys: [], label: /(print resolution|resolution)/i, read: (v) => { const m = v.match(/(\d{3,5})\s?[x×]\s?(\d{3,5})\s?dpi/i); if (m) return `${g(m, 1)}x${g(m, 2)}dpi`; const s = v.match(/(\d{3,5})\s?dpi/i); return s ? `${g(s, 1)}dpi` : null; } },
  paper: { keys: [], label: /(paper size|max paper|media size|paper|media width|print width)$/i, read: (v) => { const m = v.match(/\b(A[0-5]|B[4-5])\b/i); if (m) return `${g(m, 1).toUpperCase()} paper`; const w = v.match(/(\d{2}(?:\.\d)?)\s?(?:inch|"|”)/i); return w ? `${trimNum(g(w, 1))}-inch width` : null; } },
  ups_cap: { keys: [], label: /^(capacity|va rating|power|output power|rating|power capacity)$/i, read: (v) => { const m = v.match(/(\d{3,5})\s?(VA|W)\b/i); return m ? `${g(m, 1)}${g(m, 2).toUpperCase()}` : null; } },
  driver: { keys: [], label: /^(driver size|driver|speaker size|driver unit)$/i, read: (v) => { const m = v.match(/(\d{2})\s?mm/i); return m ? `${g(m, 1)}mm drivers` : null; } },
  audio_type: { keys: ["audioType"], label: /^(type|headphone type|form|wearing style)$/i, read: (v) => { const m = v.match(/(over-?ear|on-?ear|in-?ear|open-?ear|earbuds?|neckband)/i); return m ? squash(g(m, 1)).replace(/^./, (c) => c.toUpperCase()) : null; } },
  mic: { keys: ["microphone"], label: /^(microphone|mic)$/i, allowBool: true, // "Built-in" only when the value says so; a bare yes / supported is just "Microphone".
  read: (v) => (/built[- ]?in/i.test(v) ? "Built-in microphone" : /^(yes|true|with|supported|inline|detachable|boom|noise|mic)/i.test(v) ? "Microphone" : null) },
  touch: { keys: [], label: /^(touch points?|touch)$/i, read: (v) => { const m = v.match(/(\d{1,2})/); return m && Number(m[1]) >= 1 ? `${g(m, 1)}-point touch` : null; } },
  sip: { keys: [], label: /(sip|lines|accounts)/i, read: (v) => { const m = v.match(/(\d{1,2})/); return m && Number(m[1]) >= 1 ? `${g(m, 1)} SIP lines` : null; } },
  capture_res: { keys: [], label: /(max (?:input|resolution)|resolution|passthrough|capture)/i, read: (v) => { const m = v.match(/\b(8K|4K|2K|1440p|1080p)\s?(?:@|at)?\s?(\d{2,3})?\s?(?:fps|hz)?/i); return m ? `${g(m, 1).toUpperCase()}${g(m, 2) ? ` ${g(m, 2)}fps` : ""} capture` : null; } },
  capture_if: { keys: [], label: /^(interface|connection|bus|connectivity)$/i, read: (v) => { const m = v.match(/(USB[ -]?(?:3(?:\.\d)?|C|4)?|PCIe[^,;]{0,8}|Thunderbolt \d?)/i); return m ? squash(g(m, 1)) : null; } },
  storage_cap: { keys: ["capacity", "storage"], label: /^(capacity|storage|storage capacity|drive capacity|disk capacity|size)$/i, read: (v) => { const m = v.match(GB); return m ? `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()}` : null; } },
  drive_if: { keys: [], label: /^(interface|connection|protocol|bus)$/i, read: (v) => { const m = v.match(/(NVMe|SATA(?: III| 3)?|M\.2|PCIe(?: \d\.\d)?|USB[ -]?[3C]?)/i); return m ? squash(g(m, 1)) : null; } },
  read_speed: { keys: [], label: /(read speed|sequential read|read)/i, read: (v) => { const m = v.match(/(\d{3,5})\s?MB\/s/i); return m ? `${g(m, 1)}MB/s read` : null; } },
  rpm: { keys: [], label: /(rpm|speed|rotation)/i, read: (v) => { const m = v.match(/(5400|7200|10000|15000)\s?rpm/i); return m ? `${g(m, 1)}RPM` : null; } },
  drive_form: { keys: [], label: /^(form factor|size|form)$/i, read: (v) => { const m = v.match(/(M\.2 ?\d{4}|2\.5"?|3\.5"?|2\.5 inch|3\.5 inch|U\.2)/i); return m ? squash(g(m, 1)).replace(/"$/, " inch") : null; } },
  mouse_dpi: { keys: [], label: /(dpi|resolution|sensitivity)/i, read: (v) => { const m = v.match(/(\d{3,6})\s?dpi/i); return m ? `${g(m, 1)} DPI` : null; } },
  kb_switch: { keys: [], label: /(switch|key type|keyboard type|type)/i, read: (v) => { const m = v.match(/(mechanical|membrane|scissor|optical)/i); return m ? `${g(m, 1).replace(/^./, (c) => c.toUpperCase()).toLowerCase().replace(/^./, (c) => c.toUpperCase())} keys` : null; } },
  speaker_power: { keys: [], label: /(power|rms|output)/i, read: (v) => { const m = v.match(/(\d{1,4})\s?W\b/i); return m ? `${g(m, 1)}W output` : null; } },
  speaker_ch: { keys: [], label: /(channels?|configuration)/i, read: (v) => { const m = v.match(/\b(\d\.\d)\b/); return m ? `${g(m, 1)} channel` : null; } },
};

/** Spec slots per family, most informative first. The first 3-4 that read become the description. */
const TEMPLATES: Record<FamilyId, string[]> = {
  laptop: ["cpu", "ram", "storage", "display_size", "gpu_chip", "resolution", "refresh"],
  desktop: ["cpu", "ram", "storage", "gpu_chip", "display_size"],
  monitor: ["display_size", "resolution", "panel", "refresh", "connectivity"],
  motherboard: ["socket", "mb_chipset", "form_factor", "mem_type", "mem_speed"],
  gpu: ["gpu_chip", "vram", "connectivity", "drive_if", "tdp"],
  processor: ["cores", "threads", "base_clock", "boost_clock", "socket"],
  ram: ["ram_capacity", "mem_type", "mem_speed", "ram_kit", "cas"],
  ssd: ["storage_cap", "drive_if", "read_speed", "drive_form"],
  hdd: ["storage_cap", "rpm", "drive_if", "drive_form"],
  psu: ["wattage", "efficiency", "modular", "form_factor"],
  case: ["case_type", "form_factor", "side_panel", "fan_size"],
  cooler: ["cooler_type", "fan_size", "tdp", "socket"],
  "large-format-printer": ["print_tech", "paper", "print_res", "connectivity"],
  printer: ["print_tech", "print_speed", "print_res", "paper", "connectivity"],
  camera: ["cam_res", "cam_type", "lens", "ir", "poe"],
  nvr: ["channels", "cam_res", "bays", "poe"],
  router: ["wifi_std", "net_speed", "net_ports", "connectivity"],
  switch: ["net_ports", "net_speed", "poe", "connectivity"],
  cable: ["cable_len", "cable_cat", "cable_shield", "fiber", "cable_conn"],
  "ip-phone": ["sip", "display_size", "poe", "connectivity"],
  "flat-panel": ["display_size", "resolution", "touch", "connectivity"],
  "capture-card": ["capture_res", "capture_if", "connectivity"],
  headphone: ["connectivity", "audio_type", "mic", "driver"],
  speaker: ["speaker_power", "speaker_ch", "connectivity"],
  keyboard: ["connectivity", "kb_switch"],
  mouse: ["connectivity", "mouse_dpi"],
  ups: ["ups_cap", "connectivity"],
  other: ["display_size", "connectivity", "net_speed", "wattage", "storage_cap"],
};

const BLOCKED_LABEL = /(brand|manufacturer|item|series|warranty|model|sku|upc|ean|colou?r|weight|dimension|package|material|origin|country|name|description|note)/i;
const normLabel = (label: string) => squash(label.replace(/[:：]+$/, "")).toLowerCase();
/** "2 TB" -> "2tb", "15.6 inch" -> "15.6inch": a quantity is the same quantity however it is spaced. No lookbehind (bundled into the admin form). */
const QTY_UNIT = /(\d)\s+(tb|gb|mb|ghz|mhz|hz|w|v|mm|cm|inch|mp|mbps|gbps|ppm|dpi|va|mah|ah)\b/gi;
const normQty = (text: string) => text.toLowerCase().replace(/(\d)\s*(?:inches|inch|in\b|["”″])/g, "$1inch").replace(QTY_UNIT, "$1$2");
const phraseKey = (p: string) => normQty(p);

function validPhrase(phrase: string): boolean {
  return phrase.length > 1 && phrase.length <= 36 && !CLAIM_WORDS.test(phrase) && !hasRepeatedWord(phrase);
}

/** A zero quantity in a spec phrase ("0GB storage", "0 ports", "0Hz refresh rate"): never a real spec. */
export function zeroQuantity(text: string): string | null {
  const m = text.match(/(?:^|[^\d.])(0+(?:\.0+)?)\s?(?:gb|tb|mb|ghz|mhz|hz|w|v|mp|mm|cm|inch|mbps|gbps|ppm|dpi|va|ports?|cores?|threads?|sip lines|channels?|-channel|-inch|-point)\b/i);
  return m ? (m[0] ?? "").trim() : null;
}

const FILL_LABEL = /^(interface|connectivity|capacity|speed|ports?|power|memory|storage|output|input)$/;
const DISPLAY_FAMILIES = new Set<FamilyId>(["monitor", "laptop", "flat-panel", "ip-phone"]);

/** 3-4 real spec values (slot id + phrase) for the product's family. Never invents a value. */
export function pickSpecs(
  facts: SpecFact[],
  family: FamilyId,
  brand: string,
  max = 4,
  opts: { accept?: (phrase: string) => boolean; rejected?: string[] } = {},
): SpecValue[] {
  const out: SpecValue[] = [];
  /** "added" / "skipped" (a duplicate or invalid phrase) / "refused" (opts.accept said no: try the next fact). */
  const add = (slot: string, phrase: string | null): "added" | "skipped" | "refused" => {
    if (!phrase || !validPhrase(phrase) || zeroQuantity(phrase)) return "skipped";
    if (opts.accept && !opts.accept(phrase)) {
      opts.rejected?.push(phrase);
      return "refused";
    }
    const key = phraseKey(phrase);
    const firstToken = key.split(" ")[0] ?? "";
    if (out.some(({ phrase: other }) => {
      const o = phraseKey(other);
      return o.includes(key) || key.includes(o) || (/\d/.test(firstToken) && o.split(" ")[0] === firstToken);
    })) return "skipped";
    out.push({ slot, phrase });
    return "added";
  };
  const usable = facts.filter((fact) => squash(fact.value) !== "");
  const ctx: Ctx = { brand };
  for (const slotId of TEMPLATES[family]) {
    if (out.length >= max) break;
    const slot = SLOTS[slotId];
    if (!slot) continue;
    for (const fact of usable) {
      const label = normLabel(fact.label);
      const byKey = Boolean(fact.key && slot.keys.includes(fact.key));
      const byLabel = slot.label.test(label);
      if (!byKey && !byLabel) continue;
      const value = squash(fact.value);
      const bool = BOOLEANISH.test(value);
      if (bool ? !slot.allowBool : isJunkValue(value, brand)) continue;
      if (!bool && hasRepeatedWord(value)) continue;
      const phrase = slot.read(value, ctx);
      if (phrase && add(slotId, phrase) !== "refused") break;
    }
  }
  // Fill: numeric spec rows from a safe label list ("4 ports", "2400 dpi").
  if (out.length < 3) {
    for (const fact of usable) {
      if (out.length >= max) break;
      const label = normLabel(fact.label);
      const value = squash(fact.value);
      if (BLOCKED_LABEL.test(label) || isJunkValue(value, brand)) continue;
      // v2.4: no "size" ("8GB size", "6.57 inches size" say nothing) and "resolution" only where the product HAS a
      // display: a graphics card's "7680x4320" is the largest picture it can drive, not its resolution.
      if (!(FILL_LABEL.test(label) || (label === "resolution" && DISPLAY_FAMILIES.has(family)))) continue;
      if (!/^\d/.test(value) || value.length > 18 || !/[a-z]/i.test(value)) continue;
      add("fill", `${value} ${label}`);
    }
  }
  return out.slice(0, max);
}

/** The phrases only (for tests and reports). */
export function pickSpecPhrases(facts: SpecFact[], family: FamilyId, brand: string, max = 4): string[] {
  return pickSpecs(facts, family, brand, max).map((s) => s.phrase);
}

// ---------------------------------------------------------------------------
// Name -> model core: the brand plus everything in the raw name before the
// first spec boundary. Never cut; only generic words after the last model
// token may be dropped (from the end) to make a title fit.
// ---------------------------------------------------------------------------

const GENERIC_BRAND = /^(?:no ?brand|unbranded|other|others|generic|unknown|n\/a)$/i;

/** Words that are part of a model identity ("A ELITE WF7", "H ARGB", "HS50 PRO STEREO"). */
const LINE_WORDS = new Set(
  "pro elite argb max plus gaming aorus nitro stereo ultra mini lite se xt xtx ti super tuf rog strix prime wifi wi-fi ax eagle vision master xtreme windforce oc premium deluxe carbon surround edge extreme mark".split(" "),
);

/** digit + unit: 8GB, 27inch, 165Hz, 650W, 2MP (a spec, never a model code). */
const SPEC_TOKEN = /^\d+(?:\.\d+)?-?(?:gb|tb|mb|ghz|mhz|hz|w|v|mm|cm|m|mp|ft|kg|g|mah|ah|va|inch|in|pcs|pack|core|cores|port|ports|ch|k|"|”|″|th|rpm|ppm|dpi|fps)$/i;
/** Starts with number + unit: 128MB+128MB, 1200Mbps, 27inch. */
const UNIT_START = /^\d+(?:\.\d+)?\s?(?:gb|tb|mb|ghz|mhz|hz|w|v|mm|cm|mp|ft|kg|mah|va|inch|"|”|″|rpm|ppm|dpi|fps|mbps|gbps|ch)(?![a-z])/i;
const NUMBER = /^\d+(?:\.\d+)?$/;
const UNIT_WORDS_AFTER = new Set("gb tb mb inch inches in hz mhz ghz w mp mm cm x core cores ch port ports pcs pack th".split(" "));
const NOT_MODEL = new Set(["wi-fi", "full-hd", "plug-in", "all-in-one", "dual-band", "tri-band", "low-profile", "heavy-duty", "e-paper", "usb-c", "type-c", "non-stop", "built-in"]);
const CONNECTIVE = /^(?:with|for|w\/|including|featuring|supports?|compatible)$/i;
const CPU_WORD = /^(?:core|ryzen|celeron|pentium|xeon|athlon|epyc|threadripper|snapdragon)$/i;
const DASH_TOKEN = /^[-–—]+$/;
/** Dell / channel SKU suffixes that are not part of the model name: 3420-CORP, 3450-BRAC-SUPP, MT-CORP-. */
const CHANNEL_SUFFIX = /(?:-(?:CORP|BRAC|SUPP|BG|ASA))+-?$/i;
const POS_HASH = /^([A-Za-z0-9][A-Za-z0-9./+-]{3,})\s*#\s*/;
const POS_COMMA = /^([A-Z0-9][A-Z0-9./+-]{7,})\s*,\s*/;

/** Product-type nouns: word -> group. A word in the raw name beats the category's type. */
const TYPE_WORDS: Record<string, string> = {
  headset: "audio", headsets: "audio", headphone: "audio", headphones: "audio", earphone: "audio", earphones: "audio", earbuds: "audio", earbud: "audio",
  router: "network", switch: "network", modem: "network", repeater: "network", extender: "network",
  monitor: "monitor", laptop: "computer", notebook: "computer", desktop: "computer", pc: "computer",
  printer: "print", scanner: "print", photocopier: "print", copier: "print", plotter: "print", toner: "consumable", cartridge: "consumable",
  motherboard: "board", cooler: "cooler", camera: "camera", webcam: "camera", nvr: "camera", dvr: "camera", xvr: "camera",
  keyboard: "input", mouse: "input", ups: "power", charger: "power", psu: "power", adapter: "power", inverter: "power",
  ssd: "storage", hdd: "storage", pendrive: "storage", ram: "memory", memory: "memory", speaker: "sound", soundbar: "sound", microphone: "sound",
  cable: "cable", cord: "cable", gpu: "gpu", processor: "cpu", casing: "case", case: "case", cabinet: "case",
  phone: "mobile", smartphone: "mobile", tablet: "mobile", smartwatch: "watch", watch: "watch", projector: "projector", tv: "tv", television: "tv",
};
const TYPE_PHRASES: [string, string][] = [
  ["graphics card", "gpu"], ["power supply", "power"], ["access point", "network"], ["mouse pad", "input"],
  ["hard disk", "storage"], ["flash drive", "storage"], ["power bank", "power"], ["smart watch", "watch"], ["memory card", "storage"],
];

export type NameInfo = {
  /** All tokens (POS code removed, brand normalised), display casing. */
  all: string[];
  /** Model core, brand first. */
  core: string[];
  coreRaw: string[];
  brandLen: number;
  /** core[0..must) is always kept: the brand, everything up to the model code, and the model run after it. */
  must: number;
  /** Indexes in core of product-type words (kept). */
  typeIdxs: Set<number>;
  /** First product-type word after the spec boundary, if any. */
  restType: string | null;
  hasModel: boolean;
  /** POS part code that led the raw name (it IS in the raw name). */
  code: string | null;
};

const stripEdge = (token: string) => token.replace(/^[(\[]+|[)\],.;:]+$/g, "");
const normTok = (token: string) => token.toLowerCase().replace(/[^a-z0-9]/g, "");

/** A model CODE: contains a digit (and is not a unit like 8GB) or is a hyphenated code (PTP-II, DS-K1). */
function isStrongModel(raw: string): boolean {
  const t = stripEdge(raw).replace(/\+$/, "");
  if (!t) return false;
  if (/\d/.test(t)) return !UNIT_START.test(t) && !SPEC_TOKEN.test(t);
  return /^[A-Za-z]{1,6}-[A-Za-z0-9]+$/.test(t) && /[A-Z]/.test(t) && !NOT_MODEL.has(t.toLowerCase());
}

/** A model LINE WORD: ARGB, ELITE, A, H, II, PRO, GAMING ... (all caps, or one of the known line words). */
function isModelWord(raw: string): boolean {
  const t = stripEdge(raw).replace(/\+$/, "");
  return Boolean(t) && (LINE_WORDS.has(t.toLowerCase()) || /^[A-Z][A-Z0-9-]*$/.test(t));
}

const isModelLooking = (raw: string) => isStrongModel(raw) || isModelWord(raw);

function typeGroupOf(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [phrase, group] of TYPE_PHRASES) if (lower.includes(phrase)) return group;
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const group = TYPE_WORDS[words[i] ?? ""];
    if (group) return group;
  }
  return null;
}

/** Indexes of product-type words in `tokens` (two-word phrases cover both tokens). */
function findTypeIdxs(tokens: string[], from: number, categoryHeads: string[], groups: string[] = []): Set<number> {
  const out = new Set<number>();
  // A word like "Processor" in a motherboard's name ("... ULTRA Series Processor # Z890 UD") is a modifier, not the
  // product type: the name's own word counts only when it agrees with the category (Headset ~ Headphone).
  const agrees = (group: string | undefined) => Boolean(group) && (groups.length === 0 || groups.includes(group as string));
  for (let i = from; i < tokens.length; i += 1) {
    const w = normTok(tokens[i] ?? "");
    const next = normTok(tokens[i + 1] ?? "");
    const phrase = TYPE_PHRASES.find(([text]) => text === `${w} ${next}`.trim() && next);
    if (phrase) {
      if (agrees(phrase[1])) {
        out.add(i);
        out.add(i + 1);
      }
      continue;
    }
    if (agrees(TYPE_WORDS[w]) || categoryHeads.some((head) => head && w === normTok(head).replace(/s$/, "")) || categoryHeads.some((head) => head && w === normTok(head))) out.add(i);
  }
  return out;
}

const tidyCase = (word: string) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const ACRONYMS = new Set("ups ssd hdd nvr dvr xvr pc tv ram gpu psu cpu led lcd usb hdmi ip cc nas".split(" "));
const TYPE_PHRASE_WORDS = new Set(TYPE_PHRASES.flatMap(([phrase]) => phrase.split(" ")));
/** "SUPPLY" -> "Supply" (product-type words only; the shared shouting list is left alone so today's titles do not change). */
function softenType(token: string): string {
  const w = stripEdge(token);
  const lower = w.toLowerCase();
  if (!/^[A-Z]{3,}$/.test(w) || ACRONYMS.has(lower)) return token;
  return TYPE_WORDS[lower] || TYPE_PHRASE_WORDS.has(lower) ? token.replace(w, w.charAt(0) + w.slice(1).toLowerCase()) : token;
}

export function analyseName(input: SeoProductInput, categoryHeads: string[] = [], groups: string[] = []): NameInfo {
  const brand = squash(input.brand);
  const realBrand = brand && !GENERIC_BRAND.test(brand) ? brand : "";
  let text = squash(input.name.replace(/[®™©]/gu, " "));
  let code: string | null = null;
  const hash = text.match(POS_HASH);
  const comma = text.match(POS_COMMA);
  const lead = hash ?? (comma && /\d/.test(comma[1] ?? "") ? comma : null);
  if (lead) {
    code = lead[1] ?? null;
    text = text.slice(lead[0].length);
  }
  text = squash(
    text
      // "IPC2314-WP:High quality", "Non-Inverter,SEA-118SS", "A | B", bullets: separators are boundaries
      .replace(/\s*[:|•·]\s*/g, ", ")
      // 14" / 14'' is the inch unit (it ends the core like any unit); a stray quote or a bracket ends the core too
      .replace(/(\d+(?:\.\d+)?)\s*(?:["”″]|'')/g, " $1inch ")
      .replace(/["“”″]+/g, " ( ")
      .replace(/[(\[]/g, " ( ")
      .replace(/,(?=\S)/g, ", ")
      .replace(/\s*#\s*/g, " ")
      .replace(/\(?\b(?:no|without)\s+warranty\b\)?/giu, " ")
      .replace(/\b\d+\s*(?:years?|yrs?|months?)\s+(?:official\s+|replacement\s+)?warranty\b/giu, " "),
  );
  const rawAll = text.split(" ").filter(Boolean);

  // Brand: use the store's own casing; add it only when the name never says it.
  const brandTokens = realBrand ? realBrand.split(" ") : [];
  let brandLen = 0;
  let raw = rawAll;
  if (brandTokens.length > 0) {
    const leads = brandTokens.every((b, i) => normTok(rawAll[i] ?? "") === normTok(b));
    const anywhere = new RegExp(`(?:^|\\s)${escapeRe(realBrand)}(?:\\s|$)`, "i").test(text);
    const startsWithFirstWord = brandTokens.length > 1 && normTok(rawAll[0] ?? "") === normTok(brandTokens[0] ?? "");
    if (leads) {
      brandLen = brandTokens.length;
      raw = [...brandTokens, ...rawAll.slice(brandTokens.length)];
    } else if (startsWithFirstWord) {
      brandLen = 1;
      raw = [brandTokens[0] ?? "", ...rawAll.slice(1)];
    } else if (!anywhere) {
      brandLen = brandTokens.length;
      raw = [...brandTokens, ...rawAll];
    }
  }
  const display = raw.map((token, i) => (i < brandLen ? token : softenType(softenShouting(token))));

  const minCore = Math.max(brandLen, 1) + 1; // a soft boundary needs brand + one more token
  const isTypeAt = (i: number) => Boolean(TYPE_WORDS[normTok(display[i] ?? "")]);
  let modelSeen = false;
  let end = raw.length;
  for (let i = brandLen; i < raw.length; i += 1) {
    const tok = raw[i] ?? "";
    const stripped = tok.replace(/[,;]+$/, "");
    const next = raw[i + 1];
    if (DASH_TOKEN.test(tok)) {
      if (i >= minCore - 1) { end = i; break; }
      continue;
    }
    if ((tok.startsWith("(") || tok === "(") && i >= minCore - 1) { end = i; break; }
    if (/^warranty/i.test(stripped) && i >= minCore - 1) { end = i; break; }
    if (i >= minCore - 1 && CONNECTIVE.test(stripped)) { end = i; break; }
    if (i >= minCore) {
      const t = stripped;
      const lower = t.toLowerCase();
      let boundary = /^socket$/i.test(t);
      if (!boundary) {
        const unitish = UNIT_START.test(t) || SPEC_TOKEN.test(t) || /^[248]k$/i.test(t) || /^\d{3,4}x\d{3,4}$/i.test(t) || /^\d+(?:st|nd|rd|th)$/i.test(t);
        // The NEXT token must itself be the unit word ("27 inch", "16 GB", "4 x DDR5"); "5 7600X" is not "5 x".
        const numberThenUnit = NUMBER.test(t) && UNIT_WORDS_AFTER.has((next ?? "").toLowerCase().replace(/[,;.]+$/, ""));
        boundary = unitish || numberThenUnit;
      }
      if (!boundary && modelSeen) {
        if (/^(?:usb|hdmi|bluetooth|thunderbolt|nvme|sata|pcie|dimm|so-?dimm)$/i.test(t)) boundary = true;
        else if (/^(?:intel|amd)$/i.test(t) && (CPU_WORD.test(next ?? "") || /^i[3579]/i.test(next ?? ""))) boundary = true;
        else if (CPU_WORD.test(t)) boundary = true;
        else if (/^(?:g|lp)?ddr\d?$/i.test(lower) || /^wi-?fi$/i.test(lower)) {
          // "B760M DS3H DDR4," / "B650 AORUS ELITE AX WIFI," are part of the model name; "DDR5 DIMM" / "Wi-Fi 6" start the specs.
          let closes = false;
          for (let j = i; j < raw.length && j - i <= 3; j += 1) {
            const here = raw[j] ?? "";
            const after = raw[j + 1];
            if (/[,;]$/.test(here) || after === undefined || DASH_TOKEN.test(after) || after.startsWith("(") || isTypeAt(j + 1) || TYPE_WORDS[normTok(after)] !== undefined) { closes = true; break; }
            // "WIFI II", "AX V2": a short all-caps token continues the model name; "Wi-Fi 6", "DDR5 DIMM" do not.
            if (!/^(?:[A-Z]{1,3}|V\d)[,;]?$/.test(after) || /^(?:RAM|GB|TB)$/.test(after)) break;
          }
          boundary = !closes;
        }
      }
      if (boundary) { end = i; break; }
    }
    if (isStrongModel(tok)) modelSeen = true;
    if (/[,;]$/.test(tok)) { end = i + 1; break; }
  }
  // "Non-Inverter, SEA-118SS": when the text before the first comma has no real model code but the very next
  // token is one, that code is the model and stays in the core.
  if (
    end < raw.length &&
    end > brandLen &&
    /[,;]$/.test(raw[end - 1] ?? "") &&
    !(raw[end] ?? "").startsWith("(") &&
    !raw.slice(brandLen, end).some(isHighEntropyCode) &&
    isHighEntropyCode(raw[end] ?? "")
  ) {
    let j = end + 1;
    while (j < raw.length && !/[,;]$/.test(raw[j - 1] ?? "") && isModelLooking(raw[j] ?? "")) j += 1;
    end = j;
  }
  // No lookbehind here: this module is bundled into the admin form and must parse on older Safari.
  const trimTok = (t: string) => {
    const trimmed = t.replace(/[,;]+$/, "").replace(/^[-–—]+/, "").replace(/[-–—]+$/, "");
    const stripped = trimmed.replace(CHANNEL_SUFFIX, "").replace(/[-–—]+$/, "");
    return stripped || trimmed;
  };
  const core = display.slice(0, end).map(trimTok).filter(Boolean);
  const coreRaw = raw.slice(0, end).map(trimTok).filter(Boolean);
  const all = display.map(trimTok).filter((t) => t && !DASH_TOKEN.test(t));
  const rest = display.slice(end).map(trimTok).filter((t) => t && !DASH_TOKEN.test(t));

  // The model run starts at the first model CODE (else the first line word) and continues through the
  // codes / line words right after it ("X870M A ELITE WF7", "HS50 PRO STEREO"). Everything before it (back to
  // the brand) is kept too; capital words later in descriptive text ("... fingerprint and EM card") are not model.
  let first = -1;
  for (let i = brandLen; i < core.length && first < 0; i += 1) if (isStrongModel(coreRaw[i] ?? "")) first = i;
  for (let i = brandLen; i < core.length && first < 0; i += 1) if (isModelWord(coreRaw[i] ?? "")) first = i;
  let runEnd = first >= 0 ? first + 1 : 0;
  while (first >= 0 && runEnd < core.length && isModelLooking(coreRaw[runEnd] ?? "")) runEnd += 1;
  const hasModel = first >= 0;
  const must = hasModel ? runEnd : core.length;
  // The model run is the raw name's own spelling: the shouting list meant for generic words must not turn
  // "B650-PLUS" into "B650-Plus".
  if (hasModel) for (let i = first; i < runEnd; i += 1) core[i] = coreRaw[i] ?? core[i] ?? "";
  // Case: the model run keeps the case the raw name gave it. Elsewhere the central map applies, and a shouted
  // brand / line word BEFORE the first model code ("LATITUDE", "OPTIPLEX") becomes "Latitude" / "Optiplex".
  let firstCode = -1;
  for (let i = brandLen; i < core.length && firstCode < 0; i += 1) if (isStrongModel(coreRaw[i] ?? "")) firstCode = i;
  for (let i = brandLen; i < core.length; i += 1) {
    if (hasModel && i >= first && i < runEnd) continue;
    const rawToken = stripEdge(coreRaw[i] ?? "");
    let token = casingOfToken(core[i] ?? "");
    if (token === core[i] && (firstCode < 0 || i < firstCode) && isShoutedWord(rawToken) && !LINE_WORDS.has(rawToken.toLowerCase())) {
      token = titleCaseShouted(rawToken);
    }
    core[i] = token;
  }
  const typeIdxs = findTypeIdxs(core, brandLen, categoryHeads, groups);
  let restType: string | null = null;
  const restIdx = [...findTypeIdxs(rest, 0, [])][0];
  // "(A3 Flatebed Scanner)," -> "Scanner": edge punctuation is never part of the type word.
  if (restIdx !== undefined) restType = tidyCase(stripEdge(rest[restIdx] ?? ""));
  return { all, core, coreRaw, brandLen, must, typeIdxs, restType, hasModel, code };
}

// ---------------------------------------------------------------------------
// Title / description / alt composition
// ---------------------------------------------------------------------------

export type Extra = { kind: string; text: string };

type Prep = {
  input: SeoProductInput;
  family: Family;
  name: NameInfo;
  typeList: string[];
  /** Resolved product-type word and whether the model core already contains it. */
  type: string;
  typeInCore: boolean;
  specs: SpecValue[];
  facts: SpecFact[];
  /** Always part of the title core (a graphics chip the name / a stored spec writes). */
  fixedExtras: Extra[];
  /** What a claim may be backed by (lib/seo/claims.ts) and the claims dropped because nothing backed them. */
  evidence: string;
  droppedClaims: string[];
  droppedClaimSpecs: number;
};

const ZERO_VALUE = /^\s*0+(?:\.0+)?\s*(?:gb|tb|mb|ghz|mhz|hz)?\s*$/i;
/** A form factor is stated only in the words the raw name uses: "Earbuds" stays "Earbuds" (not "in-ear"); "TWS" says nothing about the fit. */
const AUDIO_FORM: [RegExp, string][] = [
  [/over[- ]?ear/i, "Over-ear"],
  [/on[- ]?ear/i, "On-ear"],
  [/open[- ]?ear/i, "Open-ear"],
  [/\bin[- ]?ear/i, "In-ear"],
  [/ear ?buds?\b/i, "Earbuds"],
  [/neckband/i, "Neckband"],
];

/**
 * The spec facts the generator may use, after checking them against the raw name (v2.2):
 *  - a zero / empty value is never a fact;
 *  - laptops and desktops: RAM, storage and CPU are read from the NAME (decimal-safe, keyword-classified,
 *    lib/catalog/spec-extract.ts) and replace the stored attribute, which the old import script got wrong
 *    ("16.0GB" -> 0GB, storage = the RAM figure); a stored storage that just repeats the RAM figure is dropped;
 *  - headsets / headphones: a form factor, microphone or any other claim comes from the name or from a stored
 *    spec row, never from an attribute that the import script only GUESSED (every "headset" got Over-ear and
 *    Microphone=Yes there).
 */
export function reconcileFacts(input: SeoProductInput, familyId: FamilyId): SpecFact[] {
  let facts = input.specs.filter((f) => squash(f.value) !== "" && !ZERO_VALUE.test(f.value));
  const slotMatch = (slotId: string, f: SpecFact) => {
    const slot = SLOTS[slotId];
    return Boolean(slot) && (Boolean(f.key && slot?.keys.includes(f.key)) || Boolean(slot?.label.test(normLabel(f.label))));
  };
  if (familyId === "laptop" || familyId === "desktop") {
    const n: NameSpecs = extractNameSpecs(input.name);
    const ramFigure = (n.ram ?? facts.find((f) => slotMatch("ram", f))?.value ?? "").replace(/\s/g, "").toLowerCase();
    facts = facts.filter((f) => {
      if (n.ram && slotMatch("ram", f)) return false;
      if (n.cpu && slotMatch("cpu", f)) return false;
      if (slotMatch("storage", f)) {
        if (n.storage || n.storageAmbiguous) return false;
        // storage = the RAM figure is the old extractor's mistake
        if (ramFigure && f.value.replace(/\s/g, "").toLowerCase() === ramFigure) return false;
      }
      return true;
    });
    if (n.ram) facts.push({ key: "ram", label: "RAM", value: n.ram });
    if (n.storage) facts.push({ key: "storage", label: "Storage", value: `${n.storage.size}${n.storage.kind ? ` ${n.storage.kind}` : ""}` });
    if (n.cpu) facts.push({ key: "processor", label: "Processor", value: n.cpu });
  }
  if (familyId === "headphone") {
    const nameForm = AUDIO_FORM.find(([re]) => re.test(input.name))?.[1] ?? null;
    const nameMic = /\bmic(?:rophone)?\b/i.test(input.name);
    const nameBuiltIn = /built[- ]?in\s+mic/i.test(input.name);
    const bare = (value: string) => /^(yes|no|true|false|y|n|supported)$/i.test(squash(value));
    facts = facts.filter((f) => {
      // v2.4: an ATTRIBUTE (it has a key) was written by the import script from the name, by guessing ("buds" ->
      // In-ear, "headset" -> Over-ear, "headset" -> Microphone=Yes). The claim comes from the name's own words
      // (added below) or from a stored spec ROW; never from an attribute.
      if (slotMatch("audio_type", f)) {
        if (f.key) return false;
        const rowForm = AUDIO_FORM.find(([re]) => re.test(f.value))?.[1] ?? null;
        return !nameForm || rowForm === nameForm; // the name outranks a row
      }
      if (slotMatch("mic", f)) return !f.key && !bare(f.value); // "Microphone: Yes" adds nothing the guess did not
      if (slotMatch("connectivity", f) && f.key) {
        const word = squash(f.value).match(/^(bluetooth|wireless|wired|usb|2\.4\s?g)/i)?.[1];
        return Boolean(word) && new RegExp(`\\b${escapeRe(word ?? "")}`, "i").test(input.name); // only a word the name really says
      }
      return true;
    });
    if (nameForm) facts.push({ label: "Type", value: nameForm });
    if (nameMic && !facts.some((f) => slotMatch("mic", f))) facts.push({ label: "Microphone", value: nameBuiltIn ? "Built-in microphone" : "Yes" });
  }
  if (familyId === "motherboard" || familyId === "case") {
    // v2.4: the form factor is parsed properly ("M-ATX", "mATX", "Micro ATX" -> Micro-ATX, "E-ATX", "Mini ITX"; a bare ATX
    // only without a prefix) and the NAME outranks any stored value. A stored value is used when the name says nothing:
    // a spec row as it is, an attribute unless it says plain ATX: the import script read "M-ATX" / "Micro ATX" as plain
    // ATX and guessed ATX for any chipset code without an "M", so a plain-ATX attribute needs the name to say ATX.
    const nameForms = formFactorsIn(input.name);
    facts = facts.filter((f) => {
      if (!slotMatch("form_factor", f)) return true;
      const stored = formFactorOf(f.value);
      if (nameForms.length > 0) return stored !== null && nameForms.includes(stored);
      return f.key ? stored !== null && stored !== "ATX" : true;
    });
    const only = nameForms.length === 1 ? nameForms[0] : null;
    if (only) facts.push({ key: "formFactor", label: "Form Factor", value: only });
  }
  if (familyId === "gpu") {
    // v2.4: memory is "<size> <type>" with the type from the name; a bare Size / Capacity row (value in GB) is the
    // memory size, not a "size" phrase.
    const isMemory = (f: SpecFact) => /^(memory|video memory|vram|graphics memory|memory size|memory capacity|size|capacity)$/.test(normLabel(f.label)) && /\d\s?(?:GB|G)\b/i.test(f.value);
    const stored = facts.find(isMemory);
    facts = facts.filter((f) => !isMemory(f));
    const named = extractGpuMemoryFromName(input.name);
    const size = named?.size ?? stored?.value.match(/(\d{1,2})\s?G/i)?.[1];  // a stored size is trusted; the name's wins when it states one
    const type = named?.type ?? stored?.value.match(/(GDDR\d[A-Z]?|HBM\d?[A-Z]?)/i)?.[1]?.toUpperCase() ?? null;
    if (size) facts.push({ key: "memory", label: "VRAM", value: `${String(size).replace(/GB$/i, "")}GB${type ? ` ${type}` : ""}` });
  }
  return facts;
}

function prepare(input: SeoProductInput): Prep {
  const family = familyOf(input.categoryChain);
  const facts = reconcileFacts(input, family.id);
  const typeList = typeCandidates(input.categoryChain);
  const heads = typeList.map((t) => t.split(" ").pop() ?? "");
  const groups = typeList.map(typeGroupOf).filter((g): g is string => g !== null);
  const name = analyseName(input, heads, groups);
  const typeInCore = name.typeIdxs.size > 0;
  let type = "";
  if (typeInCore) {
    type = name.core[Math.max(...name.typeIdxs)] ?? "";
  } else {
    // The raw name's own word wins when it agrees with the category ("Headset" for a Headphone category);
    // otherwise the category's type.
    const restGroup = name.restType ? typeGroupOf(name.restType) : null;
    const agrees = restGroup !== null && typeList.some((t) => typeGroupOf(t) === restGroup);
    type = name.restType && agrees ? name.restType : typeList[0] ?? name.restType ?? "";
  }
  const evidence = claimEvidence(input.name, input.categoryChain, input.specs);
  const refused: string[] = [];
  const specs = pickSpecs(facts, family.id, input.brand, 4, { accept: (phrase) => unsupportedClaims(phrase, evidence).length === 0, rejected: refused });
  // Claims removed at either level are counted: the phrase refused here, and the stored facts reconcileFacts() dropped
  // (a guessed Microphone=Yes / Over-ear / Bluetooth attribute the name does not back).
  const keptFacts = new Set(facts);
  const droppedFacts = input.specs.filter((fact) => !keptFacts.has(fact)).map((fact) => `${fact.label} ${fact.value}`);
  const droppedTexts = [...new Set([...refused, ...droppedFacts])];
  const droppedClaims = [...new Set(droppedTexts.flatMap((text) => unsupportedClaims(text, evidence)))];
  const droppedClaimSpecs = droppedTexts.filter((text) => unsupportedClaims(text, evidence).length > 0).length;
  // A graphics chip is part of WHICH product this is: keep it in the title when the name (anywhere) or a stored spec
  // writes it. The chip is never derived from the SKU (GV-N5070... is a board code).
  const fixedExtras: Extra[] = [];
  if (family.id === "gpu") {
    const chip = extractGpuChipFromName(input.name) ?? specs.find((s) => s.slot === "gpu_chip")?.phrase ?? null;
    const have = new Set(name.core.map(normTok));
    if (chip && !chip.split(" ").map(normTok).filter(Boolean).every((token) => have.has(token))) {
      fixedExtras.push({ kind: "chip", text: applyCasing(chip) });
    }
  }
  return { input, family, name, typeList, type, typeInCore, specs, facts, fixedExtras, evidence, droppedClaims, droppedClaimSpecs };
}

const SUFFIX_PB = " Price in Bangladesh";
const SUFFIX_BD = " Price in BD";

const COLOURS = new Set("black white silver blue red grey gray gold green pink purple orange yellow brown cyan magenta beige navy rose graphite titanium midnight starlight".split(" "));
/** Words that say nothing about WHICH product it is. Anything else after the model run might be identity ("Black Edition", "Wireless"). */
const GENERIC_WORDS = new Set("dual band gigabit digital high quality performance original new".split(" "));
const isGenericToken = (token: string) => {
  const t = token.toLowerCase().replace(/[^a-z/]/g, "");
  return Boolean(t) && (GENERIC_WORDS.has(t) || COLOURS.has(t) || (t.includes("/") && t.split("/").every((part) => COLOURS.has(part))));
};

/** A code with real entropy: letters AND digits, 3+ chars (DS-K1T320EFWX-B, G502, AC1200, X870M; not "212" or "14"). */
function isHighEntropyCode(raw: string): boolean {
  const t = stripEdge(raw).replace(/\+$/, "");
  return t.length >= 3 && /[A-Za-z]/.test(t) && /\d/.test(t) && !UNIT_START.test(t) && !SPEC_TOKEN.test(t);
}

/**
 * Droppable runs (dropped from the END, one whole run at a time, only when the title does not fit).
 *  - After a high-entropy model code the code itself identifies the product, so descriptive tail words
 *    ("Value Series Face Access Terminal", "Wireless Dual Band Gigabit") are droppable.
 *  - After a low-entropy model ("Hyper 212") the next words may be identity ("Black Edition"), so only
 *    known-generic words (colours, "Dual Band") are droppable, and only when nothing identity-bearing
 *    follows them ("Gaming Headset Blue": yes; "Black Edition CPU Cooler": no).
 * The type word is never in a run. The model run and everything before it are never dropped.
 */
function droppableRuns(name: NameInfo): [number, number][] {
  const floor = Math.max(name.must, name.brandLen);
  const descriptiveTail = name.core.slice(name.brandLen, name.must).some((_, i) => isHighEntropyCode(name.coreRaw[name.brandLen + i] ?? ""));
  const droppable = new Array<boolean>(name.core.length).fill(false);
  let tailClosed = true;
  for (let i = name.core.length - 1; i >= floor; i -= 1) {
    if (name.typeIdxs.has(i)) continue; // the type word stays, and does not end the closed tail
    if (descriptiveTail || (isGenericToken(name.core[i] ?? "") && tailClosed)) droppable[i] = true;
    else tailClosed = false;
  }
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = floor; i <= name.core.length; i += 1) {
    const here = i < name.core.length && droppable[i] === true;
    if (here && start < 0) start = i;
    if (!here && start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  }
  return runs;
}

function coreWith(prep: Prep, keepRuns: number, extras: Extra[]): { tokens: string[]; text: string } {
  const { name } = prep;
  // Everything stays except the generic runs being dropped (from the end): a token is never removed by default.
  const dropped = droppableRuns(name).slice(keepRuns);
  const kept = name.core.filter((_, i) => !dropped.some(([a, b]) => i >= a && i < b));
  const extra = extras.map((e) => e.text);
  const tokens = prep.typeInCore ? [...kept, ...extra] : [...kept, ...extra, prep.type].filter(Boolean);
  return { tokens, text: squash(tokens.join(" ")) };
}

function composeTitle(prep: Prep, extras: Extra[]): { title: string; core: string; rule: string; flags: string[] } {
  const runs = droppableRuns(prep.name).length;
  const tries: { suffix: string; keep: number; label: string }[] = [];
  for (const [suffix, label] of [[SUFFIX_PB, "Price in Bangladesh"], [SUFFIX_BD, "'Price in BD' fallback"]] as const) {
    for (let keep = runs; keep >= 0; keep -= 1) {
      tries.push({ suffix, keep, label: keep === runs ? `${label}, full model core` : `${label}, generic words after the model dropped (${runs - keep} run${runs - keep === 1 ? "" : "s"})` });
    }
  }
  for (const attempt of tries) {
    const { text } = coreWith(prep, attempt.keep, extras);
    if ((text + attempt.suffix).length <= SEO_TITLE_MAX) {
      const branded = `${text}${attempt.suffix} | ${SITE}`;
      const withBrand = branded.length <= SEO_TITLE_MAX;
      return { title: withBrand ? branded : text + attempt.suffix, core: text, rule: `${attempt.label}${withBrand ? " + brand suffix" : ""}`, flags: [] };
    }
  }
  // Model core + type fit, but not with any "Price in …": core alone, nothing dropped from it.
  const minimal = coreWith(prep, 0, extras).text;
  if (minimal.length <= SEO_TITLE_MAX) {
    return { title: minimal, core: minimal, rule: "model core + type only (no room for 'Price in …')", flags: ["title_without_price_suffix"] };
  }
  return { title: `${minimal}${SUFFIX_BD}`, core: minimal, rule: "model core kept whole, over 60", flags: ["title_over_60"] };
}

type SpecValue = { slot: string; phrase: string };

const lc = (s: string) => (/^[A-Z][a-z]+(?:-[a-z]+)*$/.test(s) ? s.toLowerCase() : s);
/** "Large Format Printer" -> "large format printer"; acronyms (IP, NVR, CC) stay upper-case. */
const nounOf = (type: string) => type.split(" ").map((w) => (/^[A-Z0-9]{2,}$/.test(w) ? w : w.toLowerCase())).join(" ");

/**
 * Natural wording for the description: a noun phrase the adjectives modify
 * ("wired over-ear headset with built-in microphone", "27 inch 1920x1080 IPS
 * monitor, 200Hz"). Returns null when the family reads best as a plain list
 * ("Core i7-1255U, 16GB RAM, 512GB SSD, 15.6 inch display").
 */
function composeBody(family: FamilyId, type: string, specs: SpecValue[], style: "noun" | "short" | "bare" = "noun"): string | null {
  const by = new Map(specs.map((s) => [s.slot, s.phrase]));
  const used = new Set<string>();
  const take = (slot: string, strip?: RegExp) => {
    const phrase = by.get(slot);
    if (!phrase) return "";
    used.add(slot);
    return strip ? phrase.replace(strip, "") : phrase;
  };
  const tail = () => specs.filter((s) => !used.has(s.slot)).map((s) => s.phrase);
  const noun = nounOf(type);
  const short = style === "short";
  const bare = style === "bare";
  const out = (head: string, more: string[]) => [head, ...more].filter(Boolean).join(", ");
  // "wired over-ear headset" (noun) or, when the title core already says it and room is short, "wired, over-ear".
  const phrase = (atoms: string[]) => (bare ? atoms.join(", ") : `${atoms.join(" ")} ${noun}`.trim());
  if (!noun) return null;
  switch (family) {
    case "monitor": {
      const head = [take("display_size", / display$/), take("resolution", / resolution$/), take("panel", / panel$/)].filter(Boolean);
      if (head.length === 0) return null;
      return out(phrase(head), [take("refresh", / refresh rate$/), ...tail()]);
    }
    case "headphone": {
      const adjectives = [lc(take("connectivity")), lc(take("audio_type"))].filter(Boolean);
      const micPhrase = take("mic");
      const hasMic = Boolean(micPhrase);
      const builtIn = micPhrase === "Built-in microphone";
      if (adjectives.length === 0 && !hasMic) return null;
      if (bare) return out(adjectives.join(", "), [...(hasMic ? [builtIn ? "built-in mic" : "microphone"] : []), ...tail()]);
      const mic = hasMic ? ` with ${builtIn ? "built-in " : ""}${short ? "mic" : "microphone"}` : "";
      return out(`${adjectives.join(" ")} ${noun}`.trim() + mic, tail());
    }
    case "keyboard": {
      const adjectives = [lc(take("connectivity")), lc(take("kb_switch", / keys$/))].filter(Boolean);
      return adjectives.length ? out(phrase(adjectives), tail()) : null;
    }
    case "mouse": {
      const conn = lc(take("connectivity"));
      return conn ? out(phrase([conn]), tail()) : null;
    }
    case "printer":
    case "large-format-printer": {
      const tech = lc(take("print_tech", / printing$/));
      return tech ? out(phrase([tech]), tail()) : null;
    }
    case "camera": {
      const head = [take("cam_res"), lc(take("cam_type", / camera$/))].filter(Boolean);
      return head.length ? out(phrase(head), tail()) : null;
    }
    case "nvr": {
      const channels = take("channels");
      return channels ? out(phrase([channels]), tail()) : null;
    }
    case "router": {
      const standard = take("wifi_std");
      return standard ? out(phrase([standard]), tail()) : null;
    }
    case "cable": {
      const parts = [take("cable_len", / length$/), take("cable_cat"), take("cable_shield")].filter((p) => p && !noun.toLowerCase().includes(p.toLowerCase()));
      return parts.length ? out(phrase(parts), tail()) : null;
    }
    case "cooler": {
      const kind = lc(take("cooler_type", / cooling$/));
      return kind ? out(phrase([kind]), tail()) : null;
    }
    default:
      return null;
  }
}

/** Lower-case word tokens of a phrase with quantities joined ("2 TB" -> "2tb"): how a spec is compared with the title. */
export function specTokens(text: string): string[] {
  return normQty(text)
    .split(/[^a-z0-9.+/-]+/)
    .map((t) => t.replace(/^[-.+/]+|[-.+/]+$/g, ""))
    .filter(Boolean);
}

/** Words that only say WHAT a value measures: the value carries the information ("512GB storage" = "512GB"). */
const SPEC_FILLER = new Set("capacity storage memory display resolution refresh rate form factor interface speed length panel keys socket".split(" "));
const STORAGE_KIND = new Set(["ssd", "hdd", "nvme", "emmc"]);

/**
 * The spec phrases that tell the reader something the title does not already say (v2.3). A phrase whose
 * words (leaving out "capacity", "storage", "display" ...) are all in the title core is dropped:
 * "Core Ultra 5 225: Core Ultra 5 225" and "P300 2TB - 2TB, 2 TB capacity" say each thing once.
 * "512GB SSD" with only "512GB" in the title keeps what is new: "SSD storage".
 */
export function dropTitleRepeats(specs: SpecValue[], titleCore: string): SpecValue[] {
  const inTitle = new Set(specTokens(titleCore));
  // "8GB RAM" is "8GB" when the title carries a bare 8GB; but next to a storage word ("8GB SSD") that 8GB may be the storage.
  const titleNamesStorage = [...STORAGE_KIND, "storage"].some((word) => inTitle.has(word));
  const out: SpecValue[] = [];
  for (const spec of specs) {
    const tokens = specTokens(spec.phrase).filter((t) => !SPEC_FILLER.has(t) && !(t === "ram" && !titleNamesStorage));
    const missing = tokens.filter((t) => !inTitle.has(t));
    if (tokens.length > 0 && missing.length === 0) continue;
    const quantities = tokens.filter((t) => /\d/.test(t));
    if (quantities.length > 0 && quantities.every((t) => inTitle.has(t)) && missing.every((t) => STORAGE_KIND.has(t))) {
      out.push({ slot: spec.slot, phrase: `${applyCasing(missing.join(" "))} storage` });
      continue;
    }
    out.push(spec);
  }
  return out;
}

/** Trailing words the units / names already imply ("65 inch display", "Micro-ATX form factor", "DDR5 memory"). */
const COMPACT = / (?:display|resolution|refresh rate|form factor|memory)$/;
const LEADS_PLAIN = [
  (core: string, body: string) => `${core}: ${body}.`,
  (core: string, body: string) => `${core} – ${body}.`,
];
const LEADS_LIST = [
  ...LEADS_PLAIN,
  (core: string, body: string) => `Key specs of ${core}: ${body}.`,
];
/** Neutral, no stock / price / warranty claim. [0] is the owner's wording; the others are shorter so 3-4 specs still fit in 155. */
const CLOSINGS = [
  "Check price and availability at Techno House. Delivery in Dhaka and across Bangladesh.",
  "Check price and availability at Techno House. Delivery across Bangladesh.",
  "Price and availability at Techno House. Delivery in Dhaka and across Bangladesh.",
  "Price and availability at Techno House. Delivery across Bangladesh.",
];

function composeDescription(id: string, family: FamilyId, type: string, cores: string[], specs: SpecValue[]): { text: string; used: number; flags: string[] } {
  const h = hashId(id);
  const close0 = Math.floor(h / 7) % CLOSINGS.length;
  const maxN = Math.min(4, specs.length);
  // Last resort when a product has too few specs to reach 120 characters: a
  // neutral pointer, never a claim.
  const FILLER = "See full specifications on the product page.";
  const candidates: { text: string; used: number }[] = [];
  for (let n = maxN; n >= 0; n -= 1) {
    const slice = specs.slice(0, n);
    const composed = n > 0 ? composeBody(family, type, slice) : null;
    const composedShort = n > 0 ? composeBody(family, type, slice, "short") : null;
    const composedBare = n > 0 ? composeBody(family, type, slice, "bare") : null;
    const bodies = composed
      ? [
          { body: composed, leads: LEADS_PLAIN },
          ...(composedShort && composedShort !== composed ? [{ body: composedShort, leads: LEADS_PLAIN }] : []),
          ...(composedBare ? [{ body: composedBare, leads: LEADS_PLAIN }] : []),
        ]
      : n > 0
        ? [
            // "Key specs of ...: <one spec>" reads wrongly: that lead needs at least two.
            { body: slice.map((s) => s.phrase).join(", "), leads: slice.length >= 2 ? LEADS_LIST : LEADS_PLAIN },
            // "65 inch display" -> "65 inch" when the units already say it: tried before dropping a spec.
            { body: slice.map((s) => s.phrase.replace(COMPACT, "")).join(", "), leads: slice.length >= 2 ? LEADS_LIST : LEADS_PLAIN },
          ]
        : [{ body: "", leads: LEADS_PLAIN }];
    for (const { body: rawBody, leads } of bodies) {
      const body = applyCasing(rawBody);
      for (const core of cores) {
        for (let a = 0; a < leads.length; a += 1) {
          for (let b = 0; b < CLOSINGS.length; b += 1) {
            const lead = leads[(h + a) % leads.length];
            const close = CLOSINGS[(close0 + b) % CLOSINGS.length];
            if (!lead || !close) continue;
            const head = body ? lead(core, body) : `${core}.`;
            candidates.push({ text: `${head} ${close}`, used: n });
            if (n <= 2) candidates.push({ text: `${head} ${FILLER} ${close}`, used: n });
          }
        }
      }
    }
  }
  const inRange = candidates.find((c) => c.text.length >= SEO_DESC_MIN && c.text.length <= SEO_DESC_MAX);
  const pick =
    inRange ??
    [...candidates.filter((c) => c.text.length <= SEO_DESC_MAX)].sort((x, y) => y.used - x.used || y.text.length - x.text.length)[0] ??
    [...candidates].sort((x, y) => x.text.length - y.text.length)[0] ?? { text: `${cores[0] ?? ""}. ${CLOSINGS[0]}`, used: 0 };
  const flags: string[] = [];
  if (pick.text.length > SEO_DESC_MAX) flags.push("desc_over_155");
  if (pick.text.length < SEO_DESC_MIN) flags.push("desc_under_120");
  if (pick.used < 3) flags.push("few_specs");
  return { text: pick.text, used: pick.used, flags };
}

/**
 * Anything in a title, keyword or description outside a conservative safe set: a quote or ANY bracket, a
 * character outside letters / digits / space and . , : ; & + / % ' | - (and our own " – " lead), a double space, or a token that starts
 * or ends with a hyphen. Returns what was found (empty = clean).
 */
export function findBadChars(text: string): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const ch of text) {
    // The en dash is the one non-ASCII character the generator itself writes (the " – " lead variant).
    if (/[A-Za-z0-9 .,:;&+/%'|–-]/.test(ch) || seen.has(ch)) continue;
    seen.add(ch);
    issues.push(/["“”″]/.test(ch) ? `quote ${ch}` : /[()[\]{}]/.test(ch) ? `bracket ${ch}` : `character ${JSON.stringify(ch)}`);
  }
  if (/\s{2,}/.test(text) || text !== text.trim()) issues.push("double or edge space");
  for (const token of text.split(/\s+/)) {
    const t = token.replace(/[.,:;]+$/, "");
    if (t.length > 0 && (t.startsWith("-") || t.endsWith("-"))) {
      issues.push(`hyphen at the edge of "${t}"`);
      break;
    }
  }
  return issues;
}

/** Zero or empty spec values in a description's spec phrases or text ("0GB storage", "undefined"). */
export function findZeroSpecs(text: string, phrases: string[]): string[] {
  const found = new Set<string>();
  for (const phrase of phrases) {
    if (!squash(phrase) || /\b(?:undefined|null|nan)\b/i.test(phrase)) found.add(phrase || "(empty)");
    const zero = zeroQuantity(phrase);
    if (zero) found.add(zero);
  }
  const zero = zeroQuantity(text);
  if (zero) found.add(zero);
  return [...found];
}

/** Model-looking tokens of the core that the title does not contain (must be none). */
function lostModelTokens(prep: Prep, title: string): string[] {
  const inTitle = new Set(title.split(/\s+/).map(normTok));
  const { name } = prep;
  const lost: string[] = [];
  for (let i = name.brandLen; i < name.must; i += 1) {
    if (!isModelLooking(name.coreRaw[i] ?? "")) continue;
    const norm = normTok(name.core[i] ?? "");
    if (norm && !inTitle.has(norm)) lost.push(name.core[i] ?? "");
  }
  return lost;
}

/** Code-like tokens in the title (letters + digits, 4+ chars) that are not in the raw name and were not added as a spec. */
function foreignCodes(prep: Prep, title: string, extras: Extra[]): string[] {
  const rawNorm = new Set([...prep.name.all.map(normTok), normTok(prep.name.code ?? "")]);
  for (const token of squash(prep.input.brand).split(" ")) rawNorm.add(normTok(token));
  const specExtra = new Set(extras.filter((e) => e.kind !== "code" && e.kind !== "name" && e.kind !== "colour").flatMap((e) => e.text.split(/\s+/).map(normTok)));
  return title
    .replace(/ \| Techno House$/, "")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && /[A-Za-z]/.test(t) && /\d/.test(t) && !SPEC_TOKEN.test(t))
    .filter((t) => !rawNorm.has(normTok(t)) && !specExtra.has(normTok(t)));
}

function render(prep: Prep, collisionExtras: Extra[]): SeoResult {
  const { input, family, name } = prep;
  let extras = [...prep.fixedExtras, ...collisionExtras];
  // The chip is wanted in the title, but not at the price of a title that no longer fits in 60 (never cut, so that row would be skipped).
  if (prep.fixedExtras.length > 0 && coreWith(prep, 0, extras).text.length > SEO_TITLE_MAX && coreWith(prep, 0, collisionExtras).text.length <= SEO_TITLE_MAX) {
    extras = collisionExtras;
  }
  const title = composeTitle(prep, extras);
  const shortCore = coreWith(prep, 0, extras).text;
  // The description's spec part says only what the title does not (specsAvailable still counts every usable spec).
  const descSpecs = dropTitleRepeats(prep.specs, title.core);
  const description = composeDescription(input.id, family.id, prep.type, shortCore !== title.core ? [title.core, shortCore] : [title.core], descSpecs);
  const flags = [...title.flags, ...description.flags];
  if (!name.hasModel) flags.push("no_model_token");
  const lost = lostModelTokens(prep, title.title);
  if (lost.length > 0) flags.push("model_token_lost");
  const foreign = foreignCodes(prep, title.title, extras);
  if (foreign.length > 0) flags.push("foreign_code");
  const keywordCore = title.core.toLowerCase();
  const usedSpecs = descSpecs.slice(0, description.used).map((spec) => spec.phrase);
  const badChars = [...new Set([...findBadChars(title.title), ...findBadChars(`${keywordCore} price in bangladesh`), ...findBadChars(description.text)])];
  if (badChars.length > 0) flags.push("bad_chars");
  const zeroSpecs = findZeroSpecs(description.text, usedSpecs);
  if (zeroSpecs.length > 0) flags.push("spec_zero");
  // v2.4 gates. A form factor the raw name contradicts; machine-looking spec wording; a claim nothing backs (dropped
  // before composing, so a claim still in the text is a bug: that row is skipped); a type that is only a bucket name.
  const claimConflicts = findFormFactorConflicts(input.name, description.text);
  if (claimConflicts.length > 0) flags.push("claim_conflict");
  const badSpecPhrases = findBadSpecPhrases(description.text, usedSpecs);
  if (badSpecPhrases.length > 0) flags.push("bad_spec_phrase");
  const specPart = [title.core, shortCore].sort((a, b) => b.length - a.length).reduce((text, core) => text.split(core).join(" "), description.text);
  const leaked = unsupportedClaims(specPart, prep.evidence);
  const droppedClaims = [...new Set([...prep.droppedClaims, ...leaked])];
  if (droppedClaims.length > 0) flags.push("unsupported_claim");
  if (!prep.type) flags.push("unusable_type");
  const typeLower = nounOf(prep.type);
  const secondary = [
    `${keywordCore} price in bd`,
    `${keywordCore} specs`,
    `${keywordCore} review`,
    typeLower ? `${squash(input.brand)} ${typeLower} price in bangladesh`.toLowerCase() : "",
  ].filter(Boolean);
  const alt = title.core.length <= SEO_ALT_MAX ? title.core : cutAtWord(title.core, SEO_ALT_MAX);
  return {
    id: input.id,
    title: title.title,
    titleCore: title.core,
    titleRule: title.rule,
    metaDescription: description.text,
    primaryKeyword: `${keywordCore} price in bangladesh`,
    secondaryKeywords: secondary,
    imageAlt: alt,
    family: family.id,
    familyWeight: family.weight,
    type: prep.type,
    specsUsed: usedSpecs,
    specsAvailable: prep.specs.length,
    flags,
    modelTokensLost: lost,
    badChars,
    zeroSpecs,
    claimConflicts,
    badSpecPhrases,
    unsupportedClaims: droppedClaims,
    claimSpecsDropped: prep.droppedClaimSpecs,
    collisionGroup: null,
    needsReview:
      flags.includes("title_over_60") || lost.length > 0 || foreign.length > 0 || badChars.length > 0 || zeroSpecs.length > 0 ||
      claimConflicts.length > 0 || badSpecPhrases.length > 0 || leaked.length > 0 || !prep.type,
  };
}

/** A form factor in the description that the raw name contradicts ("Micro ATX" in the name, "ATX form factor" in the text). */
export function findFormFactorConflicts(name: string, description: string): string[] {
  const fromName = formFactorsIn(name);
  if (fromName.length === 0) return [];
  return formFactorsIn(description)
    .filter((form) => !fromName.includes(form))
    .map((form) => `${form} in the description, the name says ${fromName.join(" / ")}`);
}

/** One product on its own (no collision handling). Used by the admin form's suggestion. */
export function generateProductSeo(input: SeoProductInput): SeoResult {
  return render(prepare(input), []);
}

// ---------------------------------------------------------------------------
// A whole set: disambiguate colliding titles
// ---------------------------------------------------------------------------

const SPEC_NAME_TOKEN = /^(?:\d+(?:\.\d+)?(?:gb|tb|mb|mhz|ghz|w|va|mah|inch|"|mm|mp|ft|m)|ddr[2-5])$/i;

type Distinguisher = { kind: string; text: string };

/** A raw-name token used as a collision extra: brackets / quotes removed, "14inch" -> "14 inch", canonical case. */
const cleanExtra = (token: string) => applyCasing(token.replace(/[()[\],"“”]/g, "").replace(/^(\d+(?:\.\d+)?)inch$/i, "$1 inch"));

/**
 * What tells this product apart from the rest of its colliding group: a spec
 * from its attributes (RAM, storage, capacity, size, CPU), a colour / spec word
 * from its own raw name, or the POS part code that led the raw name. NEVER a
 * SKU, barcode or model-number field: a code is used only if it is in the raw name.
 */
function distinguishers(prep: Prep, group: Prep[], titleTokens: Set<string>): Distinguisher[] {
  const out: Distinguisher[] = [];
  const phrase = (slotId: string) => {
    const slot = SLOTS[slotId];
    if (!slot) return "";
    for (const fact of prep.facts) {
      const label = normLabel(fact.label);
      if (!(fact.key && slot.keys.includes(fact.key)) && !slot.label.test(label)) continue;
      if (isJunkValue(fact.value, prep.input.brand)) continue;
      const read = slot.read(squash(fact.value), { brand: prep.input.brand });
      if (read) return read;
    }
    return "";
  };
  const ram = phrase("ram");
  if (ram) out.push({ kind: "ram", text: ram });
  const storage = phrase("storage");
  // "512GB storage" reads badly inside a title: the size (and SSD / HDD when stated) is the differentiator.
  if (storage) out.push({ kind: "storage", text: storage.replace(/ storage$/, "") });
  const capacity = phrase("storage_cap") || phrase("ram_capacity");
  if (capacity) out.push({ kind: "capacity", text: capacity });
  const size = phrase("display_size") || phrase("fan_size");
  if (size) out.push({ kind: "size", text: size.replace(/ (display)$/, "") });
  const cpu = phrase("cpu");
  if (cpu) out.push({ kind: "cpu", text: cpu });
  // Spec-like / colour words from the whole raw name that the title does not
  // already carry and that not every member of the group has.
  const others = group.filter((p) => p !== prep).map((p) => new Set(p.name.all.map((t) => t.toLowerCase())));
  for (const token of prep.name.all) {
    const key = token.toLowerCase().replace(/[^a-z0-9."]/g, "");
    if (!(SPEC_NAME_TOKEN.test(key) || COLOURS.has(key))) continue;
    if (titleTokens.has(normTok(token))) continue;
    if (others.every((set) => set.has(token.toLowerCase()))) continue;
    out.push({ kind: COLOURS.has(key) ? "colour" : "name", text: cleanExtra(token) });
  }
  const code = (prep.name.code ?? "").toUpperCase();
  if (code && !titleTokens.has(normTok(code))) out.push({ kind: "code", text: code });
  return out;
}

/**
 * Results for a whole set of products, input order kept. Products whose
 * titles collide get the distinguishing spec added; any that still collide
 * are flagged `title_collision` + `needsReview` and share a `collisionGroup`.
 */
export function generateProductSeoSet(inputs: SeoProductInput[]): SeoResult[] {
  const preps = inputs.map(prepare);
  const extras = new Map<Prep, Extra[]>();
  const extrasOf = (prep: Prep) => extras.get(prep) ?? [];
  const titleOf = (prep: Prep) => render(prep, extrasOf(prep)).title.toLowerCase();
  const groupsOf = (list: Prep[]): Prep[][] => {
    const byTitle = new Map<string, Prep[]>();
    for (const prep of list) byTitle.set(titleOf(prep), [...(byTitle.get(titleOf(prep)) ?? []), prep]);
    return [...byTitle.values()].filter((members) => members.length > 1);
  };
  let pending = groupsOf(preps);
  for (let round = 0; round < 3 && pending.length > 0; round += 1) {
    const next: Prep[] = [];
    for (const group of pending) {
      const options = new Map(
        group.map((prep) => [prep, distinguishers(prep, group, new Set(render(prep, extrasOf(prep)).title.split(/\s+/).map(normTok)))] as const),
      );
      const kinds = ["ram", "storage", "capacity", "size", "cpu", "colour", "name", "code"];
      for (const kind of kinds) {
        const values = group.map((prep) => options.get(prep)?.find((d) => d.kind === kind)?.text ?? "");
        const distinct = new Set(values.map((v) => v.toLowerCase()));
        if (distinct.size <= 1) continue;
        group.forEach((prep, i) => {
          const value = values[i] ?? "";
          const have = extrasOf(prep).map((e) => e.text).join(" ").toLowerCase();
          if (value && !have.includes(value.toLowerCase())) extras.set(prep, [...extrasOf(prep), { kind, text: applyCasing(value) }]);
        });
        break;
      }
      next.push(...group);
    }
    pending = groupsOf(next);
  }
  const results = preps.map((prep) => render(prep, extrasOf(prep)));
  const stillColliding = new Map<string, number[]>();
  results.forEach((result, i) => stillColliding.set(result.title.toLowerCase(), [...(stillColliding.get(result.title.toLowerCase()) ?? []), i]));
  for (const [title, indexes] of stillColliding) {
    if (indexes.length < 2) continue;
    const id = `c${hashId(title).toString(36)}`;
    for (const i of indexes) {
      const result = results[i];
      if (!result) continue;
      result.flags.push("title_collision");
      result.collisionGroup = id;
      result.needsReview = true;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Stored meta: what the page shows, and what saving the admin form writes
// ---------------------------------------------------------------------------

/** Stored text wins verbatim when non-empty; otherwise the built-in template. */
export function resolveProductMeta(
  stored: { metaTitle?: string | null; metaDescription?: string | null },
  template: { title: string; description: string },
): { title: string; description: string } {
  const title = stored.metaTitle?.trim();
  const description = stored.metaDescription?.trim();
  return { title: title || template.title, description: description || template.description };
}

export type SeoMetaWrite = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoSource?: "admin" | null;
  seoGeneratedAt?: null;
  seoKeyword?: null;
};

/**
 * What a form save writes. `submitted` fields that are `undefined` were not on
 * the form (bulk CSV import): nothing is written. Unchanged text keeps its
 * seoSource (saving an untouched form must not turn a generated value into an
 * 'admin' one); changed text becomes source 'admin'; both blank clears all.
 */
export function planSeoMetaWrite(
  submitted: { metaTitle?: string | null; metaDescription?: string | null },
  existing: { metaTitle: string | null; metaDescription: string | null },
): SeoMetaWrite {
  if (submitted.metaTitle === undefined && submitted.metaDescription === undefined) return {};
  const norm = (value: string | null | undefined) => squash(value ?? "") || null;
  const title = submitted.metaTitle === undefined ? norm(existing.metaTitle) : norm(submitted.metaTitle);
  const description = submitted.metaDescription === undefined ? norm(existing.metaDescription) : norm(submitted.metaDescription);
  if (title === norm(existing.metaTitle) && description === norm(existing.metaDescription)) return {};
  if (!title && !description) {
    return { metaTitle: null, metaDescription: null, seoSource: null, seoGeneratedAt: null, seoKeyword: null };
  }
  return { metaTitle: title, metaDescription: description, seoSource: "admin", seoGeneratedAt: null, seoKeyword: null };
}
