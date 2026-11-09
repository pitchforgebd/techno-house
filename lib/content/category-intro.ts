/**
 * Category intro + FAQ from Markdown files (SEO phase 5): no database, no
 * migration. content/category-intros/{slug}.md looks like:
 *
 *     Intro paragraphs, with **bold**, [links](/category/x) and "- " lists.
 *
 *     ## Frequently asked questions
 *
 *     ### A question?
 *     Its answer.
 *
 * A file with a "<!-- draft -->" line or any [VERIFY] marker is an unreviewed
 * draft and is NOT rendered, so neither can reach customers. Remove the line
 * and every marker to publish. CONTENT_PREVIEW=1 renders drafts for local
 * review only.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";

export type CategoryFaq = { question: string; answerHtml: string; answerText: string };
export type CategoryIntro = { introHtml: string; faqs: CategoryFaq[]; isDraft: boolean };

export const FAQ_HEADING = "Frequently asked questions";
const DRAFT_COMMENT = "<!-- draft -->";
const VERIFY_MARKER = "[VERIFY";
const SLUG = /^[a-z0-9-]{1,120}$/;
const INTRO_DIR = path.join(process.cwd(), "content", "category-intros");

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
}

function blocksToHtml(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${inline(lines.join(" "))}</p>`;
    })
    .join("");
}

function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure parser (exported for tests and the content check). */
export function parseCategoryIntro(markdown: string): CategoryIntro {
  const source = markdown.replace(/\r\n/g, "\n");
  const isDraft = source.includes(DRAFT_COMMENT) || source.includes(VERIFY_MARKER);
  const text = source.replace(DRAFT_COMMENT, "");
  const [intro = "", faqPart = ""] = text.split(new RegExp(`^##\\s+${FAQ_HEADING}\\s*$`, "m"));
  const faqs = faqPart
    .split(/^###\s+/m)
    .slice(1)
    .map((chunk) => {
      const [question = "", ...answer] = chunk.split("\n");
      const body = answer.join("\n").trim();
      return {
        question: plainText(question),
        answerHtml: sanitizeBlogBody(blocksToHtml(body)),
        answerText: plainText(body),
      };
    });
  return {
    introHtml: sanitizeBlogBody(blocksToHtml(intro)),
    faqs,
    isDraft,
  };
}

export function introWordCount(markdown: string): number {
  const [intro = ""] = markdown
    .replace(/\r\n/g, "\n")
    .replace(DRAFT_COMMENT, "")
    .split(/^##\s+/m);
  return plainText(intro).split(" ").filter(Boolean).length;
}

const cache = new Map<string, CategoryIntro | null>();

/** The intro to show for a category, or null (no file, or still a draft). */
export async function getCategoryIntro(slug: string): Promise<CategoryIntro | null> {
  if (!SLUG.test(slug)) {
    return null;
  }
  let intro = cache.get(slug);
  if (intro === undefined) {
    try {
      intro = parseCategoryIntro(await readFile(path.join(INTRO_DIR, `${slug}.md`), "utf8"));
    } catch {
      intro = null;
    }
    cache.set(slug, intro);
  }
  return intro && (!intro.isDraft || process.env.CONTENT_PREVIEW === "1") ? intro : null;
}
