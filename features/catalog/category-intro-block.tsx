import { JsonLd } from "@/components/seo/json-ld-script";
import type { CategoryIntro } from "@/lib/content/category-intro";
import { FAQ_HEADING } from "@/lib/content/category-intro";
import { faqPageJsonLd } from "@/lib/seo/json-ld";

/**
 * Below-the-grid intro and FAQ from content/category-intros/{slug}.md. The
 * FAQPage JSON-LD is built from the same items, so it always matches the page.
 * HTML is already sanitized by the loader.
 */
export function CategoryIntroBlock({
  title,
  intro,
}: {
  title: string;
  intro: CategoryIntro;
}) {
  return (
    <section
      aria-labelledby="category-intro-heading"
      className="mt-12 border-t border-border pt-10 md:mt-14 md:pt-12"
    >
      {intro.faqs.length > 0 ? (
        <JsonLd
          data={faqPageJsonLd(
            intro.faqs.map((faq) => ({
              question: faq.question,
              answer: faq.answerText,
            })),
          )}
        />
      ) : null}
      <article className="th-rich-text border border-border bg-surface px-6 py-8 sm:px-9 sm:py-9">
        <h2 id="category-intro-heading">{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: intro.introHtml }} />
        {intro.faqs.length > 0 ? (
          <>
            <h2>{FAQ_HEADING}</h2>
            {intro.faqs.map((faq) => (
              <div key={faq.question}>
                <h3>{faq.question}</h3>
                <div dangerouslySetInnerHTML={{ __html: faq.answerHtml }} />
              </div>
            ))}
          </>
        ) : null}
      </article>
    </section>
  );
}
