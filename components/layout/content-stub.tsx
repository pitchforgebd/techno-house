import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export function ContentStub({
  heading,
  title,
  description,
  action,
}: {
  heading: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
      <EmptyState
        className="mt-6"
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}
