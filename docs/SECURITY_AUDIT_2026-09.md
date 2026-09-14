# Security audit — Techno House storefront + admin

**Date:** 2026-09-13
**Auditor:** Claude (agent-assisted review)
**Commit baseline:** working tree on `main` (uncommitted Phase 17+ work included)
**Scope:** Application security of the whole site — authentication, sessions,
CSRF, authorization (storefront, B2B, admin), injection, XSS, file upload,
payments, secrets, rate limiting, redirects, response headers, dependencies.
**Out of scope:** Infrastructure (TLS termination, WAF, DB network ACLs, OS
patching, backups), physical/social, and live penetration testing against a
production host. Business-logic fraud (coupon stacking, refund abuse) was
sampled, not exhaustively modelled.

---

## 1. Summary

| Severity | Count |
| --- | --- |
| Critical | 0 |
| High | 1 |
| Medium | 6 |
| Low / hardening | 10 |

**Verdict: the application-layer security model is genuinely good and better
than most projects of this size.** Authentication, authorization, and the
payment path are all built correctly, and I could not find a way for an
anonymous attacker to read or change another user's data.

The weaknesses are concentrated in two places:

1. **The HTTP response layer is completely empty.** The site sends no
   security headers at all. This is the single highest-value fix and it is
   roughly 30 lines of config.
2. **Secondary controls that assume a trustworthy staff member.** An
   uploaded SVG, the Custom Scripts box, and the absence of admin MFA mean
   one compromised staff login converts directly into persistent JavaScript
   on every visitor's browser.

Nothing here blocks go-live outright, but **F-01, F-02 and F-03 should be
fixed before the site takes real customer traffic.**

---

## 2. What was tested, and how

| Area | Method |
| --- | --- |
| Response headers | Live `curl -D` against the running app; `next.config.ts` review |
| Open redirect | Code review + WHATWG URL resolution test in Node (same parser browsers use) |
| Authorization coverage | Scripted sweep of all **193** exported server actions, then manual read of every file the sweep flagged |
| IDOR | Manual read of every customer-scoped data module in `lib/account`, `lib/orders`, `lib/support`, `lib/refunds`, `lib/notifications` |
| SQL injection | Source search for `$queryRaw*`, `Prisma.raw`, `Prisma.sql`, string-built SQL |
| XSS | Source search for every `dangerouslySetInnerHTML`, then traced each one back to its sanitizer or validator |
| File upload | Code review + live fetch of a real uploaded file to inspect served headers |
| Payments | Code review of IPN/callback verification, amount binding, idempotency, row locking |
| Secrets | `.gitignore` / `git ls-files` / `.env.example` review; crypto helper review |
| Dependencies | `npm audit` (prod and full tree) |
| Project's own gates | `npm run test:security`, `npm run test:payments` |

---

## 3. Findings

### F-01 — No security response headers at all · **HIGH**

**Where:** `next.config.ts` (no `headers()` function defined)

**Evidence — live response from `GET /`:**

```
HTTP/1.1 200 OK
Vary: rsc, next-router-state-tree, ...
Link: ...
Cache-Control: no-cache, must-revalidate
Content-Type: text/html; charset=utf-8
```

That is the complete list. Every one of the following is missing, site-wide,
on the storefront **and** on `/admin`:

| Header | Consequence of absence |
| --- | --- |
| `Content-Security-Policy` | No containment if any XSS ever lands. Directly amplifies F-02 and F-06. |
| `X-Frame-Options` / `frame-ancestors` | **The admin panel and checkout can be framed by any site → clickjacking.** An attacker can overlay an invisible admin page and trick a signed-in staff member into clicking "Approve refund" or "Ban customer". |
| `Strict-Transport-Security` | First visit over HTTP is strippable; no protection against SSL-strip on later visits. |
| `X-Content-Type-Options: nosniff` | The browser may MIME-sniff uploaded files into an executable type. |
| `Referrer-Policy` | Full URLs of account/order pages leak to third parties in `Referer`. |
| `Permissions-Policy` | Camera/mic/geolocation not denied by default. |

`poweredByHeader: false` is correctly set, so `X-Powered-By` is absent. That
is the only header control currently in place.

**Fix.** Add a `headers()` block to `next.config.ts`. Start with the
non-breaking four (`X-Frame-Options: DENY` for `/admin/*`,
`X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Strict-Transport-Security` in production only), then introduce CSP in
`Content-Security-Policy-Report-Only` first.

**Note on CSP:** a strict CSP will conflict with the Custom Scripts feature
(F-09) and with the inline `<style>` used for the theme. Plan for
`'unsafe-inline'` on `style-src` initially, and either a nonce or a documented
exception for the admin-managed script slot.

---

### F-02 — Uploaded SVGs are served inline from the app's own origin · **MEDIUM**

**Where:** `lib/media/admin-media.ts:33` (`ALLOWED_EXT` includes `.svg`),
served from `public/uploads/`

**Evidence — live response for a real uploaded file:**

```
$ curl -D - http://localhost:3000/uploads/general/47dc2dae-…-5d688b5949e7.svg
HTTP/1.1 200 OK
Content-Type: image/svg+xml
```

No `Content-Disposition: attachment`, no `X-Content-Type-Options`, no CSP.

An SVG is an XML document, and an SVG served as `image/svg+xml` and navigated
to directly **executes any `<script>` it contains, in the origin of this
site**. httpOnly cookies stop the script reading the session directly, but it
can still make same-origin authenticated `fetch()` calls as the victim, read
page content, and stage a convincing phishing page on the real domain.

**Who can exploit it:** any staff account holding `media.upload`. This is not
anonymous — but it is a clean path from "one staff password leaked" to
"persistent JavaScript on the storefront", which is exactly the escalation MFA
(F-05) and CSP (F-01) exist to break.

**Fix, in order of preference:**

1. Serve `public/uploads/*` with `Content-Disposition: attachment` and
   `X-Content-Type-Options: nosniff` (F-01 covers the second half), or
2. Sanitize SVGs on upload (strip `<script>`, `<foreignObject>`, event
   attributes, `xlink:href` to non-image schemes), or
3. Drop `.svg` from `ALLOWED_EXT` and convert to PNG on upload.

---

### F-03 — Open redirect via a backslash in the `next` parameter · **MEDIUM**

**Where:** `lib/auth/return-path.ts:20-26` (`safeReturnPath`), reached from
`/account/login?next=…`, `/account/register?next=…`

The guard rejects `//evil.com` and anything containing `://`, but a **backslash**
after the leading slash is not handled. Browsers apply WHATWG URL parsing,
which treats `\` as equivalent to `/` for special schemes, so `/\evil.com`
resolves to a *different origin*.

**Evidence — Node's URL parser (identical to the browser's):**

```
"/account"          safeReturnPath: ACCEPT  → https://techno-house.test/account
"//evil.com"        safeReturnPath: reject  → https://evil.com/
"/\\evil.com"       safeReturnPath: ACCEPT  → https://evil.com/     ← bypass
"/\\/evil.com"      safeReturnPath: ACCEPT  → https://evil.com/     ← bypass
"https://evil.com"  safeReturnPath: reject  → https://evil.com/
```

**Impact.** A phishing link genuinely hosted on the real domain
(`https://technohouse.com/account/login?next=/\attacker.site`) signs the
customer in and then bounces them to the attacker's page. The victim's own
address bar showed the real site when they typed their password, which is what
makes this class of bug useful to attackers.

**Not affected:** the OAuth callback. It re-prefixes with `publicOrigin()`, and
absolute-URL parsing collapses the backslash to a same-origin path — I verified
`new URL("https://site.com" + "/\\evil.com").href === "https://site.com/evil.com"`.

**Fix.** Reject backslashes outright and validate positively rather than by
blocklist:

```ts
if (/[\\]/.test(trimmed)) return fallback;
// better still: resolve against a dummy origin and require the origin survived
const url = new URL(trimmed, "https://placeholder.invalid");
if (url.origin !== "https://placeholder.invalid") return fallback;
return url.pathname + url.search + url.hash;
```

---

### F-04 — IP rate-limit buckets are keyed on a spoofable header · **MEDIUM**

**Where:** `lib/auth/request-meta.ts:11-13`

```ts
const forwarded = h.get("x-forwarded-for");
const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
```

The left-most `X-Forwarded-For` entry is taken with no trusted-proxy list and
no hop counting. That value is fully attacker-controlled unless a proxy in
front of the app overwrites it. An attacker rotating the header gets a fresh
rate-limit bucket per request, which defeats every `*.ip` limit in
`lib/auth/rate-limit.ts` (`customerLoginIp` 10/15min, `staffLoginIp` 8/15min,
`registerIp`, `forgotIp`, `otpSendIp`).

**Partial mitigation already present:** the per-**email** buckets
(`customerLoginEmail` / `staffLoginEmail`, 5 per 15 min) are keyed on the
hashed email and are *not* bypassable this way. So a brute force against one
known account is still throttled. What is unthrottled is **password spraying**
(one common password against many accounts) and mass registration/OTP spam.

The same spoofable value is written to `ipHash` on session and audit rows, so
audit-log IP evidence is not trustworthy either.

**Fix.** Make the trusted hop count explicit. On Vercel, use the platform's
own client-IP header. Behind nginx, take the *right-most* untrusted entry, or
configure a `TRUSTED_PROXY_COUNT` env var and index from the end. Treat
`X-Forwarded-For` as unusable when the app is reachable directly.

---

### F-05 — No MFA and no account lockout for staff/admin · **MEDIUM**

**Where:** `lib/auth/staff-auth.ts`; no `twoFactor` / `totp` / `lockedUntil` /
`failedAttempts` fields exist anywhere in the schema.

The admin panel can issue refunds, adjust customer wallets, read B2B KYC
documents (trade licences, NID scans), export the customer list, and change
payment gateway credentials. It is protected by a password and a rate limit
that F-04 shows is partly bypassable.

What *is* done well here: no user enumeration (a missing account still spends
Argon2 time against `DUMMY_PASSWORD_HASH`, and the error text is identical),
failures are audit-logged, and the sign-in URL is obscured.

**Fix.** TOTP for all staff accounts is the right answer. A cheaper interim
step is a persistent lockout (e.g. 10 consecutive failures on one staff email
→ locked for 30 minutes, recorded in the audit log and surfaced in the panel),
which does not depend on the client IP being honest.

---

### F-06 — Secret-encryption keys use an unsalted single SHA-256, min 16 chars · **MEDIUM**

**Where:** `lib/payments/secret-crypto.ts:13-19`, and identically in
`lib/storage/secret-crypto.ts` and `lib/shipping/courier-secret-crypto.ts`

```ts
const raw = process.env.GATEWAY_SECRETS_KEY?.trim();
if (!raw || raw.length < 16) return null;
return createHash("sha256").update(raw).digest();
```

The AES-256-GCM implementation itself is correct — random 12-byte IV, auth tag
stored and verified, `base64(iv || tag || ciphertext)`. The weakness is the key
derivation: a **single unsalted SHA-256** over an arbitrary operator-chosen
string with a **16-character minimum**.

If the database is ever exposed (backup leak, SQL-injection elsewhere, insider),
an attacker holding the ciphertext can brute-force a human-chosen 16-character
passphrase very cheaply, because SHA-256 is designed to be fast and there is no
salt to prevent precomputation. What is protected here is SSLCommerz / bKash /
Nagad **merchant credentials** — a direct financial loss if recovered.

**Fix.** Require a full-entropy key (32 random bytes, hex or base64, validated
on boot) and use it directly, or run the passphrase through `scrypt`/`argon2`
with a stored salt. Raise the minimum and fail startup — not silently return
`null` — when it is not met in production.

---

### F-07 — Password policy is length-only · **MEDIUM**

**Where:** `lib/account/validation.ts:9,32-36` — `ACCOUNT_PASSWORD_MIN = 8`,
no other rule.

Eight characters with no breach check means `password`, `12345678` and
`technohouse` are all accepted. Combined with F-04, credential stuffing against
this user base is cheap.

**Fix.** Keep the 8-character floor (NIST does not recommend composition rules),
but add a check against a breached-password list — either the
[Pwned Passwords k-anonymity API](https://haveibeenpwned.com/API/v3#PwnedPasswords)
(only a 5-character SHA-1 prefix leaves your server) or a bundled top-10k list
for an offline check. Raising the minimum to 10 is also reasonable here.

---

### F-08 — The project's own security baseline is currently failing · **LOW**

```
$ npm run test:security
fail dangerouslySetInnerHTML in app/(storefront)/blog/[slug]/page.tsx
fail dangerouslySetInnerHTML in app/(storefront)/layout.tsx
fail dangerouslySetInnerHTML in components/analytics/custom-script-slot.tsx
fail dangerouslySetInnerHTML in features/catalog/category-page-seo.tsx
fail dangerouslySetInnerHTML in features/content/storefront-content-page.tsx
fail dangerouslySetInnerHTML in features/home/home-store-info.tsx
security baseline failed (1/16)
```

I traced **all six** sinks and every one is safe today (see §4), so this is not
an exploitable finding. It matters because **a red gate stops being a gate.**
The check now fires on known-good code, so the next genuinely unsafe
`dangerouslySetInnerHTML` will be indistinguishable from the existing noise.

For contrast, `npm run test:payments` reports `ok 47 payment security checks`.

**Fix.** Replace the blanket ban with an explicit allowlist keyed on file path,
each entry carrying the reason it is safe, so a *new* sink still fails the
build.

---

### F-09 — Custom Scripts is unsanitized injection by design · **LOW (accepted risk — document it)**

**Where:** `lib/analytics/custom-scripts.ts`, `components/analytics/custom-script-slot.tsx`

Raw admin-supplied HTML is rendered verbatim into every storefront page. This
is intentional and correctly documented in the source — third-party tracking
and chat snippets are real `<script>` tags and sanitizing would break the
feature. It is gated on `custom_scripts.manage`, audit-logged, and injected
only into the storefront layout (I confirmed it is **not** rendered into the
admin layout, which would otherwise make it an admin-to-admin escalation).

**Keep it, but treat it as a privileged capability:** restrict
`custom_scripts.manage` to the Admin role only, never to shop managers or
marketing staff, and review the audit log for `CUSTOM_SCRIPTS_UPDATE` as part
of routine checks. Note that this feature is the main reason a strict CSP
(F-01) will need an exception.

---

### F-10 — `/b2b/*` has no middleware backstop · **LOW**

**Where:** `middleware.ts:76` — `matcher: ["/account/:path*", "/admin/:path*"]`

`/b2b` is absent. I checked **all 12** `/b2b` pages and every one calls
`getCustomerSession()` and redirects when it is missing, so there is no live
exposure. But `/account` and `/admin` get a second, structural guard that
`/b2b` does not, and the wholesale panel exposes negotiated pricing and order
history. A future page added without the guard would be silently public.

**Fix.** Add `"/b2b/:path*"` to the matcher, with `/b2b/login` and
`/b2b/register` in the public set.

---

### F-11 — Inconsistent same-origin defense on one customer action file · **LOW**

**Where:** `features/account/ticket-actions.ts`

`createTicketAction` and `replyTicketAction` are the only customer-facing
server actions that do **not** call `isSameOriginRequest()`. Every sibling file
(`auth-actions`, `address-actions`, `notification-actions`,
`conversation-actions`, `refund-actions`, `b2b-actions`) does.

Impact is low — Next.js Server Actions already perform their own Origin/Host
check, and the underlying `createCustomerTicket` / `replyCustomerTicket` both
resolve the session server-side and scope the ticket lookup with
`where: { id, userId: user.id }`, so there is no IDOR. This is a
defense-in-depth gap, not a hole.

---

### F-12 — Public forms have no rate limiting · **LOW**

**Where:** `app/(storefront)/support/actions.ts`,
`app/(storefront)/complaint/actions.ts`,
`app/(storefront)/product-request/actions.ts`

The auth paths are rate-limited; these are not. An unauthenticated script can
flood the support queue, the complaints table, and the product-request list.
This is an availability/abuse problem, not a data-exposure one.

**Fix.** Reuse `consumeBucket` from `lib/auth/rate-limit.ts` with a new
`support.submit.ip` bucket. (Do F-04 first, or the limit inherits the same
spoofable key.)

---

### F-13 — Path-prefix check without a separator · **LOW**

**Where:** `lib/media/admin-media.ts:164-175`

```ts
const abs = path.join(process.cwd(), "public", relative);
const publicRoot = path.join(process.cwd(), "public");
if (!abs.startsWith(publicRoot)) return null;
```

`path.join` collapses `..`, so classic traversal is handled. But the prefix
test has no trailing separator, so a resolved path of `<cwd>/publicdata/x`
passes a `startsWith("<cwd>/public")` check. Exploitability is very low —
`publicPath` comes from a `MediaAsset` row written by staff — but the idiom is
wrong.

**Fix:** `if (path.relative(publicRoot, abs).startsWith("..")) return null;`

---

### F-14 — `ADMIN_LOGIN_SLUG` silently falls back to a published default · **LOW**

**Where:** `lib/auth/admin-login-path.ts:12,20-26`

When the env var is unset or malformed, the slug falls back to
`"th-ops-local"` — a value that appears in `.env.example`, in `docs/`, and in
this repository's history. A production deploy that forgets the variable gets a
predictable admin gate with no warning.

The obscured path is defense-in-depth, not a control (the password and rate
limit are the control), so severity is low. But the failure is silent, which is
the wrong default.

**Fix.** Throw on boot when `NODE_ENV === "production"` and `ADMIN_LOGIN_SLUG`
is unset or equal to the default.

---

### F-15 — `.gitignore` rule ordering re-ignores `.env.example` · **LOW (housekeeping)**

`.gitignore` line 35 has `!.env.example`, but line 46 adds a broader `.env*`
that comes *after* it, and later rules win. `.env.example` is already tracked
so nothing is broken today, but a fresh clone/re-add would drop it.

**Fix.** Move the `!.env.example` negation below the `.env*` line.

---

### F-16 — Smaller observations · **LOW**

- **Password reset is a stub.** `lib/auth/customer-auth.ts:407-423` always
  returns `{ ok: true }` and sends nothing — deliberately, so it cannot reveal
  whether an email exists, but it means **there is no account recovery at all**.
  Users who forget a password are permanently locked out. (Silver lining: there
  is no reset-token attack surface to review.)
- **Session cookies lack the `__Host-` prefix.** Adding it would stop a
  compromised subdomain from overwriting a session cookie. Requires
  `Path=/`, so it conflicts with the deliberate `Path=/admin` scoping on the
  staff cookie — worth applying to the customer cookie only.
- **`consumeAll` keeps consuming after a failure** (`lib/auth/rate-limit.ts:69-80`),
  so a request already rejected by the IP bucket still burns a count from the
  email bucket. Minor, and it errs toward stricter.
- **Theme CSS is validated on write but not on read.** The four colour values
  interpolated into `<style>` in `getStorefrontThemeCss` are hex-validated on
  save (`/^#[0-9a-fA-F]{6}$/`) and fonts go through a fixed lookup map, so this
  is safe. But blog and category HTML sanitize on *both* write and read; the
  theme CSS only on write. Matching that pattern would be consistent.
- **OTP codes are stored as a plain SHA-256.** A 6-digit code has only a
  million possibilities, so the hash adds little if the DB leaks. Mitigated in
  practice by expiry, single-use consumption, and the attempt counter.

---

## 4. What is built correctly

These were tested and passed. They are recorded so a future audit does not
re-litigate them, and because several are genuinely above average.

**Password storage and login.** Argon2id via `@node-rs/argon2` at
`m=19456, t=2, p=1` — OWASP-recommended parameters. Failed logins spend the
same Argon2 time against a dummy hash and return an identical message, so
there is no user enumeration and no timing oracle.

**Session design.** The cookie holds a JWT (HS256, `jose`, secret required to
be ≥32 chars) wrapping a 32-byte opaque token; the DB stores only the token's
SHA-256. The JWT lets Edge middleware reject forged/expired cookies without a
DB round-trip, while revocation, account status and permissions are still
re-read from the database on every request — the JWT deliberately carries no
authorization data. Sessions are capped (5 customer / 3 staff), pruned,
revocable in bulk, and `lastUsedAt` writes are throttled. Staff cookies are
`Path=/admin` so they are never sent to the storefront. httpOnly everywhere;
`secure` in production.

**Admin authorization.** I swept all **193** exported server actions in
`features/admin` and `app/(admin)`. **Every one** is behind a permission check
(`staffWithPermission`, or a local `guard()` / `actorOrReject()` / `actor()` /
`staffForGateway()` helper), and all of them also call `isSameOriginRequest()`.
The only unguarded exports are `loginStaffAction` and `logoutStaffAction`,
which is correct. Route handlers under `/admin/api/*` do their own checks
rather than relying on the layout. Panel routes are additionally gated by
`canAccessAdminPath` on a middleware-supplied header that middleware
**overwrites**, so it cannot be spoofed by the client.

**No IDOR found.** Customer order, ticket, refund, address, and notification
reads and writes are all scoped by the session's `userId` at the data layer —
`getCustomerOrderByNumber` uses `where: { number, userId: session.userId }`,
ticket replies use `where: { id: ticketId, userId: user.id }`, and the
notification helpers take `userId` from the session in the action, never from
client input. Wholesale pricing additionally requires an `ACTIVE` B2B account.

**Payments.** This is the strongest part of the codebase. The browser return
URL is explicitly *not* treated as proof of payment; the IPN handler calls the
gateway's own validation API server-side and then checks status, `store_id`,
currency, and that the amount equals **both** `payment.amount` and
`order.totalAmount`. Duplicate `transactionRef` values are rejected, and the
transition runs inside a transaction holding `SELECT … FOR UPDATE` on the
payment row. Order placement recomputes price, discount, shipping, tax and
total server-side and never trusts the client. `npm run test:payments` passes
all 47 checks.

**No SQL injection surface.** Every `$queryRaw` is a tagged template with bound
parameters. There is no `queryRawUnsafe`, no `executeRawUnsafe`, and no
`Prisma.raw`/`Prisma.sql` string building anywhere in the codebase.

**XSS sinks are all accounted for.** Six `dangerouslySetInnerHTML` uses, traced
individually: two render `sanitizeBlogBody` output (tight tag allowlist, no
`style`/`class`/`on*`, schemes limited to http/https/mailto, external links
forced to `rel="noopener noreferrer"`); two render the same sanitizer's output
via the category/store-info paths — and notably the category path sanitizes on
**read** as well as on write; one is `JSON.stringify` of JSON-LD; one is the
theme CSS whose inputs are hex-validated on save. The seventh, Custom Scripts,
is the documented intentional case (F-09).

**B2B KYC documents.** Trade licences and NID scans are written to
`private-uploads/` — **outside** `public/` — with UUID filenames, an extension
allowlist that excludes SVG, and an 8 MB cap. Retrieval goes through
`/admin/api/b2b-documents`, which requires a staff session with
`customer.b2b.view`, validates the storage key against a strict pattern, and
responds `Cache-Control: private, no-store`.

**OAuth.** State is a 24-byte CSPRNG value in a short-lived httpOnly cookie,
compared against the provider's callback parameter, with the provider identity
checked too. Failures redirect to a generic `?error=social_*` and never leak
provider detail.

**OTP.** Codes from `randomInt` (CSPRNG), stored hashed, expiring, single-use,
with a per-challenge attempt counter and per-phone/per-IP send limits.

**Secrets hygiene.** No secrets are committed — `git ls-files` shows only
`.env.example`, which contains no live values. `DATABASE_URL` is validated by
shape and never echoed in errors. There are zero `NEXT_PUBLIC_*` variables, so
nothing is leaked into the client bundle. No `console.*` call anywhere in
`lib/` logs a password, token, hash, or credential (the whole of `lib/` has
exactly one `console.*` call).

**Audit logging.** Append-only, ~60 distinct action types covering staff
login/logout/failure, customer and B2B lifecycle, refunds, roles, catalogue,
and marketing changes. IPs are hashed, never stored raw, and a failed audit
write never blocks the action that produced it.

**Dependencies.** `npm audit` reports **0 vulnerabilities** across the full
tree — 0 critical, 0 high, 0 moderate, 0 low, prod and dev.

**Redirect safety elsewhere.** `publicOrigin()` reads `APP_URL` from the
environment rather than the `Host` header, so absolute links in emails,
sitemaps and payment callbacks cannot be poisoned by host-header injection.

---

## 5. Recommended order of work

**Before real traffic**

1. **F-01** — add response headers (`X-Frame-Options` on `/admin` first; it is
   one line and closes the clickjacking path).
2. **F-03** — reject backslashes in `safeReturnPath` (a three-line change).
3. **F-02** — stop serving uploaded SVGs inline.

**Within the first month**

4. **F-04** — fix client-IP derivation for the deployment's actual proxy setup.
5. **F-06** — require a full-entropy `*_SECRETS_KEY` and fail boot without one.
6. **F-05** — staff lockout now, TOTP next.
7. **F-07** — breached-password check on registration and password change.

**Housekeeping backlog**

8. F-08 (fix the baseline gate), F-10, F-11, F-12, F-13, F-14, F-15, F-16.

**Operational, outside the code**

- Set `ADMIN_LOGIN_SLUG`, `SESSION_JWT_SECRET`, `GATEWAY_SECRETS_KEY`,
  `STORAGE_SECRETS_KEY`, `COURIER_SECRETS_KEY` and `APP_URL` to real production
  values, and confirm `NODE_ENV=production` so `secure` cookies engage.
- Restrict `custom_scripts.manage` and `media.upload` to the smallest possible
  set of staff (F-02 and F-09 both depend on this).
- Decide what to do about password recovery (F-16) — right now there is none.

---

## 6. Caveats on this audit

- This was a **code and running-instance review**, not a penetration test. No
  fuzzing, no authenticated crawling of the full admin surface, and no attempt
  to exploit any finding end-to-end against a live target.
- Findings F-02, F-03 and F-01 were confirmed with direct evidence (live HTTP
  responses and a URL-parser test). The rest are code-review findings whose
  severity is argued from the code path, not demonstrated by an exploit.
- Business-logic abuse (coupon stacking, refund flows, wallet adjustments,
  stock oversell) was **sampled only**. The locking and server-side pricing in
  `create-order.ts` and `payments/service.ts` look sound, but a dedicated
  review of that area would be worth commissioning separately.
- The admin panel's own UI was not reviewed for XSS beyond the shared sinks
  listed above.
