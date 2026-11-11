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

/** "LATITUDE" -> "Latitude" for a shouted brand / line word (never an acronym or a known canonical form). */
export function titleCaseShouted(word: string): string {
  const lower = word.toLowerCase();
  if (KEEP_UPPER.has(lower) || CASING[lower]) return word;
  return word.charAt(0) + word.slice(1).toLowerCase();
}

/** Words as the brand / line shouting rule sees them: 5+ capital letters, nothing else. */
export const isShoutedWord = (token: string) => /^[A-Z]{5,}$/.test(token);
