import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { ReactNode } from "react";

export function AccountAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[{ href: "/", label: "Home" }, { label: "Account" }]}
      />
      <header className="mt-4 max-w-prose">
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        <p className="mt-2 text-body text-text-muted">{description}</p>
      </header>
      <div className="mt-8 max-w-md">{children}</div>
      <p className="mt-8 text-caption text-text-muted">
        Staff sign-in is a separate route and is not available here.{" "}
        <Link
          href="/support"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Need help?
        </Link>
      </p>
    </div>
  );
}
