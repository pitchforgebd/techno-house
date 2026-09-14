import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicFlashSales } from "@/lib/marketing/flash-sales";

export const metadata: Metadata = {
  title: "Flash sale — Techno House",
};

export default async function FlashSalePage() {
  const sales = await listPublicFlashSales();

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Flash sale</h1>
      <p className="mt-2 text-body text-text-muted">
        Timed campaigns currently in window. Catalogue prices still apply at
        checkout.
      </p>
      {sales.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Flash sale"
          description="Timed flash-sale merchandising will appear here when a campaign is active."
        />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {sales.map((sale) => (
            <li
              key={sale.id}
              className="rounded-md border border-border bg-surface p-4"
            >
              <p className="text-caption font-medium text-primary">
                {sale.featured ? "Featured flash deal" : "Flash deal"}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {sale.title}
              </h2>
              <p className="mt-3 text-caption text-text-muted">
                {sale.startsAt} → {sale.endsAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
