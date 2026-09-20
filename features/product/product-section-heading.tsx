/**
 * The angled black ribbon heading used down the product page —
 * Specifications, Details, Q&A, Review, Related products. Extracted from
 * `product-related.tsx`, which had the only copy, so the stacked sections
 * below the gallery read as one consistent run of headings.
 */
export function ProductSectionHeading({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch">
      <h2
        id={id}
        className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground uppercase [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
      >
        {children}
      </h2>
      <div className="min-w-0 flex-1 border-b-2 border-text" />
    </div>
  );
}
