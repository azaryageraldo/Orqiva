import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  Layers,
  LoaderCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ExecutionStatusBadge from "@/components/ExecutionStatusBadge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ErrorSummaryCard from "@/components/execution/ErrorSummaryCard";
import StepNodeCard from "@/components/execution/StepNodeCard";
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
  onNavigate: (key: string) => void;
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

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ExecutionDetail({
  workflowId,
  executionId,
  onBack,
  onNavigate,
}: ExecutionDetailProps) {
  const { language, t } = useI18n();
  const locale = formatLocale(language);
  const [detail, setDetail] = useState<ExecutionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [isInputOutputExpanded, setIsInputOutputExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    getExecution(workflowId, executionId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught, t("execution.loadError")));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workflowId, executionId, t]);

  const steps = useMemo(() => detail?.steps ?? [], [detail]);

  const errorStep = useMemo(
    () => steps.find((step) => step.status === "error") ?? null,
    [steps],
  );

  const diagnostic = detail?.diagnostic ?? null;

  const allMessages = (detail?.steps ?? []).flatMap((step) =>
    (step.messages ?? []).map((message) => ({ step, message })),
  );

  if (loading && !detail) {
    return (
      <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-h-72 items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {error || t("execution.detailUnavailable")}
        </Card>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-4">
        {/* Breadcrumb */}
        <Breadcrumb className="flex flex-wrap items-center gap-1 text-xs">
          <BreadcrumbItem className="flex items-center gap-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("workflows");
              }}
              className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Bot className="size-3" /> Agent
            </a>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-zinc-600">
            <ChevronRight className="size-3" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="flex items-center gap-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Audit Log
            </a>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-zinc-600">
            <ChevronRight className="size-3" />
          </BreadcrumbSeparator>
          <BreadcrumbPage className="text-zinc-300 truncate max-w-[220px]">
            {detail.chat_session_id ?? `#${detail.id}`} :{" "}
            {detail.workflow_name || t("activity.workflowFallback", { id: detail.workflow_id })}
          </BreadcrumbPage>
        </Breadcrumb>

        {/* Execution load error */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <span>{error}</span>
          </div>
        )}

        {/* Error Summary - shows when any node failed */}
        {errorStep && diagnostic && (
          <ErrorSummaryCard
            errorStep={errorStep}
            diagnostic={diagnostic}
            t={t}
          />
        )}

        {/* Info cards row */}
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1">
              Session Id
            </p>
            <p className="text-sm font-mono text-foreground">
              {detail.chat_session_id ?? `#${detail.id}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1">
              Session Create
            </p>
            <p className="text-sm font-mono text-foreground">
              {formatDate(detail.started_at, locale)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1">
              Contact Id
            </p>
            <p className="text-sm font-mono text-foreground truncate">
              {detail.contact_public_id ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1">
              Contact Name
            </p>
            <p className="text-sm font-mono text-foreground truncate">
              {detail.contact_name ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4 flex flex-col justify-center">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase mb-1">
              Status
            </p>
            <ExecutionStatusBadge status={detail.status} />
          </div>
        </div>

        {/* 3-Panel Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left Panel: Chat Transcript */}
          <div className="flex-1 lg:w-[50%] flex flex-col gap-4">
            <Card className="gap-0 py-0">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("activity.detail.chatTranscript")}
                </h2>
              </div>
              <div className="p-5 flex-1 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto">
                {allMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="mb-2 flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                      <svg className="size-5" />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {t("execution.noSummaryLogs")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allMessages.map(({ step, message }, index) => {
                      const isBot = index % 2 === 1;

                      return (
                        <div
                          key={`${step.id}-${index}`}
                          className={`rounded-xl p-3 ${
                            isBot
                              ? "bg-primary text-primary-foreground self-end ml-auto max-w-[80%]"
                              : "bg-muted text-foreground self-start max-w-[80%]"
                          }`}
                        >
                          <p className="text-sm leading-6 whitespace-pre-wrap">
                            {message}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground self-end">
                            {stepNodeLabel(step, t)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Panel: Activity Log */}
          <div className="flex-1 lg:w-[50%] flex flex-col gap-4">
            <Card className="gap-0 py-0">
              <div className="border-b border-border px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t("activity.detail.activityLog")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedStep(null)}
                      className="h-7 px-2 text-[10px]"
                    >
                      {t("activity.detail.expandAll")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                    >
                      {t("activity.detail.export")}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-5 flex-1 min-h-[400px] max-h-[calc(100vh-400px)] overflow-y-auto">
                {steps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("execution.noMatchingSteps")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps.map((step) => {
                      const stepDiagnostic =
                        step.status === "error" && diagnostic
                          ? diagnostic
                          : null;

                      return (
                        <StepNodeCard
                          key={step.id}
                          step={step}
                          diagnostic={stepDiagnostic}
                          isExpanded={expandedStep === step.id}
                          onExpand={() =>
                            setExpandedStep(
                              expandedStep === step.id ? null : step.id,
                            )
                          }
                          t={t}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Input/Output Section - Collapsible */}
        <details className="group">
          <summary
            className="flex items-center justify-between cursor-pointer text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase py-3 hover:text-foreground"
            onClick={() => setIsInputOutputExpanded(!isInputOutputExpanded)}
          >
            <span>
              <Layers className="size-3 mr-1" /> {t("execution.inputOutput")}
            </span>
            <ChevronRight
              size={14}
              strokeWidth={1.5}
              className={`transition-transform duration-200 ${isInputOutputExpanded ? "rotate-90" : ""}`}
            />
          </summary>

          <div className="grid gap-4 lg:grid-cols-2 pt-4 pb-6">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground">
                {t("execution.input")}
              </h2>
              <div className="mt-3">
                <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-foreground">
                  {JSON.stringify(detail.input, null, 2)}
                </pre>
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
                    <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-foreground">
                      {JSON.stringify(
                        detail.output.messages ??
                          detail.output.output ??
                          detail.output,
                        null,
                        2,
                      )}
                    </pre>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("execution.noOutput")}
                  </p>
                )}
              </div>
            </Card>
          </div>
        </details>
      </div>
    </section>
  );
}
