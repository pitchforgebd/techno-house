import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type ProductWarrantyProps = {
  warrantyLabel: string;
};

export function ProductWarranty({ warrantyLabel }: ProductWarrantyProps) {
  return (
    <div
      className="rounded-md border border-border bg-surface px-3 py-3"
      aria-labelledby="product-warranty-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="product-warranty-heading"
          className="text-label font-semibold tracking-tight text-text"
        >
          Warranty
        </h2>
        <Badge tone="warranty">{warrantyLabel}</Badge>
      </div>
      <p className="mt-2 text-caption text-text-muted">
        Coverage shown here is a catalog cue for shopping. Final warranty terms
        follow the product and brand policy at purchase.
      </p>
      <p className="mt-2">
        <Link
          href="/warranty"
          className="text-label font-medium text-primary underline-offset-2 hover:underline"
        >
          Read warranty policy
        </Link>
      </p>
    </div>
  );
}
