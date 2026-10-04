/**
 * Route and mutation-endpoint security suite (DSA-08 sweep).
 *
 *   npm run test:routes
 *
 * Phase 6 of the remediation asked for every mutation endpoint to be audited
 * for CSRF, origin, authentication, content type and rate limiting — not just
 * for `/admin/api/order-alerts` to be patched. These checks encode the result
 * so the sweep does not have to be redone by hand, and so a newly added route
 * or action that skips the shared guards fails the build instead of passing
 * quietly.
 *
 * Two kinds of check here:
 *
 *   - Static: every `"use server"` file that mutates must call
 *     `isSameOriginRequest`, and every admin route handler that mutates must
 *     too. Read-only `load*` actions are exempt, because CSRF is about state
 *     change and they have none.
 *   - Live: `/admin/api/order-alerts` must reject a cross-origin POST and a
 *     non-JSON body, which is the specific hole DSA-08 described.
 *
 * The live half needs the dev server. It reports a skip rather than passing
 * silently when the server is down — the payments suite hides two checks that
 * way, and a skipped check that looks like a pass is worse than no check.
 */
import { config as loadEnvFiles } from "dotenv";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";
import { getPrisma } from "../../lib/db/prisma";
import {
  canAccessAdminPath,
  permissionKeysForAdminPath,
} from "../../lib/auth/admin-route-permissions";
import { createSessionToken, hashSessionToken } from "../../lib/auth/session-token";
import { signSessionJwt } from "../../lib/auth/session-jwt";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_TTL_MS,
} from "../../lib/auth/staff-session-constants";

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

const WRITE_CALL = /\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/;
const EXPORTED_ACTION = /\nexport async function /g;

/** Server-action files that only read, so CSRF does not apply. */
const READ_ONLY_ACTION_FILES = new Set([
  "features/account/actions.ts",
  "features/cart/actions.ts",
  "features/checkout/weight-actions.ts",
  "features/lists/actions.ts",
  "features/pc-builder/actions.ts",
]);

function listFiles(pattern: string, dirs: string[]): string[] {
  try {
    return execSync(`grep -rl ${pattern} --include=*.ts ${dirs.join(" ")}`, {
      encoding: "utf-8",
    })
      .split("\n")
      .map((line) => line.trim().replace(/\\/g, "/"))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  // --- Static: server actions --------------------------------------------
  const actionFiles = listFiles('\'"use server"\'', ["features", "app", "lib"]);
  check(
    "server action files were found to scan",
    actionFiles.length > 50,
    `found ${actionFiles.length}`,
  );

  const unguarded: string[] = [];
  for (const file of actionFiles) {
    const src = readFileSync(file, "utf-8");
    const actionCount = (src.match(EXPORTED_ACTION) ?? []).length;
    if (actionCount === 0) {
      continue;
    }
    if (src.includes("isSameOriginRequest")) {
      continue;
    }
    const relative = file.replace(/^.*?(features|app|lib)\//, "$1/");
    if (READ_ONLY_ACTION_FILES.has(relative)) {
      // Exempt, but only while it stays read-only.
      check(
        `${relative} is still read-only (its CSRF exemption depends on it)`,
        !WRITE_CALL.test(src),
        "it now performs writes and needs isSameOriginRequest",
      );
      continue;
    }
    unguarded.push(relative);
  }
  check(
    "every mutating server action file checks the request origin",
    unguarded.length === 0,
    unguarded.join(", "),
  );

  // --- Static: admin route handlers --------------------------------------
  const adminRoutes = listFiles("'export async function POST'", ["app"])
    .filter((f) => f.includes("/admin/"));
  const routeGaps: string[] = [];
  for (const file of adminRoutes) {
    const src = readFileSync(file, "utf-8");
    if (!src.includes("isSameOriginRequest")) {
      routeGaps.push(file);
    }
  }
  check(
    "every admin route handler with a POST checks the request origin",
    routeGaps.length === 0,
    routeGaps.join(", "),
  );

  // --- Static: every admin page and route is mapped ------------------------
  // An unmapped admin path is denied to *everyone*, Admin included ("an empty
  // match is deny"), and nothing fails loudly: `/admin/api/order-alerts` and
  // `/admin/api/b2b-documents` were silently dead for weeks that way.
  const adminRoot = "app/(admin)/admin";
  const adminPaths: { url: string; file: string }[] = [];
  const walkAdmin = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walkAdmin(full);
      } else if (entry === "page.tsx" || entry === "route.ts") {
        const segments = relative("app/(admin)", dir)
          .split(/[\\/]/)
          .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")))
          .map((s) => (s.startsWith("[") ? "sample" : s));
        adminPaths.push({
          url: "/" + segments.join("/"),
          file: full.replace(/\\/g, "/"),
        });
      }
    }
  };
  walkAdmin(adminRoot);
  check(
    "admin pages and routes were found to scan",
    adminPaths.length > 100,
    `found ${adminPaths.length}`,
  );
  const unmapped = adminPaths.filter(({ url, file }) => {
    // The catch-all only renders notFound(); denying it is harmless.
    if (file.includes("[...path]")) return false;
    const need = permissionKeysForAdminPath(url);
    return need !== "allow" && need.length === 0;
  });
  check(
    "every admin page and route handler has a route-permission rule",
    unmapped.length === 0,
    unmapped.map((u) => u.url).join(", "),
  );
  check(
    "order-alerts is open to any signed-in staff member (the bell depends on it)",
    canAccessAdminPath("/admin/api/order-alerts", []),
  );
  check(
    "b2b-documents needs customer.b2b.view, no more and no less",
    !canAccessAdminPath("/admin/api/b2b-documents", []) &&
      !canAccessAdminPath("/admin/api/b2b-documents", ["orders.view_all"]) &&
      canAccessAdminPath("/admin/api/b2b-documents", ["customer.b2b.view"]),
  );

  // --- Live: the DSA-08 endpoint itself -----------------------------------
  const origin = process.env.APP_URL?.trim() || "http://localhost:3000";
  let serverUp = false;
  try {
    const ping = await fetch(origin, { cache: "no-store" });
    serverUp = ping.ok;
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    console.warn(
      `skip — dev server not reachable at ${origin}; the live cross-origin checks did NOT run`,
    );
  } else {
    // A real staff session is required, or middleware redirects the request to
    // the login page before it ever reaches the handler — and `fetch` follows
    // that redirect, so every probe comes back 200 and the guards look broken
    // when they are simply never consulted.
    const prisma = getPrisma();
    const staff = await prisma.staff.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    if (!staff) {
      console.warn("skip — no active staff row to build a session from");
    } else {
      const token = createSessionToken();
      const expiresAt = new Date(Date.now() + STAFF_SESSION_TTL_MS);
      const session = await prisma.staffSession.create({
        data: {
          staffId: staff.id,
          tokenHash: hashSessionToken(token),
          expiresAt,
          lastUsedAt: new Date(),
        },
        select: { id: true },
      });
      const jwt = await signSessionJwt({ token, expiresAt });
      const cookie = `${STAFF_SESSION_COOKIE}=${jwt}`;
      const target = `${origin}/admin/api/order-alerts`;

      try {
        const crossOrigin = await fetch(target, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://evil.example",
            cookie,
          },
          body: JSON.stringify({ ids: [] }),
          redirect: "manual",
          cache: "no-store",
        });
        check(
          "order-alerts POST rejects a cross-origin request",
          crossOrigin.status === 403,
          `status=${crossOrigin.status}`,
        );

        const formEncoded = await fetch(target, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin,
            cookie,
          },
          body: "ids=",
          redirect: "manual",
          cache: "no-store",
        });
        check(
          "order-alerts POST rejects a non-JSON body instead of marking all read",
          formEncoded.status === 415,
          `status=${formEncoded.status}`,
        );

        const noOrigin = await fetch(target, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ ids: [] }),
          redirect: "manual",
          cache: "no-store",
        });
        check(
          "order-alerts POST rejects a request with no Origin header",
          noOrigin.status === 403,
          `status=${noOrigin.status}`,
        );

        // The legitimate path must still work, or the guard is just a 403 machine.
        const sameOrigin = await fetch(target, {
          method: "POST",
          headers: { "content-type": "application/json", origin, cookie },
          body: JSON.stringify({ ids: [] }),
          redirect: "manual",
          cache: "no-store",
        });
        check(
          "order-alerts POST still works same-origin with a staff session",
          sameOrigin.status === 200,
          `status=${sameOrigin.status}`,
        );
      } finally {
        await prisma.staffSession.delete({ where: { id: session.id } });
        await prisma.$disconnect();
      }
    }
  }

  if (failures > 0) {
    console.error(`route security failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} route security checks`);
}

main().catch((error) => {
  console.error("route security crashed:", error);
  process.exitCode = 1;
});
