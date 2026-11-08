/**
 * Browser Purchase payload for the order confirmation page (AD-389), built
 * on the server from the order row — never from the cart in the browser.
 *
 * `eventId` is the order number, the same `event_id` the server Conversions
 * API Purchase uses, so Meta keeps one of the two. Customer keys are hashed
 * here (SHA-256) so raw phone/email never enter the dataLayer.
 */
import { sha256 } from "@/lib/analytics/meta-capi";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { categoryNameChain } from "@/lib/catalog/product-notes-labels";
import { getPrisma } from "@/lib/db/prisma";
import type { HashedCustomer, TrackData } from "@/lib/tracking/events";
import {
  normalizeBdPhone,
  normalizeEmailForMatch,
  normalizeFirstName,
} from "@/lib/tracking/match-keys";

export type PurchaseTracking = { eventId: string; data: TrackData };

export function hashCustomerForTracking(input: {
  email: string | null;
  phone: string | null;
  fullName: string | null;
}): HashedCustomer {
  const customer: HashedCustomer = {};
  const email = normalizeEmailForMatch(input.email);
  if (email) {
    customer.em = sha256(email);
  }
  const phone = normalizeBdPhone(input.phone);
  if (phone) {
    customer.ph = sha256(phone);
  }
  const firstName = normalizeFirstName(input.fullName);
  if (firstName) {
    customer.fn = sha256(firstName);
  }
  if (customer.em || customer.ph || customer.fn) {
    customer.country = sha256("bd");
  }
  return customer;
}

/**
 * Null when there is nothing to report yet: no session, not this customer's
 * order, or an online payment the gateway has not confirmed — that order
 * becomes a Purchase only once it is PAID (same rule as the server event).
 */
export async function loadPurchaseTracking(
  rawNumber: string,
): Promise<PurchaseTracking | null> {
  if (process.env.DATA_SOURCE === "mock") {
    return null;
  }
  const number = rawNumber.trim().slice(0, 40);
  if (!number) {
    return null;
  }
  const session = await getCustomerSession();
  if (!session) {
    return null;
  }
  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    where: { number, userId: session.userId },
    select: {
      number: true,
      totalAmount: true,
      shippingAmount: true,
      taxAmount: true,
      couponCode: true,
      paymentStatus: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { provider: true },
      },
      items: {
        orderBy: { id: "asc" },
        select: {
          sku: true,
          productName: true,
          variantName: true,
          unitAmount: true,
          quantity: true,
          product: {
            select: {
              sku: true,
              brand: { select: { name: true } },
              category: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
  if (!order) {
    return null;
  }
  const provider = order.payments[0]?.provider ?? null;
  if (provider !== "cod" && order.paymentStatus !== "PAID") {
    return null;
  }

  const categoryRows = await prisma.category.findMany({
    select: { slug: true, name: true, parent: { select: { slug: true } } },
  });
  const categories = new Map(
    categoryRows.map((row) => [
      row.slug,
      { name: row.name, parentSlug: row.parent?.slug ?? null },
    ]),
  );

  return {
    eventId: order.number,
    data: {
      transactionId: order.number,
      value: order.totalAmount,
      shipping: order.shippingAmount,
      tax: order.taxAmount,
      coupon: order.couponCode,
      items: order.items.map((line) => ({
        id: line.product?.sku ?? line.sku,
        name: line.productName,
        brand: line.product?.brand.name ?? null,
        categories: line.product
          ? categoryNameChain(line.product.category.slug, categories)
          : [],
        variant: line.variantName,
        price: line.unitAmount,
        quantity: line.quantity,
      })),
      customer: hashCustomerForTracking({
        email: order.customerEmail,
        phone: order.customerPhone,
        fullName: order.customerName,
      }),
    },
  };
}
