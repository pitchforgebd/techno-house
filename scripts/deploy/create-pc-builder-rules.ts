/**
 * Production PC Builder compatibility-rule bootstrap.
 *
 *   npm run pcbuilder:bootstrap-rules -- --dry-run   # report only
 *   npm run pcbuilder:bootstrap-rules                # apply
 *
 * The five `PCCompatibilityRule` rows (socket, RAM type, PSU wattage, form
 * factor, storage interface) were only ever created by `prisma/seed.ts`, which
 * refuses to run in production. With no rows the storefront reads an empty
 * rule list, treats every check as disabled, and the whole PC Builder
 * compatibility filter is silently off — nothing errors, every part just shows.
 *
 * Create-only: an existing rule (by key) is left completely untouched, so a
 * staff member's enable/disable choice in Admin → PC Builder → Compatibility
 * rules is never overwritten. Safe to re-run.
 *
 * Defaults follow the seed: socket, RAM type, PSU wattage and form factor ON;
 * storage interface OFF (turn it on in admin once motherboards carry their
 * drive-interface data — until then it only adds "unconfirmed fit" noise).
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { MOCK_PC_BUILDER_RULES } from "../../lib/admin/pc-builder-admin-mock";

const RULE_TYPE = {
  socket: "SOCKET",
  ram_type: "RAM_TYPE",
  psu_wattage: "PSU_WATTAGE",
  form_factor: "FORM_FACTOR",
  storage_interface: "STORAGE_INTERFACE",
} as const;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  const existing = new Set(
    (await prisma.pCCompatibilityRule.findMany({ select: { key: true } })).map(
      (row) => row.key,
    ),
  );
  const toCreate = MOCK_PC_BUILDER_RULES.filter((rule) => !existing.has(rule.key));

  console.log(
    `${MOCK_PC_BUILDER_RULES.length} rules defined, ${existing.size} already exist — left untouched.`,
  );
  console.log(`${toCreate.length} to create:`);
  for (const rule of toCreate) {
    console.log(`  ${rule.key}  (${rule.type}, ${rule.enabled ? "on" : "off"})`);
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
    return;
  }
  for (const rule of toCreate) {
    await prisma.pCCompatibilityRule.create({
      data: {
        key: rule.key,
        label: rule.label,
        type: RULE_TYPE[rule.type],
        description: rule.description,
        isEnabled: rule.enabled,
      },
    });
  }
  console.log(`\nCreated ${toCreate.length} rule(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
