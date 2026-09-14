/**
 * Store operations settings service (Phase 1).
 *
 * Backs the seven "Setup & Configurations" sub-pages that previously showed a
 * mock save toast and never read or wrote anything. One singleton row
 * (`StoreOperationsSettings`), one save function per page so each page
 * validates only its own slice and reports its own errors.
 *
 * `DATA_SOURCE=mock` refuses writes, matching `lib/business/config.ts`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_STORE_OPERATIONS_SETTINGS,
  INVOICE_FOOTER_MAX,
  INVOICE_PREFIX_MAX,
  MIN_ORDER_AMOUNT_MAX,
  ORDER_PREFIX_MAX,
  SERVICE_CHARGE_MAX,
  TRACKING_URL_MAX,
  normalizeLabelSize,
  normalizeOptionalMultiline,
  normalizePickupPoint,
  normalizeRequiredCode,
  normalizeThermalPaperWidth,
  normalizeTrackingUrlTemplate,
  normalizeWholeNumber,
  percentToBasisPoints,
  type AdminStoreOperationsSettings,
} from "@/lib/business/operations-fields";

export type { AdminStoreOperationsSettings } from "@/lib/business/operations-fields";

export const STORE_OPERATIONS_DB_REQUIRED =
  "Store settings need the database. Turn off DATA_SOURCE=mock to save.";

export type StoreOperationsMutationResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

export type StoreOperationsActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

/** Which sub-page a save came from — recorded in the audit log. */
export type StoreOperationsSection =
  | "orders"
  | "tax"
  | "pickup-points"
  | "invoice"
  | "tracking"
  | "shipping-label"
  | "thermal-printer";

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): StoreOperationsMutationResult {
  return { ok: false, formError };
}

const SETTINGS_SELECT = {
  orderCodePrefix: true,
  minimumOrderAmount: true,
  autoConfirmPaidOrders: true,
  vatRateBasisPoints: true,
  serviceChargeAmount: true,
  taxIncludedInPrice: true,
  pickupEnabled: true,
  defaultPickupPoint: true,
  invoicePrefix: true,
  invoiceFooter: true,
  trackingUrlTemplate: true,
  notifyOnStatusChange: true,
  labelSize: true,
  labelShowLogo: true,
  thermalPrinterEnabled: true,
  thermalPaperWidthMm: true,
} as const;

/**
 * Real current values. A missing row returns the same defaults Prisma would
 * create, so the form never shows values that differ from what a first save
 * would persist.
 */
export async function getStoreOperationsSettings(): Promise<AdminStoreOperationsSettings> {
  if (!usesDatabase()) {
    return DEFAULT_STORE_OPERATIONS_SETTINGS;
  }
  const row = await getPrisma().storeOperationsSettings.findUnique({
    where: { id: "singleton" },
    select: SETTINGS_SELECT,
  });
  return row ?? DEFAULT_STORE_OPERATIONS_SETTINGS;
}

/**
 * The four operations settings the storefront is allowed to see.
 *
 * Deliberately narrow rather than handing `getStoreOperationsSettings()` to a
 * client component: that object also carries the invoice prefix, tracking URL
 * template, printer configuration and pickup defaults, none of which a browser
 * needs. Every field below is one the customer is entitled to know before
 * paying — it is the money they will be charged.
 *
 * These exist so the checkout summary can derive its total with the SAME pure
 * functions the server uses to charge it (`computeOrderTax`,
 * `computeServiceCharge`, `belowMinimumOrder`). Displaying a total computed a
 * second, independent way is how a storefront ends up quoting one figure and
 * charging another.
 */
export type PublicOrderCharges = {
  vatRateBasisPoints: number;
  taxIncludedInPrice: boolean;
  serviceChargeAmount: number;
  minimumOrderAmount: number;
};

export async function getPublicOrderCharges(): Promise<PublicOrderCharges> {
  const settings = await getStoreOperationsSettings();
  return {
    vatRateBasisPoints: settings.vatRateBasisPoints,
    taxIncludedInPrice: settings.taxIncludedInPrice,
    serviceChargeAmount: settings.serviceChargeAmount,
    minimumOrderAmount: settings.minimumOrderAmount,
  };
}

/**
 * Upserts one slice. `create` merges the slice over the defaults so the first
 * save on a fresh database writes a complete, valid row.
 */
async function persist(
  section: StoreOperationsSection,
  patch: Partial<AdminStoreOperationsSettings>,
  actor: StoreOperationsActor | undefined,
  auditMetadata: Record<string, unknown>,
): Promise<StoreOperationsMutationResult> {
  const row = await getPrisma().storeOperationsSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...DEFAULT_STORE_OPERATIONS_SETTINGS, ...patch },
    update: patch,
    select: { id: true },
  });

  if (actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: actor.staffId,
      actorLabel: actor.email,
      action: AUDIT_ACTIONS.STORE_OPERATIONS_SETTINGS_UPDATE,
      entityType: "StoreOperationsSettings",
      entityId: row.id,
      ip: actor.ip,
      metadata: { section, ...auditMetadata },
    });
  }

  return { ok: true, id: row.id };
}

export async function saveOrderConfigurationSettings(input: {
  orderCodePrefix: string;
  minimumOrderAmount: string;
  autoConfirmPaidOrders: boolean;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const orderCodePrefix = normalizeRequiredCode(
    input.orderCodePrefix,
    ORDER_PREFIX_MAX,
  );
  if (orderCodePrefix == null) {
    return fail(
      `Order code prefix is required, must be ${ORDER_PREFIX_MAX} characters or fewer, and may only use letters, numbers, dot, dash or underscore.`,
    );
  }
  const minimumOrderAmount = normalizeWholeNumber(
    input.minimumOrderAmount,
    MIN_ORDER_AMOUNT_MAX,
  );
  if (minimumOrderAmount == null) {
    return fail(
      `Minimum order amount must be a whole number between 0 and ${MIN_ORDER_AMOUNT_MAX}.`,
    );
  }

  return persist(
    "orders",
    {
      orderCodePrefix,
      minimumOrderAmount,
      autoConfirmPaidOrders: Boolean(input.autoConfirmPaidOrders),
    },
    input.actor,
    { orderCodePrefix, minimumOrderAmount },
  );
}

export async function saveTaxSettings(input: {
  vatRatePercent: string;
  serviceChargeAmount: string;
  taxIncludedInPrice: boolean;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const vatRateBasisPoints = percentToBasisPoints(input.vatRatePercent);
  if (vatRateBasisPoints == null) {
    return fail("VAT rate must be a percentage between 0 and 100.");
  }
  const serviceChargeAmount = normalizeWholeNumber(
    input.serviceChargeAmount,
    SERVICE_CHARGE_MAX,
  );
  if (serviceChargeAmount == null) {
    return fail(
      `Service charge must be a whole number between 0 and ${SERVICE_CHARGE_MAX}.`,
    );
  }

  return persist(
    "tax",
    {
      vatRateBasisPoints,
      serviceChargeAmount,
      taxIncludedInPrice: Boolean(input.taxIncludedInPrice),
    },
    input.actor,
    { vatRateBasisPoints, serviceChargeAmount },
  );
}

export async function savePickupPointSettings(input: {
  pickupEnabled: boolean;
  defaultPickupPoint: string;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const defaultPickupPoint = normalizePickupPoint(input.defaultPickupPoint);
  if (defaultPickupPoint == null) {
    return fail("Choose a supported pickup point.");
  }

  return persist(
    "pickup-points",
    { pickupEnabled: Boolean(input.pickupEnabled), defaultPickupPoint },
    input.actor,
    { pickupEnabled: Boolean(input.pickupEnabled), defaultPickupPoint },
  );
}

export async function saveInvoiceSettings(input: {
  invoicePrefix: string;
  invoiceFooter: string;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const invoicePrefix = normalizeRequiredCode(
    input.invoicePrefix,
    INVOICE_PREFIX_MAX,
  );
  if (invoicePrefix == null) {
    return fail(
      `Invoice prefix is required, must be ${INVOICE_PREFIX_MAX} characters or fewer, and may only use letters, numbers, dot, dash or underscore.`,
    );
  }
  const invoiceFooter = normalizeOptionalMultiline(
    input.invoiceFooter,
    INVOICE_FOOTER_MAX,
  );
  if (invoiceFooter == null) {
    return fail(`Invoice footer must be ${INVOICE_FOOTER_MAX} characters or fewer.`);
  }

  return persist(
    "invoice",
    { invoicePrefix, invoiceFooter },
    input.actor,
    { invoicePrefix, footerLength: invoiceFooter.length },
  );
}

export async function saveOrderTrackingSettings(input: {
  trackingUrlTemplate: string;
  notifyOnStatusChange: boolean;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const trackingUrlTemplate = normalizeTrackingUrlTemplate(
    input.trackingUrlTemplate,
  );
  if (trackingUrlTemplate == null) {
    return fail(
      `Tracking URL must be a valid http(s) URL of ${TRACKING_URL_MAX} characters or fewer, or left blank.`,
    );
  }

  return persist(
    "tracking",
    {
      trackingUrlTemplate,
      notifyOnStatusChange: Boolean(input.notifyOnStatusChange),
    },
    input.actor,
    {
      hasTrackingUrl: Boolean(trackingUrlTemplate),
      notifyOnStatusChange: Boolean(input.notifyOnStatusChange),
    },
  );
}

export async function saveShippingLabelSettings(input: {
  labelSize: string;
  labelShowLogo: boolean;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const labelSize = normalizeLabelSize(input.labelSize);
  if (labelSize == null) {
    return fail("Choose a supported label size.");
  }

  return persist(
    "shipping-label",
    { labelSize, labelShowLogo: Boolean(input.labelShowLogo) },
    input.actor,
    { labelSize, labelShowLogo: Boolean(input.labelShowLogo) },
  );
}

export async function saveThermalPrinterSettings(input: {
  thermalPrinterEnabled: boolean;
  thermalPaperWidthMm: string;
  actor?: StoreOperationsActor;
}): Promise<StoreOperationsMutationResult> {
  if (!usesDatabase()) {
    return fail(STORE_OPERATIONS_DB_REQUIRED);
  }
  const thermalPaperWidthMm = normalizeThermalPaperWidth(
    input.thermalPaperWidthMm,
  );
  if (thermalPaperWidthMm == null) {
    return fail("Choose a supported paper width.");
  }

  return persist(
    "thermal-printer",
    {
      thermalPrinterEnabled: Boolean(input.thermalPrinterEnabled),
      thermalPaperWidthMm,
    },
    input.actor,
    {
      thermalPrinterEnabled: Boolean(input.thermalPrinterEnabled),
      thermalPaperWidthMm,
    },
  );
}
