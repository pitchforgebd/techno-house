"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountShell } from "@/features/account/account-shell";
import { useMockTickets } from "@/features/account/use-mock-tickets";
import {
  MOCK_TICKET_TOPICS,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
  createMockTicket,
  isMockTicketTopic,
  mockTicketTopicLabel,
  validateMockTicketInput,
} from "@/lib/account/mock-tickets";

export function AccountTicketsView() {
  const router = useRouter();
  const { tickets, addTicket } = useMockTickets();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMockTicketInput({ topic, subject, body });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !isMockTicketTopic(topic)) {
      return;
    }
    const ticket = createMockTicket({ topic, subject, body });
    addTicket(ticket);
    router.push(`/account/tickets/${encodeURIComponent(ticket.id)}`);
  }

  return (
    <AccountShell title="Support">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Mock tickets stay on this device. Staff do not receive them. See also{" "}
          <Link
            href="/support"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            the support hub
          </Link>
          .
        </p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Field label="Topic" htmlFor="ticket-topic" error={errors.topic}>
            <Select
              id="ticket-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
            >
              <option value="">Select a topic</option>
              {MOCK_TICKET_TOPICS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
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
            />
          </Field>
          <Field
            label="Message"
            htmlFor="ticket-body"
            error={errors.body}
            hint="Do not include passwords or payment details."
          >
            <Textarea
              id="ticket-body"
              value={body}
              maxLength={TICKET_MESSAGE_MAX}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <Button type="submit" size="sm">
            Open mock ticket
          </Button>
        </form>

        {tickets.length === 0 ? (
          <p className="text-body text-text-muted">
            No mock tickets on this device yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {tickets.map((ticket) => {
              const updatedAt = new Date(ticket.updatedAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={ticket.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-caption text-text-muted">
                      {ticket.id}
                    </p>
                    <p className="mt-0.5 text-label font-medium text-text">
                      {ticket.subject}
                    </p>
                    <p className="mt-0.5 text-caption text-text-muted">
                      {mockTicketTopicLabel(ticket.topic)} · {updatedAt} ·{" "}
                      {ticket.messages.length}{" "}
                      {ticket.messages.length === 1 ? "message" : "messages"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Open</Badge>
                    <Link
                      href={`/account/tickets/${encodeURIComponent(ticket.id)}`}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                      })}
                    >
                      View thread
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
