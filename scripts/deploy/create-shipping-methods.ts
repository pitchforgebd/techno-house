/**
 * Production shipping-method + zone-rate bootstrap.
 *
 *   npm run shipping:bootstrap-methods
 *
 * Without a ShippingMethod row, `methodsForZone` (lib/cart/shipping.ts) has
 * nothing to return for ANY zone, so checkout can never resolve a delivery
 * option — picking an upazila looks like it "doesn't stick" because the
 * area+method pair the UI tries to commit is never valid. Fixes the actual
 * bug behind that symptom (the district/upazila data itself was fine).
 *
 * Values match this app's own MOCK_SHIPPING_METHODS / MOCK_SHIPPING_ZONES
 * reference data (lib/cart/shipping.ts) — real placeholder pricing this UI
 * was designed around, not fake demo content. Edit rates/methods any time
 * via Admin -> Shipping.
 *
 * Idempotent upsert by code — safe to re-run.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

const ZONE_RATES = [
  {
    code: "dhaka_metro",
    baseWeightGrams: 1000,
    baseRateAmount: 60,
    extraRatePerKgAmount: 20,
  },
  {
    code: "outside_dhaka",
    baseWeightGrams: 1000,
    baseRateAmount: 120,
    extraRatePerKgAmount: 30,
  },
] as const;

const METHODS = [
  {
    code: "dhaka_home",
    name: "Dhaka home delivery",
    description: "Same-city delivery within Dhaka metro areas.",
    baseRateAmount: 80,
    isPickup: false,
    zoneCodes: ["dhaka_metro"],
  },
  {
    code: "nationwide_courier",
    name: "Nationwide courier",
    description: "Courier delivery outside Dhaka metro.",
    baseRateAmount: 150,
    isPickup: false,
    zoneCodes: ["outside_dhaka"],
  },
  {
    code: "store_pickup",
    name: "Store pickup",
    description: "Collect from the Techno House counter — no shipping fee.",
    baseRateAmount: 0,
    isPickup: true,
    // Empty on purpose: methodsForZone() treats an empty zone list as
    // "every zone" (pickup isn't zone-restricted).
    zoneCodes: [],
  },
] as const;

async function main(): Promise<void> {
  const prisma = getPrisma();

  // Zones already exist from shipping:bootstrap-districts — this only fills
  // in the weight-based rate fields that script leaves at their 0 defaults.
  for (const zone of ZONE_RATES) {
    const existing = await prisma.shippingZone.findUnique({
      where: { code: zone.code },
      select: { id: true },
    });
    if (!existing) {
      console.error(
        `Zone "${zone.code}" doesn't exist yet — run "npm run shipping:bootstrap-districts" first.`,
      );
      process.exitCode = 1;
      return;
    }
    await prisma.shippingZone.update({
      where: { code: zone.code },
      data: {
        baseWeightGrams: zone.baseWeightGrams,
        baseRateAmount: zone.baseRateAmount,
        extraRatePerKgAmount: zone.extraRatePerKgAmount,
      },
    });
  }

  for (const [index, method] of METHODS.entries()) {
    const record = await prisma.shippingMethod.upsert({
      where: { code: method.code },
      create: {
        code: method.code,
        name: method.name,
        description: method.description,
        baseRateAmount: method.baseRateAmount,
        isPickup: method.isPickup,
        position: index,
      },
      update: {
        name: method.name,
        description: method.description,
        baseRateAmount: method.baseRateAmount,
        isPickup: method.isPickup,
        position: index,
      },
    });

    for (const zoneCode of method.zoneCodes) {
      const zone = await prisma.shippingZone.findUnique({
        where: { code: zoneCode },
        select: { id: true },
      });
      if (!zone) continue;
      await prisma.shippingMethodZone.upsert({
        where: { methodId_zoneId: { methodId: record.id, zoneId: zone.id } },
        create: { methodId: record.id, zoneId: zone.id },
        update: {},
      });
    }
  }

  console.log(
    `ok — ${METHODS.length} shipping methods and ${ZONE_RATES.length} zone rates created/updated`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
