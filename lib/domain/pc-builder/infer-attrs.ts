import type { BuilderSlot } from "@/lib/data/types/catalog";
import { formatAttrList } from "@/lib/domain/pc-builder/attr-values";

/**
 * Conservative inference of PC Builder compatibility values from the text a
 * catalog import already has (AD-346) — used by the one-off backfill script,
 * never at request time.
 *
 * Rule of thumb: a wrong value is worse than a missing one. A missing value
 * makes a part "not set" (hidden by default, never wrongly suggested); a
 * wrong one silently recommends an incompatible part. So every rule below
 * returns nothing when the text is ambiguous, and a CPU whose explicit socket
 * disagrees with its model-number series is reported as a conflict instead of
 * guessed.
 *
 * Pure — no I/O.
 */

export type InferInput = {
  slot: BuilderSlot;
  name: string;
  /** Product.overview paragraphs — may contain HTML; stripped before matching. */
  overview?: readonly string[] | string | null;
  /**
   * Values the earlier SMART attribute-population pass already extracted
   * (Product attribute keys "socket" / "ramType" / "formFactor"), reused so
   * the same regexes aren't duplicated here.
   */
  attributes?: Partial<Record<"socket" | "ramType" | "formFactor", string>>;
};

export type InferredField =
  | "socket"
  | "ramType"
  | "formFactor"
  | "storageInterface"
  | "tdpWatts";

export type InferredValue = { value: string; source: string };

export type InferResult = {
  values: Partial<Record<InferredField, InferredValue>>;
  /** Human-readable reasons a value was deliberately NOT set. */
  conflicts: string[];
};

function plainText(html: readonly string[] | string | null | undefined): string {
  if (!html) return "";
  const joined = typeof html === "string" ? html : html.join(" ");
  return joined
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const ALL_SIZES = ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"] as const;

// ---------------------------------------------------------------- sockets

/** First explicit socket token ("AM5", "LGA1700", "LGA 1851"), or null. */
function explicitSocket(text: string): string | null {
  const am = text.match(/\bAM([45])\b/i);
  const lga = text.match(/\bLGA[\s-]?(\d{3,4})\b/i);
  if (am && lga) {
    return (am.index ?? 0) < (lga.index ?? 0)
      ? `AM${am[1]}`
      : `LGA${lga[1]}`;
  }
  if (am) return `AM${am[1]}`;
  if (lga) return `LGA${lga[1]}`;
  return null;
}

/** Socket implied by a CPU's generation / model series, or null. */
function cpuSocketFromSeries(text: string): string | null {
  if (/core\s*(?:™|®)?\s*ultra/i.test(text) || /\bultra\s*[3579]\s*2\d\d/i.test(text)) {
    return "LGA1851";
  }
  const gen = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*gen/i);
  if (gen && /intel|core|\bi[3579]\b/i.test(text)) {
    const n = Number(gen[1]);
    if (n >= 6 && n <= 9) return "LGA1151";
    if (n === 10 || n === 11) return "LGA1200";
    if (n >= 12 && n <= 14) return "LGA1700";
  }
  const ryzen = text.match(/ryzen\s*(?:ai\s*)?[3579]\s*-?\s*(\d)\d{3}/i);
  if (ryzen) {
    const d = Number(ryzen[1]);
    if (d >= 1 && d <= 5) return "AM4";
    if (d >= 7 && d <= 9) return "AM5";
  }
  return null;
}

function inferCpuSocket(
  input: InferInput,
  text: string,
): { value?: InferredValue; conflict?: string } {
  const fromAttr = input.attributes?.socket;
  const explicit = explicitSocket(input.name) ?? fromAttr ?? null;
  const series = cpuSocketFromSeries(input.name);
  if (explicit && series && explicit.toUpperCase() !== series) {
    return {
      conflict: `CPU socket: name says ${explicit} but its model series implies ${series} — left unset for a human to check.`,
    };
  }
  if (explicit) {
    return { value: { value: explicit.toUpperCase(), source: "name/attribute" } };
  }
  if (series) {
    return { value: { value: series, source: "generation/series" } };
  }
  const fromOverview = explicitSocket(text);
  return fromOverview
    ? { value: { value: fromOverview.toUpperCase(), source: "overview" } }
    : {};
}

/**
 * RAM type a motherboard platform is limited to, when the name doesn't say.
 * Only sockets that are single-generation: AM4 and LGA1200 are DDR4-only, AM5
 * and LGA1851 are DDR5-only, LGA1150 is DDR3-only. LGA1700 (DDR4 *or* DDR5
 * depending on the board) and LGA1151 (some DDR3L boards) are deliberately
 * left out.
 */
const PLATFORM_RAM: Record<string, string> = {
  AM4: "DDR4",
  AM5: "DDR5",
  LGA1200: "DDR4",
  LGA1851: "DDR5",
  LGA1150: "DDR3",
};

function inferCoolerSockets(name: string, overview: string): string | null {
  const found = new Set<string>();
  const scan = (segment: string) => {
    for (const m of segment.matchAll(/\bAM([45])\b/gi)) found.add(`AM${m[1]}`);
    for (const m of segment.matchAll(/\bLGA[\s-]?(\d{3,4})\b/gi)) {
      found.add(`LGA${m[1]}`);
    }
  };
  scan(name);
  // "CPU Socket: Intel 1851 / 1700 / 115X / 1200 AMD AM5 / AM4" — bare Intel
  // numbers are only trusted inside a "socket" clause, never in free text.
  // The clause is read from the name or the overview on its own, so it can't
  // run across the boundary between the two.
  const clauseOf = (source: string) =>
    source.match(/sockets?\s*[:\-]?\s*(.{0,160})/i)?.[1];
  const segment = clauseOf(name) ?? clauseOf(overview);
  if (segment) {
    scan(segment);
    for (const m of segment.matchAll(/\b(1851|1700|1200|1151|1150)\b/g)) {
      found.add(`LGA${m[1]}`);
    }
    if (/\b115x\b/i.test(segment)) found.add("LGA1151");
  }
  if (found.size === 0) {
    scan(overview);
  }
  if (found.size === 0) return null;
  const order = ["AM5", "AM4", "LGA1851", "LGA1700", "LGA1200", "LGA1151", "LGA1150"];
  return formatAttrList(
    [...found].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }),
  );
}

// ------------------------------------------------------------------- RAM

function ddrToken(text: string): string | null {
  const m = text.match(/\bDDR-?([345])\b/i);
  return m ? `DDR${m[1]}` : null;
}

// ------------------------------------------------------------------ case

/** Board sizes a case holds: itself and everything smaller. */
function sizesUpTo(largest: (typeof ALL_SIZES)[number]): string {
  return formatAttrList(ALL_SIZES.slice(ALL_SIZES.indexOf(largest)));
}

function inferCaseSizes(
  name: string,
  overview: string,
): InferredValue | null {
  // Best evidence: an explicit "Motherboard Support: ATX, Micro-ATX" line.
  const clause = overview.match(
    /motherboard\s*(?:support(?:ed)?|compatib\w*)\s*[:\-]?\s*(.{0,80})/i,
  );
  if (clause?.[1]) {
    const listed = sizesIn(clause[1]);
    if (listed.length > 0) {
      return { value: formatAttrList(listed), source: "overview: motherboard support" };
    }
  }

  const stripped = name
    .replace(/\be[\s-]?atx\b/gi, " ")
    .replace(/\b(?:micro[\s-]?atx|m[\s-]?atx|matx)\b/gi, " ");
  const eatx = /\be[\s-]?atx\b/i.test(name);
  const matx = /\b(?:micro[\s-]?atx|m[\s-]?atx|matx)\b/i.test(name);
  const atx = /\batx\b/i.test(stripped);
  const itx = /mini[\s-]?itx/i.test(name);

  if (eatx) return { value: sizesUpTo("E-ATX"), source: "name: E-ATX" };
  if (atx) return { value: sizesUpTo("ATX"), source: "name: ATX" };
  if (matx) return { value: sizesUpTo("Micro-ATX"), source: "name: Micro-ATX" };
  if (itx) return { value: "Mini-ITX", source: "name: Mini-ITX" };
  if (/\bfull[\s-]?tower\b/i.test(name)) {
    return { value: sizesUpTo("E-ATX"), source: "name: Full Tower" };
  }
  if (/\bmid[\s-]?tower\b/i.test(name)) {
    return { value: sizesUpTo("ATX"), source: "name: Mid Tower" };
  }
  return null;
}

function sizesIn(text: string): string[] {
  const out: string[] = [];
  const stripped = text
    .replace(/\be[\s-]?atx\b/gi, (m) => {
      out.push("E-ATX");
      return ` ${"_".repeat(m.length)} `;
    })
    .replace(/\b(?:micro[\s-]?atx|m[\s-]?atx|matx)\b/gi, (m) => {
      out.push("Micro-ATX");
      return ` ${"_".repeat(m.length)} `;
    });
  if (/\batx\b/i.test(stripped)) out.push("ATX");
  if (/mini[\s-]?itx/i.test(text)) out.push("Mini-ITX");
  return ALL_SIZES.filter((size) => out.includes(size));
}

// --------------------------------------------------------------- storage

function inferDriveInterface(
  slot: "ssd" | "hdd",
  name: string,
): InferredValue | null {
  if (/\b(external|portable|usb|type-?c|storage array|dae)\b/i.test(name)) {
    return null;
  }
  const nvme = /\bnvme\b|\bpcie\b|\bgen\s?[345]\b/i.test(name);
  // No trailing \b: "SATAIII" / "SATA3" must count as SATA.
  const sata = /\bsata/i.test(name);
  if (slot === "hdd") {
    return sata && !/\bsas\b/i.test(name)
      ? { value: "SATA", source: "name: SATA" }
      : null;
  }
  if (nvme && !sata) return { value: "NVMe", source: "name: NVMe/PCIe" };
  if (sata && !nvme) return { value: "SATA", source: "name: SATA" };
  return null;
}

// ------------------------------------------------------------ power (W)

/**
 * PSU rated output. An explicit "650 Watt" / "450W" wins; otherwise the
 * wattage embedded in a well-known model code (Corsair RM850x / CX550 /
 * HX1500i / SF850L, Gigabyte GP-P550B / GP-UD1000GM). Anything that does not
 * look like a power supply (adapters, cables) is skipped.
 */
function inferPsuWatts(name: string): InferredValue | null {
  if (!/power\s*supply|\bpsu\b|\bwatts?\b|80\s?plus|\batx\b/i.test(name)) {
    return null;
  }
  const inRange = (watts: number) => watts >= 100 && watts <= 3000;
  const explicit = name.match(/\b(\d{3,4})\s?(?:W|Watts?)\b/i);
  if (explicit && inRange(Number(explicit[1]))) {
    return { value: explicit[1]!, source: "name: rated watts" };
  }
  const corsair = /corsair/i.test(name)
    ? name.match(/\b(?:RM[ex]?|CX|CV|HX|TX|AX|SF-?L?)(\d{3,4})[A-Za-z]{0,3}\b/)
    : null;
  if (corsair && inRange(Number(corsair[1]))) {
    return { value: corsair[1]!, source: "name: Corsair model code" };
  }
  const gigabyte = /gigabyte|aorus/i.test(name)
    ? name.match(/\bGP-[A-Z]{1,4}(\d{3,4})[A-Z]{0,3}\b/)
    : null;
  if (gigabyte && inRange(Number(gigabyte[1]))) {
    return { value: gigabyte[1]!, source: "name: Gigabyte model code" };
  }
  return null;
}

/**
 * Reference total board power (W) for the GPU families actually sold here,
 * keyed on the exact model code / marketing name — never a family-wide guess.
 * Manufacturer reference figures: partner overclocked cards can draw a little
 * more, which the engine's 1.5x PSU headroom absorbs. NOT taken from the
 * overview's "Power supply requirement", which is the whole system's
 * recommended PSU, not this card's draw (using it would double-count).
 * Order matters: more specific codes first (5070 Ti before 5070).
 */
const GPU_BOARD_POWER: readonly [RegExp, number, string][] = [
  [/\bGV-N5090/i, 575, "RTX 5090"],
  [/\bGV-N5080/i, 360, "RTX 5080"],
  [/\bGV-N507T/i, 300, "RTX 5070 Ti"],
  [/\bGV-N5070/i, 250, "RTX 5070"],
  [/\bGV-N506T/i, 180, "RTX 5060 Ti"],
  [/\bGV-N5060/i, 145, "RTX 5060"],
  [/\bGV-N5050/i, 130, "RTX 5050"],
  [/\bGV-N3060/i, 170, "RTX 3060"],
  [/\bGV-N3050\S*6GD/i, 70, "RTX 3050 6GB"],
  [/\bGV-N3050/i, 130, "RTX 3050 8GB"],
  [/\bGV-N730/i, 38, "GT 730"],
  [/\bGV-R9070XT/i, 304, "RX 9070 XT"],
  [/\bGV-R9070/i, 220, "RX 9070"],
  [/\bGV-R9060XT\S*16GD/i, 160, "RX 9060 XT 16GB"],
  [/\bGV-R9060XT/i, 150, "RX 9060 XT 8GB"],
  [/\bGV-IA3[18]0/i, 75, "Arc A310/A380"],
  [/\bArc\W*A7[57]0\b/i, 225, "Arc A750/A770"],
  [/\bGTX\s?1650\b/i, 75, "GTX 1650"],
];

function inferGpuPower(name: string): InferredValue | null {
  for (const [pattern, watts, model] of GPU_BOARD_POWER) {
    if (pattern.test(name)) {
      return { value: String(watts), source: `table: ${model} reference power` };
    }
  }
  return null;
}

/** Manufacturer TDP for Ryzen desktop parts, keyed on the model digits + suffix. */
const RYZEN_TDP: Record<string, number> = {
  "3600": 65, "3600X": 95, "5500": 65, "5600": 65, "5600X": 65, "5600G": 65,
  "5600GT": 65, "5700": 65, "5700X": 65, "5700G": 65, "5800X": 105,
  "5800X3D": 105, "5900X": 105, "5950X": 105, "7500F": 65, "7600": 65,
  "7600X": 105, "7700": 65, "7700X": 105, "7800X3D": 120, "7900": 65,
  "7900X": 170, "7950X": 170, "8400F": 65, "8500G": 65, "8600G": 65,
  "8700G": 65, "9600X": 65, "9700X": 65, "9800X3D": 120, "9900X": 120,
  "9950X": 170,
};

/**
 * Desktop CPU TDP. Intel by suffix (T = 35 W, K/KF = 125 W, KS = 150 W, plain
 * = 65 W; the 12th-14th-gen i3 "100" parts are 60 W); Ryzen by exact model.
 * Mobile suffixes (U/H/P/HX) and anything unrecognised return null. Uses the
 * manufacturer's TDP/base power, not peak turbo draw — the engine's 1.5x PSU
 * headroom covers the gap.
 */
function inferCpuTdp(name: string): InferredValue | null {
  const ultra = name.match(/ultra\s*[3579]\s*(\d{3})([A-Z]{0,2})\b/i);
  if (ultra) {
    const suffix = ultra[2]!.toUpperCase();
    if (/^(U|H|HX)$/.test(suffix)) return null;
    return {
      value: /K/.test(suffix) ? "125" : "65",
      source: "rule: Core Ultra desktop",
    };
  }
  const intel = name.match(/\bi([3579])[\s-]*(\d{4,5})([A-Z]{0,2})\b/i);
  if (intel) {
    const digits = intel[2]!;
    const suffix = intel[3]!.toUpperCase();
    if (/^(U|H|P|HX|HK|G\d?)$/.test(suffix)) return null;
    const gen = Number(digits.length === 5 ? digits.slice(0, 2) : digits[0]);
    if (suffix.includes("T")) return { value: "35", source: "rule: Intel T suffix" };
    if (suffix === "KS") return { value: "150", source: "rule: Intel KS suffix" };
    if (suffix.includes("K")) return { value: "125", source: "rule: Intel K suffix" };
    if (intel[1] === "3" && gen >= 12 && digits.endsWith("100")) {
      return { value: "60", source: "rule: Intel i3 12th-14th gen" };
    }
    return { value: "65", source: "rule: Intel non-K desktop" };
  }
  const ryzen = name.match(/ryzen\s*(?:ai\s*)?[3579]\s*-?\s*(\d{4})(X3D|GT|[XGF])?\b/i);
  if (ryzen) {
    const key = `${ryzen[1]}${(ryzen[2] ?? "").toUpperCase()}`;
    const tdp = RYZEN_TDP[key];
    if (tdp) return { value: String(tdp), source: `table: Ryzen ${key}` };
  }
  return null;
}

// ----------------------------------------------------------------- entry

export function inferBuilderAttrs(input: InferInput): InferResult {
  const values: InferResult["values"] = {};
  const conflicts: string[] = [];
  const overview = plainText(input.overview);
  const text = `${input.name} ${overview}`;

  switch (input.slot) {
    case "cpu": {
      const result = inferCpuSocket(input, text);
      if (result.value) values.socket = result.value;
      if (result.conflict) conflicts.push(result.conflict);
      const tdp = inferCpuTdp(input.name);
      if (tdp) values.tdpWatts = tdp;
      break;
    }
    case "cpu_cooler": {
      const sockets = inferCoolerSockets(input.name, overview);
      if (sockets) values.socket = { value: sockets, source: "name/overview socket list" };
      break;
    }
    case "motherboard": {
      const socket =
        input.attributes?.socket ?? explicitSocket(input.name) ?? null;
      if (socket) {
        values.socket = { value: socket.toUpperCase(), source: "attribute/name" };
      }
      const ram =
        input.attributes?.ramType ??
        ddrToken(input.name) ??
        (socket ? PLATFORM_RAM[socket.toUpperCase()] : undefined);
      if (ram) {
        values.ramType = {
          value: ram,
          source:
            input.attributes?.ramType || ddrToken(input.name)
              ? "attribute/name"
              : `platform (${socket} is ${ram}-only)`,
        };
      }
      if (input.attributes?.formFactor) {
        values.formFactor = {
          value: input.attributes.formFactor,
          source: "attribute",
        };
      }
      break;
    }
    case "ram": {
      const ddr = input.attributes?.ramType ?? ddrToken(text);
      if (ddr) {
        // Laptop SODIMM sticks don't fit desktop DIMM slots: tag them as
        // their own type so a desktop board never matches them.
        const sodimm = /so-?dimm|laptop|notebook/i.test(input.name);
        values.ramType = {
          value: sodimm ? `${ddr} SODIMM` : ddr,
          source: sodimm ? "name: SODIMM/laptop" : "attribute/name",
        };
      }
      break;
    }
    case "case": {
      const sizes = inferCaseSizes(input.name, overview);
      if (sizes) values.formFactor = sizes;
      break;
    }
    case "psu": {
      const watts = inferPsuWatts(input.name);
      if (watts) values.tdpWatts = watts;
      break;
    }
    case "gpu": {
      const power = inferGpuPower(input.name);
      if (power) values.tdpWatts = power;
      break;
    }
    case "ssd":
    case "hdd": {
      const drive = inferDriveInterface(input.slot, input.name);
      if (drive) values.storageInterface = drive;
      break;
    }
    default:
      break;
  }

  return { values, conflicts };
}
