/**
 * Standalone build-quote HTML for Puppeteer to print to PDF
 * (`lib/orders/invoice-pdf.ts`'s `renderInvoicePdf` — that function has no
 * order-specific logic, so it's reused as-is rather than launching a second
 * Chromium pool).
 *
 * Deliberately plain inline CSS, not the site's Tailwind build — this
 * renders via `page.setContent()`, never navigating the live site.
 */
import { formatMoney } from "@/lib/format/currency";
import { publicOrigin } from "@/lib/seo/public-origin";

/** Puppeteer's `page.setContent()` has no page URL of its own, so a
 * relative `/uploads/...` logo path would never resolve — make it absolute. */
function absoluteAssetUrl(src: string): string {
  return src.startsWith("/") ? `${publicOrigin()}${src}` : src;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BuildQuoteLine = {
  slotLabel: string;
  productName: string;
  sku: string;
  unitAmount: number;
};

export type BuildQuoteStore = {
  storeName: string;
  supportEmail: string;
  phone: string;
  address: string;
  city: string;
  logoSrc: string | null;
};

export function renderBuildQuoteHtml(input: {
  buildName: string;
  generatedAt: string;
  lines: BuildQuoteLine[];
  subtotalAmount: number;
  store: BuildQuoteStore;
}): string {
  const { buildName, generatedAt, lines, subtotalAmount, store } = input;
  const storeAddressLine = [store.address, store.city].filter(Boolean).join(", ");

  const rows = lines
    .map(
      (line, index) => `
        <tr>
          <td class="cell num">${index + 1}</td>
          <td class="cell">${escapeHtml(line.slotLabel)}</td>
          <td class="cell desc">
            <div class="product-name">${escapeHtml(line.productName)}</div>
            <div class="product-sub">${escapeHtml(line.sku)}</div>
          </td>
          <td class="cell money">${formatMoney({ amount: line.unitAmount })}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, "Helvetica Neue", sans-serif;
    color: #111827;
    margin: 0;
    padding: 24px;
    font-size: 13px;
  }
  .sheet { border: 2px solid #111827; padding: 20px 24px; }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid #111827;
    padding-bottom: 12px;
  }
  .store-block { display: flex; gap: 10px; }
  .store-logo { height: 48px; width: auto; object-fit: contain; }
  .store-name { font-size: 20px; font-weight: bold; margin: 0 0 2px; }
  .store-meta { font-size: 11.5px; color: #374151; margin: 0; line-height: 1.5; max-width: 320px; }
  .meta-right { text-align: right; font-size: 12px; }
  .meta-right p { margin: 0; }
  .meta-right .label { font-weight: bold; }
  .quote-title { padding: 14px 0 4px; }
  .quote-title h1 { margin: 0; font-size: 18px; }
  .quote-title p { margin: 2px 0 0; font-size: 11.5px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th {
    background: #f3f4f6;
    border: 1px solid #9ca3af;
    padding: 6px 8px;
    font-size: 12px;
    text-align: left;
  }
  .cell { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
  .cell.num { text-align: center; width: 32px; }
  .cell.money { text-align: right; white-space: nowrap; width: 110px; }
  .product-name { font-weight: 600; }
  .product-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .totals { margin-top: 10px; display: flex; justify-content: flex-end; }
  .totals-box { min-width: 240px; }
  .totals-box .row {
    display: flex;
    justify-content: space-between;
    border: 1px solid #111827;
    border-top: 2px solid #111827;
    padding: 6px 10px;
    font-weight: bold;
    font-size: 14px;
  }
  .footer-note { margin-top: 24px; text-align: center; font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="store-block">
        ${store.logoSrc ? `<img class="store-logo" src="${escapeHtml(absoluteAssetUrl(store.logoSrc))}" alt="" />` : ""}
        <div>
          <p class="store-name">${escapeHtml(store.storeName)}</p>
          <p class="store-meta">
            ${escapeHtml(storeAddressLine)}${storeAddressLine ? "<br/>" : ""}
            ${store.supportEmail ? `Email: ${escapeHtml(store.supportEmail)}<br/>` : ""}
            ${store.phone ? `Phone: ${escapeHtml(store.phone)}` : ""}
          </p>
        </div>
      </div>
      <div class="meta-right">
        <p><span class="label">Generated</span> : ${escapeHtml(generatedAt)}</p>
      </div>
    </div>

    <div class="quote-title">
      <h1>${escapeHtml(buildName)}</h1>
      <p>PC Builder quote — prices shown are indicative and are not a charge. Stock and price are rechecked at checkout.</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Slot</th>
          <th>Part</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="row"><span>Total</span><span>${formatMoney({ amount: subtotalAmount })}</span></div>
      </div>
    </div>

    <p class="footer-note">Generated from ${escapeHtml(store.storeName)} PC Builder.</p>
  </div>
</body>
</html>`;
}
