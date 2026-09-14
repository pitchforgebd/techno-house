"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  savePathaoCourier,
  saveSteadfastCourier,
  type CourierMutationResult,
} from "@/lib/shipping/courier-settings";
import {
  listPathaoAreas,
  listPathaoCities,
  listPathaoZones,
  type PathaoLocation,
} from "@/lib/shipping/couriers/pathao";
import {
  sendOrderToPathaoCourier,
  sendOrderToSteadfastCourier,
  type SendToCourierResult,
} from "@/lib/orders/send-to-courier";

function revalidateShipping() {
  revalidatePath("/admin/shipping");
  revalidatePath("/admin/orders");
}

export async function saveSteadfastCourierAction(input: {
  enabled: boolean;
  apiKey: string;
  secretKey: string;
}): Promise<CourierMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("shipping_method.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveSteadfastCourier({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateShipping();
  }
  return result;
}

export async function savePathaoCourierAction(input: {
  enabled: boolean;
  mode: string;
  storeId: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}): Promise<CourierMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("shipping_method.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await savePathaoCourier({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateShipping();
  }
  return result;
}

export async function sendOrderToSteadfastAction(input: {
  orderId: string;
}): Promise<SendToCourierResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const meta = await getRequestMeta();
  const result = await sendOrderToSteadfastCourier({
    orderId: input.orderId,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/orders");
    // Keyed on the order NUMBER, because that is what admin order URLs use.
    // Revalidating the cuid path silently misses, so the order page keeps
    // serving a cached copy without the tracking code that was just saved.
    revalidatePath(`/admin/orders/${result.orderNumber}`);
    revalidatePath(`/admin/orders/${result.orderNumber}/invoice`);
  }
  return result;
}

type LocationResult =
  | { ok: true; locations: PathaoLocation[] }
  | { ok: false; reason: string };

export async function getPathaoCitiesAction(): Promise<LocationResult> {
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const result = await listPathaoCities();
  return result.ok
    ? { ok: true, locations: result.cities }
    : { ok: false, reason: result.reason };
}

export async function getPathaoZonesAction(input: {
  cityId: number;
}): Promise<LocationResult> {
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const result = await listPathaoZones(input.cityId);
  return result.ok
    ? { ok: true, locations: result.zones }
    : { ok: false, reason: result.reason };
}

export async function getPathaoAreasAction(input: {
  zoneId: number;
}): Promise<LocationResult> {
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const result = await listPathaoAreas(input.zoneId);
  return result.ok
    ? { ok: true, locations: result.areas }
    : { ok: false, reason: result.reason };
}

export async function sendOrderToPathaoAction(input: {
  orderId: string;
  cityId: number;
  zoneId: number;
  areaId: number;
}): Promise<SendToCourierResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const meta = await getRequestMeta();
  const result = await sendOrderToPathaoCourier({
    orderId: input.orderId,
    cityId: input.cityId,
    zoneId: input.zoneId,
    areaId: input.areaId,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/orders");
    // Keyed on the order NUMBER, because that is what admin order URLs use.
    // Revalidating the cuid path silently misses, so the order page keeps
    // serving a cached copy without the tracking code that was just saved.
    revalidatePath(`/admin/orders/${result.orderNumber}`);
    revalidatePath(`/admin/orders/${result.orderNumber}/invoice`);
  }
  return result;
}
