/**
 * Pure logic behind `npm run catalog:find-duplicates` — no database, no I/O, so
 * `scripts/deploy/check-duplicate-listings.ts` can test it directly.
 *
 * Two layers:
 *   1. grouping — listings of the same brand and category whose normalised
 *      names are equal, one sits inside the other (a long title for the same
 *      board, or a VARIANT of it), or they reduce to the same model words once
 *      filler and memory type are dropped;
 *   2. a proposal worksheet — inside a group, listings whose names match after
 *      dropping spec filler ("AMD SOCKET AM5 DIMM ATX MOTHERBOARD") are TWINS and
 *      get a suggested KEEP / DEACTIVATE; listings that differ by any other
 *      word (WIFI, PZ, II, AX, WHITE, D4 …) are VARIANTS and are left alone.
 *
 * Leaning towards LEAVE is deliberate: wrongly hiding a different board costs a
 * sale until someone notices, while a missed duplicate costs nothing. The
 * proposal is a worksheet for a person, never an instruction — nothing here
 * changes data.
 */
import { parseAttrList } from "../../lib/domain/pc-builder/attr-values";

export type DuplicateItem = {
  id: string;
  sku: string;
  name: string;
  isActive: boolean;
  priceAmount: number;
  createdAt: Date;
  /** Normalised name (see `normalise`). */
  key: string;
  stock: number;
  /** `Product.builderRamType` ("DDR5", "DDR4, DDR5") — more reliable than the title when staff or the backfill set it. */
  ramType?: string | null;
};

export type Confidence = "likely" | "review" | "variant";
export type ProposalAction =
  | "KEEP"
  | "DEACTIVATE"
  | "ALREADY-OFF"
  | "REVIEW"
  | "LEAVE";

export type ProposalRow = {
  item: DuplicateItem;
  confidence: Confidence;
  action: ProposalAction;
  /** Words this listing adds to the group's shortest name, e.g. "WIFI6E". Plain words: a leading + would be defused as a spreadsheet formula. */
  adds: string;
  note: string;
};

/** Stock at or above this is shown as "verify": a POS export can carry a placeholder. */
export const SUSPICIOUS_STOCK = 500;

const NOISE = new Set([
  "PROMOTIONAL",
  "MARKETING",
  "GIFT",
  "SAMPLE",
  "WARRANTY",
  "YEAR",
  "YEARS",
  "YR",
]);

/**
 * Words a long marketing title adds without changing which board it is. Kept to
 * words that never separate two models; anything that can (WIFI, DDR4 vs DDR5,
 * D4, AX, PZ …) is deliberately absent.
 */
const FILLER_WORDS = new Set([
  "AMD",
  "INTEL",
  "SOCKET",
  "SOCKETS",
  "DIMM",
  "DIMMS",
  "MOTHERBOARD",
  "MAINBOARD",
  "ATX",
  "MATX",
  "EATX",
  "ITX",
  "MICRO",
  "MINI",
  "GEN",
  "GENERATION",
  "SUPPORT",
  "SUPPORTS",
  "PROCESSOR",
  "PROCESSORS",
  "CPU",
  "CPUS",
  "LGA",
]);

const FILLER_PATTERNS = [/^LGA\d{3,4}$/, /^AM[45]$/, /^\d{1,2}(ST|ND|RD|TH)$/];

const DDR_PATTERN = /^DDR[2-5]$/;

export function normalise(name: string, brandName: string): string {
  const brandTokens = new Set(
    brandName.toUpperCase().replace(/[^A-Z0-9]+/g, " ").split(" ").filter(Boolean),
  );
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !brandTokens.has(token) && !NOISE.has(token))
    .join(" ");
}

/** True when the shorter key is a real model string (not a stray word) found inside the longer. */
export function contained(shorter: string, longer: string): boolean {
  return (
    shorter.length >= 8 &&
    shorter.split(" ").length >= 2 &&
    /[0-9]/.test(shorter) &&
    ` ${longer} `.includes(` ${shorter} `)
  );
}

/**
 * True when two names reduce to the same model words once filler and memory
 * type are dropped — catches "B650M GAMING X DDR5" next to "B650M GAMING X AM5
 * DDR5 MOTHERBOARD", where filler sits in the middle so neither name contains
 * the other. The core must look like a model (has a digit, not a stray word).
 */
function sameCore(x: string, y: string): boolean {
  const core = coreKey(x);
  return core.length >= 5 && /[0-9]/.test(core) && core === coreKey(y);
}

export function groupItems(items: DuplicateItem[]): DuplicateItem[][] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  for (let a = 0; a < items.length; a += 1) {
    for (let b = a + 1; b < items.length; b += 1) {
      const x = items[a]!.key;
      const y = items[b]!.key;
      if (!x || !y) continue;
      const same =
        x === y ||
        (x.length <= y.length ? contained(x, y) : contained(y, x)) ||
        sameCore(x, y);
      if (same) parent[find(a)] = find(b);
    }
  }
  const groups = new Map<number, DuplicateItem[]>();
  items.forEach((item, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}

function tokensOf(key: string): string[] {
  // "LGA 1700" and "LGA1700" are the same words.
  return key
    .replace(/\bLGA (\d{3,4})\b/g, "LGA$1")
    .split(" ")
    .filter(Boolean);
}

function isFiller(token: string): boolean {
  return FILLER_WORDS.has(token) || FILLER_PATTERNS.some((p) => p.test(token));
}

/** The words that decide which board it is: no filler, no memory generation. */
export function coreKey(key: string): string {
  return tokensOf(key)
    .filter((token) => !isFiller(token) && !DDR_PATTERN.test(token))
    .join(" ");
}

/** The memory generations a title names, sorted ("DDR4", "DDR4 DDR5", or ""). */
function ddrOf(key: string): string {
  return [...new Set(tokensOf(key).filter((token) => DDR_PATTERN.test(token)))]
    .sort()
    .join(" ");
}

/** The words `item` adds to the group's shortest name (empty for the shortest itself). */
export function addedTokens(item: DuplicateItem, group: DuplicateItem[]): string[] {
  const base = [...group].sort((a, b) => a.key.length - b.key.length)[0]!;
  if (item === base) return [];
  const baseTokens = new Set(base.key.split(" "));
  return item.key.split(" ").filter((token) => !baseTokens.has(token));
}

/** Console form: "+WIFI6E +DDR5" (first eight words). */
export function formatAddsForConsole(tokens: string[]): string {
  if (tokens.length === 0) return "(same words, different order)";
  return `+${tokens.slice(0, 8).join(" +")}${tokens.length > 8 ? " …" : ""}`;
}

/** Worksheet form: plain words, no leading + (see `ProposalRow.adds`). */
function addsForWorksheet(item: DuplicateItem, group: DuplicateItem[]): string {
  const base = [...group].sort((a, b) => a.key.length - b.key.length)[0]!;
  if (item === base) return "";
  const tokens = addedTokens(item, group);
  if (tokens.length === 0) return "(same words, different order)";
  return `${tokens.slice(0, 8).join(" ")}${tokens.length > 8 ? " …" : ""}`;
}

/**
 * The memory generations a listing supports, sorted ("DDR4", "DDR4 DDR5", or
 * ""): its `builderRamType` tag when it has one, otherwise what its title names.
 */
function memoryOf(item: DuplicateItem): string {
  const tagged = parseAttrList(item.ramType ?? "")
    .map((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
  if (tagged.length > 0) return [...new Set(tagged)].sort().join(" ");
  return ddrOf(item.key);
}

/** Which twin to keep: active, then priced, then in stock, then the oldest. */
function keepOrder(a: DuplicateItem, b: DuplicateItem): number {
  return (
    Number(b.isActive) - Number(a.isActive) ||
    Number(b.priceAmount > 0) - Number(a.priceAmount > 0) ||
    Number(b.stock > 0) - Number(a.stock > 0) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.sku.localeCompare(b.sku)
  );
}

function rowNotes(item: DuplicateItem, twins: DuplicateItem[]): string[] {
  const notes: string[] = [];
  if (item.priceAmount <= 0) notes.push("price is 0");
  if (item.stock >= SUSPICIOUS_STOCK) {
    notes.push(`stock ${item.stock} is unusually high — verify`);
  }
  const stocks = [...new Set(twins.map((t) => t.stock))];
  if (stocks.length > 1) notes.push(`stock differs across twins: confirm the real count`);
  const prices = [...new Set(twins.map((t) => t.priceAmount))];
  if (prices.length > 1) notes.push(`price differs across twins`);
  return notes;
}

/**
 * Turn one group (from `groupItems`) into worksheet rows: twins get a suggested
 * KEEP/DEACTIVATE, everything else is LEAVE or REVIEW.
 */
export function proposeGroup(group: DuplicateItem[]): ProposalRow[] {
  const byCore = new Map<string, DuplicateItem[]>();
  for (const item of group) {
    const core = coreKey(item.key) || `#${item.id}`;
    byCore.set(core, [...(byCore.get(core) ?? []), item]);
  }

  const rows: ProposalRow[] = [];
  for (const twins of byCore.values()) {
    if (twins.length === 1) {
      const item = twins[0]!;
      rows.push({
        item,
        confidence: "variant",
        action: "LEAVE",
        adds: addsForWorksheet(item, group),
        note: "no twin: a different variant, or the only listing of this board",
      });
      continue;
    }

    const memory = twins.map(memoryOf);
    const named = new Set(memory.filter(Boolean));
    if (named.size > 1) {
      for (const item of twins) {
        rows.push({
          item,
          confidence: "review",
          action: "REVIEW",
          adds: addsForWorksheet(item, group),
          note: `same model text but different memory (${[...named].join(" / ")}): probably different boards`,
        });
      }
      continue;
    }

    const ranked = [...twins].sort(keepOrder);
    const keep = ranked[0]!;

    // Memory named on every twin (or tagged) and equal: same board. If some
    // twin gives no memory type, "X" and "X DDR4" may be the DDR5 and DDR4 boards
    // — never suggest switching one off then, only say which one to keep if they
    // turn out to be the same.
    if (new Set(memory).size !== 1) {
      for (const item of ranked) {
        const notes = rowNotes(item, twins);
        notes.push(
          `memory type is missing on some twins: check they are the same board; if so keep ${keep.sku}`,
        );
        rows.push({
          item,
          confidence: "review",
          action: "REVIEW",
          adds: addsForWorksheet(item, group),
          note: notes.join("; "),
        });
      }
      continue;
    }

    for (const item of ranked) {
      const notes = rowNotes(item, twins);
      if (!keep.isActive) notes.push("every twin is already inactive");
      rows.push({
        item,
        confidence: "likely",
        action:
          item === keep ? "KEEP" : item.isActive ? "DEACTIVATE" : "ALREADY-OFF",
        adds: addsForWorksheet(item, group),
        note: notes.join("; "),
      });
    }
  }
  return rows;
}

export const CSV_HEADER = [
  "group",
  "category",
  "confidence",
  "action",
  "sku",
  "name",
  "active",
  "price_bdt",
  "stock",
  "created",
  "adds",
  "note",
  "your_decision",
] as const;

/** One CSV cell: quoted when needed, and a leading = + - @ is defused so a spreadsheet never runs it as a formula. */
export function csvCell(value: string | number | boolean): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export type WorksheetRow = ProposalRow & { group: number; category: string };

export function buildWorksheetCsv(rows: WorksheetRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.group,
        row.category,
        row.confidence,
        row.action,
        row.item.sku,
        row.item.name,
        row.item.isActive ? "yes" : "no",
        row.item.priceAmount,
        row.item.stock,
        row.item.createdAt.toISOString().slice(0, 10),
        row.adds,
        row.note,
        "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM so a spreadsheet opens it as UTF-8.
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function summariseWorksheet(rows: WorksheetRow[]): {
  groups: number;
  twinSets: number;
  review: number;
  deactivate: number;
  alreadyOff: number;
  leave: number;
} {
  const count = (action: ProposalAction) =>
    rows.filter((row) => row.action === action).length;
  const keeps = rows.filter((row) => row.action === "KEEP");
  return {
    groups: new Set(rows.map((row) => row.group)).size,
    twinSets: keeps.length,
    review: count("REVIEW"),
    deactivate: count("DEACTIVATE"),
    alreadyOff: count("ALREADY-OFF"),
    leave: count("LEAVE"),
  };
}
