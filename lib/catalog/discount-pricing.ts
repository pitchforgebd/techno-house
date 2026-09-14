/**
 * Product discount helpers (AD-216).
 *
 * Admin enters unit (list) price + percent/flat discount. We persist
 * `priceAmount` as the sale price and `compareAtAmount` as the list price.
 * Optional start/end dates control when the strike-through offer is active.
 */

export type DiscountType = "percent" | "flat";

export type DiscountPricingInput = {
  unitPrice: number;
  discountValue: number;
  discountType: DiscountType;
};

export type DiscountPricingResult = {
  priceAmount: number;
  compareAtAmount: number | null;
  isSale: boolean;
};

export function computeDiscountPricing(
  input: DiscountPricingInput,
): DiscountPricingResult | { ok: false; reason: string } {
  const unit = Math.round(input.unitPrice);
  if (!Number.isFinite(unit) || unit < 0) {
    return { ok: false, reason: "Unit price is not valid." };
  }

  const raw = input.discountValue;
  if (!Number.isFinite(raw) || raw < 0) {
    return { ok: false, reason: "Discount is not valid." };
  }

  if (raw === 0) {
    return { priceAmount: unit, compareAtAmount: null, isSale: false };
  }

  let sale = unit;
  if (input.discountType === "percent") {
    if (raw > 100) {
      return { ok: false, reason: "Percent discount cannot exceed 100." };
    }
    sale = Math.round((unit * (100 - raw)) / 100);
  } else {
    if (raw >= unit) {
      return {
        ok: false,
        reason: "Flat discount must be less than the unit price.",
      };
    }
    sale = Math.round(unit - raw);
  }

  if (sale < 0) {
    return { ok: false, reason: "Discount produces an invalid sale price." };
  }
  if (sale >= unit) {
    return { priceAmount: unit, compareAtAmount: null, isSale: false };
  }

  return {
    priceAmount: sale,
    compareAtAmount: unit,
    isSale: true,
  };
}

/** Derive admin form discount fields from stored list/sale prices. */
export function deriveDiscountFromPrices(
  priceAmount: number,
  compareAtAmount: number | null,
): { unitPrice: number; discountValue: number; discountType: DiscountType } {
  if (
    compareAtAmount != null &&
    compareAtAmount > priceAmount &&
    priceAmount >= 0
  ) {
    const percent = Math.round(
      (1 - priceAmount / compareAtAmount) * 100,
    );
    return {
      unitPrice: compareAtAmount,
      discountValue: percent,
      discountType: "percent",
    };
  }
  return {
    unitPrice: priceAmount,
    discountValue: 0,
    discountType: "percent",
  };
}

/** Parse `YYYY-MM-DD` from a date input into a UTC midnight Date. */
export function parseDiscountDate(
  raw: string,
  label: string,
): Date | null | { ok: false; reason: string } {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, reason: `${label} must be a valid date.` };
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, reason: `${label} must be a valid date.` };
  }
  return date;
}

export function formatDiscountDateInput(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Inclusive calendar-day window in UTC dates.
 * Missing start/end means open on that side. Both missing → always active.
 */
export function isDiscountWindowActive(
  startsAt: Date | string | null | undefined,
  endsAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const start = startsAt
    ? typeof startsAt === "string"
      ? new Date(startsAt)
      : startsAt
    : null;
  const end = endsAt
    ? typeof endsAt === "string"
      ? new Date(endsAt)
      : endsAt
    : null;

  if (start && Number.isNaN(start.getTime())) {
    return false;
  }
  if (end && Number.isNaN(end.getTime())) {
    return false;
  }

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (start) {
    const startDay = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    if (today < startDay) {
      return false;
    }
  }
  if (end) {
    const endDay = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    if (today > endDay) {
      return false;
    }
  }
  return true;
}

/**
 * Storefront effective prices: outside the window, list price is charged and
 * the strike-through offer is hidden.
 */
export function effectiveStorefrontPricing(input: {
  priceAmount: number;
  compareAtAmount: number | null;
  discountStartsAt?: Date | string | null;
  discountEndsAt?: Date | string | null;
  isSale: boolean;
  now?: Date;
}): {
  priceAmount: number;
  compareAtAmount: number | null;
  isSale: boolean;
  discountActive: boolean;
} {
  const hasOffer =
    input.compareAtAmount != null &&
    input.compareAtAmount > input.priceAmount;
  if (!hasOffer) {
    return {
      priceAmount: input.priceAmount,
      compareAtAmount: null,
      isSale: false,
      discountActive: false,
    };
  }

  const active = isDiscountWindowActive(
    input.discountStartsAt,
    input.discountEndsAt,
    input.now,
  );
  if (!active) {
    return {
      priceAmount: input.compareAtAmount as number,
      compareAtAmount: null,
      isSale: false,
      discountActive: false,
    };
  }

  return {
    priceAmount: input.priceAmount,
    compareAtAmount: input.compareAtAmount,
    isSale: true,
    discountActive: true,
  };
}
