/**
 * Product page: Specifications redesigned to match a reference screenshot —
 * a full-width tinted band per spec group (not a narrow rowspan column), a
 * "Specification" title above the table, zebra-striped rows, and the
 * Specifications/Details/Q&A/Review jump-nav restyled as rounded pills with
 * a red active tab (AD-376).
 *
 *   npm run test:product-specifications
 *
 * Source guards only — no database, no network. The real render (group
 * bands, striping, the "N more" expand/collapse still working, the red
 * active tab) was checked in headless Chrome when this was built (see
 * AD-376 in project-memory/TASKS.md).
 */
import { readFileSync } from "node:fs";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

/** Source text with Windows line endings normalised, so patterns can use a plain newline. */
function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

/**
 * `marker`'s own brace-balanced function BODY — see the AD-373 suite's copy
 * of this helper for why a loose `[\s\S]*?` regex is not used instead.
 */
function functionBody(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const parenStart = text.indexOf("(", start);
  if (parenStart < 0) {
    return "";
  }
  let parenDepth = 0;
  let parenEnd = -1;
  for (let index = parenStart; index < text.length; index += 1) {
    if (text[index] === "(") {
      parenDepth += 1;
    } else if (text[index] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        parenEnd = index;
        break;
      }
    }
  }
  if (parenEnd < 0) {
    return "";
  }
  const braceStart = text.indexOf("{", parenEnd);
  if (braceStart < 0) {
    return "";
  }
  let depth = 0;
  for (let index = braceStart; index < text.length; index += 1) {
    if (text[index] === "{") {
      depth += 1;
    } else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return text.slice(start);
}

function main(): void {
  const specs = source("features/product/product-specifications.tsx");
  const sections = source("features/product/product-detail-sections.tsx");

  // --- ProductSpecifications ----------------------------------------------------------------
  check(
    'a "Specification" title renders above the table, including on the empty-state path',
    (specs.match(/<h2 className="text-xl font-bold text-text">Specification<\/h2>/g) ?? [])
      .length === 2,
  );
  check(
    "each spec group gets a full-width tinted band (not a narrow rowspan column like before)",
    specs.includes(
      'className="bg-primary-soft px-4 py-2.5 text-label font-bold text-primary sm:px-5"',
    ) &&
      !specs.includes("rowSpan") &&
      !specs.includes("<table"),
  );
  check(
    "a group's header band only prints on that group's first row (flattenForDisplay), not every row",
    functionBody(specs, "function flattenForDisplay(").includes(
      "groupTitle: index === 0 ? group.title : null,",
    ),
  );
  check(
    "rows are zebra-striped by a plain running index, not a mutable counter inside the JSX map (the react-hooks rule this tripped once already)",
    specs.includes('index % 2 === 1 && "bg-surface-muted/50"') &&
      !/let\s+\w+\s*=\s*0;[\s\S]{0,400}\+\+;?\s*[\s\S]{0,50}return \(/.test(
        specs,
      ),
  );
  check(
    "truncatedGroups() caps the TOTAL row count across groups, same as the old flat-row cap did, not per-group",
    functionBody(specs, "function truncatedGroups(").includes(
      "remaining -= group.rows.length;",
    ) &&
      specs.includes("const totalRows = totalRowCount(nonEmptyGroups);") &&
      specs.includes(
        "const hiddenCount = Math.max(0, totalRows - INITIAL_VISIBLE_ROWS);",
      ),
  );
  check(
    'the "Show additional information (N more)" / "Show less" toggle still exists, unchanged behaviour',
    specs.includes("Show additional information (${hiddenCount} more)") &&
      specs.includes('"Show less"') &&
      specs.includes("setExpanded((value) => !value)"),
  );
  check(
    "the empty-state message is unchanged",
    specs.includes(
      "Specifications for {productName} are not listed yet.",
    ),
  );

  // --- ProductDetailSections jump-nav --------------------------------------------------------
  check(
    "the jump-nav tabs are rounded pills with a gap between them, not flush rectangles",
    sections.includes('<div className="flex flex-wrap gap-2" role="list">') &&
      sections.includes("rounded-sm border") &&
      !sections.includes("-ml-px"),
  );
  check(
    "the active tab is red (bg-danger), replacing the old black bg-text treatment",
    sections.includes('"border-danger bg-danger text-white"') &&
      !sections.includes('"relative z-[1] border-text bg-text text-primary-foreground"'),
  );
  check(
    "data-product-section ids and the IntersectionObserver jump-to wiring are untouched — only the button's own classes changed",
    sections.includes('data-product-section={section.id}') &&
      sections.includes("scrollIntoView({ behavior: \"smooth\", block: \"start\" })") &&
      sections.includes("new IntersectionObserver("),
  );

  console.log(
    failures === 0
      ? `\nproduct specifications ok — ${checks} checks passed`
      : `\nproduct specifications FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
