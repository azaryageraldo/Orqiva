import api from "./api";
import type { ExecutionStatus } from "./stats";

export type InboxContact = {
  id: number;
  contact_id: string;
  name: string;
  last_message: string | null;
  last_activity_at: string | null;
  session_status: "active" | "human" | "ended";
  workflow_name: string | null;
  session_count: number;
  latest_session_id: number | null;
  latest_execution_id: number | null;
  latest_status: ExecutionStatus | null;
};

export type InboxMessage = {
  id: number;
  role: "customer" | "assistant" | "admin" | "system";
  content: string;
  variant: "escalated" | null;
  created_at: string | null;
};

export type InboxSession = {
  id: number;
  status: "active" | "human" | "ended";
  workflow_name: string | null;
  execution_id: number | null;
  execution_status: ExecutionStatus | null;
  started_at: string | null;
  ended_at: string | null;
  takeover_at: string | null;
  last_activity_at: string | null;
  messages: InboxMessage[];
};

export type InboxContactDetail = {
  id: number;
  contact_id: string;
  name: string;
  latest_session: {
    id: number;
    status: "active" | "human" | "ended";
    execution_id: number | null;
    execution_status: ExecutionStatus | null;
    workflow_name: string | null;
    takeover_at: string | null;
  } | null;
  sessions: InboxSession[];
};

export async function getInbox(): Promise<InboxContact[]> {
  const response = await api.get<{
    data: InboxContact[];
    meta: { total: number };
  }>("/inbox");

  return response.data.data;
}

export async function getContact(
  contactId: number,
): Promise<InboxContactDetail> {
  const response = await api.get<{ data: InboxContactDetail }>(
    `/inbox/contacts/${contactId}`,
  );

  return response.data.data;
}

export async function takeOverSession(sessionId: number) {
  const response = await api.post(`/inbox/sessions/${sessionId}/takeover`);
  return response.data.data;
}

export async function releaseSession(sessionId: number) {
  const response = await api.post(`/inbox/sessions/${sessionId}/release`);
  return response.data.data;
}

export async function sendAdminReply(
  sessionId: number,
  message: string,
): Promise<InboxMessage> {
  const response = await api.post<{ data: InboxMessage }>(
    `/inbox/sessions/${sessionId}/messages`,
    { message },
  );

  return response.data.data;
}
