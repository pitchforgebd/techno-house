/**
 * Homepage product sections suite (AD-357).
 *
 *   npm run test:home-sections
 *
 * Pure rules (validation, ordering) plus source-level guards for the parts a
 * unit test cannot reach without a database: the server actions must check
 * same-origin and the Design Studio permission before writing, the storefront
 * read must never break the homepage, and the homepage sections must actually
 * use the chosen list. No database, no network.
 */
import { readFileSync } from "node:fs";
import {
  HOME_SECTION_IDS,
  HOME_SECTION_MAX,
  isHomeSectionId,
  moveInList,
  parseHomeSectionProductIds,
} from "@/lib/marketing/home-section-input";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const ids = (count: number) =>
  Array.from({ length: count }, (_, i) => `product-${i + 1}`);

function main(): void {
  // --- validation -----------------------------------------------------------
  const ok = parseHomeSectionProductIds(["a", "b", "c"]);
  check("a plain list is accepted in order", ok.ok && ok.ids.join() === "a,b,c");

  const messy = parseHomeSectionProductIds([" a ", "", "b", "a", "  ", "c", "b"]);
  check(
    "blanks are dropped and a duplicate keeps its FIRST position",
    messy.ok && messy.ids.join() === "a,b,c",
  );

  const empty = parseHomeSectionProductIds([]);
  check("an empty list is valid (it clears the section)", empty.ok && empty.ids.length === 0);

  check(
    "exactly the maximum is accepted",
    parseHomeSectionProductIds(ids(HOME_SECTION_MAX)).ok === true,
  );
  const over = parseHomeSectionProductIds(ids(HOME_SECTION_MAX + 1));
  check(
    "one more than the maximum is an ERROR, never a silent cut",
    !over.ok && over.formError.includes(String(HOME_SECTION_MAX)),
  );
  check(
    "duplicates do not count towards the maximum",
    parseHomeSectionProductIds([...ids(HOME_SECTION_MAX), "product-1", "product-2"]).ok === true,
  );
  check(
    "the maximum is ten",
    HOME_SECTION_MAX === 10,
  );

  check("a non-list is rejected", !parseHomeSectionProductIds("a,b").ok && !parseHomeSectionProductIds(null).ok);
  check(
    "a non-text entry is rejected",
    !parseHomeSectionProductIds(["a", 5]).ok && !parseHomeSectionProductIds([{ id: "a" }]).ok,
  );
  check(
    "an absurdly long id is rejected",
    !parseHomeSectionProductIds(["x".repeat(101)]).ok,
  );

  check(
    "only the two real sections are valid",
    HOME_SECTION_IDS.length === 2 &&
      isHomeSectionId("featured") &&
      isHomeSectionId("deals") &&
      !isHomeSectionId("FEATURED") &&
      !isHomeSectionId("everything") &&
      !isHomeSectionId(undefined),
  );

  // --- ordering ---------------------------------------------------------------
  const list = ["a", "b", "c", "d"];
  check("move down swaps with the next", moveInList(list, 1, "down").join() === "a,c,b,d");
  check("move up swaps with the previous", moveInList(list, 2, "up").join() === "a,c,b,d");
  check(
    "moving the first up or the last down changes nothing",
    moveInList(list, 0, "up").join() === "a,b,c,d" &&
      moveInList(list, 3, "down").join() === "a,b,c,d",
  );
  check(
    "an out-of-range index changes nothing",
    moveInList(list, -1, "down").join() === "a,b,c,d" &&
      moveInList(list, 9, "up").join() === "a,b,c,d",
  );
  check("moving never mutates the original list", (() => {
    const original = ["a", "b", "c"];
    moveInList(original, 0, "down");
    return original.join() === "a,b,c";
  })());

  // --- server actions: who may write, from where ---------------------------------
  const actions = source("features/admin/design-studio/home-section-actions.ts");
  const saveAction = actions.slice(
    actions.indexOf("export async function saveHomeSectionAction"),
    actions.indexOf("export async function searchHomeSectionProductsAction"),
  );
  const searchAction = actions.slice(
    actions.indexOf("export async function searchHomeSectionProductsAction"),
  );
  check(
    "saving checks same-origin, then the Design Studio permission, before touching data",
    saveAction.indexOf("isSameOriginRequest") > -1 &&
      saveAction.indexOf("design_studio.manage") > saveAction.indexOf("isSameOriginRequest") &&
      saveAction.indexOf("saveHomeSection(") > saveAction.indexOf("design_studio.manage"),
  );
  check(
    "searching also needs same-origin and the manage permission",
    searchAction.indexOf("isSameOriginRequest") > -1 &&
      searchAction.indexOf("design_studio.manage") > -1 &&
      searchAction.indexOf("searchHomeSectionCandidates(") > searchAction.indexOf("design_studio.manage"),
  );
  check(
    "saving refreshes the homepage so the change shows at once",
    saveAction.includes('revalidatePath("/")'),
  );

  // --- server module: the storefront read must be safe ---------------------------
  const lib = source("lib/marketing/home-sections.ts");
  const slugsFn = lib.slice(
    lib.indexOf("export async function getHomeSectionSlugs"),
    lib.indexOf("export async function getAdminHomeSection"),
  );
  check(
    "the storefront read never throws (a missing table must not take the homepage down)",
    slugsFn.includes("try {") && slugsFn.includes("catch") && slugsFn.includes("return []"),
  );
  check(
    "the storefront read lists published products only, in saved order, capped",
    slugsFn.includes("isActive: true") &&
      slugsFn.includes('orderBy: [{ position: "asc" }') &&
      slugsFn.includes("take: HOME_SECTION_MAX"),
  );
  const saveFn = lib.slice(lib.indexOf("export async function saveHomeSection"));
  check(
    "saving replaces the section in one transaction and records who did it",
    saveFn.includes("$transaction") &&
      saveFn.includes("deleteMany") &&
      saveFn.includes("createMany") &&
      saveFn.includes("writeAuditLog"),
  );
  check(
    "saving validates ids and the section before writing",
    saveFn.indexOf("isHomeSectionId") > -1 &&
      saveFn.indexOf("parseHomeSectionProductIds") > -1 &&
      saveFn.indexOf("$transaction") > saveFn.indexOf("parseHomeSectionProductIds"),
  );

  // --- homepage: really uses the chosen list, falls back to the automatic one -----
  const featured = source("features/home/home-featured.tsx");
  const deals = source("features/home/home-deals.tsx");
  check(
    "the Featured section reads the chosen list",
    featured.includes('loadHomeSectionProducts("featured"'),
  );
  check(
    "the Best deals section reads the chosen list",
    deals.includes('loadHomeSectionProducts("deals"'),
  );
  check(
    "each section keeps its automatic list as the fallback",
    featured.includes('sort: "featured"') &&
      deals.includes("onSaleOnly: true") &&
      deals.includes('sort: "discount"'),
  );
  const loader = source("features/home/load-home-section.ts");
  check(
    "the loader falls back when nothing chosen is still published",
    loader.includes("slugs.length > 0") &&
      loader.includes("chosen.length > 0") &&
      loader.includes("return automatic()"),
  );

  // --- the Deals page is paged, so it is not cut at one page ---------------------
  const dealsPage = source("app/(storefront)/deals/page.tsx");
  check(
    "the Deals page paginates instead of stopping at one page",
    dealsPage.includes("Pagination") &&
      dealsPage.includes("searchParams") &&
      dealsPage.includes("result.total"),
  );

  console.log(
    failures === 0
      ? `\nhome sections ok — ${checks} checks passed`
      : `\nhome sections FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
