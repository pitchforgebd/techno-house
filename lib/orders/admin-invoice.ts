/**
 * Admin printable invoice data from PostgreSQL.
 */
import { getAdminBusinessSettings } from "@/lib/business/config";
import { paymentMethodLabel } from "@/lib/cart/payment";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export type AdminInvoiceLine = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  colorName: string | null;
  colorHex: string | null;
};

export type AdminInvoice = {
  id: string;
  number: string;
  placedAt: string;
  placedAtIso: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingMethod: string;
  notes: string | null;
  trackingCode: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  lines: AdminInvoiceLine[];
  store: {
    storeName: string;
    legalName: string;
    supportEmail: string;
    phone: string;
    address: string;
    city: string;
    taxId: string;
    /** Public path from SiteSettings — same logo as the website. */
    logoSrc: string | null;
  };
};

function statusLabel(status: string): string {
  switch (status) {
    case "PROCESSING":
      return "Processing";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function paymentLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "FAILED":
    case "CANCELLED":
      return "Failed";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "Refunded";
    default:
      return "Unpaid";
  }
}

export async function getAdminOrderInvoice(
  id: string,
): Promise<AdminInvoice | null> {
  if (!usesDatabase()) {
    return null;
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  const row = await getPrisma().order.findFirst({
    where: { OR: [{ id: trimmed }, { number: trimmed }] },
    select: {
      id: true,
      number: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingAddress: true,
      shippingMethodLabel: true,
      notes: true,
      trackingCode: true,
      subtotalAmount: true,
      discountAmount: true,
      shippingAmount: true,
      taxAmount: true,
      serviceChargeAmount: true,
      totalAmount: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unitAmount: true,
          totalAmount: true,
          colorName: true,
          colorHex: true,
        },
      },
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { method: true, provider: true },
      },
    },
  });
  if (!row) {
    return null;
  }

  const business = await getAdminBusinessSettings();
  const methodId = row.payments[0]?.method ?? row.payments[0]?.provider ?? null;
  // Invoice is on white paper — prefer light-bg logo, then dark-chrome logo.
  const logoSrc =
    business.logoSrc.trim() || null;

  return {
    id: row.id,
    number: row.number,
    placedAt: row.placedAt.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    placedAtIso: row.placedAt.toISOString(),
    status: statusLabel(row.status),
    paymentStatus: paymentLabel(row.paymentStatus),
    paymentMethod: paymentMethodLabel(methodId),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    shippingAddress: row.shippingAddress,
    shippingMethod: row.shippingMethodLabel ?? "—",
    notes: row.notes,
    trackingCode: row.trackingCode,
    subtotalAmount: row.subtotalAmount,
    discountAmount: row.discountAmount,
    shippingAmount: row.shippingAmount,
    taxAmount: row.taxAmount,
    serviceChargeAmount: row.serviceChargeAmount,
    totalAmount: row.totalAmount,
    lines: row.items,
    store: {
      storeName: business.storeName || "Techno House",
      legalName: business.legalName || business.storeName || "Techno House",
      supportEmail: business.supportEmail || "",
      phone: business.phone || "",
      address: business.address || "",
      city: business.city || "Dhaka",
      taxId: business.taxId || "",
      logoSrc,
    },
  };
}
