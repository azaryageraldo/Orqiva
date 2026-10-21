import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  Coins,
  Layers,
  LoaderCircle,
  RefreshCw,
  Timer,
  Workflow as WorkflowIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { getErrorMessage } from "../services/api";
import {
  getExecution,
  type ExecutionDetail as ExecutionDetailData,
  type ExecutionStep,
} from "../services/stats";

interface ExecutionDetailProps {
  workflowId: string;
  executionId: number;
  onBack: () => void;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  trigger: "execution.node.trigger",
  ai_agent: "execution.node.aiAgent",
  output: "execution.node.output",
  if_else: "execution.node.condition",
  relocate: "execution.node.relocate",
  go_to: "execution.node.goTo",
  stopper: "execution.node.stopper",
};

function stepStatusLabel(
  value: string | null,
  t: (key: string) => string,
) {
  if (value === "success") return t("execution.success");
  if (value === "error") return t("execution.error");
  return t("execution.allStatuses");
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatDuration(ms: number, t: (key: string) => string): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}${t("execution.secondsShort")}`;
}

function stepNodeLabel(
  step: ExecutionStep,
  t: (key: string) => string,
): string {
  const name = step.node_name?.trim();

  if (
    !name ||
    name.toLowerCase().replaceAll(" ", "_") === step.node_type.toLowerCase()
  ) {
    const key = NODE_TYPE_LABELS[step.node_type];
    return key ? t(key) : step.node_type;
  }

  return name;
}

function formatValue(
  value: unknown,
  yes: string,
  no: string,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? yes : no;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value, null, 2);
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;

  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StepCard({ step }: { step: ExecutionStep }) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const variables = step.variables ? Object.entries(step.variables) : [];
  const typeKey = NODE_TYPE_LABELS[step.node_type];
  const typeLabel = typeKey ? t(typeKey) : step.node_type;

  return (
    <li className="relative pl-8">
      <span
        className={`absolute top-4 left-0 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border text-[11px] font-semibold ${
          step.status === "error"
            ? "border-destructive/40 bg-destructive/15 text-destructive"
            : "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
        }`}
      >
        {step.step}
      </span>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">
                {stepNodeLabel(step, t)}
              </p>
              {typeLabel !== stepNodeLabel(step, t) && (
                <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {typeLabel}
                </span>
              )}
              {step.workflow_name && (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                  <WorkflowIcon className="size-3" />
                  {step.workflow_name}
                </span>
              )}
              {step.status === "error" && (
                <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  {t("execution.error")}
                </span>
              )}
              {step.branch && (
                <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                  {step.branch === "true" ? t("execution.branchIf") : t("execution.branchElse")}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(step.executed_at, locale)}
              {step.node_id ? ` · ${step.node_id}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3.5" />
              {formatDuration(step.duration_ms, t)}
            </span>
            {step.total_tokens > 0 && (
              <span className="inline-flex items-center gap-1">
                <Coins className="size-3.5" />
                {t("execution.stepTokens", { count: step.total_tokens.toLocaleString(locale) })}
              </span>
            )}
          </div>
        </div>

        {step.error && (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
            {step.error}
          </p>
        )}

        {step.messages && step.messages.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {t("execution.sentMessages")}
            </p>
            {step.messages.map((message, index) => (
              <p
                key={`${step.id}-message-${index}`}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-foreground"
              >
                {message}
              </p>
            ))}
          </div>
        )}

        {variables.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {t("execution.variables")}
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {variables.map(([name, value]) => (
                <div
                  key={`${step.id}-${name}`}
                  className="rounded-lg border border-border bg-background px-3 py-2"
                >
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    {name}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-5 whitespace-pre-wrap text-foreground">
                    {formatValue(value, t("execution.yes"), t("execution.no"))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {step.input && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                {t("execution.stepInput")}
              </summary>
              <div className="mt-2">
                <JsonBlock value={step.input} />
              </div>
            </details>
          )}
          {step.output && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                {t("execution.stepOutput")}
              </summary>
              <div className="mt-2">
                <JsonBlock value={step.output} />
              </div>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}

export default function ExecutionDetail({
  workflowId,
  executionId,
  onBack,
}: ExecutionDetailProps) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const [detail, setDetail] = useState<ExecutionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodeFilter, setNodeFilter] = useState("all");
  const [stepStatus, setStepStatus] = useState<"all" | "success" | "error">(
    "all",
  );

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setDetail(await getExecution(workflowId, executionId));
    } catch (caught) {
      setError(
        getErrorMessage(
          caught,
          t("execution.loadError"),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    getExecution(workflowId, executionId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            getErrorMessage(
              caught,
              t("execution.loadError"),
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
  }, [workflowId, executionId, t]);

  const nodes = useMemo(() => {
    const unique = new Map<string, string>();

    for (const step of detail?.steps ?? []) {
      if (!unique.has(step.node_id)) {
        unique.set(step.node_id, stepNodeLabel(step, t));
      }
    }

    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [detail, t]);

  const steps = useMemo(
    () =>
      (detail?.steps ?? []).filter(
        (step) =>
          (nodeFilter === "all" || step.node_id === nodeFilter) &&
          (stepStatus === "all" || step.status === stepStatus),
      ),
    [detail, nodeFilter, stepStatus],
  );

  const totalDuration = useMemo(() => {
    if (!detail) return 0;

    if (detail.started_at && detail.finished_at) {
      const start = new Date(detail.started_at).getTime();
      const finish = new Date(detail.finished_at).getTime();

      if (!Number.isNaN(start) && !Number.isNaN(finish)) {
        return Math.max(0, finish - start);
      }
    }

    return detail.steps.reduce((total, step) => total + step.duration_ms, 0);
  }, [detail]);

  const hasFilters = nodeFilter !== "all" || stepStatus !== "all";

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="mb-4 -ml-2 text-muted-foreground"
            >
              <ArrowLeft />
              {t("execution.back")}
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {detail?.chat_session_id
                  ? t("execution.titleSession", {
                      id: detail.chat_session_id,
                    })
                  : t("execution.titleExecution", { id: executionId })}
              </h1>
              {detail && <ExecutionStatusBadge status={detail.status} />}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("execution.subtitle", {
                name: detail?.workflow_name || t("execution.loadingWorkflow"),
              })}
            </p>
            {detail && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t("execution.contact")}{" "}
                  <span className="font-mono text-foreground">
                    {detail.contact_public_id || t("execution.contactMissing")}
                  </span>
                </span>
                <span>{t("execution.session")} {detail.chat_session_id ?? "—"}</span>
                {detail.current_workflow_name && (
                  <span>
                    {t("execution.activeWorkflow")}{" "}
                    <span className="text-foreground">
                      {detail.current_workflow_name}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-10 px-4"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            {t("execution.refresh")}
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
              {t("common.retry")}
            </Button>
          </div>
        )}

        {loading && !detail ? (
          <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("execution.detailUnavailable")}
          </Card>
        ) : (
          <>
            <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              <div className="bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("execution.duration")}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatDuration(totalDuration, t)}
                </p>
              </div>
              <div className="bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("execution.totalTokens")}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {detail.total_tokens.toLocaleString(locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("execution.promptCompletion", {
                    prompt: detail.prompt_tokens.toLocaleString(locale),
                    completion: detail.completion_tokens.toLocaleString(locale),
                  })}
                </p>
              </div>
              <div className="bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("execution.steps")}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {detail.steps.length}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers className="size-3" />
                  {t("execution.failedCount", {
                    count: detail.steps.filter(
                      (step) => step.status === "error",
                    ).length,
                  })}
                </p>
              </div>
              <div className="bg-card p-5">
                <p className="text-sm text-muted-foreground">{t("execution.time")}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="size-4 text-muted-foreground" />
                  {formatDate(detail.started_at, locale)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {detail.finished_at
                    ? t("execution.finished", {
                        date: formatDate(detail.finished_at, locale),
                      })
                    : t("execution.notFinished")}
                </p>
              </div>
            </div>

            {detail.error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
              >
                {detail.error}
              </div>
            )}

            {detail.diagnostic && (
              <Card className="border-amber-400/25 bg-amber-400/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
                    <CircleAlert className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">
                      {detail.diagnostic.title}
                    </h2>
                    {detail.diagnostic.node_name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("execution.nodeLabel")} {detail.diagnostic.node_name}
                        {detail.diagnostic.node_id
                          ? ` · ${detail.diagnostic.node_id}`
                          : ""}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {detail.diagnostic.reason}
                    </p>
                    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {t("execution.fixTitle")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-foreground">
                        {detail.diagnostic.fix}
                      </p>
                      {detail.diagnostic.example && (
                        <pre className="mt-2 overflow-x-auto rounded-md bg-muted/50 px-2.5 py-2 text-xs text-foreground">
                          {detail.diagnostic.example}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="gap-0 py-0">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {t("execution.timeline")}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t("execution.stepsShown", {
                      shown: steps.length,
                      total: detail.steps.length,
                    })}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,9rem)_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label
                      htmlFor="step-node-filter"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {t("execution.nodeFilter")}
                    </Label>
                    <Select
                      value={nodeFilter}
                      onValueChange={(value) =>
                        setNodeFilter(value ?? "all")
                      }
                    >
                      <SelectTrigger
                        id="step-node-filter"
                        className="h-9 w-full dark:bg-input/30"
                      >
                        <SelectValue>
                          {(value) =>
                            !value || value === "all"
                              ? t("execution.allNodes")
                              : (nodes.find((node) => node.id === value)
                                  ?.name ?? value)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("execution.allNodes")}</SelectItem>
                        {nodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="step-status-filter"
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {t("execution.stepStatus")}
                    </Label>
                    <Select
                      value={stepStatus}
                      onValueChange={(value) =>
                        setStepStatus(
                          (value ?? "all") as "all" | "success" | "error",
                        )
                      }
                    >
                      <SelectTrigger
                        id="step-status-filter"
                        className="h-9 w-full dark:bg-input/30"
                      >
                        <SelectValue>
                          {(value) => stepStatusLabel(value, t)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("execution.allStatuses")}</SelectItem>
                        <SelectItem value="success">{t("execution.success")}</SelectItem>
                        <SelectItem value="error">{t("execution.error")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 sm:mb-0"
                    disabled={!hasFilters}
                    onClick={() => {
                      setNodeFilter("all");
                      setStepStatus("all");
                    }}
                  >
                    {t("execution.reset")}
                  </Button>
                </div>
              </div>

              {detail.steps.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm font-medium text-foreground">
                    {t("execution.auditUnavailable")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("execution.auditUnavailableHint")}
                  </p>

                  {detail.logs && detail.logs.length > 0 ? (
                    <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
                      {detail.logs.map((log, index) => (
                        <li
                          key={`${log.timestamp ?? "log"}-${index}`}
                          className="px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {log.name || log.node || t("execution.stepFallback")}
                            </span>
                            <span>{formatDate(log.timestamp ?? null, locale)}</span>
                            {typeof log.duration_ms === "number" && (
                              <span>{formatDuration(log.duration_ms, t)}</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-foreground">
                            {log.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t("execution.noSummaryLogs")}
                    </p>
                  )}
                </div>
              ) : steps.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {t("execution.noMatchingSteps")}
                </p>
              ) : (
                <ol className="space-y-4 p-5">
                  {steps.map((step) => (
                    <StepCard key={step.id} step={step} />
                  ))}
                </ol>
              )}
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("execution.input")}
                </h2>
                <div className="mt-3">
                  <JsonBlock value={detail.input} />
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("execution.finalOutput")}
                </h2>
                <div className="mt-3">
                  {detail.output ? (
                    Array.isArray(detail.output.messages) &&
                    detail.output.messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {detail.status === "escalated"
                          ? t("execution.escalatedNoReply")
                          : t("execution.finishedNoMessage")}
                      </p>
                    ) : (
                      <JsonBlock
                        value={
                          detail.output.messages ??
                          detail.output.output ??
                          detail.output
                        }
                      />
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("execution.noOutput")}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
