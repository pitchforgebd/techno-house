import { randomBytes } from "node:crypto";

/** Public refund code. Not a payment or gateway reference. */
export function createRefundCode(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `RF-${year}${month}${day}-${rand}`;
}
