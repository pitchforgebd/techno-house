"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { saveStaffAction } from "@/features/admin/staff/staff-actions";
import type { AdminStaffMember, StaffMemberStatus } from "@/lib/admin/staff-types";
import { staffStatusLabel } from "@/lib/admin/staff-types";
import type { StaffRoleRecord } from "@/lib/auth/staff-roles";

type FormMode = "create" | "edit";

const STATUSES: StaffMemberStatus[] = ["active", "invited", "disabled"];

export function AdminStaffForm({
  mode,
  member,
  roles,
  canManage,
  isSelf,
}: {
  mode: FormMode;
  member?: AdminStaffMember | null;
  roles: StaffRoleRecord[];
  canManage: boolean;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [password, setPassword] = useState("");
  const [roleKey, setRoleKey] = useState(
    member?.role?.key ?? roles[0]?.key ?? "",
  );
  const [status, setStatus] = useState<StaffMemberStatus>(
    member?.status ?? "active",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canManage) {
      setError("You do not have permission to save staff members.");
      return;
    }
    if (!fullName.trim()) {
      setError("Enter a name.");
      return;
    }
    if (!email.trim()) {
      setError("Enter an email.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (mode === "create" && !password.trim()) {
      setError("Enter a password for the new staff member.");
      return;
    }
    if (!roleKey) {
      setError("Choose a role.");
      return;
    }

    startTransition(async () => {
      const result = await saveStaffAction({
        id: member?.id,
        fullName,
        email,
        phone,
        roleKey,
        status,
        password: password.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the staff member.");
        return;
      }
      notifySuccess(
        mode === "create" ? "Staff member created" : "Staff member saved",
      );
      setPassword("");
      router.refresh();
      if (mode === "create") {
        router.push("/admin/staff");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl space-y-5 pb-10"
    >
      <div>
        <Link
          href="/admin/staff"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to staff
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          {mode === "create" ? "Add New Staff" : `Edit · ${member?.fullName}`}
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Staff Information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="staff-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={adminFormControlClass}
            placeholder="Full name"
            disabled={!canManage || pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-email" required>
            Email
          </AdminFormLabel>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={adminFormControlClass}
            placeholder="email@example.com"
            disabled={!canManage || pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-phone" required>
            Phone
          </AdminFormLabel>
          <Input
            id="staff-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={adminFormControlClass}
            placeholder="+880 1XXX-XXXXXX"
            disabled={!canManage || pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-password" required={mode === "create"}>
            Password
          </AdminFormLabel>
          <Input
            id="staff-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={adminFormControlClass}
            placeholder={
              mode === "edit" ? "Leave blank to keep current password" : ""
            }
            autoComplete="new-password"
            disabled={!canManage || pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-role" required>
            Role
          </AdminFormLabel>
          <Select
            id="staff-role"
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
            className={adminFormControlClass}
            disabled={!canManage || pending}
          >
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="staff-status" required>
            Status
          </AdminFormLabel>
          <Select
            id="staff-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as StaffMemberStatus)
            }
            className={adminFormControlClass}
            disabled={!canManage || pending || Boolean(isSelf)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {staffStatusLabel(value)}
              </option>
            ))}
          </Select>
          {isSelf ? (
            <p className="text-xs text-neutral-400">
              You cannot change your own account&apos;s status.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/staff"
            className={buttonClassName({ variant: "ghost" })}
          >
            Cancel
          </Link>
          {canManage ? (
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-[#3897f0] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2d7fd4] disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </AdminFormCard>
    </form>
  );
}
