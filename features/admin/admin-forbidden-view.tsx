"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useStaffSession } from "@/features/admin/staff-session-provider";
import { staffHomeHref } from "@/lib/auth/admin-route-permissions";

export function AdminForbiddenView() {
  const session = useStaffSession();
  const home = staffHomeHref(session);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <EmptyState
        title="You do not have access to this page"
        description="Your role does not include this area. Open a page you are allowed to use, or ask an administrator to update your role."
        action={
          <Link href={home} className={buttonClassName({ size: "sm" })}>
            Go to {home === "/admin" ? "dashboard" : "profile"}
          </Link>
        }
      />
    </div>
  );
}
