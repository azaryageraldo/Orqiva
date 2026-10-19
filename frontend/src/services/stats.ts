import api from "./api";

export type TokenUsagePeriod = "daily" | "monthly" | "yearly";

export type TokenUsageBucket = {
  key: string;
  label: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  executions: number;
};

export type TokenUsageStats = {
  period: TokenUsagePeriod;
  totals: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    executions: number;
  };
  series: TokenUsageBucket[];
};

export async function getTokenUsage(
  period: TokenUsagePeriod,
): Promise<TokenUsageStats> {
  const response = await api.get<{ data: TokenUsageStats }>(
    "/stats/token-usage",
    { params: { period } },
  );

  return response.data.data;
}

export type ExecutionStatus =
  | "running"
  | "waiting"
  | "success"
  | "failed"
  | "escalated";

export type ActivityExecution = {
  id: number;
  workflow_id: number;
  workflow_name: string | null;
  status: ExecutionStatus;
  total_tokens: number;
  steps_count: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type ActivityStats = {
  summary: {
    total: number;
    success: number;
    failed: number;
    waiting: number;
    running: number;
    escalated: number;
  };
  executions: ActivityExecution[];
};

export type ActivityFilters = {
  status?: ExecutionStatus | "";
  from?: string;
  to?: string;
};

export async function getActivity(
  limit = 20,
  filters: ActivityFilters = {},
): Promise<ActivityStats> {
  const params: Record<string, string | number> = { limit };

  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const response = await api.get<{ data: ActivityStats }>("/stats/activity", {
    params,
  });

  return response.data.data;
}

export type ExecutionStep = {
  id: number;
  step: number;
  node_id: string;
  node_type: string;
  node_name: string | null;
  status: "success" | "error";
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  variables: Record<string, unknown> | null;
  branch: string | null;
  messages: string[] | null;
  duration_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  error: string | null;
  executed_at: string | null;
};

export type ExecutionLog = {
  step?: number;
  node_id?: string;
  node?: string;
  name?: string;
  status: string;
  message: string;
  timestamp?: string;
  duration_ms?: number;
  branch?: string;
};

export type ExecutionDetail = {
  id: number;
  workflow_id: number;
  workflow_name: string | null;
  status: ExecutionStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  logs: ExecutionLog[] | null;
  error: string | null;
  context: Record<string, unknown> | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  started_at: string | null;
  finished_at: string | null;
  waiting_since: string | null;
  steps: ExecutionStep[];
};

export async function getExecution(
  workflowId: string,
  executionId: number,
): Promise<ExecutionDetail> {
  const response = await api.get<{ data: ExecutionDetail }>(
    `/workflows/${workflowId}/executions/${executionId}`,
  );

  return response.data.data;
}
