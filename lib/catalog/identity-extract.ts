/**
 * Identity facts read from a raw product name (SEO phase 8, v2.5). PURE, no lookbehind (bundled into the admin
 * form through lib/seo/product-seo.ts).
 *
 * For some families one figure IS the product: a 2TB and a 4TB "Toshiba PC Hard Drive P300" are different things,
 * and so are a 16GB DDR5 and a 16GB DDR4 "Corsair Vengeance". The SEO title must keep those figures; these helpers
 * read them (and the drive facts a description can state) from the name.
 */
import { extractRamFromName, plainNumber } from "@/lib/catalog/spec-extract";

/** "4TB", "512GB": whole decimals, upper-case unit. */
const sizeText = (value: string, unit: string) => `${plainNumber(value) ?? value}${unit.toUpperCase()}`;

/**
 * The capacity of a drive the name states ("4TB", "512GB"): a TB figure or a GB figure of 32 or more, never a transfer
 * rate ("6 Gb/s", "Gbps") and never a cache ("256 MB"). Two different capacities are not guessed between: null.
 */
export function extractDriveCapacityFromName(name: string): string | null {
  const found = new Set<string>();
  for (const m of name.matchAll(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s?(TB|GB)\b(?!\/|ps\b|bit)/gi)) {
    const amount = Number(m[1]);
    const unit = (m[2] ?? "").toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (unit === "TB" || amount >= 32) found.add(sizeText(m[1] ?? "", unit));
  }
  return found.size === 1 ? ([...found][0] ?? null) : null;
}

export type DriveSpecs = {
  capacity: string | null;
  /** "7200 RPM" */
  rpm: string | null;
  /** "SATA", "NVMe", "PCIe 4.0", "USB 3.2" */
  interface: string | null;
  /** "3.5 inch", "2.5 inch" */
  inch: string | null;
};

export function extractDriveFromName(name: string): DriveSpecs {
  const rpm = name.match(/\b(5400|5900|7200|10,?000|15,?000)\s?RPM\b/i)?.[1];
  let iface: string | null = null;
  if (/\bNVMe\b/i.test(name)) iface = "NVMe";
  else if (/\bSATA\b/i.test(name)) iface = "SATA";
  else {
    const pcie = name.match(/\bPCIe\s?(?:Gen\s?)?(\d)(?:\.\d)?/i)?.[1];
    if (pcie) iface = `PCIe ${pcie}.0`;
    else if (/\bPCIe\b/i.test(name)) iface = "PCIe";
    else {
      const usb = name.match(/\bUSB\s?(3(?:\.\d)?|C)\b/i)?.[1];
      if (usb) iface = `USB ${usb.toUpperCase()}`;
    }
  }
  const inch = name.match(/(?:^|[^\d.])([23]\.5)\s?(?:"|”|″|inch(?:es)?\b|in\b)/i)?.[1];
  return {
    capacity: extractDriveCapacityFromName(name),
    rpm: rpm ? `${rpm.replace(",", "")} RPM` : null,
    interface: iface,
    inch: inch ? `${inch} inch` : null,
  };
}

export type RamIdentity = {
  /** "16GB" */
  capacity: string | null;
  /** "DDR5", "DDR4", "LPDDR5" */
  ddr: string | null;
  /** "5600MT/s", "3200MHz" */
  speed: string | null;
  /** "2x8GB" */
  kit: string | null;
  /** "CL40" */
  latency: string | null;
};

/** The memory facts a RAM module's name states. A kit such as "16GB (2 x 8GB)" is 16GB; the kit layout is its own fact. */
export function extractRamFromModuleName(name: string): RamIdentity {
  const ddr = name.match(/\b((?:LP)?DDR[2-5]X?)\b/i)?.[1]?.toUpperCase() ?? null;
  const speed = name.match(/\b(\d{3,5})\s?(MHz|MT\/s)\b/i);
  const kit = name.match(/\(?\b(\d)\s?x\s?(\d{1,3})\s?GB\b/i);
  const latency = name.match(/\bC(?:L)?\s?(\d{2})\b/i)?.[1];
  return {
    capacity: extractRamFromName(name),
    ddr,
    speed: speed ? `${speed[1]}${/mhz/i.test(speed[2] ?? "") ? "MHz" : "MT/s"}` : null,
    kit: kit ? `${kit[1]}x${kit[2]}GB` : null,
    latency: latency ? `CL${latency}` : null,
  };
}

/**
 * Does the name call the product a combo ("Wireless Mouse and Keyboard Combo")? A promotional "Combo Offer" is not a
 * product combo.
 */
export const hasComboWord = (name: string) => /\bcombo\b/i.test(name) && !/\bcombo\s+offers?\b/i.test(name);
