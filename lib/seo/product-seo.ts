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
import { cleanProductName, cutAtWord } from "@/lib/seo/page-meta";

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
  /** e.g. few_specs, no_model_token, title_over_60, title_collision. */
  flags: string[];
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

/** Readable product type candidates, leaf first: umbrella categories skipped. */
function typeCandidates(chain: string[]): string[] {
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
const FORM_OK = /(E-?ATX|Micro-?ATX|mATX|Mini-?ITX|ATX)/i;

const SLOTS: Record<string, Slot> = {
  cpu: { keys: ["processor"], label: /^(processor|cpu|processor (?:model|name|type)|cpu (?:model|name|type))$/i, read: (v) => (CPU_OK.test(v) && v.length <= 32 ? squash(v.replace(/\s*processor$/i, "")) : null) },
  ram: { keys: ["ram"], label: /^(ram|memory|system memory|ram size|memory size|installed memory)$/i, read: (v) => { const m = v.match(GB); return m && Number(m[1]) >= 1 ? `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()} RAM` : null; } },
  storage: { keys: ["storage"], label: /^(storage|storage capacity|ssd|hdd|hard disk|hard drive|disk|drive capacity|ssd capacity)$/i, read: (v) => { const m = v.match(GB); if (!m) return null; const type = g(v.match(/(NVMe|SSD|HDD|eMMC)/i), 1); return `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()} ${type ? type.replace(/^nvme$/i, "NVMe SSD").toUpperCase().replace("NVME SSD", "NVMe SSD") : "storage"}`; } },
  display_size: { keys: ["size"], label: /^(display|screen|display size|screen size|size|panel size|monitor size)$/i, read: (v) => { const m = v.match(INCH); return m ? `${trimNum(g(m, 1))} inch display` : null; } },
  resolution: { keys: [], label: /^(resolution|display resolution|screen resolution|max resolution|maximum resolution|native resolution)$/i, read: (v) => { const d = v.match(/(\d{3,4})\s?[x×*]\s?(\d{3,4})/); if (d) return `${g(d, 1)}x${g(d, 2)} resolution`; const t = v.match(/\b(4K|8K|2K|UHD|QHD|WQHD|FHD|Full ?HD|HD)\b/i); return t ? `${g(t, 1).toUpperCase().replace(/^FULL ?HD$/, "Full HD")} resolution` : null; } },
  refresh: { keys: [], label: /^(refresh rate|refresh|max refresh rate)$/i, read: (v) => { const m = v.match(/(\d{2,3})\s?hz\b/i); return m ? `${g(m, 1)}Hz refresh rate` : null; } },
  panel: { keys: ["panel"], label: /^(panel|panel type|display type|screen type)$/i, read: (v) => { const m = v.match(/^(IPS|VA|TN|OLED|AMOLED|PLS|AMVA|MVA)\b/i); return m ? `${g(m, 1).toUpperCase()} panel` : null; } },
  gpu_chip: { keys: ["graphics"], label: /^(graphics|gpu|graphics chip|chipset|gpu model|graphics processor|video card|graphics card)$/i, read: (v) => (GPU_OK.test(v) && v.length <= 32 ? squash(v) : null) },
  vram: { keys: ["memory"], label: /^(memory|video memory|vram|graphics memory|memory size|memory capacity)$/i, read: (v) => { const m = v.match(GB); if (!m) return null; const t = g(v.match(/(GDDR\d\w?)/i), 1).toUpperCase(); return `${trimNum(g(m, 1))}${g(m, 2).toUpperCase()}${t ? ` ${t}` : ""} VRAM`; } },
  socket: { keys: ["socket"], label: /^(socket|cpu socket|socket type|supported socket)$/i, read: (v) => (SOCKET_OK.test(v) ? `${squash(v).toUpperCase().replace(/^LGA\s/, "LGA")} socket` : null) },
  mb_chipset: { keys: [], label: /^chipset$/i, read: (v) => { const m = v.match(/\b([ABHXZQWC]\d{2,3}[A-Z]?|TRX\d+|WRX\d+)\b/i); return m ? `${g(m, 1).toUpperCase()} chipset` : null; } },
  form_factor: { keys: ["formFactor"], label: /^(form factor|motherboard form factor|board size|supported form factor)$/i, read: (v) => { const m = v.match(FORM_OK); return m ? `${g(m, 1).replace(/^micro-?atx$/i, "Micro-ATX").replace(/^mini-?itx$/i, "Mini-ITX").toUpperCase().replace("MICRO-ATX", "Micro-ATX").replace("MINI-ITX", "Mini-ITX")} form factor` : null; } },
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
  case_type: { keys: [], label: /^(case type|type|form factor|case size)$/i, read: (v) => { const m = v.match(/(Mini|Mid|Full|Super)[- ]?Tower|\bMicro-?ATX\b|\bMini-?ITX\b|\bCube\b/i); return m ? `${squash(m[0]).replace(/^./, (c) => c.toUpperCase())} case` : null; } },
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
  audio_type: { keys: ["audioType"], label: /^(type|headphone type|form|wearing style)$/i, read: (v) => { const m = v.match(/(over-?ear|on-?ear|in-?ear|earbuds?|neckband)/i); return m ? squash(g(m, 1)).replace(/^./, (c) => c.toUpperCase()) : null; } },
  mic: { keys: ["microphone"], label: /^(microphone|mic)$/i, allowBool: true, read: (v) => (/^(yes|built|with|supported|inline|detachable|boom)/i.test(v) ? "Built-in microphone" : null) },
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
  monitor: ["display_size", "resolution", "refresh", "panel", "connectivity"],
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
  camera: ["cam_res", "lens", "ir", "cam_type", "poe"],
  nvr: ["channels", "cam_res", "bays", "poe"],
  router: ["wifi_std", "net_speed", "net_ports", "connectivity"],
  switch: ["net_ports", "net_speed", "poe", "connectivity"],
  cable: ["cable_cat", "cable_len", "cable_shield", "fiber", "cable_conn"],
  "ip-phone": ["sip", "display_size", "poe", "connectivity"],
  "flat-panel": ["display_size", "resolution", "touch", "connectivity"],
  "capture-card": ["capture_res", "capture_if", "connectivity"],
  headphone: ["audio_type", "driver", "connectivity", "mic"],
  speaker: ["speaker_power", "speaker_ch", "connectivity"],
  keyboard: ["kb_switch", "connectivity"],
  mouse: ["mouse_dpi", "connectivity"],
  ups: ["ups_cap", "connectivity"],
  other: ["display_size", "connectivity", "net_speed", "wattage", "storage_cap"],
};

const BLOCKED_LABEL = /(brand|manufacturer|item|series|warranty|model|sku|upc|ean|colou?r|weight|dimension|package|material|origin|country|name|description|note)/i;
const normLabel = (label: string) => squash(label.replace(/[:：]+$/, "")).toLowerCase();
const phraseKey = (p: string) => p.toLowerCase();

function validPhrase(phrase: string): boolean {
  return phrase.length > 1 && phrase.length <= 36 && !CLAIM_WORDS.test(phrase) && !hasRepeatedWord(phrase);
}

/** 3-4 real spec phrases for the product's family. Never invents a value. */
export function pickSpecPhrases(facts: SpecFact[], family: FamilyId, brand: string, max = 4): string[] {
  const out: string[] = [];
  const add = (phrase: string | null) => {
    if (!phrase || !validPhrase(phrase)) return;
    const key = phraseKey(phrase);
    const firstToken = key.split(" ")[0] ?? "";
    if (out.some((other) => {
      const o = phraseKey(other);
      return o.includes(key) || key.includes(o) || (/\d/.test(firstToken) && o.split(" ")[0] === firstToken);
    })) return;
    out.push(phrase);
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
      if (phrase) {
        add(phrase);
        break;
      }
    }
  }
  // Fill: numeric spec rows from a safe label list ("4 ports", "2400 dpi").
  if (out.length < 3) {
    for (const fact of usable) {
      if (out.length >= max) break;
      const label = normLabel(fact.label);
      const value = squash(fact.value);
      if (BLOCKED_LABEL.test(label) || isJunkValue(value, brand)) continue;
      if (!/^(interface|connectivity|resolution|capacity|speed|ports?|power|memory|storage|size|output|input)$/.test(label)) continue;
      if (!/^\d/.test(value) || value.length > 18 || !/[a-z]/i.test(value)) continue;
      add(`${value} ${label}`);
    }
  }
  return out.slice(0, max);
}

// ---------------------------------------------------------------------------
// Name -> core (brand + product line + model code), never cut
// ---------------------------------------------------------------------------

const UNIT_WORD = /^(?:gb|tb|mb|ghz|mhz|hz|w|v|mm|cm|m|mp|ft|kg|g|mah|ah|va|inch|inches|in|pcs|pack|core|cores|port|ports|ch|gen|th|k|"|”)$/i;
const SPEC_TOKEN = /^\d+(?:\.\d+)?-?(?:gb|tb|mb|ghz|mhz|hz|w|v|mm|cm|m|mp|ft|kg|g|mah|ah|va|inch|in|pcs|pack|core|cores|port|ports|ch|k|"|”|th)$/i;
const NOT_MODEL = new Set(["wi-fi", "full-hd", "plug-in", "all-in-one", "dual-band", "tri-band", "low-profile", "heavy-duty", "e-paper", "usb-c", "type-c", "non-stop", "built-in"]);

function isModelToken(token: string, next: string | undefined, index: number): boolean {
  const t = token.replace(/^[(\[]+|[)\],.;:]+$/g, "");
  if (!t || NOT_MODEL.has(t.toLowerCase())) return false;
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    if (next && UNIT_WORD.test(next.replace(/[^A-Za-z"”]/g, ""))) return false;
    return t.length >= 3 || index === 1;
  }
  if (/\d/.test(t) && /[A-Za-z]/.test(t)) return !SPEC_TOKEN.test(t);
  // PTP-II, DS-K1: letters on both sides of a hyphen with an uppercase letter.
  return /^[A-Za-z]{1,6}-[A-Za-z0-9]+$/.test(t) && /[A-Z]/.test(t);
}

/** Words that complete a model code when they directly follow it ("4060 Ti", "7800 XT"). */
const MODEL_SUFFIX = /^(?:Ti|Super|XT|XTX|GRE|X3D|Pro|Max|Ultra|Plus|Lite|SE|Mini|OC|Gen)$/;

type Parts = { brand: string[]; line: string[]; model: string[]; rest: string[]; hasModel: boolean; code: string | null };

function splitName(input: SeoProductInput): Parts {
  const brand = squash(input.brand);
  const cleaned = cleanProductName(input.name, /^(?:no ?brand|unbranded|other|others|generic|unknown|n\/a)$/i.test(brand) ? "" : brand);
  const tokens = squash(cleaned.clean || input.name).split(" ").filter(Boolean);
  const brandTokens = brand && tokens[0]?.toLowerCase() === brand.split(" ")[0]?.toLowerCase() ? brand.split(" ").length : 0;
  const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = norm(input.modelNumber ?? "");
  let modelStart = -1;
  if (wanted.length >= 3) {
    modelStart = tokens.findIndex((token, i) => i >= brandTokens && norm(token).includes(wanted));
  }
  if (modelStart < 0) {
    modelStart = tokens.findIndex((token, i) => i >= Math.max(1, brandTokens) && isModelToken(token, tokens[i + 1], i));
  }
  const hasModel = modelStart >= 0;
  if (!hasModel) {
    const cut = Math.min(tokens.length, Math.max(brandTokens, 1) + 3);
    return { brand: tokens.slice(0, brandTokens), line: tokens.slice(brandTokens, cut), model: [], rest: tokens.slice(cut), hasModel, code: cleaned.code };
  }
  let modelEnd = modelStart + 1;
  while (modelEnd < tokens.length && isModelToken(tokens[modelEnd] ?? "", tokens[modelEnd + 1], modelEnd)) modelEnd += 1;
  while (modelEnd < tokens.length && MODEL_SUFFIX.test(tokens[modelEnd] ?? "") && modelEnd > modelStart) modelEnd += 1;
  return {
    brand: tokens.slice(0, brandTokens),
    line: tokens.slice(brandTokens, modelStart),
    model: tokens.slice(modelStart, modelEnd),
    rest: tokens.slice(modelEnd),
    hasModel,
    code: cleaned.code,
  };
}

// ---------------------------------------------------------------------------
// Title / description / alt composition
// ---------------------------------------------------------------------------

type Prep = {
  input: SeoProductInput;
  family: Family;
  parts: Parts;
  typeList: string[];
  specs: string[];
  facts: SpecFact[];
};

function prepare(input: SeoProductInput): Prep {
  const family = familyOf(input.categoryChain);
  return {
    input,
    family,
    parts: splitName(input),
    typeList: typeCandidates(input.categoryChain),
    specs: pickSpecPhrases(input.specs, family.id, input.brand, 4),
    facts: input.specs,
  };
}

function includesWord(tokens: string[], phrase: string): boolean {
  const head = phrase.split(" ").pop() ?? "";
  return new RegExp(`\\b${escapeRe(head)}s?\\b`, "i").test(tokens.join(" "));
}

/** Core text (before "Price in …"): brand + kept line words + model + extra + type. */
function coreText(prep: Prep, lineKeep: number, extra: string): { text: string; type: string } {
  const { parts, typeList } = prep;
  const line = lineKeep >= parts.line.length ? parts.line : lineKeep <= 0 ? [] : parts.line.slice(-lineKeep);
  const body = [...parts.brand, ...line, ...parts.model, ...(extra ? [extra] : [])];
  // The product already says what it is when the head noun of ANY category in
  // its chain is in the kept text ("Desktop" for a "Star PC" leaf).
  const named = typeList.some((candidate) => includesWord(body, candidate));
  const type = named ? "" : typeList[0] ?? "";
  return { text: squash([...body, type].join(" ")), type };
}

function composeTitle(prep: Prep, extra: string): { title: string; core: string; rule: string; flags: string[] } {
  const lines = prep.parts.line.length;
  const flags: string[] = [];
  const tries: { suffix: string; keep: number; label: string }[] = [
    { suffix: " Price in Bangladesh", keep: lines, label: "full name" },
    { suffix: " Price in BD", keep: lines, label: "'Price in BD' fallback" },
  ];
  if (lines > 0) {
    for (let keep = lines - 1; keep >= 0; keep -= 1) {
      tries.push({ suffix: " Price in Bangladesh", keep, label: `product-line words trimmed to ${keep}` });
    }
    for (let keep = lines - 1; keep >= 0; keep -= 1) {
      tries.push({ suffix: " Price in BD", keep, label: `'Price in BD', line words trimmed to ${keep}` });
    }
  }
  for (const attempt of tries) {
    const { text } = coreText(prep, attempt.keep, extra);
    if ((text + attempt.suffix).length <= SEO_TITLE_MAX) {
      const branded = `${text}${attempt.suffix} | ${SITE}`;
      const withBrand = branded.length <= SEO_TITLE_MAX;
      return { title: withBrand ? branded : text + attempt.suffix, core: text, rule: `${attempt.label}${withBrand ? " + brand suffix" : ""}`, flags };
    }
  }
  // Model + type alone are already too long: keep them, drop the suffix.
  const { text } = coreText(prep, 0, extra);
  flags.push("title_over_60");
  return { title: `${text} Price in BD`, core: text, rule: "model + type kept, over 60", flags };
}

const LEADS = [
  (core: string, specs: string) => `${core}: ${specs}.`,
  (core: string, specs: string) => `${core} with ${specs}.`,
  (core: string, specs: string) => `${core} – ${specs}.`,
  (core: string, specs: string) => `Key specs of ${core}: ${specs}.`,
];
/** Neutral, no stock / price / warranty claim. [0] is the owner's wording; the others are shorter so 3-4 specs still fit in 155. */
const CLOSINGS = [
  "Check price and availability at Techno House. Delivery in Dhaka and across Bangladesh.",
  "Check price and availability at Techno House. Delivery across Bangladesh.",
  "Price and availability at Techno House. Delivery in Dhaka and across Bangladesh.",
  "Price and availability at Techno House. Delivery across Bangladesh.",
];

function composeDescription(id: string, cores: string[], specs: string[]): { text: string; used: number; flags: string[] } {
  const h = hashId(id);
  const lead0 = h % LEADS.length;
  const close0 = Math.floor(h / LEADS.length) % CLOSINGS.length;
  const maxN = Math.min(4, specs.length);
  const candidates: { text: string; used: number }[] = [];
  // Most specs first; within that, rotate the wording from the hashed variant.
  // "65 inch display" -> "65 inch" when the units already say it: tried before dropping a spec.
  const compact = specs.map((spec) => spec.replace(/ (?:display|resolution|refresh rate)$/, ""));
  // Last resort when a product has too few specs to reach 120 characters: a
  // neutral pointer, never a claim.
  const FILLER = "See full specifications on the product page.";
  for (let n = maxN; n >= 0; n -= 1) {
    for (const list of [specs, compact]) {
      for (const core of cores) {
        for (let a = 0; a < LEADS.length; a += 1) {
          for (let b = 0; b < CLOSINGS.length; b += 1) {
            const lead = LEADS[(lead0 + a) % LEADS.length];
            const close = CLOSINGS[(close0 + b) % CLOSINGS.length];
            if (!lead || !close) continue;
            const head = n > 0 ? lead(core, list.slice(0, n).join(", ")) : `${core}.`;
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

function render(prep: Prep, extra: string): SeoResult {
  const { input, family, parts } = prep;
  const title = composeTitle(prep, extra);
  const shortCore = coreText(prep, 0, extra).text;
  const description = composeDescription(input.id, shortCore !== title.core ? [title.core, shortCore] : [title.core], prep.specs);
  const flags = [...title.flags, ...description.flags];
  if (!parts.hasModel) flags.push("no_model_token");
  const type = coreText(prep, parts.line.length, extra).type || prep.typeList[0] || "";
  const keywordBase = squash([...parts.brand, ...parts.line, ...parts.model].join(" ")).toLowerCase();
  const primary = `${parts.hasModel ? keywordBase : title.core.toLowerCase()} price in bangladesh`;
  const secondary = [
    `${keywordBase} price in bd`,
    `${keywordBase} specs`,
    `${keywordBase} review`,
    prep.typeList[0] ? `${squash(input.brand)} ${prep.typeList[0]} price in bangladesh`.toLowerCase() : "",
  ].filter(Boolean);
  const alt = title.core.length <= SEO_ALT_MAX ? title.core : cutAtWord(title.core, SEO_ALT_MAX);
  return {
    id: input.id,
    title: title.title,
    titleRule: title.rule,
    metaDescription: description.text,
    primaryKeyword: primary,
    secondaryKeywords: secondary,
    imageAlt: alt,
    family: family.id,
    familyWeight: family.weight,
    type,
    specsUsed: prep.specs.slice(0, description.used),
    specsAvailable: prep.specs.length,
    flags,
    collisionGroup: null,
    needsReview: flags.includes("title_over_60"),
  };
}

/** One product on its own (no collision handling). Used by the admin form's suggestion. */
export function generateProductSeo(input: SeoProductInput): SeoResult {
  return render(prepare(input), "");
}

// ---------------------------------------------------------------------------
// A whole set: disambiguate colliding titles
// ---------------------------------------------------------------------------

const COLOURS = new Set("black white silver blue red grey gray gold green pink purple orange yellow brown cyan magenta beige navy rose graphite titanium midnight starlight".split(" "));
const SPEC_NAME_TOKEN = /^\d+(?:\.\d+)?(?:gb|tb|mb|mhz|ghz|w|va|mah|inch|"|mm|mp|ft|m)$/i;

type Distinguisher = { kind: string; text: string };

function distinguishers(prep: Prep, group: Prep[]): Distinguisher[] {
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
  if (storage) out.push({ kind: "storage", text: storage });
  const capacity = phrase("storage_cap") || phrase("ram_capacity");
  if (capacity) out.push({ kind: "capacity", text: capacity });
  const size = phrase("display_size") || phrase("fan_size");
  if (size) out.push({ kind: "size", text: size.replace(/ (display)$/, "") });
  const cpu = phrase("cpu");
  if (cpu) out.push({ kind: "cpu", text: cpu });
  // Spec-like / colour words from the name that not every group member has.
  const mine = prep.parts.rest;
  const others = group.filter((p) => p !== prep).map((p) => new Set(p.parts.rest.map((t) => t.toLowerCase())));
  for (const token of mine) {
    const key = token.toLowerCase().replace(/[^a-z0-9."]/g, "");
    if (!(SPEC_NAME_TOKEN.test(key) || COLOURS.has(key))) continue;
    if (others.every((set) => set.has(token.toLowerCase()))) continue;
    out.push({ kind: COLOURS.has(key) ? "colour" : "name", text: token.replace(/[(),]/g, "") });
  }
  const code = (prep.parts.code ?? prep.input.sku ?? "").toUpperCase();
  if (code) out.push({ kind: "code", text: code });
  return out;
}

/**
 * Results for a whole set of products, input order kept. Products whose
 * titles collide get the distinguishing spec added; any that still collide
 * are flagged `title_collision` + `needsReview` and share a `collisionGroup`.
 */
export function generateProductSeoSet(inputs: SeoProductInput[]): SeoResult[] {
  const preps = inputs.map(prepare);
  const extras = new Map<Prep, string[]>();
  const titleOf = (prep: Prep) => render(prep, (extras.get(prep) ?? []).join(" ")).title.toLowerCase();
  const groupsOf = (list: Prep[]): Prep[][] => {
    const byTitle = new Map<string, Prep[]>();
    for (const prep of list) byTitle.set(titleOf(prep), [...(byTitle.get(titleOf(prep)) ?? []), prep]);
    return [...byTitle.values()].filter((members) => members.length > 1);
  };
  let pending = groupsOf(preps);
  for (let round = 0; round < 3 && pending.length > 0; round += 1) {
    const next: Prep[] = [];
    for (const group of pending) {
      const options = new Map(group.map((prep) => [prep, distinguishers(prep, group)] as const));
      const kinds = ["ram", "storage", "capacity", "size", "cpu", "colour", "name", "code"];
      for (const kind of kinds) {
        const values = group.map((prep) => options.get(prep)?.find((d) => d.kind === kind)?.text ?? "");
        const distinct = new Set(values.map((v) => v.toLowerCase()));
        if (distinct.size <= 1) continue;
        group.forEach((prep, i) => {
          const value = values[i] ?? "";
          const have = (extras.get(prep) ?? []).join(" ").toLowerCase();
          if (value && !have.includes(value.toLowerCase())) extras.set(prep, [...(extras.get(prep) ?? []), value]);
        });
        break;
      }
      next.push(...group);
    }
    pending = groupsOf(next);
  }
  const results = preps.map((prep) => render(prep, (extras.get(prep) ?? []).join(" ")));
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
