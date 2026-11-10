/**
 * Admin product form: the "SEO meta tags" card really saves (SEO phase 8).
 *
 *   ADMIN_LOGIN_SLUG=th-test-slug-9 <start a production build on :3200 with that env>
 *   npx tsx scripts/seo/check-admin-product-meta.ts --base=http://127.0.0.1:3200 --slug=<product slug> --login-slug=th-test-slug-9
 *
 * LOCAL / THROWAWAY DATABASE ONLY: it signs in with the demo staff account from
 * prisma/seed.ts, edits one product through the real form and changes its
 * metaTitle / metaDescription / seoSource, and it refuses to run unless the
 * database name contains "test" or "dev".
 *
 * Checks (headless Chrome): the generated suggestion is the placeholder; the
 * counters count; typing + saving stores the text with source 'admin'; the form
 * shows it again after a reload and the storefront renders it; saving an
 * untouched form keeps a 'generated' source; clearing both fields removes the
 * stored text and the page falls back to the template.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const base = (arg("base") ?? "http://127.0.0.1:3200").replace(/\/$/, "");
  const slug = arg("slug");
  const loginSlug = arg("login-slug");
  if (!slug || !loginSlug) throw new Error("--slug=<product slug> and --login-slug=<ADMIN_LOGIN_SLUG> are required.");
  const dbName = new URL(process.env.DATABASE_URL ?? "postgres://x/").pathname.replace(/^\//, "");
  if (!/test|dev/i.test(dbName)) throw new Error(`Refusing to run against database "${dbName}".`);

  const { getPrisma } = await import("@/lib/db/prisma");
  const prisma = getPrisma();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!product) throw new Error(`No product with slug ${slug}.`);
  const stored = () => prisma.product.findUnique({ where: { id: product.id }, select: { metaTitle: true, metaDescription: true, seoSource: true, seoGeneratedAt: true } });
  await prisma.product.update({ where: { id: product.id }, data: { metaTitle: null, metaDescription: null, seoSource: null, seoGeneratedAt: null, seoKeyword: null } });

  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 1400, height: 1000 });
    await tab.goto(`${base}/admin/access/${loginSlug}`, { waitUntil: "networkidle0", timeout: 60_000 });
    await tab.type('input[type="email"], input[name="email"]', "ops@techno-house.demo");
    await tab.type('input[type="password"]', "Demo-Staff-Only-11!");
    await tab.keyboard.press("Enter");
    await tab.waitForFunction(() => !location.pathname.includes("/access/"), { timeout: 30_000 }).catch(() => undefined);
    check("signed in to the admin", !tab.url().includes("/access/"), tab.url());

    const open = async () => {
      await tab.goto(`${base}/admin/products/${product.id}`, { waitUntil: "networkidle0", timeout: 60_000 });
      await tab.waitForSelector("#seo-title", { timeout: 30_000 });
    };
    const value = (selector: string) => tab.$eval(selector, (el) => (el as HTMLInputElement).value);
    const placeholder = (selector: string) => tab.$eval(selector, (el) => (el as HTMLInputElement).placeholder);
    const setField = async (selector: string, text: string) => {
      await tab.click(selector);
      await tab.keyboard.down("Control");
      await tab.keyboard.press("KeyA");
      await tab.keyboard.up("Control");
      await tab.keyboard.press("Backspace");
      if (text) await tab.type(selector, text);
    };
    const save = async () => {
      await tab.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((b) => /Save & publish/.test(b.textContent ?? ""));
        (button as HTMLButtonElement | undefined)?.click();
      });
      await sleep(4000);
    };
    const storefrontTitle = async () => {
      const html = await (await fetch(`${base}/product/${slug}`, { headers: { "User-Agent": "Googlebot" } })).text();
      return (html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/&amp;/g, "&");
    };

    // 1. suggestion + counters
    await open();
    const suggestion = await placeholder("#seo-title");
    const templateTitle = await storefrontTitle();
    check("empty title field shows the generated suggestion as placeholder", /Price in (Bangladesh|BD)/.test(suggestion) && suggestion.length <= 60, suggestion);
    check("description placeholder is the generated text (120-155 chars)", (await placeholder("#seo-description")).length >= 120 && (await placeholder("#seo-description")).length <= 155);
    const bodyText = () => tab.evaluate(() => document.body.innerText);
    check("counters start at 0 / 60 and 0 / 155", /0 \/ 60/.test(await bodyText()) && /0 \/ 155/.test(await bodyText()));

    // 2. type by hand, save
    const typedTitle = "Hand typed meta title for the test";
    const typedDescription = "Hand typed meta description. It is used exactly as written, no template.";
    await setField("#seo-title", typedTitle);
    await setField("#seo-description", typedDescription);
    check("counter follows typing", new RegExp(`${typedTitle.length} / 60`).test(await bodyText()) && new RegExp(`${typedDescription.length} / 155`).test(await bodyText()));
    await save();
    let row = await stored();
    check("saved metaTitle / metaDescription", row?.metaTitle === typedTitle && row?.metaDescription === typedDescription, JSON.stringify(row));
    check("seoSource is 'admin' for hand-typed text", row?.seoSource === "admin" && row?.seoGeneratedAt === null, JSON.stringify(row));
    await open();
    check("form shows the saved text after a reload", (await value("#seo-title")) === typedTitle && (await value("#seo-description")) === typedDescription);
    check("storefront <title> is the typed title", (await storefrontTitle()) === typedTitle, await storefrontTitle());

    // 3. an untouched save keeps a generated source
    await prisma.product.update({ where: { id: product.id }, data: { metaTitle: "Generated title X Price in BD", metaDescription: "Generated description text.", seoSource: "generated", seoGeneratedAt: new Date(), seoKeyword: "x" } });
    await open();
    await save();
    row = await stored();
    check("saving an untouched form keeps seoSource 'generated'", row?.seoSource === "generated" && row?.metaTitle === "Generated title X Price in BD" && row?.seoGeneratedAt !== null, JSON.stringify(row));
    await open();
    await setField("#seo-description", "Edited by hand after generation.");
    await save();
    row = await stored();
    check("editing a generated field marks it 'admin'", row?.seoSource === "admin" && row?.metaDescription === "Edited by hand after generation.", JSON.stringify(row));

    // 4. clear both -> template again
    await open();
    await setField("#seo-title", "");
    await setField("#seo-description", "");
    await save();
    row = await stored();
    check("clearing both fields removes the stored meta and source", row?.metaTitle === null && row?.metaDescription === null && row?.seoSource === null, JSON.stringify(row));
    check("storefront is back to the template title", (await storefrontTitle()) === templateTitle, `${await storefrontTitle()} vs ${templateTitle}`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log(failures === 0 ? `ok ${checks} admin-product-meta checks` : `failed ${failures}/${checks} admin-product-meta checks`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
