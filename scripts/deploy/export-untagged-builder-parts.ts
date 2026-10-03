/**
 * Exports the PC Builder parts that still lack a compatibility value the
 * picker needs, as a CSV to fill in and hand to
 * `import-builder-compat-csv.ts` (AD-346).
 *
 *   npm run catalog:export-untagged-builder -- [--out=untagged-builder-parts.csv]
 *
 * Read-only. "Needs" is the core fit data per slot (CPU/cooler → socket,
 * motherboard → socket + RAM type + form factor, RAM → RAM type, case → board
 * sizes, SSD/HDD → interface). Motherboard drive interface and CPU/GPU/PSU
 * wattage are not listed — see the notes in project-memory/TASKS.md.
 *
 * Fill the blank editable columns (socket, ramType, formFactor,
 * storageInterface); for several values separate with commas ("DDR4, DDR5").
 * Values already present are shown for context and are never overwritten by
 * the importer.
 */
import { writeFileSync } from "node:fs";
import { config as loadEnvFiles } from "dotenv";
import Papa from "papaparse";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import type { BuilderSlot } from "../../lib/data/types/catalog";
import type { BuilderAttrField } from "../../lib/domain/pc-builder/attribute-options";

const NEEDS: Partial<Record<BuilderSlot, readonly BuilderAttrField[]>> = {
  cpu: ["socket"],
  cpu_cooler: ["socket"],
  motherboard: ["socket", "ramType", "formFactor"],
  ram: ["ramType"],
  case: ["formFactor"],
  ssd: ["storageInterface"],
  hdd: ["storageInterface"],
};

const COLUMN: Record<Exclude<BuilderAttrField, "tdpWatts">, string> = {
  socket: "builderSocket",
  ramType: "builderRamType",
  formFactor: "builderFormFactor",
  storageInterface: "builderStorageInterface",
};

function plain(overview: readonly string[]): string {
  return overview
    .join(" ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

async function main(): Promise<void> {
  const out =
    process.argv.find((arg) => arg.startsWith("--out="))?.slice(6) ??
    "untagged-builder-parts.csv";
  const prisma = getPrisma();
  const slots = Object.keys(NEEDS) as BuilderSlot[];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      builderSlot: { in: slots.map((slot) => slot.toUpperCase() as never) },
    },
    select: {
      sku: true,
      name: true,
      overview: true,
      builderSlot: true,
      builderSocket: true,
      builderRamType: true,
      builderFormFactor: true,
      builderStorageInterface: true,
    },
    orderBy: [{ builderSlot: "asc" }, { name: "asc" }],
  });

  const rows: Record<string, string>[] = [];
  const perSlot = new Map<string, number>();
  for (const product of products) {
    const slot = String(product.builderSlot).toLowerCase() as BuilderSlot;
    const needed = NEEDS[slot] ?? [];
    const record = product as unknown as Record<string, string | null>;
    const missing = needed.filter((field) => {
      const column = COLUMN[field as keyof typeof COLUMN];
      return record[column] == null || record[column] === "";
    });
    if (missing.length === 0) continue;
    perSlot.set(slot, (perSlot.get(slot) ?? 0) + 1);
    rows.push({
      sku: product.sku,
      slot,
      name: product.name.replace(/\s+/g, " ").trim(),
      needs: missing.join(" + "),
      socket: product.builderSocket ?? "",
      ramType: product.builderRamType ?? "",
      formFactor: product.builderFormFactor ?? "",
      storageInterface: product.builderStorageInterface ?? "",
      overview_hint: plain(product.overview),
    });
  }

  // BOM so Excel opens the UTF-8 names correctly.
  writeFileSync(out, "﻿" + Papa.unparse(rows));
  console.log(`Wrote ${rows.length} part(s) to ${out}`);
  for (const [slot, count] of perSlot) console.log(`  ${slot}: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
