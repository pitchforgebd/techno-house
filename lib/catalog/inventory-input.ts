/**
 * Inventory input helpers (P12-T05).
 * Safe to import from Client Components — no Prisma.
 */

import type { StockStatus } from "@/lib/data/types/common";

export const STOCK_QUANTITY_MAX = 1_000_000;
export const STOCK_THRESHOLD_MAX = 99_999;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function availableUnits(quantity: number, reserved: number): number {
  return Math.max(0, quantity - reserved);
}

export function deriveStockStatus(
  quantity: number,
  reserved: number,
  threshold: number,
): StockStatus {
  const available = availableUnits(quantity, reserved);
  if (available <= 0) {
    return "out_of_stock";
  }
  if (available <= threshold) {
    return "low_stock";
  }
  return "in_stock";
}

export function parseStockInt(
  value: string,
  label: string,
  max: number,
): number | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return `${label} must be a whole number.`;
  }
  const parsed = Number(trimmed);
  if (parsed > max) {
    return `${label} is too large.`;
  }
  return parsed;
}

export type InventoryInputFields = {
  quantity: string;
  lowStockThreshold: string;
};

export type ParsedInventoryInput = {
  quantity: number;
  lowStockThreshold: number;
};

export function parseInventoryInput(
  input: InventoryInputFields,
):
  { ok: true; value: ParsedInventoryInput } | { ok: false; formError: string } {
  const quantity = parseStockInt(
    input.quantity,
    "Stock quantity",
    STOCK_QUANTITY_MAX,
  );
  if (typeof quantity === "string") {
    return { ok: false, formError: quantity };
  }
  const lowStockThreshold = parseStockInt(
    input.lowStockThreshold,
    "Low-stock threshold",
    STOCK_THRESHOLD_MAX,
  );
  if (typeof lowStockThreshold === "string") {
    return { ok: false, formError: lowStockThreshold };
  }
  return { ok: true, value: { quantity, lowStockThreshold } };
}
