"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";

export function AccountComingSoon({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <AccountShell title={title}>
      <EmptyState
        title={`${title} comes next`}
        description={description}
        action={
          actionHref && actionLabel ? (
            <Link href={actionHref} className={buttonClassName({ size: "sm" })}>
              {actionLabel}
            </Link>
          ) : (
            <Link
              href="/account"
              className={buttonClassName({ size: "sm", variant: "secondary" })}
            >
              Back to overview
            </Link>
          )
        }
      />
    </AccountShell>
  );
}
