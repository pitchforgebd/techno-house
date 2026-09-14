import Link from "next/link";
import { Frown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogView } from "@/lib/auth/audit-log";

const ACTION_LABELS: Record<string, string> = {
  "staff.login": "Staff signed in",
  "staff.login_failed": "Staff sign-in failed",
  "staff.login_blocked": "Staff sign-in blocked",
  "staff.logout": "Staff signed out",
  "role.create": "Role created",
  "role.update": "Role updated",
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMetadata(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

/**
 * The reference to show for an audited entity.
 *
 * For an Order this is the customer-facing Order Number, taken from the
 * entry's own metadata. `entityId` is the internal cuid — correct as a foreign
 * key and useless to a human, because it is not the reference the customer
 * quotes, the invoice prints, or the gateway recorded.
 *
 * Historical rows written before order audit entries carried `orderNumber`
 * fall back to the cuid rather than being rewritten. Audit history is evidence;
 * backfilling it to look tidier would destroy the thing that makes it evidence.
 * Those rows are marked so the difference is visible rather than guessed at.
 */
function entityReference(row: AuditLogView): {
  value: string | null;
  legacy: boolean;
} {
  if (row.entityType === "Order" && row.metadata && typeof row.metadata === "object") {
    const number = (row.metadata as Record<string, unknown>).orderNumber;
    if (typeof number === "string" && number.trim()) {
      return { value: number, legacy: false };
    }
  }
  return { value: row.entityId, legacy: row.entityType === "Order" };
}

export function AdminAuditLogView({
  data,
}: {
  data: {
    items: AuditLogView[];
    total: number;
    page: number;
    pageSize: number;
  };
}) {
  const { items, total, page, pageSize } = data;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Privileged staff actions. Passwords, tokens, and raw IP addresses are
          never stored here.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Events</h2>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
            <Frown className="size-12 opacity-50" aria-hidden />
            <p className="text-sm">No audit events yet</p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-44 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    When
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Actor
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Action
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Entity
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Detail
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} className="border-b border-neutral-50">
                    <TableCell className="whitespace-nowrap tabular-nums text-neutral-600">
                      {formatWhen(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-neutral-800">
                      {row.actorLabel}
                      <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-neutral-400">
                        {row.actorType.toLowerCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      {ACTION_LABELS[row.action] ?? row.action}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {row.entityType}
                      {(() => {
                        const reference = entityReference(row);
                        if (!reference.value) {
                          return null;
                        }
                        return (
                          <span
                            className="mt-0.5 block max-w-[12rem] truncate text-[11px] text-neutral-400"
                            title={
                              reference.legacy
                                ? `Internal id — this entry predates order-number logging (${row.entityId})`
                                : reference.value
                            }
                          >
                            {reference.value}
                            {reference.legacy ? (
                              <span className="ml-1 text-neutral-300">
                                (internal id)
                              </span>
                            ) : null}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="max-w-[20rem] truncate font-mono text-[11px] text-neutral-500">
                      {formatMetadata(row.metadata)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3 text-sm text-neutral-500">
            <p>
              {start}–{end} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/admin/staff/audit?page=${page - 1}`}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              ) : null}
              {page < lastPage ? (
                <Link
                  href={`/admin/staff/audit?page=${page + 1}`}
                  className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
