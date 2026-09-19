/**
 * Renders invoice HTML (invoice-html.ts) to a PDF buffer via a headless
 * Chromium instance.
 *
 * The browser is launched once and kept alive for the life of the Node
 * process — each call opens and closes its own page/tab rather than
 * launching a fresh browser, which on a small VPS is the difference between
 * ~50ms and ~1-2s (plus a memory spike) per invoice. `--disable-dev-shm-usage`
 * matters specifically on small VPS instances, where the default /dev/shm
 * size is too small for Chromium's shared memory and it otherwise crashes
 * mid-render.
 */
import puppeteer, { type Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      })
      .catch((error) => {
        // A failed launch must not poison future attempts — clear the cache
        // so the next call retries instead of forever rejecting with this
        // same error.
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
}

export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // setContent()'s waitUntil only supports "load"/"domcontentloaded" (no
    // networkidle*, unlike goto()) — "load" still waits for the logo <img>
    // to finish fetching, since nothing here mutates the DOM after parse.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
