"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { updateCustomerProfileAction } from "@/features/admin/customers/customer-actions";
import type { AdminCustomer, CustomerStatus } from "@/lib/admin/customers-mock";
import type { AdminOrder } from "@/lib/admin/orders-mock";
import { formatMoney } from "@/lib/format/currency";

function statusTone(
  status: CustomerStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "active") {
    return "stock";
  }
  if (status === "blocked") {
    return "sale";
  }
  if (status === "invited") {
    return "warranty";
  }
  return "neutral";
}

function paymentTone(
  status: AdminOrder["paymentStatus"],
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "paid") {
    return "stock";
  }
  if (status === "failed" || status === "refunded") {
    return "sale";
  }
  if (status === "unpaid") {
    return "warranty";
  }
  return "neutral";
}

export function AdminCustomerDetail({
  customer,
  orders,
  canEdit = true,
}: {
  customer: AdminCustomer;
  orders: AdminOrder[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(customer.status);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateCustomerProfileAction({
        id: customer.id,
        status,
        notes,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save changes.");
        return;
      }
      notifySuccess({
        title: "Customer updated",
        description: `${customer.fullName}: status ${status}.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/customers" className="hover:underline">
              Customers
            </Link>
            <span className="text-text-muted"> / </span>
            {customer.fullName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {customer.fullName}
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Joined {customer.joinedAt} · {customer.city}
          </p>
        </div>
        <Badge tone={statusTone(status)}>{status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-caption text-text-muted">Orders</p>
          <p className="mt-1 tabular-nums text-2xl font-semibold text-text">
            {customer.orderCount}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-caption text-text-muted">Paid spend</p>
          <p className="mt-1 tabular-nums text-2xl font-semibold text-text">
            {formatMoney(customer.totalSpend)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-4">
          <p className="text-caption text-text-muted">Last order</p>
          <p className="mt-1 text-label font-semibold text-text">
            {customer.lastOrderAt ?? "—"}
          </p>
          {customer.lastOrderNumber ? (
            <Link
              href={`/admin/orders/${encodeURIComponent(customer.lastOrderNumber)}`}
              className="mt-1 inline-block text-caption font-medium text-primary hover:underline"
            >
              Open order
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-label font-semibold text-text">Contact</h2>
          <dl className="mt-3 space-y-2 text-body">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Email</dt>
              <dd className="text-right text-text">{customer.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Phone</dt>
              <dd className="text-right text-text">{customer.phoneFull}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">City</dt>
              <dd className="text-right text-text">{customer.city}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Wallet</dt>
              <dd className="text-right tabular-nums text-text">
                {formatMoney(customer.walletBalance)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Verification</dt>
              <dd className="text-right text-text">
                {customer.verified ? "Verified" : "Unverified"}
                {customer.suspicious ? " · Suspicious" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Customer ID</dt>
              <dd className="font-mono text-caption text-text-muted">
                {customer.id}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-md border border-border bg-surface p-4">
          <h2 className="text-label font-semibold text-text">Staff controls</h2>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Status
            </span>
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as CustomerStatus)
              }
              className="min-h-10"
              disabled={!canEdit || pending}
            >
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="blocked">Blocked</option>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Internal notes
            </span>
            <Textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Staff-only notes…"
              disabled={!canEdit || pending}
            />
          </label>
          {error ? (
            <Alert tone="danger" title="Cannot save">
              <p className="text-caption">{error}</p>
            </Alert>
          ) : null}
          {canEdit ? (
            <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          ) : null}
        </section>
      </div>

      <section className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-label font-semibold text-text">Order history</h2>
        </div>
        {orders.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No orders yet"
              description="This customer has not placed an order."
            />
          </div>
        ) : (
          <Table className="text-caption sm:text-body">
            <TableHead>
              <TableRow>
                <TableHeader>Order</TableHeader>
                <TableHeader className="hidden sm:table-cell">
                  Placed
                </TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Payment</TableHeader>
                <TableHeader className="hidden md:table-cell">
                  Fulfillment
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.number)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.number}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-text-muted sm:table-cell">
                    {order.placedAt}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatMoney(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge tone={paymentTone(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden capitalize md:table-cell">
                    {order.fulfillmentStatus}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <p>
        <Link
          href="/admin/customers"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "border border-border",
          })}
        >
          Back to customers
        </Link>
      </p>
    </div>
  );
}
