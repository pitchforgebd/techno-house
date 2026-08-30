import {
  parseMockOrderSnapshot,
  readLastOrderSnapshot,
  type MockOrderSnapshot,
} from "@/lib/cart/checkout";

export type { MockOrderSnapshot };

export const MOCK_ORDERS_KEY = "techno-house-mock-orders-v1";
export const MAX_MOCK_ORDERS = 20;

export type MockOrderStatus = "placed" | "confirmed" | "ready" | "completed";

export const MOCK_TRACK_STEPS: {
  id: MockOrderStatus;
  label: string;
  note: string;
}[] = [
  {
    id: "placed",
    label: "Placed",
    note: "Mock order captured on this device.",
  },
  {
    id: "confirmed",
    label: "Confirmed",
    note: "Staff confirmation arrives with backend orders.",
  },
  {
    id: "ready",
    label: "Ready / handover",
    note: "Pickup or courier handover is not live yet.",
  },
  {
    id: "completed",
    label: "Completed",
    note: "Delivery completion is not tracked in this preview.",
  },
];

export function mockOrderStatus(): MockOrderStatus {
  return "placed";
}

export function mockOrderStatusLabel(status: MockOrderStatus): string {
  return MOCK_TRACK_STEPS.find((step) => step.id === status)?.label ?? status;
}

export function normalizeOrderIdParam(raw: string): string {
  return raw.trim().slice(0, 64);
}

export function isMockOrderId(id: string): boolean {
  return /^TH-[A-Z0-9]+$/i.test(id);
}

export function normalizeMockOrders(raw: unknown): MockOrderSnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const orders: MockOrderSnapshot[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = parseMockOrderSnapshot(item);
    if (!parsed || seen.has(parsed.orderId)) {
      continue;
    }
    seen.add(parsed.orderId);
    orders.push(parsed);
    if (orders.length >= MAX_MOCK_ORDERS) {
      break;
    }
  }
  return orders;
}

export function appendMockOrder(
  orders: MockOrderSnapshot[],
  snapshot: MockOrderSnapshot,
): MockOrderSnapshot[] {
  const parsed = parseMockOrderSnapshot(snapshot);
  if (!parsed) {
    return orders;
  }
  const rest = orders.filter((order) => order.orderId !== parsed.orderId);
  return [parsed, ...rest].slice(0, MAX_MOCK_ORDERS);
}

export function findMockOrder(
  orders: MockOrderSnapshot[],
  orderId: string,
): MockOrderSnapshot | null {
  const id = normalizeOrderIdParam(orderId);
  return orders.find((order) => order.orderId === id) ?? null;
}

/** Merge last checkout snapshot so a single session order still appears in history. */
export function mergeLastOrderIntoList(
  orders: MockOrderSnapshot[],
): MockOrderSnapshot[] {
  const last = readLastOrderSnapshot();
  if (!last) {
    return orders;
  }
  return appendMockOrder(orders, last);
}

export function readStoredMockOrders(): MockOrderSnapshot[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_ORDERS_KEY);
    return raw ? normalizeMockOrders(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function persistMockOrder(snapshot: MockOrderSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const next = appendMockOrder(readStoredMockOrders(), snapshot);
    window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode.
  }
}

/** Persist a session last-order into history if it is not stored yet. */
export function syncLastOrderIntoHistory(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const stored = readStoredMockOrders();
  const merged = mergeLastOrderIntoList(stored);
  if (
    merged.length === stored.length &&
    merged[0]?.orderId === stored[0]?.orderId
  ) {
    return false;
  }
  try {
    window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}
