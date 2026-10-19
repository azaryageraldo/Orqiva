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
  };
  executions: ActivityExecution[];
};

export async function getActivity(limit = 20): Promise<ActivityStats> {
  const response = await api.get<{ data: ActivityStats }>("/stats/activity", {
    params: { limit },
  });

  return response.data.data;
}
