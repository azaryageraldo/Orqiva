import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Coins,
  Layers,
  Timer,
} from "lucide-react";

import { useI18n, formatLocale } from "@/lib/i18n";
import NodeErrorDetail from "./NodeErrorDetail";

interface StepNodeCardProps {
  step: ExecutionStep;
  diagnostic: ExecutionDiagnostic | null;
  isExpanded: boolean;
  onExpand: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface ExecutionDiagnostic {
  title: string;
  reason: string;
  fix: string;
  example?: string;
  node_id?: string | null;
  node_name?: string | null;
  node_type?: string | null;
}

interface ExecutionStep {
  id: number;
  step: number;
  node_id: string;
  node_type: string;
  node_name: string | null;
  status: "success" | "error";
  error: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  variables: Record<string, unknown> | null;
  branch: string | null;
  messages: string[] | null;
  duration_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  executed_at: string | null;
}

export default function StepNodeCard({
  step,
  diagnostic,
  isExpanded,
  onExpand,
  t,
}: StepNodeCardProps) {
  const { language } = useI18n();
  const locale = formatLocale(language);
  const isError = step.status === "error";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center justify-between px-4 py-3 bg-background/30 border-b border-border/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20">
            <NODE_TYPE_ICON nodeType={step.node_type} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {stepNodeLabel(step, t)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {step.node_id ?? t("execution.stepFallback")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{formatTime(step.executed_at, locale)}</span>
          <span className="hidden sm:inline">→</span>
          <span className="font-mono">{formatDuration(step.duration_ms, t)}</span>
          {isError && (
            <span className="flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
              <CircleAlert className="size-3.5" />
              {t("execution.error")}
            </span>
          )}
        </div>

        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-border/50 bg-background/20">
          {step.status === "error" && diagnostic && (
            <NodeErrorDetail step={step} diagnostic={diagnostic} t={t} />
          )}

          {step.messages && step.messages.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("execution.sentMessages")}
              </p>
              {step.messages.map((message, idx) => (
                <p
                  key={idx}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-foreground"
                >
                  {message}
                </p>
              ))}
            </div>
          )}

          {step.variables &&
            Object.entries(step.variables).length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {t("execution.variables")}
                </p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(step.variables).map(([name, value]) => (
                    <div
                      key={name}
                      className="rounded-lg border border-border bg-background px-3 py-2"
                    >
                      <dt className="text-[10px] font-medium text-muted-foreground">
                        {name}
                      </dt>
                      <dd className="mt-0.5 text-[10px] leading-5 whitespace-pre-wrap text-foreground">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

          <div className="mt-4 space-y-2">
            {step.input && (
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground select-none hover:text-foreground">
                  {t("execution.stepInput")}
                </summary>
                <div className="mt-2">
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 px-2.5 py-2 text-xs text-foreground">
                    {JSON.stringify(step.input, null, 2)}
                  </pre>
                </div>
              </details>
            )}
            {step.output && (
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground select-none hover:text-foreground">
                  {t("execution.stepOutput")}
                </summary>
                <div className="mt-2">
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 px-2.5 py-2 text-xs text-foreground">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
    const NODE_TYPE_LABELS: Record<string, string> = {
      trigger: "execution.node.trigger",
      ai_agent: "execution.node.aiAgent",
      output: "execution.node.output",
      if_else: "execution.node.condition",
      relocate: "execution.node.relocate",
      go_to: "execution.node.goTo",
      stopper: "execution.node.stopper",
    };
    const key = NODE_TYPE_LABELS[step.node_type];
    return key ? t(key) : step.node_type;
  }

  return name;
}

function NODE_TYPE_ICON({ nodeType }: { nodeType: string }) {
  switch (nodeType) {
    case "trigger":
      return <Layers className="size-4" />;
    case "ai_agent":
      return <Coins className="size-4" />;
    case "output":
      return <Timer className="size-4" />;
    case "if_else":
      return <Clock className="size-4" />;
    case "relocate":
      return <ArrowLeft className="size-4" />;
    case "go_to":
      return <ArrowLeft className="size-4" />;
    case "stopper":
      return <CircleAlert className="size-4" />;
    default:
      return <Layers className="size-4" />;
  }
}

function formatTime(value: string | null, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDuration(ms: number, t: (key: string) => string): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)}${t("execution.secondsShort")}`;
}
