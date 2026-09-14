"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  findMockOrder,
  mergeLastOrderIntoList,
  persistMockOrder,
  readStoredMockOrders,
  syncLastOrderIntoHistory,
  type MockOrderSnapshot,
} from "@/lib/account/mock-orders";

type Listener = () => void;

const EMPTY_ORDERS: MockOrderSnapshot[] = [];
const listeners = new Set<Listener>();
let cached: MockOrderSnapshot[] = EMPTY_ORDERS;

function sameOrders(a: MockOrderSnapshot[], b: MockOrderSnapshot[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((order, index) => order.orderId === b[index]?.orderId);
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function readStorage(): MockOrderSnapshot[] {
  return mergeLastOrderIntoList(readStoredMockOrders());
}

function getSnapshot(): MockOrderSnapshot[] {
  const next = readStorage();
  if (sameOrders(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): MockOrderSnapshot[] {
  return EMPTY_ORDERS;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  syncLastOrderIntoHistory();
  return () => {
    listeners.delete(listener);
  };
}

export function recordMockOrder(snapshot: MockOrderSnapshot) {
  persistMockOrder(snapshot);
  cached = readStorage();
  emit();
}

export function useMockOrders() {
  const orders = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const getById = useCallback(
    (orderId: string) => findMockOrder(orders, orderId),
    [orders],
  );

  return { orders, getById };
}
