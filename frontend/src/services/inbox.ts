import api from "./api";
import type { ExecutionStatus } from "./stats";

export type InboxConversation = {
  conversation_id: string;
  execution_id: number;
  workflow_id: number;
  workflow_name: string | null;
  customer_name: string;
  last_message: string;
  last_status: ExecutionStatus;
  last_activity_at: string | null;
  execution_count: number;
};

export type InboxMessage = {
  id: string;
  role: "customer" | "assistant" | "system";
  content: string;
  variant: "escalated" | "error" | null;
  created_at: string | null;
};

export type InboxDetail = {
  conversation_id: string;
  execution_id: number;
  workflow_id: number;
  workflow_name: string | null;
  customer_name: string;
  status: ExecutionStatus;
  started_at: string | null;
  last_activity_at: string | null;
  messages: InboxMessage[];
};

export async function getInbox(): Promise<InboxConversation[]> {
  const response = await api.get<{
    data: InboxConversation[];
    meta: { total: number };
  }>("/inbox");

  return response.data.data;
}

export async function getConversation(
  executionId: number,
): Promise<InboxDetail> {
  const response = await api.get<{ data: InboxDetail }>(
    `/inbox/${executionId}`,
  );

  return response.data.data;
}
