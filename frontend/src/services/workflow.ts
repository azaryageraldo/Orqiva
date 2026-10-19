import api from "./api";
import type { Workflow, WorkflowPage } from "../types/workflow";

export type WorkflowQuery = {
  page?: number;
  search?: string;
};

export async function getWorkflows({
  page = 1,
  search = "",
}: WorkflowQuery = {}): Promise<WorkflowPage> {
  const response = await api.get<{ data: WorkflowPage }>("/workflows", {
    params: {
      page,
      ...(search.trim() ? { search: search.trim() } : {}),
    },
  });

  return response.data.data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const response = await api.get<{ data: Workflow }>(`/workflows/${id}`);
  return response.data.data;
}

export async function createWorkflow(
  name: string,
  description = "",
  definition: Workflow["definition"] = { nodes: [], edges: [] },
): Promise<Workflow> {
  const response = await api.post<{ data: Workflow }>("/workflows", {
    name,
    description,
    status: "draft",
    definition,
  });

  return response.data.data;
}

export async function updateWorkflow(
  id: string,
  payload: {
    name?: string;
    description?: string | null;
    status?: Workflow["status"];
    definition?: Workflow["definition"];
  },
): Promise<Workflow> {
  const response = await api.put<{ data: Workflow }>(
    `/workflows/${id}`,
    payload,
  );

  return response.data.data;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.delete(`/workflows/${id}`);
}

export type WorkflowExecutionResult = {
  message: string;
  data: {
    id: number;
    workflow_id: number;
    status: "running" | "waiting" | "success" | "failed" | "escalated";
    input?: Record<string, unknown>;
    output?: unknown;
    error?: string | null;
    logs?: Array<{
      step?: number;
      node_id?: string;
      node?: string;
      name?: string;
      status: string;
      message: string;
      timestamp?: string;
      duration_ms?: number;
      provider?: string;
      model?: string;
      variables?: Record<string, unknown>;
      branch?: string;
      messages?: string[];
    }>;
  };
};

export async function executeWorkflow(
  id: string,
  input: Record<string, unknown>,
): Promise<WorkflowExecutionResult> {
  const response = await api.post<WorkflowExecutionResult>(
    `/workflows/${id}/execute`,
    { input },
  );

  return response.data;
}
