import Link from "next/link";
import type { CategoryPageContent } from "@/lib/catalog/category-page-content";

const BRAND_NAME = "Techno House";

export function CategoryPageSeo({ content }: { content: CategoryPageContent }) {
  const hasPriceTable = Boolean(content.priceRows?.length);
  const hasBrands = Boolean(content.brandRows?.length);

  return (
    <section
      aria-labelledby="category-seo-heading"
      className="mt-12 space-y-5 border-t border-border pt-10 md:mt-14 md:space-y-6 md:pt-12"
    >
      <article className="border border-border bg-surface px-6 py-8 sm:px-9 sm:py-9">
        <h2
          id="category-seo-heading"
          className="text-balance text-xl font-semibold leading-snug tracking-tight text-text md:text-[1.65rem]"
        >
          {content.seoHeadline} at{" "}
          <span className="text-primary">{BRAND_NAME}</span>
        </h2>

        <div className="mt-4 max-w-[44rem] space-y-3.5 text-label leading-[1.7] text-text-muted md:text-[0.95rem]">
          {content.seoParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        {hasPriceTable ? (
          <div className="mt-9 border-t border-border pt-8">
            <h3 className="text-lg font-semibold tracking-tight text-text md:text-xl">
              {content.priceRangeTitle}
            </h3>
            {content.priceRangeSubtitle ? (
              <p className="mt-1.5 max-w-[38rem] text-label leading-relaxed text-text-muted">
                {content.priceRangeSubtitle}
              </p>
            ) : null}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th
                      scope="col"
                      className="w-[22%] pb-3 pr-5 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-muted"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="w-[22%] pb-3 pr-5 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-muted"
                    >
                      Device support
                    </th>
                    <th
                      scope="col"
                      className="w-[16%] pb-3 pr-5 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-muted"
                    >
                      Wattage / protocol
                    </th>
                    <th
                      scope="col"
                      className="w-[22%] pb-3 pr-5 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-text-muted"
                    >
                      Best for
                    </th>
                    <th
                      scope="col"
                      className="w-[18%] pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-primary"
                    >
                      Price range
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {content.priceRows!.map((row) => (
                    <tr
                      key={row.type}
                      className="border-b border-border/70 align-top last:border-b-0"
                    >
                      <td className="py-4 pr-5">
                        <p className="text-label font-semibold text-text">
                          {row.type}
                        </p>
                        {row.exampleLabel ? (
                          <p className="mt-1 text-caption leading-snug text-text-muted">
                            Example:{" "}
                            {row.exampleHref ? (
                              <Link
                                href={row.exampleHref}
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {row.exampleLabel}
                              </Link>
                            ) : (
                              row.exampleLabel
                            )}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-4 pr-5 text-label leading-relaxed text-text-muted">
                        {row.deviceSupport}
                      </td>
                      <td className="py-4 pr-5 text-label leading-relaxed text-text-muted">
                        {row.wattage}
                      </td>
                      <td className="py-4 pr-5 text-label leading-relaxed text-text-muted">
                        {row.bestFor}
                      </td>
                      <td className="py-4 text-label font-semibold tabular-nums text-primary">
                        {row.priceRange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </article>

      {content.priceNote ? (
        <p className="px-0.5 text-caption leading-relaxed text-text-muted">
          {content.priceNote}
        </p>
      ) : null}

      {hasBrands ? (
        <article className="rounded-lg border border-border/60 bg-surface-muted/70 px-6 py-8 sm:px-9 sm:py-9">
          <h3 className="text-lg font-semibold tracking-tight text-text md:text-xl">
            {content.brandsTitle}
          </h3>
          {content.brandsSubtitle ? (
            <p className="mt-1.5 max-w-[38rem] text-label leading-relaxed text-text-muted">
              {content.brandsSubtitle}
            </p>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border/60">
                  <th
                    scope="col"
                    className="w-[28%] pb-3 pr-8 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-primary"
                  >
                    Brand
                  </th>
                  <th
                    scope="col"
                    className="w-[28%] pb-3 pr-8 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-primary"
                  >
                    Best for
                  </th>
                  <th
                    scope="col"
                    className="w-[44%] pb-3 text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-primary"
                  >
                    Why choose it
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.brandRows!.map((row) => (
                  <tr
                    key={row.brandLabel}
                    className="border-b border-border/40 align-top last:border-b-0"
                  >
                    <td className="py-4 pr-8">
                      <Link
                        href={row.brandHref}
                        className="text-label font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {row.brandLabel}
                      </Link>
                    </td>
                    <td className="py-4 pr-8 text-label leading-relaxed text-text">
                      {row.bestFor}
                    </td>
                    <td className="py-4 text-label leading-relaxed text-text-muted">
                      {row.why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
