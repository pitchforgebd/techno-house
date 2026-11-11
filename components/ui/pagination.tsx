import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  pageCount,
  hrefForPage,
}: {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
}) {
  const previous = page > 1 ? page - 1 : null;
  const next = page < pageCount ? page + 1 : null;

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      {previous ? (
        <Link
          href={hrefForPage(previous)}
          className={buttonClassName({ variant: "ghost", size: "sm" })}
        >
          Previous
        </Link>
      ) : (
        // A dimmed, inert link: `role="link"` + `aria-disabled` tells assistive
        // tech (and contrast checkers) the faded text is a disabled control,
        // not low-contrast copy.
        <span
          role="link"
          aria-disabled="true"
          className={cn(
            buttonClassName({ variant: "ghost", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          Previous
        </span>
      )}
      <p className="text-label text-text-muted">
        Page {page} of {pageCount}
      </p>
      {next ? (
        <Link
          href={hrefForPage(next)}
          className={buttonClassName({ variant: "ghost", size: "sm" })}
        >
          Next
        </Link>
      ) : (
        <span
          role="link"
          aria-disabled="true"
          className={cn(
            buttonClassName({ variant: "ghost", size: "sm" }),
            "pointer-events-none opacity-50",
          )}
        >
          Next
        </span>
      )}
    </nav>
  );
}
