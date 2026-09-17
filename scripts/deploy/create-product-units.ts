/**
 * Production sellable-unit bootstrap.
 *
 *   npm run catalog:bootstrap-units
 *
 * `ProductUnit` (Admin -> Units) is a flat name catalogue, no demo/fake
 * data involved — same real reference list this admin screen already
 * shipped with before it moved off a hardcoded mock array (see
 * lib/admin/units-mock.ts). Idempotent upsert by name — safe to re-run.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { MOCK_ADMIN_UNITS } from "../../lib/admin/units-mock";

async function main(): Promise<void> {
  const prisma = getPrisma();

  for (const unit of MOCK_ADMIN_UNITS) {
    await prisma.productUnit.upsert({
      where: { name: unit.name },
      create: { name: unit.name },
      update: {},
    });
  }

  console.log(`ok — ${MOCK_ADMIN_UNITS.length} units created/updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
