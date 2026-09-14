/**
 * Place a customer order from the persisted cart (P13-T02).
 *
 * The client is never authoritative for price, discount, shipping, tax,
 * total, currency, or payment status. Nothing is marked paid here.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  ACCOUNT_EMAIL_MAX,
  ACCOUNT_NAME_MAX,
  ACCOUNT_PHONE_MAX,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
} from "@/lib/account/validation";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/lib/cart/cart";
import { effectiveStorefrontPricing } from "@/lib/catalog/discount-pricing";
import {
  validateCheckoutContact,
  type CheckoutContact,
} from "@/lib/cart/checkout";
import { applyCouponToSubtotal } from "@/lib/cart/coupons";
import {
  checkCouponPerUserLimit,
  findRedeemableCoupon,
  incrementCouponUsage,
  recordCouponRedemption,
} from "@/lib/marketing/coupons";
import { publicAreaId } from "@/lib/shipping/locations";
import { resolvePersistedShippingRate } from "@/lib/shipping/resolve";
import {
  paymentCreateData,
  preparePaymentStart,
  startHostedCheckoutForOrder,
} from "@/lib/payments/service";
import { planPaymentStart } from "@/lib/payments/adapters";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";
import { toDbStockStatus } from "@/lib/data/prisma/mappers";
import { resolveB2BPricing } from "@/lib/b2b/pricing";
import { getPrisma } from "@/lib/db/prisma";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";
import { computeOrderTax } from "@/lib/business/tax";
import { computeServiceCharge } from "@/lib/business/service-charge";
import { belowMinimumOrder } from "@/lib/business/minimum-order";
import type { BuilderSlot as DbBuilderSlot } from "@/lib/generated/prisma/enums";
import { nextOrderNumber } from "@/lib/orders/order-number";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { toCustomerOrderView } from "@/lib/orders/customer-orders";
import { notifyStaffOfNewOrder } from "@/lib/orders/staff-order-alerts";
import { sendMetaCapiPurchaseSafe } from "@/lib/analytics/meta-capi";
import { getRequestMeta } from "@/lib/auth/request-meta";

export const ORDER_DB_REQUIRED =
  "Orders need the database. Turn off DATA_SOURCE=mock to place a real order.";

export type PlaceOrderInput = CheckoutContact & {
  paymentMethodId: string | null;
};

export type PlaceOrderResult =
  | {
      ok: true;
      order: CustomerOrderView;
      redirectUrl: string | null;
      /** Set when the order was created but the hosted gateway did not open. */
      paymentStartError?: string;
    }
  | { ok: false; reason: string };

const ADDRESS_MAX = 240;
const NOTES_MAX = 400;

export function usesOrderDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(reason: string): PlaceOrderResult {
  return { ok: false, reason };
}

function normalizeContact(input: CheckoutContact): CheckoutContact {
  return {
    fullName: normalizeFullName(input.fullName).slice(0, ACCOUNT_NAME_MAX),
    phone: normalizePhone(input.phone).slice(0, ACCOUNT_PHONE_MAX),
    email: normalizeEmail(input.email).slice(0, ACCOUNT_EMAIL_MAX),
    addressLine: input.addressLine.trim().slice(0, ADDRESS_MAX),
    notes: input.notes.trim().slice(0, NOTES_MAX),
    billingAddress: input.billingAddress.trim().slice(0, ADDRESS_MAX),
  };
}

export async function placeCustomerOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  if (!usesOrderDatabase()) {
    return fail(ORDER_DB_REQUIRED);
  }

  const session = await getCustomerSession();
  if (!session) {
    return fail("Sign in to place an order.");
  }

  return placeCustomerOrderForUser(session.userId, input);
}

export async function placeCustomerOrderForUser(
  userId: string,
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const contact = normalizeContact(input);
  const contactErrors = validateCheckoutContact(contact);
  if (Object.keys(contactErrors).length > 0) {
    return fail(
      contactErrors.fullName ??
        contactErrors.phone ??
        contactErrors.email ??
        contactErrors.addressLine ??
        "Check your contact details.",
    );
  }

  const paymentPlan = planPaymentStart(input.paymentMethodId);
  if (!paymentPlan) {
    return fail("Select a payment method.");
  }

  const prisma = getPrisma();
  const cart = await prisma.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!cart) {
    return fail("Your cart is empty.");
  }

  // Read BEFORE the transaction opens, deliberately. `getStoreOperationsSettings`
  // uses the pooled global client, so calling it from inside the transaction
  // would ask the `max: 5` pool for a second connection while holding the
  // first — the shape that deadlocked the wallet path (AD-321). These settings
  // are a rarely-changing singleton, so reading them a moment early costs
  // nothing.
  const operations = await getStoreOperationsSettings();

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;

      const locked = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          shippingMethod: { select: { id: true, code: true, name: true } },
          shippingArea: {
            select: {
              id: true,
              name: true,
              zone: { select: { code: true } },
            },
          },
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              color: { select: { name: true, hex: true } },
              product: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  sku: true,
                  isActive: true,
                  priceAmount: true,
                  currency: true,
                  compareAtAmount: true,
                  discountStartsAt: true,
                  discountEndsAt: true,
                  isSale: true,
                  weightGrams: true,
                  stock: {
                    select: {
                      id: true,
                      quantity: true,
                      reserved: true,
                      lowStockThreshold: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!locked || locked.items.length === 0) {
        throw new OrderPlaceError("Your cart is empty.");
      }
      if (locked.items.length > MAX_CART_LINES) {
        throw new OrderPlaceError("The cart is full.");
      }
      if (!locked.shippingMethod) {
        throw new OrderPlaceError("Select a shipping method.");
      }

      const areaId = locked.shippingArea
        ? publicAreaId(locked.shippingArea.zone.code, locked.shippingArea.name)
        : null;
      const totalWeightGrams = locked.items.reduce(
        (sum, item) => sum + item.product.weightGrams * item.quantity,
        0,
      );
      const shipping = await resolvePersistedShippingRate(
        locked.shippingMethod.code,
        areaId,
        totalWeightGrams,
      );
      if (!shipping.ok) {
        throw new OrderPlaceError(
          "Select a shipping method (and area when required).",
        );
      }

      // Sorted, and de-duplicated, so every order takes ProductStock locks in
      // the same order (DSA-12). Locking in cart order meant two concurrent
      // orders containing the same two products in opposite positions could
      // each hold the lock the other wanted — a deadlock Postgres resolves by
      // aborting one checkout. De-duplication also matters now that several
      // cart lines can share one stock row (see DSA-01).
      const stockIds = [
        ...new Set(
          locked.items
            .map((item) => item.product.stock?.id)
            .filter((id): id is string => Boolean(id)),
        ),
      ].sort();
      for (const stockId of stockIds) {
        await tx.$queryRaw`SELECT id FROM "ProductStock" WHERE id = ${stockId} FOR UPDATE`;
      }

      const freshStock = await tx.productStock.findMany({
        where: { id: { in: stockIds } },
        select: {
          id: true,
          quantity: true,
          reserved: true,
          lowStockThreshold: true,
        },
      });
      const stockById = new Map(freshStock.map((row) => [row.id, row]));

      // Wholesale pricing is resolved here, inside the same transaction that
      // prices and reserves the order — never from anything the browser sent.
      // An unverified (PENDING/SUSPENDED) account gets retail, exactly like
      // the product page shows it.
      const b2bAccount = await tx.b2BAccount.findUnique({
        where: { userId },
        select: { status: true, discountPercent: true },
      });
      const b2bActive = b2bAccount?.status === "ACTIVE";
      const b2bTermsByProduct = new Map<
        string,
        { priceAmount: number; minQuantity: number }
      >();
      if (b2bActive) {
        const rows = await tx.b2BProductPrice.findMany({
          where: {
            isActive: true,
            productId: {
              in: locked.items
                .map((item) => item.product?.id)
                .filter((id): id is string => Boolean(id)),
            },
          },
          select: { productId: true, priceAmount: true, minQuantity: true },
        });
        for (const row of rows) {
          b2bTermsByProduct.set(row.productId, {
            priceAmount: row.priceAmount,
            minQuantity: row.minQuantity,
          });
        }
      }

      const lines: {
        productId: string;
        slug: string;
        name: string;
        sku: string;
        quantity: number;
        unitAmount: number;
        totalAmount: number;
        stockId: string;
        quantityOnHand: number;
        reserved: number;
        threshold: number;
        colorName: string | null;
        colorHex: string | null;
        buildBatchId: string | null;
        builderSlot: DbBuilderSlot | null;
      }[] = [];

      /**
       * Units claimed per `ProductStock` row by the lines processed so far.
       * Several cart lines can share one stock row (colour variants), so both
       * the availability check and the reservation write have to work per
       * stock row, not per line.
       */
      const claimedByStock = new Map<string, number>();

      for (const item of locked.items) {
        const product = item.product;
        if (!product.isActive) {
          throw new OrderPlaceError(`${product.name} is no longer available.`);
        }
        if (product.currency !== "BDT") {
          throw new OrderPlaceError("Unsupported currency on a cart item.");
        }
        const hasColors =
          (await tx.productColor.count({
            where: { productId: product.id },
          })) > 0;
        if (hasColors && !item.color) {
          throw new OrderPlaceError(
            `Choose a colour for ${product.name} before placing the order.`,
          );
        }
        const quantity = item.quantity;
        if (
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          quantity > MAX_LINE_QTY
        ) {
          throw new OrderPlaceError("A cart quantity is not valid.");
        }
        const stockRow = product.stock;
        if (!stockRow) {
          throw new OrderPlaceError(
            `${product.name} is not available to order.`,
          );
        }
        const stock = stockById.get(stockRow.id) ?? stockRow;
        // Availability has to account for what earlier lines in THIS order
        // already claimed. `ProductStock.productId` is unique — one stock row
        // per product — while `CartItem` is unique on
        // (cartId, productId, variantId, colorId), so the same product in two
        // colours is two cart lines drawing on one stock row. Comparing each
        // line against the untouched snapshot let both lines spend the full
        // available quantity and oversold the product (DSA-01).
        const alreadyClaimed = claimedByStock.get(stock.id) ?? 0;
        const available = Math.max(
          0,
          stock.quantity - stock.reserved - alreadyClaimed,
        );
        if (available < quantity) {
          throw new OrderPlaceError(
            `${product.name} does not have enough stock.`,
          );
        }
        claimedByStock.set(stock.id, alreadyClaimed + quantity);
        if (product.priceAmount < 0) {
          throw new OrderPlaceError("A product price is not valid.");
        }
        const priced = effectiveStorefrontPricing({
          priceAmount: product.priceAmount,
          compareAtAmount: product.compareAtAmount,
          discountStartsAt: product.discountStartsAt,
          discountEndsAt: product.discountEndsAt,
          isSale: product.isSale,
        });

        let unitAmount = priced.priceAmount;
        if (b2bActive) {
          const b2bPricing = resolveB2BPricing({
            retail: { amount: priced.priceAmount, currency: "BDT" },
            discountPercent: b2bAccount?.discountPercent ?? 0,
            terms: b2bTermsByProduct.get(product.id) ?? null,
          });
          if (quantity < b2bPricing.minQuantity) {
            throw new OrderPlaceError(
              `${product.name} has a wholesale minimum of ${b2bPricing.minQuantity} — update the quantity in your cart.`,
            );
          }
          unitAmount = b2bPricing.price.amount;
        }

        lines.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          quantity,
          unitAmount,
          totalAmount: unitAmount * quantity,
          stockId: stock.id,
          quantityOnHand: stock.quantity,
          reserved: stock.reserved,
          threshold: stock.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
          colorName: item.color?.name ?? null,
          colorHex: item.color?.hex ?? null,
          buildBatchId: item.buildBatchId,
          builderSlot: item.builderSlot,
        });
      }

      const subtotalAmount = lines.reduce(
        (sum, line) => sum + line.totalAmount,
        0,
      );
      // Checked here rather than at the cart screen because this is the only
      // place it is authoritative: the cart page is a hint, and a client that
      // ignores it must still be refused. Measured before the coupon, against
      // the goods only — see `lib/business/minimum-order.ts` for why.
      const minimum = belowMinimumOrder({
        subtotalAmount,
        minimumOrderAmount: operations.minimumOrderAmount,
      });
      if (!minimum.ok) {
        throw new OrderPlaceError(minimum.reason);
      }
      let couponId: string | null = null;
      let couponCode: string | null = null;
      let discountAmount = 0;
      if (locked.couponCode) {
        const redeemed = await findRedeemableCoupon(
          locked.couponCode,
          subtotalAmount,
          tx,
        );
        if (!redeemed.ok) {
          throw new OrderPlaceError(redeemed.reason);
        }
        const applied = applyCouponToSubtotal(
          redeemed.coupon.code,
          subtotalAmount,
          redeemed.coupon,
        );
        if (!applied.ok) {
          throw new OrderPlaceError(applied.reason);
        }
        // Per-customer cap, checked under a lock on the coupon row so the
        // count cannot move before the redemption is written below (DSA-14).
        // A coupon with no `perUserLimit` short-circuits and pays nothing.
        const perUser = await checkCouponPerUserLimit(
          tx,
          redeemed.coupon,
          userId,
        );
        if (!perUser.ok) {
          throw new OrderPlaceError(perUser.reason);
        }
        const bumped = await incrementCouponUsage(tx, redeemed.coupon);
        if (!bumped.ok) {
          throw new OrderPlaceError(bumped.reason);
        }
        couponId = redeemed.coupon.id;
        couponCode = redeemed.coupon.code;
        discountAmount = applied.discountAmount;
      }
      const shippingAmount = shipping.amount;

      // Was `const taxAmount = 0`, which made the admin VAT setting decorative
      // (F17-01). `addedToTotal` is separate from `taxAmount` on purpose: when
      // prices already include VAT the tax is recorded for the invoice but must
      // not be added again, or every order is overcharged by the rate.
      const tax = computeOrderTax({
        taxableBase: Math.max(0, subtotalAmount - discountAmount),
        vatRateBasisPoints: operations.vatRateBasisPoints,
        taxIncludedInPrice: operations.taxIncludedInPrice,
      });
      const taxAmount = tax.taxAmount;
      // The other half of the same admin section, and deliberately outside the
      // taxable base above — see `lib/business/service-charge.ts`.
      const serviceChargeAmount = computeServiceCharge(
        operations.serviceChargeAmount,
      );
      const totalAmount = Math.max(
        0,
        subtotalAmount -
          discountAmount +
          shippingAmount +
          serviceChargeAmount +
          tax.addedToTotal,
      );

      let createdOrder: { id: string; number: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const number = await nextOrderNumber(tx);
        const prepared = await preparePaymentStart(paymentPlan, {
          orderNumber: number,
          amount: totalAmount,
          currency: "BDT",
        });
        if (!prepared.ok) {
          throw new OrderPlaceError(prepared.reason);
        }
        try {
          createdOrder = await tx.order.create({
            data: {
              number,
              userId,
              customerName: contact.fullName,
              customerEmail: contact.email,
              customerPhone: contact.phone,
              status: "PENDING",
              paymentStatus: "PENDING",
              currency: "BDT",
              subtotalAmount,
              discountAmount,
              shippingAmount,
              taxAmount,
              serviceChargeAmount,
              totalAmount,
              couponId,
              couponCode,
              shippingMethodId: locked.shippingMethod.id,
              shippingMethodLabel: locked.shippingMethod.name,
              shippingAreaId: locked.shippingArea?.id ?? null,
              shippingAddress: contact.addressLine,
              billingAddress: contact.billingAddress || null,
              notes: contact.notes || null,
              items: {
                create: lines.map((line) => ({
                  productId: line.productId,
                  productName: line.name,
                  sku: line.sku,
                  unitAmount: line.unitAmount,
                  quantity: line.quantity,
                  totalAmount: line.totalAmount,
                  colorName: line.colorName,
                  colorHex: line.colorHex,
                  buildBatchId: line.buildBatchId,
                  builderSlot: line.builderSlot,
                })),
              },
              payments: {
                create: paymentCreateData(paymentPlan, {
                  orderNumber: number,
                  amount: totalAmount,
                  currency: "BDT",
                }),
              },
            },
            select: { id: true, number: true },
          });
          break;
        } catch (error) {
          const unique =
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002";
          if (!unique || attempt === 2) {
            throw error;
          }
        }
      }

      if (!createdOrder) {
        throw new OrderPlaceError("The order could not be created.");
      }

      // The ledger entry that makes the cap above answerable next time. Same
      // transaction as the check and the usageCount increment, so all three
      // commit together or not at all.
      if (couponId) {
        await recordCouponRedemption(tx, couponId, {
          userId,
          orderId: createdOrder.id,
        });
      }

      // Reserve once per stock row, not once per line. Writing an absolute
      // `reserved` computed from each line's own pre-loop snapshot meant the
      // second line sharing a stock row overwrote the first, so units were
      // sold but never reserved (DSA-01). `increment` is atomic and additive,
      // so it is correct no matter how many lines share the row.
      for (const [stockId, claimed] of claimedByStock) {
        await tx.productStock.update({
          where: { id: stockId },
          data: { reserved: { increment: claimed } },
        });
      }

      // Stock status is derived from the row's final reserved total, so it is
      // recomputed per product after every reservation is applied.
      const seenProducts = new Set<string>();
      for (const line of lines) {
        if (seenProducts.has(line.productId)) {
          continue;
        }
        seenProducts.add(line.productId);
        const status = deriveStockStatus(
          line.quantityOnHand,
          line.reserved + (claimedByStock.get(line.stockId) ?? 0),
          line.threshold,
        );
        await tx.product.update({
          where: { id: line.productId },
          data: { stockStatus: toDbStockStatus(status) },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: locked.id } });
      await tx.cart.update({
        where: { id: locked.id },
        data: {
          couponCode: null,
          shippingMethodId: null,
          shippingAreaId: null,
        },
      });

      return createdOrder.id;
    });

    let view = await loadPlacedOrder(created);
    if (!view) {
      return fail("The order was created but could not be loaded.");
    }
    try {
      await notifyStaffOfNewOrder({
        orderId: created,
        orderNumber: view.number,
        customerName: view.customerName,
        totalAmount: view.totalAmount,
      });
    } catch {
      // Order is already placed; never fail checkout on alert delivery.
    }
    try {
      const requestMeta = await getRequestMeta();
      sendMetaCapiPurchaseSafe({
        orderNumber: view.number,
        value: view.totalAmount,
        currency: "BDT",
        contentIds: view.items.map((item) => item.sku),
        email: view.customerEmail,
        phone: view.customerPhone,
        clientIpAddress: requestMeta.ip,
        clientUserAgent: requestMeta.userAgent,
      });
    } catch {
      // Order is already placed; never fail checkout on analytics delivery.
    }
    const started = await startHostedCheckoutForOrder(created);
    if (started.ok && started.redirectUrl) {
      view = (await loadPlacedOrder(created)) ?? view;
      return { ok: true, order: view, redirectUrl: started.redirectUrl };
    }
    if (
      !started.ok &&
      (paymentPlan.provider === "sslcommerz" ||
        paymentPlan.provider === "bkash")
    ) {
      view = (await loadPlacedOrder(created)) ?? view;
      return {
        ok: true,
        order: view,
        redirectUrl: null,
        paymentStartError: started.reason,
      };
    }
    return { ok: true, order: view, redirectUrl: null };
  } catch (error) {
    if (error instanceof OrderPlaceError) {
      return fail(error.message);
    }
    throw error;
  }
}

class OrderPlaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderPlaceError";
  }
}

async function loadPlacedOrder(id: string): Promise<CustomerOrderView | null> {
  const row = await getPrisma().order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { slug: true } } },
        orderBy: { id: "asc" },
      },
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { method: true, provider: true },
      },
    },
  });
  return row ? toCustomerOrderView(row) : null;
}
