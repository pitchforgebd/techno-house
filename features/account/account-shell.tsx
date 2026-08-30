"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountNav } from "@/features/account/account-nav";
import { useMockCustomer } from "@/features/account/use-mock-customer";

export function AccountShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { session, signOutMock } = useMockCustomer();

  if (!session) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[{ href: "/", label: "Home" }, { label: "Account" }]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <EmptyState
          className="mt-6"
          title="Sign in required"
          description="Use the mock sign-in form. This is not a production session."
          action={
            <Link
              href="/account/login"
              className={buttonClassName({ size: "sm" })}
            >
              Go to sign in
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/account", label: "Account" },
          { label: title },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <header className="max-w-prose">
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            {title}
          </h1>
          <p className="mt-1 text-body text-text-muted">
            {session.fullName} · {session.email}
          </p>
        </header>
        <button
          type="button"
          className={buttonClassName({ variant: "secondary", size: "sm" })}
          onClick={() => {
            signOutMock();
            router.push("/account/login");
          }}
        >
          Sign out (mock)
        </button>
      </div>

      <Alert tone="warning" title="Mock session" className="mt-6">
        <p className="text-caption">
          Signed in on this device only. Not a server session or proof of
          identity. Orders and profile data are previews until Phase 11.
        </p>
      </Alert>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <AccountNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
