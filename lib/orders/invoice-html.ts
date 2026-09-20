/**
 * Standalone invoice HTML for Puppeteer to print to PDF (invoice-pdf.ts).
 *
 * Deliberately plain inline CSS, not the site's Tailwind build — this
 * renders via `page.setContent()`, never navigating the live site, so no
 * compiled stylesheet is available to it. Layout follows the printed
 * quotation-style template the store already uses elsewhere: logo + store
 * block and QR + invoice number on one header row, a numbered item table,
 * and a totals block with the amount spelled out in words.
 */
import { amountInWordsBdt } from "@/lib/format/amount-in-words";
import { formatMoney } from "@/lib/format/currency";
import type { AdminInvoice } from "@/lib/orders/admin-invoice";
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

export function renderInvoiceHtml(
  invoice: AdminInvoice,
  qrDataUrl: string,
  options: { paid: boolean },
): string {
  const store = invoice.store;
  const storeAddressLine = [store.address, store.city]
    .filter(Boolean)
    .join(", ");
  const stampLabel = options.paid ? "PAID" : "UNPAID";
  const stampColor = options.paid ? "#15803d" : "#b91c1c";

  const rows = invoice.lines
    .map((line, index) => {
      const sub = [line.colorName ? `Colour: ${line.colorName}` : null, line.sku]
        .filter(Boolean)
        .join(" · ");
      return `
        <tr>
          <td class="cell num">${index + 1}</td>
          <td class="cell desc">
            <div class="product-name">${escapeHtml(line.productName)}</div>
            ${sub ? `<div class="product-sub">${escapeHtml(sub)}</div>` : ""}
          </td>
          <td class="cell num">${line.quantity.toFixed(2)}</td>
          <td class="cell">Pcs.</td>
          <td class="cell money">${formatMoney({ amount: line.unitAmount })}</td>
          <td class="cell money">${formatMoney({ amount: line.totalAmount })}</td>
        </tr>`;
    })
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
  .sheet {
    border: 2px solid #111827;
    padding: 20px 24px;
    position: relative;
  }
  .stamp {
    position: absolute;
    top: 210px;
    right: 30px;
    transform: rotate(-18deg);
    border: 4px solid ${stampColor};
    color: ${stampColor};
    font-weight: bold;
    font-size: 26px;
    letter-spacing: 3px;
    padding: 3px 14px;
    border-radius: 8px;
    opacity: 0.8;
    z-index: 5;
  }
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
  .meta-right .qr { width: 70px; height: 70px; margin-bottom: 6px; }
  .meta-right p { margin: 0; }
  .meta-right .label { font-weight: bold; }
  .bill-to { padding: 14px 0; }
  .bill-to p { margin: 2px 0; }
  .bill-to .heading { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th {
    background: #f3f4f6;
    border: 1px solid #9ca3af;
    padding: 6px 8px;
    font-size: 12px;
    text-align: left;
  }
  .cell { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
  .cell.num { text-align: center; width: 40px; }
  .cell.money { text-align: right; white-space: nowrap; }
  .product-name { font-weight: 600; }
  .product-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .totals { margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .in-word { font-size: 12px; max-width: 320px; }
  .in-word .heading { font-weight: bold; }
  .totals-box { min-width: 240px; }
  .totals-box .row { display: flex; justify-content: space-between; border: 1px solid #d1d5db; border-top: none; padding: 4px 10px; }
  .totals-box .row:first-child { border-top: 1px solid #d1d5db; }
  .totals-box .row.grand { font-weight: bold; border: 1px solid #111827; border-top: 2px solid #111827; font-size: 14px; }
  .footer-note { margin-top: 24px; text-align: center; font-size: 11px; color: #6b7280; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="stamp">${stampLabel}</div>
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
        ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="" />` : ""}
        <p><span class="label">Invoice No.</span> : ${escapeHtml(invoice.number)}</p>
        <p><span class="label">Date</span> : ${escapeHtml(invoice.placedAt)}</p>
      </div>
    </div>

    <div class="bill-to">
      <p class="heading">Bill to,</p>
      <p>${escapeHtml(invoice.customerName)}</p>
      <p>${escapeHtml(invoice.shippingAddress)}</p>
      <p>${escapeHtml(invoice.customerPhone)}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Product Description</th>
          <th>Qty.</th>
          <th>Unit</th>
          <th>Price/Unit</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="in-word">
        <span class="heading">In Word :</span>
        ${escapeHtml(amountInWordsBdt(invoice.totalAmount))}
      </div>
      <div class="totals-box">
        <div class="row"><span>Subtotal</span><span>${formatMoney({ amount: invoice.subtotalAmount })}</span></div>
        ${invoice.discountAmount > 0 ? `<div class="row"><span>Discount</span><span>−${formatMoney({ amount: invoice.discountAmount })}</span></div>` : ""}
        ${invoice.adminDiscountAmount > 0 ? `<div class="row"><span>Confirmation discount</span><span>−${formatMoney({ amount: invoice.adminDiscountAmount })}</span></div>` : ""}
        <div class="row"><span>Shipping</span><span>${formatMoney({ amount: invoice.shippingAmount })}</span></div>
        ${invoice.serviceChargeAmount > 0 ? `<div class="row"><span>Service charge</span><span>${formatMoney({ amount: invoice.serviceChargeAmount })}</span></div>` : ""}
        ${invoice.taxAmount > 0 ? `<div class="row"><span>Tax / VAT</span><span>${formatMoney({ amount: invoice.taxAmount })}</span></div>` : ""}
        <div class="row grand"><span>Grand Total</span><span>${formatMoney({ amount: invoice.totalAmount })}</span></div>
      </div>
    </div>

    <p class="footer-note">Thank you for shopping with ${escapeHtml(store.storeName)}.</p>
  </div>
</body>
</html>`;
}
