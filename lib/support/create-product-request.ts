import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";
import {
  parseProductRequestDetails,
  parseProductRequestName,
  PRODUCT_REQUEST_DETAILS_MAX,
  PRODUCT_REQUEST_NAME_MAX,
} from "@/lib/support/product-request";

export const PRODUCT_REQUEST_CUSTOMER_NAME_MAX = 120;
export const PRODUCT_REQUEST_EMAIL_MAX = 160;
export const PRODUCT_REQUEST_PHONE_MAX = 40;

export type CreateProductRequestInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productWanted: string;
  details: string;
  userId?: string | null;
};

export type CreateProductRequestResult =
  | { ok: true; id: string }
  | { ok: false; formError: string; field?: "name" | "email" | "product" };

function parseCustomerName(raw: string): string {
  return raw.trim().slice(0, PRODUCT_REQUEST_CUSTOMER_NAME_MAX);
}

function parseEmail(raw: string): string {
  return raw.trim().slice(0, PRODUCT_REQUEST_EMAIL_MAX).toLowerCase();
}

function parsePhone(raw: string): string | null {
  const value = raw.trim().slice(0, PRODUCT_REQUEST_PHONE_MAX);
  return value || null;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createProductRequestFromForm(
  formData: FormData,
  userId?: string | null,
): CreateProductRequestInput {
  return {
    customerName: parseCustomerName(String(formData.get("customerName") ?? "")),
    customerEmail: parseEmail(String(formData.get("customerEmail") ?? "")),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    productWanted: parseProductRequestName(formData.get("productName")),
    details: parseProductRequestDetails(formData.get("details")),
    userId: userId ?? null,
  };
}

export async function createProductRequest(
  input: CreateProductRequestInput,
): Promise<CreateProductRequestResult> {
  const customerName = parseCustomerName(input.customerName);
  const customerEmail = parseEmail(input.customerEmail);
  const productWanted = parseProductRequestName(input.productWanted);
  const details = parseProductRequestDetails(input.details).slice(
    0,
    PRODUCT_REQUEST_DETAILS_MAX,
  );
  const phone = parsePhone(input.customerPhone);

  if (!customerName) {
    return {
      ok: false,
      formError: "Enter your name.",
      field: "name",
    };
  }
  if (!customerEmail || !looksLikeEmail(customerEmail)) {
    return {
      ok: false,
      formError: "Enter a valid email address.",
      field: "email",
    };
  }
  if (!productWanted) {
    return {
      ok: false,
      formError: `Enter a product name of up to ${PRODUCT_REQUEST_NAME_MAX} characters.`,
      field: "product",
    };
  }

  const row = await getPrisma().complaint.create({
    data: {
      userId: input.userId || null,
      name: customerName,
      email: customerEmail,
      phone,
      subject: `Product request: ${productWanted}`,
      message: details || productWanted,
      productWanted,
      status: "NEW",
      source: "PRODUCT_REQUEST",
    },
    select: { id: true },
  });

  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.PRODUCT_REQUEST,
    title: "New product request",
    body: `${customerName} · ${productWanted}`,
    href: `/admin/product-requests/${row.id}`,
  });

  return { ok: true, id: row.id };
}
