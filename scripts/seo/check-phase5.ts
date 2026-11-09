/**
 * SEO phase 5 checks.
 *
 *   npm run test:seo-phase5                      # offline: rules, redirects, content
 *   npm run test:seo-phase5 -- --base=http://127.0.0.1:3000 --unknown-only
 *   npm run test:seo-phase5 -- --base=… --old=old-slug --new=new-slug
 *
 * With --base it also requests the running site: a mapped old slug must
 * permanently redirect to the new one, an unknown slug must 404.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixProductName, proposeSlug, slugIssue } from "@/lib/catalog/text-fixes";
import { isJunkAlt, safeAlt } from "@/lib/content/alt-text";
import { introWordCount, parseCategoryIntro } from "@/lib/content/category-intro";
import { resolveSlugRedirect } from "@/lib/seo/slug-redirects";

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const equal = (name: string, actual: unknown, expected: unknown) =>
  check(name, actual === expected, `expected ${String(expected)}\n  actual   ${String(actual)}`);

const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = process.cwd();

// --- junk alt ------------------------------------------------------------------
for (const junk of ["", "   ", "abc", "DGDH", "CBBBCXBC", "VBNM B", "“Flash deal”.", "???", "—", null, undefined]) {
  check(`junk alt: ${String(junk)}`, isJunkAlt(junk));
}
for (const good of ["Flash deal", "Laptop on a desk", "RTX 4060", "MSI B650M", "Sky blue", "ল্যাপটপের দাম"]) {
  check(`usable alt: ${good}`, !isJunkAlt(good));
}
equal("safeAlt keeps a good alt", safeAlt("Laptop on a desk", "Title"), "Laptop on a desk");
equal("safeAlt falls back to the title", safeAlt("DGDH", "Gaming Laptop Offer"), "Gaming Laptop Offer");
equal("safeAlt skips a junk title too", safeAlt("DGDH", "HFGD", "Real eyebrow"), "Real eyebrow");
equal("safeAlt: nothing usable", safeAlt("", "XYZ"), "");

// --- product names -------------------------------------------------------------
const fix = (name: string) => fixProductName(name).name;
equal("Smat Watch", fix("Huawei Band 2 Smat Watch, Black"), "Huawei Band 2 Smart Watch, Black");
equal("SMAT WATCH keeps case", fix("SMAT WATCH X"), "SMART WATCH X");
equal("Ryzen Al", fix("AERO X16/AMD Ryzen Al 7 350"), "AERO X16/AMD Ryzen AI 7 350");
equal("Ryzen Alpha untouched", fix("Ryzen Alpha Kit"), "Ryzen Alpha Kit");
equal("stray #", fix("GIGABYTE AMD # X870 A ELITE"), "GIGABYTE AMD X870 A ELITE");
equal("double # is removed in one pass", fix("Intel Arc A750 # # 21P02J00BAG (8GB)"), "Intel Arc A750 21P02J00BAG (8GB)");
equal("leading part code moves to the end", fix("3813C001AA # Canon DADF-BA1"), "Canon DADF-BA1 (3813C001AA)");
equal("code already in the name is not repeated", fix("5142C001AA # Canon (5142C001AA) Toner"), "Canon (5142C001AA) Toner");
equal("# without spaces untouched", fix("UAC-B142#2MP Camera"), "UAC-B142#2MP Camera");
equal("double spaces", fix("Corsair  Elgato   Cam"), "Corsair Elgato Cam");
equal("glued unit", fix("Laptop 32 GBRAM"), "Laptop 32 GB RAM");
equal("glued unit, no space", fix("M.2 256GBSSD-3 Cell"), "M.2 256GB SSD-3 Cell");
equal("glued unit after 2X", fix("2X8GBDDR4 2400"), "2X8GB DDR4 2400");
equal("normal unit untouched", fix("16GB RAM, 512GB SSD"), "16GB RAM, 512GB SSD");
equal("clean name untouched", fix("MSI PRO H610M-S DDR4"), "MSI PRO H610M-S DDR4");
for (const name of ["A # # B", "CODE123 # X # Y  Z", "Smat Watch  # 8GBRAM"]) {
  equal(`idempotent: ${name}`, fix(fix(name)), fix(name));
}
equal("rules can be limited", fixProductName("Smat Watch  X", ["double_space"]).name, "Smat Watch X");

// --- slugs ---------------------------------------------------------------------
const none = new Set<string>();
equal("-copy detected", slugIssue("hp-probook-copy", "HP ProBook"), "copy");
equal("-copy-2 detected", slugIssue("hp-probook-copy-2", "HP ProBook"), "copy");
equal("cut mid-word detected", slugIssue("hp-15-laptop-512-gb-s", "HP 15 Laptop 512 GB SSD Silver"), "truncated_mid_word");
equal("cut on a word end is fine", slugIssue("hp-15-laptop-512-gb", "HP 15 Laptop 512 GB SSD"), null);
equal("complete slug is fine", slugIssue("hp-15-laptop", "HP 15 Laptop"), null);
equal("truncated: word is finished", proposeSlug("hp-15-laptop-512-gb-s", "HP 15 Laptop 512 GB SSD Silver", none), "hp-15-laptop-512-gb-ssd");
equal("copy: from the name", proposeSlug("hp-old-copy", "HP ProBook 450", none), "hp-probook-450");
check("copy: no trailing hyphen after the 80-character cut", !/-$/.test(proposeSlug("x-copy", `${"a".repeat(79)} bcd`, none) ?? "-"));
equal("copy: name-slug taken means no proposal", proposeSlug("hp-probook-copy", "HP ProBook", new Set(["hp-probook"])), null);

// --- slug redirects ------------------------------------------------------------
const map = { "old-a": "new-a", "chain-1": "chain-2", "chain-2": "chain-3", "loop-a": "loop-b", "loop-b": "loop-a" };
equal("mapped slug", resolveSlugRedirect("old-a", map), "new-a");
equal("unknown slug", resolveSlugRedirect("nope", map), null);
equal("chain resolves to the end", resolveSlugRedirect("chain-1", map), "chain-3");
equal("a loop is not followed", resolveSlugRedirect("loop-a", map), null);
equal("Object prototype key is not a slug", resolveSlugRedirect("constructor", map), null);
const shipped = JSON.parse(readFileSync(join(root, "lib/seo/slug-redirects.json"), "utf8")) as Record<string, string>;
for (const [from, to] of Object.entries(shipped)) {
  check(`redirect slugs are valid: ${from}`, /^[a-z0-9-]+$/.test(from) && /^[a-z0-9-]+$/.test(to));
  check(`redirect is not to itself: ${from}`, from !== to);
  check(`redirect resolves: ${from}`, resolveSlugRedirect(from, shipped));
}

// --- category intros -----------------------------------------------------------
const INTROS = ["laptop", "gaming-pc", "desktop", "monitor", "processor", "graphics-card", "nvme-ssd", "ram-desktop", "phone", "printer", "security", "networking"];
const money = /৳|\bTk\b|\bBDT\b|\b\d[\d,]*\s*(?:taka|lakh)\b/i;
for (const slug of INTROS) {
  const file = join(root, "content/category-intros", `${slug}.md`);
  check(`intro exists: ${slug}`, existsSync(file));
  if (!existsSync(file)) continue;
  const markdown = readFileSync(file, "utf8");
  const parsed = parseCategoryIntro(markdown);
  const words = introWordCount(markdown);
  check(`intro ${slug}: 150-300 words`, words >= 150 && words <= 300, String(words));
  check(`intro ${slug}: 3-5 FAQs`, parsed.faqs.length >= 3 && parsed.faqs.length <= 5, String(parsed.faqs.length));
  check(`intro ${slug}: no prices`, !money.test(markdown), markdown.match(money)?.[0]);
  check(`intro ${slug}: held as a draft`, parsed.isDraft);
  const keyword = (markdown.match(/price in (?:bangladesh|bd)/gi) ?? []).length;
  check(`intro ${slug}: no keyword stuffing`, keyword <= 1, String(keyword));
  check(`intro ${slug}: FAQ answers present`, parsed.faqs.every((faq) => faq.question.endsWith("?") && faq.answerText.length > 0));
  check(`intro ${slug}: draft comment not rendered`, !parsed.introHtml.includes("draft -->"));
}
const sample = `<!-- draft -->\n\nSee **this** [page](/shop) and [bad](javascript:alert(1)) <script>x</script>\n\n## Frequently asked questions\n\n### Why?\nBecause.\n`;
const parsedSample = parseCategoryIntro(sample);
check("parser renders bold and site links", parsedSample.introHtml.includes("<strong>this</strong>") && parsedSample.introHtml.includes('<a href="/shop">'));
check("parser drops script and non-site links", !/<script|<a href="java/.test(parsedSample.introHtml), parsedSample.introHtml);
check("marker makes a draft", parseCategoryIntro("Text [VERIFY: x]").isDraft);
check("clean file is not a draft", !parseCategoryIntro("Clean text only.").isDraft);

// --- blog drafts ---------------------------------------------------------------
const blogDir = join(root, "content/blog");
const drafts = existsSync(blogDir) ? readdirSync(blogDir).filter((name) => name.endsWith(".md")) : [];
equal("five blog drafts", drafts.length, 5);
for (const name of drafts) {
  const markdown = readFileSync(join(blogDir, name), "utf8");
  const front = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? markdown.match(/^---\r\n([\s\S]*?)\r\n---/)?.[1] ?? "";
  for (const field of ["title:", "slug:", "description:", "category_link:", "status: draft"]) {
    check(`${name}: front matter ${field}`, front.includes(field));
  }
  check(`${name}: slug matches file name`, front.includes(`slug: ${name.replace(/\.md$/, "")}`));
  const body = markdown.slice(markdown.indexOf("---", 4) + 3);
  for (const line of body.split(/\r?\n/)) {
    const spec = /\b\d[\d,.]*\s?(?:GB|TB|MHz|GHz|W|Hz|taka)\b|৳|\blakh\b/i.test(line);
    if (spec && !line.startsWith("#")) {
      check(`${name}: price/spec is marked`, line.includes("[VERIFY"), line.slice(0, 100));
    }
  }
}

// --- star rating + no rating schema --------------------------------------------
check(
  "product page hides stars with no reviews",
  /reviewCount > 0 \? \(\s*<>\s*<RatingStars/.test(readFileSync(join(root, "features/product/product-summary.tsx"), "utf8")),
);

// --- running site --------------------------------------------------------------
async function live(base: string): Promise<void> {
  const unknown = await fetch(`${base}/product/phase5-unknown-slug-xyz`, { redirect: "manual" });
  equal("unknown slug still 404s", unknown.status, 404);
  const from = arg("old");
  const to = arg("new");
  if (from && to) {
    const old = await fetch(`${base}/product/${from}`, { redirect: "manual" });
    check("old slug redirects permanently", old.status === 301 || old.status === 308, String(old.status));
    check("old slug points at the new one", old.headers.get("location")?.endsWith(`/product/${to}`), old.headers.get("location") ?? "");
    const bot = await fetch(`${base}/product/${from}`, { redirect: "manual", headers: { "User-Agent": "Googlebot" } });
    check("old slug redirects for Googlebot", bot.status === 301 || bot.status === 308, String(bot.status));
    const fresh = await fetch(`${base}/product/${to}`, { redirect: "manual" });
    equal("new slug answers 200", fresh.status, 200);
    console.log(`old slug status: ${old.status} -> ${old.headers.get("location")}`);
  }
}

async function main(): Promise<void> {
  const base = arg("base")?.replace(/\/$/, "");
  if (base) await live(base);
  console.log(failures === 0 ? `ok ${checks} phase-5 checks` : `failed ${failures}/${checks} phase-5 checks`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
