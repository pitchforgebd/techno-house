import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";

/** Shown when Admin → PC Builder → master "Enabled" switch is off. */
export function PcBuilderUnavailable() {
  return (
    <div className="mx-auto max-w-content px-4 py-16">
      <EmptyState
        title="PC Builder is temporarily unavailable"
        description="We're making changes to the PC Builder. Please check back soon, or browse components directly."
        action={
          <Link href="/shop" className={buttonClassName({ size: "sm" })}>
            Browse products
          </Link>
        }
      />
    </div>
  );
}
