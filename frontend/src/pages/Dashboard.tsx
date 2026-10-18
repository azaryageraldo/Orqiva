
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  BookOpen,
  LoaderCircle,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";

import { getWorkflows } from "../services/workflow";
import {
  getTokenUsage,
  type TokenUsageBucket,
  type TokenUsagePeriod,
  type TokenUsageStats,
} from "../services/stats";
import type { Workflow as WorkflowItem } from "../types/workflow";

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
  { name: "Nemotron 3 Ultra", author: "NVIDIA", context: "1M", tag: "Reasoning" },
  { name: "Nemotron 3.5 Lightning", author: "NVIDIA", context: "1M", tag: "Fast" },
  { name: "Laguna S 2.1", author: "Poolside", context: "262K", tag: "Coding" },
  { name: "Dots3-Note Preview", author: "Dots Studio", context: "512K", tag: "Multimodal" },
  { name: "Nemotron 3 Super", author: "NVIDIA", context: "262K", tag: "Agentic" },
  { name: "Nemotron 3.5 Super VL", author: "NVIDIA", context: "1M", tag: "Vision" },
  { name: "Inkling", author: "Thinking Machines", context: "1.05M", tag: "Multimodal" },
  { name: "North Mini Code", author: "Cohere", context: "256K", tag: "Coding" },
];

const numberFormat = new Intl.NumberFormat("id-ID");

function compactNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [period, setPeriod] = useState<TokenUsagePeriod>("daily");
  const [usage, setUsage] = useState<TokenUsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getWorkflows()
      .then((result) => {
        if (!active) return;
        setWorkflows(result.data);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Data dashboard gagal dimuat. Periksa koneksi dan autentikasi API.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;

    getTokenUsage(period)
      .then((result) => {
        if (active) setUsage(result);
      })
      .catch(() => {
        if (active) setUsage(null);
      })
      .finally(() => {
        if (active) setUsageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  const reload = () => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  };

  const changePeriod = (next: TokenUsagePeriod) => {
    if (next === period) return;
    setUsageLoading(true);
    setPeriod(next);
  };

  const stats = useMemo(() => {
    const active = workflows.filter((item) => item.status === "active").length;
    return {
      total: workflows.length,
      active,
      draft: workflows.length - active,
    };
  }, [workflows]);

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        {/* Heading + automation motif */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Pantau otomatisasi, konsumsi token AI, dan model gratis yang siap
              dipakai.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 md:flex">
              <FlowNode icon={Zap} label="Trigger" />
              <span className="h-px w-5 bg-border" />
              <FlowNode icon={Bot} label="AI Agent" accent />
              <span className="h-px w-5 bg-border" />
              <FlowNode icon={Send} label="Send" />
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1.5 font-medium hover:opacity-80"
            >
              <RefreshCw size={14} />
              Coba lagi
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          <StatTile
            label="Total workflow"
            value={stats.total}
            loading={loading}
          />
          <StatTile
            label="Aktif"
            value={stats.active}
            loading={loading}
            tone="active"
          />
          <StatTile
            label="Draft"
            value={stats.draft}
            loading={loading}
            tone="draft"
          />
        </div>

        {/* Token usage */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Penggunaan token
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Total token yang diproses AI Agent.
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
            <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total token</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {usageLoading ? "—" : compactNumber(usage?.totals.total_tokens ?? 0)}
                </p>
              </div>

              <TokenLegend
                color="bg-primary"
                label="Input"
                value={usage?.totals.prompt_tokens ?? 0}
              />
              <TokenLegend
                color="bg-primary/40"
                label="Output"
                value={usage?.totals.completion_tokens ?? 0}
              />
              <TokenLegend
                color="bg-muted-foreground/40"
                label="Eksekusi"
                value={usage?.totals.executions ?? 0}
                raw
              />
            </div>

            {usageLoading ? (
              <div className="flex h-56 items-center justify-center">
                <LoaderCircle
                  size={24}
                  className="animate-spin text-muted-foreground"
                />
              </div>
            ) : !usage || usage.totals.total_tokens === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                <p className="text-sm font-medium text-foreground">
                  Belum ada token tercatat
                </p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Token akan terhitung otomatis setiap kali AI Agent dijalankan.
                </p>
              </div>
            ) : (
              <TokenChart series={usage.series} />
            )}
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
              <a
                href={OPENROUTER_DOCS}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-ring/50 hover:text-foreground"
              >
                <BookOpen size={15} />
                Dokumentasi
              </a>
              <a
                href={OPENROUTER_FREE_COLLECTION}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-ring/50 hover:text-foreground"
              >
                Koleksi gratis
                <ArrowUpRight size={15} />
              </a>
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

function StatTile({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number;
  loading: boolean;
  tone?: "active" | "draft";
}) {
  const valueTone =
    tone === "active"
      ? "text-emerald-400"
      : tone === "draft"
        ? "text-amber-400"
        : "text-foreground";

  return (
    <div className="bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueTone}`}>
        {loading ? (
          <LoaderCircle size={24} className="animate-spin text-muted-foreground" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function TokenLegend({
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

function TokenChart({ series }: { series: TokenUsageBucket[] }) {
  const max = Math.max(1, ...series.map((bucket) => bucket.total_tokens));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex h-48 items-end gap-1.5 border-b border-border">
          {series.map((bucket) => {
            const height = (bucket.total_tokens / max) * 100;
            return (
              <div
                key={bucket.key}
                className="group flex h-full flex-1 flex-col justify-end"
                title={`${bucket.label} · ${numberFormat.format(bucket.total_tokens)} token · ${bucket.executions} eksekusi`}
              >
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-t-md transition group-hover:opacity-80"
                  style={{ height: `${height}%` }}
                >
                  <div
                    className="w-full bg-primary/40"
                    style={{ flexGrow: bucket.completion_tokens }}
                  />
                  <div
                    className="w-full bg-primary"
                    style={{ flexGrow: bucket.prompt_tokens }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex gap-1.5">
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

function FlowNode({
  icon: Icon,
  label,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  accent?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`flex size-7 items-center justify-center rounded-md border ${
          accent
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground"
        }`}
      >
        <Icon size={14} />
      </span>
      <span className="text-xs font-medium text-muted-foreground">{label}      </span>
    </span>
  );
}
