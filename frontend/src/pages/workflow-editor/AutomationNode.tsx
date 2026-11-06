import { useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";

import { useI18n } from "@/lib/i18n";

import { EditorActionsContext, NodeActionsContext } from "./contexts";
import { NODE_STYLES } from "./nodeMeta";
import type { AutomationNodeData, FlowNode } from "./types";

const APPENDABLE: AutomationNodeData["label"][] = [
  "Trigger",
  "AI Agent",
  "Send Message",
];

function previewFor(data: AutomationNodeData, t: (key: string) => string) {
  if (data.label === "Condition") {
    const variable = data.conditionVariable?.trim();

    return {
      text: variable ? `{{${variable}}}` : t("editor.chooseVariable"),
      mono: true,
      muted: !variable,
    };
  }

  if (data.label === "Send Message") {
    const template = data.messageTemplate?.trim();

    return {
      text: template || data.description,
      mono: Boolean(template),
      muted: !template,
    };
  }

  if (data.label === "AI Agent") {
    return {
      text: data.model || data.description,
      mono: Boolean(data.model),
      muted: !data.model,
    };
  }

  return { text: data.description, mono: false, muted: true };
}

/**
 * Boxy workflow step. Visual language is shared across every node type; the
 * colour accent only changes to make scanning the canvas easier.
 */
export default function AutomationNode({
  id,
  data,
  selected,
}: NodeProps<FlowNode>) {
  const { t } = useI18n();
  const deleteNode = useContext(NodeActionsContext);
  const editorActions = useContext(EditorActionsContext);
  const style = NODE_STYLES[data.label];
  const Icon = style.icon;
  const isCondition = data.label === "Condition";
  const canAppend = APPENDABLE.includes(data.label);
  const isTerminal = canAppend && (editorActions?.terminalNodeIds.has(id) ?? false);
  const nodeTitle = data.nodeName?.trim() || t("editor.untitledStep");
  const preview = previewFor(data, t);

  return (
    <div className="group relative w-[240px]">
      <div
        className={`relative overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/30 transition ${
          selected
            ? "border-primary/70 ring-2 ring-primary/25"
            : "border-border hover:border-ring/50"
        }`}
      >
        <span
          className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${style.accent}`}
        />

        <button
          type="button"
          aria-label={t("editor.deleteNodeNamed", { name: nodeTitle })}
          title={t("editor.deleteNode")}
          onClick={(event) => {
            event.stopPropagation();
            deleteNode?.(id);
          }}
          className={`nodrag absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive ${
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Trash2 size={13} />
        </button>

        <Handle
          type="target"
          position={Position.Top}
          className="!size-2.5 !rounded-full !border-2 !border-background !bg-muted-foreground/70"
        />

        <div className="flex items-start gap-2.5 px-3 pt-3.5 pb-2.5 pr-9">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/5 ${style.tile}`}
          >
            <Icon size={18} weight="duotone" />
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className="truncate text-[13px] font-semibold leading-4 text-foreground"
              title={nodeTitle}
            >
              {nodeTitle}
            </p>
            <span
              className={`mt-1 inline-flex max-w-full truncate rounded border px-1.5 py-px text-[9px] font-semibold tracking-[0.08em] uppercase ${style.badge}`}
            >
              {data.label}
            </span>
          </div>
        </div>

        <div className="mx-3 mb-2.5 rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
          <p
            className={`truncate text-[10.5px] leading-4 ${
              preview.mono ? "font-mono" : ""
            } ${preview.muted ? "text-muted-foreground/70" : "text-muted-foreground"}`}
            title={preview.text}
          >
            {preview.text}
          </p>
        </div>

        {isCondition ? (
          <>
            <Handle
              id="true"
              type="source"
              position={Position.Right}
              title={t("editor.ifMatch")}
              style={{ top: "50%", background: "#34d399" }}
              className="!size-3 !rounded-full !border-2 !border-background"
            />
            <Handle
              id="false"
              type="source"
              position={Position.Bottom}
              title={t("editor.else")}
              style={{ left: "50%", background: "#fb7185" }}
              className="!size-3 !rounded-full !border-2 !border-background"
            />
          </>
        ) : canAppend ? (
          <Handle
            type="source"
            position={Position.Bottom}
            style={{ background: style.handle }}
            className="!size-3 !rounded-full !border-2 !border-background"
          />
        ) : null}
      </div>

      {isTerminal ? (
        <>
          <span className="pointer-events-none absolute top-full left-1/2 h-4 w-px -translate-x-1/2 bg-border" />
          <button
            type="button"
            aria-label={t("editor.addComponent")}
            title={t("editor.addComponent")}
            onClick={(event) => {
              event.stopPropagation();
              editorActions?.requestAddFrom(id);
            }}
            className="nodrag absolute top-full left-1/2 z-10 mt-4 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-primary/50 bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-105 hover:bg-primary/90"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </>
      ) : null}
    </div>
  );
}
