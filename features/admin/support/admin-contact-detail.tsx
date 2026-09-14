"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveAdminContactAction } from "@/features/admin/support/contact-actions";
import { ContactStatusBadge } from "@/features/admin/support/admin-support-badges";
import type {
  AdminContactSubmission,
  ContactStatus,
} from "@/lib/admin/support-mock";

export function AdminContactDetail({
  contact,
}: {
  contact: AdminContactSubmission;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ContactStatus>(contact.status);
  const [reply, setReply] = useState(contact.reply);
  const [notes, setNotes] = useState(contact.staffNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleUpdate() {
    setError(null);
    startTransition(async () => {
      const result = await saveAdminContactAction({
        id: contact.id,
        status,
        reply,
        staffNotes: notes,
      });
      if (!result.ok) {
        setError(result.formError);
        return;
      }
      if (result.mailWarning) {
        notifyError(result.mailWarning);
      } else {
        notifySuccess({
          title: "Contact updated",
          description: `Status set to ${status}.`,
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {contact.subject}
        </h1>
        <Link
          href="/admin/contacts"
          className="mt-1 inline-block text-sm font-medium text-[#3897f0] hover:underline"
        >
          ← Back to Contacts
        </Link>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">Contact</h2>
          <ContactStatusBadge status={status} />
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-900">{contact.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Email</dt>
            <dd className="text-neutral-800">{contact.email}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Phone</dt>
            <dd className="text-neutral-800">{contact.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Submitted</dt>
            <dd className="text-neutral-800">{contact.submittedAt}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Source</dt>
            <dd className="text-neutral-800">{contact.source}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Query</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">
          {contact.message}
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-800">Status</span>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContactStatus)}
            disabled={pending}
          >
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </Select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-800">Reply</span>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Customer-facing reply…"
            disabled={pending}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-800">
            Staff notes
          </span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes (not sent to customer)…"
            disabled={pending}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Link
            href="/admin/contacts"
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </Link>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={pending}
            className="rounded-lg bg-emerald-500 px-5 text-white hover:bg-emerald-600"
          >
            {pending ? "Saving…" : "Update"}
          </Button>
        </div>
      </section>
    </div>
  );
}
