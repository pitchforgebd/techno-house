/**
 * Bundle / image baseline (P17-T04).
 *
 *   npm run test:bundle
 *
 * Static guards against known regressions. Not a Lighthouse run.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function main(): void {
  const root = process.cwd();

  const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  check(
    "root layout uses next/font (Plus Jakarta + IBM Plex Mono)",
    layout.includes('from "next/font/google"') &&
      layout.includes("Plus_Jakarta_Sans") &&
      layout.includes("IBM_Plex_Mono") &&
      layout.includes('display: "swap"'),
  );

  const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
  check(
    "next/image allows Unsplash remote host",
    nextConfig.includes("images.unsplash.com") &&
      nextConfig.includes("remotePatterns"),
  );
  check(
    "pg stays server-external (not browser-bundled)",
    nextConfig.includes('serverExternalPackages') &&
      nextConfig.includes('"pg"'),
  );

  const productCard = readFileSync(
    join(root, "features/catalog/product-card.tsx"),
    "utf8",
  );
  check(
    "product cards use next/image with sizes + aspect reserve",
    productCard.includes('from "next/image"') &&
      productCard.includes("aspect-square") &&
      productCard.includes("sizes="),
  );

  const gallery = readFileSync(
    join(root, "features/product/product-gallery.tsx"),
    "utf8",
  );
  // The main image is a native <img> (keeps the stage height fixed for the
  // zoom lens), so next/image's automatic priority does not apply; it must ask
  // for priority itself, because it is the product page's LCP element.
  check(
    "PDP gallery's main image is requested with high priority",
    gallery.includes('fetchPriority="high"'),
  );

  const galleryPad = readFileSync(
    join(root, "lib/product/gallery-images.ts"),
    "utf8",
  );
  // The pad-to-N-frames logic (which appended a th= query that defeated the
  // image cache) was removed on purpose: the gallery shows exactly what was
  // uploaded. Guard against it coming back.
  check(
    "gallery shows the uploaded images as-is (no padding, no cache-busting query)",
    !galleryPad.includes("th=") && galleryPad.includes("return images;"),
  );

  const hero = readFileSync(
    join(root, "features/home/home-hero-slider.tsx"),
    "utf8",
  );
  check(
    "homepage hero marks first slide priority",
    hero.includes('from "next/image"') &&
      (hero.includes("priority={slideIndex === 0}") ||
        hero.includes("priority={index === 0}")),
  );

  const pkg = readFileSync(join(root, "package.json"), "utf8");
  check(
    "no heavy chart/editor libs in dependencies",
    !pkg.includes('"recharts"') &&
      !pkg.includes('"chart.js"') &&
      !pkg.includes('"monaco-editor"'),
  );
  // The admin rich-text editor is built on TipTap. That is fine for the admin
  // panel, but it must never reach a storefront bundle: every file importing
  // it has to live under features/admin/.
  const tiptapImporters = ["app", "features", "components", "lib"]
    .flatMap((dir) => walk(join(root, dir)))
    .filter((file) => /[.]tsx?$/.test(file))
    .filter((file) => readFileSync(file, "utf8").includes('from "@tiptap'))
    .map((file) => file.slice(root.length + 1).split(join("a", "b")[1]!).join("/"));
  check(
    "TipTap is imported only from admin code, never a storefront bundle",
    tiptapImporters.length > 0 &&
      tiptapImporters.every((file) => file.startsWith("features/admin/")),
  );

  const repoImport =
    /import\s+\{[^}]*\b(productRepository|brandRepository|categoryRepository|reviewRepository|mockProducts)\b/;
  const clientFiles = ["features", "components", "app"].flatMap((dir) =>
    walk(join(root, dir)),
  );
  const offenders: string[] = [];
  for (const file of clientFiles) {
    const source = readFileSync(file, "utf8");
    const head = source.trimStart().slice(0, 24);
    if (!head.startsWith('"use client"') && !head.startsWith("'use client'")) {
      continue;
    }
    if (repoImport.test(source)) {
      offenders.push(file);
    }
  }
  check(
    "client components do not value-import data repositories",
    offenders.length === 0,
  );

  console.log(
    failures === 0
      ? `ok ${checks} bundle/image checks`
      : `failed ${failures}/${checks} bundle/image checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main();
