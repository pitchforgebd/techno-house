import fs from "node:fs";

const files = [
  "features/home/home-content.tsx",
  "lib/admin/settings-mock.ts",
  "lib/admin/analytics-mock.ts",
  "features/admin/admin-dashboard.tsx",
  "features/admin/settings/admin-currency-settings.tsx",
  "features/catalog/shop-listing.tsx",
  "lib/cart/coupons.ts",
  "lib/format/currency.ts",
  "features/home/home-hero-slider.tsx",
  "features/catalog/product-card.tsx",
];

const takaOk = Buffer.from([0xe0, 0xa7, 0xb3]);
// UTF-8 encoding of the three Latin-1 chars à § ³ (mojibake of ৳)
const takaMoji = Buffer.from([0xc3, 0xa0, 0xc2, 0xa7, 0xc2, 0xb3]);
// UTF-8 of mojibake em dash sequence â€”
const emDashMoji = Buffer.from([0xc3, 0xa2, 0xe2, 0x82, 0xac, 0xe2, 0x80, 0x9d]);
// Correct em dash —
const emDashOk = Buffer.from([0xe2, 0x80, 0x94]);
// Mojibake middle dot Â·
const midMoji = Buffer.from([0xc3, 0x82, 0xc2, 0xb7]);
const midOk = Buffer.from([0xc2, 0xb7]);

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("missing", f);
    continue;
  }
  const buf = fs.readFileSync(f);
  console.log(
    f,
    "| takaOk",
    buf.includes(takaOk),
    "takaMoji",
    buf.includes(takaMoji),
    "emOk",
    buf.includes(emDashOk),
    "emMoji",
    buf.includes(emDashMoji),
    "midOk",
    buf.includes(midOk),
    "midMoji",
    buf.includes(midMoji),
  );
}
