/**
 * Production attribute-definition bootstrap.
 *
 *   npm run catalog:bootstrap-attributes
 *
 * `ProductAttribute` rows drive the storefront's per-category filter facets
 * and give the admin product editor's attribute picker something to
 * suggest. The bulk CSV importer deliberately does not touch attributes
 * (per-product attribute VALUES still need the single-product editor either
 * way — see lib/catalog/bulk-csv.ts) — this only creates the shared
 * DEFINITIONS (key, label, unit, suggested values), derived from the exact
 * filterKeys already assigned to categories in
 * scripts/deploy/create-catalog-categories.ts, so every category's declared
 * filter key actually resolves to something with a label. `allowedValues`
 * are suggestions only (real facets still come from what products actually
 * have) — add/correct via Admin -> Attributes as real products get specced.
 *
 * Idempotent upsert by key — safe to re-run.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

type AttributeSeed = {
  key: string;
  label: string;
  unit?: string;
  allowedValues: string[];
};

// Covers every filterKey used across mockCategories in
// create-catalog-categories.ts (laptops/pcs-servers/components/monitors/...).
const ATTRIBUTES: AttributeSeed[] = [
  {
    key: "processor",
    label: "Processor",
    allowedValues: [
      "Intel Core i3",
      "Intel Core i5",
      "Intel Core i7",
      "Intel Core i9",
      "AMD Ryzen 3",
      "AMD Ryzen 5",
      "AMD Ryzen 7",
      "AMD Ryzen 9",
    ],
  },
  {
    key: "ram",
    label: "RAM",
    unit: "GB",
    allowedValues: ["4GB", "8GB", "16GB", "32GB", "64GB"],
  },
  {
    key: "storage",
    label: "Storage",
    allowedValues: ["128GB", "256GB", "512GB", "1TB", "2TB"],
  },
  {
    key: "graphics",
    label: "Graphics",
    allowedValues: ["Integrated", "NVIDIA GeForce", "AMD Radeon"],
  },
  {
    key: "socket",
    label: "Socket",
    allowedValues: ["AM4", "AM5", "LGA1700", "LGA1851"],
  },
  {
    key: "cores",
    label: "Cores",
    allowedValues: ["2", "4", "6", "8", "12", "16", "24"],
  },
  {
    key: "coolerType",
    label: "Cooler Type",
    allowedValues: ["Air Cooler", "Liquid Cooler (AIO)", "Stock Cooler"],
  },
  {
    key: "formFactor",
    label: "Form Factor",
    // Motherboard/casing sizes plus server chassis types — shared key,
    // same soft-suggestion convention as "size" above.
    allowedValues: [
      "ATX",
      "Micro-ATX",
      "Mini-ITX",
      "E-ATX",
      "Rack",
      "Tower",
    ],
  },
  {
    key: "ramType",
    label: "Memory Type",
    allowedValues: ["DDR3", "DDR4", "DDR5"],
  },
  {
    key: "capacity",
    label: "Capacity",
    unit: "GB",
    allowedValues: ["128GB", "256GB", "512GB", "1TB", "2TB", "4TB"],
  },
  {
    key: "memory",
    label: "Video Memory",
    unit: "GB",
    allowedValues: ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "24GB"],
  },
  {
    key: "wattage",
    label: "Wattage",
    unit: "W",
    allowedValues: ["450W", "550W", "650W", "750W", "850W", "1000W"],
  },
  {
    key: "size",
    label: "Size",
    // Shared across very different products (case fans in mm, monitors/TVs
    // in inches) because it is the same filter key on both categories in the
    // taxonomy — a soft admin suggestion list either way, not enforced.
    allowedValues: [
      "120mm",
      "140mm",
      "24\"",
      "27\"",
      "32\"",
      "43\"",
      "55\"",
      "65\"",
    ],
  },
  {
    key: "panel",
    label: "Panel Type",
    allowedValues: ["IPS", "VA", "TN", "OLED"],
  },

  // Added for the SMART catalog import (2026-09) — Photocopier, IP Camera,
  // Operating System, Server, Headphone. See
  // scripts/deploy/set-catalog-filter-keys.ts for the matching Category
  // filterKeys assignment (this script only creates the shared attribute
  // definitions).
  {
    key: "printTechnology",
    label: "Print Technology",
    allowedValues: ["Laser", "Inkjet", "Ink Tank", "Thermal", "Dot Matrix"],
  },
  {
    key: "function",
    label: "Function",
    allowedValues: ["Single Function", "Multi-Function"],
  },
  {
    key: "printColor",
    label: "Print Color",
    allowedValues: ["Mono", "Color"],
  },
  {
    key: "paperSize",
    label: "Paper Size",
    allowedValues: ["A4", "A3", "A5", "Letter", "Legal"],
  },
  {
    key: "duplex",
    label: "Duplex Printing",
    allowedValues: ["Yes", "No"],
  },
  {
    key: "resolution",
    label: "Resolution",
    allowedValues: ["2MP", "4MP", "5MP", "6MP", "8MP"],
  },
  {
    key: "cameraType",
    label: "Camera Type",
    allowedValues: ["Dome", "Bullet", "PTZ", "Turret"],
  },
  {
    key: "connectivity",
    label: "Connectivity",
    // Shared across cameras (IP/Wi-Fi/Analog/PoE) and audio gear
    // (Wired/Bluetooth/USB) — same "size"-style soft suggestion list, not
    // enforced; real facets come from what products actually have.
    allowedValues: [
      "IP",
      "Wi-Fi",
      "Analog",
      "PoE",
      "Wired",
      "Bluetooth",
      "USB",
    ],
  },
  {
    key: "nightVision",
    label: "Night Vision Range",
    unit: "m",
    allowedValues: ["10m", "20m", "30m", "50m"],
  },
  {
    key: "licenseType",
    label: "License Type",
    allowedValues: ["OEM", "Retail", "Subscription", "Volume License"],
  },
  {
    key: "platform",
    label: "Platform",
    allowedValues: ["Windows", "Mac", "Linux"],
  },
  {
    key: "raid",
    label: "RAID Support",
    allowedValues: ["None", "RAID 0", "RAID 1", "RAID 5", "RAID 10"],
  },
  {
    key: "audioType",
    label: "Type",
    allowedValues: ["Over-ear", "On-ear", "In-ear", "True Wireless"],
  },
  {
    key: "microphone",
    label: "Microphone",
    allowedValues: ["Yes", "No"],
  },
];

async function main(): Promise<void> {
  const prisma = getPrisma();

  for (const [index, attr] of ATTRIBUTES.entries()) {
    await prisma.productAttribute.upsert({
      where: { key: attr.key },
      create: {
        key: attr.key,
        label: attr.label,
        unit: attr.unit ?? null,
        isFilterable: true,
        allowedValues: attr.allowedValues,
        position: index,
      },
      update: {
        label: attr.label,
        unit: attr.unit ?? null,
        allowedValues: attr.allowedValues,
        position: index,
      },
    });
  }

  console.log(`ok — ${ATTRIBUTES.length} attribute definitions created/updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
