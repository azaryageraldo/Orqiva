import { useI18n } from "@/lib/i18n";
import type { AutomationNodeData } from "../types";
import SmartValueTextarea from "../SmartValueTextarea";
import { labelClass, panelClass } from "./styles";

export interface SendMessageInspectorProps {
  inspectorData: AutomationNodeData | null;
  updateNode: (updates: Partial<AutomationNodeData>) => void;
  upstreamVariables: Array<{ token: string; description: string; type: string }>;
  arrayBubbleVariable: boolean;
}

export default function SendMessageInspector({
  inspectorData,
  updateNode,
  upstreamVariables,
  arrayBubbleVariable,
}: SendMessageInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("editor.messageConfig")}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("editor.messageConfigHint")}
        </p>
      </div>

      <label className="block">
        <span className={labelClass}>{t("editor.message")}</span>
        <SmartValueTextarea
          rows={6}
          value={String(inspectorData?.messageTemplate ?? "")}
          onChange={(value) =>
            updateNode({
              messageTemplate: value,
              messageMode: "smart_value",
            })
          }
          variables={upstreamVariables}
          placeholder={t("editor.messagePlaceholder")}
        />
      </label>

      <div className={`${panelClass} p-3.5`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {String(inspectorData?.messageTemplate ?? "").trim() ? (
            String(inspectorData?.messageTemplate ?? "")
              .split(/(\{\{\s*[\w.-]+\s*\}\})/g)
              .map((part, index) =>
                /^\{\{\s*[\w.-]+\s*\}\}$/.test(part) ? (
                  <span
                    key={index}
                    className="rounded bg-primary/10 px-0.5 text-primary"
                  >
                    {part}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                ),
              )
          ) : (
            t("editor.previewEmpty")
          )}
        </p>
      </div>

      {arrayBubbleVariable && (
        <p className="text-xs leading-5 text-primary">
          {t("editor.listDetected")}
        </p>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        {t("editor.blueTokens")}
      </p>
    </div>
  );
}

