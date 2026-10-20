import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  Bot,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Clock,
  Coins,
  Layers,
  LoaderCircle,
  Percent,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Workflow as WorkflowIcon,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getWorkflows } from "../services/workflow";
import {
  getActivity,
  getTokenUsage,
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
  { label: string; dot: string; text: string }
> = {
  online: {
    label: "Operational",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  offline: {
    label: "Offline",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  checking: {
    label: "Memeriksa",
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
  },
};

const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const PERIODS: Array<{ key: TokenUsagePeriod; label: string }> = [
  { key: "daily", label: "Harian" },
  { key: "monthly", label: "Bulanan" },
  { key: "yearly", label: "Tahunan" },
];

const OPENROUTER_FREE_COLLECTION =
  "https://openrouter.ai/collections/free-models";
const OPENROUTER_DOCS = "https://openrouter.ai/docs/quickstart";

const FREE_MODELS: Array<{
  name: string;
  author: string;
  context: string;
  tag: string;
}> = [
  {
    name: "Nemotron 3 Ultra",
    author: "NVIDIA",
    context: "1M",
    tag: "Reasoning",
  },
  {
    name: "Nemotron 3.5 Lightning",
    author: "NVIDIA",
    context: "1M",
    tag: "Fast",
  },
  { name: "Laguna S 2.1", author: "Poolside", context: "262K", tag: "Coding" },
  {
    name: "Dots3-Note Preview",
    author: "Dots Studio",
    context: "512K",
    tag: "Multimodal",
  },
  {
    name: "Nemotron 3 Super",
    author: "NVIDIA",
    context: "262K",
    tag: "Agentic",
  },
  {
    name: "Nemotron 3.5 Super VL",
    author: "NVIDIA",
    context: "1M",
    tag: "Vision",
  },
  {
    name: "Inkling",
    author: "Thinking Machines",
    context: "1.05M",
    tag: "Multimodal",
  },
  { name: "North Mini Code", author: "Cohere", context: "256K", tag: "Coding" },
];

const STATUS_META: Record<
  ExecutionStatus,
  { label: string; dot: string; badge: string }
> = {
  success: {
    label: "Sukses",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  failed: {
    label: "Gagal",
    dot: "bg-destructive",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  waiting: {
    label: "Menunggu",
    dot: "bg-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  running: {
    label: "Berjalan",
    dot: "bg-primary",
    badge: "border-primary/30 bg-primary/10 text-primary",
  },
  escalated: {
    label: "Ke admin",
    dot: "bg-teal-400",
    badge: "border-teal-400/30 bg-teal-400/10 text-teal-300",
  },
};

const numberFormat = new Intl.NumberFormat("id-ID");
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function compactNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

export default function Dashboard({ health, onViewActivity }: DashboardProps) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [activity, setActivity] = useState<ActivityStats | null>(null);
  const [usage, setUsage] = useState<TokenUsageStats | null>(null);
  const [period, setPeriod] = useState<TokenUsagePeriod>("daily");

  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([getWorkflows(), getActivity(8)])
      .then(([workflowsResult, activityResult]) => {
        if (!active) return;

        if (workflowsResult.status === "fulfilled") {
          setWorkflows(workflowsResult.value.data);
        } else {
          setError(
            "Sebagian data dashboard gagal dimuat. Periksa koneksi API.",
          );
        }

        if (activityResult.status === "fulfilled") {
          setActivity(activityResult.value);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getTokenUsage(period)
      .then((result) => {
        if (active) setUsage(result);
      })
      .catch(() => {
        if (active) {
          setError("Statistik token gagal dimuat. Periksa koneksi backend.");
        }
      })
      .finally(() => {
        if (active) setUsageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

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
    }

    if (usageResult.status === "fulfilled") {
      setUsage(usageResult.value);
    }

    setLoading(false);
    setUsageLoading(false);
  }

  const stats = useMemo(() => {
    const active = workflows.filter((item) => item.status === "active").length;
    return {
      total: workflows.length,
      active,
      draft: workflows.length - active,
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

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <ActivityIcon className="size-4" />
              Ringkasan workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Pantau otomatisasi, konsumsi token AI, dan kesehatan eksekusi
              dalam satu layar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void reload()}
              disabled={loading || usageLoading}
              className="h-10 px-4"
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} />
              Segarkan
            </Button>
            {onViewActivity && (
              <Button
                type="button"
                onClick={onViewActivity}
                className="h-10 px-4"
              >
                <ActivityIcon />
                Lihat audit log
              </Button>
            )}
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
              Coba lagi
            </Button>
          </div>
        )}

        <AutomationPipeline />

        {/* Stat cards (terpisah) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={WorkflowIcon}
            label="Total workflow"
            value={stats.total}
            caption="Seluruh alur di workspace"
            tone="primary"
            loading={loading}
          />
          <StatCard
            icon={CheckCircle2}
            label="Aktif"
            value={stats.active}
            caption={
              stats.total > 0
                ? `${Math.round((stats.active / stats.total) * 100)}% siap dijalankan`
                : "Belum ada workflow"
            }
            tone="emerald"
            loading={loading}
          />
          <StatCard
            icon={CircleDashed}
            label="Draft"
            value={stats.draft}
            caption="Perlu ditinjau sebelum aktif"
            tone="amber"
            loading={loading}
          />
        </div>

        {/* KPI strip */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            icon={Coins}
            label="Total token"
            value={compactNumber(usage?.totals.total_tokens ?? 0)}
            hint={`${PERIODS.find((p) => p.key === period)?.label ?? ""} ini`}
            loading={usageLoading}
          />
          <MetricTile
            icon={ActivityIcon}
            label="Eksekusi"
            value={compactNumber(usage?.totals.executions ?? 0)}
            hint="Dijalankan pada periode"
            loading={usageLoading}
          />
          <MetricTile
            icon={TrendingUp}
            label="Rata-rata token"
            value={compactNumber(tokensPerRun)}
            hint="Per eksekusi"
            loading={usageLoading}
          />
          <MetricTile
            icon={Percent}
            label="Tingkat keberhasilan"
            value={`${successRate}%`}
            hint={`${summary.success} sukses dari ${summary.total}`}
            loading={loading}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card lg:col-span-2">
            <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Penggunaan token
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Distribusi token input dan output AI Agent.
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
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total token</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                    {usageLoading
                      ? "—"
                      : compactNumber(usage?.totals.total_tokens ?? 0)}
                  </p>
                </div>

                <Legend
                  color="bg-primary"
                  label="Input"
                  value={usage?.totals.prompt_tokens ?? 0}
                />
                <Legend
                  color="bg-primary/40"
                  label="Output"
                  value={usage?.totals.completion_tokens ?? 0}
                />
                <Legend
                  color="bg-muted-foreground/40"
                  label="Eksekusi"
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
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold text-foreground">
                Hasil eksekusi
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Komposisi status dari seluruh riwayat.
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
                  Eksekusi terbaru
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Delapan session terakhir dari seluruh workflow.
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
                  Semua
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
                  Belum ada session
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Mulai percakapan lewat widget Channel untuk melihat audit log di sini.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activity.executions.map((execution) => {
                  const meta = STATUS_META[execution.status];
                  return (
                    <li
                      key={execution.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${meta.dot}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {execution.workflow_name ||
                            `Workflow #${execution.workflow_id}`}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Eksekusi #{execution.id} ·{" "}
                          {formatDate(execution.started_at)}
                        </p>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground md:block">
                        {execution.total_tokens > 0
                          ? `${numberFormat.format(execution.total_tokens)} token`
                          : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h2 className="text-base font-semibold text-foreground">
                Perlu perhatian
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Sinyal yang bisa ditindaklanjuti.
              </p>
            </div>
            <div className="space-y-3 p-5">
              <AttentionRow
                icon={XCircle}
                tone="destructive"
                label="Eksekusi gagal"
                value={summary.failed}
                hint="Periksa log dan konfigurasi node"
              />
              <AttentionRow
                icon={Clock}
                tone="amber"
                label="Menunggu pesan"
                value={summary.waiting}
                hint="Workflow menunggu pesan pelanggan berikutnya"
              />
              <AttentionRow
                icon={CircleDashed}
                tone="muted"
                label="Workflow draft"
                value={stats.draft}
                hint="Belum diaktifkan untuk otomasi"
              />
              <AttentionRow
                icon={Layers}
                tone="primary"
                label="Rata-rata node"
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
                hint="Per workflow"
              />
            </div>

            <div className="border-t border-border p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Status sistem
              </p>

              <div className="mt-3 space-y-2">
                <SystemRow
                  label="Backend API"
                  value={HEALTH_STYLES[health].label}
                  dot={HEALTH_STYLES[health].dot}
                  text={HEALTH_STYLES[health].text}
                />
                <SystemRow
                  label="Pencatatan token"
                  value={summary.total > 0 ? "Aktif" : "Menunggu data"}
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
                  label="Zona waktu"
                  value={TIME_ZONE}
                  dot="bg-muted-foreground/40"
                  text="text-muted-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {/* OpenRouter free models */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Model AI gratis
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Pilihan model $0 dari OpenRouter untuk prototipe dan produksi
                ringan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={OPENROUTER_DOCS}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <BookOpen />
                Dokumentasi
              </Button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={OPENROUTER_FREE_COLLECTION}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Koleksi gratis
                <ArrowUpRight />
              </Button>
            </div>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            {FREE_MODELS.map((model) => (
              <div key={model.name} className="bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {model.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {model.author}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {model.context}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {model.tag}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-400">
                    $0 / M
                  </span>
                </div>
              </div>
            ))}
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
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {loading ? (
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            ) : (
              value
            )}
          </p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
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
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {loading ? (
          <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        {label}
      </span>
      <span className={`truncate text-sm font-medium ${text}`}>{value}</span>
    </div>
  );
}

function AutomationPipeline() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[30rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <Sparkles className="size-4 text-primary" />
          Alur otomasi
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-[520px] items-center gap-4">
            <PipelineNode icon={Zap} label="Trigger" hint="Pesan masuk" />
            <PipelineConnector />
            <PipelineNode icon={Bot} label="AI Agent" hint="Gemini" active />
            <PipelineConnector />
            <PipelineNode icon={Send} label="Send Message" hint="Balasan" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineNode({
  icon: Icon,
  label,
  hint,
  active,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        active
          ? "border-primary/40 bg-primary/[0.06] shadow-[0_0_35px_-12px_var(--primary)]"
          : "border-border bg-background/60"
      }`}
    >
      <span className="relative flex size-10 shrink-0 items-center justify-center">
        <span
          className={`relative flex size-10 items-center justify-center rounded-lg ${
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-[18px]" />
        </span>
      </span>
      <span className="pr-1">
        <span className="block text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {hint}
        </span>
      </span>
    </div>
  );
}

function PipelineConnector() {
  return <div className="h-0.5 min-w-10 flex-1 rounded-full bg-border" />;
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
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`size-2 rounded-full ${color}`} />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">
        {raw ? numberFormat.format(value) : compactNumber(value)}
      </p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <p className="text-sm font-medium text-foreground">
        Belum ada token tercatat
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Token akan terhitung otomatis setiap kali AI Agent dijalankan.
      </p>
    </div>
  );
}

function TokenAreaChart({ series }: { series: TokenUsageBucket[] }) {
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
          aria-label="Grafik penggunaan token"
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
                {`${bucket.label} · ${numberFormat.format(bucket.total_tokens)} token · ${bucket.executions} eksekusi`}
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
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {rate}%
          </span>
          <span className="text-xs text-muted-foreground">berhasil</span>
        </div>
      </div>

      <ul className="w-full space-y-2">
        {(
          ["success", "failed", "waiting", "running", "escalated"] as const
        ).map((key) => {
          const meta = STATUS_META[key];
          return (
            <li key={key} className="flex items-center gap-3 text-sm">
              <span className={`size-2.5 rounded-full ${meta.dot}`} />
              <span className="flex-1 text-muted-foreground">{meta.label}</span>
              <span className="font-medium text-foreground">
                {summary[key]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
