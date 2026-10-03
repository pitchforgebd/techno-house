import type { NextConfig } from "next";


/**
 * Security response headers (F-01).
 *
 * Before this the app sent none at all — no framing protection, no nosniff, no
 * referrer policy, no HSTS. The most concrete consequence was that the admin
 * panel could be framed by any site, so a signed-in staff member could be
 * tricked into clicking "Approve refund" through an invisible overlay.
 *
 * Split deliberately into two Content-Security-Policy headers:
 *
 *   - An ENFORCED one carrying only `frame-ancestors`. That is the
 *     clickjacking control and it is safe to turn on today, because it
 *     restricts nothing else. Absent directives are simply not enforced when
 *     there is no `default-src`.
 *   - A REPORT-ONLY one carrying the full policy. It cannot be enforced yet:
 *     GTM, GA4, the Meta Pixel and Tawk.to each bootstrap through an INLINE
 *     script, and Custom Scripts (Admin -> Setup) injects arbitrary
 *     third-party `<script>` markup by design. Enforcing `script-src` without
 *     `'unsafe-inline'` would break all of them, and a policy that keeps
 *     `'unsafe-inline'` buys little. Report-only first lets the operator see
 *     real violations before anything breaks.
 */
const SCRIPT_HOSTS = [
  "https://www.googletagmanager.com",
  "https://connect.facebook.net",
  "https://embed.tawk.to",
];

const GATEWAY_FORM_TARGETS = [
  "https://securepay.sslcommerz.com",
  "https://sandbox.sslcommerz.com",
  "https://tokenized.pay.bka.sh",
  "https://tokenized.sandbox.bka.sh",
  "https://api.mynagad.com",
];

const reportOnlyCsp = [
  "default-src 'self'",
  // 'unsafe-inline' and 'unsafe-eval' reflect what the analytics and chat
  // bootstraps actually need today. They are the first thing to remove once
  // those move to nonces.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SCRIPT_HOSTS.join(" ")}`,
  // The storefront theme writes CSS variables into an inline <style>.
  "style-src 'self' 'unsafe-inline'",
  // Product imagery is operator-supplied and can point anywhere over https.
  "img-src 'self' data: blob: https:",
  // next/font self-hosts its files, so no external font origin is needed.
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.tawk.to wss://*.tawk.to https://connect.facebook.net",
  "frame-src 'self' https://www.googletagmanager.com https://www.facebook.com https://*.tawk.to",
  `form-action 'self' ${GATEWAY_FORM_TARGETS.join(" ")}`,
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Nothing in this app is meant to be framed. The gateways are redirect-based,
  // so they never embed our pages.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
];

// HSTS only in production: sending it over plain http during local development
// would pin the browser to https://localhost and make the dev server
// unreachable until the cache was cleared.
const productionOnlyHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : [];

// Next streams metadata (canonical, JSON-LD, OG tags, site-verification meta
// tags, ...) into the body and moves it into <head> client-side once any
// metadata in the tree depends on async data — true for most pages here
// (DB-driven SEO config). Next's own built-in bot allowlist forces a
// blocking (non-streamed) response for crawlers that parse raw HTML instead
// of executing JS, but it only matches Google crawler names with a "-Google"
// suffix or "Google-" prefix (AdsBot-Google, Google-InspectionTool, ...) —
// plain "Googlebot", and Search Console's own ownership-verification
// fetcher, do NOT match it. That gap is exactly why a `<meta
// name="google-site-verification">` tag can still fail Search Console's
// check even once it is emitted correctly via `metadata.verification`: the
// raw HTML response it reads never had the tag in <head> to begin with.
// This extends Next's default list (reproduced below) with "Googlebot" so
// the crawlers that actually matter for indexing/verification always get
// the blocking render.
const HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // The pg driver reaches for Node built-ins (net, tls, dns, fs) that the
  // bundler cannot resolve. Keep it external so it is required at runtime on
  // the server instead of being bundled.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@node-rs/argon2"],
  // Media library uploads go through Server Actions (default 1 MB is too small).
  // Keep aligned with `MAX_BYTES` in `lib/media/admin-media.ts` (5 MB/file) plus
  // multipart overhead / a few files in one request.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    proxyClientMaxBodySize: "25mb",
    // Defense-in-depth only (Phase 14): the actual P2037 TooManyConnections
    // build failure was a Prisma singleton-caching bug (see lib/db/prisma.ts)
    // that opened a fresh connection pool per query rather than a worker-
    // count problem. With that fixed, each build worker now correctly holds
    // one pool (`max: 5`) for its process lifetime, so worker count × 5 is
    // the real ceiling — capped here to keep it well under Postgres's
    // `max_connections` even on machines with many CPUs.
    cpus: 4,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...baseSecurityHeaders, ...productionOnlyHeaders],
      },
      {
        // Uploaded files are served from this origin, and `.svg` is an allowed
        // upload type — an SVG is an XML document that executes its own
        // <script> when navigated to directly (F-02). `sandbox` strips that
        // capability without affecting <img> rendering, which ignores it.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "sandbox" },
        ],
      },
    ];
  },
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
