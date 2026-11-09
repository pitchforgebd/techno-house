/**
 * Data layer + Meta Conversions API (AD-389).
 *
 *   npm run test:datalayer
 *
 * Pins, without touching Meta (global `fetch` is replaced for Graph calls):
 *   - match keys: BD phone → 8801XXXXXXXXX, fbp/fbc shape checks;
 *   - GA4 / Meta payload builders: names, item fields, numbers not strings,
 *     parent SKU as id, variant only in item_variant, Search has no value;
 *   - relay sanitiser: negative / absurd / malformed input is dropped;
 *   - CAPI sender: nothing sent without token or pixel id, env pixel wins,
 *     the admin "enabled" switch is ignored, token never in the URL, hashed
 *     user data, test_event_code, Meta error + timeout logged, never throws;
 *   - Purchase from a real order row: event_id = order number, content_ids =
 *     PARENT Product.sku (not the line's variant SKU), value from the DB;
 *   - online payment: Purchase goes out exactly once, on the PENDING → PAID
 *     gateway confirmation, and not again on a replayed callback;
 *   - feed: regular price in <g:price>, <g:sale_price> only inside the
 *     discount window, no 200-row cap.
 *
 * Creates its own fixture order (`TH-TRKTEST-…`) and deletes it in `finally`.
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
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

type GraphCall = { url: string; body: Record<string, unknown> };
const graphCalls: GraphCall[] = [];
let graphResponder: () => Promise<Response> = async () =>
  new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.startsWith("https://graph.facebook.com/")) {
    graphCalls.push({
      url,
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    return graphResponder();
  }
  return realFetch(input, init);
}) as typeof fetch;

const logs: string[] = [];
const realInfo = console.info;
const realWarn = console.warn;
console.info = (...args: unknown[]) => {
  logs.push(args.map(String).join(" "));
};
console.warn = (...args: unknown[]) => {
  logs.push(args.map(String).join(" "));
};

async function waitFor(predicate: () => boolean, ms = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return predicate();
}

function firstEvent(call: GraphCall | undefined): Record<string, unknown> {
  const data = call?.body.data as Record<string, unknown>[] | undefined;
  return data?.[0] ?? {};
}

async function main(): Promise<void> {
  const { normalizeBdPhone, sanitizeFbCookie, sanitizeFbclid } =
    await import("@/lib/tracking/match-keys");
  const { toGa4, toMeta, sanitizeRelayData, RELAY_EVENT_NAMES, TRACK_EVENTS } =
    await import("@/lib/tracking/events");
  const meta = await import("@/lib/analytics/meta-capi");
  const { effectiveStorefrontPricing } =
    await import("@/lib/catalog/discount-pricing");
  const { categoryNameChain } =
    await import("@/lib/catalog/product-notes-labels");
  const { parseAuthEvent, encodeAuthEvent } =
    await import("@/lib/tracking/auth-event");

  // --- match keys -----------------------------------------------------------
  check(
    "phone 01… → 8801…",
    normalizeBdPhone("01712-345678") === "8801712345678",
  );
  check(
    "phone +880 kept",
    normalizeBdPhone("+880 1812 345678") === "8801812345678",
  );
  check("phone 10-digit", normalizeBdPhone("1912345678") === "8801912345678");
  check("phone landline refused", normalizeBdPhone("029876543") === null);
  check("phone junk refused", normalizeBdPhone("12345") === null);
  check(
    "fbp accepted",
    sanitizeFbCookie("fb.1.1730000000000.123456789") !== null,
  );
  check(
    "fbc accepted",
    sanitizeFbCookie("fb.1.1730000000000.IwAR0abc_-x") !== null,
  );
  check("fbp junk refused", sanitizeFbCookie("<script>") === null);
  check("fbp non-string refused", sanitizeFbCookie(42) === null);
  check("fbclid junk refused", sanitizeFbclid("a b") === null);
  check(
    "auth flag round trip",
    parseAuthEvent(encodeAuthEvent("sign_up", "GOOGLE"))?.method === "google",
  );
  check("auth flag junk refused", parseAuthEvent("admin.x;y") === null);

  // --- category chain --------------------------------------------------------
  const cats = new Map([
    ["laptop", { name: "Laptop", parentSlug: null }],
    ["gaming-laptop", { name: "Gaming Laptop", parentSlug: "laptop" }],
    ["loop-a", { name: "A", parentSlug: "loop-b" }],
    ["loop-b", { name: "B", parentSlug: "loop-a" }],
  ]);
  check(
    "category chain root → leaf",
    JSON.stringify(categoryNameChain("gaming-laptop", cats)) ===
      '["Laptop","Gaming Laptop"]',
  );
  check(
    "category chain cycle-safe",
    categoryNameChain("loop-a", cats).length === 2,
  );
  check(
    "category chain unknown = []",
    categoryNameChain("nope", cats).length === 0,
  );

  // --- GA4 / Meta builders --------------------------------------------------
  const item = {
    id: "TH-LAP-1",
    name: "Laptop One",
    brand: "Acme",
    categories: ["Laptop", "Gaming Laptop"],
    variant: "Black / 16GB",
    price: 95000,
    quantity: 2,
  };
  const atc = toGa4("AddToCart", { items: [item] });
  const ga4Item = (atc.ecommerce?.items as Record<string, unknown>[])[0] ?? {};
  check("add_to_cart currency", atc.ecommerce?.currency === "BDT");
  check("add_to_cart value numeric", atc.ecommerce?.value === 190000);
  check("item_id = parent sku", ga4Item.item_id === "TH-LAP-1");
  check("item_variant", ga4Item.item_variant === "Black / 16GB");
  check(
    "item_category",
    ga4Item.item_category === "Laptop" &&
      ga4Item.item_category2 === "Gaming Laptop",
  );
  check("affiliation", ga4Item.affiliation === "Techno House");
  check(
    "price is number",
    typeof ga4Item.price === "number" && typeof ga4Item.quantity === "number",
  );
  const atcMeta = toMeta("AddToCart", { items: [item] });
  check(
    "meta content_ids",
    JSON.stringify(atcMeta?.content_ids) === '["TH-LAP-1"]',
  );
  check(
    "meta contents",
    JSON.stringify(atcMeta?.contents) ===
      '[{"id":"TH-LAP-1","quantity":2,"item_price":95000}]',
  );
  check("meta content_type", atcMeta?.content_type === "product");
  check(
    "no meta for remove_from_cart",
    toMeta("RemoveFromCart", { items: [item] }) === null,
  );
  const search = toMeta("Search", { searchTerm: "ssd", items: [item] });
  check("search_string", search?.search_string === "ssd");
  check(
    "search has no value",
    search?.value === undefined && search?.currency === undefined,
  );
  check(
    "search is not ecommerce",
    toGa4("Search", { searchTerm: "ssd" }).ecommerce === null,
  );
  check(
    "search_term param",
    toGa4("Search", { searchTerm: "ssd" }).params.search_term === "ssd",
  );
  const purchaseMeta = toMeta("Purchase", {
    items: [item],
    value: 190120,
    transactionId: "1001",
  });
  check("purchase order_id", purchaseMeta?.order_id === "1001");
  check("purchase num_items", purchaseMeta?.num_items === 2);
  check("purchase explicit value", purchaseMeta?.value === 190120);
  const list = toGa4("ViewItemList", {
    listId: "shop",
    listName: "Shop",
    items: [item],
  });
  check("view_item_list has list id", list.ecommerce?.item_list_id === "shop");
  check("view_item_list has no value", list.ecommerce?.value === undefined);
  check("PageView never pushed", TRACK_EVENTS.PageView.ga4 === null);
  check("Purchase not relayed", !RELAY_EVENT_NAMES.has("Purchase"));
  check("ViewContent relayed", RELAY_EVENT_NAMES.has("ViewContent"));
  check("Login not relayed", !RELAY_EVENT_NAMES.has("Login"));

  // --- relay sanitiser ------------------------------------------------------
  const okRelay = sanitizeRelayData({
    items: [{ id: "A1", name: "A", price: 100, quantity: 1 }],
    value: 100,
    currency: "BDT",
  });
  check("relay accepts sane payload", okRelay?.items?.length === 1);
  check(
    "relay refuses negative price",
    sanitizeRelayData({ items: [{ id: "A", price: -1, quantity: 1 }] }) ===
      null,
  );
  check(
    "relay refuses absurd value",
    sanitizeRelayData({ items: [], value: 1e12 }) === null,
  );
  check(
    "relay refuses fractional qty",
    sanitizeRelayData({ items: [{ id: "A", price: 1, quantity: 1.5 }] }) ===
      null,
  );
  check(
    "relay refuses string price",
    sanitizeRelayData({ items: [{ id: "A", price: "5", quantity: 1 }] }) ===
      null,
  );
  check(
    "relay refuses other currency",
    sanitizeRelayData({ items: [], currency: "USD" }) === null,
  );
  check(
    "relay refuses too many items",
    sanitizeRelayData({
      items: Array.from({ length: 51 }, () => ({
        id: "A",
        price: 1,
        quantity: 1,
      })),
    }) === null,
  );

  // --- CAPI configuration ----------------------------------------------------
  // Next types NODE_ENV as read-only; tests flip it on purpose.
  const env = process.env as Record<string, string | undefined>;
  const savedEnv = {
    token: env.META_CAPI_ACCESS_TOKEN,
    pixel: env.META_PIXEL_ID,
    test: env.META_TEST_EVENT_CODE,
    nodeEnv: env.NODE_ENV,
    allow: env.META_CAPI_ALLOW_NON_PRODUCTION,
  };
  try {
    // --- Non-production guard: tests/dev can never reach the live pixel ----
    const allowed = meta.metaCapiAllowedInThisEnvironment;
    check("guard: NODE_ENV unset → blocked", !allowed({}));
    check(
      "guard: development → blocked",
      !allowed({ NODE_ENV: "development" }),
    );
    check("guard: test → blocked", !allowed({ NODE_ENV: "test" }));
    check("guard: production → allowed", allowed({ NODE_ENV: "production" }));
    check(
      "guard: flag=1 → allowed outside production",
      allowed({ NODE_ENV: "development", META_CAPI_ALLOW_NON_PRODUCTION: "1" }),
    );
    check(
      "guard: flag=true is not the opt-in",
      !allowed({
        NODE_ENV: "development",
        META_CAPI_ALLOW_NON_PRODUCTION: "true",
      }),
    );
    check(
      "guard: flag=0 → blocked",
      !allowed({ META_CAPI_ALLOW_NON_PRODUCTION: "0" }),
    );

    // A real-looking token + pixel id, but a non-production process.
    env.META_CAPI_ACCESS_TOKEN = "SECRET-TOKEN-xyz";
    env.META_PIXEL_ID = "1674448247520461";
    delete env.META_CAPI_ALLOW_NON_PRODUCTION;
    for (const nodeEnv of [undefined, "development", "test"]) {
      if (nodeEnv === undefined) {
        delete env.NODE_ENV;
      } else {
        env.NODE_ENV = nodeEnv;
      }
      const label = nodeEnv ?? "unset";
      const callsBefore = graphCalls.length;
      check(
        `NODE_ENV ${label} + token → not configured`,
        (await meta.resolveMetaCapiConfig()) === null,
      );
      check(
        `NODE_ENV ${label} + token → isMetaCapiConfigured false`,
        (await meta.isMetaCapiConfigured()) === false,
      );
      const blocked = await meta.sendMetaEvent({
        eventName: "AddToCart",
        eventId: `evt-guard-${label}`,
        userData: {},
      });
      const blockedPurchase =
        await meta.sendMetaPurchaseForOrder("no-such-order");
      check(
        `NODE_ENV ${label} → no request to Meta`,
        !blocked.ok && !blockedPurchase.ok && graphCalls.length === callsBefore,
        `calls=${graphCalls.length - callsBefore}`,
      );
    }
    check(
      "guard notice logged once",
      logs.filter((line) => line.includes("[meta-capi] disabled")).length === 1,
    );
    env.NODE_ENV = "development";
    env.META_CAPI_ALLOW_NON_PRODUCTION = "1";
    check(
      "flag=1 in development → configured",
      (await meta.resolveMetaCapiConfig())?.pixelId === "1674448247520461",
    );
    delete env.META_CAPI_ALLOW_NON_PRODUCTION;

    // Everything below runs as production WITHOUT the flag — the exact
    // conditions of `next start` on the server — so it also proves that
    // production behaviour is unchanged.
    env.NODE_ENV = "production";
    delete process.env.META_CAPI_ACCESS_TOKEN;
    process.env.META_PIXEL_ID = "1674448247520461";
    check(
      "no token → not configured",
      (await meta.resolveMetaCapiConfig()) === null,
    );
    const before = graphCalls.length;
    const skipped = await meta.sendMetaEvent({
      eventName: "Lead",
      eventId: "evt-none-12345",
      userData: {},
    });
    check("no token → no request", !skipped.ok && graphCalls.length === before);

    process.env.META_CAPI_ACCESS_TOKEN = "SECRET-TOKEN-xyz";
    process.env.META_TEST_EVENT_CODE = "TEST123";
    const config = await meta.resolveMetaCapiConfig();
    check("env pixel id used", config?.pixelId === "1674448247520461");

    const sent = await meta.sendMetaEvent({
      eventName: "AddToCart",
      eventId: "evt-abc-12345",
      eventSourceUrl: "https://technohouse.com.bd/product/x",
      userData: {
        email: " Someone@Example.com ",
        phone: "01712345678",
        fullName: "Rahim Uddin",
        clientIpAddress: "203.0.113.9",
        clientUserAgent: "Mozilla/5.0",
        fbp: "fb.1.1730000000000.123456789",
        fbc: "not-a-cookie",
      },
      customData: { currency: "BDT", value: 100 },
    });
    const call = graphCalls.at(-1);
    const event = firstEvent(call);
    const userData = (event.user_data ?? {}) as Record<string, unknown>;
    check("send ok", sent.ok);
    check(
      "graph url",
      call?.url === "https://graph.facebook.com/v21.0/1674448247520461/events",
    );
    check("token not in url", !call?.url.includes("SECRET"));
    check("token in body", call?.body.access_token === "SECRET-TOKEN-xyz");
    check("test_event_code", call?.body.test_event_code === "TEST123");
    check("action_source website", event.action_source === "website");
    check("event_id kept", event.event_id === "evt-abc-12345");
    check(
      "event_time unix seconds",
      typeof event.event_time === "number" &&
        (event.event_time as number) < 1e11,
    );
    check(
      "em hashed normalised",
      (userData.em as string[])?.[0] === meta.sha256("someone@example.com"),
    );
    check(
      "ph hashed as 8801…",
      (userData.ph as string[])?.[0] === meta.sha256("8801712345678"),
    );
    check("fn hashed", (userData.fn as string[])?.[0] === meta.sha256("rahim"));
    check(
      "country hashed bd",
      (userData.country as string[])?.[0] === meta.sha256("bd"),
    );
    check("ip not hashed", userData.client_ip_address === "203.0.113.9");
    check("ua not hashed", userData.client_user_agent === "Mozilla/5.0");
    check("fbp passed", userData.fbp === "fb.1.1730000000000.123456789");
    check("bad fbc dropped", userData.fbc === undefined);
    check(
      "sent logged",
      logs.some((line) =>
        line.includes("[meta-capi] sent AddToCart event_id=evt-abc-12345"),
      ),
    );
    check("token never logged", !logs.some((line) => line.includes("SECRET")));

    graphResponder = async () =>
      new Response(
        JSON.stringify({
          error: { message: "Invalid parameter", code: 100, fbtrace_id: "Abc" },
        }),
        { status: 400 },
      );
    const failed = await meta.sendMetaEvent({
      eventName: "Lead",
      eventId: "evt-fail-1234",
      userData: {},
    });
    check(
      "meta error surfaced",
      !failed.ok && failed.reason.includes("Invalid parameter"),
    );
    check(
      "failure logged",
      logs.some(
        (line) =>
          line.includes("[meta-capi] failed Lead event_id=evt-fail-1234") &&
          line.includes("code=100"),
      ),
    );

    graphResponder = async () => {
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    };
    const timedOut = await meta.sendMetaEvent({
      eventName: "Lead",
      eventId: "evt-time-1234",
      userData: {},
    });
    check(
      "timeout resolves, not throws",
      !timedOut.ok && timedOut.reason.includes("timed out"),
    );
    graphResponder = async () =>
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 });

    // --- Purchase from a real order + online-payment confirmation -----------
    const { getPrisma } = await import("@/lib/db/prisma");
    const { confirmGatewayPayment } = await import("@/lib/payments/confirm");
    const prisma = getPrisma();
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      select: { id: true, sku: true, name: true },
    });
    if (!product) {
      check("dev DB has a product", false);
      return;
    }
    const number = `TH-TRKTEST-${randomUUID().slice(0, 8)}`;
    const order = await prisma.order.create({
      data: {
        number,
        customerName: "Tracking Test",
        customerEmail: "tracking-test@techno-house.invalid",
        customerPhone: "01712345678",
        subtotalAmount: 2000,
        totalAmount: 2120,
        shippingAmount: 120,
        shippingAddress: "Test",
        fbp: "fb.1.1730000000000.987654321",
        clientIp: "198.51.100.7",
        clientUserAgent: "TestAgent/1.0",
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              sku: `${product.sku}-VARIANT-X`,
              variantName: "Blue",
              unitAmount: 1000,
              quantity: 2,
              totalAmount: 2000,
            },
          ],
        },
        payments: {
          create: {
            provider: "bkash",
            method: "bkash",
            amount: 2120,
            currency: "BDT",
          },
        },
      },
      select: { id: true },
    });
    try {
      // The path the order-placing suites hit (COD Purchase for a real
      // order row): silent outside production.
      env.NODE_ENV = "development";
      const devCalls = graphCalls.length;
      const devPurchase = await meta.sendMetaPurchaseForOrder(order.id);
      check(
        "real order Purchase in development → nothing sent",
        !devPurchase.ok && graphCalls.length === devCalls,
      );
      env.NODE_ENV = "production";

      const direct = await meta.sendMetaPurchaseForOrder(order.id);
      const purchase = firstEvent(graphCalls.at(-1));
      const custom = (purchase.custom_data ?? {}) as Record<string, unknown>;
      const pUser = (purchase.user_data ?? {}) as Record<string, unknown>;
      check("purchase sent", direct.ok);
      check("purchase event_id = order number", purchase.event_id === number);
      check(
        "purchase content_ids = parent sku",
        JSON.stringify(custom.content_ids) === JSON.stringify([product.sku]),
      );
      check(
        "purchase value from DB",
        custom.value === 2120 && custom.currency === "BDT",
      );
      check("purchase num_items", custom.num_items === 2);
      check("purchase order_id", custom.order_id === number);
      check(
        "purchase source url",
        String(purchase.event_source_url).endsWith(
          `/checkout/confirmation?order=${encodeURIComponent(number)}`,
        ),
      );
      check(
        "purchase stored ip/ua/fbp",
        pUser.client_ip_address === "198.51.100.7" &&
          pUser.client_user_agent === "TestAgent/1.0" &&
          pUser.fbp === "fb.1.1730000000000.987654321",
      );

      const beforeConfirm = graphCalls.length;
      const confirmed = await confirmGatewayPayment({
        provider: "bkash",
        orderNumber: number,
        transactionRef: `TRX-${randomUUID().slice(0, 8)}`,
        amount: 2120,
        currency: "BDT",
      });
      check("gateway confirm ok", confirmed.ok && confirmed.paid);
      const arrived = await waitFor(
        () => graphCalls.length === beforeConfirm + 1,
      );
      check(
        "PAID sends exactly one Purchase",
        arrived,
        `calls=${graphCalls.length - beforeConfirm}`,
      );
      check(
        "PAID purchase id",
        firstEvent(graphCalls.at(-1)).event_id === number,
      );

      const payment = await prisma.payment.findFirst({
        where: { orderId: order.id },
        select: { transactionRef: true },
      });
      const replayBefore = graphCalls.length;
      const replay = await confirmGatewayPayment({
        provider: "bkash",
        orderNumber: number,
        transactionRef: payment?.transactionRef ?? "",
        amount: 2120,
        currency: "BDT",
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      check("replayed callback ok", replay.ok);
      check(
        "replayed callback sends nothing",
        graphCalls.length === replayBefore,
      );
    } finally {
      await prisma.order.delete({ where: { id: order.id } });
    }

    // Admin "enabled" switch is not consulted: with the env pixel unset, the
    // DB pixel id is used whatever its isEnabled says.
    delete process.env.META_PIXEL_ID;
    const metaRow = await prisma.analyticsConfiguration.findUnique({
      where: { provider: "META_PIXEL" },
      select: { publicId: true, isEnabled: true },
    });
    const dbConfig = await meta.resolveMetaCapiConfig();
    if (metaRow?.publicId) {
      check(
        "falls back to DB pixel id regardless of enabled",
        dbConfig?.pixelId === metaRow.publicId,
      );
    } else {
      check("no env + no DB pixel → not configured", dbConfig === null);
    }
  } finally {
    for (const [key, value] of [
      ["META_CAPI_ACCESS_TOKEN", savedEnv.token],
      ["META_PIXEL_ID", savedEnv.pixel],
      ["META_TEST_EVENT_CODE", savedEnv.test],
      ["NODE_ENV", savedEnv.nodeEnv],
      ["META_CAPI_ALLOW_NON_PRODUCTION", savedEnv.allow],
    ] as const) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  }

  // --- feed pricing ----------------------------------------------------------
  const yesterday = new Date(Date.now() - 86_400_000);
  const tomorrow = new Date(Date.now() + 86_400_000);
  const active = effectiveStorefrontPricing({
    priceAmount: 900,
    compareAtAmount: 1000,
    discountStartsAt: yesterday,
    discountEndsAt: tomorrow,
    isSale: true,
  });
  check(
    "window active: sale 900 regular 1000",
    active.discountActive &&
      active.priceAmount === 900 &&
      active.compareAtAmount === 1000,
  );
  const expired = effectiveStorefrontPricing({
    priceAmount: 900,
    compareAtAmount: 1000,
    discountStartsAt: null,
    discountEndsAt: yesterday,
    isSale: true,
  });
  check(
    "window over: charged 1000, no sale",
    !expired.discountActive && expired.priceAmount === 1000,
  );

  const { listFeedProducts } = await import("@/lib/analytics/feeds");
  const { getPrisma } = await import("@/lib/db/prisma");
  const [feedProducts, activeCount] = await Promise.all([
    listFeedProducts(),
    getPrisma().product.count({ where: { isActive: true } }),
  ]);
  check(
    "feed lists every active product",
    feedProducts.length === activeCount,
    `${feedProducts.length} vs ${activeCount}`,
  );
  check(
    "feed: sale price only below regular",
    feedProducts.every(
      (p) =>
        p.salePriceAmount === null || p.salePriceAmount < p.regularPriceAmount,
    ),
  );
  check(
    "feed: charged price = sale or regular",
    feedProducts.every(
      (p) => p.priceAmount === (p.salePriceAmount ?? p.regularPriceAmount),
    ),
  );
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(() => {
    console.info = realInfo;
    console.warn = realWarn;
    console.log(`\n${passes} passed, ${failures} failed`);
    process.exit(failures > 0 ? 1 : 0);
  });
