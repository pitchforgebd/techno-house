# Techno House: Data Layer + Meta Conversions API

এই ফাইলটা Claude Code-এর জন্য। technohouse.com.bd (Next.js) সাইটে GA4 ecommerce
data layer আর Meta Conversions API (CAPI) চালু করার নির্দেশনা। এটা UniBaazar-এর
`DATA_LAYER_ENABLE.md` থেকে বানানো, তবে Techno House-এর বর্তমান সেটআপ অনুযায়ী
বদলানো। দুটোর মধ্যে মিল না থাকলে **এই ফাইলের নিয়মই মানতে হবে**।

---

## ০. Techno House-এর বর্তমান অবস্থা (এগুলো ভাঙা যাবে না)

- সাইটে **Google Tag Manager** চালু আছে, admin থেকে বসানো।
- GTM-এর ভেতরে আছে:
  - **GA4 Config** (Google Tag), trigger: All Pages
  - **Meta Pixel - Base** (Meta-র অফিশিয়াল template), Pixel ID `1674448247520461`, PageView, trigger: All Pages। "Meta-enabled Conversions API integration" opt-in করা আছে।
- Admin → Marketing Analytics → Meta Pixel: Pixel ID রাখা যায়। GTM চালু থাকলে admin নিজে pixel বসায় না। এটা `/feeds/facebook.xml` ফিডও চালু করে।
- Admin-এর নীতি: **access token database-এ রাখা হয় না।** CAPI token তাই environment variable-এ যাবে।

### এই কারণে UniBaazar গাইড থেকে যা বাদ বা বদল

| UniBaazar গাইডে                                   | Techno House-এ                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| সরাসরি GA4 (`ubGtag`, `&l=ubGtagLayer`, gtag.js)  | **বাদ।** GA4 শুধু GTM দিয়ে চলবে। কোড শুধু `dataLayer`-এ push করবে।                    |
| `startPixels()` দিয়ে কোড থেকে Meta pixel load    | **বাদ।** Meta pixel শুধু GTM দিয়ে। কোডে `fbq` লোড বা `fbq(...)` কল করা যাবে না।        |
| TikTok / Pinterest / Snap                         | **বাদ** (পরে লাগলে আলাদা কাজ)।                                                          |
| Consent Mode + cookie banner বাধ্যতামূলক          | সাইটে আগে থেকে cookie banner থাকলে সেটা মানো। না থাকলে নতুন banner বানাবে না, সব event যাবে। |
| `affiliation: "UniBaazar"`                        | `affiliation: "Techno House"`                                                           |
| `item_id` = variant SKU                           | `item_id` = **`/feeds/facebook.xml` ফিডে যে id আছে ঠিক সেটাই** (ফিডের কোড দেখে মেলাও)। |

---

## ১. ধাপ ১: আগে অডিট, কোড বদলানোর আগে

কিছু লেখার আগে এগুলো খুঁজে আমাকে রিপোর্ট দাও, তারপর থামো:

1. GTM snippet কোথায় render হয় (কোন layout/component), আর `window.dataLayer` আগে থেকে কোথাও push হয় কিনা।
2. সাইটে আগে থেকে কোনো `fbq`, `gtag`, `dataLayer.push`, tracking helper আছে কিনা। থাকলে কোথায়, কী পাঠায়।
3. Cookie/consent banner আছে কিনা।
4. এই জায়গাগুলোর ফাইল: product page, shop/category/brand list, product card click, add to cart, remove from cart, cart page, wishlist, checkout page, order submit (server action বা API route), order success page, search, registration, login, WhatsApp/call বাটন।
5. Order কোথায় তৈরি হয় (server-side ফাইল), database কী (Prisma/Drizzle/raw SQL/অন্য), order table-এ কী কী column আছে।
6. `/feeds/facebook.xml` কোন ফাইলে বানানো হয়, আর প্রতিটা item-এর `id` কোন field থেকে আসে।
7. Product-এর price, sale price, brand, category (parent → child) কোন field-এ থাকে।
8. CSP (Content-Security-Policy) header আছে কিনা, থাকলে GTM আর `connect.facebook.net` allow করা কিনা।

রিপোর্ট দেওয়ার পর আমার অনুমতি নিয়ে ধাপ ২ শুরু করবে।

---

## ২. ধাপ ২: browser-side `track()` (শুধু dataLayer)

`src/lib/tracking/` (বা প্রজেক্টের convention অনুযায়ী জায়গায়) একটা TypeScript module:

### `track(name, data, eventId?)`

- `eventId` না দিলে `crypto.randomUUID()`।
- ecommerce event হলে আগে `dataLayer.push({ ecommerce: null })`, তারপর push।
- প্রতিটা push-এ থাকবে:
  - `event`: GA4 নাম (নিচের টেবিল)
  - `event_id`: id
  - `ecommerce`: GA4 ফরম্যাট (UniBaazar গাইডের `toGa4()` যেমন)
  - `meta`: `{ event: "<Meta নাম>", params: {...} }`, শুধু যে event-এর Meta নাম আছে। params UniBaazar গাইডের `toMeta()` যেমন (`currency`, `value`, `content_type`, `content_ids`, `contents`, `num_items`, `content_name`, `search_string`, `order_id`)।
- Meta-যোগ্য event হলে (নিচে "Server relay" কলাম) `/api/tracking`-এ `fetch(..., { keepalive: true })` দিয়ে `{ name, eventId, relay: { url, items, value, currency, searchTerm, fbp, fbc } }` পাঠাবে। ব্যর্থ হলে চুপচাপ ignore।
- `PageView`: dataLayer-এ push করবে না (GA4 আর Meta-র PageView GTM নিজেই পাঠায়)।
- SSR-এ (`typeof window === "undefined"`) কিছুই করবে না।

### Event তালিকা

| `track()` নাম          | `dataLayer.event`   | `meta.event`           | Server relay (CAPI) | কোথায়                                |
| ---------------------- | ------------------- | ---------------------- | ------------------- | ------------------------------------- |
| `ViewItemList`         | `view_item_list`    | —                      | না                  | shop / category / brand page          |
| `SelectItem`           | `select_item`       | —                      | না                  | list থেকে product click               |
| `ViewContent`          | `view_item`         | `ViewContent`          | হ্যাঁ               | product page, একবার                   |
| `AddToCart`            | `add_to_cart`       | `AddToCart`            | হ্যাঁ               | add to cart বাটন / buy now            |
| `RemoveFromCart`       | `remove_from_cart`  | —                      | না                  | cart থেকে বাদ                         |
| `ViewCart`             | `view_cart`         | —                      | না                  | cart page                             |
| `AddToWishlist`        | `add_to_wishlist`   | `AddToWishlist`        | হ্যাঁ               | wishlist                              |
| `InitiateCheckout`     | `begin_checkout`    | `InitiateCheckout`     | হ্যাঁ               | checkout page খুললে, একবার            |
| `AddShippingInfo`      | `add_shipping_info` | —                      | না                  | order submit                          |
| `AddPaymentInfo`       | `add_payment_info`  | `AddPaymentInfo`       | হ্যাঁ               | order submit                          |
| `Purchase`             | `purchase`          | `Purchase`             | না (server নিজে পাঠাবে, ধাপ ৩) | order success page, একবারই |
| `Search`               | `search`            | `Search`               | হ্যাঁ               | search result                         |
| `CompleteRegistration` | `sign_up`           | `CompleteRegistration` | হ্যাঁ               | account খোলা                          |
| `Login`                | `login`             | —                      | না                  | login                                 |
| `Lead`                 | `generate_lead`     | `Lead`                 | হ্যাঁ               | WhatsApp / call বাটন                  |

### Item-এর নিয়ম

- `item_id`: ফিডের id (ধাপ ১.৬)।
- `price`, `value`, `quantity`: **সংখ্যা**, string না। Price = গ্রাহক আসলে যে দামে কিনবে (sale price থাকলে সেটা)।
- `item_category` … `item_category5`: category-র **নাম**, parent থেকে child, slug না।
- `item_brand`: brand-এর নাম।
- `currency`: `"BDT"`।
- `view_item`-এ `quantity: 1`।

### Purchase (order success page)

- `event_id` = **order number** (server CAPI-ও একই id পাঠাবে, ধাপ ৩)।
- `transaction_id`, `value`, `shipping`, `tax: 0`, `coupon` (থাকলে)।
- localStorage-এ track করা order id রেখে reload-এ আবার না পাঠানো (UniBaazar গাইড §৫)।
- `ecommerce.customer`-এ hash করা তথ্য (UniBaazar গাইড §৬, phone `8801XXXXXXXXX` রূপে)। এটা শুধু GTM-এর Meta Advanced Matching-এর জন্য।

### Ad identifier

UniBaazar গাইড §৩.৪ অনুযায়ী প্রথম page load-এ `fbclid` localStorage-এ রাখো, আর `readAdIdentifiers()` বানাও (`_fbp`, `_fbc` cookie, না থাকলে `fbclid` থেকে `fb.1.<time>.<fbclid>`)। Order submit-এর সময় এগুলো server-এ পাঠাও।

---

## ৩. ধাপ ৩: server-side Meta Conversions API

### Environment variable (`.env.example`-এ যোগ করো, আসল মান আমি দেব)

```
META_PIXEL_ID=1674448247520461
META_CAPI_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
```

`META_CAPI_ACCESS_TOKEN` ফাঁকা থাকলে CAPI কিছুই পাঠাবে না, কোনো error-ও দেবে না। Token কখনো client bundle বা database-এ যাবে না।

### Order-এ যা সংরক্ষণ করতে হবে

Order table-এ (migration দিয়ে, nullable) `fbp`, `fbc`, `client_ip`, `client_user_agent`। Order তৈরির সময়:

- `fbp`, `fbc`: browser থেকে পাঠানো `readAdIdentifiers()`।
- `client_ip`: request header (`x-forwarded-for`-এর প্রথম মান, না থাকলে `x-real-ip`)।
- `client_user_agent`: request-এর `user-agent` header। **Meta-তে website event-এর জন্য বাধ্যতামূলক।**

### `src/server/tracking/capi.ts`

- `sendMetaEvent({ eventName, eventId, eventSourceUrl, userData, customData })` → `POST https://graph.facebook.com/v21.0/{META_PIXEL_ID}/events?access_token=...`
- `action_source: "website"`, `event_time`: Unix seconds।
- `user_data`:
  - `ph`: SHA-256 of `8801XXXXXXXXX` (শুরুর 0 বাদ, `880` যোগ)
  - `em`: SHA-256 of trimmed lowercase email (থাকলে)
  - `fn`/`ct`/`country`: SHA-256 of lowercase (থাকলে; country `bd`)
  - `client_ip_address`, `client_user_agent`, `fbp`, `fbc`: **hash না**
- `META_TEST_EVENT_CODE` থাকলে body-তে `test_event_code` যোগ।
- timeout ৫ সেকেন্ড। ফলাফল (sent/failed + Meta-র error message) log করো। প্রজেক্টে log table বানানো সহজ হলে table-এ, না হলে server log-এ।
- CAPI ব্যর্থ হলেও order বা page কখনো ভাঙবে না।

### Purchase

Order সফলভাবে তৈরি হওয়ার পর server থেকেই পাঠাও (browser-এর ওপর নির্ভর না করে):

- `event_name: "Purchase"`, `event_id: order number` (browser-এর Purchase-এর সমান)।
- `value`, `content_ids`, `contents`, `num_items`: **database-এর order থেকে**, browser থেকে না।
- `event_source_url`: order success page-এর URL।
- Response দেরি না করাতে await না করে পাঠাও (Next.js-এ `after()` থাকলে সেটা, না থাকলে fire-and-forget)।
- Online payment gateway থাকলে: COD-এ order তৈরি হলেই পাঠাও; online payment-এ payment নিশ্চিত হলে পাঠাও।

### `/api/tracking` route (অন্য event relay)

- শুধু ধাপ ২ টেবিলের "Server relay: হ্যাঁ" event গ্রহণ করবে, বাকিগুলো 204 দিয়ে ignore।
- Request-এর IP আর User-Agent যোগ করে browser-এর **একই `eventId`** দিয়ে `sendMetaEvent()`।
- Value বা items যুক্তিসঙ্গত কিনা মোটামুটি যাচাই করো (negative বা অস্বাভাবিক বড় হলে বাদ)।
- Bot/spam ঠেকাতে সাধারণ rate limit থাকলে ভালো, না থাকলে বাদ।

---

## ৪. যা করা যাবে না

- কোডে `fbq` load বা কল করা (Meta browser event শুধু GTM দিয়ে)।
- সরাসরি gtag.js বা GA4 config যোগ করা (GA4 শুধু GTM দিয়ে)।
- GTM snippet বা admin-এর Marketing Analytics সেটিং বদলানো।
- Access token database বা client-এ রাখা।
- Customer-এর raw (hash ছাড়া) phone/email GA4-এ পাঠানো।

---

## ৫. কাজ শেষে আমাকে যা দেবে

1. কোন ফাইলে কী বদলেছে তার তালিকা।
2. প্রতিটা event কোন component-এ কল হয়েছে।
3. Migration-এর নাম আর কীভাবে চালাতে হবে।
4. Production-এ কোন env variable বসাতে হবে।
5. Local-এ পরীক্ষা: browser console-এ `dataLayer` দেখে প্রতিটা event একবার যাচ্ছে কিনা, আর `{ ecommerce: null }` আগে আছে কিনা।

GTM-এর ভেতরের কাজ (GA4 Event tag, Meta event tag, Data Layer Variable) আমি নিজে করব, কোড deploy হওয়ার পর।
