"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { AccountShell } from "@/features/account/account-shell";
import { useMockTickets } from "@/features/account/use-mock-tickets";
import {
  MAX_TICKET_MESSAGES,
  TICKET_MESSAGE_MAX,
  createMockTicketMessageId,
  isMockTicketId,
  mockTicketTopicLabel,
  normalizeTicketIdParam,
  validateMockTicketReply,
} from "@/lib/account/mock-tickets";

export function AccountTicketDetailView({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { getById, addMessage, deleteTicket } = useMockTickets();
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const id = normalizeTicketIdParam(ticketId);
  const ticket = isMockTicketId(id) ? getById(id) : null;

  if (!ticket) {
    return (
      <AccountShell title="Ticket">
        <EmptyState
          title="Ticket not found"
          description="This mock ticket is not stored on this device. Threads are local only."
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

  const currentTicket = ticket;
  const openedAt = new Date(currentTicket.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const atLimit = currentTicket.messages.length >= MAX_TICKET_MESSAGES;

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMockTicketReply({ body });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || atLimit) {
      return;
    }
    addMessage(currentTicket.id, {
      id: createMockTicketMessageId(),
      author: "customer",
      body: body.trim(),
      createdAt: new Date().toISOString(),
    });
    setBody("");
  }

  return (
    <AccountShell title={currentTicket.id}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Open</Badge>
          <p className="text-caption text-text-muted">
            {mockTicketTopicLabel(currentTicket.topic)} · Opened {openedAt}
          </p>
        </div>

        <div>
          <h2 className="text-label font-semibold text-text">
            {currentTicket.subject}
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            Staff replies are not live. Messages stay on this device.
          </p>
        </div>

        <section aria-labelledby="ticket-thread-heading">
          <h2
            id="ticket-thread-heading"
            className="text-label font-semibold text-text"
          >
            Thread
          </h2>
          <ol className="mt-3 space-y-3">
            {ticket.messages.map((message) => {
              const sentAt = new Date(message.createdAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={message.id}
                  className="rounded-md border border-border bg-surface px-4 py-3"
                >
                  <p className="text-caption text-text-muted">You · {sentAt}</p>
                  <p className="mt-2 text-body text-text">{message.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {atLimit ? (
          <p className="text-body text-text-muted">
            This mock thread has reached the message limit.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleReply} noValidate>
            <Field
              label="Add a message"
              htmlFor="ticket-reply"
              error={errors.body}
              hint="Do not include passwords or payment details."
            >
              <Textarea
                id="ticket-reply"
                value={body}
                maxLength={TICKET_MESSAGE_MAX}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
            <Button type="submit" size="sm">
              Save mock reply
            </Button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href="/account/tickets"
            className={buttonClassName({
              size: "sm",
              variant: "ghost",
              className: "border border-border",
            })}
          >
            Back to support
          </Link>
          <button
            type="button"
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
            })}
            onClick={() => {
              deleteTicket(ticket.id);
              router.push("/account/tickets");
            }}
          >
            Remove from this device
          </button>
        </div>
      </div>
    </AccountShell>
  );
}
