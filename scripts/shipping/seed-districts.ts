/**
 * One-off seed: Bangladesh districts/upazilas + their matching ShippingArea
 * rows (AD-254). Safe to re-run — everything is upserted by unique name.
 *
 *   npx tsx scripts/shipping/seed-districts.ts
 */
import { config as loadEnvFiles } from "dotenv";
loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";
import { BD_DISTRICTS_SEED } from "../../lib/shipping/bd-districts-seed";

async function main() {
  const prisma = getPrisma();

  const dhakaMetro = await prisma.shippingZone.upsert({
    where: { code: "dhaka_metro" },
    update: {},
    create: { code: "dhaka_metro", name: "Dhaka metro" },
    select: { id: true },
  });
  const outsideDhaka = await prisma.shippingZone.upsert({
    where: { code: "outside_dhaka" },
    update: {},
    create: { code: "outside_dhaka", name: "Outside Dhaka" },
    select: { id: true },
  });

  let districtCount = 0;
  let upazilaCount = 0;

  for (const [index, entry] of BD_DISTRICTS_SEED.entries()) {
    const isDhaka = entry.name === "Dhaka";
    const zoneId = isDhaka ? dhakaMetro.id : outsideDhaka.id;

    const district = await prisma.district.upsert({
      where: { name: entry.name },
      update: { zoneId, position: index },
      create: { name: entry.name, zoneId, position: index },
      select: { id: true },
    });
    districtCount += 1;

    for (const upazilaName of entry.upazilas) {
      const areaName = `${upazilaName} — ${entry.name}`;
      const area = await prisma.shippingArea.upsert({
        where: { zoneId_name: { zoneId, name: areaName } },
        update: {},
        create: { zoneId, name: areaName },
        select: { id: true },
      });
      await prisma.upazila.upsert({
        where: { districtId_name: { districtId: district.id, name: upazilaName } },
        update: { shippingAreaId: area.id },
        create: {
          districtId: district.id,
          name: upazilaName,
          shippingAreaId: area.id,
        },
      });
      upazilaCount += 1;
    }
  }

  console.log(`Seeded ${districtCount} districts and ${upazilaCount} upazilas.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
