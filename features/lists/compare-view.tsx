"use client";

import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CompareBody } from "@/features/lists/compare-body";

export function CompareView() {
  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <div className="no-print">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            { label: "Compare" },
          ]}
        />
      </div>
      {/* The visible title lives in the table's first cell (matching the
          comparison layout), so the page heading is for assistive tech. */}
      <h1 className="sr-only">Product comparison</h1>
      {/* `CompareBody` reads `?items=` for shared links, which needs a
          Suspense boundary above `useSearchParams`. */}
      <Suspense
        fallback={<p className="mt-6 text-body text-text-muted">Loading…</p>}
      >
        <CompareBody className="mt-4" />
      </Suspense>
    </div>
  );
}
