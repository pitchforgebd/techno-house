/**
 * Claim sourcing and description lint for the product SEO generator (SEO phase 8, v2.4). PURE, no lookbehind
 * (bundled into the admin form through lib/seo/product-seo.ts).
 *
 * A CLAIM is a statement about what a product has or is that a shopper would rely on: a microphone, "built-in",
 * ANC, wireless / wired, Bluetooth (and its version), the fit (over-ear / in-ear / on-ear / open-ear / earbuds /
 * neckband). A description may carry a claim only when it is BACKED by evidence:
 *   - the raw product name,
 *   - the category names, and
 *   - a stored spec ROW that says something (a row, not an attribute: the import script wrote attributes by
 *     guessing from the name, e.g. every "headset" got Microphone=Yes and Over-ear). A bare Yes / No row
 *     ("Microphone: Yes") adds nothing the guess did not, so it is not evidence either.
 * "No ANC" in a name is the opposite of evidence for ANC.
 *
 * This is a net under the fact filters in product-seo.ts: it does not care WHICH stored shape leaked a claim.
 */

/** A stored spec: attributes carry a `key`; spec rows / chips do not. */
export type ClaimFact = { key?: string; label: string; value: string };

type ClaimRule = { id: string; say: RegExp; backed: RegExp };

const RULES: ClaimRule[] = [
  { id: "microphone", say: /\bmic(?:rophone)?\b/i, backed: /\bmic(?:rophone)?\b/i },
  { id: "built-in", say: /\bbuilt[- ]?in\b/i, backed: /\bbuilt[- ]?in\b/i },
  { id: "ANC", say: /\banc\b|noise[- ]?cancel/i, backed: /\banc\b|noise[- ]?cancel/i },
  { id: "wireless", say: /\bwireless\b/i, backed: /\bwireless\b|\btws\b/i },
  { id: "wired", say: /\bwired\b/i, backed: /\bwired\b/i },
  { id: "bluetooth", say: /\bbluetooth\b/i, backed: /\bbluetooth\b|\bbt\s?\d/i },
  // "In-Earphone" / "On-Ear" / "Over-ear": the name's own word starts with the fit ("in earbuds" does not say in-ear).
  { id: "over-ear", say: /\bover[- ]ear\b/i, backed: /\bover[- ]?ear/i },
  { id: "on-ear", say: /\bon[- ]ear\b/i, backed: /\bon[- ]?ear(?!buds?\b)/i },
  { id: "in-ear", say: /\bin[- ]ear\b/i, backed: /\bin[- ]?ear(?!buds?\b)/i },
  { id: "open-ear", say: /\bopen[- ]ear\b/i, backed: /\bopen[- ]?ear/i },
  { id: "earbuds", say: /\bear ?buds?\b/i, backed: /\bear ?buds?\b/i },
  { id: "neckband", say: /\bneckband\b/i, backed: /\bneckband\b/i },
];

const BARE = /^(?:yes|no|true|false|y|n|supported|none|n\/a|-+)$/i;
const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Spec rows that are only a COPY of an attribute (v2.5 audit). The admin product editor shows a product's attribute
 * values as spec rows (lib/data/prisma/mappers.ts mergeSpecGroupsWithAttributes, via toProductDetail -> toEditor), and
 * the single-product form posts those groups back on EVERY save (admin-product-form.tsx -> syncSpecGroups). So any
 * admin save of a product whose attributes the import script guessed ("Type: Over-ear", "Microphone: Yes",
 * "Connectivity: Wireless") writes the guesses back as real, key-less spec rows: the same label, the same value.
 * A row identical to an attribute of the same product is that copy and is not evidence of anything; a row a human
 * changed (different value) is not a copy and stays.
 */
export function dropMirroredRows<T extends ClaimFact>(facts: T[]): T[] {
  const pair = (fact: ClaimFact) => `${squash(fact.label).toLowerCase()}\u0000${squash(fact.value).toLowerCase()}`;
  const attributePairs = new Set(facts.filter((fact) => fact.key).map(pair));
  return facts.filter((fact) => fact.key || !attributePairs.has(pair(fact)));
}

/**
 * The lower-case text a claim may be backed by. `rows` are the stored facts: those with a `key` (attributes) and
 * bare Yes / No values never count.
 */
export function claimEvidence(name: string, categoryChain: string[], rows: ClaimFact[]): string {
  const informative = rows
    .filter((row) => !row.key && !BARE.test(squash(row.value)))
    .map((row) => `${row.label} ${row.value}`);
  return squash([name, ...categoryChain, ...informative].join(" ").toLowerCase())
    // "No ANC", "without noise cancelling": the name denies it, which is not support
    .replace(/\b(?:no|without|non)[\s-]+(?:anc|noise[\s-]?cancel\w*)/g, " ");
}

/** The ids of the claims in `text` that `evidence` does not back (empty = every claim is backed). */
export function unsupportedClaims(text: string, evidence: string): string[] {
  const out: string[] = [];
  for (const rule of RULES) {
    if (rule.say.test(text) && !rule.backed.test(evidence)) out.push(rule.id);
  }
  // "Bluetooth 5.3": the version must be in the evidence too.
  const version = text.match(/\bbluetooth\s?v?(\d(?:\.\d)?)\b/i)?.[1];
  if (version && !new RegExp(`(?:^|[^\\d.])${version.replace(".", "\\.")}(?:[^\\d]|$)`).test(evidence) && !out.includes("bluetooth")) {
    out.push(`bluetooth ${version}`);
  }
  return out;
}

/**
 * Where each claim in `text` comes from, for the dry-run review ("microphone <- spec row 'Microphone: Built-in'"):
 * the raw name, a category name, an informative spec row, or "?" when nothing backs it.
 */
export function claimSources(text: string, name: string, categoryChain: string[], rows: ClaimFact[]): string[] {
  const out: string[] = [];
  const nameText = claimEvidence(name, [], []);
  const categoryText = claimEvidence("", categoryChain, []);
  const informative = rows.filter((row) => !row.key && !BARE.test(squash(row.value)));
  for (const rule of RULES) {
    if (!rule.say.test(text)) continue;
    if (rule.backed.test(nameText)) out.push(`${rule.id} <- name`);
    else if (rule.backed.test(categoryText)) out.push(`${rule.id} <- category`);
    else {
      const row = informative.find((candidate) => rule.backed.test(claimEvidence("", [], [candidate])));
      out.push(row ? `${rule.id} <- spec row "${squash(row.label)}: ${squash(row.value)}"` : `${rule.id} <- ?`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Description lint: phrases that read as machine output
// ---------------------------------------------------------------------------

/** "8GB size", "6.57 inches size": a measure followed by the word "size". */
const MEASURE_SIZE = /\b\d+(?:\.\d+)?\s?(?:gb|tb|mb|inch(?:es)?|mm|cm|w|hz)\s+size\b/gi;
/** "6.57 inch, 6.57 inches": one quantity said twice in a row. */
const SAME_QTY_TWICE = /\b(\d+(?:\.\d+)?)\s?inch(?:es)?\b[^.]{0,30}?\b\1\s?inch(?:es)?\b/i;
const QTY_UNIT = /(\d)\s+(tb|gb|mb|ghz|mhz|hz|w|v|mm|cm|mp|mbps|gbps|ppm|dpi|va|mah|ah)\b/gi;

const quantityTokens = (phrase: string) =>
  phrase
    .toLowerCase()
    .replace(/(\d)\s*(?:inches|inch|in\b|["”″])/g, "$1inch")
    .replace(QTY_UNIT, "$1$2")
    .match(/\d+(?:\.\d+)?[a-z]+/g) ?? [];

/**
 * Machine-looking spec wording in a description: "<n>GB size", "<n> inches size", "<n> inch, <n> inches", or the same
 * quantity in two different spec phrases. Returns what was found (empty = clean).
 */
export function findBadSpecPhrases(text: string, phrases: string[]): string[] {
  const found: string[] = [];
  // A spec phrase that is only a number ("3.5") says nothing: it needs its unit or its noun ("3.5-inch").
  for (const phrase of phrases) if (/^\d+(?:\.\d+)?$/.test(squash(phrase))) found.push(`bare number "${squash(phrase)}"`);
  for (const m of text.matchAll(MEASURE_SIZE)) found.push(m[0]);
  const twice = text.match(SAME_QTY_TWICE);
  if (twice) found.push(twice[0]);
  const seen = new Map<string, number>();
  phrases.forEach((phrase, index) => {
    for (const token of new Set(quantityTokens(phrase))) {
      const first = seen.get(token);
      if (first === undefined) seen.set(token, index);
      else if (first !== index) found.push(`${token} twice`);
    }
  });
  return [...new Set(found)];
}
