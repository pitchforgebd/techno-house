/**
 * Production env documentation baseline (P18-T01).
 *
 *   npm run test:env
 *
 * Ensures `.env.example` documents required keys. Does not read secrets
 * and does not talk to a host — safe with no deploy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function main(): void {
  const root = process.cwd();
  const example = readFileSync(join(root, ".env.example"), "utf8");
  const deploy = readFileSync(join(root, "docs/DEPLOYMENT.md"), "utf8");

  check(".env.example documents DATABASE_URL", example.includes("DATABASE_URL="));
  check(".env.example documents APP_URL", example.includes("APP_URL="));
  check(
    ".env.example warns DATA_SOURCE=mock is for non-production",
    example.includes("DATA_SOURCE") && example.toLowerCase().includes("forbidden"),
  );
  check(
    ".env.example documents payment + SMTP secret placeholders",
    example.includes("SSLCOMMERZ_") &&
      example.includes("BKASH_") &&
      example.includes("SMTP_PASSWORD="),
  );
  check(
    ".env.example has no obvious live secret values",
    !/PASSWORD="(?!PASSWORD)[^"]{8,}"/.test(example) &&
      !example.includes("sk_live") &&
      !example.includes("AKIA"),
  );

  // The section heading used to be matched literally, which made this check a
  // test of the wording rather than of the content. What matters is that each
  // variable appears in a section that says it is required.
  const requiredSection = deploy.slice(
    deploy.indexOf("### Required"),
    deploy.indexOf("### Recommended"),
  );
  for (const name of [
    "APP_URL",
    "DATABASE_URL",
    "SESSION_JWT_SECRET",
    // The one that turns a forgotten variable into a failed deploy rather
    // than a silently public admin gate (F-14). It was absent from this
    // document entirely until the production-readiness pass.
    "ADMIN_LOGIN_SLUG",
    "GATEWAY_SECRETS_KEY",
    "STORAGE_SECRETS_KEY",
    "COURIER_SECRETS_KEY",
  ]) {
    check(
      `DEPLOYMENT.md lists ${name} as production-required`,
      requiredSection.includes(name),
    );
  }
  check(
    "DEPLOYMENT.md says ADMIN_LOGIN_SLUG failure is a startup failure",
    /ADMIN_LOGIN_SLUG[\s\S]{0,400}(throws on startup|will not start)/.test(deploy),
  );
  // The sweep is the one piece of production wiring that lives outside the
  // application: nothing in the app will report that it was never installed.
  check(
    "DEPLOYMENT.md states the stale-order scheduler requirement",
    deploy.includes("orders:stale") && /Cron \/ scheduler/i.test(deploy),
  );
  check(
    "DEPLOYMENT.md documents the health check endpoint",
    deploy.includes("/api/health"),
  );
  check(
    "DEPLOYMENT.md documents migration, backup and rollback procedures",
    deploy.includes("db:migrate:deploy") &&
      /## Rollback|### Rollback/.test(deploy) &&
      /### Backups/.test(deploy),
  );
  check(
    "DEPLOYMENT.md warns that `prisma migrate dev` is not for production",
    /NEVER `db:migrate` in production|never be pointed at production/.test(deploy),
  );
  check(
    "DEPLOYMENT.md lists post-deployment smoke tests",
    /smoke test/i.test(deploy) && deploy.includes("/admin/access/"),
  );
  check(
    ".env.example documents the stale-order scheduler variables",
    example.includes("STALE_ORDER_RELEASE_HOURS") &&
      example.includes("STALE_SWEEP_TOKEN"),
  );
  check(
    ".env.example documents the three secret-encryption keys separately",
    example.includes("GATEWAY_SECRETS_KEY") &&
      example.includes("STORAGE_SECRETS_KEY") &&
      example.includes("COURIER_SECRETS_KEY"),
  );
  check(
    "DEPLOYMENT.md forbids seed in production",
    deploy.includes("Never") && deploy.includes("seed"),
  );
  check(
    "DEPLOYMENT.md notes no live deploy for P18-T01",
    deploy.includes("no live deploy") || deploy.includes("No live deploy"),
  );

  console.log(
    failures === 0
      ? `ok ${checks} env documentation checks`
      : `failed ${failures}/${checks} env documentation checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main();
