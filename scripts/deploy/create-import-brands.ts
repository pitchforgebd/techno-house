/**
 * Brand bootstrap for the "PRODUCTS LIST ALL SMART.xlsx" bulk import
 * (bulk-import-part-1..5.csv) — the admin bulk product importer requires
 * every row's brand to already exist (lib/catalog/admin-products.ts,
 * saveAdminProduct) and there is no bulk brand-import UI, only the
 * single-brand admin form. This creates the ones that don't already exist
 * yet in one pass instead of one at a time.
 *
 *   npm run catalog:bootstrap-import-brands -- --dry-run   # report only
 *   npm run catalog:bootstrap-import-brands                # apply
 *
 * Only ever CREATEs — an already-existing brand (by slug) is left
 * completely untouched (name, logo, position, everything), so this can't
 * clobber a brand `create-brands.ts` or an admin already set up. Safe to
 * re-run: a second run finds nothing left to create.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

const IMPORT_BRANDS: { slug: string; name: string }[] = [
  { slug: "acer", name: "Acer" },
  { slug: "adobe", name: "Adobe" },
  { slug: "amd", name: "AMD" },
  { slug: "apacer", name: "Apacer" },
  { slug: "apple", name: "Apple" },
  { slug: "autodesk", name: "Autodesk" },
  { slug: "benq", name: "BenQ" },
  { slug: "boxlight", name: "Boxlight" },
  { slug: "boya", name: "Boya" },
  { slug: "brother", name: "Brother" },
  { slug: "canon", name: "Canon" },
  { slug: "casio", name: "Casio" },
  { slug: "cisco", name: "Cisco" },
  { slug: "citizen", name: "Citizen" },
  { slug: "commscope", name: "CommScope" },
  { slug: "corsair", name: "Corsair" },
  { slug: "crucial", name: "Crucial" },
  { slug: "d-link", name: "D-Link" },
  { slug: "dahua", name: "Dahua" },
  { slug: "dell", name: "Dell" },
  { slug: "delux", name: "Delux" },
  { slug: "dtech", name: "Dtech" },
  { slug: "edifier", name: "Edifier" },
  { slug: "epson", name: "Epson" },
  { slug: "ezviz", name: "EZVIZ" },
  { slug: "fanvil", name: "Fanvil" },
  { slug: "generic", name: "Generic" },
  { slug: "gigabyte", name: "Gigabyte" },
  { slug: "gree", name: "Gree" },
  { slug: "hiksemi", name: "Hiksemi" },
  { slug: "hikvision", name: "Hikvision" },
  { slug: "honor", name: "Honor" },
  { slug: "hp", name: "HP" },
  { slug: "huawei", name: "Huawei" },
  { slug: "huntkey", name: "Huntkey" },
  { slug: "intel", name: "Intel" },
  { slug: "kaspersky", name: "Kaspersky" },
  { slug: "kingston", name: "Kingston" },
  { slug: "kstar", name: "KSTAR" },
  { slug: "legrand", name: "Legrand" },
  { slug: "lenovo", name: "Lenovo" },
  { slug: "logitech", name: "Logitech" },
  { slug: "microlab", name: "Microlab" },
  { slug: "microsoft", name: "Microsoft" },
  { slug: "msi", name: "MSI" },
  { slug: "netac", name: "Netac" },
  { slug: "netis", name: "Netis" },
  { slug: "panduit", name: "Panduit" },
  { slug: "pantum", name: "Pantum" },
  { slug: "patriot", name: "Patriot" },
  { slug: "pc-power", name: "PC Power" },
  { slug: "plustek", name: "Plustek" },
  { slug: "pny", name: "PNY" },
  { slug: "polycom", name: "Polycom" },
  { slug: "power-pac", name: "Power PAC" },
  { slug: "prolink", name: "Prolink" },
  { slug: "realme", name: "Realme" },
  { slug: "ricoh", name: "Ricoh" },
  { slug: "samsung", name: "Samsung" },
  { slug: "sandisk", name: "SanDisk" },
  { slug: "seagate", name: "Seagate" },
  { slug: "smart", name: "Smart" },
  { slug: "smart-pc", name: "Smart PC" },
  { slug: "sony", name: "Sony" },
  { slug: "targus", name: "Targus" },
  { slug: "team", name: "Team" },
  { slug: "toshiba", name: "Toshiba" },
  { slug: "toten", name: "Toten" },
  { slug: "tp-link", name: "TP-Link" },
  { slug: "transcend", name: "Transcend" },
  { slug: "trend-micro", name: "Trend Micro" },
  { slug: "true-trust", name: "True Trust" },
  { slug: "twinmos", name: "TwinMOS" },
  { slug: "ugreen", name: "UGREEN" },
  { slug: "uniview", name: "Uniview" },
  { slug: "vivanco", name: "Vivanco" },
  { slug: "western-digital", name: "Western Digital" },
  { slug: "whirlpool", name: "Whirlpool" },
  { slug: "xiaomi", name: "Xiaomi" },
  { slug: "xtreme", name: "Xtreme" },
  { slug: "yealink", name: "Yealink" },
  { slug: "yeastar", name: "Yeastar" },
  { slug: "zebra", name: "Zebra" },
  { slug: "zkteco", name: "ZKTeco" },
];

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  const existing = await prisma.brand.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((row) => row.slug));

  const toCreate = IMPORT_BRANDS.filter((b) => !existingSlugs.has(b.slug));
  const alreadyThere = IMPORT_BRANDS.length - toCreate.length;

  console.log(`${IMPORT_BRANDS.length} brands needed for the import.`);
  console.log(`${alreadyThere} already exist — left untouched.`);
  console.log(`${toCreate.length} to create:`);
  for (const b of toCreate) {
    console.log(`  ${b.slug}  (${b.name})`);
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    return;
  }

  let position = existing.length;
  for (const b of toCreate) {
    await prisma.brand.create({
      data: { slug: b.slug, name: b.name, position: position++ },
    });
  }
  console.log(`\nCreated ${toCreate.length} brand(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
