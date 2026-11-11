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
import { countActions, decideApply } from "@/lib/seo/product-seo-apply";
import {
  generateProductSeo,
  generateProductSeoSet,
  hashId,
  isJunkValue,
  pickSpecPhrases,
  planSeoMetaWrite,
  resolveProductMeta,
  type SeoProductInput,
  type SeoResult,
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
  [["Processor", "Core i5-1135G7", "processor"], ["RAM", "8GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: ["3420-CORP"], type: "Laptop" });
const dell4 = fx("Dell", "Dell Latitude 3420-CORP Core i5 11th Gen 4GB RAM 256GB SSD 14 Inch", ["All Laptop", "Laptop"],
  [["Processor", "Core i5-1135G7", "processor"], ["RAM", "4GB", "ram"], ["Storage", "256GB SSD", "storage"], ["Display", "14 inch", "size"]], { model: ["3420-CORP"], type: "Laptop" });

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
  check("Dell titles still <= 60 with model + type", [r8, r4].every((r) => r && r.title.length <= 60 && /3420-CORP/.test(r.title) && /Laptop/.test(r.title)), `${r8?.title} | ${r4?.title}`);
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
  check("gpu: chip + VRAM", gpu.specsUsed[0]?.includes("RTX 4060 Ti") && gpu.specsUsed.some((s) => s.includes("8GB GDDR6 VRAM")), gpu.specsUsed.join(" | "));
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
  check("fixtures with 3+ real facts reach 3+ specs unless the model core is long", sparse.every((f) => picked(f).length < 3 || generateProductSeo(f).titleCore.length >= 38), sparse.map((f) => `${f.name} [${generateProductSeo(f).specsUsed.length}/${picked(f).length}]`).join(" | "));
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
  { brand: "Dell", name: "Dell Latitude 3420-CORP Core i5 11th Gen 8GB RAM 256GB SSD 14 Inch", chain: ["All Laptop", "Laptop"], must: ["Latitude", "3420-CORP"], type: "Laptop",
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
  const rawTokens = new Set(`${m.name} ${m.brand}`.toLowerCase().split(/[\s,:|]+/).map((t) => t.replace(/[^a-z0-9]/g, "")).filter(Boolean));
  const titleCodes = r.title.replace(/ \| Techno House$/, "").split(/\s+/).filter((t) => /\d/.test(t) && !/^(?:Price|in|BD|Bangladesh)$/.test(t));
  const foreign = titleCodes.filter((t) => !rawTokens.has(t.toLowerCase().replace(/[^a-z0-9]/g, "")));
  check(`${where}: every digit-bearing token of the title is in the raw name`, foreign.length === 0, `foreign: ${foreign.join(" ")} | ${r.title}`);
  // description grammar: "with" only before a noun phrase we wrote ("with built-in mic[rophone]"); never "with <adjective list>"
  const desc = r.metaDescription.slice(r.titleCore.length);
  check(`${where}: no "with <bare adjective list>"`, !/\bwith\b(?! built-in mic)/i.test(desc) && !/, with\b/i.test(desc), r.metaDescription);
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
check("the five production samples: headset description reads naturally", /wired over-ear headset with built-in mic(?:rophone)?\./.test(generateProductSeo(inputs[2]!).metaDescription), generateProductSeo(inputs[2]!).metaDescription);
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
  check("decideApply: model_token_lost beats 'unchanged'", decideApply(lost, { metaTitle: ok.title, metaDescription: ok.metaDescription, seoSource: "generated" }).action === "skip: model_token_lost");
  check("decideApply: foreign_code -> skip", decideApply({ ...ok, flags: [...ok.flags, "foreign_code"], needsReview: true }, stored).action === "skip: foreign_code");
  check("decideApply: hand-written text is kept without --overwrite", decideApply(ok, { metaTitle: "Mine", metaDescription: null, seoSource: "admin" }).action === "skip: written by hand (use --overwrite)");
  check("decideApply: --overwrite replaces it", decideApply(ok, { metaTitle: "Mine", metaDescription: null, seoSource: "admin" }, { overwrite: true }).write === true);
  const counts = countActions([lostDecision, lostDecision, decideApply(ok, stored)]);
  check("countActions groups and orders rows (the dry-run summary lines)", counts[0]?.[0] === "skip: model_token_lost" && counts[0]?.[1] === 2 && counts[1]?.[0] === "write");
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
