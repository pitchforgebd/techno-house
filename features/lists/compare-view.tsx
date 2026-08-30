"use client";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CompareBody } from "@/features/lists/compare-body";
import { MAX_COMPARE } from "@/lib/catalog/lists";

export function CompareView() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: "Compare" },
        ]}
      />
      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Compare</h1>
        <p className="mt-2 text-body text-text-muted">
          Up to {MAX_COMPARE} products in the same category. Saved on this
          device only.
        </p>
      </div>
      <CompareBody className="mt-6" />
    </div>
  );
}
