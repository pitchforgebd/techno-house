"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountShell } from "@/features/account/account-shell";
import { createTicketAction } from "@/features/account/ticket-actions";
import {
  CUSTOMER_TICKET_TOPICS,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
  ticketTopicLabel,
  validateTicketInput,
  type CustomerTicketTopic,
  type CustomerTicketView,
} from "@/lib/support/customer-ticket-shared";

export function AccountTicketsView({
  tickets,
  detailBase = "/account/tickets",
}: {
  tickets: CustomerTicketView[];
  /** Path this list lives at, so a ticket opens inside the same panel. */
  detailBase?: string;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTicketInput({ topic, subject, body });
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    startTransition(async () => {
      const result = await createTicketAction({ topic, subject, body });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      router.push(`/account/tickets/${encodeURIComponent(result.id)}`);
      router.refresh();
    });
  }

  return (
    <AccountShell title="Support">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Tickets are saved to your account and visible to staff in admin
          support. See also{" "}
          <Link href="/support" className="text-primary underline-offset-2 hover:underline">
            help centre
          </Link>
          .
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-md border border-border bg-surface p-4"
        >
          <h2 className="text-sm font-semibold text-text">New ticket</h2>
          {formError ? (
            <p className="text-sm text-rose-600" role="alert">
              {formError}
            </p>
          ) : null}
          <Field label="Topic" htmlFor="ticket-topic" error={errors.topic}>
            <Select
              id="ticket-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={pending}
            >
              <option value="">Select a topic</option>
              {CUSTOMER_TICKET_TOPICS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Subject"
            htmlFor="ticket-subject"
            error={errors.subject}
          >
            <Input
              id="ticket-subject"
              value={subject}
              maxLength={TICKET_SUBJECT_MAX}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Field label="Message" htmlFor="ticket-body" error={errors.body}>
            <Textarea
              id="ticket-body"
              value={body}
              maxLength={TICKET_MESSAGE_MAX}
              rows={5}
              onChange={(event) => setBody(event.target.value)}
              disabled={pending}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Submitting…" : "Submit ticket"}
          </Button>
        </form>

        <div>
          <h2 className="text-sm font-semibold text-text">Your tickets</h2>
          {tickets.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No tickets yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`${detailBase}/${encodeURIComponent(ticket.id)}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-muted/40"
                  >
                    <div>
                      <p className="font-mono text-label font-medium text-text">
                        {ticket.number}
                      </p>
                      <p className="mt-0.5 text-sm text-text">
                        {ticket.subject}
                      </p>
                      <p className="mt-0.5 text-caption text-text-muted">
                        {ticketTopicLabel(ticket.topic as CustomerTicketTopic)}
                      </p>
                    </div>
                    <Badge tone="neutral">{ticket.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
