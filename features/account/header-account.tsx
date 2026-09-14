"use client";

import Link from "next/link";
import { IconUser } from "@/components/layout/chrome-icons";
import { HEADER_ACTION_CLASS } from "@/components/layout/header-action-class";
import {
  useB2BSession,
  useCustomerSession,
} from "@/features/account/customer-session-provider";

const actionClassName = HEADER_ACTION_CLASS;

export function HeaderAccount() {
  const session = useCustomerSession();
  const b2b = useB2BSession();

  // A wholesale buyer's home is their wholesale panel, not the retail one.
  // Without this the icon dropped B2B users into the customer overview, which
  // says nothing about their pricing, minimums or verification state.
  const href = session ? (b2b ? "/b2b/profile" : "/account") : "/account/login";
  const label = session
    ? b2b
      ? `${b2b.company} — wholesale account`
      : session.fullName
    : "Account";

  return (
    <Link
      href={href}
      className={actionClassName}
      aria-label={label}
    >
      <IconUser />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
