/**
 * Abandoned-checkout stock release — inspector and sweeper.
 *
 *   npm run orders:stale            # report only, changes nothing
 *   npm run orders:stale -- --apply # cancels orders and returns their stock
 *
 * **Dry run is the default and `--apply` is mandatory to write anything.** This
 * cancels real orders. A script that does that when someone types its name with
 * no arguments is a script that will eventually be run by accident.
 *
 * The report is deliberately per-order rather than a count: "47 orders would be
 * cancelled" is not something anyone can approve, whereas a list of order
 * numbers with their ages and the units they are holding is.
 *
 * ## Running it on a schedule
 *
 * There is no cron infrastructure in this project, so this is written to be
 * driven from outside:
 *
 *   - Windows Task Scheduler / systemd timer / any host cron, running
 *     `npm run orders:stale -- --apply` once an hour; or
 *   - an HTTP scheduler (Vercel Cron, cron-job.org, an uptime pinger) calling
 *     `POST /api/internal/sweep-stale-orders` with the `STALE_SWEEP_TOKEN`
 *     bearer token.
 *
 * Frequency barely matters. The window is what decides which orders are swept,
 * so running hourly and running daily release the same orders — hourly just
 * releases them sooner after they qualify.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import {
  DEFAULT_SWEEP_LIMIT,
  findStaleOrders,
  staleOrderCutoff,
  staleOrderHours,
  sweepStaleOrders,
} from "../../lib/orders/stale-orders";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

function ageInHours(placedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - placedAt.getTime()) / (60 * 60 * 1000));
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const cutoff = staleOrderCutoff(now);
  const prisma = getPrisma();

  try {
    const candidates = await findStaleOrders(prisma, {
      cutoff,
      limit: DEFAULT_SWEEP_LIMIT,
    });

    console.log(
      `window: ${staleOrderHours()}h — orders placed before ${cutoff.toISOString()}`,
    );

    if (candidates.length === 0) {
      console.log("No abandoned orders are holding stock. Nothing to do.");
      return;
    }

    const totalUnits = candidates.reduce(
      (sum, order) => sum + order.heldUnits,
      0,
    );
    console.log(
      `${candidates.length} abandoned order(s) holding ${totalUnits} unit(s):`,
    );
    for (const order of candidates) {
      console.log(
        `  ${order.number.padEnd(12)} ${String(ageInHours(order.placedAt, now)).padStart(4)}h old` +
          `  ${String(order.heldUnits).padStart(3)} unit(s)` +
          `  ${(order.provider ?? "?").padEnd(11)} total=${order.totalAmount}`,
      );
    }

    if (!apply) {
      console.log("");
      console.log("Dry run — nothing was changed.");
      console.log(
        "Each order above would be CANCELLED, its payment marked CANCELLED,",
      );
      console.log(
        "and its units returned to available stock. Re-run with --apply to do it.",
      );
      return;
    }

    console.log("");
    console.log("Applying…");
    const result = await sweepStaleOrders(prisma, {
      cutoff,
      limit: DEFAULT_SWEEP_LIMIT,
    });
    console.log(
      `released ${result.released}, skipped ${result.skipped}, ` +
        `${result.unitsReturned} unit(s) returned`,
    );
    if (result.skipped > 0) {
      console.log(
        "Skipped orders moved while the sweep ran (paid, cancelled, or already released).",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("stale-order sweep failed:", error);
  process.exitCode = 1;
});
