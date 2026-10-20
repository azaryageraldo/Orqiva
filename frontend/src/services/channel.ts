import api from "./api";

export type ChannelSettings = {
  welcome_message?: string;
  placeholder?: string;
};

export type WidgetChannel = {
  id: number;
  name: string;
  type: string;
  public_token: string;
  workflow_id: number | null;
  workflow_name: string | null;
  is_active: boolean;
  settings: ChannelSettings;
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

export async function regenerateChannelToken(): Promise<WidgetChannel> {
  const response = await api.post<{ data: WidgetChannel }>(
    "/channel/regenerate",
  );
  return response.data.data;
}

export async function getWorkflowOptions(): Promise<WorkflowOption[]> {
  const response = await api.get<{ data: WorkflowOption[] }>(
    "/workflow-options",
  );
  return response.data.data;
}
