"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { saveAdminProductRequestAction } from "@/features/admin/catalog/product-request-actions";
import {
  BlueSave,
  FieldRow,
  InstructionCard,
  Select,
  SetupCard,
  controlClass,
} from "@/features/admin/settings/setup-ui";
import type { AdminProductRequest } from "@/lib/admin/product-requests-mock";

const STATUS_OPTIONS: AdminProductRequest["status"][] = [
  "new",
  "reviewed",
  "closed",
];

export function AdminProductRequestDetail({
  request,
  canManage,
}: {
  request: AdminProductRequest;
  canManage: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(request.status);
  const [staffNotes, setStaffNotes] = useState(request.staffNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!canManage) {
      setError("You do not have permission to update requests.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveAdminProductRequestAction({
        id: request.id,
        status,
        staffNotes,
      });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      notifySuccess({
        title: "Product request updated",
        description: `Status set to ${status}.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link
          href="/admin/product-requests"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to Product Requests
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Product request
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{request.productWanted}</p>
      </div>

      <SetupCard title="Customer details">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Name
            </dt>
            <dd className="mt-0.5 font-medium text-neutral-900">
              {request.customerName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Date
            </dt>
            <dd className="mt-0.5 text-neutral-700">{request.date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Email
            </dt>
            <dd className="mt-0.5 text-neutral-700">{request.customerEmail}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Phone
            </dt>
            <dd className="mt-0.5 text-neutral-700">{request.customerPhone}</dd>
          </div>
        </dl>
      </SetupCard>

      <SetupCard title="Request">
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Product wanted
            </p>
            <p className="mt-0.5 font-medium text-neutral-900">
              {request.productWanted}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              Customer notes
            </p>
            <p className="mt-0.5 rounded-md border border-neutral-100 bg-neutral-50/80 px-3 py-2 text-neutral-700">
              {request.notes}
            </p>
          </div>
        </div>
      </SetupCard>

      <SetupCard
        title="Staff follow-up"
        hint="Update status and internal notes. Changes are saved to the database."
        footer={
          canManage ? (
            <div className="flex justify-end px-5 pb-5">
              <BlueSave
                onClick={handleSave}
                label={pending ? "Saving…" : "Save"}
                className={
                  pending ? "pointer-events-none opacity-70" : undefined
                }
              />
            </div>
          ) : null
        }
      >
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <FieldRow label="Status">
          <Select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminProductRequest["status"])
            }
            className={controlClass}
            disabled={!canManage || pending}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </Select>
        </FieldRow>
        <FieldRow label="Staff notes" hint="Internal — not shown on storefront">
          <Textarea
            rows={4}
            value={staffNotes}
            onChange={(event) => setStaffNotes(event.target.value)}
            className={controlClass}
            placeholder="Supplier contacted, ETA, catalog link..."
            disabled={!canManage || pending}
          />
        </FieldRow>
      </SetupCard>

      <InstructionCard>
        <p>
          Storefront submissions from{" "}
          <span className="font-medium">/product-request</span> are stored and
          listed here. Status changes persist after Save.
        </p>
      </InstructionCard>
    </div>
  );
}
