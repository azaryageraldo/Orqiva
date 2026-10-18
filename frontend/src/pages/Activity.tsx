import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  CircleDashed,
  LoaderCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getActivity,
  type ActivityExecution,
  type ActivityStats,
  type ExecutionStatus,
} from "../services/stats";

interface ActivityProps {
  onOpenWorkflow: (workflowId: string) => void;
}

const STATUS_STYLES: Record<
  ExecutionStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  success: {
    label: "Sukses",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    icon: CheckCircle2,
  },
  failed: {
    label: "Gagal",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  waiting: {
    label: "Menunggu",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    icon: CircleDashed,
  },
  running: {
    label: "Berjalan",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: LoaderCircle,
  },
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

export default function Activity({ onOpenWorkflow }: ActivityProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setStats(await getActivity());
    } catch {
      setError("Riwayat eksekusi gagal dimuat. Periksa koneksi backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getActivity()
      .then((result) => {
        if (active) setStats(result);
      })
      .catch(() => {
        if (active) {
          setError("Riwayat eksekusi gagal dimuat. Periksa koneksi backend.");
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

        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {(
            [
              ["Total", stats?.summary.total],
              ["Sukses", stats?.summary.success],
              ["Gagal", stats?.summary.failed],
              ["Menunggu", stats?.summary.waiting],
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
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Eksekusi terbaru
            </h2>
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
                Belum ada eksekusi
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Jalankan workflow dari Chat Widget untuk melihat riwayat di sini.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {stats.executions.map((execution) => (
                <ActivityRow
                  key={execution.id}
                  execution={execution}
                  onOpenWorkflow={onOpenWorkflow}
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
}: {
  execution: ActivityExecution;
  onOpenWorkflow: (workflowId: string) => void;
}) {
  const status = STATUS_STYLES[execution.status];
  const StatusIcon = status.icon;

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
      <Badge variant="outline" className={`h-6 shrink-0 px-2.5 ${status.className}`}>
        <StatusIcon className="size-3" />
        {status.label}
      </Badge>

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
    </li>
  );
}
