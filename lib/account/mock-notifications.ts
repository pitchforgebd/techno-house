export const MOCK_NOTIFICATIONS_KEY = "techno-house-mock-notifications-v1";
export const MAX_MOCK_NOTIFICATIONS = 20;
export const MAX_READ_IDS = 80;

export type MockNotificationKind = "account" | "order" | "ticket";

export type MockNotificationPrefs = {
  emailOrders: boolean;
  emailSupport: boolean;
  smsOrders: boolean;
};

export type MockNotificationState = {
  prefs: MockNotificationPrefs;
  readIds: string[];
};

export type DerivedNotification = {
  id: string;
  kind: MockNotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

export const DEFAULT_NOTIFICATION_PREFS: MockNotificationPrefs = {
  emailOrders: false,
  emailSupport: false,
  smsOrders: false,
};

export const EMPTY_NOTIFICATION_STATE: MockNotificationState = {
  prefs: DEFAULT_NOTIFICATION_PREFS,
  readIds: [],
};

export const MOCK_NOTIFICATION_KIND_LABEL: Record<
  MockNotificationKind,
  string
> = {
  account: "Account",
  order: "Order",
  ticket: "Support",
};

function parsePrefs(raw: unknown): MockNotificationPrefs {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_NOTIFICATION_PREFS;
  }
  const data = raw as Partial<MockNotificationPrefs>;
  return {
    emailOrders: data.emailOrders === true,
    emailSupport: data.emailSupport === true,
    smsOrders: data.smsOrders === true,
  };
}

export function normalizeNotificationState(
  raw: unknown,
): MockNotificationState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_NOTIFICATION_STATE;
  }
  const data = raw as Partial<MockNotificationState>;
  const readIds: string[] = [];
  const seen = new Set<string>();
  if (Array.isArray(data.readIds)) {
    for (const item of data.readIds) {
      if (typeof item !== "string" || seen.has(item)) {
        continue;
      }
      seen.add(item);
      readIds.push(item.slice(0, 80));
      if (readIds.length >= MAX_READ_IDS) {
        break;
      }
    }
  }
  return {
    prefs: parsePrefs(data.prefs),
    readIds,
  };
}

export function patchNotificationPrefs(
  state: MockNotificationState,
  patch: Partial<MockNotificationPrefs>,
): MockNotificationState {
  return {
    ...state,
    prefs: { ...state.prefs, ...patch },
  };
}

export function markNotificationRead(
  state: MockNotificationState,
  id: string,
): MockNotificationState {
  const nextId = id.trim().slice(0, 80);
  if (!nextId || state.readIds.includes(nextId)) {
    return state;
  }
  return {
    ...state,
    readIds: [nextId, ...state.readIds].slice(0, MAX_READ_IDS),
  };
}

export function markNotificationsRead(
  state: MockNotificationState,
  ids: string[],
): MockNotificationState {
  let next = state;
  for (const id of ids) {
    next = markNotificationRead(next, id);
  }
  return next;
}

export function deriveMockNotifications(input: {
  orders: { orderId: string; createdAt: string; itemCount: number }[];
  tickets: { id: string; subject: string; createdAt: string }[];
}): DerivedNotification[] {
  const welcome: DerivedNotification = {
    id: "account-welcome",
    kind: "account",
    title: "Mock account is ready",
    body: "Alerts here are previews from this device. Nothing is emailed or pushed.",
    href: "/account/profile",
    createdAt: "1970-01-01T00:00:00.000Z",
  };

  const fromOrders: DerivedNotification[] = input.orders.map((order) => ({
    id: `order:${order.orderId}`,
    kind: "order",
    title: "Mock order placed",
    body: `${order.orderId} · ${order.itemCount} ${
      order.itemCount === 1 ? "item" : "items"
    } captured on this device.`,
    href: `/account/orders/${encodeURIComponent(order.orderId)}`,
    createdAt: order.createdAt,
  }));

  const fromTickets: DerivedNotification[] = input.tickets.map((ticket) => ({
    id: `ticket:${ticket.id}`,
    kind: "ticket",
    title: "Mock ticket opened",
    body: ticket.subject,
    href: `/account/tickets/${encodeURIComponent(ticket.id)}`,
    createdAt: ticket.createdAt,
  }));

  const rest = [...fromOrders, ...fromTickets].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  return [welcome, ...rest].slice(0, MAX_MOCK_NOTIFICATIONS);
}

export function readStoredNotificationState(): MockNotificationState {
  if (typeof window === "undefined") {
    return EMPTY_NOTIFICATION_STATE;
  }
  try {
    const raw = window.localStorage.getItem(MOCK_NOTIFICATIONS_KEY);
    return raw
      ? normalizeNotificationState(JSON.parse(raw))
      : EMPTY_NOTIFICATION_STATE;
  } catch {
    return EMPTY_NOTIFICATION_STATE;
  }
}

export function persistNotificationState(state: MockNotificationState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      MOCK_NOTIFICATIONS_KEY,
      JSON.stringify(normalizeNotificationState(state)),
    );
  } catch {
    // Ignore quota / private mode.
  }
}
