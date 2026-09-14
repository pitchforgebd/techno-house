/**
 * Store operations settings — shared field contract for the seven
 * "Setup & Configurations" sub-pages.
 *
 * Client-safe: no Prisma import, so the admin client components can reuse the
 * same option lists and limits the server validates against. Mirrors the
 * existing `lib/business/fields.ts` split used by General Settings.
 */

export const ORDER_PREFIX_MAX = 12;
export const INVOICE_PREFIX_MAX = 12;
export const INVOICE_FOOTER_MAX = 300;
export const TRACKING_URL_MAX = 300;

/** Guards against absurd values while leaving real stores plenty of headroom. */
export const MIN_ORDER_AMOUNT_MAX = 1_000_000;
export const SERVICE_CHARGE_MAX = 1_000_000;
/** 10000 basis points = 100.00%. */
export const VAT_BASIS_POINTS_MAX = 10_000;

/**
 * The pickup points the existing UI offers. There is no PickupPoint model in
 * the schema, so this stays an allowlist rather than inventing one — see
 * TASK_STATE.md.
 */
export const PICKUP_POINTS = [
  { value: "dhaka-showroom", label: "Dhaka Showroom — Gulshan" },
  { value: "chattogram-hub", label: "Chattogram Hub — Agrabad" },
] as const;

export const LABEL_SIZES = [
  { value: "4x6", label: "4 × 6 in" },
  { value: "a6", label: "A6" },
] as const;

export const THERMAL_PAPER_WIDTHS = [58, 80] as const;

export type PickupPointValue = (typeof PICKUP_POINTS)[number]["value"];
export type LabelSizeValue = (typeof LABEL_SIZES)[number]["value"];
export type ThermalPaperWidth = (typeof THERMAL_PAPER_WIDTHS)[number];

export type AdminStoreOperationsSettings = {
  orderCodePrefix: string;
  minimumOrderAmount: number;
  autoConfirmPaidOrders: boolean;

  vatRateBasisPoints: number;
  serviceChargeAmount: number;
  taxIncludedInPrice: boolean;

  pickupEnabled: boolean;
  defaultPickupPoint: string;

  invoicePrefix: string;
  invoiceFooter: string;

  trackingUrlTemplate: string;
  notifyOnStatusChange: boolean;

  labelSize: string;
  labelShowLogo: boolean;

  thermalPrinterEnabled: boolean;
  thermalPaperWidthMm: number;
};

/** Matches the Prisma defaults, so a missing row and a fresh row look identical. */
export const DEFAULT_STORE_OPERATIONS_SETTINGS: AdminStoreOperationsSettings = {
  orderCodePrefix: "TH-",
  minimumOrderAmount: 0,
  autoConfirmPaidOrders: false,

  vatRateBasisPoints: 0,
  serviceChargeAmount: 0,
  taxIncludedInPrice: true,

  pickupEnabled: true,
  defaultPickupPoint: "dhaka-showroom",

  invoicePrefix: "INV-",
  invoiceFooter: "",

  trackingUrlTemplate: "",
  notifyOnStatusChange: true,

  labelSize: "4x6",
  labelShowLogo: true,

  thermalPrinterEnabled: false,
  thermalPaperWidthMm: 80,
};

/** `null` means invalid — callers turn that into a real form error. */
export function normalizeRequiredCode(
  raw: string,
  max: number,
): string | null {
  const value = raw.trim();
  if (!value || value.length > max) {
    return null;
  }
  // Order/invoice prefixes end up in generated document numbers, so keep them
  // to characters that are safe in a filename, URL, and printed reference.
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    return null;
  }
  return value;
}

export function normalizeOptionalMultiline(
  raw: string,
  max: number,
): string | null {
  const value = raw.trim();
  if (value.length > max) {
    return null;
  }
  return value;
}

export function normalizeWholeNumber(
  raw: string | number,
  max: number,
): number | null {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return null;
  }
  if (value < 0 || value > max) {
    return null;
  }
  return value;
}

/** Accepts a percent like "7.5" and returns basis points (750). */
export function percentToBasisPoints(raw: string | number): number | null {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  const basisPoints = Math.round(value * 100);
  if (basisPoints > VAT_BASIS_POINTS_MAX) {
    return null;
  }
  return basisPoints;
}

/** Inverse of `percentToBasisPoints`, for seeding the form. */
export function basisPointsToPercent(basisPoints: number): string {
  const percent = basisPoints / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
}

export function normalizePickupPoint(raw: string): PickupPointValue | null {
  return PICKUP_POINTS.some((point) => point.value === raw)
    ? (raw as PickupPointValue)
    : null;
}

export function normalizeLabelSize(raw: string): LabelSizeValue | null {
  return LABEL_SIZES.some((size) => size.value === raw)
    ? (raw as LabelSizeValue)
    : null;
}

export function normalizeThermalPaperWidth(
  raw: string | number,
): ThermalPaperWidth | null {
  const value = typeof raw === "number" ? raw : Number(raw.trim());
  return (THERMAL_PAPER_WIDTHS as readonly number[]).includes(value)
    ? (value as ThermalPaperWidth)
    : null;
}

/**
 * The template is printed into customer-facing tracking links, so only real
 * http(s) URLs are accepted. Blank is allowed and means "no tracking URL".
 */
export function normalizeTrackingUrlTemplate(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  if (value.length > TRACKING_URL_MAX) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  return value;
}
