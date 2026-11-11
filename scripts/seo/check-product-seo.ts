/**
 * Unit tests for the product SEO generator v2 (lib/seo/product-seo.ts).
 *
 *   npm run test:seo-product
 *
 * Pure functions only: no database, no network. Fixtures are reconstructed from
 * the production report's problem cases (Netis N3, Casio PTP-II, ASUS VZ24EHF,
 * Dell Latitude 3420-CORP 8GB vs 4GB, the "Intel processor brand" / "Default,
 * WPS button" / "Air Cooler type" / "POS Printer item" junk) plus one sample per
 * family. The raw production rows were not available, so names and spec labels
 * are plausible stand-ins for the shapes the report described.
 *
 * Asserts: model + type preserved, title <= 60, description 120-155, no junk
 * words, no price / stock / warranty claims, uniqueness inside a set,
 * determinism (also independent of input order), wording variants exist.
 */
import { readFileSync } from "node:fs";
import { formFactorOf, formFactorsIn } from "@/lib/catalog/form-factor";
import { extractGpuChipFromName, extractGpuMemoryFromName } from "@/lib/catalog/gpu-extract";
import { extractNameSpecs, plainNumber } from "@/lib/catalog/spec-extract";
import { PLAIN_WORDS, applyCasing, softenPlainWords, standardType } from "@/lib/seo/casing";
import { claimEvidence, findBadSpecPhrases, unsupportedClaims } from "@/lib/seo/claims";
import { countActions, decideApply, isStaleGenerated, rowsToWrite } from "@/lib/seo/product-seo-apply";
import {
  findBadChars,
  findZeroSpecs,
  generateProductSeo,
  generateProductSeoSet,
  hashId,
  isJunkValue,
  dropTitleRepeats,
  findFormFactorConflicts,
  pickSpecPhrases,
  pickSpecs,
  planSeoMetaWrite,
  resolveProductMeta,
  type SeoProductInput,
  type SeoResult,
  type SpecFact,
} from "@/lib/seo/product-seo";

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const equal = (name: string, actual: unknown, expected: unknown) =>
  check(name, actual === expected, `expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);

type Fx = SeoProductInput & { model: string[]; type: string };
let seq = 0;
function fx(
  brand: string, name: string, chain: string[], specs: [string, string, string?][],
  expect: { model: string[]; type: string }, extra: Partial<SeoProductInput> = {},
): Fx {
  seq += 1;
  return {
    id: `fx${seq}`, name, brand, categoryChain: chain, sku: `SKU-${seq}`, modelNumber: null,
    specs: specs.map(([label, value, key]) => ({ label, value, key })),
    ...extra, model: expect.model, type: expect.type,
  };
}

// --- fixtures ---------------------------------------------------------------

// The five failing cases from the production report.
const netis = fx("Netis", "Netis N3 AC1200 Wireless Dual Band Gigabit Router", ["Router", "Networking"],
  [["Wi-Fi Standard", "802.11ac"], ["Speed", "1200Mbps"], ["LAN Ports", "4"], ["Antennas", "4"]], { model: ["N3"], type: "Router" });
const casio = fx("Casio", "Casio Portable THERMAL Printer PTP-II", ["Printer", "Office Equipment"],
  [["Print Technology", "Thermal"], ["Print Speed", "60 ppm"], ["Connectivity", "USB"], ["Item", "POS Printer item"]], { model: ["PTP-II"], type: "Printer" });
const asus = fx("ASUS", "ASUS VZ24EHF 23.8 Inch FHD IPS 100Hz Eye Care Gaming", ["Monitor"],
  [["Display Size", "23.8 inch", "size"], ["Resolution", "1920x1080"], ["Refresh Rate", "100Hz"], ["Panel Type", "IPS", "panel"]], { model: ["VZ24EHF"], type: "Monitor" });
const dell8 = fx("Dell", "Dell Latitude 3420-CORP Core i5 11th Gen 8GB RAM 256GB SSD 14 Inch", ["All Laptop", "Laptop"],
  [["Processor", "Core i5-1135G7", "processor"], ["RAM", "8GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: ["3420"], type: "Laptop" });
const dell4 = fx("Dell", "Dell Latitude 3420-CORP Core i5 11th Gen 4GB RAM 256GB SSD 14 Inch", ["All Laptop", "Laptop"],
  [["Processor", "Core i5-1135G7", "processor"], ["RAM", "4GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: ["3420"], type: "Laptop" });

// Junk spec cases from the report.
const junkLaptop = fx("Acme", "Acme Zen 15 Laptop", ["Laptop"],
  [["Processor Brand", "Intel", "processor"], ["Features", "Default, WPS button"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Display", "15.6 inch", "size"], ["Processor", "Core i7-1255U", "processor"]], { model: ["Zen", "15"], type: "Laptop" });
const cooler = fx("DeepCool", "DeepCool AK400 Cooler", ["CPU Cooler", "Component"],
  [["Cooler Type", "Air", "coolerType"], ["Fan Size", "120mm", "size"], ["TDP", "220W"], ["Socket", "AM5", "socket"]], { model: ["AK400"], type: "CPU Cooler" });

// One per family.
const family: Fx[] = [
  fx("Lumen", "Lumen 14 Office Laptop", ["Laptop"], [["Processor", "Core 5", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: ["14"], type: "Laptop" }),
  fx("View", "View 27 QHD Monitor", ["Monitor"], [["Size", "27 inch", "size"], ["Resolution", "QHD"], ["Refresh Rate", "165Hz"], ["Panel", "IPS", "panel"]], { model: ["27"], type: "Monitor" }),
  fx("Volt", "Volt B650 Micro-ATX Board", ["Motherboard", "Component"], [["Socket", "AM5", "socket"], ["Chipset", "B650"], ["Form Factor", "Micro-ATX", "formFactor"], ["Memory Type", "DDR5", "ramType"]], { model: ["B650"], type: "Motherboard" }),
  fx("Volt", "Volt RTX 4060 Ti 8GB GDDR6 Dual", ["Graphics Card", "Component"], [["Graphics", "GeForce RTX 4060 Ti", "graphics"], ["Memory", "8GB GDDR6", "memory"], ["Interface", "PCIe 4.0"], ["Ports", "3 ports"]], { model: ["4060"], type: "Graphics Card" }),
  fx("AMD", "AMD Ryzen 5 7600X Processor", ["Processor", "Component"], [["Cores", "6 cores", "cores"], ["Threads", "12"], ["Base Clock", "4.7GHz"], ["Max Boost Clock", "5.3GHz"]], { model: ["7600X"], type: "Processor" }),
  fx("Corsair", "Corsair Vengeance 32GB DDR5 6000MHz CL30 Kit", ["RAM (Desktop)", "Component"], [["Capacity", "32GB", "capacity"], ["Memory Type", "DDR5", "ramType"], ["Speed", "6000MHz"]], { model: [], type: "RAM" }),
  fx("North", "North Prebuilt Desktop", ["Star PC", "Desktop"], [["Processor", "Core i5-12400", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"]], { model: [], type: "Desktop" }),
  fx("Canon", "0842C001AA # Canon PFI-51 Photo Cyan for PRO Series", ["Large Format Printer", "Office Equipment"], [["Print Technology", "Inkjet"], ["Media Width", "44 inch"], ["Print Resolution", "2400 x 1200 dpi"], ["Connectivity", "USB"]], { model: ["PFI-51"], type: "Large Format Printer" }),
  fx("Dahua", "DAHUA DH-HAC-B1A21P-U-IL-A 2MP SMART DUAL LIGHT HDCVI BULLET 30 MTR IR", ["IP Camera", "Security"], [["Resolution", "2MP"], ["Lens", "2.8mm"], ["IR Distance", "30m"], ["Type", "Bullet"]], { model: ["DH-HAC-B1A21P-U-IL-A"], type: "IP Camera" }),
  fx("Hikvision", "Hikvision DS-7616NI-K2 16 Channel NVR", ["NVR", "Security"], [["Channels", "16"], ["Max Resolution", "8MP"], ["HDD Bays", "2"], ["PoE", "Yes"]], { model: ["DS-7616NI-K2"], type: "NVR" }),
  fx("Cisco", "Cisco SG350-28 28-Port Gigabit Managed Switch", ["Switch", "Networking"], [["Ports", "28"], ["Speed", "1Gbps"], ["PoE", "No"]], { model: ["SG350-28"], type: "Switch" }),
  fx("Shell", "Shell Cat6 UTP Patch Cord 2m", ["UTP Cable", "Networking"], [["Category", "Cat6"], ["Length", "2 m"], ["Type", "UTP"], ["Connector", "RJ45"]], { model: [], type: "Cord" }),
  fx("Yealink", "Yealink SIP-T54W IP Phone", ["IP Phone"], [["SIP Accounts", "16"], ["Display", "4.3 inch", "size"], ["PoE", "Yes"], ["Connectivity", "Ethernet"]], { model: ["SIP-T54W"], type: "IP Phone" }),
  fx("Newline", "Newline TT-6521Q 65 Inch Interactive Flat Panel", ["Interactive Flat Panel"], [["Display Size", "65 inch", "size"], ["Resolution", "4K"], ["Touch Points", "20"], ["Connectivity", "HDMI"]], { model: ["TT-6521Q"], type: "Interactive Flat Panel" }),
  fx("Elgato", "Elgato HD60 X Capture Card", ["Capture Card"], [["Max Resolution", "4K 60fps"], ["Interface", "USB 3.0"], ["Connectivity", "HDMI"]], { model: ["HD60"], type: "Capture Card" }),
  fx("Samsung", "Samsung 980 Pro 1TB NVMe M.2", ["SSD", "Component"], [["Capacity", "1TB", "capacity"], ["Interface", "NVMe PCIe 4.0"], ["Read Speed", "7000 MB/s"], ["Form Factor", "M.2 2280"]], { model: ["980"], type: "SSD" }),
  fx("Corsair", "Corsair RM850x 850W 80+ Gold Fully Modular", ["Power Supply", "Component"], [["Wattage", "850W", "wattage"], ["Certification", "80 Plus Gold"], ["Modular", "Fully modular"]], { model: ["RM850x"], type: "Power Supply" }),
  fx("Logitech", "Logitech G502 X Wired Gaming Mouse", ["Mouse", "Accessories"], [["DPI", "25600 DPI"], ["Connectivity", "Wired"]], { model: ["G502"], type: "Mouse" }),
  fx("Hikvision", "Hikvision DS-K1T320EFWX-B Value Series Face Access Terminal", ["Access Control", "Security"], [["Display", "2.4 inch", "size"], ["Connectivity", "Ethernet"]], { model: ["DS-K1T320EFWX-B"], type: "Access Control" }),
];

const singles: Fx[] = [netis, casio, asus, dell8, junkLaptop, cooler, ...family];
const FORBIDDEN_AFTER_CLOSING = /\b(price|prices|stock|warranty|guarantee|genuine|official|order|buy|taka|bdt|tk)\b|৳|\d+\s*%/i;
const closingOf = (text: string) => text.slice(text.search(/(Check price|Price and availability)/));

// --- per-product properties ---------------------------------------------------

for (const item of singles) {
  const r = generateProductSeo(item);
  const where = `${item.brand} ${item.name.slice(0, 40)}`;
  check(`${where}: title <= 60`, r.title.length <= 60, `${r.title} (${r.title.length})`);
  check(`${where}: title keeps every model token`, item.model.every((m) => r.title.includes(m)), r.title);
  check(`${where}: title carries the product type`, r.title.toLowerCase().includes(item.type.toLowerCase().split(" ").pop() ?? ""), r.title);
  check(`${where}: title starts with the brand`, r.title.toLowerCase().startsWith(item.brand.toLowerCase()), r.title);
  check(`${where}: "Price in Bangladesh" or "Price in BD"`, /Price in (Bangladesh|BD)/.test(r.title), r.title);
  check(`${where}: alt includes brand + type`, r.imageAlt.toLowerCase().includes(item.brand.toLowerCase()) && r.imageAlt.toLowerCase().includes(item.type.toLowerCase().split(" ").pop() ?? ""), r.imageAlt);
  check(`${where}: alt <= 125`, r.imageAlt.length <= 125);
  check(`${where}: description 120-155`, r.metaDescription.length >= 120 && r.metaDescription.length <= 155, `${r.metaDescription} (${r.metaDescription.length})`);
  const specPart = r.metaDescription.slice(0, r.metaDescription.indexOf(closingOf(r.metaDescription)));
  check(`${where}: no price/stock/warranty/order claims in the spec part`, !FORBIDDEN_AFTER_CLOSING.test(specPart), specPart);
  check(`${where}: closing is neutral`, /price and availability/i.test(r.metaDescription) && /Delivery (in Dhaka and )?across Bangladesh\.$/.test(r.metaDescription) && !/in stock|order online|warranty|৳/i.test(r.metaDescription));
  check(`${where}: keyword`, r.primaryKeyword.endsWith("price in bangladesh") && r.primaryKeyword === r.primaryKeyword.toLowerCase());
  const again = generateProductSeo(item);
  check(`${where}: deterministic`, JSON.stringify(again) === JSON.stringify(r));
}

// --- the five failing cases, explicitly ----------------------------------------

equal("Netis N3 now says Router", /^Netis N3.* Router Price in Bangladesh/.test(generateProductSeo(netis).title), true);
check("Casio keeps PTP-II and Printer", /PTP-II/.test(generateProductSeo(casio).title) && /Printer/.test(generateProductSeo(casio).title), generateProductSeo(casio).title);
equal("ASUS VZ24EHF now says Monitor", /^ASUS VZ24EHF Monitor Price in Bangladesh/.test(generateProductSeo(asus).title), true);
{
  const [r8, r4] = generateProductSeoSet([dell8, dell4]);
  check("Dell 8GB vs 4GB: titles differ", r8 && r4 && r8.title !== r4.title, `${r8?.title} | ${r4?.title}`);
  check("Dell 8GB title carries 8GB, 4GB title carries 4GB", /8GB/.test(r8?.title ?? "") && /4GB/.test(r4?.title ?? ""), `${r8?.title} | ${r4?.title}`);
  check("Dell collision resolved, no review needed", !r8?.needsReview && !r4?.needsReview && r8?.collisionGroup === null);
  check("Dell titles still <= 60 with model + type", [r8, r4].every((r) => r && r.title.length <= 60 && /3420/.test(r.title) && !/CORP/.test(r.title) && /Laptop/.test(r.title)), `${r8?.title} | ${r4?.title}`);
}

// --- junk specs ----------------------------------------------------------------

{
  const r = generateProductSeo(junkLaptop);
  const text = r.metaDescription;
  check("junk: no 'processor brand'", !/processor brand/i.test(text), text);
  check("junk: no bare 'Intel processor'", !/\bIntel processor\b/i.test(text), text);
  check("junk: 'Default' / 'WPS button' dropped", !/default|wps/i.test(text), text);
  check("junk laptop still gets 3+ real specs", r.specsUsed.length >= 3 && r.specsUsed.some((s) => /Core i7/.test(s)), r.specsUsed.join(" | "));
  const c = generateProductSeo(cooler);
  check("junk: cooler type reads 'air cooler', not 'Air Cooler type'", /air cooler/.test(c.metaDescription) && !/Cooler type/i.test(c.metaDescription), c.metaDescription);
  const k = generateProductSeo(casio);
  check("junk: 'POS Printer item' dropped", !/\bitem\b/i.test(k.metaDescription) && !/POS Printer/i.test(k.metaDescription), k.metaDescription);
  check("Casio printer gets real specs in a natural phrase (thermal printer, 60ppm)", /thermal printer, 60ppm/.test(k.metaDescription), k.metaDescription);
}
for (const junk of ["Default", "N/A", "none", "Yes", "item", "POS Printer item", "Default, WPS button", "Air Air", "", "-", "0", "Intel"]) {
  check(`isJunkValue(${JSON.stringify(junk)})`, isJunkValue(junk, "Intel"), junk);
}
for (const good of ["16GB", "Core i7-1255U", "IPS", "1920x1080", "802.11ax"]) {
  check(`not junk: ${good}`, !isJunkValue(good, "Intel"));
}
check("phrases never repeat a word", pickSpecPhrases([{ label: "RAM", value: "16GB 16GB", key: "ram" }], "laptop", "X").length === 0);

// --- per-family spec templates --------------------------------------------------

{
  // Templates are checked on the full pick; how many fit in 155 chars is a separate check below.
  const picked = (f: Fx) => pickSpecPhrases(f.specs, generateProductSeo(f).family, f.brand);
  const monitor = generateProductSeo(family[1]!);
  check("monitor: size, resolution, refresh, panel", ["27 inch display", "QHD resolution", "165Hz refresh rate", "IPS panel"].every((s) => picked(family[1]!).includes(s)), picked(family[1]!).join(" | "));
  const mb = generateProductSeo(family[2]!);
  check("motherboard: socket, chipset, form factor, memory type", ["AM5 socket", "B650 chipset", "Micro-ATX form factor", "DDR5 memory"].every((s) => picked(family[2]!).includes(s)), picked(family[2]!).join(" | "));
  check("monitor and motherboard descriptions carry 3+ of their specs", monitor.specsUsed.length >= 3 && mb.specsUsed.length >= 3, `${monitor.specsUsed.length} / ${mb.specsUsed.length}`);
  const gpu = generateProductSeo(family[3]!);
  check("gpu: chip + VRAM", gpu.specsUsed[0]?.includes("RTX 4060 Ti") && gpu.specsUsed.some((s) => s === "8GB GDDR6"), gpu.specsUsed.join(" | "));
  const cpu = generateProductSeo(family[4]!);
  check("processor: cores, threads, base/boost", ["6 cores", "12 threads", "4.7GHz base", "5.3GHz boost"].every((s) => picked(family[4]!).includes(s)), picked(family[4]!).join(" | "));
  check("processor description carries 3+ specs", cpu.specsUsed.length >= 3, cpu.specsUsed.join(" | "));
  const lap = generateProductSeo(family[0]!);
  check("laptop: CPU, RAM, storage, display", ["Core 5", "16GB RAM", "512GB SSD", "14 inch display"].every((s) => lap.specsUsed.includes(s)), lap.specsUsed.join(" | "));
  const desk = generateProductSeo(family[6]!);
  check("desktop: type not repeated for a 'Star PC' leaf", desk.title.startsWith("North Prebuilt Desktop Price") && !/Star PC/.test(desk.title), desk.title);
  const ram = generateProductSeo(family[5]!);
  check("ram: type RAM shown, 'RAM (Desktop)' qualifier gone", /RAM/.test(ram.title) && !/\(/.test(ram.title), ram.title);
  const nvr = generateProductSeo(family[9]!);
  check("nvr: channels, resolution, bays, PoE", ["16-channel", "8MP", "2 HDD bays", "PoE support"].every((s) => nvr.specsUsed.includes(s)), nvr.specsUsed.join(" | "));
  const sw = generateProductSeo(family[10]!);
  check("switch: PoE 'No' is not turned into a claim", !/PoE/.test(sw.metaDescription), sw.metaDescription);
  const sparse = family.filter((f) => generateProductSeo(f).specsUsed.length < 3);
  // Only fixtures with fewer than 3 facts in the first place may end up under 3.
  // A long model core leaves little room in 155 characters; those keep 2 specs (flagged few_specs) instead of a cut model name.
  // v2.3: a spec the title already says ("Cat6 UTP 2m" in the title) is not repeated in the description, so it no longer counts here.
  const newInTitle = (f: Fx) => dropTitleRepeats(pickSpecs(f.specs, generateProductSeo(f).family, f.brand), generateProductSeo(f).titleCore).length;
  check("fixtures with 3+ real facts reach 3+ specs unless the model core is long or the title already says them", sparse.every((f) => newInTitle(f) < 3 || generateProductSeo(f).titleCore.length >= 38), sparse.map((f) => `${f.name} [${generateProductSeo(f).specsUsed.length}/${picked(f).length}/${newInTitle(f)}]`).join(" | "));
  const gpuTitle = generateProductSeo(family[3]!).title;
  check("model suffix kept: RTX 4060 Ti", /RTX 4060 Ti/.test(gpuTitle), gpuTitle);
  check("'28-Port' is a spec, not a model code", generateProductSeo(family[10]!).title.startsWith("Cisco SG350-28 Switch"), generateProductSeo(family[10]!).title);
}

// --- long names: model + type are never cut ------------------------------------

{
  const long = fx("Hikvision", "Hikvision DS-2CD2T47G2-L Ultra Premium Colorvu Fixed Bullet Network Camera With Extra Long Series Name", ["IP Camera", "Security"], [["Resolution", "4MP"]], { model: ["DS-2CD2T47G2-L"], type: "IP Camera" });
  const r = generateProductSeo(long);
  check("long name: model and type kept, <= 60", r.title.length <= 60 && r.title.includes("DS-2CD2T47G2-L") && /Camera/.test(r.title), r.title);
  const huge = fx("Brand", "Brand SuperLongProductLineName ExtendedEditionSeries ABCDEFGH-1234567890-XYZ", ["Ultra Long Product Type Category Name"], [], { model: ["ABCDEFGH-1234567890-XYZ"], type: "Category Name" });
  const h = generateProductSeo(huge);
  check("impossible title: model + type kept, flagged for review", h.title.includes("ABCDEFGH-1234567890-XYZ") && h.flags.includes("title_over_60") && h.needsReview, `${h.title} ${h.flags.join(",")}`);
  const bd = fx("Hikvision", "Hikvision DS-K1T320EFWX-B Value Series Face Access Terminal", ["Access Control", "Security"], [], { model: ["DS-K1T320EFWX-B"], type: "Access Control" });
  check("falls back to 'Price in BD' before cutting model/type", /Price in (Bangladesh|BD)/.test(generateProductSeo(bd).title) && generateProductSeo(bd).title.includes("DS-K1T320EFWX-B"));
  check("brand suffix only when it fits", singles.every((s) => { const t = generateProductSeo(s).title; return !t.includes(" | Techno House") || t.length <= 60; }));
}

// --- sets: uniqueness, collisions, determinism ----------------------------------

{
  const cyan = family[7]!;
  const magenta = fx("Canon", "0843C001AA # Canon PFI-51 Photo Magenta for PRO Series", ["Large Format Printer", "Office Equipment"], [["Print Technology", "Inkjet"], ["Media Width", "44 inch"], ["Print Resolution", "2400 x 1200 dpi"], ["Connectivity", "USB"]], { model: ["PFI-51"], type: "Large Format Printer" });
  const set = generateProductSeoSet([cyan, magenta, dell8, dell4, netis, asus]);
  const titles = set.map((r) => r.title.toLowerCase());
  check("set: all titles unique", new Set(titles).size === titles.length, titles.join(" | "));
  check("set: ink colours resolved by colour or part code", set[0] && set[1] && set[0].title !== set[1].title && !set[0].needsReview, `${set[0]?.title} | ${set[1]?.title}`);
  check("set: results keep input order and ids", set.map((r) => r.id).join() === [cyan, magenta, dell8, dell4, netis, asus].map((x) => x.id).join());
  const shuffled = generateProductSeoSet([asus, dell4, netis, magenta, dell8, cyan]);
  const byId = (list: typeof set) => Object.fromEntries(list.map((r) => [r.id, r.title]));
  check("set: same titles whatever the input order", JSON.stringify(byId(set)) === JSON.stringify(Object.fromEntries(Object.entries(byId(shuffled)).sort())) || Object.entries(byId(set)).every(([id, title]) => byId(shuffled)[id] === title));

  const twinA = fx("Twin", "Twin X100 Laptop", ["Laptop"], [["RAM", "8GB", "ram"]], { model: ["X100"], type: "Laptop" }, { sku: "A" });
  const twinB = fx("Twin", "Twin X100 Laptop", ["Laptop"], [["RAM", "8GB", "ram"]], { model: ["X100"], type: "Laptop" }, { sku: "A" });
  const clash = generateProductSeoSet([twinA, twinB]);
  check("identical products: needs_review + shared collision group", clash.every((r) => r.needsReview && r.flags.includes("title_collision")) && clash[0]?.collisionGroup === clash[1]?.collisionGroup && clash[0]?.collisionGroup !== null, JSON.stringify(clash.map((r) => [r.title, r.collisionGroup])));
  // A code separates twins only when it is IN the raw name (the POS code). A different SKU / modelNumber field never does.
  const twinC = { ...twinB, id: "fxC", sku: "B-77", modelNumber: "GIG-X100-5" };
  const bySku = generateProductSeoSet([twinA, twinC]);
  check("twins that differ only by SKU / modelNumber stay colliding (needs_review), no foreign code used", bySku.every((r) => r.needsReview && r.flags.includes("title_collision") && !/B-77|GIG-X100-5|SKU-/i.test(r.title)), bySku.map((r) => r.title).join(" | "));
  const posA = { ...twinA, id: "posA", name: "0842C001AA # Twin X100 Laptop" };
  const posB = { ...twinA, id: "posB", name: "0843C001AA # Twin X100 Laptop" };
  const byCode = generateProductSeoSet([posA, posB]);
  check("twins with different POS codes in the raw name are split by that code", byCode[0]?.title !== byCode[1]?.title && !byCode.some((r) => r.needsReview) && /0842C001AA/.test(byCode[0]?.title ?? "") && /0843C001AA/.test(byCode[1]?.title ?? ""), `${byCode[0]?.title} | ${byCode[1]?.title}`);
}

// --- wording variants ----------------------------------------------------------

{
  const many = Array.from({ length: 40 }, (_, i) => fx("Lumen", `Lumen ${100 + i} Office Laptop`, ["Laptop"],
    [["Processor", "Core 5", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: [], type: "Laptop" }));
  const outs = many.map((m) => generateProductSeo(m).metaDescription);
  const closings = new Set(outs.map((t) => closingOf(t)));
  check("3-4 closing variants across 40 products", closings.size >= 3 && closings.size <= 4, [...closings].join(" || "));
  const leads = new Set(outs.map((t) => t.replace(/Lumen \d+ Office Laptop/, "X").split(/[:–]|with | specs/)[0]));
  check("lead wording varies too", leads.size >= 2, [...leads].join(" || "));
  check("all variants within 120-155", outs.every((t) => t.length >= 120 && t.length <= 155), outs.filter((t) => t.length < 120 || t.length > 155).join(" | "));
  check("hashId is stable", hashId("abc") === hashId("abc") && hashId("abc") !== hashId("abd"));
}


// =============================================================================
// v2.1: model identity (production dry-run findings, 413 products)
// =============================================================================

type Model = {
  brand: string; name: string; chain: string[]; specs: [string, string, string?][];
  /** Tokens that must be in the title, as whole tokens (case-insensitive). */
  must: string[];
  /** The product-type word the title must carry (the raw name's own word when it has one). */
  type: string;
  /** Words that must NOT be in the title. */
  never?: string[];
  title?: string;
  extra?: Partial<SeoProductInput>;
};
const modelFx: Model[] = [
  // --- the five real production samples -----------------------------------------
  { brand: "GIGABYTE", name: "GIGABYTE AMD X870M A ELITE WF7, Socket AM5, 4 x DDR5 DIMM, Micro ATX", chain: ["Motherboard", "Component"], must: ["X870M", "A", "ELITE", "WF7"], type: "Motherboard", title: "GIGABYTE AMD X870M A ELITE WF7 Motherboard Price in BD",
    specs: [["Socket", "AM5", "socket"], ["Chipset", "X870"], ["Form Factor", "Micro-ATX", "formFactor"], ["Memory Type", "DDR5", "ramType"]] },
  { brand: "GIGABYTE", name: "GIGABYTE AMD B550M H ARGB, Socket AM4, 4 x DDR4 DIMM", chain: ["Motherboard", "Component"], must: ["B550M", "H", "ARGB"], type: "Motherboard", never: ["GIG-B550M-5"], title: "GIGABYTE AMD B550M H ARGB Motherboard Price in Bangladesh",
    specs: [["Socket", "AM4", "socket"], ["Chipset", "B550"], ["Form Factor", "Micro-ATX", "formFactor"], ["Memory Type", "DDR4", "ramType"], ["Model Number", "GIG-B550M-5"]], extra: { sku: "GIG-B550M-5", modelNumber: "GIG-B550M-5" } },
  { brand: "Corsair", name: "Corsair HS50 PRO STEREO Gaming Headset — Blue, CA-9011217-AP", chain: ["Headphone", "Accessories"], must: ["HS50", "PRO", "STEREO"], type: "Headset", never: ["Headphone"], title: "Corsair HS50 PRO STEREO Gaming Headset Price in Bangladesh",
    specs: [["Type", "Over-ear"], ["Connectivity", "Wired", "connectivity"], ["Microphone", "Built-in microphone", "microphone"]] },
  { brand: "GIGABYTE", name: "GIGABYTE Intel Chipset B760M DS3H DDR4, Socket LGA1700, 4 x DDR4 DIMM", chain: ["Motherboard", "Component"], must: ["B760M", "DS3H", "DDR4"], type: "Motherboard",
    specs: [["Socket", "LGA1700", "socket"], ["Chipset", "B760"], ["Form Factor", "Micro-ATX", "formFactor"], ["Memory Type", "DDR4", "ramType"]] },
  // --- varied products ----------------------------------------------------------
  { brand: "Dell", name: "Dell Latitude 3420-CORP Core i5 11th Gen 8GB RAM 256GB SSD 14 Inch", chain: ["All Laptop", "Laptop"], must: ["Latitude", "3420"], type: "Laptop",
    specs: [["Processor", "Core i5-1135G7", "processor"], ["RAM", "8GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "14 inch", "size"]] },
  { brand: "HP", name: "HP ProBook 450 G9 Core i5-1235U 16GB 512GB 15.6 inch", chain: ["All Laptop", "Laptop"], must: ["ProBook", "450", "G9"], type: "Laptop",
    specs: [["Processor", "Core i5-1235U", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Display", "15.6 inch", "size"]] },
  { brand: "ASUS", name: "ASUS TUF Gaming F15 FX506HF Core i5-11400H 8GB, 512GB SSD, RTX 2050", chain: ["Gaming Laptop", "Laptop"], must: ["TUF", "Gaming", "F15", "FX506HF"], type: "Laptop",
    specs: [["Processor", "Core i5-11400H", "processor"], ["RAM", "8GB", "ram"], ["Storage", "512GB SSD", "storage"], ["Graphics", "GeForce RTX 2050", "graphics"]] },
  { brand: "Apple", name: "Apple MacBook Air 13 inch M2 8GB 256GB", chain: ["All Laptop", "Laptop"], must: ["MacBook", "Air"], type: "Laptop",
    specs: [["Processor", "Apple M2", "processor"], ["RAM", "8GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "13.6 inch", "size"]] },
  { brand: "LG", name: "LG 27UP850K-W 27 Inch 4K UHD IPS Monitor with USB-C", chain: ["Monitor"], must: ["27UP850K-W"], type: "Monitor",
    specs: [["Display Size", "27 inch", "size"], ["Resolution", "3840x2160"], ["Panel Type", "IPS", "panel"], ["Refresh Rate", "60Hz"]] },
  { brand: "ASUS", name: "ASUS VZ24EHF 23.8 Inch FHD IPS 100Hz Eye Care Gaming", chain: ["Monitor"], must: ["VZ24EHF"], type: "Monitor",
    specs: [["Display Size", "23.8 inch", "size"], ["Resolution", "1920x1080"], ["Refresh Rate", "100Hz"], ["Panel Type", "IPS", "panel"]] },
  { brand: "Netis", name: "Netis N3 AC1200 Wireless Dual Band Gigabit Router", chain: ["Router", "Networking"], must: ["N3", "AC1200"], type: "Router", title: "Netis N3 AC1200 Router Price in Bangladesh | Techno House",
    specs: [["Wi-Fi Standard", "802.11ac"], ["Speed", "1200Mbps"], ["LAN Ports", "4"]] },
  { brand: "TP-Link", name: "TP-Link Archer AX55 AX3000 Dual-Band Wi-Fi 6 Router, 4 x Gigabit Ports", chain: ["Router", "Networking"], must: ["Archer", "AX55", "AX3000"], type: "Router",
    specs: [["Wi-Fi Standard", "Wi-Fi 6"], ["Speed", "3000Mbps"], ["LAN Ports", "4"]] },
  { brand: "Hikvision", name: "Hikvision DS-7616NI-K2 16 Channel 4K NVR with 2 SATA", chain: ["NVR", "Security"], must: ["DS-7616NI-K2", "16"], type: "NVR",
    specs: [["Channels", "16"], ["Max Resolution", "8MP"], ["HDD Bays", "2"], ["PoE", "Yes"]] },
  { brand: "HP", name: "HP LaserJet Pro M404dn Printer, 38ppm, Duplex", chain: ["Printer", "Office Equipment"], must: ["LaserJet", "Pro", "M404dn"], type: "Printer",
    specs: [["Print Technology", "Laser"], ["Print Speed", "38 ppm"], ["Connectivity", "USB"], ["Paper Size", "A4"]] },
  { brand: "Casio", name: "Casio Portable THERMAL Printer PTP-II", chain: ["Printer", "Office Equipment"], must: ["Portable", "THERMAL", "PTP-II"], type: "Printer",
    specs: [["Print Technology", "Thermal"], ["Print Speed", "60 ppm"], ["Connectivity", "USB"]] },
  { brand: "DeepCool", name: "DeepCool AK400 Digital CPU Air Cooler", chain: ["CPU Cooler", "Component"], must: ["AK400"], type: "Cooler",
    specs: [["Cooler Type", "Air", "coolerType"], ["Fan Size", "120mm", "size"], ["TDP", "220W"]] },
  { brand: "Cooler Master", name: "Cooler Master Hyper 212 Black Edition CPU Cooler, 120mm Fan", chain: ["CPU Cooler", "Component"], must: ["Hyper", "212", "Black", "Edition"], type: "Cooler",
    specs: [["Cooler Type", "Air", "coolerType"], ["Fan Size", "120mm", "size"], ["Socket", "AM5", "socket"]] },
  { brand: "HyperX", name: "HyperX Cloud II Wireless Gaming Headset — Black/Red", chain: ["Headphone", "Accessories"], must: ["Cloud", "II", "Gaming"], type: "Headset", never: ["Headphone"],
    specs: [["Connectivity", "Wireless", "connectivity"], ["Type", "Over-ear"], ["Microphone", "Detachable microphone", "microphone"]] },
  { brand: "Logitech", name: "Logitech G335 Wired Gaming Headset, 3.5mm", chain: ["Headphone", "Accessories"], must: ["G335", "Gaming"], type: "Headset", never: ["Headphone"],
    specs: [["Connectivity", "Wired", "connectivity"], ["Type", "Over-ear"], ["Microphone", "Yes", "microphone"]] },
  { brand: "Corsair", name: "Corsair HS80 RGB WIRELESS Premium Gaming Headset with Dolby Atmos", chain: ["Headphone", "Accessories"], must: ["HS80", "RGB", "Premium", "Gaming"], type: "Headset", never: ["Headphone"],
    specs: [["Connectivity", "Wireless", "connectivity"], ["Type", "Over-ear"], ["Microphone", "Built-in microphone", "microphone"]] },
  { brand: "Logitech", name: "Logitech G502 X LIGHTSPEED Wireless Gaming Mouse", chain: ["Mouse", "Accessories"], must: ["G502", "X", "LIGHTSPEED"], type: "Mouse",
    specs: [["Connectivity", "Wireless", "connectivity"], ["DPI", "25600 DPI"]] },
  { brand: "APC", name: "APC Back-UPS BX1100LI-MS 1100VA UPS", chain: ["UPS", "Power"], must: ["Back-UPS", "BX1100LI-MS"], type: "UPS",
    specs: [["Capacity", "1100VA"]] },
  { brand: "Samsung", name: "Samsung 980 Pro 1TB NVMe M.2 SSD", chain: ["SSD", "Component"], must: ["980", "Pro"], type: "SSD",
    specs: [["Capacity", "1TB", "capacity"], ["Interface", "NVMe PCIe 4.0"], ["Read Speed", "7000 MB/s"]] },
  { brand: "Gigabyte", name: "Gigabyte GeForce RTX 4060 Ti GAMING OC 8GB GDDR6", chain: ["Graphics Card", "Component"], must: ["RTX", "4060", "Ti", "GAMING", "OC"], type: "Graphics Card",
    specs: [["Graphics", "GeForce RTX 4060 Ti", "graphics"], ["Memory", "8GB GDDR6", "memory"], ["Interface", "PCIe 4.0"]] },
  { brand: "Dahua", name: "DAHUA DH-HAC-B1A21P-U-IL-A 2MP SMART DUAL LIGHT HDCVI BULLET 30 MTR IR", chain: ["IP Camera", "Security"], must: ["DH-HAC-B1A21P-U-IL-A"], type: "IP Camera",
    specs: [["Resolution", "2MP"], ["Lens", "2.8mm"], ["IR Distance", "30m"], ["Type", "Bullet"]] },
  { brand: "Hikvision", name: "Hikvision DS-K1T320EFWX-B Value Series Face Access Terminal", chain: ["Access Control", "Security"], must: ["DS-K1T320EFWX-B"], type: "Access Control",
    specs: [["Display", "2.4 inch", "size"], ["Connectivity", "Ethernet"]] },
  // --- shapes found in the real catalogue --------------------------------------
  { brand: "Uniview", name: "Uniview IPC2314LE-ADF40KM-WP:High quality image with 4MP, 1/1.8\"CMOS sensor and F1.0 large aperture lens,Built-in mic", chain: ["IP Camera", "Security"], must: ["IPC2314LE-ADF40KM-WP"], type: "IP Camera", never: ["High", "quality"],
    specs: [["Resolution", "4MP"], ["Lens", "4mm"], ["IR Distance", "40m"]] },
  { brand: "Smart", name: "1.5 Ton Split Type Non-Inverter,SEA-118SS", chain: ["AC", "Appliance"], must: ["SEA-118SS", "Ton"], type: "AC",
    specs: [["Capacity", "1.5 Ton"], ["Type", "Split"]] },
  { brand: "Huawei", name: "WS5203-22 128MB+128MB White 1200Mbps ShaT OM", chain: ["Router", "Networking"], must: ["WS5203-22"], type: "Router", never: ["128MB", "ShaT"],
    specs: [["Speed", "1200Mbps"]] },
  { brand: "Vivanco", name: "VCCCUU6RPVB1 # Corporate CAT6 U/UTP Patch Cord Unshielded Blue 1M", chain: ["UTP Cable", "Networking"], must: ["Corporate", "CAT6", "U/UTP", "Patch", "Cord"], type: "Cord",
    specs: [["Category", "Cat6"], ["Length", "1 m"], ["Type", "UTP"]] },
  { brand: "Hikvision", name: "Hikvision DS-K1201AEF Biometric fingerprint and EM card reader", chain: ["Access Control", "Security"], must: ["DS-K1201AEF"], type: "Access Control",
    specs: [["Connectivity", "Ethernet"]] },
  { brand: "Prolink", name: "Prolink 3300VA Offline UPS (PRO3300SFCU)", chain: ["UPS", "Power"], must: ["3300VA", "UPS"], type: "UPS", never: ["PRO3300SFCU"],
    specs: [["Capacity", "3300VA"]] },
  { brand: "Smart PC", name: "SMART Flairedge Laptop (i7G12-16”-Silver), Intel® Core™ i7-1255U (Max Turbo Frequency 4.4 GHz)", chain: ["All Laptop", "Laptop"], must: ["Flairedge", "Laptop"], type: "Laptop", never: ["Smart PC", "i7G12"],
    specs: [["Processor", "Core i7-1255U", "processor"], ["RAM", "16GB", "ram"], ["Storage", "512GB SSD", "storage"]] },
  { brand: "Corsair", name: "CORSAIR POWER SUPPLY RM750 — 750 Watt 80 PLUS Gold Fully Modular ATX PSU # CP-9020234-UK", chain: ["Power Supply", "Component"], must: ["RM750", "Power", "Supply"], type: "Supply", never: ["SUPPLY", "CP-9020234-UK"],
    specs: [["Wattage", "750W", "wattage"], ["Certification", "80 Plus Gold"], ["Modular", "Fully modular"]] },
  // --- same chipset (B650), different model lines ------------------------------
  ...[
    ["GIGABYTE", "GIGABYTE B650 AORUS ELITE AX, Socket AM5, DDR5", ["B650", "AORUS", "ELITE", "AX"]],
    ["GIGABYTE", "GIGABYTE B650 GAMING X AX V2, Socket AM5, DDR5", ["B650", "GAMING", "X", "AX", "V2"]],
    ["GIGABYTE", "GIGABYTE B650M DS3H, Socket AM5, Micro ATX", ["B650M", "DS3H"]],
    ["ASUS", "ASUS TUF GAMING B650-PLUS WIFI, Socket AM5, DDR5", ["TUF", "GAMING", "B650-PLUS", "WIFI"]],
    ["ASUS", "ASUS PRIME B650M-A WIFI II, Socket AM5", ["PRIME", "B650M-A", "WIFI", "II"]],
    ["MSI", "MSI PRO B650M-P, Socket AM5", ["PRO", "B650M-P"]],
    ["MSI", "MSI MAG B650 TOMAHAWK WIFI, Socket AM5", ["MAG", "B650", "TOMAHAWK", "WIFI"]],
  ].map(([brand, name, must]) => ({
    brand: brand as string, name: name as string, chain: ["Motherboard", "Component"], must: must as string[], type: "Motherboard",
    specs: [["Socket", "AM5", "socket"], ["Chipset", "B650"], ["Memory Type", "DDR5", "ramType"]] as [string, string, string?][],
  })),
];

const toInput = (m: Model, i: number): SeoProductInput => ({
  id: `m${i}`, name: m.name, brand: m.brand, categoryChain: m.chain, sku: `MSKU-${i}`, modelNumber: null,
  specs: m.specs.map(([label, value, key]) => ({ label, value, key })), ...(m.extra ?? {}),
});
const inputs = modelFx.map(toInput);
const set = generateProductSeoSet(inputs);
const words = (text: string) => text.toLowerCase().split(/\s+/);

modelFx.forEach((m, i) => {
  const r = generateProductSeo(inputs[i]!);
  const inSet = set[i]!;
  const where = `model fx: ${m.name.slice(0, 48)}`;
  for (const token of m.must) {
    check(`${where}: keeps model token "${token}"`, words(r.title).includes(token.toLowerCase()), r.title);
  }
  check(`${where}: no model token lost, nothing flagged`, r.modelTokensLost.length === 0 && !r.flags.includes("model_token_lost") && !r.flags.includes("foreign_code") && !r.needsReview, `${r.flags.join(",")} | ${r.title}`);
  check(`${where}: title <= 60`, r.title.length <= 60, `${r.title} (${r.title.length})`);
  check(`${where}: carries the product-type word "${m.type}"`, r.title.toLowerCase().includes(m.type.toLowerCase()), r.title);
  for (const word of m.never ?? []) check(`${where}: never "${word}"`, !r.title.includes(word) && !r.metaDescription.includes(word) && !r.imageAlt.includes(word), `${r.title} | ${r.metaDescription}`);
  if (m.title) equal(`${where}: exact title`, r.title, m.title);
  // keyword = the title's core (brand + model core + type) + " price in bangladesh"
  check(`${where}: keyword = title core`, r.primaryKeyword === `${r.titleCore.toLowerCase()} price in bangladesh` && r.title.toLowerCase().startsWith(r.titleCore.toLowerCase()), `${r.primaryKeyword} vs ${r.title}`);
  check(`${where}: secondary keywords follow the same core`, r.secondaryKeywords.slice(0, 3).every((k) => k.startsWith(r.titleCore.toLowerCase())), r.secondaryKeywords.join(" | "));
  check(`${where}: alt = title core`, r.imageAlt === r.titleCore);
  // never a code that is not in the raw name (SKU "MSKU-n", modelNumber, "GIG-B550M-5" ...)
  const rawTokens = new Set(`${m.name} ${m.brand}`.toLowerCase().split(/[\s,:|(]+/).flatMap((t) => [t, t.replace(/(?:-(?:corp|brac|supp|bg|asa))+-?$/, "")]).map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean));
  const titleCodes = r.title.replace(/ \| Techno House$/, "").split(/\s+/).filter((t) => /\d/.test(t) && !/^(?:Price|in|BD|Bangladesh)$/.test(t));
  const foreign = titleCodes.filter((t) => !rawTokens.has(t.toLowerCase().replace(/[^a-z0-9]/g, "")));
  check(`${where}: every digit-bearing token of the title is in the raw name`, foreign.length === 0, `foreign: ${foreign.join(" ")} | ${r.title}`);
  // description grammar: "with" only before a noun phrase we wrote ("with built-in mic[rophone]"); never "with <adjective list>"
  const desc = r.metaDescription.slice(r.titleCore.length);
  check(`${where}: no "with <bare adjective list>"`, !/\bwith\b(?! (?:built-in )?mic)/i.test(desc) && !/, with\b/i.test(desc), r.metaDescription);
  check(`${where}: description 120-155 and neutral`, r.metaDescription.length >= 120 && r.metaDescription.length <= 155 && !/\b(in stock|warranty|order online|৳|genuine)\b/i.test(r.metaDescription), `${r.metaDescription} (${r.metaDescription.length})`);
  check(`${where}: the whole-set result keeps the model tokens too`, m.must.every((t) => words(inSet.title).includes(t.toLowerCase())), inSet.title);
});

// uniqueness inside the whole fixture set, and across the same-chipset boards
{
  const junk = generateProductSeo({ id: "junk1", name: "HO/Rabbi_Max International_DAI Global UK Ltd-NREP_Microsoft 365 Business Standard_MWP_QTY_11_June_Usage'26_MS-NREP-STB-250326", brand: "Microsoft", categoryChain: ["Operating System", "Software"], specs: [] });
  const decision = decideApply(junk, { metaTitle: null, metaDescription: null, seoSource: null }, { allowFewSpecs: true });
  check("a junk licence-style name is never written (title over 60 -> skip)", decision.write === false && junk.needsReview, `${junk.title} | ${decision.action}`);
  check("...and its title is not cut to hide the problem", junk.title.length > 60 && junk.flags.includes("title_over_60"), `${junk.title} (${junk.title.length})`);
}
check("model fixtures: all titles unique", new Set(set.map((r) => r.title.toLowerCase())).size === set.length, set.map((r) => r.title).join("\n  "));
check("model fixtures: nothing in the set needs review", set.every((r) => !r.needsReview), set.filter((r) => r.needsReview).map((r) => `${r.title} [${r.flags.join(",")}]`).join(" | "));
check("model fixtures: all keywords unique", new Set(set.map((r) => r.primaryKeyword)).size === set.length);
{
  const boards = set.slice(-7).map((r) => r.title);
  check("7 B650 boards with different model lines keep their own line words", new Set(boards).size === 7 && boards.every((t) => /B650/i.test(t)), boards.join(" | "));
}
// v2.4: "Over-ear" is a stored spec ROW and stays; "Wired" and the built-in microphone exist only as ATTRIBUTES (the import
// script's guesses) and the name says neither, so those two claims are dropped (they were "wired over-ear headset with built-in microphone").
{
  const hs50 = generateProductSeo(inputs[2]!);
  check("the five production samples: headset keeps the row's over-ear and drops the attribute-only claims", /over-ear headset\./.test(hs50.metaDescription) && !/micro|wired|built-in/i.test(hs50.metaDescription) && hs50.unsupportedClaims.includes("microphone") && hs50.unsupportedClaims.includes("wired") && hs50.flags.includes("unsupported_claim"), `${hs50.metaDescription} :: ${hs50.unsupportedClaims.join()}`);
  check("the five production samples: headset title unchanged", hs50.title === "Corsair HS50 PRO STEREO Gaming Headset Price in Bangladesh", hs50.title);
}
check("monitor description: '27 inch 3840x2160 IPS monitor, 60Hz'", /27 inch 3840x2160 IPS monitor, 60Hz/.test(generateProductSeo(inputs[modelFx.findIndex((m) => m.name.startsWith("LG 27UP"))]!).metaDescription), generateProductSeo(inputs[modelFx.findIndex((m) => m.name.startsWith("LG 27UP"))]!).metaDescription);
check("generator is deterministic and order-independent for the v2.1 set", JSON.stringify(generateProductSeoSet([...inputs].reverse()).reverse().map((r) => r.title)) === JSON.stringify(set.map((r) => r.title)));

{
  // "Processor" in this motherboard's name is a modifier (the CPU series it supports), not its type: the category's
  // type wins, and because the core is kept whole the title cannot fit in 60, so the row is refused for review.
  const r = generateProductSeo({ id: "ultra1", name: "GIGABYTE INTEL® ULTRA Series Processor # Z890 UD WIFI6E, Digital twin 12+1+2 phases VRM solution", brand: "Gigabyte", categoryChain: ["Motherboard", "Component"], specs: [] });
  check("name's own type word that disagrees with the category is not used (Motherboard, not Processor)", /Motherboard/.test(r.title) && r.type === "Motherboard", `${r.title} | ${r.type}`);
  check("...and the over-long title is refused, not cut", r.flags.includes("title_over_60") && r.needsReview && ["Z890", "UD", "WIFI6E", "ULTRA", "Series"].every((t) => r.title.includes(t)), `${r.title} [${r.flags.join(",")}]`);
}
{
  const board = (id: string, ddr: string) => ({ id, name: `Gigabyte Intel Chipset Z790 AORUS ELITE ${ddr} 13th & 12th Gen ATX Motherboard Supported CPU: 13th Gen`, brand: "Gigabyte", categoryChain: ["Motherboard", "Component"], specs: [{ label: "Socket", value: "LGA1700", key: "socket" }] });
  const [d4, d5] = generateProductSeoSet([board("z4", "DDR4"), board("z5", "DDR5")]);
  check("same board line, DDR4 vs DDR5 (the generation sits after the cut): separated by it, not merged", d4 && d5 && d4.title !== d5.title && /DDR4/.test(d4.title) && /DDR5/.test(d5.title) && !d4.needsReview, `${d4?.title} | ${d5?.title}`);
}

// Apple M1 vs M2 share a model core; the CPU attribute separates them.
{
  const mac = (id: string, cpu: string) => ({ id, name: "Apple MacBook Air 13 inch 8GB 256GB", brand: "Apple", categoryChain: ["All Laptop", "Laptop"], specs: [{ label: "Processor", value: cpu, key: "processor" }, { label: "RAM", value: "8GB", key: "ram" }] });
  const [m1, m2] = generateProductSeoSet([mac("mac1", "Apple M1"), mac("mac2", "Apple M2")]);
  check("MacBook Air M1 vs M2: separated by the CPU attribute", m1 && m2 && m1.title !== m2.title && /M1/.test(m1.title) && /M2/.test(m2.title) && !m1.needsReview, `${m1?.title} | ${m2?.title}`);
}

// --- the safety gate -------------------------------------------------------------------
{
  const ok = generateProductSeo(inputs[0]!);
  const specsFor = { ...ok };
  const stored = { metaTitle: null, metaDescription: null, seoSource: null };
  equal("decideApply: a clean result is written", decideApply(ok, stored).action, "write");
  const lost: SeoResult = { ...specsFor, modelTokensLost: ["A", "ELITE", "WF7"], flags: [...ok.flags, "model_token_lost"], needsReview: true };
  const lostDecision = decideApply(lost, stored);
  check("decideApply: model_token_lost -> skip, never written", lostDecision.action === "skip: model_token_lost" && lostDecision.write === false, lostDecision.action);
  check("decideApply: model_token_lost beats --overwrite", decideApply(lost, { metaTitle: "x", metaDescription: "y", seoSource: "admin" }, { overwrite: true }).write === false);
  check("decideApply: model_token_lost beats 'unchanged'", decideApply(lost, { metaTitle: ok.title, metaDescription: ok.metaDescription, seoSource: "generated" }).action === "skip: model_token_lost (generated text stays live)");
  check("decideApply: foreign_code -> skip", decideApply({ ...ok, flags: [...ok.flags, "foreign_code"], needsReview: true }, stored).action === "skip: foreign_code");
  check("decideApply: hand-written text is kept without --overwrite", decideApply(ok, { metaTitle: "Mine", metaDescription: null, seoSource: "admin" }).action === "skip: written by hand (use --overwrite)");
  check("decideApply: --overwrite replaces it", decideApply(ok, { metaTitle: "Mine", metaDescription: null, seoSource: "admin" }, { overwrite: true }).write === true);
  const counts = countActions([lostDecision, lostDecision, decideApply(ok, stored)]);
  check("countActions groups and orders rows (the dry-run summary lines)", counts[0]?.[0] === "skip: model_token_lost" && counts[0]?.[1] === 2 && counts[1]?.[0] === "write");
}


// =============================================================================
// v2.2: generator hygiene (production dry-run, 387 products)
// =============================================================================

type Real = { label: string; brand: string; name: string; chain: string[]; specs: [string, string, string?][]; title?: string; must?: string[]; never?: string[]; reconstructed?: boolean };
const LAPTOP = ["All Laptop", "Laptop"];
// Stored attributes exactly as the old import script wrote them for these products (RAM figure stored as storage, 0GB, ...).
const wrongDellAttrs = (cpu: string, ram: string): [string, string, string?][] => [["Processor", cpu, "processor"], ["RAM", ram, "ram"], ["Storage", ram, "storage"]];
const real: Real[] = [
  { label: "Latitude 3420 FHD", brand: "Dell", name: 'Dell LATITUDE 3420-CORP-(Core i3-1115G4-14" FHD (1920x 1080)-8GB, 1x8GB-512GB SSD-Non Backlit-BackPack-Free DOS-5Y)-ASA', chain: LAPTOP, specs: wrongDellAttrs("Core i3", "8GB"), must: ["Latitude", "3420"], never: ["CORP", "ASA", "Core i3-1115G4-14"] },
  { label: "Latitude 3420 HD", brand: "Dell", name: 'DELL LATITUDE 3420-CORP-(CORE I3-1115G4-14" HD (1366X 768)-4GB, 1X4GB-1TB HDD-SINGLE POINTING BACKLIT-FREE DOS-3Y)', chain: LAPTOP, specs: wrongDellAttrs("Core i3", "4GB"), must: ["Latitude", "3420"] },
  { label: "Latitude 3440", brand: "Dell", name: 'Dell LATITUDE 3440-CORP-(Core i3-1215U-14" FHD (1920x1080)-8GB, 1x8GB-512GB SSD-Single Pointing Backlit-BackPack-Free DOS-3Y)', chain: LAPTOP, specs: wrongDellAttrs("Core i3", "8GB"), must: ["Latitude", "3440"] },
  { label: "Latitude 3540 (reconstructed)", reconstructed: true, brand: "Dell", name: 'Dell LATITUDE 3540-CORP-(Core i5-1335U-15.6" FHD (1920x1080)-16GB, 1x16GB-512GB SSD-Backlit-Free DOS-3Y)', chain: LAPTOP, specs: wrongDellAttrs("Core i5", "16GB"), must: ["Latitude", "3540"] },
  { label: "Latitude 7450 (reconstructed)", reconstructed: true, brand: "Dell", name: 'Dell LATITUDE 7450-CORP-(Core Ultra 7 165U-14" FHD+ (1920x1200)-16GB, 1x16GB-512GB SSD-Backlit-Win 11 Pro-3Y)', chain: LAPTOP, specs: wrongDellAttrs("Core Ultra 7", "16GB"), must: ["Latitude", "7450"] },
  { label: "Optiplex 3000 MT", brand: "Dell", name: "DELL OPTIPLEX 3000 MT-CORP-(INTEL CORE i5-12500 12TH GEN 3.0 GHz Up to 4.6 GHz/INTEL B660/8GB 3200MHz/1TB/USB KB/MOU/VGA/DP/HDMI/Free DOS/3 Yrs)", chain: ["Brand PC", "Desktop"], specs: [], must: ["Optiplex", "3000", "MT"], never: ["CORP", "12500-", "(", "B660"] },
  { label: "ThinkPad X1 Carbon G13", brand: "Lenovo", name: "Lenovo ThinkPad X1 Carbon  G13(21NXS0N800) Core Ultra 7 255H Processor (P-core 2.0GHz Max P-core 5.1GHz), 32 GB RAM, 1TB  SSD, 14.0'' WUXGA Touch, Win 11 Pro , Intel Arc 140T GPU,", chain: LAPTOP, specs: wrongDellAttrs("Core Ultra 7", "32GB"), must: ["ThinkPad", "X1", "Carbon", "G13"], never: ["21NXS0N800"] },
  { label: "V15 G5 IRL (16.0GB)", brand: "Lenovo", name: 'Lenovo V15 G5 IRL (83HFA09K00) Intel Core i5-13420H (P-cores up to 4.6GHz, 12MB), 15.6" FHD Non-Touch, 16.0GB DDR5, 512GB SSD, Luna Grey, Intel UHD Graphics, BT 5.2, Wi-Fi, 720P HD', chain: LAPTOP, specs: [["Processor", "Core i5", "processor"], ["RAM", "0GB", "ram"], ["Storage", "0GB", "storage"]], must: ["V15", "G5", "IRL"], never: ["83HFA09K00"] },
  { label: "HP 240R G10 (8GB(1x8GB)DDR4)", brand: "HP", name: "HP 240R G10 Laptop,Intel Core 3-100U-1.20 To 4.70 GHz,8GB(1x8GB)DDR4-3200,512 GB SSD,14''FHD,Wi-Fi6,", chain: LAPTOP, specs: wrongDellAttrs("Core 3", "8GB"), must: ["240R", "G10"] },
  { label: "Edifier Comfo Q OWS", brand: "Edifier", name: "Edifier Comfo Q OWS Headphone Back, No ANC, 32 Hours Battery - 1 Year Warranty", chain: ["Headphone", "Accessories"], specs: [["Type", "Over-ear", "audioType"]], must: ["Comfo", "OWS"], never: ["Over-ear", "ANC"] },
  { label: "Logitech G435 Bluetooth", brand: "Logitech", name: "Logitech G435 Lightspeed Wireless & Bluetooth Gaming Headset, Black, 2Y (981-001051)", chain: ["Headphone", "Accessories"], specs: [["Type", "Over-ear", "audioType"], ["Connectivity", "Bluetooth", "connectivity"], ["Microphone", "Yes", "microphone"]], must: ["G435"], never: ["Over-ear", "981-001051"] },
  { label: "ZONE 300", brand: "Logitech", name: "Logitech ZONE 300 Wireless Bluetooth Headset, BLACK, 1Y (981-001408)", chain: ["Headphone", "Accessories"], specs: [["Type", "Over-ear", "audioType"], ["Connectivity", "Bluetooth", "connectivity"], ["Microphone", "Yes", "microphone"]], must: ["ZONE", "300"], never: ["Over-ear", "981-001408"] },
];
const realInputs: SeoProductInput[] = real.map((r, i) => ({ id: `r${i}`, name: r.name, brand: r.brand, categoryChain: r.chain, sku: `RSKU-${i}`, modelNumber: null, specs: r.specs.map(([label, value, key]) => ({ label, value, key })) }));
const realSet = generateProductSeoSet(realInputs);
const SHOWN_BAD = /["()[\]]/;
const hyphenEdge = (text: string) => text.split(/\s+/).some((t) => { const x = t.replace(/[.,:;]+$/, ""); return x.length > 0 && (x.startsWith("-") || x.endsWith("-")); });
const FORM_WORDS = /\b(?:over-ear|on-ear|in-ear|earbuds?|neckband|open-ear)\b/i;

real.forEach((r, i) => {
  const out = generateProductSeo(realInputs[i]!);
  const inSet = realSet[i]!;
  for (const [which, result] of [["alone", out], ["in set", inSet]] as const) {
    const where = `real name (${which}): ${r.label}`;
    const texts = [result.title, result.primaryKeyword, result.metaDescription, result.imageAlt];
    check(`${where}: no " ( ) [ ] in title / keyword / description / alt`, texts.every((x) => !SHOWN_BAD.test(x)), texts.join(" | "));
    check(`${where}: no hyphen at either end, no double space`, texts.every((x) => !hyphenEdge(x) && !/\s{2}/.test(x) && x === x.trim()), texts.join(" | "));
    check(`${where}: no zero or empty spec`, !/(?:^|[^\d.])0+(?:\.0+)?\s?(?:GB|TB|MB|GHz)\b/.test(result.metaDescription) && result.zeroSpecs.length === 0 && !result.flags.includes("spec_zero"), result.metaDescription);
    check(`${where}: no bad_chars / spec_zero / model_token_lost / foreign_code`, !["bad_chars", "spec_zero", "model_token_lost", "foreign_code"].some((f) => result.flags.includes(f)), result.flags.join(","));
    check(`${where}: keyword = title core + " price in bangladesh"`, result.primaryKeyword === `${result.titleCore.toLowerCase()} price in bangladesh` && result.title.toLowerCase().startsWith(result.titleCore.toLowerCase()), `${result.primaryKeyword} | ${result.title}`);
    check(`${where}: title <= 60, description 120-155`, result.title.length <= 60 && result.metaDescription.length >= 120 && result.metaDescription.length <= 155, `${result.title} (${result.title.length}) / ${result.metaDescription.length}`);
    // an unsupported form-factor claim: only when the raw name says it (the stored attribute here is the import script's guess)
    const claimed = result.metaDescription.match(FORM_WORDS)?.[0] ?? null;
    check(`${where}: form factor claimed only if the raw name says it`, !claimed || new RegExp(claimed.replace("-", "[- ]?"), "i").test(r.name), `${claimed} | ${result.metaDescription}`);
    check(`${where}: no shouted brand / line word left (LATITUDE, OPTIPLEX, INTEL)`, ![result.title, result.metaDescription].some((x) => /\b(?:LATITUDE|OPTIPLEX|INTEL|CORE)\b/.test(x)), result.title);
    for (const token of r.must ?? []) check(`${where}: keeps "${token}"`, words(result.title).includes(token.toLowerCase()), result.title);
    for (const word of r.never ?? []) check(`${where}: never "${word}"`, ![result.title, result.primaryKeyword, result.metaDescription].some((x) => x.toLowerCase().includes(word.toLowerCase())), `${result.title} | ${result.metaDescription}`);
  }
});
const realBy = (label: string) => realSet[real.findIndex((r) => r.label === label)]!;
{
  equal("Latitude 3420 FHD: title", realBy("Latitude 3420 FHD").title.replace(/ \| Techno House$/, "").replace(/ Price in (?:Bangladesh|BD)$/, ""), "Dell Latitude 3420 8GB RAM Laptop");
  check("Latitude 3420 HD vs FHD share a core and are told apart by what the NAME says (RAM)", realBy("Latitude 3420 HD").title !== realBy("Latitude 3420 FHD").title && /4GB RAM/.test(realBy("Latitude 3420 HD").title), `${realBy("Latitude 3420 FHD").title} | ${realBy("Latitude 3420 HD").title}`);
  check("...and neither needs review", !realBy("Latitude 3420 FHD").needsReview && !realBy("Latitude 3420 HD").needsReview);
  check("Latitude 3440 is its own core", /^Dell Latitude 3440 /.test(realBy("Latitude 3440").title), realBy("Latitude 3440").title);
  check("shouted line words become Title Case, the model code keeps its case", /^Dell Optiplex 3000 MT Brand PC Price/.test(realBy("Optiplex 3000 MT").title) && /^Dell Latitude 3540 /.test(realBy("Latitude 3540 (reconstructed)").title), `${realBy("Optiplex 3000 MT").title}`);
  check("ThinkPad: bracketed part number is not in title or keyword", realBy("ThinkPad X1 Carbon G13").title.startsWith("Lenovo ThinkPad X1 Carbon G13 ") && !/21NXS0N800/i.test(realBy("ThinkPad X1 Carbon G13").primaryKeyword), realBy("ThinkPad X1 Carbon G13").title);
  const d = (label: string) => realBy(label).metaDescription;
  check("3420 FHD description: 8GB RAM and 512GB SSD (not '8GB storage')", /8GB RAM/.test(d("Latitude 3420 FHD")) && /512GB SSD/.test(d("Latitude 3420 FHD")) && !/8GB storage/.test(d("Latitude 3420 FHD")), d("Latitude 3420 FHD"));
  check("3420 HD description: 4GB RAM and 1TB HDD", /4GB RAM/.test(d("Latitude 3420 HD")) && /1TB HDD/.test(d("Latitude 3420 HD")), d("Latitude 3420 HD"));
  check("V15 G5 IRL: 16.0GB reads as 16GB RAM, 512GB SSD, never 0GB", /16GB RAM/.test(d("V15 G5 IRL (16.0GB)")) && /512GB SSD/.test(d("V15 G5 IRL (16.0GB)")) && !/0GB/.test(d("V15 G5 IRL (16.0GB)").replace(/10GB|20GB|30GB|40GB|50GB|60GB|\d0GB/g, "")), d("V15 G5 IRL (16.0GB)"));
  check("HP 8GB(1x8GB)DDR4,512 GB SSD: RAM and storage the right way round", /8GB RAM/.test(d("HP 240R G10 (8GB(1x8GB)DDR4)")) && /512GB SSD/.test(d("HP 240R G10 (8GB(1x8GB)DDR4)")), d("HP 240R G10 (8GB(1x8GB)DDR4)"));
  check("Comfo Q OWS: no form factor, no mic, no ANC claim, still states the type", !FORM_WORDS.test(d("Edifier Comfo Q OWS")) && !/\bmic/i.test(d("Edifier Comfo Q OWS")) && !/ANC/.test(d("Edifier Comfo Q OWS")) && /Headphone/.test(realBy("Edifier Comfo Q OWS").title), d("Edifier Comfo Q OWS"));
  check("G435 / ZONE 300: 'Bluetooth' is capitalised, no 'over-ear', no mic claim from the word Headset", ["Logitech G435 Bluetooth", "ZONE 300"].every((l) => /Bluetooth/.test(d(l)) && !/\bbluetooth\b/.test(d(l)) && !FORM_WORDS.test(d(l)) && !/\bmic/i.test(d(l))), `${d("Logitech G435 Bluetooth")} | ${d("ZONE 300")}`);
}
check("the real-name fixtures are unique in the set", new Set(realSet.map((r) => r.title.toLowerCase())).size === realSet.length, realSet.map((r) => r.title).join("\n  "));

// A stored form factor or mic IS used when the raw name says it, or when a stored spec ROW (not the guessed attribute) does.
{
  const hp = (name: string, specs: SpecFact[]) => generateProductSeo({ id: "h1", name, brand: "Acme", categoryChain: ["Headphone", "Accessories"], specs });
  {
    // v2.3: the name's "Over-Ear" is in the title, so the description does not say it a second time.
    const r = hp("Acme Z100 Over-Ear Wired Headphone", [{ label: "Type", value: "Over-ear", key: "audioType" }, { label: "Connectivity", value: "Wired", key: "connectivity" }]);
    check("name says over-ear -> over-ear is stated once (title), not repeated in the description", /over-ear/i.test(r.title) && !/over-ear/i.test(r.metaDescription.replace(r.titleCore, "")), `${r.title} | ${r.metaDescription}`);
  }
  check("a stored spec ROW (no attribute key) saying over-ear is trusted", /over-ear/.test(hp("Acme Z100 Headphone", [{ label: "Type", value: "Over-ear" }, { label: "Connectivity", value: "Wired", key: "connectivity" }]).metaDescription));
  check("an in-ear name overrides a stored over-ear attribute", !/over-ear/.test(hp("Acme Z100 In-Ear Earphones", [{ label: "Type", value: "Over-ear", key: "audioType" }, { label: "Connectivity", value: "Wired", key: "connectivity" }]).metaDescription));
  check("the name says Mic -> 'with microphone' (not 'built-in')", /with microphone|with mic\./.test(hp("Acme Z100 Headset with Noise-Cancelling Mic", [{ label: "Connectivity", value: "USB", key: "connectivity" }]).metaDescription) && !/built-in/.test(hp("Acme Z100 Headset with Noise-Cancelling Mic", [{ label: "Connectivity", value: "USB", key: "connectivity" }]).metaDescription));
  check("a spec that says Built-in microphone is worded that way", /built-in mic/.test(hp("Acme Z100 Headphone", [{ label: "Microphone", value: "Built-in microphone" }, { label: "Connectivity", value: "Wired", key: "connectivity" }, { label: "Type", value: "On-ear" }]).metaDescription));
}

// Zero / empty attributes never reach a description.
{
  const r = generateProductSeo({ id: "z1", name: "Acme Zen 15 Laptop", brand: "Acme", categoryChain: LAPTOP, specs: [{ label: "RAM", value: "0GB", key: "ram" }, { label: "Storage", value: "0GB", key: "storage" }, { label: "Processor", value: "Core i5", key: "processor" }, { label: "Display", value: "15.6 inch", key: "size" }] });
  check("0GB RAM / storage attributes are dropped, not stated", !/0GB/.test(r.metaDescription) && r.zeroSpecs.length === 0, r.metaDescription);
  const same = generateProductSeo({ id: "z2", name: "Acme Zen 15 Laptop", brand: "Acme", categoryChain: LAPTOP, specs: [{ label: "RAM", value: "8GB", key: "ram" }, { label: "Storage", value: "8GB", key: "storage" }, { label: "Processor", value: "Core i5", key: "processor" }] });
  check("a stored storage that just repeats the RAM figure is dropped", !/8GB storage/.test(same.metaDescription) && /8GB RAM/.test(same.metaDescription), same.metaDescription);
}

{
  // The type word found after the cut must not carry the bracket it sat in: "... DS-60000 (A3 Flatebed Scanner), ADF".
  const epson = generateProductSeo({ id: "e1", name: "B11B204241, EPSON Work Force DS-60000 (A3 Flatebed Scanner), ADF, 1YW", brand: "Epson", categoryChain: ["Scanner", "Office Equipment"], specs: [] });
  check("type word from after a bracket is clean ('Scanner', not 'Scanner)')", /^Epson Work Force DS-60000 Scanner Price/.test(epson.title) && !/[()]/.test(epson.title + epson.metaDescription), epson.title);
}

// --- spec extraction (the cause of "0GB storage") ----------------------------------------
{
  const v15 = extractNameSpecs(real[7]!.name);
  check("raw '16.0GB DDR5, 512GB SSD': RAM 16GB, storage 512GB SSD", v15.ram === "16GB" && v15.storage?.size === "512GB" && v15.storage?.kind === "SSD", JSON.stringify(v15));
  check("...the 4.6GHz clock and 12MB cache are not sizes", !JSON.stringify(v15).includes("4.6") && !JSON.stringify(v15).includes("12MB"));
  const cases: [string, string | null, string | null][] = [
    ["Acme 16.0GB DDR5, 1.0TB NVMe SSD", "16GB", "1TB"],
    ["Acme 8GB LPDDR5x soldered, 256GB eMMC", "8GB", "256GB"],
    ["Acme 8GB RAM 512GB", "8GB", null],
    ["Acme 2x8GB DDR4 3200MHz", "16GB", null],
    ["Acme 512GB SSD, 16GB RAM", "16GB", "512GB"],
    ["Acme 8GB, 1x8GB-512GB SSD-Win", "8GB", "512GB"],
    ["Acme 8GB 3200MHz/1TB/256GB", "8GB", null],
    ["Acme B650M DS3H", null, null],
  ];
  for (const [name, ram, size] of cases) {
    const x = extractNameSpecs(name);
    check(`extractNameSpecs(${JSON.stringify(name)})`, x.ram === ram && (x.storage?.size ?? null) === size, JSON.stringify(x));
  }
  equal("ambiguous storage (1TB/256GB) is not guessed", extractNameSpecs("Acme 8GB 3200MHz/1TB/256GB").storageAmbiguous, true);
  check("decimals: plainNumber('16.0') = '16', '1.50' = '1.5', zero and junk = null", plainNumber("16.0") === "16" && plainNumber("1.50") === "1.5" && plainNumber("0") === null && plainNumber("0.0") === null && plainNumber("x") === null);
  check("populate script and generator share the parser", readFileSync("scripts/deploy/populate-import-attributes.ts", "utf8").includes("@/lib/catalog/spec-extract") || readFileSync("scripts/deploy/populate-import-attributes.ts", "utf8").includes("lib/catalog/spec-extract"));
}

// --- the central casing map ------------------------------------------------------------------
{
  const cases: [string, string][] = [
    ["bluetooth", "Bluetooth"], ["BLUETOOTH", "Bluetooth"], ["wifi", "Wi-Fi"], ["wi-fi", "Wi-Fi"], ["usb", "USB"], ["usb-c", "USB-C"], ["type-c", "Type-C"], ["hdmi", "HDMI"],
    ["displayport", "DisplayPort"], ["ddr4", "DDR4"], ["ddr5", "DDR5"], ["lpddr5x", "LPDDR5x"], ["ips", "IPS"], ["oled", "OLED"], ["led", "LED"], ["rgb", "RGB"], ["ssd", "SSD"],
    ["hdd", "HDD"], ["nvme", "NVMe"], ["ram", "RAM"], ["4.6ghz", "4.6GHz"], ["165hz", "165Hz"], ["3200mhz", "3200MHz"], ["512gb", "512GB"], ["qhd", "QHD"], ["fhd", "FHD"], ["uhd", "UHD"],
    ["amd", "AMD"], ["intel", "Intel"], ["INTEL", "Intel"], ["nvidia", "NVIDIA"], ["gigabyte", "GIGABYTE"],
  ];
  for (const [input, expected] of cases) equal(`casing: ${input} -> ${expected}`, applyCasing(input), expected);
  equal("casing keeps surrounding punctuation", applyCasing("(bluetooth),"), "(Bluetooth),");
  equal("casing leaves unknown words and model codes alone", applyCasing("B650M ARGB Pro WF7"), "B650M ARGB Pro WF7");
  // a model code keeps the case the raw name gave it even when it equals a mapped word
  const asus = generateProductSeo({ id: "a1", name: "ASUS TUF GAMING B650-PLUS WIFI, Socket AM5", brand: "ASUS", categoryChain: ["Motherboard", "Component"], specs: [] });
  check("model run keeps its case: WIFI in 'B650-PLUS WIFI' stays", /B650-PLUS WIFI/.test(asus.title), asus.title);
  // no lower-case proper noun in any description body of the fixtures
  const lowerProper = /\b(?:bluetooth|wifi|usb|hdmi|ddr[345]|ips|oled|led|rgb|ssd|hdd|nvme|amd|nvidia)\b/;
  const bodies = [...set, ...realSet].map((r) => r.metaDescription.slice(r.titleCore.length));
  check("no lower-case proper noun / standard in any description body", bodies.every((b) => !lowerProper.test(b)), bodies.filter((b) => lowerProper.test(b)).join(" | "));
}

// --- the two new gates ----------------------------------------------------------------------------
{
  const cases: [string, boolean][] = [
    ['Dell Latitude 3420 14" Laptop', true], ["Dell Latitude (3420) Laptop", true], ["Dell [3420] Laptop", true], ["Dell Latitude 3420-CORP- Laptop", true],
    ["-Dell Latitude 3420", true], ["Dell Latitude 3420-", true], ["Dell  Latitude 3420", true], ["Dell Latitude 3420 ®", true], ["Dell Latitude 3420 “Laptop”", true], ["Dell Latitude 3420 – Laptop", false],
    ["Dell Latitude 3420 Laptop Price in Bangladesh | Techno House", false], ["Lenovo V15 G5 IRL Laptop: Core i5-13420H, 16GB RAM, 512GB SSD.", false], ["HP 12+256GB U/UTP 100%", false],
  ];
  for (const [text, bad] of cases) check(`findBadChars(${JSON.stringify(text)}) ${bad ? "flags" : "is clean"}`, (findBadChars(text).length > 0) === bad, findBadChars(text).join("; "));
  check("findZeroSpecs: '0GB storage', '0 ports', '0.0GHz base' are zero; '10GB' and '16GB' are not", findZeroSpecs("", ["0GB storage"]).length === 1 && findZeroSpecs("", ["0 ports"]).length === 1 && findZeroSpecs("", ["0.0GHz base"]).length === 1 && findZeroSpecs("10GB RAM, 16GB RAM, 2.0GHz base", ["10GB RAM", "2.0GHz base"]).length === 0);
  check("findZeroSpecs: empty / 'undefined' phrase", findZeroSpecs("", [""]).length === 1 && findZeroSpecs("", ["undefined RAM"]).length === 1);
  const ok = generateProductSeo(realInputs[0]!);
  const stored = { metaTitle: null, metaDescription: null, seoSource: null };
  const bad: SeoResult = { ...ok, badChars: ['quote "'], flags: [...ok.flags, "bad_chars"], needsReview: true };
  const zero: SeoResult = { ...ok, zeroSpecs: ["0GB"], flags: [...ok.flags, "spec_zero"], needsReview: true };
  check("decideApply: bad_chars -> skip, even with --overwrite", decideApply(bad, stored).action === "skip: bad_chars" && decideApply(bad, { metaTitle: "x", metaDescription: "y", seoSource: "admin" }, { overwrite: true }).write === false);
  check("decideApply: spec_zero -> skip", decideApply(zero, stored).action === "skip: spec_zero" && decideApply(zero, stored).write === false);
  check("decideApply: a clean real row is written", decideApply(ok, stored, { allowFewSpecs: true }).write === true, decideApply(ok, stored, { allowFewSpecs: true }).action);
}

// --- v2.3: the spec part of a description does not repeat the title ------------------------------------

{
  // Titles carry collision extras (CPU, size, storage, capacity); the description used to say them again.
  let k = 0;
  const mk = (name: string, brand: string, chain: string[], specs: [string, string, string?][]): SeoProductInput => {
    k += 1;
    return { id: `p${k}`, name, brand, categoryChain: chain, sku: `PSKU-${k}`, modelNumber: null, specs: specs.map(([label, value, key]) => ({ label, value, key })) };
  };
  const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;
  /** No spec phrase of the description is only words the title already says (the rule itself, checked on the output). */
  const repeatsTitle = (r: SeoResult) => r.specsUsed.filter((phrase) => dropTitleRepeats([{ slot: "x", phrase }], r.titleCore).length === 0);

  // 1) Toshiba P300: 1TB / 2TB / 4TB collide, so "2TB" goes into the title; the stored specs said it twice more.
  const toshibaSpecs: [string, string, string?][] = [["Capacity", "{cap}", "capacity"], ["Capacity", "{cap2}"], ["Interface", "6.0 Gbit/s"]];
  const toshiba = (name: string, cap: string, cap2: string) => mk(name, "Toshiba", ["Hard Disk Drive", "Component"], toshibaSpecs.map(([l, v, key]) => [l, v.replace("{cap}", cap).replace("{cap2}", cap2), key] as [string, string, string?]));
  const tosh = generateProductSeoSet([
    toshiba('Toshiba PC Hard Drive P300 1TB - 7200 RPM, SATA 6 Gb/s, 64 MB Cache, 3.5" - HDWD110UZSVA', "1TB", "1 TB"),
    toshiba('Toshiba PC Hard Drive P300 2TB - (2 Years) 7200 RPM, SATA 6 Gb/s, 256 MB Cache, 3.5" - HDWD320UZSVA', "2TB", "2 TB"),
    toshiba('Toshiba PC Hard Drive P300 4TB - (2 Years) 5400 RPM, SATA 6 Gb/s, 128 MB Cache, 3.5" - HDWD240UZSVA', "4TB", "4 TB"),
  ]);
  const t2 = tosh[1]!;
  check("Toshiba: the capacity is the title's differentiator", /P300 2TB/.test(t2.title), t2.title);
  check("Toshiba: 2TB is said once in the description, not three times", count(t2.metaDescription, /2\s?TB/gi) === 1, t2.metaDescription);
  check("Toshiba: no '2 TB capacity' leftover and the interface is kept", !/2 TB capacity/.test(t2.metaDescription) && /6\.0 Gbit\/s interface/.test(t2.metaDescription), t2.metaDescription);
  check("Toshiba: one clean statement after the core", /P300 2TB(?::| –) 6\.0 Gbit\/s interface\. /.test(t2.metaDescription), t2.metaDescription);
  check("a single spec never gets the plural 'Key specs of' lead", tosh.every((r) => !/^Key specs of/.test(r.metaDescription)), tosh.map((r) => r.metaDescription).join(" / "));
  check("Toshiba: no spec phrase repeats the title (all three)", tosh.every((r) => repeatsTitle(r).length === 0), tosh.map((r) => r.specsUsed.join("|")).join(" / "));
  check("Toshiba: the three titles stay distinct", new Set(tosh.map((r) => r.title)).size === 3, tosh.map((r) => r.title).join(" / "));

  // 2) Lenovo ThinkPad E14 G7: two CPUs collide, the CPU goes into the title and used to be repeated: "Core Ultra 5 225H: Core Ultra 5 225H".
  const e14 = (code: string, cpu: string, ghz: string) => mk(`Lenovo ThinkPad E14 G7 (${code}) Intel ${cpu} ${ghz}, 16.0GB DDR5 5600 RAM, 1x512GB SSD M.2 2242 PCIe Gen4 TLC Opal,14" WUXGA Non-Touch, Free DOS`, "Lenovo", ["All Laptop", "Laptop"], [["Processor", "Core Ultra 5", "processor"], ["RAM", "0GB", "ram"], ["Storage", "512GB", "storage"]]);
  const ultra = generateProductSeoSet([e14("21SXS0HA00", "Core Ultra 5 225H", "1.7 Up to 4.80GHz"), e14("21SXS0HB00", "Core Ultra 7 255H", "2.0 Up to 5.10GHz")]);
  const u5 = ultra[0]!;
  const u7 = ultra[1]!;
  check("E14: the CPU is in the title", /Core Ultra 5 225H/.test(u5.title) && /Core Ultra 7 255H/.test(u7.title), `${u5.title} / ${u7.title}`);
  check("E14: 'Core Ultra 5 225H' once in the description, not 'X: X'", count(u5.metaDescription, /Core Ultra 5 225H/g) === 1 && count(u7.metaDescription, /Core Ultra 7 255H/g) === 1, `${u5.metaDescription} / ${u7.metaDescription}`);
  check("E14: the other specs are still there", /16GB RAM/.test(u5.metaDescription) && /512GB SSD/.test(u5.metaDescription), u5.metaDescription);
  check("E14: no spec phrase repeats the title", repeatsTitle(u5).length === 0 && repeatsTitle(u7).length === 0);

  // 3) Smart Flairedge: storage, size and CPU are all title extras; the description repeated every one of them.
  const flair = (code: string, size: string, cpu: string, storage: string, display: string) =>
    mk(`SMART Flairedge Laptop (${code}-${size}”-Grey), Intel® Core™ ${cpu} (Max Turbo Frequency 4.6 GHz, Total Cores 10, Total Threads 12, 12 MB Intel® Smart Cache), 8GB DDR4 3200 MHz, ${storage}`, "Smart PC", ["All Laptop", "Laptop"], [["Processor", "Core i5", "processor"], ["RAM", "8GB", "ram"], ["Storage", storage, "storage"], ["Display", display, "size"]]);
  const flairSet = generateProductSeoSet([
    flair("i5G13", "15.6", "i5-1335U", "512GB", "15.6 inch"),
    flair("i5G13", "16", "i5-1335U", "512GB", "16 inch"),
    flair("i5G13", "15.6", "i5-1335U", "256GB", "15.6 inch"),
    flair("i5G12", "15.6", "i5-1235U", "512GB", "15.6 inch"),
  ]);
  const f0 = flairSet[0]!;
  equal("Flairedge: the title is storage, size, CPU", f0.title, "Smart Flairedge Laptop 512GB 15.6 inch Core i5-1335U");
  check("Flairedge: each title extra appears once in the description", count(f0.metaDescription, /i5-1335U/g) === 1 && count(f0.metaDescription, /512GB/g) === 1 && count(f0.metaDescription, /15\.6/g) === 1, f0.metaDescription);
  check("Flairedge: only what the title lacks is added (the RAM)", /(?::| –) 8GB RAM\./.test(f0.metaDescription) && f0.specsUsed.join() === "8GB RAM", f0.metaDescription);
  check("Flairedge: the specs the title does not say are kept (16 inch variant keeps the CPU)", /Core i5-1335U/.test(flairSet[1]!.metaDescription) && count(flairSet[1]!.metaDescription, /16 inch/g) === 1, flairSet[1]!.metaDescription);
  check("Flairedge: no spec phrase repeats the title; descriptions stay in 120-155", flairSet.every((r) => repeatsTitle(r).length === 0 && r.metaDescription.length >= 120 && r.metaDescription.length <= 155), flairSet.map((r) => `${r.metaDescription.length}`).join());
  check("Flairedge: the titles are still unique", new Set(flairSet.map((r) => r.title)).size === 4, flairSet.map((r) => r.title).join(" / "));
  check("Flairedge: specsAvailable still counts every usable spec (the title must not make a product 'thin' for selection)", f0.specsAvailable >= 3, `${f0.specsAvailable}`);

  // The rule itself.
  const sv = (slot: string, phrase: string) => ({ slot, phrase });
  const phrases = (list: { phrase: string }[]) => list.map((x) => x.phrase).join(" | ");
  equal("repeat: 'Core Ultra 5 225' in the title is dropped", phrases(dropTitleRepeats([sv("cpu", "Core Ultra 5 225"), sv("ram", "16GB RAM")], "Acme X1 Core Ultra 5 225 Laptop")), "16GB RAM");
  equal("repeat: '2 TB capacity' is '2TB'", phrases(dropTitleRepeats([sv("storage_cap", "2TB"), sv("fill", "2 TB capacity"), sv("fill", "6.0 Gbit/s interface")], "Toshiba P300 2TB Hard Drive")), "6.0 Gbit/s interface");
  equal("repeat: '8GB RAM' is dropped when the title says 8GB RAM", phrases(dropTitleRepeats([sv("ram", "8GB RAM")], "Dell Latitude 3420 8GB RAM Laptop")), "");
  equal("repeat: '8GB RAM' stays when the title only says 512GB", phrases(dropTitleRepeats([sv("ram", "8GB RAM")], "Dell Latitude 3420 512GB Laptop")), "8GB RAM");
  equal("repeat: '8GB RAM' is not hidden by a different 8GB (title says 8GB SSD? it says 8gb only)", phrases(dropTitleRepeats([sv("ram", "8GB RAM")], "Acme Phone 8GB SSD")), "8GB RAM");
  equal("repeat: '8GB RAM' is dropped when the title carries a bare 8GB", phrases(dropTitleRepeats([sv("ram", "8GB RAM")], "HP ProBook 460 G11 Laptop Core Ultra 5 125H 8GB")), "");
  equal("repeat: '8GB RAM' stays next to a storage word in the title", phrases(dropTitleRepeats([sv("ram", "8GB RAM")], "Acme Laptop 8GB SSD")), "8GB RAM");
  equal("repeat: 'AM4 socket' under a title that says AM4", phrases(dropTitleRepeats([sv("socket", "AM4 socket"), sv("form_factor", "ATX form factor")], "Gigabyte AMD AM4 Motherboard")), "ATX form factor");
  equal("repeat: 'DDR5 memory' under a title that says DDR5", phrases(dropTitleRepeats([sv("mem_type", "DDR5 memory")], "Gigabyte B650 EAGLE AX DDR5 Motherboard")), "");
  equal("repeat: '512GB storage' is dropped when the title has 512GB", phrases(dropTitleRepeats([sv("storage", "512GB storage")], "Smart Laptop 512GB")), "");
  equal("repeat: '512GB SSD' keeps what is new: SSD storage", phrases(dropTitleRepeats([sv("storage", "512GB SSD")], "Smart Laptop 512GB")), "SSD storage");
  equal("repeat: '1TB NVMe SSD' keeps what is new", phrases(dropTitleRepeats([sv("storage", "1TB NVMe SSD")], "Acme Laptop 1TB")), "NVMe SSD storage");
  equal("repeat: '512GB SSD' with 'SSD' also in the title is dropped", phrases(dropTitleRepeats([sv("storage", "512GB SSD")], "Smart Laptop 512GB SSD")), "");
  equal("repeat: '15.6 inch display' is '15.6 inch'", phrases(dropTitleRepeats([sv("display_size", "15.6 inch display")], "Smart Laptop 15.6 inch")), "");
  equal("repeat: 'Core i5' is NOT the title's 'Core i5-1235U' (different word)", phrases(dropTitleRepeats([sv("cpu", "Core i5")], "Smart Laptop Core i5-1235U")), "Core i5");
  equal("repeat: unrelated specs are untouched", phrases(dropTitleRepeats([sv("ram", "16GB RAM"), sv("storage", "1TB SSD")], "Acme Pro 14 Laptop")), "16GB RAM | 1TB SSD");
  equal("repeat: order is kept", phrases(dropTitleRepeats([sv("a", "1TB SSD"), sv("b", "Wi-Fi 6"), sv("c", "16GB RAM")], "Acme Laptop")), "1TB SSD | Wi-Fi 6 | 16GB RAM");
  equal("pickSpecs: '2TB' and '2 TB capacity' are one spec", pickSpecPhrases([{ label: "Capacity", value: "2TB", key: "capacity" }, { label: "Capacity", value: "2 TB" }, { label: "Interface", value: "6.0 Gbit/s" }], "hdd", "Toshiba").join(" | "), "2TB | 6.0 Gbit/s interface");
  equal("pickSpecs: '15.6 inch' spacing does not hide a real second spec", pickSpecPhrases([{ label: "Display", value: "15.6 inch", key: "size" }, { label: "RAM", value: "8GB", key: "ram" }], "laptop", "Acme").join(" | "), "8GB RAM | 15.6 inch display");
}

// --- v2.3: a description with few specs states only what the name / the specs contain ----------------------

{
  const CLAIMS = ["wireless", "bluetooth", "wired", "over-ear", "in-ear", "on-ear", "earbuds", "built-in", "noise", "cancel", "waterproof", "rgb", "ssd", "hdd", "nvme", "ddr4", "ddr5", "4k", "mechanical", "portable", "gaming", "stereo", "dual-band", "poe"];
  const flat = (text: string) => text.toLowerCase().replace(/(\d)\.0+(?=[a-z])/g, "$1").replace(/(\d)\s+(tb|gb|mb|mhz|ghz|hz|inch)\b/g, "$1$2");
  /** Claim words and number-bearing words of a description that neither the raw name, nor a stored spec, nor the title contains. */
  const unsupported = (r: SeoResult, input: SeoProductInput) => {
    const source = flat(`${input.name} ${input.brand} ${input.categoryChain.join(" ")} ${input.specs.map((x) => `${x.label} ${x.value}`).join(" ")} ${r.title}`);
    const body = flat(r.metaDescription);
    const claims = CLAIMS.filter((word) => body.includes(word) && !source.includes(word));
    const numbers = (body.match(/[a-z]*\d[a-z0-9./+-]*/g) ?? []).filter((token) => token.length >= 2 && !source.includes(token.replace(/[.,]+$/, "")));
    return [...claims, ...numbers];
  };
  let j = 0;
  const thin = (name: string, brand: string, chain: string[], specs: [string, string, string?][]): [SeoProductInput, string] => {
    j += 1;
    return [{ id: `thin${j}`, name, brand, categoryChain: chain, sku: `TH${j}`, modelNumber: null, specs: specs.map(([label, value, key]) => ({ label, value, key })) }, name];
  };
  const cases: [SeoProductInput, string][] = [
    thin("Logitech G102 Gaming Mouse", "Logitech", ["Mouse"], []),
    thin("Edifier Comfo Q OWS Headphone Back", "Edifier", ["Headphone"], []),
    thin("Logitech G435 Bluetooth Headset", "Logitech", ["Headphone"], []),
    thin("Hikvision DS-K1201AEF Biometric fingerprint and EM card reader", "Hikvision", ["Access Control"], []),
    thin("Netis N3 AC1200 Wireless Dual Band Gigabit Router", "Netis", ["Router"], [["Speed", "1200Mbps"]]),
    thin("ASUS VZ24EHF 23.8 Inch FHD IPS 100Hz Eye Care Gaming Monitor", "ASUS", ["Monitor"], [["Display Size", "23.8 inch", "size"], ["Refresh Rate", "100Hz"]]),
    thin("Corsair K70 Mechanical Keyboard", "Corsair", ["Keyboard"], [["Connectivity", "Wired", "connectivity"]]),
    thin("Seagate Barracuda 2TB Hard Drive", "Seagate", ["Hard Disk Drive"], [["Capacity", "2TB", "capacity"]]),
    thin("Dell OptiPlex 3000 MT Brand PC", "Dell", ["Brand PC", "Desktop"], [["RAM", "8GB", "ram"]]),
    thin("Lenovo V15 G5 IRL Core i5-13420H 16.0GB DDR5, 512GB SSD 15.6 FHD Laptop", "Lenovo", ["Laptop"], []),
    thin("Samsung 980 NVMe SSD 1TB", "Samsung", ["SSD"], [["Interface", "NVMe"]]),
    thin("TP-Link Archer AX55 Wi-Fi 6 Router", "TP-Link", ["Router"], []),
  ];
  const results = cases.map(([input]) => generateProductSeo(input));
  results.forEach((r, i) => {
    const input = cases[i]![0];
    check(`few specs (${r.specsAvailable}): '${input.name.slice(0, 40)}' states only what the name / specs say`, unsupported(r, input).length === 0, `${r.metaDescription}\n  unsupported: ${unsupported(r, input).join(", ")}`);
    check(`few specs: '${input.name.slice(0, 40)}' stays 120-155 and clean`, r.metaDescription.length >= 120 && r.metaDescription.length <= 155 && r.badChars.length === 0 && r.zeroSpecs.length === 0, `${r.metaDescription.length}: ${r.metaDescription}`);
  });
  // (the V15 case is there for "16.0GB": its three specs all come from the NAME, which is exactly what must be stated)
  check("few specs: the cases really have fewer than 3 (V15 excepted)", results.every((r, i) => r.specsAvailable < 3 || cases[i]![1].includes("V15")), results.map((r) => r.specsAvailable).join());
  check("zero specs: the description is the title core plus the neutral pointer and closing, nothing else", (() => {
    const r = results[0]!;
    return r.specsUsed.length === 0 && /^Logitech G102 Gaming Mouse\. See full specifications on the product page\. (?:Check price|Price) and availability at Techno House\. Delivery/.test(r.metaDescription);
  })(), results[0]!.metaDescription);
  check("the claim checker itself catches an invented claim", unsupported({ ...results[0]!, metaDescription: "Logitech G102 Gaming Mouse: wireless, 16000 DPI. Price and availability at Techno House." }, cases[0]![0]).join() === "wireless,16000");
}

// --- v2.4: claim accuracy -------------------------------------------------------------------------------------

{
  let k = 0;
  type Shape = SpecFact[];
  const mk = (name: string, brand: string, chain: string[], specs: Shape = []): SeoProductInput => {
    k += 1;
    return { id: `v24-${k}`, name, brand, categoryChain: chain, sku: `V24-${k}`, modelNumber: null, specs };
  };
  const attr = (key: string, label: string, value: string): SpecFact => ({ key, label, value });
  const row = (label: string, value: string): SpecFact => ({ label, value });
  const MB = ["Motherboard", "Component"];
  const CASE = ["Casing", "Component"];
  const HP = ["Headphone", "Accessories"];
  const PHONE = ["Mobile Accessories", "Phone"];
  const GPU = ["Graphics Card", "Component"];
  const plainAtx = (text: string) => /(^|[^-\w])ATX form factor/.test(text); // "Micro-ATX form factor" / "E-ATX form factor" do not count
  const keywordOk = (r: SeoResult) => r.primaryKeyword === `${r.titleCore.toLowerCase()} price in bangladesh`;
  const fixtures: SeoResult[] = [];
  const gen = (input: SeoProductInput) => {
    const r = generateProductSeo(input);
    fixtures.push(r);
    return r;
  };

  // 1) The parser: every spelling, and a bare ATX only without a prefix.
  const spellings: [string, string | null][] = [
    ["M-ATX", "Micro-ATX"], ["mATX", "Micro-ATX"], ["M.ATX", "Micro-ATX"], ["MicroATX", "Micro-ATX"], ["Micro ATX", "Micro-ATX"],
    ["Micro-ATX", "Micro-ATX"], ["micro atx", "Micro-ATX"], ["uATX", "Micro-ATX"], ["M ATX", "Micro-ATX"],
    ["E-ATX", "E-ATX"], ["EATX", "E-ATX"], ["E ATX", "E-ATX"], ["Extended ATX", "E-ATX"],
    ["Mini-ITX", "Mini-ITX"], ["Mini ITX", "Mini-ITX"], ["mITX", "Mini-ITX"], ["ITX", "Mini-ITX"],
    ["ATX", "ATX"], ["Standard ATX Mid Tower", "ATX"], ["Platinum ATX", "ATX"],
    ["MSI MAG B860M MORTAR WIFI LGA 1851 M-ATX MOTHERBOARD", "Micro-ATX"],
    ["MSI B760M GAMING PLUS WIFI 6E M-ATX", "Micro-ATX"],
    ["MSI PRO B850M-B GEN4 AM5 M-ATX", "Micro-ATX"],
    ["MSI MEG X870E GODLIKE WiFi 7 AMD AM5 E-ATX", "E-ATX"],
    ["CORSAIR iCUE LINK 2500X RGB Micro ATX Dual Chamber PC Case - Black", "Micro-ATX"],
    ["MSI B450M-A PRO MAX II", null], // a chipset "M" is not a statement; nothing is claimed
    ["650W ATX12V Power Supply", null], // ATX12V is the PSU standard, not a form factor word
    ["ATX / Micro-ATX / Mini-ITX", null], // lists several: nothing is claimed
  ];
  for (const [text, expected] of spellings) equal(`form factor of "${text}"`, formFactorOf(text), expected);
  equal("a list keeps all three", formFactorsIn("Supports ATX, M-ATX and Mini ITX").join("|"), "Mini-ITX|Micro-ATX|ATX");
  check("the import script reads the form factor with the shared parser", (() => {
    const source = readFileSync("scripts/deploy/populate-import-attributes.ts", "utf8");
    return source.includes('from "../../lib/catalog/form-factor"') && /extractMbFormFactor[\s\S]{0,400}formFactorOf\(name\)/.test(source) && /extractCasingFormFactor[\s\S]{0,200}formFactorsIn\(name\)/.test(source);
  })());

  // 2) Motherboards and cases: the form factor comes from the name or a spec ROW, never from the stored attribute.
  const boards: [string, SeoProductInput, string | null][] = [
    ["MSI MAG B860M MORTAR WIFI (M-ATX)", mk("MSI MAG B860M MORTAR WIFI LGA 1851 M-ATX MOTHERBOARD", "MSI", MB, [attr("socket", "Socket", "LGA1851"), attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["MSI B760M GAMING PLUS WIFI 6E M-ATX", mk("MSI B760M GAMING PLUS WIFI 6E M-ATX", "MSI", MB, [attr("socket", "Socket", "LGA1700"), attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["MSI PRO B850M-B GEN4 AM5 M-ATX", mk("MSI PRO B850M-B GEN4 AM5 M-ATX", "MSI", MB, [attr("socket", "Socket", "AM5"), attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["MSI MEG X870E GODLIKE (E-ATX)", mk("MSI MEG X870E GODLIKE WiFi 7 AMD AM5 E-ATX", "MSI", MB, [attr("socket", "Socket", "AM5"), attr("formFactor", "Form Factor", "ATX")]), "E-ATX form factor"],
    ["MSI B450M-A PRO MAX II: stored ATX attribute only (the import script's default guess)", mk("MSI B450M-A PRO MAX II", "MSI", MB, [attr("socket", "Socket", "AM4"), attr("formFactor", "Form Factor", "ATX")]), null],
    ["MSI B450M-A PRO MAX II: stored attribute M-ATX (right data, a spelling the old reader turned into ATX)", mk("MSI B450M-A PRO MAX II", "MSI", MB, [attr("socket", "Socket", "AM4"), attr("formFactor", "Form Factor", "M-ATX")]), "Micro-ATX form factor"],
    ["MSI B450M-A PRO MAX II: stored attribute Micro-ATX", mk("MSI B450M-A PRO MAX II", "MSI", MB, [attr("socket", "Socket", "AM4"), attr("formFactor", "Form Factor", "Micro-ATX")]), "Micro-ATX form factor"],
    ["a name that says Micro-ATX outranks a stored ATX attribute", mk("MSI PRO B760M-P Micro ATX", "MSI", MB, [attr("socket", "Socket", "LGA1700"), attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["a name that says ATX accepts the stored ATX attribute", mk("MSI MAG X870 TOMAHAWK WIFI, AM5, ATX", "MSI", MB, [attr("socket", "Socket", "AM5"), attr("formFactor", "Form Factor", "ATX")]), "ATX form factor"],
    ["MSI B450M-A PRO MAX II: a spec row says M-ATX", mk("MSI B450M-A PRO MAX II", "MSI", MB, [attr("socket", "Socket", "AM4"), row("Form Factor", "M-ATX")]), "Micro-ATX form factor"],
    ["MSI PRO H810M-E: a spec row says Micro ATX", mk("MSI PRO H810M-E WIFI", "MSI", MB, [attr("socket", "Socket", "LGA1851"), row("Form Factor", "Micro ATX")]), "Micro-ATX form factor"],
    ["the name outranks a conflicting row", mk("MSI MAG B860M MORTAR WIFI M-ATX MOTHERBOARD", "MSI", MB, [attr("socket", "Socket", "LGA1851"), row("Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["Corsair iCUE LINK 2500X RGB Micro ATX case", mk("CORSAIR iCUE LINK 2500X RGB Micro ATX Dual Chamber PC Case - Black, CC-9011267-WW", "Corsair", CASE, [attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["Xtreme M31B M-ATX case", mk("XTREME M31B M-ATX BLACK CASE TEMPERED GLASS WITH 3 RGB FAN WITHOUT PSU", "Xtreme", CASE, [attr("formFactor", "Form Factor", "ATX")]), "Micro-ATX form factor"],
    ["a case that says plain ATX (in the tail of the name)", mk("Delux Q7 Gaming Case, 2x USB, ATX", "Delux", CASE, [attr("formFactor", "Form Factor", "Micro-ATX")]), "ATX form factor"],
  ];
  for (const [label, input, expected] of boards) {
    const r = gen(input);
    const text = `${r.title} ${r.metaDescription}`;
    if (expected) check(`${label}: says "${expected}"`, r.metaDescription.includes(expected), r.metaDescription);
    else check(`${label}: no form factor claim at all`, !/form factor/.test(r.metaDescription), r.metaDescription);
    check(`${label}: never a plain "ATX form factor" when the name says M / E / Micro`, !(/(^|[^-\w])(?:M-?ATX|E-?ATX|Micro[ -]?ATX)/i.test(input.name) && plainAtx(text)), r.metaDescription);
    check(`${label}: no claim_conflict`, r.claimConflicts.length === 0 && !r.flags.includes("claim_conflict"), r.metaDescription);
    check(`${label}: keyword = title core + " price in bangladesh"`, keywordOk(r), r.primaryKeyword);
  }

  // The gate itself: a description that contradicts the name.
  equal("conflict: M-ATX in the name, ATX in the text", findFormFactorConflicts("MSI X M-ATX Board", "MSI X: ATX form factor.").length, 1);
  equal("conflict: E-ATX in the name, Micro-ATX in the text", findFormFactorConflicts("MSI X E-ATX Board", "MSI X: Micro-ATX form factor.").length, 1);
  equal("no conflict: the name says none", findFormFactorConflicts("MSI B450M-A PRO", "MSI B450M-A PRO: ATX form factor.").length, 0);
  equal("no conflict: the same form, another spelling", findFormFactorConflicts("X Micro ATX Case", "X Micro ATX Case: Micro-ATX form factor.").length, 0);
  {
    const base = generateProductSeo(mk("MSI B760M GAMING PLUS WIFI 6E M-ATX", "MSI", MB, [attr("socket", "Socket", "LGA1700"), row("Form Factor", "M-ATX"), row("Memory Type", "DDR5")]));
    const conflicted: SeoResult = { ...base, claimConflicts: ["ATX in the description, the name says Micro-ATX"], flags: [...base.flags, "claim_conflict"], needsReview: true };
    check("claim_conflict: the row is skipped, even with --allow-few-specs and --overwrite", decideApply(conflicted, { metaTitle: null, metaDescription: null, seoSource: null }, { allowFewSpecs: true, overwrite: true }).action === "skip: claim_conflict");
  }

  // 3) Claims: only the name's words or an informative spec row. The stored attributes are the import script's guesses.
  const poisoned: [string, SeoProductInput][] = [
    ["Edifier W600BT", mk("Edifier W600BT Wireless Headphone Grey No ANC 30Hr 1 Year Warranty", "Edifier", HP, [attr("audioType", "Type", "In-ear"), attr("connectivity", "Connectivity", "Wireless"), attr("microphone", "Microphone", "Yes"), row("Microphone", "Yes")])],
    ["Edifier Gm3 Plus TWS", mk("Edifier Gm3 Plus TWS Black No ANC, 1 Year Warranty", "Edifier", HP, [attr("audioType", "Type", "True Wireless"), attr("connectivity", "Connectivity", "Bluetooth"), attr("microphone", "Microphone", "Yes"), row("Microphone", "Yes")])],
    ["Edifier NeoBuds Plus", mk("Edifier NeoBuds Plus Black 48dB ANC Buds with Hi-Res, LDAC, Wireless, 45 Hours Battery - 1 Year Warranty", "Edifier", HP, [attr("audioType", "Type", "In-ear"), attr("connectivity", "Connectivity", "Wireless"), attr("microphone", "Microphone", "Yes")])],
    ["Edifier Comfo Q OWS", mk("Edifier Comfo Q OWS Headphone Back, No ANC, 32 Hours Battery - 1 Year Warranty", "Edifier", HP, [attr("audioType", "Type", "Over-ear"), attr("microphone", "Microphone", "Yes"), row("Microphone", "Yes")])],
    ["Honor Choice Earbuds X7 Lite", mk("HONOR CHOICE Earbuds X7 Lite White, 6 Month Warranty.", "Honor", ["Earphone", "Gadget"], [attr("audioType", "Type", "In-ear"), attr("microphone", "Microphone", "Yes"), row("Microphone", "Yes")])],
  ];
  for (const [label, input] of poisoned) {
    const r = gen(input);
    check(`${label}: no microphone, mic or built-in (the name never says it)`, !/micro|\bmic\b|built-in/i.test(r.metaDescription), r.metaDescription);
    check(`${label}: no ANC claim`, !/\bANC\b/.test(r.metaDescription.replace(r.titleCore, "")), r.metaDescription);
    check(`${label}: the removed claims are counted and the row says so`, r.unsupportedClaims.includes("microphone") && r.flags.includes("unsupported_claim"), `${r.unsupportedClaims.join()} :: ${r.flags.join()}`);
    check(`${label}: keyword = title core + " price in bangladesh"`, keywordOk(r), r.primaryKeyword);
  }
  const resultOf = (label: string) => generateProductSeo(poisoned.find(([l]) => l === label)![1]);
  check("W600BT: in-ear is not claimed (the name does not say it; W600BT is an over-ear)", !/in-ear/.test(resultOf("Edifier W600BT").metaDescription));
  check("Gm3 Plus TWS: no Bluetooth claim (the attribute guessed it)", !/bluetooth/i.test(resultOf("Edifier Gm3 Plus TWS").metaDescription));
  check("Comfo Q OWS: no over-ear (the name says OWS, the attribute guessed Over-ear)", !/over-ear/i.test(resultOf("Edifier Comfo Q OWS").metaDescription));
  check("NeoBuds Plus: 'wireless' stays (the name says Wireless); in-ear does not", /wireless/i.test(resultOf("Edifier NeoBuds Plus").metaDescription) && !/in-ear/.test(resultOf("Edifier NeoBuds Plus").metaDescription), resultOf("Edifier NeoBuds Plus").metaDescription);
  check("Honor Choice Earbuds X7 Lite: the type is Earbuds, nothing else is claimed", resultOf("Honor Choice Earbuds X7 Lite").type === "Earbuds" && !/in-ear|micro/.test(resultOf("Honor Choice Earbuds X7 Lite").metaDescription));
  {
    const noAnc = gen(mk("Edifier W220T TWS Black No ANC 1 Year Warranty", "Edifier", HP, []));
    check("'No ANC' is part of the name: not an unsupported claim, not a review flag", !noAnc.flags.includes("unsupported_claim") && !noAnc.needsReview && noAnc.unsupportedClaims.length === 0, `${noAnc.flags.join()} :: ${noAnc.metaDescription}`);
  }
  // ... and the claims that ARE supported are still made.
  {
    const named = gen(mk("Acme Z100 Wired Headset with Mic", "Acme", HP, [attr("microphone", "Microphone", "Yes"), attr("connectivity", "Connectivity", "Wired")]));
    check("the name says Wired and Mic: both are claimed", /wired/i.test(named.metaDescription) && /microphone/i.test(named.metaDescription), named.metaDescription);
    check("a supported claim is not counted as removed", named.unsupportedClaims.length === 0 && !named.flags.includes("unsupported_claim"), named.unsupportedClaims.join());
    const rowBuiltIn = gen(mk("Acme Z200 Headset", "Acme", HP, [row("Microphone", "Built-in"), row("Type", "Over-ear"), attr("connectivity", "Connectivity", "Wireless")]));
    check("an informative spec ROW (Built-in, Over-ear) is trusted", /built-in microphone/.test(rowBuiltIn.metaDescription) && /over-ear/.test(rowBuiltIn.metaDescription), rowBuiltIn.metaDescription);
    const bareRow = gen(mk("Acme Z300 Headset", "Acme", HP, [row("Microphone", "Yes"), row("Type", "Over-ear")]));
    check("a bare 'Microphone: Yes' row is not evidence", !/micro/i.test(bareRow.metaDescription) && /over-ear/.test(bareRow.metaDescription), bareRow.metaDescription);
  }
  // The net does not care which stored shape leaked: it checks the text against the name and the informative rows.
  {
    const ev = (name: string, rows: SpecFact[] = []) => claimEvidence(name, ["Headphone"], rows);
    equal("net: nothing backs a microphone", unsupportedClaims("wireless headset with microphone", ev("Acme Z1 Headset")).join(), "microphone,wireless");
    equal("net: the name backs it", unsupportedClaims("wireless headset with microphone", ev("Acme Z1 Wireless Headset with Mic")).join(), "");
    equal("net: an attribute is not evidence", unsupportedClaims("headset with microphone", ev("Acme Z1 Headset", [attr("microphone", "Microphone", "Built-in")])).join(), "microphone");
    equal("net: a bare Yes row is not evidence", unsupportedClaims("headset with microphone", ev("Acme Z1 Headset", [row("Microphone", "Yes")])).join(), "microphone");
    equal("net: an informative row is evidence", unsupportedClaims("headset with built-in microphone", ev("Acme Z1 Headset", [row("Microphone", "Built-in")])).join(), "");
    equal("net: 'No ANC' in the name is not support for ANC", unsupportedClaims("ANC headphone", ev("Edifier Comfo Q OWS No ANC")).join(), "ANC");
    equal("net: '48dB ANC' backs ANC", unsupportedClaims("ANC headphone", ev("Edifier NeoBuds Plus 48dB ANC Buds")).join(), "");
    equal("net: 'without noise cancelling' is not support", unsupportedClaims("noise cancelling headset", ev("Acme Z1 without noise cancelling")).join(), "ANC");
    equal("net: in-ear needs the words in-ear", unsupportedClaims("in-ear headphone", ev("Edifier NeoBuds Plus Buds")).join(), "in-ear");
    equal("net: 'In-Earphone' in the name backs in-ear", unsupportedClaims("in-ear headphone", ev("Huawei AM116 In-Earphone 3.5 mm jack Mic")).join(), "");
    equal("net: 'built-in earbuds' does not back in-ear", unsupportedClaims("in-ear headphone", ev("Acme Case with built-in earbuds")).join(), "in-ear");
    equal("net: over-ear, on-ear and open-ear are separate claims", unsupportedClaims("on-ear headphone", ev("Acme Over-Ear Headphone")).join(), "on-ear");
    equal("net: Bluetooth backed by the name, its version is not", unsupportedClaims("Bluetooth 5.3 headset", ev("Acme Bluetooth Headset")).join(), "bluetooth 5.3");
    equal("net: the version from the name", unsupportedClaims("Bluetooth 5.3 headset", ev("Acme Headset BT 5.3")).join(), "");
    equal("net: a category word is evidence (a 'Wireless Mouse' category)", unsupportedClaims("wireless mouse", claimEvidence("Acme M1", ["Wireless Mouse"], [])).join(), "");
    equal("net: no claim words, nothing to check", unsupportedClaims("Core i5-1335U, 16GB RAM, 512GB SSD", ev("Acme Laptop")).join(), "");
    const belowMin: SeoResult = { ...generateProductSeo(mk("Edifier W600BT Wireless Headphone", "Edifier", HP, [attr("microphone", "Microphone", "Yes"), row("Microphone", "Yes")])), specsAvailable: 1, claimSpecsDropped: 1 };
    equal("unsupported_claim below the minimum: the row is skipped and says why", decideApply({ ...belowMin, flags: [...belowMin.flags, "unsupported_claim"] }, { metaTitle: null, metaDescription: null, seoSource: null }, { minSpecs: 2 }).action, "skip: unsupported_claim: fewer than 2 specs once it is dropped");
    equal("a row that was short anyway is a plain 'fewer than' skip, not an unsupported_claim skip", decideApply({ ...belowMin, specsAvailable: 0, claimSpecsDropped: 1, flags: [...belowMin.flags, "unsupported_claim"] }, { metaTitle: null, metaDescription: null, seoSource: null }, { minSpecs: 3 }).action, "skip: fewer than 3 specs (use --allow-few-specs)");
    check("the generator counts the specs it dropped for a claim", resultOf("Edifier W600BT").claimSpecsDropped >= 1 && resultOf("Edifier Gm3 Plus TWS").claimSpecsDropped >= 1, `${resultOf("Edifier W600BT").claimSpecsDropped}`);
    check("unsupported_claim with enough specs left: the row is written without the claim", decideApply({ ...belowMin, specsAvailable: 3, flags: [...belowMin.flags, "unsupported_claim"] }, { metaTitle: null, metaDescription: null, seoSource: null }, { minSpecs: 2 }).write === true);
  }

  // 4) A generic category is not a product type.
  {
    const honor600 = gen(mk("HONOR 600 Pro (12+256) Black, 1 Year Warranty.", "Honor", PHONE, [row("Display", "6.57 inches"), row("Size", "6.57 inches")]));
    const honorX7d = gen(mk("HONOR X7d (8+256) Titanium Black, 1 Year Warranty", "Honor", PHONE, [row("Display", "6.77 inches"), row("Size", "6.77 inches")]));
    for (const [label, r] of [["HONOR 600 Pro", honor600], ["HONOR X7d", honorX7d]] as [string, SeoResult][]) {
      check(`${label}: never an "Accessory"`, !/accessor/i.test(`${r.title} ${r.metaDescription} ${r.primaryKeyword}`), r.title);
      check(`${label}: no usable type -> flag unusable_type, review, skipped`, r.type === "" && r.flags.includes("unusable_type") && r.needsReview && decideApply(r, { metaTitle: null, metaDescription: null, seoSource: null }, { allowFewSpecs: true }).action === "skip: unusable_type", `${r.type} ${r.flags.join()}`);
      check(`${label}: no "size" phrase, the diagonal once`, !/size/.test(r.metaDescription) && (r.metaDescription.match(/6\.\d\d? inch/g) ?? []).length === 1, r.metaDescription);
      check(`${label}: keyword = title core + " price in bangladesh"`, keywordOk(r), r.primaryKeyword);
    }
    check("a name that states its type is usable even in Mobile Accessories", (() => {
      const r = gen(mk("HONOR X9c Smartphone (8+256) Midnight Black", "Honor", PHONE, [row("Display", "6.78 inches"), row("Size", "6.78 inches")]));
      return r.type === "Smartphone" && !r.flags.includes("unusable_type") && !/accessor/i.test(r.title) && !/size/.test(r.metaDescription);
    })());
    check("earbuds in Mobile Accessories take the name's own type, not the bucket", (() => {
      const r = gen(mk("Honor Choice Earbuds X5 White, 35 Hr Battery Backup, ANC  Bluetooth Earbuds, 1 Year Warranty", "Honor", PHONE));
      return r.type === "Earbuds" && /Earbuds/.test(r.title) && !/accessor/i.test(r.title);
    })());
    check("an umbrella leaf still falls through to the parent category (unchanged)", generateProductSeo(mk("Acme X1 Wireless", "Acme", ["Accessories", "Headphone"])).type === "Headphone");
    check("a real category type is untouched", generateProductSeo(mk("Acme Z9 Gaming", "Acme", ["Keyboard", "Accessories"])).type === "Keyboard");
    equal("duplicate phrase: 6.57 inch display + 6.57 inches size is one spec", pickSpecPhrases([row("Display", "6.57 inches"), row("Size", "6.57 inches")], "other", "Honor").join(" | "), "6.57 inch display");
    check("duplicate phrase: a bare Size row never becomes an '8GB size' phrase", !pickSpecPhrases([row("Size", "8GB")], "other", "Acme").some((phrase) => /size/.test(phrase)), pickSpecPhrases([row("Size", "8GB")], "other", "Acme").join());
  }

  // 5) Graphics cards: "8GB GDDR6", no "size", no maximum resolution, no chip from a SKU.
  {
    const gpuRows = (size: string): Shape => [row("Size", size), row("Resolution", "7680x4320")];
    const r9060 = gen(mk("GIGABYTE AMD # GV-R9060XTGAMING OC-8GD, GDDR6, Memory Clock-20 Gbps, Memory Bus-128 bit, Power supply requirement: 450W", "Gigabyte", GPU, gpuRows("8GB")));
    const arc = gen(mk("GIGABYTE Intel Arc A310 GV-IA310WF2-4GD WINDFORCE 4G GDDR6 Graphics Card Graphics Clock: 2000 MHz Memory: 4GB GDDR6 Memory Bandwidth (GB/sec): 124 GB/s Output: DP x2, HDMI x2", "Gigabyte", GPU, gpuRows("4GB")));
    const rtx = gen(mk("GIGABYTE GeForce RTX 3050 WINDFORCE OC 6GB GDDR6", "Gigabyte", GPU, gpuRows("6GB")));
    const n5070 = gen(mk("GIGABYTE NVIDIA # GV-N5070GAMING OC-16GD", "Gigabyte", GPU, gpuRows("16GB")));
    for (const [label, r] of [["GV-R9060XTGAMING OC-8GD", r9060], ["Arc A310 WINDFORCE", arc], ["GeForce RTX 3050 WINDFORCE OC 6GB", rtx], ["GV-N5070GAMING OC-16GD", n5070]] as [string, SeoResult][]) {
      check(`${label}: never "<n>GB size" and no maximum-resolution phrase`, !/\d\s?GB size|size|7680|resolution/i.test(r.metaDescription), r.metaDescription);
      check(`${label}: clean (no bad_spec_phrase), keyword = title core + " price in bangladesh"`, r.badSpecPhrases.length === 0 && keywordOk(r), r.badSpecPhrases.join());
    }
    check("GV-R9060XTGAMING OC-8GD: 8GB with the type from the name -> '8GB GDDR6'", /8GB GDDR6\./.test(r9060.metaDescription), r9060.metaDescription);
    check("GV-R9060XTGAMING OC-8GD: the Radeon chip is NOT derived from the SKU", !/radeon|RX ?9060/i.test(`${r9060.title} ${r9060.metaDescription}`), r9060.title);
    check("Arc A310: the chip is in the title and the memory is '4GB GDDR6'", /Arc A310/.test(arc.title) && /4GB GDDR6/.test(arc.metaDescription), `${arc.title} | ${arc.metaDescription}`);
    check("GeForce RTX 3050 (in the name's core): the chip stays in the title; 6GB without an invented type", /RTX 3050/.test(rtx.title) && /6GB GDDR6/.test(rtx.metaDescription), `${rtx.title} | ${rtx.metaDescription}`);
    check("GV-N5070GAMING: no RTX 5070 anywhere (a SKU is not a statement); the stored 16GB is 'VRAM', not 'size'", !/RTX|5070 /.test(`${n5070.title} ${n5070.metaDescription}`.replace("GV-N5070GAMING", "")) && /16GB VRAM/.test(n5070.metaDescription), `${n5070.title} | ${n5070.metaDescription}`);
    // The chip written only in the tail of the name goes into the title when the title still fits.
    const tail = gen(mk("GIGABYTE # GV-N3050OC-6GD, GeForce RTX 3050 6GB GDDR6", "Gigabyte", GPU, gpuRows("6GB")));
    check("a chip in the name's tail is added to the title when it fits", /GV-N3050OC-6GD GeForce RTX 3050 Graphics Card/.test(tail.title) && tail.title.length <= 60 && !tail.flags.includes("foreign_code"), tail.title);
    const longSku = gen(mk("GIGABYTE NVIDIA # GV-N3050WF2OC-6GD, GeForce RTX 3050 WINDFORCE OC 6GB GDDR6", "Gigabyte", GPU, gpuRows("6GB")));
    check("a chip that would push the title over 60 is left out (the row is not turned into a skip)", !/RTX 3050/.test(longSku.title) && longSku.title.length <= 60 && !longSku.flags.includes("title_over_60"), longSku.title);
    equal("memory from the name: 4G GDDR6", JSON.stringify(extractGpuMemoryFromName("Arc A310 WINDFORCE 4G GDDR6 Graphics Card")), JSON.stringify({ size: "4GB", type: "GDDR6" }));
    equal("memory from the name: 8GB GDDR6X", JSON.stringify(extractGpuMemoryFromName("RTX 4070 8GB GDDR6X")), JSON.stringify({ size: "8GB", type: "GDDR6X" }));
    equal("memory from the name: a type with no size", JSON.stringify(extractGpuMemoryFromName("GV-R9060XTGAMING OC-8GD, GDDR6, Memory Bus-128 bit")), JSON.stringify({ size: null, type: "GDDR6" }));
    equal("memory from the name: a SKU's 8GD / 16GD is not a size", extractGpuMemoryFromName("GV-N5070GAMING OC-16GD"), null);
    equal("memory from the name: 124 GB/s is bandwidth, not memory", extractGpuMemoryFromName("Memory Bandwidth (GB/sec): 124 GB/s"), null);
    equal("memory from the name: two different sizes are not guessed between", extractGpuMemoryFromName("RTX 3050 6GB or 8GB")?.size ?? null, null);
    equal("chip: GeForce RTX 3050", extractGpuChipFromName("GIGABYTE GeForce RTX 3050 WINDFORCE OC 6GB"), "GeForce RTX 3050");
    equal("chip: RTX 5060 Ti", extractGpuChipFromName("Gigabyte RTX 5060 Ti 16GB"), "RTX 5060 Ti");
    equal("chip: Arc A310", extractGpuChipFromName("GIGABYTE Intel Arc A310 GV-IA310WF2-4GD"), "Arc A310");
    equal("chip: Radeon RX 9060 XT", extractGpuChipFromName("Gigabyte Radeon RX 9060 XT GAMING OC 16G"), "Radeon RX 9060 XT");
    equal("chip: none from GV-N5070GAMING", extractGpuChipFromName("GIGABYTE NVIDIA # GV-N5070GAMING OC-16GD"), null);
    equal("chip: none from GV-R9060XTGAMING OC-8GD", extractGpuChipFromName("GIGABYTE AMD # GV-R9060XTGAMING OC-8GD"), null);
  }

  // 6) The bad-phrase lint.
  equal("lint: '8GB size'", findBadSpecPhrases("Acme Card – 8GB size, 7680x4320 resolution.", ["8GB size", "7680x4320 resolution"]).join(), "8GB size");
  equal("lint: '6.57 inches size'", findBadSpecPhrases("Honor – 6.57 inch display, 6.57 inches size.", ["6.57 inch display", "6.57 inches size"]).includes("6.57 inches size"), true);
  equal("lint: '6.57 inch, 6.57 inches'", findBadSpecPhrases("Honor: 6.57 inch, 6.57 inches.", ["6.57 inch", "6.57 inches"]).length > 0, true);
  equal("lint: the same quantity in two phrases", findBadSpecPhrases("Acme: 8GB RAM, 8GB GDDR6.", ["8GB RAM", "8GB GDDR6"]).join(), "8gb twice");
  equal("lint: a clean description", findBadSpecPhrases("Dell: Core i5-1335U, 16GB RAM, 512GB SSD, 15.6 inch display.", ["Core i5-1335U", "16GB RAM", "512GB SSD", "15.6 inch display"]).length, 0);
  {
    const base = generateProductSeo(mk("Acme Card", "Acme", GPU, []));
    const bad: SeoResult = { ...base, badSpecPhrases: ["8GB size"], flags: [...base.flags, "bad_spec_phrase"], needsReview: true };
    equal("bad_spec_phrase: the row is skipped", decideApply(bad, { metaTitle: null, metaDescription: null, seoSource: null }, { allowFewSpecs: true }).action, "skip: bad_spec_phrase");
  }
  // None of the fixtures of this file (the five samples, the family fixtures, the real names, the v2.4 fixtures) trips a gate it should not.
  {
    const all = [...fixtures, ...set, ...realSet];
    check("no earlier fixture is flagged bad_spec_phrase or claim_conflict", all.every((r) => r.badSpecPhrases.length === 0 && r.claimConflicts.length === 0), all.filter((r) => r.badSpecPhrases.length > 0 || r.claimConflicts.length > 0).map((r) => r.title).join(" | "));
    check("every fixture keeps keyword = title core + ' price in bangladesh'", all.every(keywordOk), all.filter((r) => !keywordOk(r)).map((r) => r.title).join(" | "));
  }

  // 7) Refresh: rows that already have generated text.
  {
    const input = mk("MSI B760M GAMING PLUS WIFI 6E M-ATX", "MSI", MB, [attr("socket", "Socket", "LGA1700"), row("Form Factor", "M-ATX"), row("Memory Type", "DDR5")]);
    const next = generateProductSeo(input);
    const none = { metaTitle: null, metaDescription: null, seoSource: null };
    const oldGenerated = { metaTitle: next.title, metaDescription: next.metaDescription.replace("Micro-ATX", "ATX"), seoSource: "generated" };
    const same = { metaTitle: next.title, metaDescription: next.metaDescription, seoSource: "generated" };
    const byHand = { metaTitle: "My own title", metaDescription: "Written by the shop owner.", seoSource: "admin" };
    const noSource = { metaTitle: "Old title", metaDescription: "Old text", seoSource: null };
    equal("refresh: generated text that changed is an `update`", decideApply(next, oldGenerated).action, "update");
    check("refresh: ... and it is written", decideApply(next, oldGenerated).write === true);
    equal("refresh: generated text that did not change is `unchanged`", decideApply(next, same).action, "unchanged");
    check("refresh: ... and it is not written", decideApply(next, same).write === false);
    equal("a new row is a `write`", decideApply(next, none).action, "write");
    equal("an admin-edited row is skipped", decideApply(next, byHand).action, "skip: written by hand (use --overwrite)");
    check("an admin-edited row is NOT written, whatever the new text is", decideApply(next, byHand).write === false && decideApply(next, byHand, { allowFewSpecs: true }).write === false && decideApply(next, byHand, { minSpecs: 0 }).write === false);
    check("an admin-edited row is replaced only with --overwrite", decideApply(next, byHand, { overwrite: true }).action === "update");
    equal("stored text with no source is skipped too", decideApply(next, noSource).action, "skip: has stored text with no source (use --overwrite)");
    const conflicted: SeoResult = { ...next, claimConflicts: ["x"], flags: [...next.flags, "claim_conflict"], needsReview: true };
    const stale = decideApply(conflicted, oldGenerated);
    check("refresh: a generated row whose new text is blocked says so (its old text stays live)", stale.action === "skip: claim_conflict (generated text stays live)" && isStaleGenerated(stale) && stale.write === false, stale.action);
    check("an admin row with a blocked new text is a plain skip (nothing stale about it)", decideApply(conflicted, byHand).action === "skip: claim_conflict" && !isStaleGenerated(decideApply(conflicted, byHand)));
    const rows = [
      { id: "new", decision: decideApply(next, none) },
      { id: "changed", decision: decideApply(next, oldGenerated) },
      { id: "same", decision: decideApply(next, same) },
      { id: "admin", decision: decideApply(next, byHand) },
      { id: "nosource", decision: decideApply(next, noSource) },
      { id: "blocked", decision: decideApply(conflicted, oldGenerated) },
    ];
    equal("apply writes only `write` and `update` rows (never unchanged, hand-written or blocked)", rowsToWrite(rows).map((r) => r.id).join(), "new,changed");
    equal("the refresh dry run counts every row: nothing is silent", countActions(rows.map((r) => r.decision)).map(([a, n]) => `${a}=${n}`).sort().join(" | "), ["skip: claim_conflict (generated text stays live)=1", "skip: has stored text with no source (use --overwrite)=1", "skip: written by hand (use --overwrite)=1", "unchanged=1", "update=1", "write=1"].sort().join(" | "));
    equal("an alt-only change still goes through rowsToWrite (opt-in --apply-alts)", rowsToWrite([{ id: "alt", decision: decideApply(next, same), alt: { imageId: "i" } }]).length, 1);
  }
}

// --- v2.4 (cosmetic): shouted plain English words are normal words; the type word is the standard one ------------

{
  const unit: [string, string][] = [
    ["MID-TOWER", "Mid-Tower"], ["MOTHERBOARD", "Motherboard"], ["CASING", "Casing"], ["KEYBOARD", "Keyboard"], ["GAMING", "Gaming"],
    ["MECHANICAL", "Mechanical"], ["BLACK", "Black"], ["(BLACK)", "(Black)"], ["BLACK,", "Black,"], ["MICRO", "Micro"],
    // kept: brands, model lines, acronyms, standards, model codes (a digit)
    ["MSI", "MSI"], ["AORUS", "AORUS"], ["MORTAR", "MORTAR"], ["RGB", "RGB"], ["ARGB", "ARGB"], ["ATX", "ATX"], ["M-ATX", "M-ATX"],
    ["DDR5", "DDR5"], ["WIFI6E", "WIFI6E"], ["WIFI", "WIFI"], ["PSU", "PSU"], ["B650-PLUS", "B650-PLUS"], ["K552", "K552"], ["WF7", "WF7"],
    ["Gaming", "Gaming"], ["black", "black"],
  ];
  for (const [input, expected] of unit) equal(`softenPlainWords("${input}")`, softenPlainWords(input), expected);
  equal("standard type: CASING", standardType("CASING"), "Case");
  equal("standard type: Casing", standardType("Casing"), "Case");
  equal("standard type: Case", standardType("Case"), "Case");
  equal("standard type: Keyboard is untouched", standardType("Keyboard"), "Keyboard");

  let k = 0;
  const mk = (name: string, brand: string, chain: string[]): SeoProductInput => {
    k += 1;
    return { id: `cap-${k}`, name, brand, categoryChain: chain, sku: `CAP-${k}`, modelNumber: null, specs: [] };
  };
  const CASE = ["Casing", "Component"];
  const MB = ["Motherboard", "Component"];
  const fx2: [string, SeoProductInput, string[], string[]][] = [
    // [label, input, must be in the title, must NOT be in the title or description]
    ["Xtreme M95B MINI TOWER M-ATX BLACK CASE TEMPERED GLASS", mk("XTREME M95B MINI TOWER M-ATX BLACK CASE TEMPERED GLASS WITH 3 ARGB FAN WITHOUT PSU", "Xtreme", CASE), ["Xtreme M95B Mini Tower M-ATX Black Case Tempered Glass"], ["MINI TOWER", "BLACK", "TEMPERED", "CASE "]],
    ["Xtreme C31B M-ATX BLACK CASE", mk("XTREME C31B M-ATX BLACK CASE TEMPERED GLASS WITH 3 RGB FAN WITHOUT PSU", "Xtreme", CASE), ["Xtreme C31B M-ATX Black Case Tempered Glass"], ["BLACK", "TEMPERED"]],
    ["Delux J601 MICRO ATX COMPUTER CASE", mk("DELUX J601 MICRO ATX COMPUTER CASE WITH 200W REAL POWER SUPPLY, 2Y WARRANTY FOR PSU", "Delux", CASE), ["Delux J601 Micro ATX Computer Case"], ["MICRO", "COMPUTER"]],
    ["MSI B760M GAMING PLUS WIFI 6E M-ATX", mk("MSI B760M GAMING PLUS WIFI 6E M-ATX", "MSI", MB), ["MSI B760M Gaming Plus"], ["GAMING"]],
    ["MSI MAG B860M MORTAR ... MOTHERBOARD", mk("MSI MAG B860M MORTAR WIFI LGA 1851 M-ATX MOTHERBOARD", "MSI", MB), ["MSI MAG B860M MORTAR", "Motherboard"], ["MOTHERBOARD"]],
    ["GIGABYTE B650 AORUS ELITE AX ICE WIFI6E ATX MOTHERBOARD DDR5", mk("GIGABYTE B650 AORUS ELITE AX ICE WIFI6E ATX MOTHERBOARD DDR5", "Gigabyte", MB), ["B650 AORUS ELITE AX ICE WIFI6E ATX Motherboard DDR5"], ["MOTHERBOARD"]],
    ["Redragon K552 KUMARA MECHANICAL GAMING KEYBOARD BLACK RGB", mk("REDRAGON K552 KUMARA MECHANICAL GAMING KEYBOARD BLACK RGB", "Redragon", ["Keyboard", "Accessories"]), ["K552 KUMARA Mechanical Gaming Keyboard Black RGB"], ["MECHANICAL", "KEYBOARD", "BLACK"]],
    ["a hyphenated word: MID-TOWER", mk("ACME X100 MID-TOWER ATX GAMING CASE", "Acme", CASE), ["Acme X100 Mid-Tower ATX Gaming Case"], ["MID-TOWER", "GAMING"]],
    ["ASUS TUF GAMING B650-PLUS (a model code with a word inside it is kept)", mk("ASUS TUF GAMING B650-PLUS WIFI DDR5 ATX MOTHERBOARD", "ASUS", MB), ["TUF Gaming B650-PLUS"], ["MOTHERBOARD"]],
  ];
  const results = fx2.map(([, input]) => generateProductSeo(input));
  fx2.forEach(([label, , must, mustNot], i) => {
    const r = results[i]!;
    for (const text of must) check(`${label}: title has "${text}"`, r.title.includes(text), r.title);
    const both = `${r.title} ${r.metaDescription}`;
    for (const text of mustNot) check(`${label}: no shouted "${text.trim()}" left`, !both.includes(text), both);
    check(`${label}: no model token lost, keyword = title core + " price in bangladesh"`, !r.flags.includes("model_token_lost") && r.primaryKeyword === `${r.titleCore.toLowerCase()} price in bangladesh`, `${r.flags.join()} :: ${r.primaryKeyword}`);
  });
  // The type word is the standard one.
  const onlyCasing = generateProductSeo(mk("XTREME C77 CASING TEMPERED GLASS BLACK", "Xtreme", CASE));
  check("a name whose only type word is CASING: the type is Case", onlyCasing.type === "Case" && /\bCase\b/.test(onlyCasing.title) && !/casing/i.test(onlyCasing.title), `${onlyCasing.type} | ${onlyCasing.title}`);
  const categoryCasing = generateProductSeo(mk("Xtreme C41 Tempered Glass Black", "Xtreme", CASE));
  check("a category called Casing and no type word in the name: the type is Case", categoryCasing.type === "Case" && /Black Case Price/.test(categoryCasing.title) && !/casing/i.test(categoryCasing.title), `${categoryCasing.type} | ${categoryCasing.title}`);
  const both = generateProductSeo(mk("CORSAIR CASING Crystal Series 280X RGB Tempered Glass Micro ATX White Case # CC-9011137-WW", "Corsair", CASE));
  check("a name with Casing AND Case keeps both words (Casing is part of the line, Case is the type)", /Corsair Casing Crystal Series 280X RGB Case/.test(both.title), both.title);
  // No plain English word stays shouted anywhere in the output of the fixtures of this file.
  const every = [...results, onlyCasing, categoryCasing, both, ...set, ...realSet];
  const shouted = (r: SeoResult) =>
    // whole whitespace tokens: a token with a digit is a model code ("B650-PLUS") and is exempt; "MID-TOWER" is checked per part
    `${r.title} ${r.metaDescription}`
      .split(/\s+/)
      .map((token) => token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
      .filter((token) => token && !/\d/.test(token))
      .flatMap((token) => token.split("-"))
      .filter((word) => /^[A-Z]{2,}$/.test(word) && PLAIN_WORDS.has(word.toLowerCase()));
  check("no dictionary word is left shouted in any title or description of the fixtures", every.every((r) => shouted(r).length === 0), every.filter((r) => shouted(r).length > 0).map((r) => `${r.title} [${shouted(r).join()}]`).join(" | "));
}

// --- stored meta helpers -------------------------------------------------------

{
  const template = { title: "T template", description: "D template" };
  equal("stored title+description win verbatim", JSON.stringify(resolveProductMeta({ metaTitle: " My Title ", metaDescription: "My description" }, template)), JSON.stringify({ title: "My Title", description: "My description" }));
  equal("empty / whitespace falls back to the template", JSON.stringify(resolveProductMeta({ metaTitle: "  ", metaDescription: null }, template)), JSON.stringify(template));
  equal("only the stored half is used", JSON.stringify(resolveProductMeta({ metaTitle: "Only title" }, template)), JSON.stringify({ title: "Only title", description: "D template" }));
  const none = { metaTitle: null, metaDescription: null };
  equal("form not sent (bulk import) writes nothing", JSON.stringify(planSeoMetaWrite({}, none)), "{}");
  equal("blank form on a blank product writes nothing", JSON.stringify(planSeoMetaWrite({ metaTitle: "", metaDescription: "" }, none)), "{}");
  const typed = planSeoMetaWrite({ metaTitle: "Hand written", metaDescription: "" }, none);
  check("hand-typed text becomes source 'admin'", typed.metaTitle === "Hand written" && typed.metaDescription === null && typed.seoSource === "admin");
  const gen = { metaTitle: "Generated T", metaDescription: "Generated D" };
  equal("saving an untouched form keeps the generated source", JSON.stringify(planSeoMetaWrite({ metaTitle: "Generated T", metaDescription: "Generated D" }, gen)), "{}");
  const edited = planSeoMetaWrite({ metaTitle: "Generated T", metaDescription: "Edited D" }, gen);
  check("editing one field flips to 'admin'", edited.seoSource === "admin" && edited.metaDescription === "Edited D");
  const cleared = planSeoMetaWrite({ metaTitle: "", metaDescription: "" }, gen);
  check("clearing both removes the stored meta and the source", cleared.metaTitle === null && cleared.metaDescription === null && cleared.seoSource === null);
}

console.log(failures === 0 ? `ok ${checks} product-seo checks` : `failed ${failures}/${checks} product-seo checks`);
process.exit(failures === 0 ? 0 : 1);
