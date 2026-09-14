/**
 * Per-order invoice QR payload + PNG data URL.
 *
 * Encodes a scannable plain-text summary (shop, order, customer, line items,
 * totals). Kept under QR practical limits so phone cameras read it reliably.
 */
import QRCode from "qrcode";
import { formatMoney } from "@/lib/format/currency";
import type { AdminInvoice } from "@/lib/orders/admin-invoice";
import type { AdminOrder } from "@/lib/admin/orders-mock";

const QR_MAX_CHARS = 1200;
const MAX_LINES = 12;

export type InvoiceQrSource = {
  number: string;
  placedAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingMethod: string;
  trackingCode?: string | null;
  notes?: string | null;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  lines: {
    productName: string;
    sku: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    colorName?: string | null;
  }[];
  store: {
    storeName: string;
    legalName?: string;
    supportEmail?: string;
    phone?: string;
    address?: string;
    city?: string;
    taxId?: string;
  };
};

export function invoiceQrSourceFromInvoice(
  invoice: AdminInvoice,
): InvoiceQrSource {
  return {
    number: invoice.number,
    placedAt: invoice.placedAt,
    status: invoice.status,
    paymentStatus: invoice.paymentStatus,
    paymentMethod: invoice.paymentMethod,
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    shippingAddress: invoice.shippingAddress,
    shippingMethod: invoice.shippingMethod,
    trackingCode: invoice.trackingCode,
    notes: invoice.notes,
    subtotalAmount: invoice.subtotalAmount,
    discountAmount: invoice.discountAmount,
    shippingAmount: invoice.shippingAmount,
    taxAmount: invoice.taxAmount,
    totalAmount: invoice.totalAmount,
    lines: invoice.lines,
    store: invoice.store,
  };
}

export function invoiceQrSourceFromOrder(order: AdminOrder): InvoiceQrSource {
  const paymentLabel =
    order.paymentStatus === "unpaid"
      ? "Unpaid"
      : order.paymentStatus.charAt(0).toUpperCase() +
        order.paymentStatus.slice(1);
  const fulfillment =
    order.fulfillmentStatus.charAt(0).toUpperCase() +
    order.fulfillmentStatus.slice(1);

  return {
    number: order.number,
    placedAt: order.placedAt,
    status: fulfillment,
    paymentStatus: paymentLabel,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    trackingCode: order.trackingCode,
    notes: order.notes,
    subtotalAmount: order.lines.reduce(
      (sum, line) => sum + line.unitPrice.amount * line.quantity,
      0,
    ),
    discountAmount: 0,
    shippingAmount: 0,
    taxAmount: 0,
    totalAmount: order.total.amount,
    lines: order.lines.map((line) => ({
      productName: line.productName,
      sku: line.sku,
      quantity: line.quantity,
      unitAmount: line.unitPrice.amount,
      totalAmount: line.unitPrice.amount * line.quantity,
      colorName: line.colorName,
    })),
    store: {
      storeName: "Techno House",
      city: "Dhaka",
    },
  };
}

function money(amount: number): string {
  return formatMoney({ amount });
}

export function buildInvoiceQrPayload(source: InvoiceQrSource): string {
  const shop = source.store.storeName || "Techno House";
  const shopLines = [
    shop,
    source.store.legalName && source.store.legalName !== shop
      ? source.store.legalName
      : null,
    [source.store.address, source.store.city].filter(Boolean).join(", ") || null,
    source.store.phone ? `Tel: ${source.store.phone}` : null,
    source.store.supportEmail ? `Email: ${source.store.supportEmail}` : null,
    source.store.taxId ? `Tax ID: ${source.store.taxId}` : null,
  ].filter(Boolean);

  const itemLines = source.lines.slice(0, MAX_LINES).map((line, index) => {
    const color = line.colorName ? ` [${line.colorName}]` : "";
    return `${index + 1}. ${line.productName}${color} ×${line.quantity} · ${money(line.totalAmount)} (SKU ${line.sku})`;
  });
  if (source.lines.length > MAX_LINES) {
    itemLines.push(`… +${source.lines.length - MAX_LINES} more item(s)`);
  }

  const totals = [
    `Subtotal: ${money(source.subtotalAmount)}`,
    source.discountAmount > 0
      ? `Discount: −${money(source.discountAmount)}`
      : null,
    `Shipping: ${money(source.shippingAmount)}`,
    source.taxAmount > 0 ? `Tax: ${money(source.taxAmount)}` : null,
    `TOTAL: ${money(source.totalAmount)}`,
  ].filter(Boolean);

  const blocks = [
    `${shop.toUpperCase()} — OFFICIAL INVOICE`,
    shopLines.join("\n"),
    [
      `Order: ${source.number}`,
      `Date: ${source.placedAt}`,
      `Status: ${source.status}`,
      `Payment: ${source.paymentStatus} · ${source.paymentMethod}`,
      `Delivery: ${source.shippingMethod}`,
      source.trackingCode ? `Tracking: ${source.trackingCode}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "CUSTOMER",
      source.customerName,
      source.customerPhone,
      source.customerEmail,
      source.shippingAddress,
    ].join("\n"),
    ["PRODUCTS", ...itemLines].join("\n"),
    totals.join("\n"),
    source.notes ? `Note: ${source.notes}` : null,
    `Scan ID: ${source.number}`,
  ].filter(Boolean);

  let payload = blocks.join("\n---\n");
  if (payload.length > QR_MAX_CHARS) {
    payload = `${payload.slice(0, QR_MAX_CHARS - 1)}…`;
  }
  return payload;
}

export async function generateInvoiceQrDataUrl(
  source: InvoiceQrSource,
  options?: { size?: number },
): Promise<string> {
  const payload = buildInvoiceQrPayload(source);
  const size = options?.size ?? 220;
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}
