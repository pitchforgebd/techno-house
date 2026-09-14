"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { useAdminLoginPath, useStaffSession } from "@/features/admin/staff-session-provider";

export function AdminStaffProfile() {
  const session = useStaffSession();
  const loginPath = useAdminLoginPath();

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <p className="text-sm text-neutral-500">
          Sign in via{" "}
          <Link href={loginPath} className="text-[#3897f0] hover:underline">
            admin login
          </Link>{" "}
          to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          My profile
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as staff. Role changes happen in the staff directory.
        </p>
      </div>

      <AdminFormCard title="Staff Information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="profile-name">Name</AdminFormLabel>
          <Input
            id="profile-name"
            value={session.fullName}
            readOnly
            disabled
            className={adminFormControlClass}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="profile-email">Email</AdminFormLabel>
          <Input
            id="profile-email"
            type="email"
            value={session.email}
            readOnly
            disabled
            className={adminFormControlClass}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel>Role</AdminFormLabel>
          <div>
            <Badge tone="stock">{session.roleName}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {session.permissions.includes("staff.view") ? (
            <Link
              href="/admin/staff"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Staff directory
            </Link>
          ) : null}
        </div>
      </AdminFormCard>
    </div>
  );
}
