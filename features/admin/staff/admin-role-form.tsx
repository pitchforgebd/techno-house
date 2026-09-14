"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { saveStaffRoleAction } from "@/features/admin/staff/role-actions";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { FEATURE_PERMISSION_GROUPS } from "@/lib/admin/feature-permissions-mock";

type FormMode = "create" | "edit";

export type RoleFormValue = {
  key: string;
  name: string;
  permissionIds: string[];
};

export function AdminRoleForm({
  mode,
  role,
  canManage,
}: {
  mode: FormMode;
  role?: RoleFormValue | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(role?.name ?? "");
  const [permissionIds, setPermissionIds] = useState<Set<string>>(
    () => new Set(role?.permissionIds ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allIds = useMemo(
    () =>
      FEATURE_PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((perm) => perm.id),
      ),
    [],
  );

  function togglePermission(id: string, checked: boolean) {
    if (!canManage) {
      return;
    }
    setPermissionIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canManage) {
      setError("You do not have permission to change roles.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a role name.");
      return;
    }

    startTransition(async () => {
      const result = await saveStaffRoleAction({
        key: role?.key,
        name,
        permissionIds: [...permissionIds],
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the role.");
        return;
      }
      notifySuccess(mode === "create" ? "Role created" : "Role saved");
      router.refresh();
      if (mode === "create") {
        router.push(`/admin/staff/roles/${result.key}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-5 pb-10">
      <div>
        <Link
          href="/admin/staff/roles"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to roles
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          {mode === "create" ? "Add New Role" : `Edit · ${role?.name}`}
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Role Information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="role-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={adminFormControlClass}
            placeholder="Role name"
            disabled={!canManage || pending}
          />
        </div>
      </AdminFormCard>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">Permissions</h2>

        {FEATURE_PERMISSION_GROUPS.map((group) => (
          <div
            key={group.id}
            className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
          >
            <div className="bg-[#f3f0ff] px-5 py-3">
              <h3 className="text-sm font-semibold text-neutral-800">
                {group.label}
              </h3>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {group.permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-white p-3 shadow-sm"
                >
                  <span className="text-xs font-medium leading-snug text-neutral-700">
                    {perm.label}
                  </span>
                  <AdminToggleSwitch
                    label={perm.label}
                    checked={permissionIds.has(perm.id)}
                    onChange={(checked) => togglePermission(perm.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/staff/roles"
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

      <p className="text-xs text-neutral-400">
        {permissionIds.size} of {allIds.length} permissions selected.
        {canManage ? "" : " View only."}
      </p>
    </form>
  );
}
