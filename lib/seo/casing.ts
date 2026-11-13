/**
 * One central casing map for generated SEO text (SEO phase 8, v2.2). PURE.
 *
 * Proper nouns, standards and units are written one way everywhere: Bluetooth, Wi-Fi, USB, HDMI,
 * DisplayPort, DDR4 / DDR5, IPS, OLED, LED, RGB, SSD, HDD, NVMe, RAM, GHz, Hz, QHD / FHD / UHD, AMD,
 * Intel, NVIDIA, Type-C ... The generator applies it to the words of a title that are NOT part of the
 * model run (a model code keeps the case the raw name gave it: "WIFI" in "B650-PLUS WIFI" stays), to
 * the spec text of a description and to collision extras. Keywords are lower-cased anyway.
 *
 * No regex lookbehind (bundled into the admin form).
 */

/** lower-case word -> canonical form. Brand tokens come from the store's own brand name and are not touched. */
export const CASING: Record<string, string> = {
  bluetooth: "Bluetooth",
  "wi-fi": "Wi-Fi",
  wifi: "Wi-Fi",
  usb: "USB",
  "usb-c": "USB-C",
  "type-c": "Type-C",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  vga: "VGA",
  ddr3: "DDR3",
  ddr4: "DDR4",
  ddr5: "DDR5",
  lpddr4: "LPDDR4",
  lpddr4x: "LPDDR4x",
  lpddr5: "LPDDR5",
  lpddr5x: "LPDDR5x",
  ips: "IPS",
  oled: "OLED",
  amoled: "AMOLED",
  led: "LED",
  lcd: "LCD",
  rgb: "RGB",
  argb: "ARGB",
  ssd: "SSD",
  hdd: "HDD",
  nvme: "NVMe",
  sata: "SATA",
  pcie: "PCIe",
  ram: "RAM",
  qhd: "QHD",
  fhd: "FHD",
  uhd: "UHD",
  wqhd: "WQHD",
  "4k": "4K",
  "8k": "8K",
  amd: "AMD",
  intel: "Intel",
  nvidia: "NVIDIA",
  geforce: "GeForce",
  radeon: "Radeon",
  rtx: "RTX",
  gtx: "GTX",
  ryzen: "Ryzen",
  gigabyte: "GIGABYTE",
  asus: "ASUS",
  msi: "MSI",
  hp: "HP",
  lg: "LG",
  poe: "PoE",
  nvr: "NVR",
  dvr: "DVR",
  ups: "UPS",
  cctv: "CCTV",
};

const UNITS: Record<string, string> = {
  gb: "GB",
  tb: "TB",
  mb: "MB",
  ghz: "GHz",
  mhz: "MHz",
  hz: "Hz",
  mbps: "Mbps",
  gbps: "Gbps",
};

/** Acronyms that stay upper-case when a raw name shouts them. */
export const KEEP_UPPER = new Set("ups ssd hdd nvr dvr xvr pc tv ram gpu psu cpu led lcd usb hdmi ip cc nas".split(" "));

/** Canonical form of ONE token (brackets / trailing punctuation kept), or the token unchanged. */
export function casingOfToken(token: string): string {
  const m = token.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9/.+-]*?)([^A-Za-z0-9]*)$/);
  if (!m) return token;
  const [, head = "", word = "", tail = ""] = m;
  const canonical = CASING[word.toLowerCase()];
  if (canonical) return `${head}${canonical}${tail}`;
  // "512gb", "4.6ghz", "165hz": the unit letters
  const unit = word.match(/^(\d+(?:\.\d+)?)(gb|tb|mb|ghz|mhz|hz|mbps|gbps)$/i);
  if (unit) return `${head}${unit[1]}${UNITS[(unit[2] ?? "").toLowerCase()]}${tail}`;
  return token;
}

/** Apply the map to every whitespace-separated word of `text`. */
export function applyCasing(text: string): string {
  return text.replace(/\S+/g, (token) => casingOfToken(token));
}

/**
 * Plain English words that raw POS names SHOUT ("MOTHERBOARD", "CASING", "KEYBOARD", "GAMING", "MECHANICAL", "BLACK",
 * "MID-TOWER"): they become ordinary words. Deliberately a dictionary and not "every capital word": a model line
 * (MORTAR, AORUS, ELITE), a brand (MSI) or an acronym (RGB, ATX, DDR5, WIFI6E, PSU) is not in it and is left alone, and a
 * token with a digit is a model code and is never touched.
 */
export const PLAIN_WORDS = new Set(
  (
    // the storefront's own shouting list (lib/seo/page-meta.ts) ...
    "with without plus power cord mini camera dome color colour laptop cooler single dual fan fans inch keyboard mouse " +
    "combo wireless wired bangla gaming graphics card motherboard processor monitor speaker speakers cable adapter " +
    "battery charger printer assembly spring fixing transfer cleaner control panel desktop black white silver blue red " +
    "grey gray gold green pink purple edition built lens distance metal plastic replacement warranty tower case chassis " +
    "series external internal portable drive hard disk solid state memory headphone headset earphone microphone router " +
    "switch port ports office home smart watch phone tablet airflow bullet outdoor indoor night vision network digital " +
    "video recorder unit kit set box stand holder mount bag cover sleeve pad table chair desk light lamp shredder " +
    "scanner toner drum ink cartridge paper roller fuser belt sensor board module door lock access terminal reader " +
    // ... and what the v2.4 sweep found shouted in product names
    "micro full mid compact computer casing mechanical tempered glass aluminum aluminium transparent standard orange " +
    "yellow brown earphones earbuds developing controller server rack magenta cyan graphite channel main film storage " +
    "optical cassette alloy thermal front carriage delivery telephone panoramic bottle meter offline supply " +
    // brand lines that are plain words (Corsair VENGEANCE / DOMINATOR)
    "vengeance dominator"
  ).split(" "),
);

/** "MID-TOWER" -> "Mid-Tower", "CASING" -> "Casing". A token with a digit (a model code) and every word outside PLAIN_WORDS stay as written. */
export function softenPlainWords(token: string): string {
  if (/\d/.test(token)) return token;
  return token.replace(/[A-Z]{2,}/g, (word) => (PLAIN_WORDS.has(word.toLowerCase()) ? word.charAt(0) + word.slice(1).toLowerCase() : word));
}

/**
 * Bangladeshi shops (and our own category) call a PC case a "Casing", and people search "casing price in bangladesh":
 * for a PC case the type word is "Casing". A raw "Casing" stays as it is. (v2.4 had it the other way round.)
 */
export const pcCaseWord = (word: string) => (/^case$/i.test(word) ? "Casing" : word);

/** "LATITUDE" -> "Latitude" for a shouted brand / line word (never an acronym or a known canonical form). */
export function titleCaseShouted(word: string): string {
  const lower = word.toLowerCase();
  if (KEEP_UPPER.has(lower) || CASING[lower]) return word;
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/** Words as the brand / line shouting rule sees them: 5+ capital letters, nothing else. */
export const isShoutedWord = (token: string) => /^[A-Z]{5,}$/.test(token);
