/**
 * Public order tracking privacy suite (DSA-05).
 *
 *   npm run test:tracking
 *
 * `/track/{orderNumber}` needs no session, and order numbers are a dense
 * sequence (`100001`, `100002`, …). Without a second factor the page was an
 * oracle over the whole order table: walk the numbers, learn exact order
 * volume and growth rate, and harvest every courier `trackingCode`.
 *
 * The property under test is that an attacker cannot distinguish
 *
 *   - an order that exists but whose phone digits they do not know, from
 *   - an order number that does not exist at all.
 *
 * Both must return `null`. If they ever diverge the oracle is back.
 *
 * Fixtures are created under `@techno-house.invalid` and removed in `finally`.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import {
  getPublicOrderTracking,
  resolvePublicTrackQuery,
  TRACK_PHONE_SUFFIX_LENGTH,
} from "../../lib/orders/public-tracking";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();
  const orderIds: string[] = [];
  const userIds: string[] = [];

  try {
    const user = await prisma.user.create({
      data: {
        email: `track-${stamp}@techno-house.invalid`,
        fullName: "Track Fixture",
        phone: `012${String(stamp).slice(-8)}`,
        status: "ACTIVE",
      },
      select: { id: true, phone: true },
    });
    userIds.push(user.id);

    const phone = user.phone ?? "";
    const goodSuffix = phone.replace(/\D/g, "").slice(-TRACK_PHONE_SUFFIX_LENGTH);
    const badSuffix = goodSuffix === "0000" ? "1111" : "0000";

    const order = await prisma.order.create({
      data: {
        number: `TH-TRK-${stamp}`,
        userId: user.id,
        customerName: "Track Fixture",
        customerEmail: `track-${stamp}@techno-house.invalid`,
        customerPhone: phone,
        shippingAddress: "Tracking",
        subtotalAmount: 1000,
        totalAmount: 1000,
        trackingCode: `COURIER-${stamp}`,
      },
      select: { id: true, number: true },
    });
    orderIds.push(order.id);

    const missingNumber = `TH-TRK-NOPE-${stamp}`;

    // --- The oracle: existing-but-unverified must equal non-existent --------
    const unverified = await getPublicOrderTracking(order.number, badSuffix);
    const nonExistent = await getPublicOrderTracking(missingNumber, badSuffix);
    check(
      "a real order with the wrong phone digits returns nothing",
      unverified === null,
      unverified ? "tracking detail was returned" : undefined,
    );
    check(
      "a non-existent order returns nothing",
      nonExistent === null,
    );
    check(
      "existing-but-unverified is indistinguishable from non-existent",
      unverified === nonExistent,
    );

    const noSuffix = await getPublicOrderTracking(order.number, "");
    check("an order number alone returns nothing", noSuffix === null);

    // A partial suffix must not be accepted as a prefix match.
    const shortSuffix = await getPublicOrderTracking(
      order.number,
      goodSuffix.slice(1),
    );
    check(
      "a too-short suffix is rejected",
      shortSuffix === null,
      shortSuffix ? "a 3-digit suffix was accepted" : undefined,
    );

    // --- The legitimate customer must still get through ---------------------
    const verified = await getPublicOrderTracking(order.number, goodSuffix);
    check(
      "the right phone digits open the tracking page",
      verified !== null,
      verified ? undefined : "the real customer was locked out",
    );
    check(
      "the tracking code is returned once verified",
      verified?.trackingCode === `COURIER-${stamp}`,
      `trackingCode=${verified?.trackingCode}`,
    );

    // --- The query resolver must not leak either ---------------------------
    const bare = await resolvePublicTrackQuery(order.number, { ip: null });
    check(
      "the resolver does not return detail for a bare order number",
      bare.kind !== "detail",
      `kind=${bare.kind}`,
    );
    const wrongPin = await resolvePublicTrackQuery(order.number, {
      phoneSuffix: badSuffix,
      ip: null,
    });
    const missingPin = await resolvePublicTrackQuery(missingNumber, {
      phoneSuffix: badSuffix,
      ip: null,
    });
    check(
      "the resolver gives the same answer for a wrong pin and a missing order",
      wrongPin.kind === missingPin.kind,
      `wrong=${wrongPin.kind} missing=${missingPin.kind}`,
    );
    const rightPin = await resolvePublicTrackQuery(order.number, {
      phoneSuffix: goodSuffix,
      ip: null,
    });
    check(
      "the resolver returns detail for the right pin",
      rightPin.kind === "detail",
      `kind=${rightPin.kind}`,
    );

    // --- Rate limiting ------------------------------------------------------
    // Hammer one key from one IP; the per-key bucket must bite.
    let throttledAt = -1;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const probe = await resolvePublicTrackQuery(`TH-PROBE-${stamp}`, {
        phoneSuffix: badSuffix,
        ip: `203.0.113.${stamp % 200}`,
      });
      if (probe.kind === "throttled") {
        throttledAt = attempt;
        break;
      }
    }
    check(
      "repeated lookups of one order number are throttled",
      throttledAt >= 0,
      throttledAt < 0 ? "15 lookups all went through unthrottled" : undefined,
    );
  } finally {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.authRateLimit.deleteMany({
      where: { bucketKey: { startsWith: "track.lookup." } },
    });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`tracking privacy failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} tracking privacy checks`);
}

main().catch((error) => {
  console.error("tracking privacy crashed:", error);
  process.exitCode = 1;
});
