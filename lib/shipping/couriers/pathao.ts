/**
 * Pathao Courier Merchant API.
 *
 * LOWER CONFIDENCE than Steadfast: Pathao's official docs sit behind a
 * merchant-login portal that couldn't be reached during development. Base
 * URLs, the OAuth token endpoint, and the location/order endpoint paths
 * below are best-effort from public field-name references (independently
 * corroborated: store_id, recipient_name/phone/address/city/zone/area,
 * delivery_type, item_type, item_quantity, item_weight,
 * amount_to_collect) plus general knowledge of Pathao's "aladdin" API
 * naming. Confirm the exact base URL and paths against your own Pathao
 * merchant dashboard / API docs before relying on this live.
 */
import {
  loadDecryptedPathaoFromDb,
  type DecryptedPathao,
} from "@/lib/shipping/courier-settings";
import { courierGet, courierPost } from "@/lib/shipping/courier-http";
import type { SendCourierResult } from "@/lib/shipping/couriers/steadfast";

function pathaoBaseUrl(live: boolean): string {
  return live
    ? "https://api-hermes.pathao.com"
    : "https://courier-api-sandbox.pathao.com";
}

type TokenResult = { ok: true; token: string } | { ok: false; reason: string };

let cachedToken: { value: string; expiresAt: number; live: boolean } | null = null;

async function getPathaoAccessToken(
  config: DecryptedPathao,
): Promise<TokenResult> {
  if (
    cachedToken &&
    cachedToken.live === config.live &&
    cachedToken.expiresAt > Date.now() + 30_000
  ) {
    return { ok: true, token: cachedToken.value };
  }

  const posted = await courierPost({
    url: `${pathaoBaseUrl(config.live)}/aladdin/api/v1/issue-access-token`,
    contentType: "application/json",
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      grant_type: "password",
    }),
  });
  if (!posted.ok) {
    return { ok: false, reason: posted.reason };
  }
  let parsed: { access_token?: string; expires_in?: number; message?: string };
  try {
    parsed = JSON.parse(posted.text);
  } catch {
    return { ok: false, reason: "Pathao returned an unreadable token response." };
  }
  const token = parsed.access_token?.trim() ?? "";
  if (posted.status >= 400 || !token) {
    return {
      ok: false,
      reason: parsed.message || "Pathao did not grant an access token.",
    };
  }
  cachedToken = {
    value: token,
    expiresAt: Date.now() + (parsed.expires_in ?? 3600) * 1000,
    live: config.live,
  };
  return { ok: true, token };
}

export type PathaoLocation = { id: number; name: string };

async function authedGet(
  path: string,
  token: string,
  live: boolean,
): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  const fetched = await courierGet(`${pathaoBaseUrl(live)}${path}`, {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  });
  if (!fetched.ok) {
    return fetched;
  }
  try {
    const parsed = JSON.parse(fetched.text) as { data?: unknown; message?: string };
    if (fetched.status >= 400) {
      return { ok: false, reason: parsed.message || "Pathao request failed." };
    }
    return { ok: true, data: parsed.data ?? parsed };
  } catch {
    return { ok: false, reason: "Pathao returned an unreadable response." };
  }
}

function toLocationList(data: unknown, idKey: string, nameKey: string): PathaoLocation[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : [];
  return list
    .map((row) => {
      const r = row as Record<string, unknown>;
      const id = Number(r[idKey]);
      const name = String(r[nameKey] ?? "");
      return Number.isFinite(id) && name ? { id, name } : null;
    })
    .filter((row): row is PathaoLocation => row !== null);
}

async function withToken(): Promise<
  { ok: true; token: string; config: DecryptedPathao } | { ok: false; reason: string }
> {
  const config = await loadDecryptedPathaoFromDb();
  if (!config) {
    return { ok: false, reason: "Pathao is not configured or enabled." };
  }
  const granted = await getPathaoAccessToken(config);
  if (!granted.ok) {
    return granted;
  }
  return { ok: true, token: granted.token, config };
}

export async function listPathaoCities(): Promise<
  { ok: true; cities: PathaoLocation[] } | { ok: false; reason: string }
> {
  const auth = await withToken();
  if (!auth.ok) {
    return auth;
  }
  const fetched = await authedGet(
    "/aladdin/api/v1/city-list",
    auth.token,
    auth.config.live,
  );
  if (!fetched.ok) {
    return fetched;
  }
  return { ok: true, cities: toLocationList(fetched.data, "city_id", "city_name") };
}

export async function listPathaoZones(
  cityId: number,
): Promise<{ ok: true; zones: PathaoLocation[] } | { ok: false; reason: string }> {
  const auth = await withToken();
  if (!auth.ok) {
    return auth;
  }
  const fetched = await authedGet(
    `/aladdin/api/v1/cities/${cityId}/zone-list`,
    auth.token,
    auth.config.live,
  );
  if (!fetched.ok) {
    return fetched;
  }
  return { ok: true, zones: toLocationList(fetched.data, "zone_id", "zone_name") };
}

export async function listPathaoAreas(
  zoneId: number,
): Promise<{ ok: true; areas: PathaoLocation[] } | { ok: false; reason: string }> {
  const auth = await withToken();
  if (!auth.ok) {
    return auth;
  }
  const fetched = await authedGet(
    `/aladdin/api/v1/zones/${zoneId}/area-list`,
    auth.token,
    auth.config.live,
  );
  if (!fetched.ok) {
    return fetched;
  }
  return { ok: true, areas: toLocationList(fetched.data, "area_id", "area_name") };
}

export async function sendOrderToPathao(input: {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  cityId: number;
  zoneId: number;
  areaId: number;
  codAmount: number;
  note?: string;
}): Promise<SendCourierResult> {
  const auth = await withToken();
  if (!auth.ok) {
    return { ok: false, reason: auth.reason };
  }

  const posted = await courierPost({
    url: `${pathaoBaseUrl(auth.config.live)}/aladdin/api/v1/orders`,
    contentType: "application/json",
    headers: { Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({
      store_id: Number(auth.config.storeId),
      merchant_order_id: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: input.cityId,
      recipient_zone: input.zoneId,
      recipient_area: input.areaId,
      delivery_type: 48,
      item_type: 2,
      special_instruction: input.note?.slice(0, 250) ?? "",
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: input.codAmount,
      item_description: "Order from Techno House",
    }),
  });
  if (!posted.ok) {
    return { ok: false, reason: posted.reason };
  }

  let parsed: {
    data?: { consignment_id?: number | string; order_status?: string };
    message?: string;
  };
  try {
    parsed = JSON.parse(posted.text);
  } catch {
    return { ok: false, reason: "Pathao returned an unreadable response." };
  }

  const consignmentId = String(parsed.data?.consignment_id ?? "").trim();
  if (posted.status >= 400 || !consignmentId) {
    return {
      ok: false,
      reason: parsed.message || "Pathao did not accept this order.",
    };
  }

  return {
    ok: true,
    consignmentId,
    trackingCode: consignmentId,
    status: parsed.data?.order_status || "pending",
  };
}
