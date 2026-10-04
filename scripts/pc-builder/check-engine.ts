/**
 * PC Builder compatibility engine suite (P14-T03).
 *
 *   npm run test:pc-builder
 *
 * Pure — no database, no HTTP, no secrets. Covers match, mismatch, unknown,
 * disabled types, storage-interface when data is missing, the T06
 * validate snapshot, and the T07 validated cart plan.
 */
import {
  assembleValidatedBuild,
  BUILDER_SLOTS,
  BUILDER_SLOT_CATEGORY_SLUGS,
  defaultSlotForCategory,
  evaluateCompatibility,
  isCompatibilityReady,
  missingRequiredFields,
  parseAttrList,
  planValidatedBuildToCart,
  rankCandidatesForSlot,
  toggleAttrValue,
  PC_RULE_TYPES,
  RULE_EVALUATORS,
  type BuildValidateCandidate,
  type CompatibilityPart,
} from "@/lib/domain/pc-builder";
import { carryForwardBuilderFields } from "@/lib/catalog/bulk-builder-carry-forward";
import {
  parseBuilderFields,
  type ProductInputFields,
} from "@/lib/catalog/product-input";
import {
  SLOT_ATTRIBUTE_FIELDS,
  SLOT_REQUIRED_FIELDS,
} from "@/lib/domain/pc-builder/attribute-options";
import { inferBuilderAttrs } from "@/lib/domain/pc-builder/infer-attrs";
import type { BuilderCandidate, BuilderSlot } from "@/lib/data/types/catalog";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function part(
  slotId: CompatibilityPart["slotId"],
  name: string,
  attrs: CompatibilityPart["attrs"],
): CompatibilityPart {
  return { slotId, slug: name.toLowerCase().replace(/\s+/g, "-"), name, attrs };
}

const cpuAm5 = part("cpu", "CPU AM5", { socket: "AM5", tdpWatts: 65 });
const cpuLga = part("cpu", "CPU LGA", { socket: "LGA1700", tdpWatts: 65 });
const cpuBare = part("cpu", "CPU bare", null);
const coolerAm5 = part("cpu_cooler", "Cooler AM5", { socket: "AM5" });
const coolerLgaMismatch = part("cpu_cooler", "Cooler LGA", {
  socket: "LGA1700",
});
const mbAm5 = part("motherboard", "MB AM5", {
  socket: "AM5",
  ramType: "DDR5",
  formFactor: "Micro-ATX",
  storageInterface: "NVMe",
});
const mbDdr4 = part("motherboard", "MB DDR4", {
  socket: "AM5",
  ramType: "DDR4",
  formFactor: "Micro-ATX",
});
const ramDdr5 = part("ram", "RAM DDR5", { ramType: "DDR5" });
const ramDdr4 = part("ram", "RAM DDR4", { ramType: "DDR4" });
const caseMatx = part("case", "Case mATX", { formFactor: "Micro-ATX" });
const caseAtx = part("case", "Case ATX", { formFactor: "ATX" });
const gpu = part("gpu", "GPU", { tdpWatts: 160 });
const psu650 = part("psu", "PSU 650", { tdpWatts: 650 });
const psu200 = part("psu", "PSU 200", { tdpWatts: 200 });
const psuBare = part("psu", "PSU bare", null);
const ssdNvme = part("ssd", "SSD NVMe", { storageInterface: "NVMe" });
const ssdSata = part("ssd", "SSD SATA", { storageInterface: "SATA" });
const ssdBare = part("ssd", "SSD bare", null);
const hddBare = part("hdd", "HDD bare", null);

function candidate(
  slug: string,
  name: string,
  attrs: CompatibilityPart["attrs"],
): BuilderCandidate {
  return {
    id: slug,
    slug,
    name,
    brandSlug: "brand",
    brandName: "Brand",
    categorySlug: "category",
    sku: slug.toUpperCase(),
    price: { amount: 1000, currency: "BDT" },
    compareAtPrice: null,
    stockStatus: "in_stock",
    warrantyLabel: "",
    warrantyBadge: null,
    warrantyLogoSrc: null,
    image: { src: "/products/placeholder.svg", alt: name },
    specs: [],
    isNew: false,
    isNewArrival: false,
    isSale: false,
    discountStartsAt: null,
    discountEndsAt: null,
    labels: [],
    hasActiveOffer: false,
    builderSlot: null,
    builderAttrs: attrs,
  };
}

function hasCode(
  result: ReturnType<typeof evaluateCompatibility>,
  code: string,
): boolean {
  return result.warnings.some((warning) => warning.code === code);
}

function main(): void {
  check(
    "every persisted rule type has an evaluator",
    PC_RULE_TYPES.every((type) => typeof RULE_EVALUATORS[type] === "function"),
  );

  const empty = evaluateCompatibility([]);
  check("empty build has no warnings", empty.warnings.length === 0);
  check("empty build checkedOk is 0", empty.checkedOk === 0);

  const socketOk = evaluateCompatibility([cpuAm5, mbAm5], ["socket"]);
  check("AM5 CPU + MB socket passes", socketOk.checkedOk === 1);
  check("AM5 CPU + MB has no warnings", socketOk.warnings.length === 0);

  const socketBad = evaluateCompatibility([cpuLga, mbAm5], ["socket"]);
  check(
    "socket mismatch is incompatible",
    socketBad.hasIncompatible && hasCode(socketBad, "cpu_mb_socket_mismatch"),
  );

  const socketUnknown = evaluateCompatibility([cpuBare, mbAm5], ["socket"]);
  check(
    "missing CPU socket is unknown",
    socketUnknown.hasUnknown && hasCode(socketUnknown, "cpu_mb_socket_unknown"),
  );
  check(
    "unknown is never claimed compatible",
    !socketUnknown.hasIncompatible && socketUnknown.checkedOk === 0,
  );

  const coolerOk = evaluateCompatibility([cpuAm5, coolerAm5], ["socket"]);
  check("cooler matches CPU socket", coolerOk.checkedOk === 1);

  const coolerMb = evaluateCompatibility([coolerAm5, mbAm5], ["socket"]);
  check("cooler matches MB when CPU is empty", coolerMb.checkedOk === 1);

  const ramOk = evaluateCompatibility([ramDdr5, mbAm5], ["ram_type"]);
  check("DDR5 RAM + MB passes", ramOk.checkedOk === 1);

  const ramBad = evaluateCompatibility([ramDdr4, mbAm5], ["ram_type"]);
  check(
    "RAM type mismatch is incompatible",
    ramBad.hasIncompatible && hasCode(ramBad, "ram_mb_type_mismatch"),
  );

  const formOk = evaluateCompatibility([mbAm5, caseMatx], ["form_factor"]);
  check("matching form factor passes", formOk.checkedOk === 1);

  const formBad = evaluateCompatibility([mbAm5, caseAtx], ["form_factor"]);
  check(
    "form factor mismatch is incompatible",
    formBad.hasIncompatible && hasCode(formBad, "mb_case_form_mismatch"),
  );

  const psuOk = evaluateCompatibility([cpuAm5, gpu, psu650], ["psu_wattage"]);
  check("650W PSU covers 65+160 with 1.5x headroom", psuOk.checkedOk === 1);

  const psuLow = evaluateCompatibility([cpuAm5, gpu, psu200], ["psu_wattage"]);
  check(
    "undersized PSU is incompatible",
    psuLow.hasIncompatible && hasCode(psuLow, "psu_capacity_low"),
  );

  const psuUnknown = evaluateCompatibility(
    [cpuAm5, gpu, psuBare],
    ["psu_wattage"],
  );
  check(
    "missing PSU watts is unknown",
    psuUnknown.hasUnknown && hasCode(psuUnknown, "psu_capacity_unknown"),
  );

  const storageUnknown = evaluateCompatibility(
    [mbAm5, ssdBare],
    ["storage_interface"],
  );
  check(
    "SSD without interface is unknown",
    storageUnknown.hasUnknown &&
      hasCode(storageUnknown, "ssd_mb_storage_unknown"),
  );

  const hddUnknown = evaluateCompatibility(
    [mbDdr4, hddBare],
    ["storage_interface"],
  );
  check(
    "HDD without interface is unknown",
    hddUnknown.hasUnknown && hasCode(hddUnknown, "hdd_mb_storage_unknown"),
  );

  const storageOk = evaluateCompatibility(
    [mbAm5, ssdNvme],
    ["storage_interface"],
  );
  check("NVMe SSD + MB passes", storageOk.checkedOk === 1);

  const storageBad = evaluateCompatibility(
    [mbAm5, ssdSata],
    ["storage_interface"],
  );
  check(
    "SATA SSD vs NVMe MB is incompatible",
    storageBad.hasIncompatible &&
      hasCode(storageBad, "ssd_mb_storage_mismatch"),
  );

  const disabled = evaluateCompatibility([cpuLga, mbAm5], []);
  check("empty enabled set runs no checks", disabled.warnings.length === 0);
  check("empty enabled set checkedOk is 0", disabled.checkedOk === 0);

  const skipSocket = evaluateCompatibility(
    [cpuLga, mbAm5, ramDdr5],
    ["ram_type"],
  );
  check(
    "disabled socket does not emit socket warnings",
    !hasCode(skipSocket, "cpu_mb_socket_mismatch"),
  );
  check("enabled RAM type still runs", skipSocket.checkedOk === 1);

  const omitted = evaluateCompatibility([cpuAm5, mbAm5, ramDdr5]);
  check(
    "omitted enabledTypes runs socket and RAM",
    omitted.checkedOk >= 2 && !omitted.hasIncompatible,
  );

  const storageOmitted = evaluateCompatibility([mbAm5, ssdBare]);
  check(
    "omitted enabledTypes still evaluates storage as unknown",
    hasCode(storageOmitted, "ssd_mb_storage_unknown"),
  );

  const am5Cpu: BuildValidateCandidate = {
    slug: "cpu-am5",
    name: "CPU AM5",
    priceAmount: 21500,
    stockStatus: "in_stock",
    builderSlot: "cpu",
    builderAttrs: { socket: "AM5", tdpWatts: 65 },
  };
  const am5Board: BuildValidateCandidate = {
    slug: "mb-am5",
    name: "MB AM5",
    priceAmount: 18000,
    stockStatus: "in_stock",
    builderSlot: "motherboard",
    builderAttrs: { socket: "AM5", ramType: "DDR5", formFactor: "Micro-ATX" },
  };
  const gpuAsCpu: BuildValidateCandidate = {
    slug: "gpu-card",
    name: "GPU card",
    priceAmount: 40000,
    stockStatus: "in_stock",
    builderSlot: "gpu",
    builderAttrs: { tdpWatts: 160 },
  };

  const emptySnap = assembleValidatedBuild({}, []);
  check(
    "validate empty has no compatibility",
    emptySnap.compatibility === null,
  );
  check("validate empty has no issues", emptySnap.issues.length === 0);

  const okSnap = assembleValidatedBuild(
    { cpu: "cpu-am5", motherboard: "mb-am5" },
    [am5Cpu, am5Board],
    ["socket"],
  );
  check("validate prices live candidates", okSnap.pricing.subtotal === 39500);
  check(
    "validate matching socket is compatible",
    okSnap.compatibility !== null && !okSnap.compatibility.hasIncompatible,
  );

  const missingSnap = assembleValidatedBuild(
    { cpu: "gone-cpu" },
    [am5Cpu],
    ["socket"],
  );
  check(
    "validate missing part is an issue",
    missingSnap.issues.some((issue) => issue.code === "missing_part"),
  );
  check(
    "validate missing part has no price",
    missingSnap.pricing.subtotal === 0,
  );

  const mismatchSnap = assembleValidatedBuild(
    { cpu: "gpu-card" },
    [gpuAsCpu],
    ["socket"],
  );
  check(
    "validate slot mismatch is an issue",
    mismatchSnap.issues.some((issue) => issue.code === "slot_mismatch"),
  );
  check(
    "validate mismatch is excluded from engine parts",
    mismatchSnap.parts.length === 0,
  );

  const requiredSlots = {
    cpu: "cpu-am5",
    cpu_cooler: "cooler",
    motherboard: "mb-am5",
    ram: "ram",
    gpu: "gpu",
    ssd: "ssd",
    hdd: "hdd",
    psu: "psu",
    case: "case",
    case_fans: "fans",
  } as const;
  const requiredProducts = Object.values(requiredSlots).map((slug) => ({
    slug,
    stockStatus: "in_stock" as const,
  }));
  const cartOk = planValidatedBuildToCart({
    selection: { ...requiredSlots },
    products: requiredProducts,
    compatibility: {
      warnings: [],
      checkedOk: 4,
      hasIncompatible: false,
      hasUnknown: false,
    },
    issues: [],
    existingCartSlugs: [],
    maxCartLines: 24,
  });
  check("plan validated complete build is ok", cartOk.ok === true);

  const cartIssue = planValidatedBuildToCart({
    selection: { cpu: "gone-cpu" },
    products: [],
    compatibility: null,
    issues: [
      {
        code: "missing_part",
        slotId: "cpu",
        message: "CPU is no longer available.",
      },
    ],
    existingCartSlugs: [],
    maxCartLines: 24,
  });
  check(
    "plan validated missing part is blocked",
    !cartIssue.ok && cartIssue.code === "missing_product",
  );

  const cartMismatch = planValidatedBuildToCart({
    selection: { cpu: "gpu-card" },
    products: [{ slug: "gpu-card", stockStatus: "in_stock" }],
    compatibility: null,
    issues: [
      {
        code: "slot_mismatch",
        slotId: "cpu",
        message: "GPU card does not belong in the CPU slot.",
      },
    ],
    existingCartSlugs: [],
    maxCartLines: 24,
  });
  check(
    "plan validated slot mismatch is blocked",
    !cartMismatch.ok && cartMismatch.code === "slot_mismatch",
  );

  // rankCandidatesForSlot (AD-276): suggest-as-you-pick filtering.
  const ramCandidates = [
    candidate("ram-ddr5", "RAM DDR5", { ramType: "DDR5" }),
    candidate("ram-ddr4", "RAM DDR4", { ramType: "DDR4" }),
    candidate("ram-bare", "RAM bare", null),
  ];
  const rankedAgainstAm5Mb = rankCandidatesForSlot({
    slot: "ram",
    candidates: ramCandidates,
    selectedParts: [mbAm5],
    enabledTypes: ["ram_type"],
  });
  check(
    "matching RAM ranks ok",
    rankedAgainstAm5Mb.find((r) => r.candidate.slug === "ram-ddr5")?.status ===
      "ok",
  );
  check(
    "mismatched RAM ranks incompatible",
    rankedAgainstAm5Mb.find((r) => r.candidate.slug === "ram-ddr4")
      ?.status === "incompatible",
  );
  check(
    "RAM with no data ranks unknown, not hidden as incompatible",
    rankedAgainstAm5Mb.find((r) => r.candidate.slug === "ram-bare")
      ?.status === "unknown",
  );
  check(
    "no selection yet -> every candidate ranks ok",
    rankCandidatesForSlot({
      slot: "ram",
      candidates: ramCandidates,
      selectedParts: [],
      enabledTypes: ["ram_type"],
    }).every((r) => r.status === "ok"),
  );

  // A CPU/cooler mismatch exists elsewhere in the same hypothetical build,
  // but a motherboard that genuinely matches the CPU must still rank "ok" —
  // an unrelated warning must never leak into this slot's status.
  const rankedMotherboards = rankCandidatesForSlot({
    slot: "motherboard",
    candidates: [candidate("mb-am5", "MB AM5", { socket: "AM5" })],
    selectedParts: [cpuAm5, coolerLgaMismatch],
    enabledTypes: ["socket"],
  });
  check(
    "a real CPU/cooler mismatch elsewhere does not hide a genuinely matching motherboard",
    rankedMotherboards[0]?.status === "ok",
  );
  check(
    "the ok motherboard carries no warnings of its own",
    rankedMotherboards[0]?.warnings.length === 0,
  );

  // Multi-value attributes (AD-346): "supports any of these" via overlap.
  const mbBoth = part("motherboard", "MB DDR4+DDR5", {
    socket: "LGA1700",
    ramType: "DDR4, DDR5",
    formFactor: "ATX",
    storageInterface: "NVMe, SATA",
  });
  check(
    "dual-support board accepts DDR4 RAM",
    evaluateCompatibility([ramDdr4, mbBoth], ["ram_type"]).checkedOk === 1,
  );
  check(
    "dual-support board accepts DDR5 RAM",
    evaluateCompatibility([ramDdr5, mbBoth], ["ram_type"]).checkedOk === 1,
  );
  check(
    "dual-support board still rejects DDR3 RAM",
    evaluateCompatibility(
      [part("ram", "RAM DDR3", { ramType: "DDR3" }), mbBoth],
      ["ram_type"],
    ).hasIncompatible,
  );
  check(
    "dual-support board accepts a SATA SSD and an NVMe SSD",
    evaluateCompatibility([ssdSata, mbBoth], ["storage_interface"])
      .checkedOk === 1 &&
      evaluateCompatibility([ssdNvme, mbBoth], ["storage_interface"])
        .checkedOk === 1,
  );
  const coolerMulti = part("cpu_cooler", "Cooler multi", {
    socket: "AM4, AM5, LGA1700",
  });
  check(
    "multi-socket cooler fits an AM5 CPU and an LGA1700 CPU",
    evaluateCompatibility([cpuAm5, coolerMulti], ["socket"]).checkedOk === 1 &&
      evaluateCompatibility([cpuLga, coolerMulti], ["socket"]).checkedOk === 1,
  );
  check(
    "multi-socket cooler still rejects an LGA1200 CPU",
    evaluateCompatibility(
      [part("cpu", "CPU 1200", { socket: "LGA1200" }), coolerMulti],
      ["socket"],
    ).hasIncompatible,
  );
  const caseMulti = part("case", "Case multi", {
    formFactor: "ATX, Micro-ATX, Mini-ITX",
  });
  check(
    "case listing several board sizes fits a Micro-ATX board",
    evaluateCompatibility([mbAm5, caseMulti], ["form_factor"]).checkedOk === 1,
  );
  check(
    "a Mini-ITX-only case rejects an ATX board",
    evaluateCompatibility(
      [mbBoth, part("case", "Case ITX", { formFactor: "Mini-ITX" })],
      ["form_factor"],
    ).hasIncompatible,
  );
  check(
    "matching ignores case, spaces and hyphens (am5 / micro atx)",
    evaluateCompatibility(
      [part("cpu", "CPU lower", { socket: "am5" }), mbAm5],
      ["socket"],
    ).checkedOk === 1 &&
      evaluateCompatibility(
        [mbAm5, part("case", "Case spaced", { formFactor: "micro atx" })],
        ["form_factor"],
      ).checkedOk === 1,
  );
  check(
    "mismatch message lists every value of a multi-value part",
    evaluateCompatibility(
      [part("ram", "RAM DDR3", { ramType: "DDR3" }), mbBoth],
      ["ram_type"],
    ).warnings[0]?.message.includes("DDR4, DDR5") === true,
  );

  check(
    "parseAttrList splits, trims, de-dupes and respells to the vocabulary",
    JSON.stringify(parseAttrList(" ddr4 ,DDR5; DDR4,, ", ["DDR5", "DDR4"])) ===
      JSON.stringify(["DDR4", "DDR5"]),
  );
  check(
    "a single stored value is a one-item list",
    JSON.stringify(parseAttrList("AM5")) === JSON.stringify(["AM5"]),
  );
  check(
    "toggleAttrValue adds and removes one value, keeping the rest",
    toggleAttrValue("DDR4", "DDR5", ["DDR5", "DDR4"]) === "DDR4, DDR5" &&
      toggleAttrValue("DDR4, DDR5", "DDR4", ["DDR5", "DDR4"]) === "DDR5" &&
      toggleAttrValue("DDR4, LPDDR5", "DDR4", ["DDR5", "DDR4"]) === "LPDDR5",
  );

  // Missing-data attribution + picker ranking with multi-value boards.
  const bothMissing = evaluateCompatibility(
    [part("ram", "RAM bare", null), part("motherboard", "MB bare", null)],
    ["ram_type"],
  );
  check(
    "unknown fit names every slot with missing data",
    bothMissing.warnings[0]?.missingSlotIds?.length === 2,
  );
  const ramVsDualBoard = rankCandidatesForSlot({
    slot: "ram",
    candidates: ramCandidates,
    selectedParts: [mbBoth],
    enabledTypes: ["ram_type"],
  });
  check(
    "against a DDR4+DDR5 board both RAM types rank ok",
    ramVsDualBoard.find((r) => r.candidate.slug === "ram-ddr5")?.status ===
      "ok" &&
      ramVsDualBoard.find((r) => r.candidate.slug === "ram-ddr4")?.status ===
        "ok",
  );
  const bareRam = ramVsDualBoard.find((r) => r.candidate.slug === "ram-bare");
  check(
    "a RAM with no RAM type is flagged as missing its own data",
    bareRam?.status === "unknown" && bareRam.candidateMissingData === true,
  );
  const mbNoRam = part("motherboard", "MB no RAM data", { socket: "AM5" });
  const ramVsBareBoard = rankCandidatesForSlot({
    slot: "ram",
    candidates: ramCandidates,
    selectedParts: [mbNoRam],
    enabledTypes: ["ram_type"],
  });
  check(
    "when the PICKED board lacks data, a RAM that has its type is not blamed",
    ramVsBareBoard
      .filter((r) => r.candidate.slug !== "ram-bare")
      .every((r) => r.status === "unknown" && r.candidateMissingData === false),
  );
  check(
    "a RAM with no type is still flagged when both sides lack data",
    ramVsBareBoard.find((r) => r.candidate.slug === "ram-bare")
      ?.candidateMissingData === true,
  );
  const rankedAgainstWeakPsu = rankCandidatesForSlot({
    slot: "cpu",
    candidates: [candidate("cpu-no-tdp", "CPU no TDP", { socket: "AM5" })],
    selectedParts: [psu650],
    enabledTypes: ["psu_wattage"],
  });
  check(
    "missing CPU TDP against a PSU never marks the CPU as missing fit data",
    rankedAgainstWeakPsu[0]?.status === "unknown" &&
      rankedAgainstWeakPsu[0].candidateMissingData === false,
  );

  // Backfill inference (AD-346) — real catalog names, conservative by design.
  const infer = (
    slot: CompatibilityPart["slotId"],
    name: string,
    extra?: Partial<Parameters<typeof inferBuilderAttrs>[0]>,
  ) => inferBuilderAttrs({ slot, name, ...extra });

  check(
    "infer: explicit LGA token wins for a CPU",
    infer("cpu", "Intel® Core™ i3-12100 12th Gen Processor LGA1700 (Tray)")
      .values.socket?.value === "LGA1700",
  );
  check(
    "infer: Intel generation implies the socket when the name omits it",
    infer("cpu", "Intel Core i5 10500T 10th Gen Comet Lake Processor 3Years")
      .values.socket?.value === "LGA1200",
  );
  check(
    "infer: 'LGA 1851' (with a space) and Core Ultra both read as LGA1851",
    infer("cpu", "Intel® Core™ Ultra 5 225 Processor LGA 1851(Tray)").values
      .socket?.value === "LGA1851",
  );
  const conflictingCpu = infer(
    "cpu",
    "AMD Ryzen 9 7900X Processor (64MB Cache, up to 5.6GHz) AM4",
  );
  check(
    "infer: a CPU whose name contradicts its series is a conflict, not a guess",
    conflictingCpu.values.socket === undefined &&
      conflictingCpu.conflicts.length === 1,
  );
  const coolerAll = infer(
    "cpu_cooler",
    "GIGABYTE GAMING 240 (Black) # CPU Socket: Intel 1851 / 1700 / 115X / 1200 AMD AM5 / AM4",
  ).values.socket?.value;
  check(
    "infer: a cooler's socket clause yields every listed socket",
    coolerAll ===
      "AM5, AM4, LGA1851, LGA1700, LGA1200, LGA1151",
  );
  check(
    "infer: an 'all platforms' / bare-vendor cooler is left unset",
    infer("cpu_cooler", "HUNTKEY FROZEN 200, 95W AMD/INTEL CPU COOLER FOR ALL PLATFORM")
      .values.socket === undefined &&
      infer("cpu_cooler", "XJOGOS XJC100A 90W, 1900RPM +/- CPU COOLER FOR AMD PROCESSOR")
        .values.socket === undefined,
  );
  check(
    "infer: single-generation platforms imply RAM type, LGA1700 does not",
    infer("motherboard", "GIGABYTE AMD # B650M D3HP", {
      attributes: { socket: "AM5" },
    }).values.ramType?.value === "DDR5" &&
      infer("motherboard", "ASUS PRIME B760M-A", {
        attributes: { socket: "LGA1700" },
      }).values.ramType === undefined,
  );
  check(
    "infer: laptop SODIMM RAM is its own type, desktop RAM keeps plain DDR",
    infer("ram", "Corsair VENGEANCE DDR5 SODIMM 8GB (1x8GB) DDR5 4800MT/s")
      .values.ramType?.value === "DDR5 SODIMM" &&
      infer("ram", "Apacer 16GB DDR4 Desktop RAM, 3200MHz").values.ramType
        ?.value === "DDR4",
  );
  check(
    "a SODIMM stick never fits a DDR4 desktop board",
    evaluateCompatibility(
      [part("ram", "SODIMM", { ramType: "DDR4 SODIMM" }), mbDdr4],
      ["ram_type"],
    ).hasIncompatible,
  );
  check(
    "infer: case sizes are the named size and everything smaller",
    infer("case", "SMART A400B CURVED TEMPERED GLASS MID TOWER ATX BLACK CASE")
      .values.formFactor?.value === "ATX, Micro-ATX, Mini-ITX" &&
      infer("case", "XTREME C31B M-ATX BLACK CASE TEMPERED GLASS").values
        .formFactor?.value === "Micro-ATX, Mini-ITX" &&
      infer("case", "DELUX J601 MICRO ATX COMPUTER CASE WITH 200W POWER SUPPLY")
        .values.formFactor?.value === "Micro-ATX, Mini-ITX",
  );
  check(
    "infer: an unlabeled case is left unset; an overview support line wins",
    infer("case", "XTREME 2603 MINI BLACK OFFICE COMPUTER CASE").values
      .formFactor === undefined &&
      infer("case", "Some Case", {
        overview: ["<p>Motherboard Support: ATX, Micro-ATX</p>"],
      }).values.formFactor?.value === "ATX, Micro-ATX",
  );
  check(
    "infer: drive interface from the name; external/ambiguous drives skipped",
    infer("ssd", 'Apacer AS350 2.5" SATAIII SSD, 512GB').values
      .storageInterface?.value === "SATA" &&
      infer("ssd", "Apacer AS2280P4 M.2 NVMe SSD, 1TB").values
        .storageInterface?.value === "NVMe" &&
      infer("ssd", "Corsair EX300U 2TB USB Type-C External SSD").values
        .storageInterface === undefined &&
      infer("ssd", "Apacer AST280 M.2, 480GB").values.storageInterface ===
        undefined &&
      infer("hdd", "Toshiba P300 1TB 7200 RPM, SATA 6 Gb/s").values
        .storageInterface?.value === "SATA",
  );

  // Power / TDP inference (AD-346 step 2).
  const tdp = (slot: CompatibilityPart["slotId"], name: string, overview?: string[]) =>
    infer(slot, name, { overview }).values.tdpWatts?.value;
  check(
    "infer: PSU wattage from an explicit 'NNN Watt' / 'NNNW'",
    tdp("psu", "Corsair CV Series CV650 - 650 Watt 80 Plus Bronze Certified PSU") === "650" &&
      tdp("psu", "DELUX DLP-21MS 450W ATX POWER SUPPLY,1Y WARRANTY") === "450",
  );
  check(
    "infer: PSU real wattage beats a misleading model number",
    tdp("psu", "XTREME XPS550N REAL 200W ATX POWER SUPPLY 24+8 PIN") === "200",
  );
  check(
    "infer: PSU wattage from Corsair / Gigabyte model codes when no 'W' is written",
    tdp("psu", "CORSAIR POWER SUPPLY RM850 - 80 PLUS Gold Certified Fully Modular PSU") === "850" &&
      tdp("psu", "Corsair SF-L Series SF850L 80 PLUS Gold Fully Modular SFX Power Supply") === "850" &&
      tdp("psu", "GIGABYTE POWER SUPPLY # GP-UD1000GM PG5, Fully modular design") === "1000",
  );
  check(
    "infer: chargers and adapters in the PSU slot get no wattage",
    tdp("psu", "UGREEN Nexode 100W Desktop Charger EU") === undefined &&
      tdp("psu", "ZKTECO # 12V 3AM Adapter Quality for F22") === undefined &&
      tdp("psu", "DAHUA DH-PFM325D DC12V 1A POWER ADAPTER") === undefined,
  );
  check(
    "infer: GPU power comes from the model, most specific code first",
    tdp("gpu", "GIGABYTE NVIDIA # GV-N506TAERO OC-16GD, GDDR7") === "180" &&
      tdp("gpu", "GIGABYTE NVIDIA # GV-N5060GAMING OC-8GD, GDDR7") === "145" &&
      tdp("gpu", "GIGABYTE NVIDIA # GV-N507TGAMING OC-16GD") === "300" &&
      tdp("gpu", "GIGABYTE NVIDIA # GV-N5070GAMING OC-12GD") === "250" &&
      tdp("gpu", "GIGABYTE NVIDIA # GV-N3050WF2OC-6GD") === "70" &&
      tdp("gpu", "GIGABYTE NVIDIA # GV-N3050WF2OC-8GD") === "130",
  );
  check(
    "infer: GPU power ignores the overview's whole-system 'Power supply requirement'",
    tdp("gpu", "GIGABYTE NVIDIA # GV-N5090GAMING OC-32GD", [
      "Power supply requirement: 1000W",
    ]) === "575" &&
      tdp("gpu", "Some Unknown Graphics Card", ["Power supply requirement: 550W"]) ===
        undefined,
  );
  check(
    "infer: Intel CPU TDP by suffix (T 35, plain 65, K 125, i3 12th-14th 60)",
    tdp("cpu", "Intel Core i5 10500T 10th Gen Comet Lake Processor") === "35" &&
      tdp("cpu", "Intel Core i5-12400 12th Gen Processor LGA1700") === "65" &&
      tdp("cpu", "Intel Core i9-14900K 14th Gen Processor LGA1700") === "125" &&
      tdp("cpu", "Intel Core i3-12100 12th Gen Processor LGA1700") === "60" &&
      tdp("cpu", "Intel Core i3-10105 10th Gen Processor LGA1200") === "65" &&
      tdp("cpu", "Intel Core Ultra 5 225 Processor LGA 1851") === "65",
  );
  check(
    "infer: Ryzen TDP from an exact model; mobile and unknown CPUs stay unset",
    tdp("cpu", "AMD Ryzen 7 5800X Processor AM4") === "105" &&
      tdp("cpu", "AMD Ryzen 5 5600 Processor AM4") === "65" &&
      tdp("cpu", "Intel Core i7-1255U 12th Gen Mobile Processor") === undefined &&
      tdp("cpu", "I7 Processor Pluggable PC Module") === undefined,
  );

  // Bulk re-import must not wipe builder tags (AD-346): carry-forward.
  const carried = carryForwardBuilderFields({
    builderSlot: "MOTHERBOARD",
    builderSocket: "AM5",
    builderRamType: "DDR5",
    builderFormFactor: "Micro-ATX",
    builderTdpWatts: null,
    builderStorageInterface: "NVMe, SATA",
  });
  check(
    "carry-forward maps the stored slot and values back to form input",
    carried.builderSlot === "motherboard" &&
      carried.builderSocket === "AM5" &&
      carried.builderRamType === "DDR5" &&
      carried.builderTdpWatts === "" &&
      carried.builderStorageInterface === "NVMe, SATA",
  );
  const reparsed = parseBuilderFields(carried as unknown as ProductInputFields);
  check(
    "a carried-forward product re-parses to the identical slot and attrs",
    reparsed.ok &&
      reparsed.slot === "motherboard" &&
      reparsed.attrs?.socket === "AM5" &&
      reparsed.attrs?.ramType === "DDR5" &&
      reparsed.attrs?.formFactor === "Micro-ATX" &&
      reparsed.attrs?.storageInterface === "NVMe, SATA",
  );
  const wiped = parseBuilderFields({
    builderSlot: "",
    builderSocket: "",
    builderRamType: "",
    builderFormFactor: "",
    builderTdpWatts: "",
    builderStorageInterface: "",
  } as unknown as ProductInputFields);
  check(
    "without carry-forward an empty CSV row means 'not a builder part' (the wipe)",
    wiped.ok && wiped.slot === null && wiped.attrs === null,
  );
  check(
    "carry-forward keeps a numeric wattage and a no-slot product no-slot",
    carryForwardBuilderFields({
      builderSlot: "PSU",
      builderSocket: null,
      builderRamType: null,
      builderFormFactor: null,
      builderTdpWatts: 650,
      builderStorageInterface: null,
    }).builderTdpWatts === "650" &&
      carryForwardBuilderFields({
        builderSlot: null,
        builderSocket: null,
        builderRamType: null,
        builderFormFactor: null,
        builderTdpWatts: null,
        builderStorageInterface: null,
      }).builderSlot === "",
  );

  // Compatibility-data page + category defaults (AD-348).
  check(
    "ready means every required field is set: a bare RAM is missing its type",
    JSON.stringify(missingRequiredFields("ram", null)) ===
      JSON.stringify(["ramType"]) &&
      missingRequiredFields("ram", { ramType: "DDR5" }).length === 0,
  );
  check(
    "a motherboard needs socket + RAM type + form factor, not drive interface",
    JSON.stringify(missingRequiredFields("motherboard", { socket: "AM5" })) ===
      JSON.stringify(["ramType", "formFactor"]) &&
      isCompatibilityReady("motherboard", {
        socket: "AM5",
        ramType: "DDR5",
        formFactor: "ATX",
      }),
  );
  check(
    "CPU, GPU and PSU need a positive wattage to be ready; blank list values do not count",
    missingRequiredFields("psu", {}).includes("tdpWatts") &&
      !missingRequiredFields("psu", { tdpWatts: 650 }).length &&
      missingRequiredFields("gpu", { tdpWatts: 0 }).includes("tdpWatts") &&
      missingRequiredFields("cpu_cooler", { socket: " , " }).includes("socket"),
  );
  check(
    "slots without fit rules (monitor, mouse…) are always ready",
    isCompatibilityReady("monitor", null) && isCompatibilityReady("mouse", null),
  );
  check(
    "every required field is also an editable field for that slot",
    (Object.keys(SLOT_REQUIRED_FIELDS) as BuilderSlot[]).every((slot) =>
      (SLOT_REQUIRED_FIELDS[slot] ?? []).every((field) =>
        (SLOT_ATTRIBUTE_FIELDS[slot] ?? []).includes(field),
      ),
    ),
  );
  check(
    "category → slot defaults: leaf categories map, unknown ones do not",
    defaultSlotForCategory("processor") === "cpu" &&
      defaultSlotForCategory("nvme-ssd") === "ssd" &&
      defaultSlotForCategory("casing-cooler") === "case_fans" &&
      defaultSlotForCategory("wifi-adapter") === "network_adapter" &&
      defaultSlotForCategory("desktop") === null &&
      defaultSlotForCategory("") === null &&
      defaultSlotForCategory(undefined) === null,
  );
  check(
    "the category map only names real slots and never lists a category twice",
    (() => {
      const slotIds = new Set(BUILDER_SLOTS.map((slot) => slot.id));
      const seen = new Set<string>();
      return BUILDER_SLOT_CATEGORY_SLUGS.every(({ slot, categorySlugs }) =>
        slotIds.has(slot) &&
        categorySlugs.every((slug) => {
          if (seen.has(slug)) return false;
          seen.add(slug);
          return true;
        }),
      );
    })(),
  );

  console.log(
    failures === 0
      ? `\nengine ok — ${checks} checks passed`
      : `\nengine FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
