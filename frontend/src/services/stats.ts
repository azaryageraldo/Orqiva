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
  contact_id: string | null;
  contact_name: string | null;
  session_id: number | null;
  session_status: "active" | "human" | "ended" | null;
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
  meta: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
};

export type ActivityFilters = {
  status?: ExecutionStatus | "";
  from?: string;
  to?: string;
};

function utcBoundary(date: string, endOfDay: boolean): string {
  const [year, month, day] = date.split("-").map(Number);
  const boundary = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );

  return boundary.toISOString().slice(0, 19).replace("T", " ");
}

export async function getActivity(
  limit = 20,
  filters: ActivityFilters = {},
  page = 1,
): Promise<ActivityStats> {
  const params: Record<string, string | number> = { limit, page };

  if (filters.status) params.status = filters.status;
  if (filters.from) params.from = utcBoundary(filters.from, false);
  if (filters.to) params.to = utcBoundary(filters.to, true);

  const response = await api.get<{ data: ActivityStats }>("/stats/activity", {
    params,
  });

  return response.data.data;
}

export type ExecutionStep = {
  id: number;
  step: number;
  workflow_id: number | null;
  workflow_name: string | null;
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

export type ExecutionDiagnostic = {
  title: string;
  reason: string;
  fix: string;
  example?: string;
  node_id?: string | null;
  node_name?: string | null;
  node_type?: string | null;
};

export type ExecutionDetail = {
  id: number;
  workflow_id: number;
  workflow_name: string | null;
  current_workflow_id: number | null;
  current_workflow_name: string | null;
  chat_session_id: number | null;
  session_status: "active" | "human" | "ended" | null;
  contact_public_id: string | null;
  contact_name: string | null;
  diagnostic: ExecutionDiagnostic | null;
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
