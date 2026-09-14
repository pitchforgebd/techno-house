import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  params: Promise<{ path: string[] }>;
};

function titleFromPath(segments: string[]): string {
  const last = segments[segments.length - 1] ?? "Admin";
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  return { title: titleFromPath(path) };
}

/**
 * Catch-all placeholders for sidebar destinations not yet built.
 * Concrete pages replace these as later P9 tasks land.
 */
export default async function AdminPlaceholderPage({ params }: Props) {
  const { path } = await params;
  const title = titleFromPath(path);
  const href = `/admin/${path.join("/")}`;

  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        title={`${title} — coming soon`}
        description={`Route ${href} is reserved in the admin shell. Content for this module is scheduled in a later Phase 09 task.`}
      />
      <p className="mt-6 text-center">
        <Link
          href="/admin"
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
