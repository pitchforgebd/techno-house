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
  evaluateCompatibility,
  planValidatedBuildToCart,
  rankCandidatesForSlot,
  PC_RULE_TYPES,
  RULE_EVALUATORS,
  type BuildValidateCandidate,
  type CompatibilityPart,
} from "@/lib/domain/pc-builder";
import type { BuilderCandidate } from "@/lib/data/types/catalog";

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
