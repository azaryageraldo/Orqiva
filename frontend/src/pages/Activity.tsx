import { useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ExecutionStatusBadge from "@/components/ExecutionStatusBadge";
import { formatLocale, useI18n } from "@/lib/i18n";
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

const STATUS_LABELS: Record<ExecutionStatus, string> = {
  success: "activity.success",
  failed: "activity.failed",
  waiting: "activity.waiting",
  running: "activity.running",
  escalated: "activity.escalated",
};

const DATE_PRESETS = [
  { labelKey: "activity.presetToday", days: 0 },
  { labelKey: "activity.preset7", days: 6 },
  { labelKey: "activity.preset30", days: 29 },
] as const;

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Activity({
  onOpenWorkflow,
  onOpenExecution,
}: ActivityProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [draft, setDraft] = useState<ActivityFilters>({});

  async function loadPage(
    next: ActivityFilters,
    page: number,
    append = false,
  ) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await getActivity(20, next, page);

      setStats((current) =>
        append && current
          ? {
              ...result,
              executions: [...current.executions, ...result.executions],
            }
          : result,
      );
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          t("activity.loadError"),
        ),
      );
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }

  function refresh() {
    void loadPage(filters, 1);
  }

  function applyFilters() {
    setFilters(draft);
    void loadPage(draft, 1);
  }

  function resetFilters() {
    setDraft({});
    setFilters({});
    void loadPage({}, 1);
  }

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const next: ActivityFilters = {
      ...draft,
      from: toDateInput(from),
      to: toDateInput(to),
    };

    setDraft(next);
    setFilters(next);
    void loadPage(next, 1);
  }

  function loadMore() {
    if (!stats || loadingMore) return;

    void loadPage(filters, stats.meta.page + 1, true);
  }

  const hasFilters = Boolean(filters.status || filters.from || filters.to);
  const hasDraft = Boolean(
    draft.status ||
      draft.from ||
      draft.to ||
      filters.status ||
      filters.from ||
      filters.to,
  );

  useEffect(() => {
    let active = true;

    getActivity(20, {}, 1)
      .then((result) => {
        if (active) setStats(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            getErrorMessage(
              caught,
              t("activity.loadError"),
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <ActivityIcon className="size-4" />
              {t("nav.workspace")}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("activity.title")}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              {t("activity.subtitle")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={refresh}
            disabled={loading}
            className="h-10 px-4"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            {t("activity.refresh")}
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
            <Button type="button" variant="ghost" size="sm" onClick={refresh}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
          {(
            [
              [t("activity.total"), stats?.summary.total],
              [t("activity.success"), stats?.summary.success],
              [t("activity.failed"), stats?.summary.failed],
              [t("activity.waiting"), stats?.summary.waiting],
              [t("activity.escalated"), stats?.summary.escalated],
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {t("activity.latestTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("activity.latestDescription")}
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
                {t("activity.loadedCount", { count: stats?.executions.length ?? 0 })}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_auto] xl:items-end">
                <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
                  <Label
                    htmlFor="activity-status"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {t("activity.statusLabel")}
                  </Label>
                  <Select
                    value={draft.status || "all"}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        status:
                          value === "all" || value === null
                            ? ""
                            : (value as ExecutionStatus),
                      }))
                    }
                  >
                    <SelectTrigger
                      id="activity-status"
                      className="h-9 w-full dark:bg-input/30"
                    >
                      <SelectValue>
                        {(value) =>
                          value && value !== "all"
                            ? t(STATUS_LABELS[value as ExecutionStatus])
                            : t("activity.allStatus")
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("activity.allStatus")}</SelectItem>
                      <SelectItem value="success">{t("activity.success")}</SelectItem>
                      <SelectItem value="failed">{t("activity.failed")}</SelectItem>
                      <SelectItem value="waiting">{t("activity.waiting")}</SelectItem>
                      <SelectItem value="running">{t("activity.running")}</SelectItem>
                      <SelectItem value="escalated">{t("activity.escalated")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="activity-from"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {t("activity.fromDate")}
                  </Label>
                  <Input
                    id="activity-from"
                    type="date"
                    value={draft.from ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    className="h-9 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="activity-to"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {t("activity.toDate")}
                  </Label>
                  <Input
                    id="activity-to"
                    type="date"
                    value={draft.to ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    className="h-9 [color-scheme:dark]"
                  />
                </div>

                <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                  <Button
                    type="button"
                    onClick={applyFilters}
                    disabled={loading}
                    className="h-9 flex-1 xl:flex-none"
                  >
                    {t("activity.apply")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFilters}
                    disabled={loading || !hasDraft}
                    className="h-9"
                  >
                    {t("activity.reset")}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("activity.quickRange")}
                </span>
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.labelKey}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset(preset.days)}
                    disabled={loading}
                    className="h-7 rounded-full px-3 text-xs"
                  >
                    {t(preset.labelKey)}
                  </Button>
                ))}
              </div>

              {hasFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3 text-xs">
                  <span className="text-muted-foreground">{t("activity.activeFilter")}</span>
                  {filters.status && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
                      {t(STATUS_LABELS[filters.status])}
                      <button
                        type="button"
                        aria-label={t("activity.removeStatus")}
                        onClick={() => {
                          const next = { ...draft, status: "" as const };
                          setDraft(next);
                          setFilters(next);
                          void loadPage(next, 1);
                        }}
                        className="rounded-full hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                  {(filters.from || filters.to) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-muted-foreground">
                      {filters.from || t("activity.dateStart")} – {filters.to || t("activity.dateEnd")}
                      <button
                        type="button"
                        aria-label={t("activity.removeDate")}
                        onClick={() => {
                          const next = { ...draft, from: "", to: "" };
                          setDraft(next);
                          setFilters(next);
                          void loadPage(next, 1);
                        }}
                        className="rounded-full hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  )}
                </div>
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
                {hasFilters
                  ? t("activity.noMatch")
                  : t("activity.empty")}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasFilters
                  ? t("activity.noMatchHint")
                  : t("activity.emptyHint")}
              </p>
            </div>
          ) : (
            <>
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

              {stats.meta.has_more && (
                <div className="border-t border-border p-4 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="h-9 px-4"
                  >
                    {loadingMore && (
                      <LoaderCircle className="animate-spin" />
                    )}
                    {t("activity.loadMore")}
                  </Button>
                </div>
              )}
            </>
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
  const { language, t } = useI18n();
  const locale = formatLocale(language);

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
      <ExecutionStatusBadge status={execution.status} />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenWorkflow(String(execution.workflow_id))}
          className="truncate text-sm font-medium text-foreground hover:underline focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          {execution.workflow_name || t("activity.workflowFallback", { id: execution.workflow_id })}
        </button>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {t("activity.session", {
            id: execution.session_id ?? `#${execution.id}`,
          })}{" "}
          · {formatDate(execution.started_at, locale)}
          {execution.steps_count > 0
            ? ` · ${t("activity.steps", { count: execution.steps_count })}`
            : ""}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {execution.contact_id
            ? t("activity.contact", {
                name: execution.contact_name || execution.contact_id,
              })
            : t("activity.contactMissing")}
        </p>
        {execution.error && (
          <p className="mt-1 line-clamp-2 text-xs text-destructive">
            {execution.error}
          </p>
        )}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">
        {execution.total_tokens > 0
          ? t("activity.tokens", {
              count: execution.total_tokens.toLocaleString(locale),
            })
          : t("activity.noTokens")}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onOpenExecution(execution)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {t("activity.detail")}
        <ChevronRight className="size-4" />
      </Button>
    </li>
  );
}
