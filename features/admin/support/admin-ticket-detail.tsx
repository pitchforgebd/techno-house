"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  replyAdminTicketAction,
  updateAdminTicketStatusAction,
} from "@/features/admin/support/ticket-actions";
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from "@/features/admin/support/admin-support-badges";
import type {
  AdminSupportTicket,
  TicketPriority,
  TicketStatus,
} from "@/lib/admin/support-mock";
import { cn } from "@/lib/cn";

export function AdminTicketDetail({ ticket }: { ticket: AdminSupportTicket }) {
  const router = useRouter();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [sendPending, startSend] = useTransition();
  const [statusPending, startStatus] = useTransition();

  function handleSendReply() {
    setReplyError(null);
    startSend(async () => {
      const result = await replyAdminTicketAction({
        ticketId: ticket.id,
        body: reply,
      });
      if (!result.ok) {
        setReplyError(result.formError);
        return;
      }
      setReply("");
      notifySuccess("Reply sent");
      router.refresh();
    });
  }

  function handleSaveStatus() {
    setStatusError(null);
    startStatus(async () => {
      const result = await updateAdminTicketStatusAction({
        ticketId: ticket.id,
        status,
        priority,
      });
      if (!result.ok) {
        setStatusError(result.formError);
        return;
      }
      notifySuccess("Ticket updated");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium text-primary">
            <Link href="/admin/support" className="hover:underline">
              Tickets
            </Link>
            <span className="text-text-muted"> / </span>
            {ticket.number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-body text-text-muted">
            {ticket.customerName} · {ticket.customerEmail}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TicketPriorityBadge priority={priority} />
          <TicketStatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">Status</span>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
            disabled={statusPending}
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </label>
        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Priority
          </span>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            disabled={statusPending}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </label>
      </div>
      {statusError ? (
        <p className="text-sm text-rose-600" role="alert">
          {statusError}
        </p>
      ) : null}

      {ticket.orderNumber ? (
        <p className="text-caption text-text-muted">
          Linked order:{" "}
          <Link
            href={`/admin/orders/ord-${ticket.orderNumber.replace(/^TH-/i, "")}`}
            className="font-medium text-primary hover:underline"
          >
            {ticket.orderNumber}
          </Link>
        </p>
      ) : null}

      <section className="space-y-4 rounded-md border border-border bg-surface p-4">
        <h2 className="text-label font-semibold text-text">Conversation</h2>
        <ul className="space-y-4">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-md border p-3",
                message.role === "staff"
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-surface-muted",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-caption font-medium text-text">
                  {message.author}
                  <span className="ml-2 font-normal text-text-muted">
                    {message.role === "staff" ? "Staff" : "Customer"}
                  </span>
                </p>
                <time className="text-caption text-text-muted">
                  {message.sentAt}
                </time>
              </div>
              <p className="mt-2 text-body text-text">{message.body}</p>
            </li>
          ))}
        </ul>

        <label className="block space-y-1">
          <span className="text-caption font-medium text-text-muted">
            Staff reply
          </span>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder="Type a reply…"
            disabled={sendPending}
          />
        </label>
        {replyError ? (
          <p className="text-sm text-rose-600" role="alert">
            {replyError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleSendReply}
            disabled={!reply.trim() || sendPending}
          >
            {sendPending ? "Sending…" : "Send reply"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveStatus}
            disabled={statusPending}
          >
            {statusPending ? "Saving…" : "Save status"}
          </Button>
          <Link
            href="/admin/support"
            className={buttonClassName({ variant: "ghost" })}
          >
            Back
          </Link>
        </div>
      </section>
    </div>
  );
}
