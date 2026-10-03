/**
 * Backfills PC Builder compatibility values (socket / RAM type / form factor /
 * storage interface) on products that already have a builder slot (AD-346).
 *
 *   npm run catalog:backfill-builder-compat             # DRY RUN — report only
 *   npm run catalog:backfill-builder-compat -- --apply  # write
 *
 * Why: `tag-builder-slots-by-category.ts` put ~1,200 imported products into
 * builder slots but deliberately left every compatibility value empty, so the
 * live "suggest as you pick" filter had nothing to compare and could not hide
 * anything. The inference rules live in
 * `lib/domain/pc-builder/infer-attrs.ts` (pure, unit-checked) and err on the
 * side of leaving a value unset over guessing it.
 *
 * Safe by construction:
 *  - dry run is the DEFAULT; nothing is written without `--apply`
 *  - additive only: a field that already has a value is never overwritten
 *    (hand-entered values from the admin form always win)
 *  - idempotent: re-running only fills what is still empty
 *  - touches only the four compatibility columns — no slot, price or stock
 */
import { writeFileSync } from "node:fs";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import {
  inferBuilderAttrs,
  type InferredField,
} from "../../lib/domain/pc-builder/infer-attrs";
import type { BuilderSlot } from "../../lib/data/types/catalog";

const SLOTS = [
  "cpu",
  "cpu_cooler",
  "motherboard",
  "ram",
  "case",
  "ssd",
  "hdd",
  "psu",
  "gpu",
] as const satisfies readonly BuilderSlot[];

const COLUMN: Record<InferredField, string> = {
  socket: "builderSocket",
  ramType: "builderRamType",
  formFactor: "builderFormFactor",
  storageInterface: "builderStorageInterface",
  tdpWatts: "builderTdpWatts",
};

const SAMPLE_LIMIT = 6;

/** Every value actually written, flushed to --log even if the run crashes. */
const auditLog: {
  id: string;
  name: string;
  set: Record<string, string | number>;
}[] = [];
const LOG_PATH = process.argv
  .find((arg) => arg.startsWith("--log="))
  ?.slice("--log=".length);

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  if (apply && !LOG_PATH) {
    console.error(
      "Refusing to --apply without --log=<file.json>: the log records every " +
        "value written so the run can be undone (set those columns back to null).",
    );
    process.exitCode = 1;
    return;
  }
  const prisma = getPrisma();

  console.log(
    apply
      ? "APPLY mode — writing empty compatibility values.\n"
      : "DRY RUN — nothing will be written. Re-run with --apply to write.\n",
  );

  let totalWrites = 0;

  for (const slot of SLOTS) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        builderSlot: slot.toUpperCase() as never,
      },
      select: {
        id: true,
        name: true,
        overview: true,
        builderSocket: true,
        builderRamType: true,
        builderFormFactor: true,
        builderStorageInterface: true,
        builderTdpWatts: true,
        attributeValues: {
          where: {
            attribute: { key: { in: ["socket", "ramType", "formFactor"] } },
          },
          select: { value: true, attribute: { select: { key: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const wouldSet = new Map<InferredField, number>();
    const samples: string[] = [];
    const unmatched: string[] = [];
    const conflicts: string[] = [];
    let writes = 0;
    let alreadyComplete = 0;

    for (const product of products) {
      const attributes: Record<string, string> = {};
      for (const row of product.attributeValues) {
        attributes[row.attribute.key] = row.value;
      }
      const result = inferBuilderAttrs({
        slot,
        name: product.name,
        overview: product.overview,
        attributes,
      });
      for (const conflict of result.conflicts) {
        conflicts.push(`${product.name.slice(0, 80)} — ${conflict}`);
      }

      const data: Record<string, string | number> = {};
      for (const [field, inferred] of Object.entries(result.values) as [
        InferredField,
        { value: string; source: string },
      ][]) {
        const column = COLUMN[field];
        const current = (product as Record<string, unknown>)[column];
        if (current != null && current !== "") {
          continue; // never overwrite an existing value
        }
        // builderTdpWatts is an Int column; the rest are text.
        data[column] =
          field === "tdpWatts" ? Number(inferred.value) : inferred.value;
        wouldSet.set(field, (wouldSet.get(field) ?? 0) + 1);
        if (samples.length < SAMPLE_LIMIT) {
          samples.push(
            `${product.name.slice(0, 70)}  →  ${field} = ${inferred.value}   [${inferred.source}]`,
          );
        }
      }

      if (Object.keys(data).length === 0) {
        if (Object.keys(result.values).length > 0) {
          alreadyComplete += 1;
        } else if (unmatched.length < SAMPLE_LIMIT) {
          unmatched.push(product.name.slice(0, 90));
        }
        continue;
      }
      writes += 1;
      if (apply) {
        await prisma.product.update({ where: { id: product.id }, data });
        auditLog.push({ id: product.id, name: product.name, set: data });
      }
    }

    totalWrites += writes;
    const fields = [...wouldSet.entries()]
      .map(([field, count]) => `${field}: ${count}`)
      .join(", ");
    console.log(
      `=== ${slot.toUpperCase()} — ${products.length} active products ===`,
    );
    console.log(
      `  ${apply ? "updated" : "would update"} ${writes} product(s)${fields ? ` (${fields})` : ""}; ${alreadyComplete} already had every inferable value; ${products.length - writes - alreadyComplete} no confident match`,
    );
    for (const line of samples) console.log(`    e.g. ${line}`);
    if (unmatched.length > 0) {
      console.log("  left unset (no confident match), e.g.:");
      for (const line of unmatched) console.log(`    - ${line}`);
    }
    for (const line of conflicts) console.log(`  CONFLICT: ${line}`);
    console.log("");
  }

  console.log(
    apply
      ? `Done — ${totalWrites} product(s) updated.`
      : `Dry run — ${totalWrites} product(s) would be updated. No changes made.`,
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
