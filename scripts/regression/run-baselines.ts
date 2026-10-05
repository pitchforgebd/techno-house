/**
 * Phase 17 final regression orchestrator (P17-T07).
 *
 *   npm run test:regression
 *
 * Runs every hardening baseline in sequence. Exit 1 if any suite fails.
 * Does not replace typecheck/lint/build — those stay separate npm scripts.
 */
import { spawnSync } from "node:child_process";

const SUITES: { name: string; script: string }[] = [
  { name: "security", script: "test:security" },
  { name: "payments", script: "test:payments" },
  { name: "queries", script: "test:queries" },
  { name: "bundle", script: "test:bundle" },
  { name: "a11y", script: "test:a11y" },
  { name: "seo", script: "test:seo" },
  { name: "pc-builder", script: "test:pc-builder" },
  { name: "home-sections", script: "test:home-sections" },
  { name: "compare-search", script: "test:compare-search" },
  { name: "product-layout", script: "test:product-layout" },
  { name: "guest-feedback", script: "test:guest-feedback" },
  { name: "jump-up", script: "test:jump-up" },
];

function main(): void {
  let failed = 0;
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";

  console.log("P17 regression — baseline suites\n");

  for (const suite of SUITES) {
    process.stdout.write(`→ ${suite.name} (${suite.script}) … `);
    const result = spawnSync(npm, ["run", suite.script], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
    });
    if (result.status === 0) {
      console.log("ok");
      const lines = (result.stdout ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("ok "));
      for (const line of lines) {
        console.log(`  ${line}`);
      }
    } else {
      failed += 1;
      console.log("FAIL");
      if (result.stdout?.trim()) {
        console.error(result.stdout.trim());
      }
      if (result.stderr?.trim()) {
        console.error(result.stderr.trim());
      }
    }
  }

  console.log("");
  if (failed > 0) {
    console.error(`failed ${failed}/${SUITES.length} suites`);
    process.exit(1);
  }
  console.log(`ok ${SUITES.length} regression suites`);
}

main();
