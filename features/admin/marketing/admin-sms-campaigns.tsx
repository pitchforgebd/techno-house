"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { sendSmsCampaignAction } from "@/features/admin/marketing/sms-campaign-actions";
import type { AdminSmsCampaign, SmsAudience } from "@/lib/sms/campaigns";

const SMS_SEGMENT_LENGTH = 160;

function statusClass(status: AdminSmsCampaign["status"]) {
  if (status === "sent") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "sending") return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-600";
}

const AUDIENCE_LABELS: Record<SmsAudience, string> = {
  all: "All customers with a phone number",
  verified: "Phone-verified customers",
  recent: "Recent buyers",
};

export function AdminSmsCampaigns({
  campaigns,
}: {
  campaigns: AdminSmsCampaign[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<SmsAudience>("all");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const segments = Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH));

  function handleSend() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const outcome = await sendSmsCampaignAction({ message, audience });
      if (!outcome.ok) {
        setError(outcome.formError);
        return;
      }
      setMessage("");
      if (outcome.sentCount > 0) {
        notifySuccess(`Sent to ${outcome.sentCount} of ${outcome.recipientCount} recipients.`);
      }
      setResult(
        outcome.failedCount > 0
          ? `${outcome.sentCount} sent, ${outcome.failedCount} failed out of ${outcome.recipientCount} recipients.`
          : `Sent to all ${outcome.sentCount} recipients.`,
      );
      if (outcome.sentCount === 0) {
        notifyError("No messages were delivered — check Admin → OTP / SMS gateway configuration.");
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Bulk SMS
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sends a real SMS, right now, to real customers via the provider
          configured in Admin → OTP / SMS gateway. Each message has a real
          per-provider cost once a real provider is configured — this
          cannot be undone or recalled once sent.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Compose campaign</h2>

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
            <span className="text-sm font-medium text-neutral-700">Audience</span>
            <Select
              value={audience}
              onChange={(event) => setAudience(event.target.value as SmsAudience)}
              disabled={pending}
            >
              {(Object.keys(AUDIENCE_LABELS) as SmsAudience[]).map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">Message</span>
              <span className="text-xs text-neutral-400">
                {message.length}/480 · {segments} SMS segment{segments === 1 ? "" : "s"}
              </span>
            </div>
            <Textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={480}
              disabled={pending}
            />
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={pending}
              onClick={handleSend}
              className="bg-[#3897f0] hover:bg-[#2f86d8]"
            >
              {pending ? "Sending…" : "Send campaign"}
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
                    Message
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Audience
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
                    <TableCell className="max-w-sm truncate text-neutral-800">
                      {campaign.message}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {AUDIENCE_LABELS[campaign.audience]}
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
