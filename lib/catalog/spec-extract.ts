/**
 * Spec extraction from a raw product name (SEO phase 8, v2.2). PURE: no database, no I/O,
 * and no regex lookbehind (the SEO generator that imports it is bundled into the admin form).
 *
 * Used by BOTH `scripts/deploy/populate-import-attributes.ts` (which turns names into stored
 * attributes) and `lib/seo/product-seo.ts` (which reads RAM / storage / CPU straight from the
 * name so a wrong stored attribute can never reach a title or description).
 *
 * The bugs this replaces (found in the production dry-run):
 *  - "16.0GB DDR5, 512GB SSD" gave "0GB": `\d{1,3}GB` matched the "0GB" after the decimal point,
 *    then the same "0GB" was taken for storage (it sat within 20 characters of "SSD");
 *  - "8GB, 1x8GB-512GB SSD" gave storage = 8GB (the RAM figure is also near "SSD").
 *
 * Rules: sizes are read as whole decimals; a size belongs to RAM or storage by the NEAREST keyword
 * in its own segment (after it first, then before it): DDR / LPDDR / RAM / Memory / DIMM / MHz -> RAM,
 * SSD / NVMe / HDD / eMMC / Storage -> storage. No keyword: a corporate "8GB, 1x8GB-" prefix is RAM,
 * and a lone TB or 128GB+ figure is storage. Two different storage figures, or anything unclear,
 * is left unstated rather than guessed. Zero is never a value.
 */

export type StorageKind = "SSD" | "HDD" | "NVMe" | "eMMC" | null;
export type NameStorage = { size: string; kind: StorageKind };
export type NameSpecs = {
  /** "16GB" */
  ram: string | null;
  storage: NameStorage | null;
  /** The name states more than one storage size, so none is claimed. */
  storageAmbiguous: boolean;
  /** "Core i5-13420H", "Core Ultra 7 255H", "Ryzen 5 7640HS" */
  cpu: string | null;
};

type Size = { value: number; unit: "GB" | "TB"; start: number; end: number; multiplier: number };
type Kind = "ram" | "storage";

/** 16.0 -> "16", 1.50 -> "1.5". Null for zero or junk. */
export function plainNumber(raw: string): string | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return String(value);
}

/** Every "<number>GB|TB" in `text`; decimals are read whole ("16.0GB" is 16, never "0GB"). */
function findSizes(text: string): Size[] {
  const out: Size[] = [];
  const re = /(^|[^\d.])(\d+(?:\.\d+)?)\s?(TB|GB)\b/gi;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const lead = m[1] ?? "";
    const start = m.index + lead.length;
    const value = Number(m[2]);
    const before = text.slice(Math.max(0, start - 6), start);
    // "1x8GB", "2 x 8GB": a module count in front of the size.
    const count = before.match(/(\d{1,2})\s*[xX]\s*$/);
    out.push({
      value,
      unit: (m[3] ?? "GB").toUpperCase() === "TB" ? "TB" : "GB",
      start,
      end: m.index + m[0].length,
      multiplier: count ? Number(count[1]) : 1,
    });
    re.lastIndex = m.index + m[0].length - 1; // the next size may start right after this one
  }
  return out;
}

const RAM_WORD = /(?:LP)?DDR-?\d|SO-?DIMM|U?DIMM|\bRAM\b|\bMemory\b|Unified|On-?board|Soldered|\d{3,5}\s?(?:MHz|MT\/s)/i;
const STORAGE_WORD = /\bSSD\b|NVMe|\bHDD\b|\beMMC\b|\bSSHD\b|\bStorage\b|\bHard Disk\b|\bM\.2\b/i;

function earliest(text: string): { kind: Kind; index: number } | null {
  const ram = RAM_WORD.exec(text);
  const storage = STORAGE_WORD.exec(text);
  if (ram && (!storage || ram.index <= storage.index)) return { kind: "ram", index: ram.index };
  if (storage) return { kind: "storage", index: storage.index };
  return null;
}

function latest(text: string): Kind | null {
  let best: { kind: Kind; index: number } | null = null;
  for (const [kind, re] of [["ram", RAM_WORD], ["storage", STORAGE_WORD]] as const) {
    const g = new RegExp(re.source, "gi");
    for (let m = g.exec(text); m; m = g.exec(text)) {
      if (!best || m.index >= best.index) best = { kind, index: m.index };
      if (m[0].length === 0) g.lastIndex += 1;
    }
  }
  return best ? best.kind : null;
}

/** The keyword nearest to this size within its own segment: after it first, then before it. */
function classify(text: string, size: Size, nextStart: number): Kind | null {
  const afterRaw = text.slice(size.end, Math.min(size.end + 18, nextStart));
  const after = afterRaw.split(/[,;|/]/)[0] ?? "";
  const hit = earliest(after);
  if (hit) return hit.kind;
  const beforeRaw = text.slice(Math.max(0, size.start - 14), size.start);
  const before = beforeRaw.split(/[,;|/()]/).pop() ?? "";
  return latest(before);
}

function storageKind(text: string): StorageKind {
  if (/NVMe/i.test(text)) return "NVMe";
  if (/\bSSD\b/i.test(text)) return "SSD";
  if (/\bHDD\b|\bSSHD\b|\bHard Disk\b/i.test(text)) return "HDD";
  if (/\beMMC\b/i.test(text)) return "eMMC";
  return null;
}

const sizeText = (value: number, unit: string) => {
  const plain = plainNumber(String(value));
  return plain ? `${plain}${unit}` : null;
};

/** CPU model as written in the name: "Core i3-1115G4", "Core Ultra 7 255H", "Ryzen 5 7640HS". */
export function extractCpuFromName(name: string): string | null {
  let m = name.match(/\bCore(?:™|®)?\s*Ultra\s*([3579])(?:[\s-]*(\d{3}[A-Z]{0,2}))?/i);
  if (!m) m = name.match(/\bUltra\s*([3579])[\s-]*(\d{3}[A-Z]{0,2})\b/i);
  if (m) return `Core Ultra ${m[1]}${m[2] ? ` ${m[2].toUpperCase()}` : ""}`;
  m = name.match(/\b(?:Core(?:™|®)?\s*)?i([3579])[-\s](\d{4,5}[A-Za-z]{0,2}\d?)\b/i);
  if (m) return `Core i${m[1]}-${(m[2] ?? "").toUpperCase()}`;
  m = name.match(/Ryzen(?:™|®)?\s*((?:AI\s*)?[3579])\s*(\d{4}[A-Za-z]{0,2}\d?)?/i);
  if (m) return `Ryzen ${(m[1] ?? "").replace(/\s+/g, " ").toUpperCase().replace(/^AI /, "AI ")}${m[2] ? ` ${m[2].toUpperCase()}` : ""}`;
  return null;
}

/** RAM, storage and CPU as the name states them (never a guess). */
export function extractNameSpecs(name: string): NameSpecs {
  // "(1x8GB)" module-configuration brackets repeat the size; take them out so the first figure is judged alone.
  const text = name.replace(/\(\s*\d+\s*[xX]\s*\d+(?:\.\d+)?\s*(?:GB|TB)\s*\)/gi, " ");
  const sizes = findSizes(text);
  const ram: Size[] = [];
  const storage: { size: Size; kind: StorageKind }[] = [];
  const unclear: Size[] = [];
  sizes.forEach((size, i) => {
    const kind = classify(text, size, sizes[i + 1]?.start ?? Number.POSITIVE_INFINITY);
    if (kind === "ram") ram.push(size);
    else if (kind === "storage") {
      const after = text.slice(size.end, size.end + 18).split(/[,;|/]/)[0] ?? "";
      const before = text.slice(Math.max(0, size.start - 14), size.start).split(/[,;|/()]/).pop() ?? "";
      storage.push({ size, kind: storageKind(after) ?? storageKind(before) });
    } else unclear.push(size);
  });

  // RAM: the first RAM-classified figure that is not just a module count, else a module total ("2x8GB"), else the
  // corporate "8GB, 1x8GB-512GB SSD" convention (first figure, then a module-count figure).
  let ramText: string | null = null;
  const single = ram.find((s) => s.multiplier === 1 && s.unit === "GB");
  if (single) ramText = sizeText(single.value, "GB");
  else if (ram[0] && ram[0].unit === "GB") ramText = sizeText(ram[0].value * ram[0].multiplier, "GB");
  if (!ramText) {
    const corporate = text.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s?GB,\s*\d+\s*[xX]\s*\d+(?:\.\d+)?\s?GB(?:[-\s]|$)/i);
    if (corporate) ramText = sizeText(Number(corporate[1]), "GB");
  }
  if (ramText && (Number.parseFloat(ramText) < 1 || Number.parseFloat(ramText) > 512)) ramText = null;

  // Storage: keyword-classified figures; else a lone TB / 128GB+ figure that is not the RAM.
  let candidates = storage.filter((s) => (s.size.unit === "TB" || s.size.value >= 16));
  if (candidates.length === 0) {
    const guess = unclear.filter((s) => !s.multiplier || s.multiplier === 1).filter((s) => s.unit === "TB" || s.value >= 128);
    candidates = guess.map((size) => ({ size, kind: null as StorageKind }));
  }
  const distinct = new Set(candidates.map((c) => sizeText(c.size.value, c.size.unit)));
  let storageOut: NameStorage | null = null;
  if (distinct.size === 1 && candidates[0]) {
    const size = sizeText(candidates[0].size.value, candidates[0].size.unit);
    if (size) storageOut = { size, kind: candidates[0].kind };
  }
  return { ram: ramText, storage: storageOut, storageAmbiguous: distinct.size > 1, cpu: extractCpuFromName(name) };
}

/** "16GB" (or null): what the populate script stores as a RAM / capacity attribute. */
export function extractRamFromName(name: string): string | null {
  return extractNameSpecs(name).ram;
}

/** "512GB" (or null): what the populate script stores as a storage attribute (size only, as before). */
export function extractStorageSizeFromName(name: string): string | null {
  return extractNameSpecs(name).storage?.size ?? null;
}
