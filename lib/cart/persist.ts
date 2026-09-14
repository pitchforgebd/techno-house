/**
 * Persistent cart reads/writes (P13-T01).
 *
 * Guest carts are keyed by a hashed cookie token. Signed-in carts are keyed
 * by `userId`. Totals stay display-only — this layer never charges.
 *
 * `DATA_SOURCE=mock` cannot persist (same rule as catalog admin).
 */
import { randomUUID } from "node:crypto";
import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  createSessionToken,
  hashSessionToken,
  isWellFormedSessionToken,
} from "@/lib/auth/session-token";
import {
  EMPTY_CART,
  MAX_CART_LINES,
  MAX_LINE_QTY,
  clampQuantity,
  type CartState,
} from "@/lib/cart/cart";
import { normalizeCouponCode } from "@/lib/cart/coupons";
import {
  findRedeemableCoupon,
  getCouponDefinitionByCode,
} from "@/lib/marketing/coupons";
import {
  clearGuestCartCookie,
  readGuestCartCookie,
  setGuestCartCookie,
  GUEST_CART_TTL_MS,
} from "@/lib/cart/guest-cart-cookie";
import { findShippingArea } from "@/lib/cart/shipping";
import { toDbBuilderSlot } from "@/lib/data/prisma/mappers";
import type { BuilderSlot } from "@/lib/data/types/catalog";
import { getPrisma } from "@/lib/db/prisma";
import {
  listPublicShippingAreas,
  parsePublicAreaId,
  publicAreaId,
} from "@/lib/shipping/locations";
import type { StockStatus } from "@/lib/generated/prisma/enums";

export const CART_DB_REQUIRED =
  "Cart persistence needs the database. Turn off DATA_SOURCE=mock to save.";

export type CartOwner =
  { kind: "user"; userId: string } | { kind: "guest"; tokenHash: string };

export type CartMutationResult =
  { ok: true; state: CartState } | { ok: false; reason: string };

type CartProduct = {
  id: string;
  slug: string;
  isActive: boolean;
  stockStatus: StockStatus;
  stock: { quantity: number; reserved: number } | null;
};

type CartRecord = {
  id: string;
  couponCode: string | null;
  shippingMethod: { code: string } | null;
  shippingArea: { name: string; zone: { code: string } } | null;
  items: {
    quantity: number;
    colorId: string | null;
    color: { id: string; name: string; hex: string | null } | null;
    product: { slug: string; isActive: boolean };
  }[];
};

const cartInclude = {
  shippingMethod: { select: { code: true } },
  shippingArea: { select: { name: true, zone: { select: { code: true } } } },
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      product: { select: { slug: true, isActive: true } },
      color: { select: { id: true, name: true, hex: true } },
    },
  },
};

export function usesCartDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(reason: string): CartMutationResult {
  return { ok: false, reason };
}

function availableUnits(product: CartProduct): number {
  if (product.stockStatus === "OUT_OF_STOCK") {
    return 0;
  }
  if (!product.stock) {
    return MAX_LINE_QTY;
  }
  return Math.max(0, product.stock.quantity - product.stock.reserved);
}

async function toCartState(cart: CartRecord): Promise<CartState> {
  const lines = cart.items
    .filter((item) => item.product.isActive)
    .slice(0, MAX_CART_LINES)
    .map((item) => ({
      slug: item.product.slug,
      quantity: clampQuantity(item.quantity),
      colorId: item.colorId ?? item.color?.id ?? null,
      colorName: item.color?.name ?? null,
      colorHex: item.color?.hex ?? null,
    }));

  const appliedCoupon = cart.couponCode
    ? await getCouponDefinitionByCode(cart.couponCode)
    : null;

  const methodCode = cart.shippingMethod?.code ?? null;
  const shippingMethodId = methodCode;

  let shippingAreaId: string | null = null;
  if (cart.shippingArea) {
    shippingAreaId = publicAreaId(
      cart.shippingArea.zone.code,
      cart.shippingArea.name,
    );
  }

  return {
    lines,
    couponCode: appliedCoupon?.code ?? null,
    appliedCoupon,
    shippingMethodId,
    shippingAreaId,
    paymentMethodId: null,
  };
}

async function loadCartRecord(cartId: string): Promise<CartState> {
  const cart = await getPrisma().cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });
  return cart ? toCartState(cart) : EMPTY_CART;
}

async function findCart(owner: CartOwner) {
  const prisma = getPrisma();
  if (owner.kind === "user") {
    return prisma.cart.findFirst({
      where: { userId: owner.userId },
      orderBy: { updatedAt: "desc" },
    });
  }
  return prisma.cart.findUnique({
    where: { sessionToken: owner.tokenHash },
  });
}

async function getOrCreateCart(owner: CartOwner) {
  const existing = await findCart(owner);
  if (existing) {
    return existing;
  }
  const prisma = getPrisma();
  if (owner.kind === "user") {
    return prisma.cart.create({ data: { userId: owner.userId } });
  }
  return prisma.cart.create({ data: { sessionToken: owner.tokenHash } });
}

async function loadSellableProduct(slug: string): Promise<CartProduct | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  return getPrisma().product.findFirst({
    where: { slug: trimmed, isActive: true },
    select: {
      id: true,
      slug: true,
      isActive: true,
      stockStatus: true,
      stock: { select: { quantity: true, reserved: true } },
    },
  });
}

async function findLine(
  cartId: string,
  productId: string,
  variantId: string | null,
  colorId: string | null,
) {
  return getPrisma().cartItem.findFirst({
    where: { cartId, productId, variantId, colorId },
  });
}

async function resolveShippingFks(
  methodCode: string | null,
  areaCode: string | null,
): Promise<{ shippingMethodId: string | null; shippingAreaId: string | null }> {
  if (!methodCode) {
    return { shippingMethodId: null, shippingAreaId: null };
  }

  const prisma = getPrisma();
  const dbMethod = await prisma.shippingMethod.findFirst({
    where: { code: methodCode, isActive: true },
    select: { id: true, code: true, isPickup: true },
  });
  if (!dbMethod) {
    return { shippingMethodId: null, shippingAreaId: null };
  }

  if (dbMethod.isPickup) {
    return {
      shippingMethodId: dbMethod.id,
      shippingAreaId: null,
    };
  }

  const parsed = parsePublicAreaId(areaCode);
  const areas = await listPublicShippingAreas();
  const area =
    (parsed
      ? areas.find(
          (item) =>
            item.zoneId === parsed.zoneCode && item.name === parsed.name,
        )
      : null) ?? findShippingArea(areaCode, areas);
  if (!area) {
    return {
      shippingMethodId: dbMethod.id,
      shippingAreaId: null,
    };
  }

  const zone = await prisma.shippingZone.findUnique({
    where: { code: area.zoneId },
    select: { id: true },
  });
  if (!zone) {
    return { shippingMethodId: dbMethod.id, shippingAreaId: null };
  }

  const dbArea = await prisma.shippingArea.findUnique({
    where: { zoneId_name: { zoneId: zone.id, name: area.name } },
    select: { id: true },
  });

  return {
    shippingMethodId: dbMethod.id,
    shippingAreaId: dbArea?.id ?? null,
  };
}

async function resolveOwner(options: {
  createGuest: boolean;
}): Promise<CartOwner | null> {
  const session = await getCustomerSession();
  if (session) {
    return { kind: "user", userId: session.userId };
  }

  let token = await readGuestCartCookie();
  if (token && !isWellFormedSessionToken(token)) {
    await clearGuestCartCookie();
    token = null;
  }

  if (!token) {
    if (!options.createGuest) {
      return null;
    }
    token = createSessionToken();
    await setGuestCartCookie(token, new Date(Date.now() + GUEST_CART_TTL_MS));
  }

  return { kind: "guest", tokenHash: hashSessionToken(token) };
}

export async function getPersistedCart(): Promise<CartState> {
  if (!usesCartDatabase()) {
    return EMPTY_CART;
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return EMPTY_CART;
  }
  return getCartStateForOwner(owner);
}

export async function getCartStateForOwner(
  owner: CartOwner,
): Promise<CartState> {
  const cart = await findCart(owner);
  if (!cart) {
    return EMPTY_CART;
  }
  return loadCartRecord(cart.id);
}

export async function addCartItem(
  slug: string,
  quantity = 1,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: true });
  if (!owner) {
    return fail("The cart could not be opened.");
  }
  return addCartItemForOwner(owner, slug, quantity, colorId);
}

export async function addCartItemForOwner(
  owner: CartOwner,
  slug: string,
  quantity = 1,
  colorId: string | null = null,
  buildMeta?: { buildBatchId: string; builderSlot: BuilderSlot },
): Promise<CartMutationResult> {
  const product = await loadSellableProduct(slug);
  if (!product) {
    return fail("That product is not available.");
  }

  const available = availableUnits(product);
  if (available <= 0) {
    return fail("This item cannot be added while it is out of stock.");
  }

  const colors = await getPrisma().productColor.findMany({
    where: { productId: product.id },
    select: { id: true, name: true },
    orderBy: { position: "asc" },
  });
  let resolvedColorId: string | null = null;
  if (colors.length > 0) {
    if (!colorId) {
      return fail("Choose a colour before adding this product.");
    }
    const match = colors.find((color) => color.id === colorId);
    if (!match) {
      return fail("That colour is not available for this product.");
    }
    resolvedColorId = match.id;
  } else if (colorId) {
    return fail("This product has no colour options.");
  }

  const cart = await getOrCreateCart(owner);
  const existing = await findLine(cart.id, product.id, null, resolvedColorId);
  if (!existing) {
    const lineCount = await getPrisma().cartItem.count({
      where: { cartId: cart.id },
    });
    if (lineCount >= MAX_CART_LINES) {
      return fail("The cart is full.");
    }
  }

  const nextQty = clampQuantity((existing?.quantity ?? 0) + quantity);
  const capped = Math.min(nextQty, available, MAX_LINE_QTY);

  if (existing) {
    await getPrisma().cartItem.update({
      where: { id: existing.id },
      data: { quantity: capped },
    });
  } else {
    await getPrisma().cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        colorId: resolvedColorId,
        quantity: capped,
        buildBatchId: buildMeta?.buildBatchId ?? null,
        builderSlot: buildMeta ? toDbBuilderSlot(buildMeta.builderSlot) : null,
      },
    });
  }

  return { ok: true, state: await loadCartRecord(cart.id) };
}

export async function addCartItems(
  slugs: string[],
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: true });
  if (!owner) {
    return fail("The cart could not be opened.");
  }
  return addCartItemsForOwner(owner, slugs);
}

export async function addCartItemsForOwner(
  owner: CartOwner,
  slugs: string[],
): Promise<CartMutationResult> {
  let last: CartMutationResult = {
    ok: true,
    state: await getCartStateForOwner(owner),
  };
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug) {
      continue;
    }
    const result = await addCartItemForOwner(owner, slug, 1);
    if (result.ok) {
      last = result;
    }
  }
  return last;
}

/**
 * Real "Add build to cart" write path (AD-276). Every line gets the same
 * fresh `buildBatchId` plus its own real `builderSlot`, carried through to
 * the order at checkout — lets admin see which order lines came from the
 * same PC build without a fragile FK to the (possibly since-pruned) saved
 * `PCBuild` row.
 */
export async function addBuildItemsToCart(
  items: { slug: string; builderSlot: BuilderSlot }[],
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: true });
  if (!owner) {
    return fail("The cart could not be opened.");
  }

  const buildBatchId = randomUUID();
  let last: CartMutationResult = {
    ok: true,
    state: await getCartStateForOwner(owner),
  };
  for (const item of items) {
    const slug = item.slug.trim();
    if (!slug) {
      continue;
    }
    const result = await addCartItemForOwner(owner, slug, 1, null, {
      buildBatchId,
      builderSlot: item.builderSlot,
    });
    if (result.ok) {
      last = result;
    }
  }
  return last;
}

export async function setCartQuantity(
  slug: string,
  quantity: number,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return { ok: true, state: EMPTY_CART };
  }
  return setCartQuantityForOwner(owner, slug, quantity, colorId);
}

export async function setCartQuantityForOwner(
  owner: CartOwner,
  slug: string,
  quantity: number,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  const cart = await findCart(owner);
  if (!cart) {
    return { ok: true, state: EMPTY_CART };
  }

  const product = await loadSellableProduct(slug);
  if (!product) {
    const stale = await getPrisma().cartItem.findFirst({
      where: {
        cartId: cart.id,
        product: { slug: slug.trim() },
        colorId,
      },
    });
    if (stale) {
      await getPrisma().cartItem.delete({ where: { id: stale.id } });
    }
    return { ok: true, state: await loadCartRecord(cart.id) };
  }

  const existing = await findLine(cart.id, product.id, null, colorId);
  if (!existing) {
    return { ok: true, state: await loadCartRecord(cart.id) };
  }

  const available = availableUnits(product);
  if (available <= 0) {
    return fail("This item is out of stock.");
  }

  const capped = Math.min(clampQuantity(quantity), available, MAX_LINE_QTY);
  await getPrisma().cartItem.update({
    where: { id: existing.id },
    data: { quantity: capped },
  });
  return { ok: true, state: await loadCartRecord(cart.id) };
}

export async function removeCartItem(
  slug: string,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return { ok: true, state: EMPTY_CART };
  }
  return removeCartItemForOwner(owner, slug, colorId);
}

export async function removeCartItemForOwner(
  owner: CartOwner,
  slug: string,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  const cart = await findCart(owner);
  if (!cart) {
    return { ok: true, state: EMPTY_CART };
  }

  await getPrisma().cartItem.deleteMany({
    where: {
      cartId: cart.id,
      product: { slug: slug.trim() },
      colorId,
    },
  });

  const remaining = await getPrisma().cartItem.count({
    where: { cartId: cart.id },
  });
  if (remaining === 0) {
    await getPrisma().cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        shippingMethodId: null,
        shippingAreaId: null,
      },
    });
  }

  return { ok: true, state: await loadCartRecord(cart.id) };
}

export async function clearPersistedCart(): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return { ok: true, state: EMPTY_CART };
  }
  return clearCartForOwner(owner);
}

export async function clearCartForOwner(
  owner: CartOwner,
): Promise<CartMutationResult> {
  const cart = await findCart(owner);
  if (!cart) {
    return { ok: true, state: EMPTY_CART };
  }
  await getPrisma().cartItem.deleteMany({ where: { cartId: cart.id } });
  await getPrisma().cart.update({
    where: { id: cart.id },
    data: {
      couponCode: null,
      shippingMethodId: null,
      shippingAreaId: null,
    },
  });
  return { ok: true, state: EMPTY_CART };
}

export async function applyPersistedCoupon(
  rawCode: string,
): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return fail("Add items before applying a coupon.");
  }
  return applyCouponForOwner(owner, rawCode);
}

export async function applyCouponForOwner(
  owner: CartOwner,
  rawCode: string,
): Promise<CartMutationResult> {
  const cart = await findCart(owner);
  if (!cart) {
    return fail("Add items before applying a coupon.");
  }

  const code = normalizeCouponCode(rawCode);
  if (!code) {
    return fail("Enter a coupon code.");
  }

  const items = await getPrisma().cartItem.findMany({
    where: { cartId: cart.id },
    select: {
      quantity: true,
      product: { select: { isActive: true, priceAmount: true } },
    },
  });
  const active = items.filter((item) => item.product.isActive);
  if (active.length === 0) {
    return fail("Add items before applying a coupon.");
  }
  const subtotal = active.reduce(
    (sum, item) => sum + item.product.priceAmount * item.quantity,
    0,
  );

  const redeemed = await findRedeemableCoupon(code, subtotal);
  if (!redeemed.ok) {
    return fail(redeemed.reason);
  }

  await getPrisma().cart.update({
    where: { id: cart.id },
    data: { couponCode: redeemed.coupon.code },
  });
  return { ok: true, state: await loadCartRecord(cart.id) };
}

export async function removePersistedCoupon(): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: false });
  if (!owner) {
    return { ok: true, state: EMPTY_CART };
  }
  const cart = await findCart(owner);
  if (!cart) {
    return { ok: true, state: EMPTY_CART };
  }
  await getPrisma().cart.update({
    where: { id: cart.id },
    data: { couponCode: null },
  });
  return { ok: true, state: await loadCartRecord(cart.id) };
}

export async function setPersistedShipping(input: {
  methodId: string | null;
  areaId: string | null;
}): Promise<CartMutationResult> {
  if (!usesCartDatabase()) {
    return fail(CART_DB_REQUIRED);
  }
  const owner = await resolveOwner({ createGuest: true });
  if (!owner) {
    return fail("The cart could not be opened.");
  }
  return setShippingForOwner(owner, input);
}

export async function setShippingForOwner(
  owner: CartOwner,
  input: { methodId: string | null; areaId: string | null },
): Promise<CartMutationResult> {
  const cart = await getOrCreateCart(owner);
  const fks = await resolveShippingFks(input.methodId, input.areaId);
  await getPrisma().cart.update({
    where: { id: cart.id },
    data: fks,
  });
  return { ok: true, state: await loadCartRecord(cart.id) };
}

/**
 * Move a guest cart onto a user. Sums matching product lines, clamps qty,
 * and keeps the user's coupon/shipping when already set.
 * Does not touch cookies — callers that can write cookies should clear
 * the guest cookie after a successful merge.
 */
export async function mergeGuestCartIntoUser(
  userId: string,
  guestTokenHash: string,
): Promise<void> {
  if (!usesCartDatabase() || !guestTokenHash) {
    return;
  }

  const prisma = getPrisma();
  const guest = await prisma.cart.findUnique({
    where: { sessionToken: guestTokenHash },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              isActive: true,
              stockStatus: true,
              stock: { select: { quantity: true, reserved: true } },
            },
          },
        },
      },
    },
  });
  if (!guest) {
    return;
  }

  const userCart = await prisma.cart.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (!userCart) {
    await prisma.cart.update({
      where: { id: guest.id },
      data: { userId, sessionToken: null },
    });
    return;
  }

  if (userCart.id === guest.id) {
    await prisma.cart.update({
      where: { id: guest.id },
      data: { userId, sessionToken: null },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of guest.items) {
      if (!item.product.isActive) {
        continue;
      }
      const available = availableUnits(item.product);
      if (available <= 0) {
        continue;
      }

      const existing = await tx.cartItem.findFirst({
        where: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          colorId: item.colorId,
        },
      });

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: Math.min(
              MAX_LINE_QTY,
              available,
              existing.quantity + item.quantity,
            ),
          },
        });
        continue;
      }

      const count = await tx.cartItem.count({ where: { cartId: userCart.id } });
      if (count >= MAX_CART_LINES) {
        break;
      }

      await tx.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          colorId: item.colorId,
          quantity: Math.min(MAX_LINE_QTY, available, item.quantity),
        },
      });
    }

    await tx.cart.update({
      where: { id: userCart.id },
      data: {
        couponCode: userCart.couponCode ?? guest.couponCode,
        shippingMethodId: userCart.shippingMethodId ?? guest.shippingMethodId,
        shippingAreaId: userCart.shippingAreaId ?? guest.shippingAreaId,
      },
    });

    await tx.cart.delete({ where: { id: guest.id } });
  });
}

export async function mergeGuestCartFromCookie(userId: string): Promise<void> {
  if (!usesCartDatabase()) {
    return;
  }
  const token = await readGuestCartCookie();
  if (!token || !isWellFormedSessionToken(token)) {
    if (token) {
      await clearGuestCartCookie();
    }
    return;
  }

  await mergeGuestCartIntoUser(userId, hashSessionToken(token));
  await clearGuestCartCookie();
}
