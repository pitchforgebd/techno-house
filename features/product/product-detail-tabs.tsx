"use client";

import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

type ProductDetailTabsProps = {
  specifications: ReactNode;
  reviews: ReactNode;
  questions: ReactNode;
};

export function ProductDetailTabs({
  specifications,
  reviews,
  questions,
}: ProductDetailTabsProps) {
  return (
    <section className="mt-10" aria-label="Product details">
      <Tabs
        items={[
          {
            id: "specifications",
            label: "Specifications",
            panel: specifications,
          },
          { id: "reviews", label: "Reviews", panel: reviews },
          { id: "questions", label: "Q&A", panel: questions },
        ]}
      />
    </section>
  );
}
