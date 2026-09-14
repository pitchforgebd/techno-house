import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("th-skeleton rounded-md bg-surface-muted", className)}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-sm border border-border/70 bg-surface p-4">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-4 h-5 w-2/5" />
      <Skeleton className="mt-4 h-9 w-full" />
    </div>
  );
}

export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
