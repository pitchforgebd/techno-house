import { EmptyState } from "@/components/ui/empty-state";

/**
 * Deferred, not faked (AD-270, operator decision): the storefront "Compare"
 * feature is localStorage-only today, never synced to an account, so there
 * is no real data in Postgres to report on. The unused CompareList/
 * CompareListItem models already exist in schema for when that changes.
 */
export function AdminCompareReport() {
  return (
    <div className="mx-auto max-w-[900px] space-y-5 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Products Compare
      </h1>
      <EmptyState
        title="Not available yet"
        description="The storefront Compare list is only saved in each visitor's browser today — it isn't synced to a customer account, so there's no real compare data in the database to report on. This report will show real numbers once compare lists are synced to accounts."
      />
    </div>
  );
}
