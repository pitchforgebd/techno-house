/**
 * Tracking event catalogue and payload builders (AD-389).
 *
 * Pure module shared by the browser `track()` (lib/tracking/track.ts) and the
 * server relay (`/api/tracking`). GA4 runs only through GTM and the Meta pixel
 * only through GTM's Meta template, so nothing here loads gtag.js or fbq — the
 * browser side only ever pushes to `window.dataLayer`.
 *
 * Item identity: `item_id` / `content_ids` is the parent `Product.sku`, the
 * same value `/feeds/facebook.xml` publishes as `<g:id>`. A variant is never
 * its own id; its name goes in `item_variant`.
 */

export const TRACK_AFFILIATION = "Techno House";
export const TRACK_CURRENCY = "BDT";

export type TrackEventName =
  | "PageView"
  | "ViewItemList"
  | "SelectItem"
  | "ViewContent"
  | "AddToCart"
  | "RemoveFromCart"
  | "ViewCart"
  | "AddToWishlist"
  | "InitiateCheckout"
  | "AddShippingInfo"
  | "AddPaymentInfo"
  | "Purchase"
  | "Search"
  | "CompleteRegistration"
  | "Login"
  | "Lead";

type EventDefinition = {
  /** GA4 `dataLayer.event` name. Null = never pushed (PageView: GTM sends it). */
  ga4: string | null;
  /** Meta standard event name, when the event has one. */
  meta: string | null;
  /** Relayed to `/api/tracking` for a server-side CAPI copy. */
  relay: boolean;
  /** GA4 ecommerce event — preceded by `{ ecommerce: null }`. */
  ecommerce: boolean;
};

export const TRACK_EVENTS: Record<TrackEventName, EventDefinition> = {
  PageView: { ga4: null, meta: null, relay: false, ecommerce: false },
  ViewItemList: {
    ga4: "view_item_list",
    meta: null,
    relay: false,
    ecommerce: true,
  },
  SelectItem: { ga4: "select_item", meta: null, relay: false, ecommerce: true },
  ViewContent: {
    ga4: "view_item",
    meta: "ViewContent",
    relay: true,
    ecommerce: true,
  },
  AddToCart: {
    ga4: "add_to_cart",
    meta: "AddToCart",
    relay: true,
    ecommerce: true,
  },
  RemoveFromCart: {
    ga4: "remove_from_cart",
    meta: null,
    relay: false,
    ecommerce: true,
  },
  ViewCart: { ga4: "view_cart", meta: null, relay: false, ecommerce: true },
  AddToWishlist: {
    ga4: "add_to_wishlist",
    meta: "AddToWishlist",
    relay: true,
    ecommerce: true,
  },
  InitiateCheckout: {
    ga4: "begin_checkout",
    meta: "InitiateCheckout",
    relay: true,
    ecommerce: true,
  },
  AddShippingInfo: {
    ga4: "add_shipping_info",
    meta: null,
    relay: false,
    ecommerce: true,
  },
  AddPaymentInfo: {
    ga4: "add_payment_info",
    meta: "AddPaymentInfo",
    relay: true,
    ecommerce: true,
  },
  // The server sends Purchase itself from the order row (lib/analytics/meta-capi.ts).
  Purchase: {
    ga4: "purchase",
    meta: "Purchase",
    relay: false,
    ecommerce: true,
  },
  Search: { ga4: "search", meta: "Search", relay: true, ecommerce: false },
  CompleteRegistration: {
    ga4: "sign_up",
    meta: "CompleteRegistration",
    relay: true,
    ecommerce: false,
  },
  Login: { ga4: "login", meta: null, relay: false, ecommerce: false },
  Lead: { ga4: "generate_lead", meta: "Lead", relay: true, ecommerce: false },
};

export const RELAY_EVENT_NAMES: ReadonlySet<TrackEventName> = new Set(
  (Object.keys(TRACK_EVENTS) as TrackEventName[]).filter(
    (name) => TRACK_EVENTS[name].relay,
  ),
);

export function isTrackEventName(value: unknown): value is TrackEventName {
  return typeof value === "string" && Object.hasOwn(TRACK_EVENTS, value);
}

export type TrackItem = {
  /** Parent `Product.sku` — equals the catalog feed `<g:id>`. */
  id: string;
  name: string;
  brand?: string | null;
  /** Category names, root → leaf (at most five are sent). */
  categories?: string[];
  /** Variant display name ("Black / 256GB"). */
  variant?: string | null;
  /** Unit price the customer actually pays, in ৳. */
  price: number;
  quantity: number;
  /** Position in a list (0-based). */
  index?: number;
  /** Storefront slug — used client-side to match clicks; never sent. */
  slug?: string;
};

/** Already SHA-256-hashed customer keys (Purchase only, for GTM Advanced Matching). */
export type HashedCustomer = {
  em?: string;
  ph?: string;
  fn?: string;
  country?: string;
};

export type TrackData = {
  items?: TrackItem[];
  /** Defaults to Σ price × quantity of `items`. */
  value?: number;
  listId?: string;
  listName?: string;
  searchTerm?: string;
  transactionId?: string;
  shipping?: number;
  tax?: number;
  coupon?: string | null;
  shippingTier?: string | null;
  paymentType?: string | null;
  /** sign_up / login method ("email", "google", "b2b", …). */
  method?: string;
  /** Lead channel ("whatsapp" | "call"). */
  leadType?: string;
  customer?: HashedCustomer;
};

const MAX_CATEGORY_LEVELS = 5;

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function itemsValue(items: TrackItem[] | undefined): number {
  return (items ?? []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
}

export function eventValue(data: TrackData): number | undefined {
  const explicit = finiteNumber(data.value);
  if (explicit !== undefined) {
    return explicit;
  }
  return data.items && data.items.length > 0
    ? itemsValue(data.items)
    : undefined;
}

function toGa4Item(item: TrackItem, data: TrackData): Record<string, unknown> {
  const out: Record<string, unknown> = {
    item_id: item.id,
    item_name: item.name,
    affiliation: TRACK_AFFILIATION,
    price: item.price,
    quantity: item.quantity,
  };
  if (item.brand) {
    out.item_brand = item.brand;
  }
  (item.categories ?? []).slice(0, MAX_CATEGORY_LEVELS).forEach((name, i) => {
    out[i === 0 ? "item_category" : `item_category${i + 1}`] = name;
  });
  if (item.variant) {
    out.item_variant = item.variant;
  }
  if (typeof item.index === "number") {
    out.index = item.index;
  }
  if (data.listId) {
    out.item_list_id = data.listId;
  }
  if (data.listName) {
    out.item_list_name = data.listName;
  }
  return out;
}

/**
 * GA4 shape for one event: `ecommerce` for ecommerce events, plus any
 * top-level event parameters (`search_term`, `method`, `lead_type`).
 */
export function toGa4(
  name: TrackEventName,
  data: TrackData,
): {
  ecommerce: Record<string, unknown> | null;
  params: Record<string, unknown>;
} {
  const def = TRACK_EVENTS[name];
  const params: Record<string, unknown> = {};
  if (data.searchTerm) {
    params.search_term = data.searchTerm;
  }
  if (data.method) {
    params.method = data.method;
  }
  if (data.leadType) {
    params.lead_type = data.leadType;
  }
  if (!def.ecommerce) {
    return { ecommerce: null, params };
  }

  const ecommerce: Record<string, unknown> = { currency: TRACK_CURRENCY };
  const isList = name === "ViewItemList" || name === "SelectItem";
  if (!isList) {
    const value = eventValue(data);
    if (value !== undefined) {
      ecommerce.value = value;
    }
  }
  if (isList) {
    if (data.listId) {
      ecommerce.item_list_id = data.listId;
    }
    if (data.listName) {
      ecommerce.item_list_name = data.listName;
    }
  }
  if (data.transactionId) {
    ecommerce.transaction_id = data.transactionId;
  }
  if (finiteNumber(data.shipping) !== undefined) {
    ecommerce.shipping = data.shipping;
  }
  if (finiteNumber(data.tax) !== undefined) {
    ecommerce.tax = data.tax;
  }
  if (data.coupon) {
    ecommerce.coupon = data.coupon;
  }
  if (data.shippingTier) {
    ecommerce.shipping_tier = data.shippingTier;
  }
  if (data.paymentType) {
    ecommerce.payment_type = data.paymentType;
  }
  ecommerce.items = (data.items ?? []).map((item) => toGa4Item(item, data));
  if (data.customer && Object.keys(data.customer).length > 0) {
    ecommerce.customer = data.customer;
  }
  return { ecommerce, params };
}

/**
 * Meta standard-event parameters (`fbq('track', <meta.event>, params)` shape),
 * used both for the `meta.params` dataLayer key and as CAPI `custom_data`.
 * Null when the event has no Meta counterpart.
 */
export function toMeta(
  name: TrackEventName,
  data: TrackData,
): Record<string, unknown> | null {
  if (!TRACK_EVENTS[name].meta) {
    return null;
  }
  const params: Record<string, unknown> = {};
  const items = data.items ?? [];
  // A result list is not a basket: Search carries ids, never a summed value.
  const value = name === "Search" ? undefined : eventValue(data);
  if (value !== undefined) {
    params.currency = TRACK_CURRENCY;
    params.value = value;
  }
  if (items.length > 0) {
    params.content_type = "product";
    params.content_ids = [...new Set(items.map((item) => item.id))];
    params.contents = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      item_price: item.price,
    }));
  }
  if (
    name === "InitiateCheckout" ||
    name === "Purchase" ||
    name === "AddPaymentInfo"
  ) {
    params.num_items = items.reduce((sum, item) => sum + item.quantity, 0);
  }
  if (items.length === 1 && items[0]) {
    params.content_name = items[0].name;
  }
  if (name === "Search" && data.searchTerm) {
    params.search_string = data.searchTerm;
  }
  if (name === "Purchase" && data.transactionId) {
    params.order_id = data.transactionId;
  }
  if (name === "CompleteRegistration" && data.method) {
    params.content_name = data.method;
    params.status = true;
  }
  if (name === "Lead" && data.leadType) {
    params.content_name = data.leadType;
  }
  return params;
}

// ---------------------------------------------------------------------------
// Relay payload — what the browser sends to /api/tracking, and the server-side
// sanitiser that turns it back into TrackData. Anything out of range is
// dropped, never clamped into a plausible-looking number.
// ---------------------------------------------------------------------------

export type RelayItem = Pick<TrackItem, "id" | "name" | "price" | "quantity">;

export type RelayPayload = {
  url: string;
  items: RelayItem[];
  value?: number;
  currency: string;
  searchTerm?: string;
  method?: string;
  leadType?: string;
  fbp: string | null;
  fbc: string | null;
};

export const RELAY_LIMITS = {
  maxItems: 50,
  maxPrice: 10_000_000,
  maxQuantity: 999,
  maxValue: 100_000_000,
  maxText: 200,
} as const;

function cleanText(
  raw: unknown,
  max: number = RELAY_LIMITS.maxText,
): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const value = raw.replace(/[\u0000-\u001f]/g, "").trim();
  return value ? value.slice(0, max) : undefined;
}

function cleanAmount(raw: unknown, max: number): number | null {
  if (
    typeof raw !== "number" ||
    !Number.isFinite(raw) ||
    raw < 0 ||
    raw > max
  ) {
    return null;
  }
  return raw;
}

/**
 * Validates an untrusted relay body. Returns null when the payload as a whole
 * is unreasonable (any bad item, a negative or absurd value) — the event is
 * then simply not relayed.
 */
export function sanitizeRelayData(raw: unknown): TrackData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const input = raw as Record<string, unknown>;
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length > RELAY_LIMITS.maxItems) {
    return null;
  }
  const items: TrackItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const item = entry as Record<string, unknown>;
    const id = cleanText(item.id, 64);
    const price = cleanAmount(item.price, RELAY_LIMITS.maxPrice);
    const quantity = cleanAmount(item.quantity, RELAY_LIMITS.maxQuantity);
    if (
      !id ||
      price === null ||
      quantity === null ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }
    items.push({ id, name: cleanText(item.name) ?? id, price, quantity });
  }

  const data: TrackData = { items };
  if (input.value !== undefined) {
    const value = cleanAmount(input.value, RELAY_LIMITS.maxValue);
    if (value === null) {
      return null;
    }
    data.value = value;
  }
  if (input.currency !== undefined && input.currency !== TRACK_CURRENCY) {
    return null;
  }
  data.searchTerm = cleanText(input.searchTerm, 100);
  data.method = cleanText(input.method, 32);
  data.leadType = cleanText(input.leadType, 32);
  return data;
}
