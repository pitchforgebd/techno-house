/**
 * Reads the eight trust pages out of docs/SITE-PAGES-CONTENT.md and turns each
 * into the HTML body the storefront renders (SEO phase 6). Shared by the seed
 * script (scripts/seed-trust-pages.mjs, which writes them to ContentPage) and
 * the checker (scripts/seo/check-phase6.ts, which compares the live pages with
 * the same file), so both read the file the same way.
 *
 * The content file is the source of truth for wording. This module never
 * changes a word: it only (1) swaps the policy values listed in
 * lib/site/policies.ts for `{{tokens}}`, so the numbers live in one place, and
 * (2) converts the small Markdown subset the file uses to HTML.
 *
 * Markdown subset: `## ` page heading (the H1, stored as the page title),
 * `### ` section (h2), `- ` and `1. ` lists, `|` tables, `**bold**`,
 * `[text](/path)` links, `[Open in Google Maps]` (the store's map link) and,
 * on the FAQ, `**Question?**` lines followed by the answer (h3 + p).
 */
import { POLICIES, POLICY_TOKENS, workingDayRange } from "@/lib/site/policies";

export const TRUST_PAGE_SLUGS = [
  "about",
  "contact",
  "shipping",
  "returns",
  "warranty",
  "terms",
  "privacy",
  "faq",
] as const;
export type TrustPageSlug = (typeof TRUST_PAGE_SLUGS)[number];

export type TrustPageSource = {
  slug: TrustPageSlug;
  metaTitle: string;
  metaDescription: string;
  /** The `## ` heading: the page's H1. */
  title: string;
  /** Markdown under the H1, exactly as written in the content file. */
  markdown: string;
};

/** The FAQ's note to the developer; not page text. */
const INSTRUCTION_LINE = /^\(Render each Q\/A below.*\)$/;

/** Split the content file into its eight pages. Throws if one is missing or malformed. */
export function parseTrustPages(file: string): TrustPageSource[] {
  const text = file.replace(/\r\n/g, "\n");
  const chunks = text.split(/^# PAGE \d+ — .*$/m).slice(1);
  const pages = chunks.map((chunk): TrustPageSource => {
    const body = chunk.split(/^---\s*$/m)[0] ?? "";
    const route = body.match(/^Route: `\/([a-z-]+)`\s*$/m)?.[1];
    const metaTitle = body.match(/^Meta title: (.+)$/m)?.[1]?.trim();
    const metaDescription = body.match(/^Meta description: (.+)$/m)?.[1]?.trim();
    const heading = body.match(/^## (.+)$/m);
    const title = heading?.[1]?.trim();
    if (!route || !metaTitle || !metaDescription || !heading || !title || heading.index == null) {
      throw new Error(`Malformed page block in the content file (route: ${route ?? "?"}).`);
    }
    if (!(TRUST_PAGE_SLUGS as readonly string[]).includes(route)) {
      throw new Error(`Unexpected route /${route} in the content file.`);
    }
    return {
      slug: route as TrustPageSlug,
      metaTitle,
      metaDescription,
      title,
      markdown: body.slice(heading.index + heading[0].length).trim(),
    };
  });
  for (const slug of TRUST_PAGE_SLUGS) {
    if (pages.filter((page) => page.slug === slug).length !== 1) {
      throw new Error(`The content file must have exactly one /${slug} page.`);
    }
  }
  return pages;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every literal → token swap, longest literal first so "01611-305338, …"
 * becomes `{{phonesSales}}` before "01611-305338" alone is looked at.
 * Numbers are only swapped together with their unit ("24 hours",
 * "3 days", "7 working days", "1–3 working days"), never a bare digit.
 */
function tokenRules(): { pattern: RegExp; replacement: string }[] {
  const literal = Object.entries(POLICY_TOKENS)
    .filter(([, value]) => !/^[\d–]+$/.test(value))
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([name, value]) => ({
      pattern: new RegExp(escapeRegExp(value), "g"),
      replacement: `{{${name}}}`,
    }));
  const withUnit = (name: string, value: string, unit: string) => ({
    pattern: new RegExp(`(?<![\\d–])${escapeRegExp(value)} ${unit}\\b`, "g"),
    replacement: `{{${name}}} ${unit}`,
  });
  return [
    ...literal,
    withUnit("reportWrongOrDamagedHours", String(POLICIES.reportWrongOrDamagedHours), "hours"),
    withUnit("reportDeadOnArrivalDays", String(POLICIES.reportDeadOnArrivalDays), "days"),
    withUnit("refundWorkingDays", String(POLICIES.refundWorkingDays), "working days"),
    withUnit("dhakaDeliveryWorkingDays", workingDayRange(POLICIES.dhakaDeliveryWorkingDays), "working days"),
    withUnit("outsideDhakaDeliveryWorkingDays", workingDayRange(POLICIES.outsideDhakaDeliveryWorkingDays), "working days"),
    withUnit("dispatchAfterConfirmationWorkingDays", workingDayRange(POLICIES.dispatchAfterConfirmationWorkingDays), "working days"),
  ];
}

/** Swap every policy value in `text` for its `{{token}}`. */
export function tokenizePolicyValues(text: string): string {
  return tokenRules().reduce(
    (out, rule) => out.replace(rule.pattern, rule.replacement),
    text,
  );
}

/**
 * Policy-looking values still written out after tokenizing: a phone number,
 * a store email, the shop's street number or postcode, a day/hour count, a
 * working-day range or a clock time. Any hit means the content file and
 * policies.ts disagree (the seed refuses to write until they match).
 */
const LEFTOVER_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "phone number", pattern: /0\d{4}-\d{6}/ },
  { label: "email address", pattern: /[\w.+-]+@technohouse\.com\.bd/i },
  { label: "street number", pattern: /\b85(?:\/1)?,? (?:2nd Floor, )?Laboratory/ },
  { label: "postcode", pattern: /Dhaka-\d{4}/ },
  { label: "day count", pattern: /\b\d+\s*(?:working\s+)?days?\b/i },
  { label: "hour count", pattern: /\b\d+\s*hours?\b/i },
  { label: "number range", pattern: /\d\s*–\s*\d/ },
  { label: "clock time", pattern: /\b\d{1,2}:\d{2}\s*[AP]M\b/ },
];

export function untokenizedValues(text: string): string[] {
  return LEFTOVER_PATTERNS.flatMap(({ label, pattern }) => {
    const hit = text.match(pattern);
    return hit ? [`${label}: "${hit[0]}"`] : [];
  });
}

/** Tokens a body may use: the policy values plus the map link (supplied at render). */
export const RENDER_TOKENS = ["googleMapsUrl"] as const;

export function unknownTokens(text: string): string[] {
  const known = new Set([...Object.keys(POLICY_TOKENS), ...RENDER_TOKENS]);
  return [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)]
    .map((match) => match[1] ?? "")
    .filter((name) => !known.has(name));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bold, links and the map link, on already-escaped text. */
function inline(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
    .replace(/\[Open in Google Maps\](?!\()/g, '<a href="{{googleMapsUrl}}">Open in Google Maps</a>');
}

function tableHtml(lines: string[]): string {
  const cells = (line: string) =>
    line.replace(/^\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());
  const rows = lines.filter((line) => !/^\|[\s|:-]+\|?\s*$/.test(line));
  const [head = "", ...body] = rows;
  return [
    "<table>",
    `<thead><tr>${cells(head).map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>`,
    `<tbody>${body
      .map((row) => `<tr>${cells(row).map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`,
    "</table>",
  ].join("");
}

/** Markdown (the subset described above) → HTML. Headings shift down one level: `###` → h2. */
export function trustMarkdownToHtml(markdown: string, options: { faq: boolean }): string {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trimEnd()).filter(Boolean))
    .filter((lines) => lines.length > 0);
  const html: string[] = [];
  for (const lines of blocks) {
    const first = lines[0] ?? "";
    if (lines.length === 1 && INSTRUCTION_LINE.test(first)) {
      continue;
    }
    if (lines.length === 1 && first.startsWith("### ")) {
      html.push(`<h2>${inline(first.slice(4).trim())}</h2>`);
      continue;
    }
    if (lines.every((line) => line.startsWith("|"))) {
      html.push(tableHtml(lines));
      continue;
    }
    if (lines.every((line) => line.startsWith("- "))) {
      html.push(`<ul>${lines.map((line) => `<li>${inline(line.slice(2).trim())}</li>`).join("")}</ul>`);
      continue;
    }
    if (lines.every((line) => /^\d+\. /.test(line))) {
      html.push(`<ol>${lines.map((line) => `<li>${inline(line.replace(/^\d+\. /, "").trim())}</li>`).join("")}</ol>`);
      continue;
    }
    const question = first.match(/^\*\*(.+)\*\*$/);
    if (options.faq && question?.[1] && lines.length > 1) {
      html.push(`<h3>${inline(question[1].trim())}</h3>`);
      html.push(`<p>${lines.slice(1).map(inline).join("<br>")}</p>`);
      continue;
    }
    if (lines.some((line) => /^#{1,6} /.test(line))) {
      throw new Error(`Unexpected heading inside a paragraph: "${first}"`);
    }
    html.push(`<p>${lines.map(inline).join("<br>")}</p>`);
  }
  return html.join("\n");
}

export type TrustPageRecord = {
  slug: TrustPageSlug;
  title: string;
  /** HTML with `{{tokens}}` — what goes in ContentPage.body. */
  body: string;
  metaTitle: string;
  /** With `{{tokens}}` too; filled when the page's metadata is built. */
  metaDescription: string;
};

/**
 * The record for one page, tokenized. Throws when a policy value is still
 * written out (content file and policies.ts disagree) or a token is unknown.
 */
export function buildTrustPageRecord(page: TrustPageSource): TrustPageRecord {
  const markdown = tokenizePolicyValues(page.markdown);
  const metaDescription = tokenizePolicyValues(page.metaDescription);
  const record: TrustPageRecord = {
    slug: page.slug,
    title: page.title,
    body: trustMarkdownToHtml(markdown, { faq: page.slug === "faq" }),
    metaTitle: page.metaTitle,
    metaDescription,
  };
  const problems = [
    ...[record.title, record.metaTitle, metaDescription, markdown].flatMap(untokenizedValues),
    ...unknownTokens(`${record.body} ${metaDescription}`).map((name) => `unknown token {{${name}}}`),
  ];
  if (problems.length > 0) {
    throw new Error(
      `/${page.slug}: ${problems.join("; ")}. The content file and lib/site/policies.ts disagree; fix one of them.`,
    );
  }
  return record;
}
