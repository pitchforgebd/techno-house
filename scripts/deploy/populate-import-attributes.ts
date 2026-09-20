/**
 * Attribute VALUE population for the SMART catalog import (2026-09).
 *
 *   npm run catalog:populate-attributes -- --dry-run   # report only
 *   npm run catalog:populate-attributes                # apply
 *
 * `set-catalog-filter-keys.ts` wired up which attribute keys each category
 * filters on, but a filter only shows once products actually carry a value
 * for that attribute (see lib/data/prisma/product-repository.ts buildFacets
 * — a configured key with zero product values is silently dropped). This
 * script regex-extracts values straight out of `Product.name` for six
 * categories whose SMART-import names are clean/structured enough to do
 * that reliably: All Laptop, RAM (Desktop/Laptop), Motherboard, Casing,
 * Monitor, Headphone.
 *
 * Four other candidate categories (Photocopier, IP Camera, Server,
 * Operating System) are deliberately NOT covered here — their SMART names
 * are a mix of real products, consumables/accessories, and B2B licensing
 * line items with no reliably extractable spec, which is a category-
 * classification problem, not something this script can fix.
 *
 * Additive only: never overwrites a value a product already has for a
 * given attribute (whether set by this script on a prior run, or by an
 * admin by hand). Extraction that finds nothing simply leaves that
 * product/attribute pair alone — no guessing, no "unknown" placeholder.
 *
 * Idempotent — safe to re-run; re-running fills in gaps (e.g. after new
 * products are imported) without touching anything already set.
 */
import { config as loadEnvFiles } from "dotenv";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { getPrisma } from "../../lib/db/prisma";

type Extractor = { key: string; extract: (name: string) => string | null };

function windowContains(name: string, afterIndex: number, span: number, re: RegExp): boolean {
  return re.test(name.slice(Math.max(0, afterIndex - span), afterIndex + span));
}

const RAM_KEYWORD =
  /DDR-?\d|LPDDR-?\d|SODIMM|Unified Memory|on-?board|Soldered|\bRAM\b|\bRam\b|\bMemory\b/i;

function extractRam(name: string): string | null {
  for (const m of name.matchAll(/(\d{1,3})\s*GB/gi)) {
    const after = m.index! + m[0].length;
    if (windowContains(name, after, 30, RAM_KEYWORD)) {
      return `${m[1]}GB`;
    }
  }
  // Corporate-SKU convention with no "RAM"/"DDR" word at all:
  // "...-8GB, 1x8GB-512GB SSD-..." — the first GB figure is the RAM size.
  const m = name.match(/(\d{1,3})GB,\s*\d+\s*[xX]\s*\d+GB-/);
  return m ? `${m[1]}GB` : null;
}

function extractStorage(name: string): string | null {
  for (const m of name.matchAll(/(\d{1,4})\s*(GB|TB)/gi)) {
    const after = m.index! + m[0].length;
    if (windowContains(name, after, 20, /SSD|NVMe|HDD|eMMC|Storage/i)) {
      return `${m[1]}${m[2]!.toUpperCase()}`;
    }
  }
  return null;
}

function extractProcessor(name: string): string | null {
  let m = name.match(/\bM(\d)[a-zA-Z]*\s+chip\b/i);
  if (m) return `Apple M${m[1]}`;
  m = name.match(/\bA(\d+)\s*(Pro|Bionic)?\s*chip\b/i);
  if (m) return `Apple A${m[1]}${m[2] ? ` ${m[2]}` : ""}`;
  m = name.match(/Core(?:™|®)?\s*i([3579])\b/i);
  if (m) return `Core i${m[1]}`;
  m = name.match(/Core(?:™|®)?\s*(Ultra\s*)?([3579])\b/i);
  if (m) return m[1] ? `Core Ultra ${m[2]}` : `Core ${m[2]}`;
  // Bare "Ultra 5"/"Ultra 7" without a preceding "Core" word (DELL-style names).
  m = name.match(/\bUltra\s*([3579])\b/i);
  if (m) return `Core Ultra ${m[1]}`;
  m = name.match(/Ryzen(?:™|®)?\s*((?:AI|Al)\s*)?([3579])\b/i);
  if (m) return m[1] ? `Ryzen AI ${m[2]}` : `Ryzen ${m[2]}`;
  // Bare "i5-1235U" / "i7-14650HX" model form with no "Core"/"Intel" word nearby.
  m = name.match(/\bi([3579])-\d{4,5}[A-Z]{0,3}\b/i);
  if (m) return `Core i${m[1]}`;
  // Last resort: bare "i5"/"i7" with no model number attached at all
  // (e.g. "Intel i5 13th Gen 1335U" — generation/model are separate words).
  m = name.match(/\bi([3579])\b/i);
  if (m) return `Core i${m[1]}`;
  return null;
}

function extractDdrType(name: string): string | null {
  const m = name.match(/DDR-?([345])\b/i);
  return m ? `DDR${m[1]}` : null;
}

// Chipset-family prefix -> socket, for names that state the chipset but not
// the socket in words (e.g. "B650M D3HP" with no "Socket AM5" nearby).
const AMD_AM4_CHIPSETS = /\b(A320|A520|B350|B450|B550|X370|X470|X570)M?\b/i;
const AMD_AM5_CHIPSETS = /\b(A620|B650|B840|B850|X670|X870)E?M?\b/i;
const INTEL_LGA1150_CHIPSETS = /\b(H81|H87|H97|Z97|B85)M?\b/i;
const INTEL_LGA1151_CHIPSETS = /\b(H110|B150|H170|Z170|B250|Z270|B360|H310|B365|H370|Z390|Z370)M?\b/i;
const INTEL_LGA1200_CHIPSETS = /\b(H410|B460|H470|Z490|B560|H510|Z590)M?\b/i;
const INTEL_LGA1700_CHIPSETS = /\b(B660|B760|H610|H670|Z690|Z790)M?\b/i;
const INTEL_LGA1851_CHIPSETS = /\b(B860|H810|Z890)M?\b/i;

function extractSocket(name: string): string | null {
  const m = name.match(/\b(AM4|AM5|LGA\d{3,4})\b/i);
  if (m) return m[1]!.toUpperCase();
  if (AMD_AM4_CHIPSETS.test(name)) return "AM4";
  if (AMD_AM5_CHIPSETS.test(name)) return "AM5";
  if (INTEL_LGA1150_CHIPSETS.test(name)) return "LGA1150";
  if (INTEL_LGA1151_CHIPSETS.test(name)) return "LGA1151";
  if (INTEL_LGA1200_CHIPSETS.test(name)) return "LGA1200";
  if (INTEL_LGA1700_CHIPSETS.test(name)) return "LGA1700";
  if (INTEL_LGA1851_CHIPSETS.test(name)) return "LGA1851";
  return null;
}

function extractMbFormFactor(name: string): string | null {
  if (/mini-?itx/i.test(name)) return "Mini-ITX";
  if (/e-?atx/i.test(name)) return "E-ATX";
  if (/micro-?atx/i.test(name) || /\bm-?atx\b/i.test(name) || /\b[A-Z]\d{2,3}M\b/.test(name))
    return "Micro-ATX";
  if (/\batx\b/i.test(name)) return "ATX";
  // Gigabyte-style chipset code with no "M" suffix conventionally means
  // full-size ATX (e.g. "X870 GAMING WF6", "B650 EAGLE AX").
  if (/\b[ABHXZ]\d{2,3}[A-Z]?\b(?!M)/.test(name)) return "ATX";
  return null;
}

function extractCasingFormFactor(name: string): string | null {
  if (/mini-?itx/i.test(name)) return "Mini-ITX";
  if (/e-?atx/i.test(name)) return "E-ATX";
  if (/micro-?atx/i.test(name)) return "Micro-ATX";
  if (/(mid|full)[\s-]?(tower|case)\b/i.test(name) || /\btower\b/i.test(name)) return "Tower";
  if (/\batx\b/i.test(name)) return "ATX";
  return null;
}

function extractMonitorSize(name: string): string | null {
  const m = name.match(/(\d{2}(?:\.\d{1,2})?)\s*[-\s]?(?:["“”]|Inch\b|inch\b)/i);
  return m ? `${m[1]}"` : null;
}

function extractPanel(name: string): string | null {
  const m = name.match(/\b(IPS|VA|TN|OLED)\b/);
  return m ? m[1]! : null;
}

function extractAudioType(name: string): string | null {
  if (/\bTWS\b/i.test(name) || /true\s*wireless/i.test(name)) return "True Wireless";
  if (/on-?ear/i.test(name)) return "On-ear";
  if (/over-?ear/i.test(name)) return "Over-ear";
  if (/ear(phone|bud)s?/i.test(name) || /\bbuds\b/i.test(name) || /in-?ear/i.test(name))
    return "In-ear";
  if (/head(set|phone)/i.test(name)) return "Over-ear";
  return null;
}

function extractConnectivity(name: string): string | null {
  if (/bluetooth/i.test(name)) return "Bluetooth";
  if (/wireless/i.test(name)) return "Wireless";
  if (/\bwired\b/i.test(name) || /3\.5\s*mm/i.test(name) || /\baux\b/i.test(name)) return "Wired";
  if (/\busb\b/i.test(name)) return "USB";
  return null;
}

function extractMicrophone(name: string): string | null {
  if (/\bmic(rophone)?\b/i.test(name) || /\bheadset\b/i.test(name)) return "Yes";
  return null;
}

export const CATEGORY_EXTRACTORS: Record<string, Extractor[]> = {
  "all-laptop": [
    { key: "processor", extract: extractProcessor },
    { key: "ram", extract: extractRam },
    { key: "storage", extract: extractStorage },
  ],
  "ram-desktop": [
    { key: "capacity", extract: extractRam },
    { key: "ramType", extract: extractDdrType },
  ],
  "ram-laptop": [
    { key: "capacity", extract: extractRam },
    { key: "ramType", extract: extractDdrType },
  ],
  motherboard: [
    { key: "socket", extract: extractSocket },
    { key: "formFactor", extract: extractMbFormFactor },
    { key: "ramType", extract: extractDdrType },
  ],
  casing: [{ key: "formFactor", extract: extractCasingFormFactor }],
  monitor: [
    { key: "size", extract: extractMonitorSize },
    { key: "panel", extract: extractPanel },
  ],
  headphone: [
    { key: "audioType", extract: extractAudioType },
    { key: "connectivity", extract: extractConnectivity },
    { key: "microphone", extract: extractMicrophone },
  ],
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = getPrisma();

  const allKeys = [...new Set(Object.values(CATEGORY_EXTRACTORS).flatMap((list) => list.map((e) => e.key)))];
  const attrs = await prisma.productAttribute.findMany({ where: { key: { in: allKeys } } });
  const attrIdByKey = new Map(attrs.map((a) => [a.key, a.id]));
  const missing = allKeys.filter((k) => !attrIdByKey.has(k));
  if (missing.length > 0) {
    console.error(
      "Missing ProductAttribute definitions — run `npm run catalog:bootstrap-attributes` first:",
      missing,
    );
    process.exitCode = 1;
    return;
  }

  let totalSet = 0;
  let totalKept = 0;
  let totalNoMatch = 0;
  const noMatchSamples: Record<string, string[]> = {};

  for (const [categorySlug, extractors] of Object.entries(CATEGORY_EXTRACTORS)) {
    const keys = extractors.map((e) => e.key);
    const products = await prisma.product.findMany({
      where: { category: { slug: categorySlug } },
      select: {
        id: true,
        name: true,
        overview: true,
        attributeValues: {
          where: { attribute: { key: { in: keys } } },
          select: { attributeId: true },
        },
      },
    });

    let catSet = 0;
    let catKept = 0;
    let catNoMatch = 0;

    for (const product of products) {
      // `name` is truncated at import time (PRODUCT_NAME_MAX) but
      // `overview` carries the full untruncated spec text — search both so
      // specs cut off from the name are still found.
      const searchText = `${product.name} ${product.overview}`;
      const already = new Set(product.attributeValues.map((v) => v.attributeId));
      for (const ext of extractors) {
        const attrId = attrIdByKey.get(ext.key)!;
        if (already.has(attrId)) {
          catKept += 1;
          continue;
        }
        const value = ext.extract(searchText);
        if (!value) {
          catNoMatch += 1;
          const bucket = `${categorySlug}/${ext.key}`;
          (noMatchSamples[bucket] ??= []).push(product.name.slice(0, 90));
          continue;
        }
        catSet += 1;
        if (!dryRun) {
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId: product.id, attributeId: attrId } },
            create: { productId: product.id, attributeId: attrId, value },
            update: { value },
          });
        }
      }
    }

    console.log(
      `${categorySlug}: ${products.length} products — ${catSet} ${dryRun ? "would be set" : "set"}, ${catKept} already had a value, ${catNoMatch} no confident match`,
    );
    totalSet += catSet;
    totalKept += catKept;
    totalNoMatch += catNoMatch;
  }

  console.log(
    `\nTotal: ${totalSet} attribute values ${dryRun ? "would be" : ""} set, ${totalKept} already set (untouched), ${totalNoMatch} no confident match.`,
  );

  const sampleEntries = Object.entries(noMatchSamples);
  if (sampleEntries.length > 0) {
    console.log("\nSample no-match names (up to 5 per attribute):");
    for (const [bucket, names] of sampleEntries) {
      console.log(`  ${bucket}:`);
      for (const n of names.slice(0, 5)) {
        console.log(`    - ${n}`);
      }
    }
  }

  if (dryRun) {
    console.log("\nDry run — no changes made.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
