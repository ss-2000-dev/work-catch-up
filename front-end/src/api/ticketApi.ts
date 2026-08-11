import { apiRequest } from "./client";
import type { Ticket, TicketInput } from "../types/ticket";

export function fetchTickets(): Promise<Ticket[]> {
  return apiRequest<Ticket[]>("/tickets");
}

export function fetchTicket(id: string): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${id}`);
}

export function createTicket(input: TicketInput): Promise<Ticket> {
  return apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify({ ...input, createdAt: new Date().toISOString() }),
  });
}

export function updateTicket(id: string, input: TicketInput): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTicket(id: string): Promise<void> {
  return apiRequest<void>(`/tickets/${id}`, { method: "DELETE" });
}
