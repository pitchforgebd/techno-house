"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MoreVertical, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import { AdminEmailTemplateEditDialog } from "@/features/admin/marketing/admin-email-template-edit-dialog";
import { setEmailTemplateEnabledAction } from "@/features/admin/marketing/email-template-actions";
import type {
  AdminEmailTemplate,
  EmailTemplateAudience,
} from "@/lib/mail/templates";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: { id: EmailTemplateAudience | "all"; label: string }[] = [
  { id: "all", label: "All Email Templates" },
  { id: "admin", label: "Admin Email Templates" },
  { id: "customer", label: "Customer Email Templates" },
  { id: "common", label: "Common Email Templates" },
];

export function AdminEmailTemplatesNexa({
  rows,
}: {
  rows: AdminEmailTemplate[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<EmailTemplateAudience | "all">("all");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminEmailTemplate | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = rows;
    if (tab !== "all") {
      list = list.filter((row) => row.audience === tab);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (row) =>
          row.emailType.toLowerCase().includes(q) ||
          row.subject.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, query]);

  function toggleEnabled(row: AdminEmailTemplate, checked: boolean) {
    startTransition(async () => {
      const result = await setEmailTemplateEnabledAction({
        id: row.id,
        enabled: checked,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(checked ? "Template enabled" : "Template disabled");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 pt-5 sm:px-5">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            All Email Templates
          </h1>
          <p className="mt-1 pb-2 text-sm text-text-muted">
            Edit the subject and body of each transactional email type. Not yet
            wired to automatic sending — use &ldquo;Send test email&rdquo; on
            the edit dialog to preview real delivery.
          </p>
          <nav
            aria-label="Email template audiences"
            className="mt-2 flex flex-wrap gap-x-5"
          >
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Emails..."
              className={cn(controlClass, "pl-9")}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  #
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Email type
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Subject
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Status
                </TableHeader>
                <TableHeader className="w-14 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Options
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular-nums text-neutral-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-neutral-900">
                    {row.emailType}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-600">
                    {row.subject}
                  </TableCell>
                  <TableCell>
                    <AdminToggleSwitch
                      label={`Status for ${row.emailType}`}
                      checked={row.enabled}
                      onChange={(checked) => toggleEnabled(row, checked)}
                    />
                  </TableCell>
                  <TableCell className="relative">
                    <button
                      type="button"
                      aria-label={`Options for ${row.emailType}`}
                      onClick={() =>
                        setMenuId((id) => (id === row.id ? null : row.id))
                      }
                      className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {menuId === row.id ? (
                      <div className="absolute right-2 z-20 mt-1 min-w-[7rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
                          onClick={() => {
                            setEditing(row);
                            setMenuId(null);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Single-vendor store — seller email templates are not included.{" "}
        <Link
          href="/admin/marketing"
          className="text-[#3897f0] hover:underline"
        >
          Marketing hub
        </Link>
      </p>

      {editing ? (
        <AdminEmailTemplateEditDialog
          template={editing}
          open={Boolean(editing)}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
