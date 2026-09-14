"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveB2BAccountAction,
  setB2BAccountSuspendedAction,
  updateB2BAccountAction,
} from "@/features/admin/customers/b2b-actions";
import { adminB2BHref, type AdminB2BTab } from "@/lib/admin/b2b-list-shared";
import type { AdminB2BDetail, AdminB2BListResult } from "@/lib/admin/b2b-accounts";
import type { B2BStatus } from "@/lib/generated/prisma/enums";

const TABS: { value: AdminB2BTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function statusTone(status: B2BStatus): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "ACTIVE") {
    return "stock";
  }
  if (status === "SUSPENDED") {
    return "sale";
  }
  return "warranty";
}

export function AdminB2bAccountsList({ data }: { data: AdminB2BListResult }) {
  const router = useRouter();
  const { items, total, page, pageCount, tab, q } = data;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          B2B accounts
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Wholesale applications submitted from real customer accounts.
          Approve to set a tier and discount; the discount then shows as
          the wholesale price on product pages for that customer.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5">
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="B2B account status">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <Link
                  key={t.value}
                  href={adminB2BHref({ base: { tab, q, page: 1 }, tab: t.value, page: 1 })}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-neutral-500 hover:text-neutral-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <form
            className="w-full max-w-xs sm:w-64"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              router.push(
                adminB2BHref({ base: { tab, q, page: 1 }, q: String(form.get("q") ?? ""), page: 1 }),
              );
            }}
          >
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search company, contact, email, phone…"
              aria-label="Search B2B accounts"
            />
          </form>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No B2B accounts match" description="Try another tab or search." />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Company
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Customer
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Tier
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Discount
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Applied
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((account) => (
                  <TableRow key={account.id} className="border-b border-neutral-50">
                    <TableCell className="font-medium text-neutral-900">
                      <Link href={`/admin/customers/b2b/${account.id}`} className="hover:text-[#3897f0]">
                        {account.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      <div>{account.customer.fullName}</div>
                      <div className="text-xs text-neutral-400">{account.customer.email}</div>
                    </TableCell>
                    <TableCell className="text-neutral-600">{account.tier ?? "—"}</TableCell>
                    <TableCell className="text-neutral-600">{account.discountPercent}%</TableCell>
                    <TableCell>
                      <Badge tone={statusTone(account.status)}>{account.status}</Badge>
                    </TableCell>
                    <TableCell className="text-neutral-500">{account.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) => adminB2BHref({ base: { tab, q, page }, page: nextPage })}
            />
          </div>
        ) : null}
      </div>

      {total > 0 ? (
        <p className="text-xs text-neutral-400">
          {total} account{total === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

export function AdminB2bAccountDetail({
  account,
  canManage,
}: {
  account: AdminB2BDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const [discountPercent, setDiscountPercent] = useState(String(account.discountPercent));
  const [tier, setTier] = useState(account.tier ?? "");
  const [notes, setNotes] = useState(account.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsedDiscount = Number.parseInt(discountPercent, 10);

  function save() {
    setError(null);
    startTransition(async () => {
      const input = {
        id: account.id,
        discountPercent: Number.isFinite(parsedDiscount) ? parsedDiscount : 0,
        tier,
        notes,
      };
      const result =
        account.status === "PENDING"
          ? await approveB2BAccountAction(input)
          : await updateB2BAccountAction(input);
      if (!result.ok) {
        setError(result.formError ?? "Could not save.");
        return;
      }
      notifySuccess(account.status === "PENDING" ? "B2B account approved" : "B2B account updated");
      router.refresh();
    });
  }

  function toggleSuspend() {
    setError(null);
    const suspended = account.status !== "SUSPENDED";
    startTransition(async () => {
      const result = await setB2BAccountSuspendedAction({ id: account.id, suspended });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not update the account.");
        return;
      }
      notifySuccess(suspended ? "Account suspended" : "Account reactivated");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#3897f0]">
            <Link href="/admin/customers/b2b" className="hover:underline">
              B2B accounts
            </Link>
            <span className="text-neutral-400"> / {account.company}</span>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {account.company}
          </h1>
        </div>
        <Badge tone={statusTone(account.status)}>{account.status}</Badge>
      </div>

      <section className="grid gap-4 rounded-md border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-neutral-400">Customer</p>
          <Link
            href={`/admin/customers/${account.customer.id}`}
            className="font-medium text-[#3897f0] hover:underline"
          >
            {account.customer.fullName}
          </Link>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Email</p>
          <p className="text-neutral-800">{account.customer.email}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Phone</p>
          <p className="text-neutral-800">{account.customer.phone ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Contact name</p>
          <p className="text-neutral-800">{account.contactName}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-neutral-400">Shop address</p>
          <p className="text-neutral-800">{account.shopAddress ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Applied</p>
          <p className="text-neutral-800">{account.createdAt}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Approved</p>
          <p className="text-neutral-800">{account.approvedAt ?? "—"}</p>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Documents</h2>
        <div className="flex flex-wrap gap-3">
          {account.hasTradeLicence ? (
            <a
              href={`/admin/api/b2b-documents?accountId=${account.id}&which=licence`}
              target="_blank"
              rel="noreferrer"
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              View trade licence
            </a>
          ) : (
            <span className="text-sm text-neutral-400">No trade licence on file</span>
          )}
          {account.hasNid ? (
            <a
              href={`/admin/api/b2b-documents?accountId=${account.id}&which=nid`}
              target="_blank"
              rel="noreferrer"
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              View NID
            </a>
          ) : (
            <span className="text-sm text-neutral-400">No NID on file</span>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          {account.status === "PENDING" ? "Review & approve" : "Wholesale terms"}
        </h2>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-neutral-500">Tier</span>
          <Input
            value={tier}
            onChange={(event) => setTier(event.target.value)}
            placeholder="e.g. Gold, Silver, Bronze"
            disabled={!canManage || pending}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-neutral-500">Discount %</span>
          <Input
            type="number"
            min={0}
            max={90}
            value={discountPercent}
            onChange={(event) => setDiscountPercent(event.target.value)}
            disabled={!canManage || pending}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-neutral-500">Internal notes</span>
          <Textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Staff-only notes…"
            disabled={!canManage || pending}
          />
        </label>

        {error ? (
          <Alert tone="danger" title="Cannot save">
            <p className="text-sm">{error}</p>
          </Alert>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" disabled={pending} onClick={save}>
              {pending
                ? "Saving…"
                : account.status === "PENDING"
                  ? "Approve"
                  : "Save changes"}
            </Button>
            {account.status !== "PENDING" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={toggleSuspend}
              >
                {account.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
