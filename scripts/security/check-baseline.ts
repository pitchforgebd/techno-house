/**
 * Security baseline suite (P17-T01).
 *
 *   npm run test:security
 *
 * Covers non-payment controls from docs/SECURITY.md. Payment cases stay in
 * `npm run test:payments` (P17-T02 / P13-T07). Does not print secrets.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { originMatchesHost } from "../../lib/auth/same-origin";
import { opaqueSessionCookieFlags } from "../../lib/auth/session-cookie";
import {
  safeAdminReturnPath,
  safeReturnPath,
} from "../../lib/auth/return-path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "generated") {
      continue;
    }
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walkTsFiles(path, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

function main(): void {
  check(
    "safe path keeps /account/orders",
    safeReturnPath("/account/orders") === "/account/orders",
  );
  check(
    "safe path rejects //evil",
    safeReturnPath("//evil.example") === "/account",
  );
  check(
    "safe path rejects absolute url",
    safeReturnPath("https://evil.example") === "/account",
  );
  check(
    "safe path rejects protocol in path",
    safeReturnPath("/account/https://evil.example") === "/account",
  );
  check(
    "admin path keeps /admin/orders",
    safeAdminReturnPath("/admin/orders") === "/admin/orders",
  );
  check(
    "admin path rejects storefront",
    safeAdminReturnPath("/account") === "/admin",
  );
  check(
    "admin path rejects login loop",
    safeAdminReturnPath("/admin/login") === "/admin",
  );
  check(
    "admin path rejects access gate loop",
    safeAdminReturnPath("/admin/access/th-ops-local") === "/admin",
  );
  check(
    "admin path rejects //evil",
    safeAdminReturnPath("//evil.example") === "/admin",
  );

  check(
    "origin match same host",
    originMatchesHost("https://shop.example", "shop.example"),
  );
  check(
    "origin reject foreign host",
    !originMatchesHost("https://evil.example", "shop.example"),
  );
  check(
    "origin reject bad url",
    !originMatchesHost("not-a-url", "shop.example"),
  );

  const flags = opaqueSessionCookieFlags("/");
  check("cookie httpOnly", flags.httpOnly === true);
  check("cookie sameSite lax", flags.sameSite === "lax");
  check("cookie path set", flags.path === "/");

  const root = join(process.cwd());
  const files = [
    ...walkTsFiles(join(root, "app")),
    ...walkTsFiles(join(root, "components")),
    ...walkTsFiles(join(root, "features")),
    ...walkTsFiles(join(root, "lib")),
  ];
  // Raw-HTML sinks: an allowlist, not a blanket ban.
  //
  // The blanket ban had been failing for months, because six legitimate sinks
  // were added after it was written. A permanently-red check stops being a
  // check — the next genuinely unsafe sink would have been indistinguishable
  // from the existing noise. Each entry below records WHY that sink is safe,
  // and anything not listed still fails.
  const ALLOWED_HTML_SINKS: Record<string, string> = {
    "app/(storefront)/blog/[slug]/page.tsx":
      "JSON-LD via JSON.stringify, plus sanitizeBlogBody output (tag allowlist, no style/class/on*, http/https/mailto only)",
    "app/(storefront)/layout.tsx":
      "theme CSS built from hex-validated colours and a fixed font lookup map",
    "components/analytics/custom-script-slot.tsx":
      "intentional third-party script injection, gated on custom_scripts.manage and audit-logged (F-09, accepted risk)",
    "features/catalog/category-page-seo.tsx":
      "sanitizeBlogBody output, sanitized on read as well as on write",
    "features/content/storefront-content-page.tsx": "sanitizeBlogBody output",
    "features/home/home-store-info.tsx": "sanitizeBlogBody output",
  };

  let unexpectedHtmlSinks = 0;
  const seenSinks = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("dangerouslySetInnerHTML")) {
      continue;
    }
    const relative = file
      .slice(root.length + 1)
      .split("\\")
      .join("/");
    if (relative in ALLOWED_HTML_SINKS) {
      seenSinks.add(relative);
      continue;
    }
    unexpectedHtmlSinks += 1;
    console.error(`fail unreviewed dangerouslySetInnerHTML in ${relative}`);
  }
  check(
    "no unreviewed dangerouslySetInnerHTML in app sources",
    unexpectedHtmlSinks === 0,
  );
  // Keeps the allowlist honest: a sink that is removed should be removed from
  // the list too, or the list slowly becomes a record of things that no longer
  // exist and stops meaning anything.
  const staleSinks = Object.keys(ALLOWED_HTML_SINKS).filter(
    (entry) => !seenSinks.has(entry),
  );
  check(
    "the raw-HTML allowlist has no stale entries",
    staleSinks.length === 0,
    staleSinks.join(", "),
  );

  console.log(
    failures === 0
      ? `security baseline ok (${checks} checks)`
      : `security baseline failed (${failures}/${checks})`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
