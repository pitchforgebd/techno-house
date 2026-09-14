"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { sendCampaignAction } from "@/features/newsletter/newsletter-campaign-actions";
import type { AdminNewsletterCampaign } from "@/lib/content/newsletter-campaigns";

function statusClass(status: AdminNewsletterCampaign["status"]) {
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "sending") return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-600";
}

export function AdminNewsletterCampaigns({
  campaigns,
  subscribedCount,
}: {
  campaigns: AdminNewsletterCampaign[];
  subscribedCount: number;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const outcome = await sendCampaignAction({ subject, body });
      if (!outcome.ok) {
        setError(outcome.formError);
        return;
      }
      setSubject("");
      setBody("");
      if (outcome.sentCount > 0) {
        notifySuccess(`Campaign sent to ${outcome.sentCount} of ${outcome.recipientCount} subscribers.`);
      }
      setResult(
        outcome.failedCount > 0
          ? `${outcome.sentCount} sent, ${outcome.failedCount} failed out of ${outcome.recipientCount} subscribers.`
          : `Sent to all ${outcome.sentCount} subscribers.`,
      );
      if (outcome.sentCount === 0) {
        notifyError("No emails were delivered — check Admin → Setup → SMTP configuration.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Compose campaign</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Sends a real email, right now, to all {subscribedCount} subscribed
          address{subscribedCount === 1 ? "" : "es"} via the SMTP settings
          configured in Admin → Setup → SMTP. This cannot be undone or
          recalled once sent.
        </p>

        {error ? (
          <Alert tone="danger" title="Cannot send">
            <p className="text-caption">{error}</p>
          </Alert>
        ) : null}
        {result ? (
          <Alert tone="info" title="Send result">
            <p className="text-caption">{result}</p>
          </Alert>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">Subject</span>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">Body</span>
            <Textarea
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={pending}
            />
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={pending || subscribedCount === 0}
              onClick={handleSend}
              className="bg-[#3897f0] hover:bg-[#2f86d8]"
            >
              {pending ? "Sending…" : `Send to ${subscribedCount} subscribers`}
            </Button>
          </div>
        </div>
      </section>

      {campaigns.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-semibold text-neutral-900">Campaign history</h2>
          </div>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Subject
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Sent / Failed / Total
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Sent at
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="max-w-sm truncate font-medium text-neutral-900">
                      {campaign.subject}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(campaign.status)}`}
                      >
                        {campaign.status}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-600">
                      {campaign.sentCount} / {campaign.failedCount} / {campaign.recipientCount}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
