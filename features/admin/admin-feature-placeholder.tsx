import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";

/**
 * Thin admin placeholder until the user supplies Nexa design screenshots.
 */
export function AdminFeaturePlaceholder({
  title,
  description = "Route is wired in the sidebar. UI design will be applied when screenshots are provided.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState title={title} description={description} />
      <p className="mt-6 text-center">
        <Link href="/admin" className={buttonClassName({ variant: "secondary" })}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
