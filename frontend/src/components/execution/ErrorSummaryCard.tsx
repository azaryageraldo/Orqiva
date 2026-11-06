import { CircleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";

interface ErrorSummaryCardProps {
  errorStep: ExecutionStep;
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
  executed_at: string | null;
}

export default function ErrorSummaryCard({
  errorStep,
  diagnostic,
  t,
}: ErrorSummaryCardProps) {

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-3 p-4">
        <CircleAlert className="size-6 text-destructive shrink-0 mt-0.5" />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-destructive uppercase">
              {t("execution.errorSummaryTitle")}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive"
            >
              {errorStep.step}
            </span>
          </div>

          <p className="mb-1 text-sm font-medium text-destructive">
            {stepNodeLabel(errorStep, t)}
          </p>
          <p className="mb-2 text-sm text-destructive/80 leading-relaxed">
            {diagnostic.reason}
          </p>

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
        </div>
      </div>
    </Card>
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
