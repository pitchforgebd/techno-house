/**
 * Live alert check (AD-367): an admin save must show its alert, not crash.
 *
 *   npm run test:toast-live        (needs `npm run dev` on http://localhost:3000)
 *
 * AD-364 gave the storefront its own alert transition and, by passing
 * `transition={undefined}` on /admin, accidentally replaced react-toastify's
 * default with nothing. Every admin save then rendered a toast with no
 * transition, React threw "Element type is invalid", and the whole app dropped
 * into "The site could not load". A source check cannot prove a render works,
 * so this drives a real browser:
 *   1. sign in to the local admin with the demo staff account from prisma/seed.ts,
 *      click Save on Appearance and expect the alert and no error page;
 *   2. on the storefront trigger an alert (wishlist) and watch it enter with the
 *      jump-up class and leave again.
 *
 * It refuses to run against anything but localhost (it types the demo password),
 * and SKIPS, with exit 0 and a loud line, when there is no dev server, no Chrome
 * or no demo staff account — like the live part of `test:routes`.
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function skip(reason) {
  console.log(`skip — ${reason}; the live alert checks did NOT run`);
  process.exit(0);
}

const host = new URL(BASE).hostname;
if (host !== "localhost" && host !== "127.0.0.1") {
  skip(`BASE_URL is ${host}, not localhost (the demo staff password is never typed into a real site)`);
}
try {
  // Patient on purpose: a dev server that is still compiling answers slowly, and a
  // slow answer must run the checks, not skip them.
  await fetch(BASE, { signal: AbortSignal.timeout(90000) });
} catch {
  skip(`dev server not reachable at ${BASE}`);
}
if (!existsSync(CHROME)) {
  skip(`Chrome not found at ${CHROME} (set CHROME_PATH)`);
}

let checks = 0;
let failures = 0;
function check(name, ok, extra = "") {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.error(`fail ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error.message).slice(0, 160)));

  // --- 1. admin: sign in and save -------------------------------------------------------
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 240000 });
  await page.type('input[type="email"], input[name="email"]', "ops@techno-house.demo");
  await page.type('input[type="password"]', "Demo-Staff-Only-11!");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await sleep(1000);
  const path = new URL(page.url()).pathname;
  if (!(path === "/admin" || path.startsWith("/admin/")) || path.includes("/access/")) {
    skip("the demo staff account could not sign in (run `npm run db:seed` on a local database, or wait out the sign-in rate limit after many logins)");
  }

  await page.goto(`${BASE}/admin/design-studio/appearance`, { waitUntil: "networkidle2", timeout: 240000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const saveButton = await page.evaluateHandle(() =>
    // "Save changes" (colours) is disabled until something is edited; the watermark
    // form's button is "Update" and is always enabled — either one raises an alert.
    [...document.querySelectorAll("button")].find((b) => b.offsetParent && !b.disabled && /^(save|update)/i.test(b.textContent.trim())),
  );
  check("the admin Appearance page has an enabled Save button", Boolean(saveButton.asElement()));
  if (saveButton.asElement()) {
    errors.length = 0;
    await saveButton.asElement().click();
    await sleep(2500);
    const text = await page.evaluate(() => document.body.innerText);
    const toast = await page.evaluate(() => document.querySelector(".Toastify__toast")?.textContent?.trim() ?? "");
    check("an admin save does not drop the app into the global error page", !/The site could not load/.test(text));
    check("an admin save shows its alert", toast.length > 0, `alert text: ${JSON.stringify(toast)}`);
    check("an admin save raises no page error", errors.length === 0, errors.join(" | "));
  }

  // --- 2. storefront: an alert enters with the jump-up class and leaves again ----------------
  const shop = await browser.newPage();
  await shop.setViewport({ width: 1440, height: 1000 });
  const shopErrors = [];
  shop.on("pageerror", (error) => shopErrors.push(String(error.message).slice(0, 160)));
  await shop.goto(`${BASE}/shop`, { waitUntil: "networkidle2", timeout: 240000 });
  await shop.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await shop.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  const clicked = await shop.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => /wishlist/i.test(b.getAttribute("aria-label") ?? ""));
    if (!button) return false;
    button.click();
    return true;
  });
  check("the shop has a wishlist button to raise an alert with", clicked);
  if (clicked) {
    let sawJumpClass = false;
    for (let i = 0; i < 12 && !sawJumpClass; i += 1) {
      await sleep(120);
      sawJumpClass = await shop.evaluate(() => Boolean(document.querySelector(".Toastify__toast.th-toast-jump-in, .Toastify__toast.th-toast-jump-out")));
    }
    check("a storefront alert enters with the jump-up transition", sawJumpClass);
    let gone = false;
    for (let i = 0; i < 30 && !gone; i += 1) {
      await sleep(300);
      gone = await shop.evaluate(() => document.querySelector(".Toastify__toast") === null);
    }
    check("...and leaves the page again after its exit transition", gone);
    check("a storefront alert raises no page error", shopErrors.length === 0, shopErrors.join(" | "));
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\ntoast live: ${failures} of ${checks} checks FAILED`);
  process.exit(1);
}
console.log(`toast live ok — ${checks} checks`);
