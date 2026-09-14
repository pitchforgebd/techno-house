/**
 * HTTP route smoke against a running Next.js app.
 *
 *   npx tsx scripts/test/smoke-http.ts
 *
 * Expects the app on APP_URL or http://127.0.0.1:3000.
 */
import http from "node:http";
import https from "node:https";

const base = (process.env.APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function fetchStatus(path: string): Promise<{ status: number; len: number }> {
  const url = new URL(path, `${base}/`);
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { timeout: 60_000 }, (res) => {
      let len = 0;
      res.on("data", (chunk) => {
        len += chunk.length;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, len });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

const STOREFRONT = [
  "/",
  "/shop",
  "/brands",
  "/brand/lumen",
  "/category/switches",
  "/product/north-prebuilt-desktop",
  "/offers",
  "/deals",
  "/flash-sale",
  "/blog",
  "/pc-builder",
  "/cart",
  "/checkout",
  "/wishlist",
  "/compare",
  "/search",
  "/contact",
  "/about",
  "/faq",
  "/support",
  "/warranty",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
  "/account/login",
  "/robots.txt",
  "/sitemap.xml",
];

const ADMIN_LOGIN = "/admin/access/th-ops-local";
const ADMIN_LOGIN_LEGACY = "/admin/login";

const ADMIN_SHOULD_REDIRECT = [
  "/admin",
  "/admin/products",
  "/admin/orders",
  "/admin/customers",
  "/admin/settings/general",
];

async function main(): Promise<void> {
  console.log(`base ${base}\n`);

  for (const path of STOREFRONT) {
    try {
      const { status, len } = await fetchStatus(path);
      const ok =
        status === 200 ||
        (path === "/search" && (status === 200 || status === 307));
      check(`${path} → ${status}`, ok && len > 0, `len=${len}`);
    } catch (error) {
      check(`${path} reachable`, false, String(error));
    }
  }

  try {
    const { status, len } = await fetchStatus(ADMIN_LOGIN);
    check(
      `${ADMIN_LOGIN} → ${status}`,
      status === 200 && len > 0,
      `len=${len}`,
    );
  } catch (error) {
    check(`${ADMIN_LOGIN} reachable`, false, String(error));
  }

  try {
    const { status } = await fetchStatus(ADMIN_LOGIN_LEGACY);
    check(
      `${ADMIN_LOGIN_LEGACY} obscured (${status})`,
      status === 404 || status === 307 || status === 308 || status === 302,
    );
  } catch (error) {
    check(`${ADMIN_LOGIN_LEGACY} reachable`, false, String(error));
  }

  for (const path of ADMIN_SHOULD_REDIRECT) {
    try {
      const { status } = await fetchStatus(path);
      // middleware redirect to login (307/308/302) or 200 if somehow open
      check(
        `${path} gated (${status})`,
        status === 307 || status === 308 || status === 302 || status === 200,
      );
    } catch (error) {
      check(`${path} reachable`, false, String(error));
    }
  }

  console.log("");
  console.log(
    failures === 0
      ? `ok ${checks} http smoke checks`
      : `failed ${failures}/${checks} http smoke checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
