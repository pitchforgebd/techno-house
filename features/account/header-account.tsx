"use client";

import Link from "next/link";
import { IconUser } from "@/components/layout/chrome-icons";
import { buttonClassName } from "@/components/ui/button";
import { useMockCustomer } from "@/features/account/use-mock-customer";

const actionClassName = buttonClassName({
  variant: "ghost",
  size: "sm",
  className: "relative min-h-11 min-w-11 px-2",
});

export function HeaderAccount() {
  const { session } = useMockCustomer();
  const label = session ? session.fullName : "Account";

  return (
    <Link
      href={session ? "/account" : "/account/login"}
      className={actionClassName}
      aria-label={label}
    >
      <IconUser />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
