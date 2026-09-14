/**
 * "New arrival" window.
 *
 * `Product.isNew` is a flag an admin sets by hand, so it says nothing about
 * when a product actually landed — on a newest-first listing most genuinely
 * new products carried no badge while older ones still did. This derives the
 * badge from `createdAt` instead, so a new-arrivals page marks what is
 * actually new and the badge expires on its own.
 *
 * Safe to import from a Client Component — no Prisma, no server-only code.
 */
export const NEW_ARRIVAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isWithinNewArrivalWindow(
  createdAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!createdAt) {
    return false;
  }
  const created =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const time = created.getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  const age = now.getTime() - time;
  // A future-dated row is a scheduling quirk, not a new arrival.
  return age >= 0 && age <= NEW_ARRIVAL_DAYS * DAY_MS;
}
