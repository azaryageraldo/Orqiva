import api from "./api";

export type ChannelAppearance = {
  header_color: string;
  background_color: string;
  outgoing_color: string;
  accent_color: string;
};

export type ChannelOpenMode = "manual" | "always";
export type ChannelPosition = "bottom-right";

export type ChannelSettings = {
  welcome_message?: string;
  placeholder?: string;
  open_mode?: ChannelOpenMode;
  width?: number;
  height?: number;
  position?: ChannelPosition;
  appearance?: Partial<ChannelAppearance>;
};

export type ChannelIconKind = "chat" | "launcher";

export type WidgetChannel = {
  id: number;
  name: string;
  type: string;
  public_token: string;
  external_id: string | null;
  has_credentials: boolean;
  last_connected_at: string | null;
  last_error: string | null;
  workflow_id: number | null;
  workflow_name: string | null;
  is_active: boolean;
  settings: ChannelSettings;
  icon_urls?: {
    chat: string | null;
    launcher: string | null;
  };
  updated_at: string | null;
};

export type WorkflowOptionNode = {
  id: string;
  type: string | null;
  name: string | null;
};

export type WorkflowOption = {
  id: number;
  name: string;
  status: "draft" | "active";
  nodes: WorkflowOptionNode[];
};

export async function getChannel(): Promise<WidgetChannel> {
  const response = await api.get<{ data: WidgetChannel }>("/channel");
  return response.data.data;
}

export async function updateChannel(payload: {
  name?: string;
  workflow_id?: number | null;
  is_active?: boolean;
  settings?: ChannelSettings;
}): Promise<WidgetChannel> {
  const response = await api.put<{ data: WidgetChannel }>("/channel", payload);
  return response.data.data;
}

export async function uploadChannelIcon(
  kind: ChannelIconKind,
  file: File,
): Promise<WidgetChannel> {
  const form = new FormData();
  form.append("kind", kind);
  form.append("icon", file);

  const response = await api.post<{ data: WidgetChannel }>(
    "/channel/icon",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.data;
}

export async function deleteChannelIcon(
  kind: ChannelIconKind,
): Promise<WidgetChannel> {
  const response = await api.delete<{ data: WidgetChannel }>(
    `/channel/icon/${kind}`,
  );
  return response.data.data;
}

export async function regenerateChannelToken(): Promise<WidgetChannel> {
  const response = await api.post<{ data: WidgetChannel }>(
    "/channel/regenerate",
  );
  return response.data.data;
}

export type ChannelPayload = {
  type?: string;
  name?: string;
  workflow_id?: number | null;
  is_active?: boolean;
  bot_token?: string;
};

export async function listChannels(): Promise<WidgetChannel[]> {
  const response = await api.get<{ data: WidgetChannel[] }>("/channels");
  return response.data.data;
}

export async function createChannel(
  payload: ChannelPayload,
): Promise<WidgetChannel> {
  const response = await api.post<{ data: WidgetChannel }>("/channels", payload);
  return response.data.data;
}

export async function updateChannelById(
  id: number,
  payload: ChannelPayload,
): Promise<WidgetChannel> {
  const response = await api.put<{ data: WidgetChannel }>(
    `/channels/${id}`,
    payload,
  );
  return response.data.data;
}

export async function getWorkflowOptions(): Promise<WorkflowOption[]> {
  const response = await api.get<{ data: WorkflowOption[] }>(
    "/workflow-options",
  );
  return response.data.data;
}

export type TelegramWebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
};

export async function getTelegramWebhook(
  channelId: number,
): Promise<TelegramWebhookInfo> {
  const response = await api.get<{ data: TelegramWebhookInfo }>(
    `/channels/${channelId}/telegram/webhook`,
  );
  return response.data.data;
}

export async function manageTelegramWebhook(
  channelId: number,
  action: "set" | "delete",
  url?: string,
): Promise<{ success: boolean; url?: string; message?: string }> {
  const response = await api.post<{
    data: { success: boolean; url?: string; message?: string };
  }>(`/channels/${channelId}/telegram/webhook`, { action, url });
  return response.data.data;
}
