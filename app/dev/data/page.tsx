import type { Metadata } from "next";
import { categoryRepository, productRepository } from "@/lib/data";
import { CURRENCY_SYMBOL } from "@/lib/format/currency";

export const metadata: Metadata = {
  title: "Mock data — Techno House",
  robots: { index: false, follow: false },
};

export default async function DevDataPage() {
  const [categories, listing, missing] = await Promise.all([
    categoryRepository.list(),
    productRepository.list({ page: 1, pageSize: 8, sort: "featured" }),
    productRepository.getBySlug("does-not-exist"),
  ]);

  const sample = listing.items[0];
  const detail = sample ? await productRepository.getBySlug(sample.slug) : null;

  return (
    <main className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-caption font-medium text-primary">Foundation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Mock data boundary
        </h1>
        <p className="mt-2 text-text-muted">
          Server Component → repository interface → mock implementation. This
          page is noindex.
        </p>
      </header>
      <p className="text-body">
        {listing.total} products, page {listing.page} of size {listing.pageSize}
        . {categories.length} categories. Missing slug is{" "}
        {missing ? "found" : "null"}.
      </p>
      {detail ? (
        <p className="text-body tabular-nums">
          Sample: {detail.name} — {CURRENCY_SYMBOL}{" "}
          {detail.price.amount.toLocaleString("en-BD")} ({detail.stockStatus})
        </p>
      ) : null}
      <ul className="list-disc pl-5 text-body">
        {listing.items.map((item) => (
          <li key={item.id}>
            {item.name} · {item.categorySlug} · {item.stockStatus}
          </li>
        ))}
      </ul>
    </main>
  );
}
