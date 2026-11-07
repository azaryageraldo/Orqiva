import { Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AutomationNodeData } from "../types";
import { labelClass } from "./styles";

export interface ConditionInspectorProps {
  inspectorData: AutomationNodeData | null;
  updateNode: (updates: Partial<AutomationNodeData>) => void;
  booleanVariables: Array<{ token: string; description: string }>;
}

export default function ConditionInspector({
  inspectorData,
  updateNode,
  booleanVariables,
}: ConditionInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("editor.condition")}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("editor.conditionHint")}
        </p>
      </div>

      {booleanVariables.length === 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5 text-xs leading-5 text-amber-200">
          {t("editor.noBoolean")}
        </div>
      ) : (
        <div className="block">
          <span className={labelClass}>{t("editor.booleanSmartValue")}</span>

          {String(inspectorData?.conditionVariable ?? "").trim() && (
            <div className="mt-2.5 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
              <code className="font-mono text-sm text-primary">
                {`{{${String(inspectorData?.conditionVariable)}}}`}
              </code>
            </div>
          )}

          <div className="mt-2.5 space-y-2">
            {booleanVariables.map((variable) => {
              const selected =
                String(inspectorData?.conditionVariable ?? "") ===
                variable.token;

              return (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() =>
                    updateNode({ conditionVariable: variable.token })
                  }
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-primary/35 bg-primary/[0.08]"
                      : "border-border bg-background hover:border-primary/25 hover:bg-primary/[0.04]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <code className="block truncate font-mono text-xs text-primary">
                      {`{{${variable.token}}}`}
                    </code>
                    <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">
                      {variable.description}
                    </span>
                  </span>
                  {selected && (
                    <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <span className="mt-2 block text-xs leading-5 text-muted-foreground">
            {t("editor.conditionVariableHint")}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
          <Check size={15} className="text-emerald-300" />
          <div>
            <p className="text-sm font-medium text-emerald-300">
              {t("editor.ifMatch")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("editor.ifMatchHint")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.05] p-3">
          <X size={15} className="text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {t("editor.else")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("editor.elseHint")}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {t("editor.conditionPorts")}
      </p>
    </div>
  );
}

