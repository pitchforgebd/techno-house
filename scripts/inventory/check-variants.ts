/**
 * Product variants end to end (AD-388).
 *
 *   npm run test:variants
 *
 * A product can sell several variants (Color x Storage, RAM / ROM, Size …),
 * each with its own SKU, price, stock and image. This suite pins, against the
 * real database:
 *
 *   - the admin save: option names, one row per combination, the product's
 *     listing price = cheapest active variant, its stock = the variants' total,
 *     identity kept across a SKU edit, bad input refused, shortcuts refused;
 *   - the product page data: option groups, per-variant price/stock/image;
 *   - the cart: a variant must be chosen, must belong to the product, is
 *     capped by its own stock and priced at its own price;
 *   - checkout (security-critical): the server charges the VARIANT's price,
 *     checks and reserves the VARIANT's stock, refuses a missing/foreign/
 *     switched-off variant, snapshots it on the order line, and B2B buyers get
 *     the account percentage on the variant price (never the product's single
 *     wholesale figure);
 *   - the stock lifecycle (release / convert) moves the variant's row and
 *     keeps the product's aggregate row in step;
 *   - legacy name-only variants still read as one implicit option.
 *
 * Creates its own fixtures (`@techno-house.invalid`, `VAR-TEST-` SKUs) and
 * removes them in `finally`; never touches pre-existing rows.
 */
import { randomUUID } from "node:crypto";
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let failures = 0;
let passes = 0;

function check(label: string, ok: unknown, detail?: string): void {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.error(`fail ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main(): Promise<void> {
  // Imported after the env is loaded: these read DATABASE_URL at import.
  const { getPrisma } = await import("../../lib/db/prisma");
  const { saveAdminProduct, updateAdminProductQuickFields } = await import(
    "../../lib/catalog/admin-products"
  );
  const { updateAdminProductStock } = await import(
    "../../lib/catalog/admin-inventory"
  );
  const { parseVariants, parseVariantOptionNames } = await import(
    "../../lib/catalog/product-input"
  );
  const variantsLib = await import("../../lib/catalog/variants");
  const { productRepository } = await import("../../lib/data");
  const cart = await import("../../lib/cart/persist");
  const { placeCustomerOrderForUser } = await import(
    "../../lib/orders/create-order"
  );
  const { releaseOrderStock, convertOrderStock } = await import(
    "../../lib/orders/stock-reservation"
  );

  // --- pure helpers ---------------------------------------------------------
  {
    const combos = variantsLib.variantCombinations([
      { name: "Color", values: ["Black", "Blue"] },
      { name: "Storage", values: ["128GB", "256GB"] },
      { name: "Empty", values: [] },
    ]);
    check(
      "combinations: every pair, first option slowest, empty option skipped",
      JSON.stringify(combos) ===
        JSON.stringify([
          ["Black", "128GB"],
          ["Black", "256GB"],
          ["Blue", "128GB"],
          ["Blue", "256GB"],
        ]),
      JSON.stringify(combos),
    );
    const legacy = variantsLib.resolveVariantOptionGroups([], [
      { name: "8GB/128GB", optionValues: [] },
      { name: "12GB/256GB", optionValues: [] },
    ]);
    check(
      "legacy name-only variants read as one implicit option",
      legacy.length === 1 &&
        legacy[0]!.name === variantsLib.LEGACY_VARIANT_OPTION &&
        legacy[0]!.values.join() === "8GB/128GB,12GB/256GB",
    );
    const choices = [
      { id: "a", values: ["Black", "128GB"], priceAmount: 500, available: true },
      { id: "b", values: ["Black", "256GB"], priceAmount: 400, available: false },
      { id: "c", values: ["Blue", "256GB"], priceAmount: 600, available: true },
    ];
    check(
      "default selection is the cheapest in-stock variant",
      variantsLib.defaultVariant(choices)?.id === "a",
    );
    check(
      "a missing combination is reported unavailable",
      variantsLib.variantValueState(choices, ["Blue", "256GB"], 1, "128GB") ===
        "unavailable",
    );
    check(
      "an out-of-stock combination is reported as such",
      variantsLib.variantValueState(choices, ["Black", "128GB"], 1, "256GB") ===
        "out_of_stock",
    );
    const jumped = variantsLib.selectVariantValue(choices, ["Black", "128GB"], 0, "Blue");
    check(
      "picking a value with no exact combination jumps to a real variant",
      variantsLib.findVariantBySelection(choices, jumped)?.id === "c",
      JSON.stringify(jumped),
    );
    const names = parseVariantOptionNames(["Color", "color"]);
    check("duplicate option names are refused", !names.ok);
    check(
      "more than three options are refused",
      !parseVariantOptionNames(["A", "B", "C", "D"]).ok,
    );
    const row = (values: string[], sku: string) => ({
      name: "",
      optionValues: values,
      sku,
      price: "100",
      compareAt: "",
      isActive: true,
      quantity: "1",
    });
    check(
      "the same combination twice is refused",
      !parseVariants([row(["Black"], "X1"), row(["black "], "X2")], "P", ["Color"]).ok,
    );
    check(
      "a variant missing a value is refused",
      !parseVariants([row(["Black", ""], "X1")], "P", ["Color", "Storage"]).ok,
    );
    check(
      "a variant without a price is refused",
      !parseVariants([{ ...row(["Black"], "X1"), price: "0" }], "P", ["Color"]).ok,
    );
    check(
      "a variant image outside a local path / http(s) URL is refused",
      !parseVariants(
        [{ ...row(["Black"], "X1"), imageSrc: "javascript:alert(1)" }],
        "P",
        ["Color"],
      ).ok,
    );
  }

  const prisma = getPrisma();
  const stamp = Date.now();
  const brand = await prisma.brand.findFirst({ select: { id: true, slug: true } });
  const category = await prisma.category.findFirst({
    where: { isActive: true },
    select: { id: true, slug: true },
  });
  const shippingArea = await prisma.shippingArea.findFirst({ select: { id: true } });
  if (!brand || !category || !shippingArea) {
    console.error("fail fixtures — need a Brand, Category and ShippingArea.");
    process.exitCode = 1;
    return;
  }

  const userIds: string[] = [];
  const productIds: string[] = [];
  const guestTokens: string[] = [];
  const shippingMethod = await prisma.shippingMethod.create({
    data: {
      code: `var-test-ship-${stamp}`,
      name: "Variant Test Shipping",
      baseRateAmount: 0,
      isActive: true,
      isPickup: false,
      position: 9999,
    },
    select: { id: true },
  });

  try {
    // --- admin save -----------------------------------------------------------
    const sku = `VAR-TEST-${stamp}`;
    const slug = `var-test-${stamp}`;
    const base = {
      name: "Variant Test Phone",
      slug,
      sku,
      brandSlug: brand.slug,
      categorySlug: category.slug,
      position: "",
      weightGrams: "",
      // Deliberately not the cheapest variant: the save must override it.
      price: "99999",
      compareAt: "",
      discountStartsAt: "",
      discountEndsAt: "",
      overview: "",
      quantity: "999",
      lowStockThreshold: "1",
      isActive: true,
      isNew: false,
      isSale: false,
      isComingSoon: false,
      isPreOrder: false,
      warrantyEnabled: false,
      warrantyLabel: "",
      builderSlot: "",
      builderSocket: "",
      builderRamType: "",
      builderFormFactor: "",
      builderTdpWatts: "",
      builderStorageInterface: "",
      youtubeUrl: "",
      pdfSpecificationSrc: "",
    };
    const variantRow = (
      values: string[],
      price: string,
      quantity: string,
      extra: Record<string, unknown> = {},
    ) => ({
      name: "",
      optionValues: values,
      sku: `${sku}-${values.join("-")}`,
      price,
      compareAt: "",
      isActive: true,
      quantity,
      imageSrc: "",
      ...extra,
    });
    const created = await saveAdminProduct({
      fields: {
        ...base,
        variantOptionNames: ["Color", "Storage"],
        variants: [
          variantRow(["Black", "128GB"], "50000", "3", { compareAt: "54000" }),
          variantRow(["Black", "256GB"], "55000", "0"),
          variantRow(["Blue", "128GB"], "52000", "2", {
            imageSrc: "/uploads/test-blue.png",
          }),
          variantRow(["Blue", "256GB"], "57000", "5"),
        ],
      },
    });
    check("a product with Color x Storage variants saves", created.ok, JSON.stringify(created));
    if (!created.ok) {
      return;
    }
    productIds.push(created.id);

    const saved = await prisma.product.findUnique({
      where: { id: created.id },
      select: {
        priceAmount: true,
        compareAtAmount: true,
        variantOptionNames: true,
        stockStatus: true,
        stock: { select: { quantity: true, reserved: true } },
        variants: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            sku: true,
            optionValues: true,
            imageSrc: true,
            position: true,
            stock: { select: { quantity: true, reserved: true } },
          },
        },
      },
    });
    check(
      "option names are stored in order",
      saved?.variantOptionNames.join() === "Color,Storage",
    );
    check(
      "the listing price is the cheapest active variant's, with its regular price",
      saved?.priceAmount === 50000 && saved.compareAtAmount === 54000,
      `${saved?.priceAmount}/${saved?.compareAtAmount}`,
    );
    check(
      "variants keep their values, derived names and order",
      saved?.variants.map((v) => `${v.position}:${v.name}`).join("|") ===
        "0:Black / 128GB|1:Black / 256GB|2:Blue / 128GB|3:Blue / 256GB",
      saved?.variants.map((v) => v.name).join("|"),
    );
    check(
      "each variant has its own stock row",
      saved?.variants.map((v) => v.stock?.quantity).join() === "3,0,2,5",
    );
    check(
      "the product's own stock row is the variants' total",
      saved?.stock?.quantity === 10,
      `quantity=${saved?.stock?.quantity}`,
    );
    check(
      "the variant image is stored",
      saved?.variants[2]?.imageSrc === "/uploads/test-blue.png",
    );
    const [blackSmall, blackLarge, blueSmall, blueLarge] = saved!.variants;

    // Edit: rename a SKU (same id), switch the cheapest variant off.
    const editRows = saved!.variants.map((v, index) =>
      variantRow(
        v.optionValues,
        ["50000", "55000", "52000", "57000"][index]!,
        String(v.stock?.quantity ?? 0),
        {
          id: v.id,
          sku: index === 3 ? `${sku}-RENAMED` : v.sku,
          isActive: index !== 0,
          imageSrc: v.imageSrc ?? "",
        },
      ),
    );
    const edited = await saveAdminProduct({
      currentId: created.id,
      fields: { ...base, variantOptionNames: ["Color", "Storage"], variants: editRows },
    });
    check("the product re-saves", edited.ok, JSON.stringify(edited));
    const afterEdit = await prisma.product.findUnique({
      where: { id: created.id },
      select: {
        priceAmount: true,
        stock: { select: { quantity: true } },
        variants: { select: { id: true, sku: true, isActive: true } },
      },
    });
    check(
      "a variant keeps its id when its SKU changes",
      afterEdit?.variants.find((v) => v.id === blueLarge!.id)?.sku === `${sku}-RENAMED`,
    );
    check(
      "switching the cheapest variant off moves the listing price to the next",
      afterEdit?.priceAmount === 52000,
      `price=${afterEdit?.priceAmount}`,
    );
    check(
      "an inactive variant's stock leaves the product total",
      afterEdit?.stock?.quantity === 7,
      `quantity=${afterEdit?.stock?.quantity}`,
    );
    // Back on for the cart/order cases.
    await saveAdminProduct({
      currentId: created.id,
      fields: {
        ...base,
        variantOptionNames: ["Color", "Storage"],
        variants: editRows.map((r, i) => ({
          ...r,
          isActive: true,
          sku: i === 3 ? `${sku}-RENAMED` : r.sku,
        })),
      },
    });

    const quick = await updateAdminProductQuickFields({
      productId: created.id,
      fields: { price: "1", compareAt: "", quantity: "1", lowStockThreshold: "1" },
    });
    check(
      "quick edit refuses a variant product",
      !quick.ok && quick.formError === variantsLib.VARIANT_MANAGED_ERROR,
      quick.ok ? "accepted" : quick.formError,
    );
    const drawer = await updateAdminProductStock({
      productId: created.id,
      fields: { quantity: "1", lowStockThreshold: "1" },
    });
    check(
      "the stock drawer refuses a variant product",
      !drawer.ok && drawer.formError === variantsLib.VARIANT_MANAGED_ERROR,
      drawer.ok ? "accepted" : drawer.formError,
    );

    // --- product page data ------------------------------------------------------
    const detail = await productRepository.getBySlug(slug);
    check(
      "the product page gets both option groups",
      detail?.variantOptions.map((o) => `${o.name}=${o.values.join("/")}`).join(";") ===
        "Color=Black/Blue;Storage=128GB/256GB",
      JSON.stringify(detail?.variantOptions),
    );
    const choice = (id: string) => detail?.variantChoices.find((c) => c.id === id);
    check(
      "each choice carries its own price and values",
      choice(blueSmall!.id)?.price.amount === 52000 &&
        choice(blueSmall!.id)?.values.join() === "Blue,128GB",
    );
    check(
      "a variant with no stock is out of stock on the page",
      choice(blackLarge!.id)?.stockStatus === "out_of_stock",
    );
    check(
      "a variant image reaches the page",
      choice(blueSmall!.id)?.image?.src === "/uploads/test-blue.png",
    );

    // --- cart ---------------------------------------------------------------------
    const token = `var-test-${randomUUID()}`;
    guestTokens.push(token);
    const owner = { kind: "guest" as const, tokenHash: token };
    const noVariant = await cart.addCartItemForOwner(owner, slug, 1);
    check(
      "the cart refuses a variant product without an option",
      !noVariant.ok && /choose an option/i.test(noVariant.reason),
      noVariant.ok ? "accepted" : noVariant.reason,
    );
    const other = await prisma.product.create({
      data: {
        slug: `var-test-other-${stamp}`,
        sku: `VAR-TEST-OTHER-${stamp}`,
        name: "Variant Test Other",
        brandId: brand.id,
        categoryId: category.id,
        overview: [],
        priceAmount: 10,
        variants: {
          create: {
            sku: `VAR-TEST-OTHER-V-${stamp}`,
            name: "Other",
            priceAmount: 1,
            stock: { create: { quantity: 50 } },
          },
        },
      },
      select: { id: true, variants: { select: { id: true } } },
    });
    productIds.push(other.id);
    const foreign = await cart.addCartItemForOwner(
      owner, slug, 1, null, undefined, false, other.variants[0]!.id,
    );
    check("the cart refuses another product's variant", !foreign.ok);
    const soldOut = await cart.addCartItemForOwner(
      owner, slug, 1, null, undefined, false, blackLarge!.id,
    );
    check("the cart refuses an out-of-stock variant", !soldOut.ok);
    const added = await cart.addCartItemForOwner(
      owner, slug, 9, null, undefined, false, blueSmall!.id,
    );
    const line = added.ok ? added.state.lines[0] : null;
    check(
      "the cart line is capped by the variant's own stock and priced as the variant",
      added.ok &&
        line?.variantId === blueSmall!.id &&
        line.quantity === 2 &&
        line.variant?.priceAmount === 52000 &&
        line.variant.name === "Blue / 128GB",
      JSON.stringify(added),
    );
    const second = await cart.addCartItemForOwner(
      owner, slug, 1, null, undefined, false, blackSmall!.id,
    );
    check(
      "two variants of one product are two cart lines",
      second.ok && second.state.lines.length === 2,
    );
    const removed = await cart.removeCartItemForOwner(owner, slug, null, blueSmall!.id);
    check(
      "removing one variant's line leaves the other",
      removed.ok &&
        removed.state.lines.length === 1 &&
        removed.state.lines[0]?.variantId === blackSmall!.id,
    );

    // --- checkout -----------------------------------------------------------------
    let seq = 0;
    async function customerWithCart(
      items: { productId: string; variantId: string | null; quantity: number }[],
    ) {
      seq += 1;
      const user = await prisma.user.create({
        data: {
          email: `var-${seq}-${stamp}@techno-house.invalid`,
          fullName: `Variant ${seq}`,
          phone: `018${String(stamp).slice(-7)}${seq}`,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      userIds.push(user.id);
      await prisma.cart.create({
        data: {
          userId: user.id,
          shippingMethodId: shippingMethod.id,
          shippingAreaId: shippingArea!.id,
          items: { create: items },
        },
      });
      return user.id;
    }
    const contact = {
      fullName: "Variant Test",
      phone: "01710000000",
      email: `var-contact-${stamp}@techno-house.invalid`,
      addressLine: "12 Test Road, Dhaka",
      notes: "",
      billingAddress: "",
      paymentMethodId: "cod",
    };
    const variantStock = async (id: string) =>
      (await prisma.productStock.findUnique({
        where: { variantId: id },
        select: { quantity: true, reserved: true },
      }))!;
    const productStock = async () =>
      (await prisma.productStock.findUnique({
        where: { productId: created.id },
        select: { quantity: true, reserved: true },
      }))!;

    const plainUser = await customerWithCart([
      { productId: created.id, variantId: null, quantity: 1 },
    ]);
    const plain = await placeCustomerOrderForUser(plainUser, contact);
    check(
      "checkout refuses a variant product bought without an option",
      !plain.ok && /choose an option/i.test(plain.reason),
      plain.ok ? "accepted" : plain.reason,
    );

    const oversellUser = await customerWithCart([
      { productId: created.id, variantId: blueSmall!.id, quantity: 3 },
    ]);
    const oversell = await placeCustomerOrderForUser(oversellUser, contact);
    check(
      "checkout checks the variant's own stock, not the product total",
      !oversell.ok && /enough stock/i.test(oversell.reason),
      oversell.ok ? "accepted 3 of a variant holding 2" : oversell.reason,
    );

    const buyer = await customerWithCart([
      { productId: created.id, variantId: blueSmall!.id, quantity: 2 },
      { productId: created.id, variantId: blueLarge!.id, quantity: 1 },
    ]);
    const order = await placeCustomerOrderForUser(buyer, contact);
    check("an order of two variants places", order.ok, order.ok ? undefined : order.reason);
    const placed = await prisma.order.findFirst({
      where: { userId: buyer },
      select: {
        id: true,
        subtotalAmount: true,
        items: {
          select: { variantId: true, variantName: true, sku: true, unitAmount: true, quantity: true },
          orderBy: { unitAmount: "asc" },
        },
      },
    });
    check(
      "the server charges each variant's own price",
      placed?.subtotalAmount === 52000 * 2 + 57000,
      `subtotal=${placed?.subtotalAmount}`,
    );
    check(
      "order lines snapshot the variant id, name and SKU",
      placed?.items[0]?.variantId === blueSmall!.id &&
        placed.items[0].variantName === "Blue / 128GB" &&
        placed.items[0].sku === blueSmall!.sku &&
        placed.items[1]?.sku === `${sku}-RENAMED`,
      JSON.stringify(placed?.items),
    );
    const reservedSmall = await variantStock(blueSmall!.id);
    const reservedAggregate = await productStock();
    check(
      "the order reserves the variants' own rows",
      reservedSmall.reserved === 2 && (await variantStock(blueLarge!.id)).reserved === 1,
      JSON.stringify(reservedSmall),
    );
    check(
      "the product row mirrors the variants' reservations",
      reservedAggregate.reserved === 3 && reservedAggregate.quantity === 10,
      JSON.stringify(reservedAggregate),
    );
    const blueAfter = await productRepository.getBySlug(slug);
    check(
      "a fully reserved variant shows out of stock",
      blueAfter?.variantChoices.find((c) => c.id === blueSmall!.id)?.stockStatus ===
        "out_of_stock",
    );

    await prisma.$transaction((tx) => releaseOrderStock(tx, placed!.id));
    check(
      "cancelling releases the variant rows and the aggregate",
      (await variantStock(blueSmall!.id)).reserved === 0 &&
        (await productStock()).reserved === 0,
    );

    const buyer2 = await customerWithCart([
      { productId: created.id, variantId: blueLarge!.id, quantity: 2 },
    ]);
    const order2 = await placeCustomerOrderForUser(buyer2, contact);
    const placed2 = await prisma.order.findFirst({
      where: { userId: buyer2 },
      select: { id: true },
    });
    check("a second variant order places", order2.ok, order2.ok ? undefined : order2.reason);
    await prisma.$transaction((tx) => convertOrderStock(tx, placed2!.id));
    const delivered = await variantStock(blueLarge!.id);
    check(
      "delivering decrements the variant's quantity",
      delivered.quantity === 3 && delivered.reserved === 0,
      JSON.stringify(delivered),
    );
    check(
      "the product total follows the delivery",
      (await productStock()).quantity === 8,
      JSON.stringify(await productStock()),
    );

    // Switched off after it was put in a cart.
    const staleUser = await customerWithCart([
      { productId: created.id, variantId: blackSmall!.id, quantity: 1 },
    ]);
    await prisma.productVariant.update({
      where: { id: blackSmall!.id },
      data: { isActive: false },
    });
    const stale = await placeCustomerOrderForUser(staleUser, contact);
    check(
      "checkout refuses a variant switched off after it was carted",
      !stale.ok && /no longer available/i.test(stale.reason),
      stale.ok ? "accepted" : stale.reason,
    );
    await prisma.productVariant.update({
      where: { id: blackSmall!.id },
      data: { isActive: true },
    });

    // Foreign variant smuggled onto this product's cart line.
    const smuggleUser = await customerWithCart([
      { productId: created.id, variantId: other.variants[0]!.id, quantity: 1 },
    ]);
    const smuggle = await placeCustomerOrderForUser(smuggleUser, contact);
    check(
      "checkout refuses another product's (cheaper) variant",
      !smuggle.ok,
      smuggle.ok ? "charged a foreign variant's price" : undefined,
    );

    // B2B: account percentage on the variant price, never the product's
    // single wholesale figure.
    const b2bUser = await customerWithCart([
      { productId: created.id, variantId: blackSmall!.id, quantity: 1 },
    ]);
    await prisma.b2BAccount.create({
      data: {
        userId: b2bUser,
        company: "Variant Test Co",
        contactName: "Variant Test",
        discountPercent: 10,
        status: "ACTIVE",
      },
    });
    await prisma.b2BProductPrice.create({
      data: { productId: created.id, priceAmount: 100, minQuantity: 1 },
    });
    const b2b = await placeCustomerOrderForUser(b2bUser, contact);
    const b2bOrder = await prisma.order.findFirst({
      where: { userId: b2bUser },
      select: { items: { select: { unitAmount: true } } },
    });
    check(
      "a B2B buyer pays the account % off the variant price",
      b2b.ok && b2bOrder?.items[0]?.unitAmount === 45000,
      b2b.ok ? `unit=${b2bOrder?.items[0]?.unitAmount}` : b2b.reason,
    );
  } finally {
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: userIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({
      where: {
        OR: [
          { cart: { userId: { in: userIds } } },
          { cart: { sessionToken: { in: guestTokens } } },
        ],
      },
    });
    await prisma.cart.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, { sessionToken: { in: guestTokens } }],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    // Cascades to variants, their stock rows, B2B price and audit-free rows.
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.shippingMethod.deleteMany({ where: { id: shippingMethod.id } });
    const leftovers =
      (await prisma.product.count({ where: { sku: { startsWith: "VAR-TEST-" } } })) +
      (await prisma.productVariant.count({ where: { sku: { startsWith: "VAR-TEST-" } } }));
    check("fixtures are cleaned up", leftovers === 0, `leftovers=${leftovers}`);
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`variants failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} variant checks`);
}

main().catch((error) => {
  console.error("variants crashed:", error);
  process.exitCode = 1;
});
