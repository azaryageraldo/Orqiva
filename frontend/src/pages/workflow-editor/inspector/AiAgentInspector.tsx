import type { RefObject } from "react";
import { Plus, Trash2, Variable } from "lucide-react";
import { Sparkle } from "@phosphor-icons/react";

import { useI18n } from "@/lib/i18n";
import type { AiModelOption } from "@/services/aiSettings";
import type {
  AgentVerbosity,
  AutomationNodeData,
  OutputVariable,
  VariableType,
} from "../types";
import SmartValueTextarea from "../SmartValueTextarea";
import {
  compactInputClass,
  inputClass,
  labelClass,
  panelClass,
} from "./styles";

export interface AiAgentInspectorProps {
  inspectorData: AutomationNodeData | null;
  updateNode: (updates: Partial<AutomationNodeData>) => void;
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
}

export default function AiAgentInspector({
  inspectorData,
  updateNode,
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
}: AiAgentInspectorProps) {
  const { language, t } = useI18n();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t("editor.aiSettings")}
        </p>
        <div className="mt-4 grid grid-cols-3 rounded-lg border border-border bg-muted/40 p-1">
          {(
            [
              ["node", t("editor.tabNode")],
              ["prompt", t("editor.tabPrompt")],
              ["variables", t("editor.tabVariables")],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAgentTab(tab)}
              className={`rounded-md px-2 py-2 text-xs font-medium transition ${
                agentTab === tab
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Prompt */}
      {agentTab === "prompt" && (
        <div className="space-y-4">
          <div className={`${panelClass} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkle
                    size={16}
                    weight="duotone"
                    className="text-violet-300"
                  />
                  {t("editor.systemPrompt")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("editor.systemPromptHint")}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                {t("editor.characters", {
                  count: String(
                    inspectorData?.systemMessage ?? "",
                  ).length.toLocaleString(language === "en" ? "en-US" : "id-ID"),
                })}
              </span>
            </div>

            <div className="mt-3">
              <SmartValueTextarea
                textareaRef={promptRef}
                rows={12}
                value={String(inspectorData?.systemMessage ?? "")}
                onChange={(value) =>
                  updateNode({ systemMessage: value })
                }
                variables={promptVariables}
                showVariables={false}
                placeholder={t("editor.systemPromptPlaceholder")}
              />
            </div>
          </div>

          <div className={`${panelClass} p-3.5`}>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {t("editor.insertDynamic")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {promptVariables.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertPromptToken(variable.token)}
                  title={variable.description}
                  className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-[11px] text-primary transition hover:border-primary/40 hover:bg-primary/15"
                >
                  {`{{${variable.token}}}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {t("editor.clickToken")}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-xs leading-5 text-muted-foreground">
            <Sparkle
              size={14}
              weight="duotone"
              className="mt-0.5 shrink-0 text-primary"
            />
            <p>{t("editor.promptTip")}</p>
          </div>
        </div>
      )}

      {/* Tab: Variables */}
      {agentTab === "variables" && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Variable size={15} className="text-primary" />
                {t("editor.outputVariables")}
                <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {(inspectorData?.outputVariables ?? []).length}
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("editor.outputVariablesHint")}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
              onClick={addOutputVariable}
            >
              <Plus size={13} />
              {t("editor.add")}
            </button>
          </div>

          {(inspectorData?.outputVariables ?? []).map((variable, index) => {
            const name = variable.name.trim();
            const itemField = variable.itemField?.trim() || "replies";
            const preview =
              variable.type === "array"
                ? `${name || "respond"}.${itemField}`
                : name || "respond";

            return (
              <div
                key={`output-variable-${index}`}
                className={`${panelClass} overflow-hidden`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <code
                      className="truncate font-mono text-[11px] text-primary"
                      title={`{{${preview}}}`}
                    >
                      {`{{${preview}}}`}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOutputVariable(index)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("editor.deleteVariableNamed", {
                      name: name || `#${index + 1}`,
                    })}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="space-y-3 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        {t("editor.variableName")}
                      </span>
                      <input
                        className={`${compactInputClass} mt-1`}
                        value={variable.name}
                        onChange={(event) =>
                          updateOutputVariable(index, {
                            name: event.target.value,
                          })
                        }
                        placeholder="mis. reply"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        {t("editor.type")}
                      </span>
                      <select
                        className={`${compactInputClass} mt-1`}
                        value={variable.type}
                        onChange={(event) =>
                          updateOutputVariable(index, {
                            type: event.target.value as VariableType,
                          })
                        }
                      >
                        <option value="string">{t("editor.typeString")}</option>
                        <option value="array">{t("editor.typeArray")}</option>
                        <option value="boolean">
                          {t("editor.typeBoolean")}
                        </option>
                        <option value="number">{t("editor.typeNumber")}</option>
                      </select>
                    </label>
                  </div>

                  {variable.type === "array" && (
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        {t("editor.itemProperty")}
                      </span>
                      <input
                        className={`${compactInputClass} mt-1`}
                        value={variable.itemField ?? ""}
                        onChange={(event) =>
                          updateOutputVariable(index, {
                            itemField: event.target.value,
                          })
                        }
                        placeholder="mis. text (opsional)"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="text-xs text-muted-foreground">
                      Description{" "}
                      <span className="text-muted-foreground/60">
                        (dipakai AI)
                      </span>
                    </span>
                    <input
                      className={`${compactInputClass} mt-1`}
                      value={variable.description}
                      onChange={(event) =>
                        updateOutputVariable(index, {
                          description: event.target.value,
                        })
                      }
                      placeholder={t("editor.variableDescriptionPlaceholder")}
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {(inspectorData?.outputVariables ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
              <Variable size={20} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">
                {t("editor.noVariables")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("editor.noVariablesHint")}
              </p>
              <button
                type="button"
                onClick={addOutputVariable}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/60"
              >
                <Plus size={13} />
                {t("editor.addVariable")}
              </button>
            </div>
          )}

          <p className="text-[11px] leading-5 text-muted-foreground">
            {t("editor.listHint")}
          </p>
        </div>
      )}

      {/* Tab: Node Settings */}
      {agentTab === "node" && (
        <div className="space-y-5">
          <label className="block">
            <span className={labelClass}>{t("editor.nodeName")}</span>
            <input
              className={inputClass}
              value={String(inspectorData?.nodeName ?? "")}
              onChange={(event) =>
                updateNode({ nodeName: event.target.value })
              }
              placeholder={t("editor.nodeNameExample")}
            />
          </label>

          <div className={`${panelClass} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("editor.aiModel")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("editor.aiModelHint")}
                </p>
              </div>
              <span className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 text-xs font-medium text-primary">
                {availableAiModels.find(
                  (model) =>
                    model.id === String(inspectorData?.model ?? "") &&
                    model.provider ===
                      String(inspectorData?.provider ?? "gemini"),
                )?.provider_label ?? "Gemini"}
              </span>
            </div>
            <select
              className={inputClass}
              value={`${String(inspectorData?.provider ?? "gemini")}::${String(
                inspectorData?.model ?? defaultAiModel.id,
              )}`}
              onChange={(event) => {
                const [provider, model] = event.target.value.split("::");
                updateNode({ provider, model });
              }}
            >
              {availableAiModels.map((model) => (
                <option
                  key={`${model.provider}:${model.id}`}
                  value={`${model.provider}::${model.id}`}
                >
                  {model.provider_label} · {model.id}
                </option>
              ))}
              {!availableAiModels.some(
                (model) =>
                  model.id === String(inspectorData?.model ?? "") &&
                  model.provider ===
                    String(inspectorData?.provider ?? "gemini"),
              ) &&
                inspectorData?.model && (
                  <option
                    value={`${String(
                      inspectorData?.provider ?? "gemini",
                    )}::${String(inspectorData.model)}`}
                  >
                    {String(inspectorData?.provider ?? "gemini")} ·{" "}
                    {String(inspectorData.model)}
                  </option>
                )}
            </select>
            {aiModels.length === 0 && (
              <p className="mt-2 text-xs leading-5 text-amber-300/90">
                {t("editor.noApiKey")}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>{t("editor.verbosity")}</span>
              <select
                className={inputClass}
                value={String(inspectorData?.verbosity ?? "concise")}
                onChange={(event) =>
                  updateNode({
                    verbosity: event.target.value as AgentVerbosity,
                  })
                }
              >
                <option value="concise">
                  {t("editor.verbosityConcise")}
                </option>
                <option value="balanced">
                  {t("editor.verbosityBalanced")}
                </option>
                <option value="detailed">
                  {t("editor.verbosityDetailed")}
                </option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {t("editor.verbosityHint")}
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>{t("editor.contextMemory")}</span>
              <select
                className={inputClass}
                value={String(inspectorData?.contextMessages ?? 10)}
                onChange={(event) =>
                  updateNode({
                    contextMessages: Number(event.target.value),
                  })
                }
              >
                <option value="0">{t("editor.contextNone")}</option>
                <option value="4">
                  {t("editor.contextMessages", { count: 4 })}
                </option>
                <option value="8">
                  {t("editor.contextMessages", { count: 8 })}
                </option>
                <option value="12">
                  {t("editor.contextMessages", { count: 12 })}
                </option>
                <option value="20">
                  {t("editor.contextMessages", { count: 20 })}
                </option>
              </select>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {t("editor.contextHint")}
              </span>
            </label>
          </div>

          <label className="block">
            <span className={labelClass}>
              {t("editor.temperature", {
                value: Number(
                  inspectorData?.temperature ?? 0.7,
                ).toFixed(1),
              })}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              className="mt-3 w-full accent-primary"
              value={Number(inspectorData?.temperature ?? 0.7)}
              onChange={(event) =>
                updateNode({
                  temperature: Number(event.target.value),
                })
              }
            />
            <span className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{t("editor.moreFocused")}</span>
              <span>{t("editor.moreCreative")}</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
