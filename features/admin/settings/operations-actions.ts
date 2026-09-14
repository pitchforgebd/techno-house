"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveInvoiceSettings,
  saveOrderConfigurationSettings,
  saveOrderTrackingSettings,
  savePickupPointSettings,
  saveShippingLabelSettings,
  saveTaxSettings,
  saveThermalPrinterSettings,
  type StoreOperationsActor,
  type StoreOperationsMutationResult,
} from "@/lib/business/operations-config";

/**
 * Same guard order as `business-actions.ts`: same-origin, then permission,
 * then request meta for the audit trail. Returns the guard's own typed
 * failure so the client never sees an internal error.
 */
type GuardResult =
  | { ok: true; actor: StoreOperationsActor }
  | { ok: false; formError: string };

async function guard(): Promise<GuardResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

function revalidate(path: string) {
  revalidatePath(path);
  revalidatePath("/admin/settings");
}

export async function saveOrderConfigurationAction(input: {
  orderCodePrefix: string;
  minimumOrderAmount: string;
  autoConfirmPaidOrders: boolean;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveOrderConfigurationSettings({
    ...input,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate("/admin/settings/orders");
  }
  return result;
}

export async function saveTaxSettingsAction(input: {
  vatRatePercent: string;
  serviceChargeAmount: string;
  taxIncludedInPrice: boolean;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveTaxSettings({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate("/admin/settings/tax");
  }
  return result;
}

export async function savePickupPointsAction(input: {
  pickupEnabled: boolean;
  defaultPickupPoint: string;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await savePickupPointSettings({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate("/admin/settings/pickup-points");
  }
  return result;
}

export async function saveInvoiceSettingsAction(input: {
  invoicePrefix: string;
  invoiceFooter: string;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveInvoiceSettings({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate("/admin/settings/invoice");
  }
  return result;
}

export async function saveOrderTrackingAction(input: {
  trackingUrlTemplate: string;
  notifyOnStatusChange: boolean;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveOrderTrackingSettings({
    ...input,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate("/admin/settings/tracking");
  }
  return result;
}

export async function saveShippingLabelAction(input: {
  labelSize: string;
  labelShowLogo: boolean;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveShippingLabelSettings({
    ...input,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate("/admin/settings/shipping-label");
  }
  return result;
}

export async function saveThermalPrinterAction(input: {
  thermalPrinterEnabled: boolean;
  thermalPaperWidthMm: string;
}): Promise<StoreOperationsMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveThermalPrinterSettings({
    ...input,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate("/admin/settings/thermal-printer");
  }
  return result;
}
