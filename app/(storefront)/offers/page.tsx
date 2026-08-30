import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Offers — Techno House",
};

export default function OffersPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Offers</h1>
      <EmptyState
        className="mt-6"
        title="Current offers"
        description="Promotions will appear here when the offers page is ready."
      />
    </div>
  );
}
