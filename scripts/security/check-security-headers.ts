/**
 * Security response header suite (F-01, and the F-02 serving half).
 *
 *   npm run test:headers
 *
 * The app previously sent no security headers at all. The concrete consequence
 * was that the admin panel could be framed by any site, so a signed-in staff
 * member could be tricked through an invisible overlay into clicking
 * "Approve refund" or "Ban customer".
 *
 * These are live checks against the running app, because a header is only real
 * if it is on the wire — reading `next.config.ts` would prove nothing about
 * what the server actually sends. The suite reports a skip rather than passing
 * silently when the server is down.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const ORIGIN = process.env.APP_URL?.trim() || "http://localhost:3000";

async function headersFor(path: string): Promise<Headers | null> {
  try {
    const response = await fetch(`${ORIGIN}${path}`, {
      redirect: "manual",
      cache: "no-store",
    });
    return response.headers;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const home = await headersFor("/");
  if (!home) {
    console.warn(`skip — app not reachable at ${ORIGIN}; NO header checks ran`);
    return;
  }

  // --- Storefront ---------------------------------------------------------
  check(
    "X-Content-Type-Options is nosniff",
    home.get("x-content-type-options") === "nosniff",
    `got ${home.get("x-content-type-options")}`,
  );
  check(
    "Referrer-Policy does not leak full URLs cross-origin",
    (home.get("referrer-policy") ?? "").includes("strict-origin"),
    `got ${home.get("referrer-policy")}`,
  );
  check(
    "Permissions-Policy denies camera, microphone and geolocation",
    ["camera=()", "microphone=()", "geolocation=()"].every((directive) =>
      (home.get("permissions-policy") ?? "").includes(directive),
    ),
    `got ${home.get("permissions-policy")}`,
  );
  check(
    "X-Frame-Options is DENY",
    home.get("x-frame-options") === "DENY",
    `got ${home.get("x-frame-options")}`,
  );
  check(
    "an ENFORCED CSP carries frame-ancestors 'none'",
    (home.get("content-security-policy") ?? "").includes(
      "frame-ancestors 'none'",
    ),
    `got ${home.get("content-security-policy")}`,
  );
  check(
    "the full CSP is present in report-only mode",
    (home.get("content-security-policy-report-only") ?? "").includes(
      "default-src 'self'",
    ),
  );
  check(
    "the enforced CSP does NOT carry default-src (it would break inline analytics)",
    !(home.get("content-security-policy") ?? "").includes("default-src"),
    "the staged policy was enforced prematurely",
  );
  check(
    "X-Powered-By is not advertised",
    home.get("x-powered-by") === null,
  );

  // --- Admin is the clickjacking target that matters ----------------------
  const admin = await headersFor("/admin");
  check(
    "the admin panel refuses to be framed",
    admin?.get("x-frame-options") === "DENY" &&
      (admin?.get("content-security-policy") ?? "").includes(
        "frame-ancestors 'none'",
      ),
    `xfo=${admin?.get("x-frame-options")}`,
  );

  // --- Uploaded files (F-02 serving half) ---------------------------------
  const upload = await headersFor(
    "/uploads/general/47dc2dae-2e42-4681-92b9-5d688b5949e7.svg",
  );
  if (!upload) {
    console.warn("skip — the sample upload is not present to check");
  } else {
    check(
      "uploaded files are served with nosniff",
      upload.get("x-content-type-options") === "nosniff",
    );
    check(
      "uploaded files are sandboxed so an SVG cannot run its own script",
      (upload.get("content-security-policy") ?? "").includes("sandbox"),
      `got ${upload.get("content-security-policy")}`,
    );
  }

  // --- HSTS is production-only, and BOTH directions matter -----------------
  //
  // This used to assert only the development case, guarded on the TEST
  // process's own `NODE_ENV`. That guard read the wrong environment: what
  // decides whether HSTS is sent is the mode of the server being probed, not
  // the mode of the script probing it. Running the suite against a production
  // build therefore failed on a correct server, and the production case — HSTS
  // actually being present — was never asserted at all.
  //
  // `PROBE_ENV=production` declares which kind of server is on the other end.
  const hsts = home.get("strict-transport-security");
  const probingProduction =
    process.env.PROBE_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (probingProduction) {
    check(
      "HSTS is sent in production",
      hsts !== null,
      "a first visit over http stays strippable",
    );
    // A short max-age is close to no protection; a year is the usual floor for
    // preload eligibility and is what next.config.ts sets.
    const maxAge = Number(/max-age=(\d+)/.exec(hsts ?? "")?.[1] ?? 0);
    check(
      "HSTS max-age is at least one year",
      maxAge >= 31_536_000,
      `got max-age=${maxAge}`,
    );
    check(
      "HSTS covers subdomains",
      /includeSubDomains/i.test(hsts ?? ""),
      `got ${hsts}`,
    );
  } else {
    check(
      "HSTS is absent in development (it would pin localhost to https)",
      hsts === null,
      `got ${hsts}`,
    );
  }

  if (failures > 0) {
    console.error(`security headers failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} security header checks`);
}

main().catch((error) => {
  console.error("security header suite crashed:", error);
  process.exitCode = 1;
});
