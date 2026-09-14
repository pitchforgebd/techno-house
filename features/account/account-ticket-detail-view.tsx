"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { AccountShell } from "@/features/account/account-shell";
import { replyTicketAction } from "@/features/account/ticket-actions";
import {
  TICKET_MESSAGE_MAX,
  ticketTopicLabel,
  validateTicketReply,
  type CustomerTicketView,
} from "@/lib/support/customer-ticket-shared";

export function AccountTicketDetailView({
  ticket,
}: {
  ticket: CustomerTicketView | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!ticket) {
    return (
      <AccountShell title="Ticket">
        <EmptyState
          title="Ticket not found"
          description="This ticket is not in your account."
          action={
            <Link
              href="/account/tickets"
              className={buttonClassName({ size: "sm" })}
            >
              Back to support
            </Link>
          }
        />
      </AccountShell>
    );
  }

  const openedAt = new Date(ticket.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const closed = ticket.status === "closed";

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTicketReply({ body });
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0 || closed) {
      return;
    }
    startTransition(async () => {
      const result = await replyTicketAction({
        ticketId: ticket!.id,
        body,
      });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <AccountShell title={ticket.number}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{ticket.status}</Badge>
          <p className="text-caption text-text-muted">
            {ticketTopicLabel(ticket.topic)} · Opened {openedAt}
          </p>
        </div>
        <p className="text-sm font-medium text-text">{ticket.subject}</p>

        <ul className="space-y-3">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className="rounded-md border border-border bg-surface px-4 py-3"
            >
              <p className="text-caption text-text-muted">
                {message.author === "staff" ? "Staff" : "You"} ·{" "}
                {new Date(message.createdAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                {message.body}
              </p>
            </li>
          ))}
        </ul>

        {closed ? (
          <p className="text-sm text-text-muted">This ticket is closed.</p>
        ) : (
          <form onSubmit={handleReply} className="space-y-3">
            {formError ? (
              <p className="text-sm text-rose-600" role="alert">
                {formError}
              </p>
            ) : null}
            <Field label="Reply" htmlFor="ticket-reply" error={errors.body}>
              <Textarea
                id="ticket-reply"
                value={body}
                maxLength={TICKET_MESSAGE_MAX}
                rows={4}
                onChange={(event) => setBody(event.target.value)}
                disabled={pending}
              />
            </Field>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Sending…" : "Send reply"}
            </Button>
          </form>
        )}

        <Link
          href="/account/tickets"
          className={buttonClassName({ size: "sm", variant: "secondary" })}
        >
          Back to support
        </Link>
      </div>
    </AccountShell>
  );
}
