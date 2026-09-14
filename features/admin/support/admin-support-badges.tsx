import { Badge } from "@/components/ui/badge";
import type {
  ContactStatus,
  TicketPriority,
  TicketStatus,
} from "@/lib/admin/support-mock";

export function ticketStatusTone(
  status: TicketStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "open") {
    return "sale";
  }
  if (status === "pending") {
    return "warranty";
  }
  if (status === "resolved") {
    return "stock";
  }
  return "neutral";
}

export function ticketPriorityTone(
  priority: TicketPriority,
): "stock" | "sale" | "warranty" | "neutral" {
  if (priority === "urgent" || priority === "high") {
    return "sale";
  }
  if (priority === "medium") {
    return "warranty";
  }
  return "neutral";
}

export function contactStatusTone(
  status: ContactStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "new") {
    return "sale";
  }
  if (status === "read") {
    return "warranty";
  }
  if (status === "replied") {
    return "stock";
  }
  return "neutral";
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={ticketStatusTone(status)}>{status}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge tone={ticketPriorityTone(priority)}>{priority}</Badge>;
}

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return <Badge tone={contactStatusTone(status)}>{status}</Badge>;
}
