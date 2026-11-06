import { CircleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface NodeErrorDetailProps {
  step: ExecutionStep;
  diagnostic: ExecutionDiagnostic;
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

export default function NodeErrorDetail({
  step,
  diagnostic,
  t,
}: NodeErrorDetailProps) {
  const { language } = useI18n();

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <CircleAlert className="size-5 text-destructive shrink-0" />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold text-destructive uppercase">
                {t("execution.nodeErrorTitle")}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
              >
                {step.node_name || step.node_id || "Step"}
              </span>
            </div>
            <p className="mb-1 text-sm font-medium text-destructive">
              {diagnostic.title}
            </p>
            <p className="mb-3 text-sm text-destructive/80 leading-relaxed">
              {diagnostic.reason}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-destructive/60 uppercase mb-1">
              {t("execution.fixTitle")}
            </p>
            <p className="text-sm text-destructive/90 leading-relaxed">
              {diagnostic.fix}
            </p>
            {diagnostic.example && (
              <div className="mt-2">
                <pre className="max-h-48 overflow-auto rounded-md bg-destructive/20 p-2.5 text-xs text-destructive/70">
                  {diagnostic.example}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-destructive/60 uppercase mb-1">
              Detail Error
            </p>
            <p className="text-sm text-destructive/90 leading-relaxed whitespace-pre-wrap">
              {step.error}
            </p>
            {step.executed_at && (
              <p className="mt-2 text-[10px] text-destructive/50">
                {new Date(step.executed_at).toLocaleString(
                  language === "en" ? "en-US" : "id-ID",
                  { dateStyle: "medium", timeStyle: "short" },
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
