import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Copy,
  GitFork,
  History,
  Layers,
  LoaderCircle,
  MessageSquare,
  Sparkles,
  User,
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
  const [showHistory, setShowHistory] = useState(false);

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

  const customerInputText = useMemo(() => {
    if (!detail?.input) return null;
    const input = detail.input;
    if (typeof input.customer_message === "string" && input.customer_message.trim()) {
      return input.customer_message.trim();
    }
    if (typeof input.message === "string" && input.message.trim()) {
      return input.message.trim();
    }
    if (typeof input.text === "string" && input.text.trim()) {
      return input.text.trim();
    }
    return null;
  }, [detail]);

  const conversationHistory = useMemo(() => {
    if (!detail?.input?.conversation_history || !Array.isArray(detail.input.conversation_history)) {
      return [];
    }
    return detail.input.conversation_history.filter(
      (item): item is { role: string; content: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { content?: unknown }).content === "string",
    );
  }, [detail]);

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
              <div className="flex items-center gap-2">
                {conversationHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <History className="size-3 text-zinc-400" />
                    <span>
                      {showHistory
                        ? "Sembunyikan Riwayat"
                        : `Riwayat (${conversationHistory.length})`}
                    </span>
                  </button>
                )}
                <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
                  {(customerInputText ? 1 : 0) + allMessages.length} pesan
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-[380px] max-h-[560px] overflow-y-auto p-4 space-y-3.5">
              {/* Riwayat percakapan sebelumnya jika dibuka */}
              {showHistory && conversationHistory.length > 0 && (
                <div className="space-y-3 pb-2 border-b border-white/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Riwayat Sesi Sebelumnya ({conversationHistory.length})
                  </p>
                  {conversationHistory.map((item, index) => {
                    const isCustomer = item.role === "customer";
                    const isAdmin = item.role === "admin";
                    const isSystem = item.role === "system";

                    if (isSystem) {
                      return (
                        <div
                          key={`hist-${index}`}
                          className="flex justify-center my-1"
                        >
                          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-zinc-500 italic">
                            {item.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`hist-${index}`}
                        className={cn(
                          "flex flex-col space-y-1",
                          isCustomer ? "items-end" : "items-start"
                        )}
                      >
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          {isCustomer ? (
                            <span>{detail.contact_name || "Pelanggan"}</span>
                          ) : isAdmin ? (
                            <span className="text-amber-400 font-medium">Admin</span>
                          ) : (
                            <span>AI Assistant</span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-xl p-2.5 text-xs max-w-[85%] whitespace-pre-wrap",
                            isCustomer
                              ? "bg-white/5 text-zinc-300 border border-white/5"
                              : "bg-primary/[0.04] text-zinc-300 border border-primary/10"
                          )}
                        >
                          {item.content}
                        </div>
                      </div>
                    );
                  })}
                  <div className="my-3 flex items-center gap-2 text-[10px] text-zinc-500 font-medium tracking-wider uppercase">
                    <div className="h-px flex-1 bg-white/10" />
                    <span>Eksekusi Ini Dimulai</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </div>
              )}

              {!customerInputText && allMessages.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-500">
                    <MessageSquare className="size-5" />
                  </div>
                  <p className="text-xs text-zinc-400">
                    Tidak ada respon percakapan yang dihasilkan pada sesi ini.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pesan Masuk dari Manusia / Pelanggan (Pemicu Turn Ini) */}
                  {customerInputText && (
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span className="font-medium text-zinc-200">
                          {detail.contact_name || "Pelanggan"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-medium text-zinc-300">
                          <User className="size-2.5 text-zinc-400" />
                          Pesan Masuk (Pemicu)
                        </span>
                      </div>
                      <div className="rounded-2xl rounded-tr-sm border border-white/15 bg-white/10 p-3 text-xs leading-relaxed text-zinc-100 max-w-[85%] whitespace-pre-wrap shadow-sm">
                        {customerInputText}
                      </div>
                    </div>
                  )}

                  {/* Pesan Balasan dari Workflow / AI */}
                  {allMessages.map(({ step, message }, idx) => (
                    <div
                      key={`${step.id}-${idx}`}
                      className="flex flex-col items-start space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Sparkles className="size-3" />
                          {stepNodeLabel(step, t)}
                        </span>
                        <span>·</span>
                        <span className="font-mono text-zinc-400">
                          Langkah #{step.step}
                        </span>
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-primary/20 bg-primary/[0.08] p-3 text-xs leading-relaxed text-zinc-100 max-w-[85%] whitespace-pre-wrap">
                        {message}
                      </div>
                    </div>
                  ))}
                </>
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
