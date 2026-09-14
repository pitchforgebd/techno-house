"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  appendMockTicket,
  appendMockTicketMessage,
  findMockTicket,
  persistMockTickets,
  readStoredTickets,
  removeMockTicket,
  type MockTicket,
  type MockTicketMessage,
} from "@/lib/account/mock-tickets";

type Listener = () => void;

const EMPTY_TICKETS: MockTicket[] = [];
const listeners = new Set<Listener>();
let cached: MockTicket[] = EMPTY_TICKETS;

function sameTickets(a: MockTicket[], b: MockTicket[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every(
    (ticket, index) =>
      ticket.id === b[index]?.id &&
      ticket.updatedAt === b[index]?.updatedAt &&
      ticket.messages.length === b[index]?.messages.length,
  );
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): MockTicket[] {
  const next = readStoredTickets();
  if (sameTickets(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): MockTicket[] {
  return EMPTY_TICKETS;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(next: MockTicket[]) {
  persistMockTickets(next);
  cached = next;
  emit();
}

export function useMockTickets() {
  const tickets = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const getById = useCallback(
    (ticketId: string) => findMockTicket(tickets, ticketId),
    [tickets],
  );

  const addTicket = useCallback((ticket: MockTicket) => {
    write(appendMockTicket(readStoredTickets(), ticket));
  }, []);

  const addMessage = useCallback(
    (ticketId: string, message: MockTicketMessage) => {
      write(appendMockTicketMessage(readStoredTickets(), ticketId, message));
    },
    [],
  );

  const deleteTicket = useCallback((ticketId: string) => {
    write(removeMockTicket(readStoredTickets(), ticketId));
  }, []);

  return { tickets, getById, addTicket, addMessage, deleteTicket };
}
