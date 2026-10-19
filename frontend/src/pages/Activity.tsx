import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ExecutionStatusBadge from "@/components/ExecutionStatusBadge";
import {
  getActivity,
  type ActivityExecution,
  type ActivityFilters,
  type ActivityStats,
  type ExecutionStatus,
} from "../services/stats";
import { getErrorMessage } from "../services/api";

interface ActivityProps {
  onOpenWorkflow: (workflowId: string) => void;
  onOpenExecution: (execution: ActivityExecution) => void;
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

export default function Activity({
  onOpenWorkflow,
  onOpenExecution,
}: ActivityProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [draft, setDraft] = useState<ActivityFilters>({});

  async function refresh(next: ActivityFilters = filters) {
    setLoading(true);
    setError("");

    try {
      setStats(await getActivity(20, next));
    } catch (caught) {
      setError(
        getErrorMessage(caught, "Riwayat eksekusi gagal dimuat. Periksa koneksi backend."),
      );
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setFilters(draft);
    void refresh(draft);
  }

  function resetFilters() {
    setDraft({});
    setFilters({});
    void refresh({});
  }

  const hasFilters = Boolean(filters.status || filters.from || filters.to);

  useEffect(() => {
    let active = true;

    getActivity()
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            getErrorMessage(caught, "Riwayat eksekusi gagal dimuat. Periksa koneksi backend."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <ActivityIcon className="size-4" />
              Workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Activity
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Riwayat eksekusi workflow terbaru beserta status dan konsumsi
              tokennya.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-10 px-4"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Segarkan
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void refresh()}
            >
              Coba lagi
            </Button>
          </div>
        )}

        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
          {(
            [
              ["Total", stats?.summary.total],
              ["Sukses", stats?.summary.success],
              ["Gagal", stats?.summary.failed],
              ["Menunggu", stats?.summary.waiting],
              ["Ke admin", stats?.summary.escalated],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-card p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {loading || value === undefined ? (
                  <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                ) : (
                  value
                )}
              </p>
            </div>
          ))}
        </div>

        <Card className="gap-0 py-0">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Eksekusi terbaru
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Filter berdasarkan status dan tanggal, lalu buka detail untuk
                audit per langkah.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Status</span>
                <select
                  value={draft.status ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as ExecutionStatus | "",
                    }))
                  }
                  className={`${SELECT_CLASS} sm:w-36`}
                >
                  <option value="">Semua status</option>
                  <option value="success">Sukses</option>
                  <option value="failed">Gagal</option>
                  <option value="waiting">Menunggu</option>
                  <option value="running">Berjalan</option>
                  <option value="escalated">Ke admin</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Dari tanggal</span>
                <input
                  type="date"
                  value={draft.from ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  className={`${SELECT_CLASS} sm:w-40`}
                />
              </label>

              <label className="space-y-1 text-xs text-muted-foreground">
                <span>Sampai tanggal</span>
                <input
                  type="date"
                  value={draft.to ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  className={`${SELECT_CLASS} sm:w-40`}
                />
              </label>

              <Button
                type="button"
                variant="outline"
                onClick={applyFilters}
                disabled={loading}
                className="h-9 px-3"
              >
                Terapkan
              </Button>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetFilters}
                  disabled={loading}
                  className="h-9 px-3 text-muted-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !stats || stats.executions.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                <ActivityIcon className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {hasFilters ? "Tidak ada eksekusi yang cocok" : "Belum ada eksekusi"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasFilters
                  ? "Ubah status atau rentang tanggal, lalu terapkan kembali."
                  : "Jalankan workflow dari Chat Widget untuk melihat riwayat di sini."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.executions.map((execution) => (
                <ActivityRow
                  key={execution.id}
                  execution={execution}
                  onOpenWorkflow={onOpenWorkflow}
                  onOpenExecution={onOpenExecution}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function ActivityRow({
  execution,
  onOpenWorkflow,
  onOpenExecution,
}: {
  execution: ActivityExecution;
  onOpenWorkflow: (workflowId: string) => void;
  onOpenExecution: (execution: ActivityExecution) => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
      <ExecutionStatusBadge status={execution.status} />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenWorkflow(String(execution.workflow_id))}
          className="truncate text-sm font-medium text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          {execution.workflow_name || `Workflow #${execution.workflow_id}`}
        </button>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Eksekusi #{execution.id} · {formatDate(execution.started_at)}
          {execution.steps_count > 0
            ? ` · ${execution.steps_count} langkah`
            : ""}
        </p>
        {execution.error && (
          <p className="mt-1 line-clamp-2 text-xs text-destructive">
            {execution.error}
          </p>
        )}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">
        {execution.total_tokens > 0
          ? `${execution.total_tokens.toLocaleString("id-ID")} token`
          : "Tanpa token"}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onOpenExecution(execution)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        Lihat detail
        <ChevronRight className="size-4" />
      </Button>
    </li>
  );
}
