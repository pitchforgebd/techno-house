import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { brandRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Brands — Techno House",
};

export default async function BrandsPage() {
  const brands = await brandRepository.list();

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
      <p className="mt-2 text-body text-text-muted">
        Browse products by brand. Prices in ৳ are display-only.
      </p>
      {brands.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No brands yet"
          description="Brand listings will appear here when the catalog is available."
        />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/brand/${brand.slug}`}
                className="flex h-24 flex-col items-center justify-center gap-2 border border-border bg-surface px-3 py-4 transition-colors hover:border-primary"
              >
                <Image
                  src={brand.logoSrc}
                  alt=""
                  width={160}
                  height={48}
                  unoptimized
                  className="h-10 w-auto max-w-full object-contain"
                />
                <span className="text-caption font-medium text-text-muted">
                  {brand.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
