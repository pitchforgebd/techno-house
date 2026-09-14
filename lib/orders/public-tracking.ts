/**
 * Public guest order tracking (phone or order number).
 * Returns only tracking-safe fields — no payment secrets.
 */
import { getPrisma } from "@/lib/db/prisma";
import { limitPublicTracking } from "@/lib/auth/rate-limit";
import { usesDatabase } from "@/lib/runtime/data-source";
import type { OrderStatus as DbOrderStatus } from "@/lib/generated/prisma/enums";

export type PublicTrackListItem = {
  id: string;
  number: string;
  placedAtLabel: string;
  statusLabel: string;
};

export type PublicTrackStepId =
  | "placed"
  | "confirmed"
  | "handover"
  | "completed";

export type PublicTrackStep = {
  id: PublicTrackStepId;
  label: string;
  done: boolean;
  current: boolean;
};

export type PublicTrackDetail = {
  id: string;
  number: string;
  placedAtLabel: string;
  statusLabel: string;
  shippingMethod: string;
  trackingCode: string | null;
  cancelled: boolean;
  steps: PublicTrackStep[];
};

const TRACK_STEPS: { id: PublicTrackStepId; label: string }[] = [
  { id: "placed", label: "Order placed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "handover", label: "Handover to courier" },
  { id: "completed", label: "Completed" },
];

export function normalizeTrackPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.startsWith("880") && digits.length >= 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    return `0${digits}`;
  }
  return digits;
}

export function looksLikeOrderNumber(raw: string): boolean {
  const value = raw.trim();
  if (!value) {
    return false;
  }
  // Techno House numbers look like TH-…; also allow bare digits from refs.
  return /^TH[-_A-Z0-9]+$/i.test(value) || /^\d{5,12}$/.test(value);
}

function phoneMatchVariants(normalized: string): string[] {
  const variants = new Set<string>([normalized]);
  if (normalized.startsWith("0") && normalized.length === 11) {
    variants.add(normalized.slice(1));
    variants.add(`880${normalized.slice(1)}`);
    variants.add(`+880${normalized.slice(1)}`);
  }
  return [...variants];
}

function statusLabel(status: DbOrderStatus): string {
  switch (status) {
    case "PROCESSING":
      return "Confirmed";
    case "SHIPPED":
      return "On the way";
    case "DELIVERED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "No response";
  }
}

function formatPlacedAt(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildSteps(status: DbOrderStatus): PublicTrackStep[] {
  if (status === "CANCELLED") {
    return TRACK_STEPS.map((step, index) => ({
      ...step,
      done: index === 0,
      current: index === 0,
    }));
  }

  let reached: PublicTrackStepId = "placed";
  if (status === "DELIVERED") {
    reached = "completed";
  } else if (status === "SHIPPED") {
    reached = "handover";
  } else if (status === "PROCESSING") {
    reached = "confirmed";
  }

  const order: PublicTrackStepId[] = [
    "placed",
    "confirmed",
    "handover",
    "completed",
  ];
  const reachedIndex = order.indexOf(reached);

  return TRACK_STEPS.map((step, index) => ({
    ...step,
    done: index <= reachedIndex,
    current: index === reachedIndex,
  }));
}

function buildPhoneOrClauses(normalized: string) {
  const tail = normalized.slice(-10);
  const variants = phoneMatchVariants(normalized);
  return [
    ...variants.map((variant) => ({ customerPhone: variant })),
    { customerPhone: { contains: tail } },
  ];
}

export async function listPublicOrdersByPhone(
  phoneRaw: string,
): Promise<PublicTrackListItem[]> {
  if (!usesDatabase()) {
    return [];
  }
  const phone = normalizeTrackPhone(phoneRaw);
  if (phone.length < 10) {
    return [];
  }

  const rows = await getPrisma().order.findMany({
    where: { OR: buildPhoneOrClauses(phone) },
    orderBy: { placedAt: "desc" },
    take: 40,
    select: {
      id: true,
      number: true,
      placedAt: true,
      status: true,
      customerPhone: true,
    },
  });

  // Tighten contains matches to digit-equal phones.
  const variants = new Set(phoneMatchVariants(phone));
  return rows
    .filter((row) => {
      const digits = row.customerPhone.replace(/\D/g, "");
      const normalizedRow = normalizeTrackPhone(row.customerPhone);
      return (
        variants.has(normalizedRow) ||
        variants.has(digits) ||
        phoneMatchVariants(normalizedRow).some((v) => variants.has(v))
      );
    })
    .map((row) => ({
      id: row.id,
      number: row.number,
      placedAtLabel: formatPlacedAt(row.placedAt),
      statusLabel: statusLabel(row.status),
    }));
}

/** Digits of `customerPhone` a visitor must supply to open a tracking page. */
export const TRACK_PHONE_SUFFIX_LENGTH = 4;

/** True when `supplied` matches the last digits of the order's phone. */
function phoneSuffixMatches(
  customerPhone: string,
  supplied: string,
): boolean {
  const wanted = customerPhone.replace(/\D/g, "");
  const given = supplied.replace(/\D/g, "");
  if (given.length !== TRACK_PHONE_SUFFIX_LENGTH) {
    return false;
  }
  return wanted.endsWith(given);
}

/**
 * Public order tracking, gated on a second factor (DSA-05).
 *
 * Order numbers are a dense sequence (`100001`, `100002`, …), and this route
 * needs no session, so without a second factor it was an oracle over the whole
 * order table: walk the numbers, learn exact order volume and growth, and
 * harvest every courier `trackingCode`.
 *
 * `phoneSuffix` is the last four digits of the phone on the order. A wrong or
 * missing suffix returns `null` — the SAME result as a non-existent order — so
 * the caller cannot tell the two apart and the enumeration oracle is closed.
 * Rate limiting lives in the caller, which knows the request IP.
 */
export async function getPublicOrderTracking(
  orderKey: string,
  phoneSuffix: string,
): Promise<PublicTrackDetail | null> {
  if (!usesDatabase()) {
    return null;
  }
  const key = orderKey.trim();
  if (!key || !phoneSuffix.trim()) {
    return null;
  }

  const row = await getPrisma().order.findFirst({
    where: { OR: [{ id: key }, { number: key }] },
    select: {
      id: true,
      number: true,
      placedAt: true,
      status: true,
      shippingMethodLabel: true,
      trackingCode: true,
      customerPhone: true,
    },
  });
  if (!row) {
    return null;
  }
  // Deliberately indistinguishable from "no such order".
  if (!phoneSuffixMatches(row.customerPhone, phoneSuffix)) {
    return null;
  }

  return {
    id: row.id,
    number: row.number,
    placedAtLabel: formatPlacedAt(row.placedAt),
    statusLabel: statusLabel(row.status),
    shippingMethod: row.shippingMethodLabel ?? "—",
    trackingCode: row.trackingCode,
    cancelled: row.status === "CANCELLED",
    steps: buildSteps(row.status),
  };
}

export async function resolvePublicTrackQuery(
  q: string,
  options: { phoneSuffix?: string; ip?: string | null } = {},
): Promise<
  | { kind: "list"; phone: string; items: PublicTrackListItem[] }
  | { kind: "detail"; detail: PublicTrackDetail }
  | { kind: "needsPhone"; orderNumber: string }
  | { kind: "throttled" }
  | { kind: "empty"; query: string }
> {
  const trimmed = q.trim();
  if (!trimmed) {
    return { kind: "empty", query: "" };
  }

  // Throttle before touching the database, so a walk of the order-number
  // sequence costs the attacker the limit rather than a row read each time.
  const limited = await limitPublicTracking(options.ip, trimmed);
  if (!limited.ok) {
    return { kind: "throttled" };
  }

  const suffix = options.phoneSuffix?.trim() ?? "";

  /** Resolves an order number, demanding the phone digits. */
  async function asOrder(): Promise<
    | { kind: "detail"; detail: PublicTrackDetail }
    | { kind: "needsPhone"; orderNumber: string }
  > {
    if (suffix) {
      const detail = await getPublicOrderTracking(trimmed, suffix);
      if (detail) {
        return { kind: "detail", detail };
      }
    }
    // A wrong suffix and a non-existent order give the same answer on purpose.
    return { kind: "needsPhone", orderNumber: trimmed };
  }

  // Order of these branches matters, and is not arbitrary. `looksLikeOrderNumber`
  // accepts any bare 5-12 digit string, so an 11-digit phone satisfies it too.
  // The original code disambiguated by attempting the order lookup and falling
  // through to the phone branch when it found nothing; that fallback is no
  // longer available for the detail case, because a lookup without the phone
  // digits now always returns null. So the ambiguity is resolved by shape
  // instead: an explicit `TH-…` reference can only be an order, a 10+ digit
  // value is treated as a phone, and anything else digit-shaped (the short
  // sequential numbers) falls through to the order branch.
  if (/^TH[-_A-Z0-9]+$/i.test(trimmed)) {
    return asOrder();
  }

  // A full phone number is itself a second factor, so the list view is
  // unchanged.
  const phone = normalizeTrackPhone(trimmed);
  if (phone.length >= 10) {
    const items = await listPublicOrdersByPhone(phone);
    return { kind: "list", phone, items };
  }

  if (looksLikeOrderNumber(trimmed)) {
    return asOrder();
  }

  return { kind: "empty", query: trimmed };
}
