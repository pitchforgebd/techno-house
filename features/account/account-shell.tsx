"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { BadgeCheck, LogOut } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { logoutCustomerAction } from "@/features/account/auth-actions";
import { AccountNav } from "@/features/account/account-nav";
import { cn } from "@/lib/cn";
import {
  useB2BSession,
  useCustomerSession,
} from "@/features/account/customer-session-provider";

export function AccountShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const session = useCustomerSession();
  const b2b = useB2BSession();
  const pathname = usePathname();
  const inB2BPanel = b2b !== null && pathname.startsWith("/b2b");
  const [pending, startTransition] = useTransition();

  const initials = (session?.fullName ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

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
          description="Sign in with your Techno House account to continue."
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
          inB2BPanel
            ? { href: "/b2b", label: "Wholesale" }
            : { href: "/account", label: "Account" },
          { label: title },
        ]}
      />
      {/*
        Identity card rather than a line of small grey text: the account area
        is where someone checks *which* account they are in, so the answer
        should be the most legible thing on the page after the title.
      */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold tracking-tight text-text">
              {session.fullName}
            </span>
            <span className="block truncate text-caption text-text-muted">
              {session.email}
            </span>
            {/* A wholesale buyer needs to see which standing they are shopping
                under — pricing on every page depends on it. */}
            {b2b ? (
              <span
                className={cn(
                  "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-bold tracking-wide uppercase",
                  b2b.status === "ACTIVE"
                    ? "bg-primary-soft text-primary"
                    : b2b.status === "PENDING"
                      ? "bg-warning/15 text-warning"
                      : "bg-danger/10 text-danger",
                )}
              >
                <BadgeCheck aria-hidden className="size-3" />
                {b2b.status === "ACTIVE"
                  ? `Wholesale · ${b2b.company}`
                  : b2b.status === "PENDING"
                    ? "Wholesale · verification pending"
                    : "Wholesale · suspended"}
              </span>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          className={buttonClassName({ variant: "ghost", size: "sm", className: "border border-border gap-1.5" })}
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await logoutCustomerAction();
              router.push("/account/login");
              router.refresh();
            });
          }}
        >
          <LogOut aria-hidden strokeWidth={2} className="size-3.5" />
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {title}
      </h1>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <AccountNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
