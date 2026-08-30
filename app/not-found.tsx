import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-content px-4 py-8">
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist or has been moved."
        action={
          <Link href="/" className={buttonClassName({ variant: "primary" })}>
            Back to home
          </Link>
        }
      />
    </main>
  );
}
