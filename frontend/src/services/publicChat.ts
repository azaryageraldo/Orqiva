import api from "./api";
import type { ChannelSettings } from "./channel";

export type PublicMessage = {
  id: number;
  role: "customer" | "assistant" | "admin" | "system";
  content: string;
  variant: "escalated" | null;
  created_at: string | null;
};

export type PublicChannel = {
  name: string;
  workflow_name: string | null;
  is_active: boolean;
  settings: ChannelSettings;
};

export type PublicSession = {
  contact_id: string;
  session_token: string;
  status: "active" | "human" | "ended";
  channel: PublicChannel;
  messages: PublicMessage[];
};

export async function getPublicChannel(token: string): Promise<PublicChannel> {
  const response = await api.get<{ data: PublicChannel }>(
    `/public/channels/${token}`,
  );
  return response.data.data;
}

export async function startPublicSession(
  token: string,
  contactId?: string,
): Promise<PublicSession> {
  const response = await api.post<{ data: PublicSession }>(
    `/public/channels/${token}/sessions`,
    contactId ? { contact_id: contactId } : {},
  );
  return response.data.data;
}

export async function getPublicSession(
  sessionToken: string,
): Promise<PublicSession> {
  const response = await api.get<{ data: PublicSession }>(
    `/public/sessions/${sessionToken}`,
  );
  return response.data.data;
}

export type SendPublicResult = {
  status: string | null;
  session_status: "active" | "human" | "ended";
  messages: PublicMessage[];
  notice: string | null;
};

export async function sendPublicMessage(
  sessionToken: string,
  message: string,
  clientMessageId?: string,
): Promise<SendPublicResult> {
  const response = await api.post<{ data: SendPublicResult }>(
    `/public/sessions/${sessionToken}/messages`,
    {
      message,
      ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
    },
  );
  return response.data.data;
}
