import Link from "next/link";
import { Home } from "lucide-react";

export function TrackBreadcrumb({
  current = "Order Tracking",
}: {
  current?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600"
    >
      <Link
        href="/"
        className="inline-flex items-center text-neutral-500 hover:text-neutral-800"
        aria-label="Home"
      >
        <Home className="size-4" aria-hidden />
      </Link>
      <span className="text-neutral-300" aria-hidden>
        →
      </span>
      <span className="font-medium text-neutral-800">{current}</span>
    </nav>
  );
}
