import { CatalogSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * The skeleton that used to be `app/loading.tsx`. Re-exported as `loading.tsx`
 * only by routes that can never 404 (shop, search, deals, flash-sale, admin).
 * Never put a loading.tsx at or above product/category/brand/blog/offers
 * pages: its Suspense boundary flushes a 200 status before the page's
 * notFound() runs, turning a missing record into a soft 404.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-content px-4 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <CatalogSkeleton />
    </main>
  );
}
