import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock,
  Coins,
  Download,
  Layers,
  LoaderCircle,
  Percent,
  TrendingUp,
  Workflow as WorkflowIcon,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getAiSettings } from "../services/aiSettings";
import { cn } from "@/lib/utils";
import { useI18n, type Language } from "@/lib/i18n";
import { getWorkflows } from "../services/workflow";
import {
  getActivity,
  getTokenUsage,
  type ActivityExecution,
  type ActivityStats,
  type ExecutionStatus,
  type TokenUsageBucket,
  type TokenUsagePeriod,
  type TokenUsageStats,
} from "../services/stats";
import type { Workflow as WorkflowItem } from "../types/workflow";

type Health = "checking" | "online" | "offline";

interface DashboardProps {
  health: Health;
  onViewActivity?: () => void;
}

const HEALTH_STYLES: Record<
  Health,
  { labelKey: string; dot: string; text: string }
> = {
  online: {
    labelKey: "health.operational",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  offline: {
    labelKey: "health.offline",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  checking: {
    labelKey: "health.checking",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
  },
};

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const PERIODS: Array<{ key: TokenUsagePeriod; labelKey: string }> = [
  { key: "daily", labelKey: "dashboard.period.daily" },
  { key: "monthly", labelKey: "dashboard.period.monthly" },
  { key: "yearly", labelKey: "dashboard.period.yearly" },
];

const STATUS_META: Record<
  ExecutionStatus,
  { labelKey: string; dot: string; badge: string }
> = {
  success: {
    labelKey: "dashboard.status.success",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  failed: {
    labelKey: "dashboard.status.failed",
    dot: "bg-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  waiting: {
    labelKey: "dashboard.status.waiting",
    dot: "bg-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  running: {
    labelKey: "dashboard.status.running",
    dot: "bg-primary",
    badge: "border-primary/30 bg-primary/10 text-primary",
  },
  escalated: {
    labelKey: "dashboard.status.escalated",
    dot: "bg-teal-400",
    badge: "border-teal-400/30 bg-teal-400/10 text-teal-300",
  },
};

const NUMBER_FORMATS: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-US"),
};

const COMPACT_FORMATS: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }),
};

const DATE_FORMATS: Record<Language, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }),
};

// Estimated cost per 1M token (USD), based on market pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-1.5-pro": { input: 3.50, output: 10.50 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-flash-lite": { input: 0.03, output: 0.06 },
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "claude-3-5-sonnet": { input: 3.00, output: 15.00 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  default: { input: 1.00, output: 3.00 },
};

function getModelPricing(model: string | null) {
  const key = model?.toLowerCase() ?? "";
  for (const [name, pricing] of Object.entries(MODEL_PRICING)) {
    if (key.includes(name)) return pricing;
  }
  return MODEL_PRICING.default;
}

function estimateCost(
  _totalTokens: number,
  promptTokens: number,
  completionTokens: number,
  model: string | null,
): number {
  if (!model) return 0;
  const pricing = getModelPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

type WorkflowUsage = {
  name: string;
  id: number | null;
  tokens: number;
  executions: number;
  errors: number;
  avgDuration: number;
};

function computeWorkflowUsage(
  executions: ActivityExecution[],
): WorkflowUsage[] {
  const map = new Map<number | null, WorkflowUsage>();

  for (const ex of executions) {
    const key = ex.workflow_id;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        name: ex.workflow_name ?? `Workflow #${key ?? "?"}`,
        id: key,
        tokens: ex.total_tokens,
        executions: 1,
        errors: ex.status === "failed" ? 1 : 0,
        avgDuration:
          ex.started_at && ex.finished_at
            ? new Date(ex.finished_at).getTime() -
              new Date(ex.started_at).getTime()
            : 0,
      });
    } else {
      existing.tokens += ex.total_tokens;
      existing.executions += 1;
      if (ex.status === "failed") existing.errors += 1;
      if (ex.started_at && ex.finished_at) {
        existing.avgDuration +=
          new Date(ex.finished_at).getTime() -
          new Date(ex.started_at).getTime();
      }
    }
  }

  return Array.from(map.values()).map((item) => ({
    ...item,
    avgDuration: item.executions > 0 ? item.avgDuration / item.executions : 0,
  }));
}

function computeActiveConversationsToday(
  executions: ActivityExecution[],
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeContacts = new Set<string>();

  for (const ex of executions) {
    if (
      ex.session_status === "active" &&
      ex.contact_id &&
      ex.started_at
    ) {
      const started = new Date(ex.started_at);
      started.setHours(0, 0, 0, 0);
      if (started.getTime() === today.getTime()) {
        activeContacts.add(ex.contact_id);
      }
    }
  }

  return activeContacts.size;
}

function compactNumber(value: number, language: Language): string {
  return COMPACT_FORMATS[language].format(value);
}

function formatDate(value: string | null, language: Language): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_FORMATS[language].format(date);
}

export default function Dashboard({ health, onViewActivity }: DashboardProps) {
  const { language, t } = useI18n();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [activity, setActivity] = useState<ActivityStats | null>(null);
  const [usage, setUsage] = useState<TokenUsageStats | null>(null);
  const [period, setPeriod] = useState<TokenUsagePeriod>("daily");
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  } | null>(null);

  const [aiSettings, setAiSettings] = useState<{
    provider: string | null;
    model: string | null;
  } | null>(null);

  const [conversations, setConversations] = useState<{
    activeToday: number;
    total: number;
  }>({ activeToday: 0, total: 0 });

  const dashboardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([getWorkflows(), getActivity(8), getAiSettings()])
      .then(([workflowsResult, activityResult, aiSettingsResult]) => {
        if (!active) return;

        if (workflowsResult.status === "fulfilled") {
          setWorkflows(workflowsResult.value.data);
        } else {
          setError(t("dashboard.errorLoad"));
        }

        if (activityResult.status === "fulfilled") {
          setActivity(activityResult.value);
          const executions = activityResult.value.executions;
          setConversations({
            activeToday: computeActiveConversationsToday(executions),
            total: executions.length,
          });
        }

        if (aiSettingsResult.status === "fulfilled") {
          const settings = aiSettingsResult.value;
          const defaultProvider = (settings.providers as Array<{ configured: boolean; default_model: string | null; provider: string }>).find(
            (p) => p.configured,
          );
          const defaultModel = defaultProvider
            ? (settings.models as Array<{ id: string }>).find(
                (m) => m.id === defaultProvider.default_model,
              )
            : null;
          setAiSettings({
            provider: defaultProvider?.provider ?? null,
            model: defaultModel?.id ?? null,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // Dashboard data should only load once per page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    getTokenUsage(period)
      .then((result) => {
        if (active) setUsage(result);
      })
      .catch(() => {
        if (active) {
          setError(t("dashboard.tokenUsageError"));
        }
      })
      .finally(() => {
        if (active) setUsageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period, t]);

  function changePeriod(next: TokenUsagePeriod) {
    setUsageLoading(true);
    setPeriod(next);
  }

  async function reload() {
    setError("");
    setLoading(true);
    setUsageLoading(true);

    const [workflowsResult, activityResult, usageResult] =
      await Promise.allSettled([
        getWorkflows(),
        getActivity(8),
        getTokenUsage(period),
      ]);

    if (workflowsResult.status === "fulfilled") {
      setWorkflows(workflowsResult.value.data);
    } else {
      setError("Sebagian data dashboard gagal dimuat. Periksa koneksi API.");
    }

    if (activityResult.status === "fulfilled") {
      setActivity(activityResult.value);
      const executions = activityResult.value.executions;
      setConversations({
        activeToday: computeActiveConversationsToday(executions),
        total: executions.length,
      });
    }

    if (usageResult.status === "fulfilled") {
      setUsage(usageResult.value);
    }

    setLoading(false);
    setUsageLoading(false);
  }

  async function handleExportPDF() {
    if (!dashboardRef.current) return;

    const canvas = await html2canvas(dashboardRef.current, {
      backgroundColor: "#090a0c",
      scale: 2,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const imgX = (pageWidth - imgWidth * ratio) / 2;
    const imgY = (pageHeight - imgHeight * ratio) / 2;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`orqiva-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const stats = useMemo(() => {
    const activeWorkflows = workflows.filter((item) => item.status === "active");
    const inactiveWorkflows = workflows.filter(
      (item) => item.status !== "active",
    );
    return {
      total: workflows.length,
      active: activeWorkflows.length,
      inactive: inactiveWorkflows.length,
    };
  }, [workflows]);

  const summary = activity?.summary ?? {
    total: 0,
    success: 0,
    failed: 0,
    waiting: 0,
    running: 0,
    escalated: 0,
  };

  const successRate =
    summary.total > 0 ? Math.round((summary.success / summary.total) * 100) : 0;

  const tokensPerRun =
    usage && usage.totals.executions > 0
      ? Math.round(usage.totals.total_tokens / usage.totals.executions)
      : 0;

  const estimatedCost = usage
    ? estimateCost(
        usage.totals.total_tokens,
        usage.totals.prompt_tokens,
        usage.totals.completion_tokens,
        aiSettings?.model ?? null,
      )
    : 0;

  const costLabel =
    aiSettings?.model && estimatedCost > 0
      ? `Estimated cost (${aiSettings.model})`
      : t("dashboard.estimatedCost");

  // Workflow usage ranking
  const workflowUsage = useMemo(() => {
    if (!activity?.executions) return [];
    return computeWorkflowUsage(activity.executions)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);
  }, [activity]);

  // Cost projection for current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyCost = estimatedCost; // cost for current period
  const costProjection = dailyCost * daysInMonth;

  return (
    <section ref={dashboardRef} className="min-h-[calc(100vh-3rem)] bg-background">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-6 space-y-6">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="mt-0 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
              {t("dashboard.title")}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              label="Rentang tanggal"
              className="max-w-[220px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPDF}
              className="h-9 px-3.5"
            >
              <Download className="size-4" />
              {t("dashboard.exportPDF")}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span className="flex items-center gap-2">
              <CircleAlert className="size-4 shrink-0" />
              {error}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void reload()}
              className="text-destructive hover:text-destructive"
            >
              {t("dashboard.retry")}
            </Button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={WorkflowIcon}
            label={t("dashboard.totalWorkflows")}
            value={stats.total}
            caption={t("dashboard.allFlows")}
            tone="primary"
            loading={loading}
          />
          <StatCard
            icon={CheckCircle2}
            label={t("dashboard.active")}
            value={stats.active}
            caption={
              stats.total > 0
                ? t("dashboard.readyPercent", {
                    percent: Math.round((stats.active / stats.total) * 100),
                  })
                : t("dashboard.noWorkflows")
            }
            tone="emerald"
            loading={loading}
          />
          <StatCard
            icon={CircleDashed}
            label={t("dashboard.draft")}
            value={stats.inactive}
            caption={t("dashboard.reviewBeforeActive")}
            tone="amber"
            loading={loading}
          />
        </div>

        {/* KPI strip */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-white/5 bg-border sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            icon={Coins}
            label={t("dashboard.totalTokens")}
            value={compactNumber(usage?.totals.total_tokens ?? 0, language)}
            hint={t("dashboard.thisPeriod", {
              period: t(
                PERIODS.find((p) => p.key === period)?.labelKey ??
                  "dashboard.period.daily",
              ).toLowerCase(),
            })}
            loading={usageLoading}
          />
          <MetricTile
            icon={ActivityIcon}
            label={t("dashboard.executions")}
            value={compactNumber(usage?.totals.executions ?? 0, language)}
            hint={t("dashboard.runInPeriod")}
            loading={usageLoading}
          />
          <MetricTile
            icon={TrendingUp}
            label={t("dashboard.avgTokens")}
            value={compactNumber(tokensPerRun, language)}
            hint={t("dashboard.perExecution")}
            loading={usageLoading}
          />
          <MetricTile
            icon={Percent}
            label={t("dashboard.successRate")}
            value={`${successRate}%`}
            hint={t("dashboard.successOfTotal", {
              success: summary.success,
              total: summary.total,
            })}
            loading={loading}
          />
          <MetricTile
            icon={Coins}
            label={costLabel}
            value={estimatedCost > 0 ? `$${estimatedCost.toFixed(4)}` : "—"}
            hint={t("dashboard.costHint")}
            loading={usageLoading}
          />
          <MetricTile
            icon={ActivityIcon}
            label={t("dashboard.activeConversations")}
            value={String(conversations.activeToday)}
            hint={t("dashboard.activeConversationsHint")}
            loading={loading}
          />
          <MetricTile
            icon={TrendingUp}
            label={t("dashboard.costProjection")}
            value={`$${costProjection.toFixed(2)}`}
            hint={t("dashboard.costProjectionHint")}
            loading={loading}
          />
        </div>

        {/* Top Workflows */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-card lg:col-span-2">
            <div className="border-b border-white/5 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                  {t("dashboard.topWorkflows")}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("dashboard.topWorkflowsHint")}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto p-5">
              <div className="space-y-3">
                {workflowUsage.map((item) => {
                  const maxTokens = Math.max(1, ...workflowUsage.map((w) => w.tokens));
                  const barWidth = (item.tokens / maxTokens) * 100;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-2"
                    >
                      <div className="w-[100px] shrink-0">
                        <p className="text-[11px] font-medium text-foreground truncate">
                          {item.name}
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="w-[40px] shrink-0 text-[10px] font-medium text-right text-foreground">
                            {compactNumber(item.tokens, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {workflowUsage.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t("dashboard.noWorkflows")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Model Distribution */}
          <div className="rounded-xl border border-white/5 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                {t("dashboard.modelDistribution")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {aiSettings?.provider ?? t("dashboard.noModel")}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative size-48">
                <svg viewBox="0 0 88 88" className="size-full">
                  <circle
                    cx="44"
                    cy="44"
                    r="36"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="44"
                    cy="44"
                    r="36"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="8"
                    strokeDasharray="75"
                    strokeDashoffset="25"
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold text-foreground">
                    {aiSettings?.model ?? "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {aiSettings?.provider ?? "Tidak terhubung"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex flex-col gap-4 border-b border-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                  {t("dashboard.tokenUsage")}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("dashboard.tokenUsageDescription")}
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-border bg-background p-1">
                {PERIODS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => changePeriod(item.key)}
                    aria-pressed={period === item.key}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      period === item.key
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    {t("dashboard.totalTokens")}
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {usageLoading
                      ? "—"
                      : compactNumber(
                          usage?.totals.total_tokens ?? 0,
                          language,
                        )}
                  </p>
                </div>

                <Legend
                  color="bg-primary"
                  label={t("dashboard.input")}
                  value={usage?.totals.prompt_tokens ?? 0}
                />
                <Legend
                  color="bg-primary/40"
                  label={t("dashboard.output")}
                  value={usage?.totals.completion_tokens ?? 0}
                />
                <Legend
                  color="bg-muted-foreground/40"
                  label={t("dashboard.executions")}
                  value={usage?.totals.executions ?? 0}
                  raw
                />
              </div>

              {usageLoading ? (
                <div className="flex h-52 items-center justify-center">
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : !usage || usage.totals.total_tokens === 0 ? (
                <EmptyChart />
              ) : (
                <TokenAreaChart series={usage.series} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-white/5 p-5">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                {t("dashboard.executionResults")}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("dashboard.executionResultsDescription")}
              </p>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="flex h-56 items-center justify-center">
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <StatusDonut summary={summary} rate={successRate} />
              )}
            </div>
          </div>
        </div>

        {/* Activity + needs attention */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("dashboard.recentExecutions")}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("dashboard.recentDescription")}
                </p>
              </div>
              {onViewActivity && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onViewActivity}
                  className="shrink-0 text-muted-foreground"
                >
                  {t("dashboard.all")}
                  <ArrowUpRight />
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex h-56 items-center justify-center">
                <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : !activity || activity.executions.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
                <span className="mb-3 flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                  <ActivityIcon className="size-5" />
                </span>
                <p className="text-sm font-medium text-foreground">
                  {t("dashboard.noSessions")}
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {t("dashboard.noSessionsDescription")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Daily executions bar chart */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase mb-3">
                    {t("dashboard.dailyExecutions")}
                  </p>
                  <DailyExecutionsChart executions={activity.executions} />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <ul className="divide-y divide-border">
                    {activity.executions.map((execution) => {
                      const meta = STATUS_META[execution.status];
                      return (
                        <li
                          key={execution.id}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <span
                            className={`size-2 shrink-0 rounded-full ${meta.dot}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium text-foreground">
                              {execution.workflow_name ||
                                t("dashboard.workflowFallback", {
                                  id: execution.workflow_id,
                                })}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {t("dashboard.executionHash", {
                                id: execution.id,
                              })}{" "}
                              · {formatDate(execution.started_at, language)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium ${meta.badge.replace("bg-", "bg-white/10")}`}
                          >
                            {t(meta.labelKey)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-card">
            <div className="border-b border-white/5 p-5">
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
                {t("dashboard.needsAttention")}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("dashboard.attentionDescription")}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <AttentionRow
                icon={XCircle}
                tone="destructive"
                label={t("dashboard.failedExecutions")}
                value={summary.failed}
                hint={t("dashboard.checkLogs")}
              />
              <AttentionRow
                icon={Clock}
                tone="amber"
                label={t("dashboard.waitingMessages")}
                value={summary.waiting}
                hint={t("dashboard.waitingMessagesHint")}
              />
              <AttentionRow
                icon={CircleDashed}
                tone="muted"
                label={t("dashboard.inactiveWorkflows")}
                value={stats.inactive}
                hint={t("dashboard.notActivated")}
              />
              <AttentionRow
                icon={Layers}
                tone="primary"
                label={t("dashboard.avgNodes")}
                value={
                  stats.total > 0
                    ? Math.round(
                        workflows.reduce(
                          (total, item) =>
                            total + (item.definition?.nodes?.length ?? 0),
                          0,
                        ) / stats.total,
                      )
                    : 0
                }
                hint={t("dashboard.perWorkflow")}
              />
            </div>

            <div className="border-t border-border p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {t("dashboard.systemStatus")}
              </p>

              <div className="mt-3 space-y-2">
                <SystemRow
                  label={t("settings.serviceLabel")}
                  value={t(HEALTH_STYLES[health].labelKey)}
                  dot={HEALTH_STYLES[health].dot}
                  text={HEALTH_STYLES[health].text}
                />
                <SystemRow
                  label={t("dashboard.tokenTracking")}
                  value={
                    summary.total > 0
                      ? t("common.active")
                      : t("dashboard.awaitingData")
                  }
                  dot={
                    summary.total > 0
                      ? "bg-emerald-400"
                      : "bg-muted-foreground/40"
                  }
                  text={
                    summary.total > 0
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                  }
                />
                <SystemRow
                  label={t("dashboard.timezone")}
                  value={TIME_ZONE}
                  dot="bg-muted-foreground/40"
                  text="text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

const TONE_STYLES = {
  primary: { icon: "bg-primary/10 text-primary", bar: "bg-primary" },
  emerald: {
    icon: "bg-emerald-400/10 text-emerald-400",
    bar: "bg-emerald-400",
  },
  amber: { icon: "bg-amber-400/10 text-amber-400", bar: "bg-amber-400" },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  tone: keyof typeof TONE_STYLES;
  loading: boolean;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {loading ? (
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            ) : (
              value
            )}
          </p>
        </div>
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">{caption}</p>
      <span className={`absolute inset-x-0 bottom-0 h-0.5 ${styles.bar}`} />
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {loading ? (
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: "destructive" | "amber" | "muted" | "primary";
  label: string;
  value: number;
  hint: string;
}) {
  const toneClass = {
    destructive: "bg-destructive/10 text-destructive",
    amber: "bg-amber-400/10 text-amber-400",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
  }[tone];

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-background/40 p-3">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
      </div>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SystemRow({
  label,
  value,
  dot,
  text,
}: {
  label: string;
  value: string;
  dot: string;
  text: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-background/40 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
        {label}
      </span>
      <span className={`truncate text-[11px] font-medium ${text}`}>{value}</span>
    </div>
  );
}

function DailyExecutionsChart({ executions }: { executions: ActivityExecution[] }) {

  // Compute daily counts for last 7 days
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dailyCounts: { date: Date; count: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const count = executions.filter((ex) => {
      if (!ex.started_at) return false;
      const exDate = new Date(ex.started_at);
      exDate.setHours(0, 0, 0, 0);
      return exDate.getTime() === d.getTime();
    }).length;
    dailyCounts.push({ date: d, count });
  }

  const maxCount = Math.max(1, ...dailyCounts.map((d) => d.count));

  return (
    <div className="h-48 flex items-end gap-1">
      {dailyCounts.map((day) => {
        const barHeight = (day.count / maxCount) * 100;
        const isToday = day.date.getTime() === now.getTime();
        return (
          <div
            key={day.date.getTime()}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-300",
                isToday ? "bg-primary" : "bg-white/5",
              )}
              style={{ height: `${barHeight}%` }}
            />
            <span className="text-[9px] text-muted-foreground">
              {day.date.getDate()}
            </span>
            <span className="text-[10px] font-medium text-foreground">
              {day.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({
  color,
  label,
  value,
  raw,
}: {
  color: string;
  label: string;
  value: number;
  raw?: boolean;
}) {
  const { language } = useI18n();

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className={`size-1.5 rounded-full ${color}`} />
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">
        {raw
          ? NUMBER_FORMATS[language].format(value)
          : compactNumber(value, language)}
      </p>
    </div>
  );
}

function EmptyChart() {
  const { t } = useI18n();

  return (
    <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-white/5 bg-background/50 text-center">
      <p className="text-sm font-medium text-foreground">
        {t("dashboard.emptyTokens")}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {t("dashboard.emptyTokensDescription")}
      </p>
    </div>
  );
}

function TokenAreaChart({ series }: { series: TokenUsageBucket[] }) {
  const { language, t } = useI18n();
  const count = series.length;
  const max = Math.max(1, ...series.map((bucket) => bucket.total_tokens));
  const width = Math.max(560, count * 46);
  const height = 200;
  const padX = 6;
  const top = 14;
  const step = count > 1 ? (width - padX * 2) / (count - 1) : 0;

  const x = (index: number) => padX + index * step;
  const y = (value: number) => height - (value / max) * (height - top) - 4;

  const line = (getter: (bucket: TokenUsageBucket) => number) =>
    series
      .map(
        (bucket, index) =>
          `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(getter(bucket)).toFixed(1)}`,
      )
      .join(" ");

  const completionLine = line((bucket) => bucket.completion_tokens);
  const totalLine = line((bucket) => bucket.total_tokens);

  const baseline = `L${x(count - 1).toFixed(1)},${height} L${x(0).toFixed(1)},${height} Z`;
  const completionArea = `${completionLine} ${baseline}`;

  const backAlongCompletion = series
    .map((_, index) => count - 1 - index)
    .map(
      (index) =>
        `L${x(index).toFixed(1)},${y(series[index].completion_tokens).toFixed(1)}`,
    )
    .join(" ");

  const promptArea = `${totalLine} ${backAlongCompletion} Z`;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${width}px` }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-52 w-full"
          role="img"
          aria-label={t("dashboard.chartAria")}
        >
          <defs>
            <linearGradient id="token-prompt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity="0.05"
              />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              x2={width}
              y1={top + ratio * (height - top)}
              y2={top + ratio * (height - top)}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={completionArea} fill="var(--primary)" fillOpacity="0.18" />
          <path d={promptArea} fill="url(#token-prompt)" />
          <path
            d={totalLine}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {series.map((bucket, index) =>
            bucket.total_tokens > 0 ? (
              <circle
                key={`dot-${bucket.key}`}
                cx={x(index)}
                cy={y(bucket.total_tokens)}
                r={4}
                fill="var(--card)"
                stroke="var(--primary)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}

          {series.map((bucket, index) => (
            <rect
              key={bucket.key}
              x={x(index) - step / 2}
              y={0}
              width={Math.max(step, 1)}
              height={height}
              fill="transparent"
            >
              <title>
                {t("dashboard.tokenTooltip", {
                  label: bucket.label,
                  tokens: NUMBER_FORMATS[language].format(bucket.total_tokens),
                  executions: bucket.executions,
                })}
              </title>
            </rect>
          ))}
        </svg>

        <div className="mt-2 flex">
          {series.map((bucket) => (
            <div
              key={bucket.key}
              className="flex-1 truncate text-center text-[10px] text-muted-foreground"
            >
              {bucket.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusDonut({
  summary,
  rate,
}: {
  summary: ActivityStats["summary"];
  rate: number;
}) {
  const { t } = useI18n();
  const segments = (
    [
      { key: "success", value: summary.success, className: "text-emerald-400" },
      { key: "failed", value: summary.failed, className: "text-destructive" },
      { key: "waiting", value: summary.waiting, className: "text-amber-400" },
      { key: "running", value: summary.running, className: "text-primary" },
      { key: "escalated", value: summary.escalated, className: "text-teal-400" },
    ] as const
  ).filter((segment) => segment.value > 0);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative size-40">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="14"
          />

          {summary.total > 0 &&
            segments.map((segment) => {
              const length = (segment.value / summary.total) * circumference;
              const dash = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={segment.key}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  className={segment.className}
                />
              );

              offset += length;
              return element;
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {rate}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            {t("dashboard.successShort")}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-1.5">
        {(
          ["success", "failed", "waiting", "running", "escalated"] as const
        ).map((key) => {
          const meta = STATUS_META[key];
          return (
            <li key={key} className="flex items-center gap-2 text-xs">
              <span className={`size-1.5 rounded-full ${meta.dot}`} />
              <span className="flex-1 text-[11px] text-muted-foreground">
                {t(meta.labelKey)}
              </span>
              <span className="font-medium text-[11px] text-foreground">
                {summary[key]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
