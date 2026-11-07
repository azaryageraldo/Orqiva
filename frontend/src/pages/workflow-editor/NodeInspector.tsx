import type { RefObject } from "react";
import { Check, Settings2, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { AiModelOption } from "@/services/aiSettings";
import type { WorkflowOption, WorkflowOptionNode } from "@/services/channel";
import type { AutomationNodeData, OutputVariable } from "./types";
import { buttonClass, inputClass, labelClass } from "./inspector/styles";
import TriggerInspector from "./inspector/TriggerInspector";
import AiAgentInspector from "./inspector/AiAgentInspector";
import SendMessageInspector from "./inspector/SendMessageInspector";
import ConditionInspector from "./inspector/ConditionInspector";
import GoToInspector from "./inspector/GoToInspector";
import RelocateInspector from "./inspector/RelocateInspector";
import StopperInspector from "./inspector/StopperInspector";

export interface NodeInspectorProps {
  inspectorData: AutomationNodeData | null;
  updateNode: (updates: Partial<AutomationNodeData>) => void;
  saveNodeChanges: () => void;
  cancelNodeChanges: () => void;
  agentTab: "node" | "prompt" | "variables";
  setAgentTab: (tab: "node" | "prompt" | "variables") => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  promptVariables: Array<{ token: string; description: string }>;
  insertPromptToken: (token: string) => void;
  availableAiModels: AiModelOption[];
  defaultAiModel: AiModelOption;
  aiModels: AiModelOption[];
  addOutputVariable: () => void;
  updateOutputVariable: (
    index: number,
    updates: Partial<OutputVariable>,
  ) => void;
  deleteOutputVariable: (index: number) => void;
  upstreamVariables: Array<{ token: string; description: string; type: string }>;
  arrayBubbleVariable: boolean;
  booleanVariables: Array<{ token: string; description: string }>;
  goToWorkflowOptions: WorkflowOption[];
  currentWorkflowId: number | null;
  selectedNodeId: string | null;
  selectedGoToWorkflowId: number | null;
  goToTargetNodes: WorkflowOptionNode[];
}

export default function NodeInspector({
  inspectorData,
  updateNode,
  saveNodeChanges,
  cancelNodeChanges,
  agentTab,
  setAgentTab,
  promptRef,
  promptVariables,
  insertPromptToken,
  availableAiModels,
  defaultAiModel,
  aiModels,
  addOutputVariable,
  updateOutputVariable,
  deleteOutputVariable,
  upstreamVariables,
  arrayBubbleVariable,
  booleanVariables,
  goToWorkflowOptions,
  currentWorkflowId,
  selectedNodeId,
  selectedGoToWorkflowId,
  goToTargetNodes,
}: NodeInspectorProps) {
  const { t } = useI18n();

  return (
    <aside className="flex h-full max-h-full w-[min(460px,92vw)] max-w-[92vw] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings2 size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("editor.nodeSettings")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {inspectorData?.label}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={saveNodeChanges}
          aria-label={t("editor.closeNodeSettings")}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-6">
        {inspectorData?.label !== "AI Agent" && (
          <>
            <label className="block">
              <span className={labelClass}>{t("editor.nodeName")}</span>
              <input
                className={inputClass}
                value={String(
                  inspectorData?.nodeName ?? inspectorData?.label ?? "",
                )}
                onChange={(event) =>
                  updateNode({ nodeName: event.target.value })
                }
                placeholder={t("editor.giveName")}
                aria-label={t("editor.nodeName")}
              />
            </label>
            <label className="block">
              <span className={labelClass}>{t("editor.description")}</span>
              <textarea
                rows={2}
                maxLength={500}
                className={inputClass}
                value={String(inspectorData?.description ?? "")}
                onChange={(event) =>
                  updateNode({ description: event.target.value })
                }
              />
            </label>
          </>
        )}

        {/* Node-specific Inspector */}
        {inspectorData?.label === "Trigger" && <TriggerInspector />}

        {inspectorData?.label === "AI Agent" && (
          <AiAgentInspector
            inspectorData={inspectorData}
            updateNode={updateNode}
            agentTab={agentTab}
            setAgentTab={setAgentTab}
            promptRef={promptRef}
            promptVariables={promptVariables}
            insertPromptToken={insertPromptToken}
            availableAiModels={availableAiModels}
            defaultAiModel={defaultAiModel}
            aiModels={aiModels}
            addOutputVariable={addOutputVariable}
            updateOutputVariable={updateOutputVariable}
            deleteOutputVariable={deleteOutputVariable}
          />
        )}

        {inspectorData?.label === "Send Message" && (
          <SendMessageInspector
            inspectorData={inspectorData}
            updateNode={updateNode}
            upstreamVariables={upstreamVariables}
            arrayBubbleVariable={arrayBubbleVariable}
          />
        )}

        {inspectorData?.label === "Condition" && (
          <ConditionInspector
            inspectorData={inspectorData}
            updateNode={updateNode}
            booleanVariables={booleanVariables}
          />
        )}

        {inspectorData?.label === "Go To" && (
          <GoToInspector
            inspectorData={inspectorData}
            updateNode={updateNode}
            goToWorkflowOptions={goToWorkflowOptions}
            currentWorkflowId={currentWorkflowId}
            selectedNodeId={selectedNodeId}
            selectedGoToWorkflowId={selectedGoToWorkflowId}
            goToTargetNodes={goToTargetNodes}
          />
        )}

        {inspectorData?.label === "Relocate" && <RelocateInspector />}

        {inspectorData?.label === "Stopper" && <StopperInspector />}

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border bg-card pt-4 pb-1">
          <button
            type="button"
            onClick={cancelNodeChanges}
            className={`${buttonClass} border border-border bg-muted/50 text-muted-foreground hover:bg-muted`}
          >
            <X size={14} /> {t("editor.cancel")}
          </button>
          <button
            type="button"
            onClick={saveNodeChanges}
            className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}
          >
            <Check size={14} /> {t("editor.saveChanges")}
          </button>
        </div>
      </div>
    </aside>
  );
}
