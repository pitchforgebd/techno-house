/**
 * Graphics-card facts from a raw product name (SEO phase 8, v2.4). PURE, no lookbehind (bundled into the admin
 * form through lib/seo/product-seo.ts).
 *
 * Two rules, both from the production dry-run of batch 2:
 *  - memory is "8GB GDDR6" (size + the memory type the NAME states), never "8GB size";
 *  - a chip (GeForce RTX 3050, Arc A310, Radeon RX 9060 XT) is read only where the name or a stored spec WRITES it.
 *    It is never derived from a SKU: GV-N5070GAMING, GV-R9060XTGAMING and "-8GD" / "-16GD" are board codes, not
 *    statements ("8GD" is not "8GB GDDR6", "N5070" is not "RTX 5070").
 */

/** `size` and `type` are each null when the name does not state them ("..., GDDR6, Memory Bus-128 bit" has a type and no size). */
export type GpuMemory = { size: string | null; type: string | null };

const MEMORY_TYPE = /\b(GDDR\d[A-Z]?|HBM\d?[A-Z]?)\b/i;

/** The memory size and type the name states ("8GB", "GDDR6"), or null when it states neither. */
export function extractGpuMemoryFromName(name: string): GpuMemory | null {
  const text = name.replace(/[,;()]/g, " ");
  const type = text.match(MEMORY_TYPE)?.[1]?.toUpperCase() ?? null;
  const sizeOf = (digits: string | undefined) => {
    const n = Number(digits);
    return Number.isInteger(n) && n >= 1 && n <= 48 ? `${n}GB` : null;
  };
  // "4GB GDDR6", "4G GDDR6", "8 GB GDDR6X"
  const beforeType = text.match(/(?:^|[^\d.])(\d{1,2})\s?G(?:B)?\s+(?:GDDR\d[A-Z]?|HBM\d?[A-Z]?)\b/i);
  if (beforeType) {
    const size = sizeOf(beforeType[1]);
    if (size) return { size, type };
  }
  // "Memory: 4GB", "VRAM 8GB"
  const labelled = text.match(/\b(?:video\s+)?(?:memory|vram)\s*[:\-]?\s*(\d{1,2})\s?GB\b/i);
  if (labelled) {
    const size = sizeOf(labelled[1]);
    if (size) return { size, type };
  }
  // A single bare "6GB" in the name ("RTX 3050 WINDFORCE OC 6GB"); two different figures are not guessed between.
  const bare = [...text.matchAll(/(?:^|[^\d.])(\d{1,2})\s?GB\b/gi)].map((m) => sizeOf(m[1])).filter((s): s is string => s !== null);
  const distinct = [...new Set(bare)];
  if (distinct.length === 1 && distinct[0]) return { size: distinct[0], type };
  return type ? { size: null, type } : null;
}

const CHIP_PATTERNS: RegExp[] = [
  // NVIDIA: "GeForce RTX 3050", "RTX 5060 Ti", "GTX 1650 SUPER"
  /\b(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX)\s?\d{3,4}(?:\s?(?:Ti|SUPER|XT)){0,2}\b/i,
  // Intel: "Arc A310", "Arc B580"
  /\bArc\s+(?:Pro\s+)?[AB]\d{3}\w*\b/i,
  // AMD: "Radeon RX 9060 XT", "RX 7600 XT"
  /\b(?:Radeon\s+)?RX\s?\d{3,4}(?:\s?(?:XTX|XT|GRE))?\b/i,
];

/** The chip as the name writes it ("GeForce RTX 3050"), or null. Never derived from a board SKU. */
export function extractGpuChipFromName(name: string): string | null {
  const text = name.replace(/[,;()#]/g, " ").replace(/\s+/g, " ");
  for (const re of CHIP_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0].replace(/^NVIDIA\s+/i, "").replace(/\s+/g, " ").trim();
  }
  return null;
}
