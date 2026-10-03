/**
 * Applies a filled-in CSV from `export-untagged-builder-parts.ts` (AD-346).
 *
 *   npm run catalog:import-builder-compat -- <file.csv>                       # DRY RUN
 *   npm run catalog:import-builder-compat -- <file.csv> --apply --log=<json>  # write
 *
 * Safe by construction:
 *  - dry run is the DEFAULT; `--apply` refuses to run without `--log=<file>`
 *    (every write is recorded so it can be undone)
 *  - matches products by SKU only; unknown SKUs are reported, never created
 *  - additive: a value the product already has is never overwritten
 *  - values go through the same canonicalising parser as the admin form
 *    ("am5" → "AM5", "ddr4 ,ddr5" → "DDR4, DDR5"), and only fields that
 *    matter for the product's slot are accepted
 *  - touches only the four compatibility text columns
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config as loadEnvFiles } from "dotenv";
import Papa from "papaparse";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { parseOptionalAttr, normalizeSku } from "../../lib/catalog/product-input";
import {
  FORM_FACTOR_OPTIONS,
  RAM_TYPE_OPTIONS,
  SLOT_ATTRIBUTE_FIELDS,
  SOCKET_OPTIONS,
  STORAGE_INTERFACE_OPTIONS,
  type BuilderAttrField,
} from "../../lib/domain/pc-builder/attribute-options";
import type { BuilderSlot } from "../../lib/data/types/catalog";

type TextField = Exclude<BuilderAttrField, "tdpWatts">;

const FIELDS: Record<
  TextField,
  { column: string; label: string; vocab: readonly string[] }
> = {
  socket: { column: "builderSocket", label: "Socket", vocab: SOCKET_OPTIONS },
  ramType: { column: "builderRamType", label: "RAM type", vocab: RAM_TYPE_OPTIONS },
  formFactor: {
    column: "builderFormFactor",
    label: "Form factor",
    vocab: FORM_FACTOR_OPTIONS,
  },
  storageInterface: {
    column: "builderStorageInterface",
    label: "Storage interface",
    vocab: STORAGE_INTERFACE_OPTIONS,
  },
};

const auditLog: { sku: string; name: string; set: Record<string, string> }[] = [];
const LOG_PATH = process.argv
  .find((arg) => arg.startsWith("--log="))
  ?.slice("--log=".length);

async function main(): Promise<void> {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const apply = process.argv.includes("--apply");
  if (!file) {
    console.error("Usage: import-builder-compat-csv.ts <file.csv> [--apply --log=<json>]");
    process.exitCode = 1;
    return;
  }
  if (apply && !LOG_PATH) {
    console.error(
      "Refusing to --apply without --log=<file.json>: the log records every value written so the run can be undone.",
    );
    process.exitCode = 1;
    return;
  }

  const parsed = Papa.parse<Record<string, string>>(
    readFileSync(file, "utf8").replace(/^﻿/, ""),
    {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    },
  );
  if (parsed.errors.length > 0) {
    console.error(`Could not read ${file}: ${parsed.errors[0]?.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    apply
      ? "APPLY mode — writing empty compatibility values.\n"
      : "DRY RUN — nothing will be written. Re-run with --apply --log=<file> to write.\n",
  );

  const prisma = getPrisma();
  let updated = 0;
  let untouched = 0;
  const problems: string[] = [];

  for (const [index, raw] of parsed.data.entries()) {
    const rowNum = index + 2;
    const sku = normalizeSku(raw.sku ?? "");
    if (!sku) {
      problems.push(`row ${rowNum}: missing sku`);
      continue;
    }
    const product = await prisma.product.findUnique({
      where: { sku },
      select: {
        id: true,
        name: true,
        builderSlot: true,
        builderSocket: true,
        builderRamType: true,
        builderFormFactor: true,
        builderStorageInterface: true,
      },
    });
    if (!product) {
      problems.push(`row ${rowNum}: no product with SKU ${sku} (skipped, never created)`);
      continue;
    }
    const slot = (product.builderSlot?.toLowerCase() ?? null) as BuilderSlot | null;
    const allowed = slot ? (SLOT_ATTRIBUTE_FIELDS[slot] ?? []) : [];

    const data: Record<string, string> = {};
    for (const field of Object.keys(FIELDS) as TextField[]) {
      const cell = (raw[field] ?? "").trim();
      if (!cell) continue;
      const spec = FIELDS[field];
      const current = (product as Record<string, unknown>)[spec.column];
      if (current != null && current !== "") continue; // never overwrite
      if (!allowed.includes(field)) {
        problems.push(
          `row ${rowNum} (${sku}): ${field} is not used by the ${slot ?? "no"} slot — ignored`,
        );
        continue;
      }
      const result = parseOptionalAttr(cell, spec.label, spec.vocab);
      if (!result.ok) {
        problems.push(`row ${rowNum} (${sku}): ${result.formError}`);
        continue;
      }
      if (result.value) data[spec.column] = result.value;
    }

    if (Object.keys(data).length === 0) {
      untouched += 1;
      continue;
    }
    updated += 1;
    console.log(
      `  ${sku}  ${product.name.replace(/\s+/g, " ").slice(0, 60)}  →  ${Object.entries(data)
        .map(([column, value]) => `${column.replace("builder", "")}=${value}`)
        .join("; ")}`,
    );
    if (apply) {
      await prisma.product.update({ where: { id: product.id }, data });
      auditLog.push({ sku, name: product.name, set: data });
    }
  }

  for (const problem of problems) console.log(`  PROBLEM: ${problem}`);
  console.log(
    `\n${apply ? "Updated" : "Would update"} ${updated} product(s); ${untouched} row(s) had nothing to add; ${problems.length} problem(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (LOG_PATH && auditLog.length > 0) {
      writeFileSync(LOG_PATH, JSON.stringify(auditLog, null, 2));
      console.log(`Audit log written: ${LOG_PATH} (${auditLog.length} product(s)).`);
    }
    await getPrisma().$disconnect();
  });
