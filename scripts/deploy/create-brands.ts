/**
 * Production brand-list bootstrap — real brands the store actually carries.
 *
 *   npm run catalog:bootstrap-brands
 *
 * Unlike lib/data/mocks/catalog.ts's mock brands (Lumen, Ridge, CoreLine...,
 * fictional names invented to go with the demo products), this list came
 * directly from the store owner as the real brands they sell. Creates only
 * Brand rows (name, slug, position) — no logo yet (add via Admin → Brands),
 * no products. Idempotent upsert by slug — safe to re-run.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

// Deduplicated across the owner's category-grouped list — a brand row is not
// tied to any one category (Product links to both a brand and a category
// separately), so e.g. ASUS appears once here even though it makes
// motherboards, monitors, and laptops.
const BRAND_NAMES = [
  "Intel",
  "AMD",
  "ASUS",
  "MSI",
  "GIGABYTE",
  "ZOTAC",
  "Palit",
  "Sapphire",
  "PowerColor",
  "GALAX",
  "PNY",
  "ASRock",
  "Biostar",
  "Corsair",
  "G.Skill",
  "Kingston",
  "TeamGroup",
  "Adata",
  "Patriot",
  "XPG",
  "Samsung",
  "Western Digital",
  "Crucial",
  "Seagate",
  "Lexar",
  "Cooler Master",
  "Thermaltake",
  "DeepCool",
  "Antec",
  "FSP",
  "Seasonic",
  "Montech",
  "Lian Li",
  "NZXT",
  "Value-Top",
  "Thermalright",
  "ID-COOLING",
  "LG",
  "AOC",
  "ViewSonic",
  "BenQ",
  "Acer",
  "Lenovo",
  "HP",
  "Dell",
  "Apple",
  "Logitech",
  "Razer",
  "Redragon",
  "Fantech",
  "A4Tech",
  "Havit",
  "Rapoo",
  "SteelSeries",
  "TP-Link",
  "Tenda",
  "D-Link",
  "MikroTik",
  "Ubiquiti",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main(): Promise<void> {
  const prisma = getPrisma();

  for (const [index, name] of BRAND_NAMES.entries()) {
    const slug = slugify(name);
    await prisma.brand.upsert({
      where: { slug },
      create: { slug, name, position: index },
      update: { name, position: index },
    });
  }

  console.log(`ok — ${BRAND_NAMES.length} brands created/updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
