"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Frown, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import {
  bulkUpdateRefundReasonsAction,
  setRefundReasonActiveAction,
} from "@/features/admin/refunds/refund-settings-actions";
import type { RefundReasonRow } from "@/lib/refunds/settings";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

type ReasonType = "customer" | "admin_reject";

export function AdminRefundReasonList({
  initialReasons,
}: {
  initialReasons: RefundReasonRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<ReasonType>("customer");
  const [q, setQ] = useState("");
  const [items, setItems] = useState(initialReasons);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (item.type !== tab) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return item.reason.toLowerCase().includes(needle);
    });
  }, [items, q, tab]);

  const allSelected =
    filtered.length > 0 && filtered.every((item) => selected.has(item.id));

  function setActive(id: string, isActive: boolean) {
    startTransition(async () => {
      const result = await setRefundReasonActiveAction({ id, isActive });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setItems((list) =>
        list.map((row) => (row.id === id ? { ...row, isActive } : row)),
      );
      notifySuccess(isActive ? "Reason enabled" : "Reason disabled");
      router.refresh();
    });
  }

  function runBulk(action: "enable" | "disable" | "delete") {
    if (selected.size === 0) {
      notifyError("Select at least one reason first");
      return;
    }
    const ids = [...selected];
    startTransition(async () => {
      const result = await bulkUpdateRefundReasonsAction({ ids, action });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      if (action === "delete") {
        setItems((list) => list.filter((row) => !ids.includes(row.id)));
      } else {
        const isActive = action === "enable";
        setItems((list) =>
          list.map((row) =>
            ids.includes(row.id) ? { ...row, isActive } : row,
          ),
        );
      }
      setSelected(new Set());
      notifySuccess(
        action === "delete"
          ? "Reasons removed"
          : action === "enable"
            ? "Reasons enabled"
            : "Reasons disabled",
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            All refund reasons
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Customer reasons appear on the account refund form; admin reject
            reasons appear when declining a request
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/refunds/reasons/new"
            className="text-body font-medium text-[#3897f0] hover:underline"
          >
            Add new refund reason
          </Link>
          <Link
            href="/admin/refunds/reasons/new"
            aria-label="Add new refund reason"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
          >
            <Plus className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap gap-x-6 border-b border-border px-4 pt-4 sm:px-5">
          {(
            [
              { id: "customer", label: "Customer refund reason" },
              { id: "admin_reject", label: "Admin reject refund reason" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`-mb-px border-b-2 pb-3 text-sm font-medium ${
                  active
                    ? "border-[#3897f0] text-[#3897f0]"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search refund reason..."
                className={cn(controlClass, "pl-9")}
              />
            </div>
            <Select
              aria-label="Bulk action"
              defaultValue=""
              disabled={pending}
              className={cn(controlClass, "sm:w-[10rem]")}
              onChange={(event) => {
                const value = event.target.value;
                event.target.value = "";
                if (value === "enable" || value === "disable" || value === "delete") {
                  runBulk(value);
                }
              }}
            >
              <option value="">Bulk action</option>
              <option value="enable">Enable</option>
              <option value="disable">Disable</option>
              <option value="delete">Delete</option>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-body font-medium text-neutral-600">
              No data found!
            </p>
            <Frown className="size-10 text-neutral-300" aria-hidden />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[40rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) {
                          setSelected(new Set());
                          return;
                        }
                        setSelected(new Set(filtered.map((item) => item.id)));
                      }}
                      aria-label="Select all reasons"
                      className="size-4 accent-[#3897f0]"
                    />
                  </TableHeader>
                  <TableHeader className="w-36 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Type
                  </TableHeader>
                  <TableHeader className="text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Reason
                  </TableHeader>
                  <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(item.id)) {
                              next.delete(item.id);
                            } else {
                              next.add(item.id);
                            }
                            return next;
                          });
                        }}
                        aria-label={`Select ${item.reason}`}
                        className="size-4 accent-[#3897f0]"
                      />
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {item.type === "customer" ? "Customer" : "Admin reject"}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-800">
                      {item.reason}
                    </TableCell>
                    <TableCell>
                      <AdminToggleSwitch
                        label={`Status for ${item.reason}`}
                        checked={item.isActive}
                        onChange={(checked) => setActive(item.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
