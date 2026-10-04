/**
 * Suite for the duplicate-listing worksheet logic.
 *
 *   npm run test:duplicates
 *
 * Pure — no database, no files. Names below mirror the shapes seen in the live
 * catalogue (a short hand-made title next to a long POS title for the same
 * Gigabyte board, and MSI/Gigabyte variants that must never be merged).
 */
import {
  addedTokens,
  buildWorksheetCsv,
  coreKey,
  csvCell,
  formatAddsForConsole,
  groupItems,
  normalise,
  proposeGroup,
  summariseWorksheet,
  type DuplicateItem,
  type ProposalRow,
  type WorksheetRow,
} from "./duplicate-listings";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

let seq = 0;
function item(
  sku: string,
  name: string,
  over: Partial<Omit<DuplicateItem, "key">> = {},
  brand = "Gigabyte",
): DuplicateItem {
  seq += 1;
  return {
    id: `id-${seq}`,
    sku,
    name,
    isActive: true,
    priceAmount: 10000,
    createdAt: new Date(Date.UTC(2026, 8, 17 + seq)),
    stock: 0,
    key: normalise(name, brand),
    ...over,
  };
}

function actionOf(rows: ProposalRow[], sku: string): string | undefined {
  return rows.find((row) => row.item.sku === sku)?.action;
}

function propose(items: DuplicateItem[]): ProposalRow[] {
  return groupItems(items).flatMap((group) => proposeGroup(group));
}

function main(): void {
  // --- normalising and filler --------------------------------------------
  check(
    "brand name and noise words are dropped when normalising",
    normalise("GIGABYTE X870E AORUS MASTER - 3 Years Warranty", "Gigabyte") ===
      "X870E AORUS MASTER 3",
  );
  check(
    "spec filler is not part of the core key",
    coreKey("X870E AORUS MASTER AMD SOCKET AM5 DIMM ATX MOTHERBOARD") ===
      "X870E AORUS MASTER",
  );
  check(
    "LGA 1700 and LGA1700 are both filler",
    coreKey("H610M H LGA 1700 MICRO ATX") === "H610M H" &&
      coreKey("H610M H LGA1700") === "H610M H",
  );
  check(
    "'12th 13th 14th gen' is filler",
    coreKey("B760M DS3H 12TH 13TH 14TH GEN SUPPORT") === "B760M DS3H",
  );
  check(
    "WIFI, AX, WF6E and D4 are NOT filler: they name different boards",
    coreKey("B650M D3HP AX") !== coreKey("B650M D3HP") &&
      coreKey("A520M DS3H WF6E") !== coreKey("A520M DS3H") &&
      coreKey("B760M DS3H D4") !== coreKey("B760M DS3H") &&
      coreKey("Z890 P WIFI") !== coreKey("Z890 P"),
  );
  check(
    "filler in the MIDDLE of a title still groups the twins (neither name contains the other)",
    groupItems([
      item("GB-P", "Gigabyte B650M GAMING X DDR5"),
      item("GIG-P", "GIGABYTE B650M GAMING X AM5 DDR5 MOTHERBOARD"),
    ]).length === 1,
  );
  check(
    "two different boards never group on a one-word or digit-less core",
    groupItems([
      item("A", "Gigabyte AORUS PRO"),
      item("B", "Gigabyte AORUS PRO ATX"),
    ]).length === 0 &&
      groupItems([
        item("C", "Gigabyte B650M K"),
        item("D", "Gigabyte B650M GAMING X"),
      ]).length === 0,
  );

  // --- a GB- / GIG- twin whose memory type is tagged on both ------------------
  const gb = item(
    "GB-X870E-AORUS-MASTER",
    "Gigabyte X870E AORUS MASTER",
    { priceAmount: 74500, stock: 5, ramType: "DDR5" },
  );
  const gig = item(
    "GIG-X870E",
    "GIGABYTE X870E AORUS MASTER AMD SOCKET AM5 DDR5 DIMM ATX MOTHERBOARD",
    { priceAmount: 73500, stock: 0, ramType: "DDR5" },
  );
  const twinRows = propose([gb, gig]);
  check("a twin pair is found as one group of two rows", twinRows.length === 2);
  check(
    "the listing with stock is kept and the other is deactivated",
    actionOf(twinRows, "GB-X870E-AORUS-MASTER") === "KEEP" &&
      actionOf(twinRows, "GIG-X870E") === "DEACTIVATE" &&
      twinRows.every((row) => row.confidence === "likely"),
  );
  check(
    "differing stock and price are called out on the row",
    twinRows.every(
      (row) =>
        row.note.includes("stock differs") && row.note.includes("price differs"),
    ),
  );

  // --- memory type decides, and doubt never suggests switching anything off ----
  const untaggedGb = item("GB-U", "Gigabyte X870E AORUS MASTER", { stock: 5 });
  const untaggedGig = item(
    "GIG-U",
    "GIGABYTE X870E AORUS MASTER AMD SOCKET AM5 DDR5 DIMM ATX MOTHERBOARD",
  );
  const doubt = propose([untaggedGb, untaggedGig]);
  check(
    "a memory type named in only one title is REVIEW: nothing is suggested for deactivation",
    doubt.length === 2 &&
      doubt.every((row) => row.action === "REVIEW" && row.confidence === "review"),
  );
  check(
    "a REVIEW pair still says which listing to keep if they are the same board",
    doubt.every((row) => row.note.includes("if so keep GB-U")),
  );

  const z790 = propose([
    item("MSI-Z790-P-WIFI", "MSI PRO Z790-P WIFI", { stock: 20 }, "MSI"),
    item("MSI-Z790-P-WIFI-DDR4", "MSI PRO Z790-P WIFI DDR4", {}, "MSI"),
  ]);
  check(
    "'X' next to 'X DDR4' (really the DDR5 and the DDR4 board) is REVIEW, never DEACTIVATE",
    z790.length === 2 && z790.every((row) => row.action === "REVIEW"),
  );
  const z790Tagged = propose([
    item("MSI-Z790-P-WIFI", "MSI PRO Z790-P WIFI", { ramType: "DDR5" }, "MSI"),
    item("MSI-Z790-P-WIFI-DDR4", "MSI PRO Z790-P WIFI DDR4", { ramType: "DDR4" }, "MSI"),
  ]);
  check(
    "tags saying DDR5 and DDR4 make them different boards",
    z790Tagged.every(
      (row) => row.action === "REVIEW" && row.note.includes("different memory"),
    ),
  );
  const tagBeatsTitle = propose([
    item("GB-T", "Gigabyte B650M GAMING X", { ramType: "DDR5", stock: 2 }),
    item("GIG-T", "GIGABYTE B650M GAMING X AM5 MOTHERBOARD", { ramType: "DDR5" }),
  ]);
  check(
    "the same tag on both twins settles it even when neither title names the memory",
    actionOf(tagBeatsTitle, "GB-T") === "KEEP" &&
      actionOf(tagBeatsTitle, "GIG-T") === "DEACTIVATE",
  );

  const sameDdr = propose([
    item("GB-H610M-H-DDR4", "Gigabyte H610M H DDR4", { stock: 20 }),
    item("GIG-LGA1700-15", "GIGABYTE H610M H DDR4 LGA1700 MICRO ATX MOTHERBOARD", {
      stock: 500,
    }),
  ]);
  check(
    "both titles naming the same memory type is a confident twin",
    sameDdr.every((row) => row.confidence === "likely") &&
      actionOf(sameDdr, "GB-H610M-H-DDR4") === "KEEP",
  );
  check(
    "an unusually high stock number is flagged to verify",
    sameDdr.find((row) => row.item.sku === "GIG-LGA1700-15")!.note.includes("unusually high"),
  );

  // --- keep order ------------------------------------------------------------
  const free = item("GIG-B650M-9", "GIGABYTE B650M GAMING X AM5 DDR5 MOTHERBOARD", {
    priceAmount: 0,
    stock: 9,
  });
  const priced = item("GB-B650M-GAMING-X", "Gigabyte B650M GAMING X DDR5", {
    priceAmount: 21000,
    stock: 0,
  });
  const keepRows = propose([free, priced]);
  check(
    "a ৳0 listing is never preferred over a priced twin, even with more stock",
    actionOf(keepRows, "GB-B650M-GAMING-X") === "KEEP" &&
      actionOf(keepRows, "GIG-B650M-9") === "DEACTIVATE" &&
      keepRows.find((r) => r.item.sku === "GIG-B650M-9")!.note.includes("price is 0"),
  );

  const off = item("GB-OFF", "Gigabyte Z790 AORUS ELITE", { isActive: false, stock: 4 });
  const on = item("GIG-Z790", "GIGABYTE Z790 AORUS ELITE LGA1700 ATX", { stock: 0 });
  const offRows = propose([off, on]);
  check(
    "an active twin is kept over an inactive one; the inactive one is just reported",
    actionOf(offRows, "GIG-Z790") === "KEEP" &&
      actionOf(offRows, "GB-OFF") === "ALREADY-OFF",
  );

  const allOff = propose([
    item("A", "Gigabyte Z790 GAMING X", { isActive: false }),
    item("B", "GIGABYTE Z790 GAMING X LGA1700 ATX", { isActive: false }),
  ]);
  check(
    "when every twin is already off, nothing is suggested for deactivation",
    allOff.every((row) => row.action === "KEEP" || row.action === "ALREADY-OFF") &&
      allOff.some((row) => row.note.includes("already inactive")),
  );

  // --- variants must be left alone ---------------------------------------------
  const variants = propose([
    item("MSI-Z890-P", "MSI PRO Z890-P", {}, "MSI"),
    item("MSI-Z890-P-WIFI", "MSI PRO Z890-P WIFI", {}, "MSI"),
    item("MSI-Z890-P-WIFI6E", "MSI PRO Z890-P WIFI6E", {}, "MSI"),
  ]);
  check(
    "WIFI / WIFI6E variants of one board are all LEAVE",
    variants.length === 3 && variants.every((row) => row.action === "LEAVE"),
  );
  check(
    "variants show the words they add, as plain words with no leading +",
    variants.find((row) => row.item.sku === "MSI-Z890-P-WIFI6E")!.adds === "WIFI6E" &&
      variants.every((row) => !row.adds.startsWith("+")),
  );
  check(
    "console form of the added words keeps the +",
    formatAddsForConsole(["WIFI6E", "DDR5"]) === "+WIFI6E +DDR5" &&
      formatAddsForConsole([]) === "(same words, different order)" &&
      addedTokens(variants[0]!.item, variants.map((row) => row.item)).length >= 0,
  );

  const dsa = propose([
    item("GB-A520M-DS3H", "Gigabyte A520M DS3H"),
    item("GB-A520M-DS3H-WF6E", "Gigabyte A520M DS3H WF6E"),
  ]);
  check(
    "the -WF6E board is a different board from the plain one",
    dsa.every((row) => row.action === "LEAVE"),
  );

  const ddrClash = propose([
    item("X-D4", "Gigabyte B760M K DDR4"),
    item("X-D5", "Gigabyte B760M K DDR5 ATX"),
  ]);
  check(
    "the same model sold as DDR4 and DDR5 goes to REVIEW, never DEACTIVATE",
    ddrClash.length === 2 &&
      ddrClash.every((row) => row.action === "REVIEW" && row.confidence === "review"),
  );

  // --- a mixed group: two twins plus a real variant ---------------------------
  const mixed = propose([
    item("GB-B550M-AORUS-ELITE", "Gigabyte B550M AORUS ELITE", { stock: 3 }),
    item("GIG-B550M-AE", "GIGABYTE B550M AORUS ELITE AMD AM4 MICRO ATX MOTHERBOARD"),
    item("GB-B550M-AORUS-ELITE-AX", "Gigabyte B550M AORUS ELITE AX"),
  ]);
  check(
    "twins are resolved inside a group that also holds a variant",
    actionOf(mixed, "GB-B550M-AORUS-ELITE") === "KEEP" &&
      actionOf(mixed, "GIG-B550M-AE") === "DEACTIVATE" &&
      actionOf(mixed, "GB-B550M-AORUS-ELITE-AX") === "LEAVE",
  );
  check(
    "exactly one KEEP per twin set (never zero, never two)",
    mixed.filter((row) => row.action === "KEEP").length === 1,
  );

  // --- csv ---------------------------------------------------------------------------
  check("plain cell is unquoted", csvCell("abc") === "abc");
  check("comma and quote are escaped", csvCell('a,"b"') === '"a,""b"""');
  check(
    "a leading = + - @ is defused so a spreadsheet cannot run it",
    csvCell("=SUM(A1)") === "'=SUM(A1)" &&
      csvCell("+1") === "'+1" &&
      csvCell("-1") === "'-1" &&
      csvCell("@x") === "'@x",
  );

  const worksheet: WorksheetRow[] = twinRows.map((row) => ({
    ...row,
    group: 1,
    category: "Gigabyte / motherboard",
  }));
  const variantRows: WorksheetRow[] = variants.map((row) => ({
    ...row,
    group: 2,
    category: "MSI / motherboard",
  }));
  const csv = buildWorksheetCsv([...worksheet, ...variantRows]);
  const lines = csv.replace("﻿", "").trim().split("\r\n");
  check("csv starts with a BOM", csv.startsWith("﻿"));
  check(
    "csv has a header and one line per row, with an empty your_decision",
    lines.length === 6 &&
      lines[0]!.startsWith("group,category,confidence,action,sku,name") &&
      lines[0]!.endsWith("your_decision") &&
      lines[1]!.endsWith(","),
  );
  check(
    "no worksheet cell was defused with a stray apostrophe (nothing of ours starts with + = - @)",
    !csv.includes(",'"),
  );

  const summary = summariseWorksheet([...worksheet, ...variantRows]);
  check(
    "summary counts groups, twin sets, deactivations and variants",
    summary.groups === 2 &&
      summary.twinSets === 1 &&
      summary.deactivate === 1 &&
      summary.review === 0 &&
      summary.leave === 3,
  );

  console.log(
    failures === 0
      ? `\nduplicates ok — ${checks} checks passed`
      : `\nduplicates FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
