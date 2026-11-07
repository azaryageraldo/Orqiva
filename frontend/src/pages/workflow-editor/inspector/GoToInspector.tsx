import { useI18n } from "@/lib/i18n";
import type { WorkflowOption, WorkflowOptionNode } from "@/services/channel";
import type { AutomationNodeData } from "../types";
import { inputClass, labelClass } from "./styles";

export interface GoToInspectorProps {
  inspectorData: AutomationNodeData | null;
  updateNode: (updates: Partial<AutomationNodeData>) => void;
  goToWorkflowOptions: WorkflowOption[];
  currentWorkflowId: number | null;
  selectedNodeId: string | null;
  selectedGoToWorkflowId: number | null;
  goToTargetNodes: WorkflowOptionNode[];
}

export default function GoToInspector({
  inspectorData,
  updateNode,
  goToWorkflowOptions,
  currentWorkflowId,
  selectedNodeId,
  selectedGoToWorkflowId,
  goToTargetNodes,
}: GoToInspectorProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("editor.goTo")}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {t("editor.goToHint")}
        </p>
      </div>

      <label className="block">
        <span className={labelClass}>{t("editor.targetWorkflow")}</span>
        <select
          className={inputClass}
          value={String(
            inspectorData?.targetWorkflowId || (currentWorkflowId ?? ""),
          )}
          onChange={(event) => {
            const value = event.target.value;
            updateNode({
              targetWorkflowId:
                value === String(currentWorkflowId) ? "" : value,
              targetNodeId: "",
            });
          }}
        >
          {goToWorkflowOptions.map((option) => (
            <option key={option.id} value={String(option.id)}>
              {option.id === currentWorkflowId
                ? t("editor.currentWorkflowSuffix", { name: option.name })
                : option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>{t("editor.targetNode")}</span>
        <select
          className={inputClass}
          value={String(inspectorData?.targetNodeId ?? "")}
          onChange={(event) =>
            updateNode({ targetNodeId: event.target.value })
          }
        >
          <option value="">{t("editor.chooseTargetNode")}</option>
          {goToTargetNodes
            .filter((node) =>
              selectedGoToWorkflowId === currentWorkflowId
                ? node.id !== selectedNodeId
                : true,
            )
            .map((node) => (
              <option key={node.id} value={node.id}>
                {node.name || node.id}
                {node.type ? ` · ${node.type}` : ""}
              </option>
            ))}
        </select>
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={Boolean(inspectorData?.endFlow)}
          onChange={(event) =>
            updateNode({ endFlow: event.target.checked })
          }
        />
        <span>
          <span className="block text-sm font-medium text-foreground">
            {t("editor.endFlow")}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {t("editor.endFlowHint")}
          </span>
        </span>
      </label>

      <p className="text-xs leading-5 text-muted-foreground">
        {t("editor.goToWorkflowNote")}
      </p>
    </div>
  );
}
