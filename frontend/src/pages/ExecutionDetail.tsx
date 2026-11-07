import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Copy,
  GitFork,
  Layers,
  LoaderCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ExecutionStatusBadge from "@/components/ExecutionStatusBadge";
import ErrorSummaryCard from "@/components/execution/ErrorSummaryCard";
import StepNodeCard from "@/components/execution/StepNodeCard";
import { formatLocale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

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

  const allMessages = useMemo(
    () =>
      (detail?.steps ?? []).flatMap((step) =>
        (step.messages ?? []).map((message) => ({ step, message })),
      ),
    [detail],
  );

  const totalTokens = useMemo(
    () => steps.reduce((sum, s) => sum + (s.total_tokens || 0), 0),
    [steps],
  );

  const totalDurationMs = useMemo(
    () => steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0),
    [steps],
  );

  function handleCopyPayload() {
    if (!detail) return;
    const payload = JSON.stringify(
      {
        id: detail.id,
        session_id: detail.chat_session_id,
        workflow_id: detail.workflow_id,
        workflow_name: detail.workflow_name,
        contact_id: detail.contact_public_id,
        contact_name: detail.contact_name,
        input: detail.input,
        output: detail.output,
        steps: detail.steps,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  }

  if (loading && !detail) {
    return (
      <section className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-72 flex-col items-center justify-center gap-3">
          <LoaderCircle className="size-6 animate-spin text-primary" />
          <p className="text-xs text-zinc-500">Memuat detail eksekusi sesi...</p>
        </div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-white/10 bg-[#0e0f12] p-8 text-center text-sm text-zinc-400">
          <p>{error || t("execution.detailUnavailable")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="mt-4 gap-1.5 border-white/10"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Aktivitas</span>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="w-full space-y-4">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d0e11] px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="size-3" />
              <span>Aktivitas</span>
            </button>
            <span className="text-zinc-600">/</span>
            <button
              type="button"
              onClick={() => onNavigate("workflows")}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {detail.workflow_name || `Workflow #${detail.workflow_id}`}
            </button>
            <span className="text-zinc-600">/</span>
            <span className="font-mono text-zinc-200">
              Sesi #{detail.chat_session_id ?? detail.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ExecutionStatusBadge status={detail.status} />
            <button
              type="button"
              onClick={handleCopyPayload}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0d0e11] px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
              title="Salin JSON payload eksekusi"
            >
              {copiedPayload ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>Salin Payload</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Header Summary Card */}
        <div className="rounded-xl border border-white/10 bg-[#0e0f12] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                <GitFork className="size-5 rotate-90" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-zinc-100">
                  {detail.workflow_name || `Workflow #${detail.workflow_id}`}
                </h1>
                <p className="text-xs text-zinc-400">
                  Kontak:{" "}
                  <span className="font-medium text-zinc-200">
                    {detail.contact_name || "Pelanggan Baru"}
                  </span>
                  {detail.contact_public_id && (
                    <span className="font-mono text-zinc-500">
                      {" "}
                      ({detail.contact_public_id})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Micro Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-zinc-500" />
                <span>{formatDate(detail.started_at, locale)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-zinc-500" />
                <span>{steps.length} langkah</span>
                {totalDurationMs > 0 && (
                  <span className="text-zinc-500 font-mono">
                    ({totalDurationMs} ms)
                  </span>
                )}
              </div>
              {totalTokens > 0 && (
                <div className="flex items-center gap-1.5 font-mono">
                  <Coins className="size-3.5 text-zinc-500" />
                  <span>{totalTokens.toLocaleString()} token</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Execution Error Banner */}
        {errorStep && diagnostic && (
          <ErrorSummaryCard
            errorStep={errorStep}
            diagnostic={diagnostic}
            t={t}
          />
        )}

        {/* 2-Panel Main Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Panel 1: Chat Transcript */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0e0f12] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-zinc-200">
                  {t("activity.detail.chatTranscript")}
                </h2>
              </div>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
                {allMessages.length} pesan terkirim
              </span>
            </div>

            <div className="flex-1 min-h-[380px] max-h-[560px] overflow-y-auto p-4 space-y-3">
              {allMessages.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500">
                    <MessageSquare className="size-5" />
                  </div>
                  <p className="text-xs text-zinc-400">
                    Tidak ada respon percakapan yang dihasilkan pada sesi ini.
                  </p>
                </div>
              ) : (
                allMessages.map(({ step, message }, idx) => (
                  <div key={`${step.id}-${idx}`} className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 font-medium text-zinc-400">
                        <Sparkles className="size-3 text-primary" />
                        {stepNodeLabel(step, t)}
                      </span>
                      <span>·</span>
                      <span className="font-mono">Langkah #{step.step}</span>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/[0.07] p-3 text-xs leading-relaxed text-zinc-100 max-w-[90%] whitespace-pre-wrap">
                      {message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 2: Execution Step Timeline */}
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0e0f12] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h2 className="text-xs font-semibold text-zinc-200">
                  {t("activity.detail.activityLog")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedStep(null)}
                  className="rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
                >
                  Tutup Semua
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[380px] max-h-[560px] overflow-y-auto p-4 space-y-2.5">
              {steps.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                  <p className="text-xs text-zinc-400">
                    {t("execution.noMatchingSteps")}
                  </p>
                </div>
              ) : (
                steps.map((step) => {
                  const stepDiagnostic =
                    step.status === "error" && diagnostic ? diagnostic : null;

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
                })
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Payload Section */}
        <div className="rounded-xl border border-white/10 bg-[#0e0f12] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRawPayload(!showRawPayload)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-zinc-300 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="size-3.5 text-zinc-500" />
              <span>Data Input & Final Output (Raw Payload)</span>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-zinc-500 transition-transform duration-200",
                showRawPayload && "rotate-180",
              )}
            />
          </button>

          {showRawPayload && (
            <div className="grid gap-4 border-t border-white/10 p-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-2">
                  Input Payload:
                </p>
                <pre className="max-h-60 overflow-auto rounded-lg border border-white/10 bg-[#08090b] p-3 text-[11px] font-mono text-zinc-300">
                  {JSON.stringify(detail.input, null, 2)}
                </pre>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-400 mb-2">
                  Final Output:
                </p>
                <pre className="max-h-60 overflow-auto rounded-lg border border-white/10 bg-[#08090b] p-3 text-[11px] font-mono text-zinc-300">
                  {JSON.stringify(detail.output ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
