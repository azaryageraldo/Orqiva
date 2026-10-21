import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ArrowLeft,
  Check,
  ListPlus,
  MousePointer2,
  Plus,
  Save,
  Settings2,
  TriangleAlert,
  Trash2,
  Variable,
  Webhook,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import {
  ArrowBendUpRight,
  ChatCircleDots,
  GitFork,
  Handshake,
  Lightning,
  PauseCircle,
  Robot,
  Sparkle,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

import {
  getWorkflow,
  getWorkflowOptions,
  updateWorkflow,
} from "../services/workflow";
import type { WorkflowOption } from "../services/channel";
import { getErrorMessage } from "../services/api";
import { useI18n } from "@/lib/i18n";
import {
  getAiSettings,
  type AiModelOption,
  type AiProvider,
} from "../services/aiSettings";

type NodeKind =
  | "Trigger"
  | "AI Agent"
  | "Send Message"
  | "Condition"
  | "Go To"
  | "Relocate"
  | "Stopper";
type MessageMode = "template" | "smart_value";
type VariableType = "string" | "boolean" | "array";
type AgentVerbosity = "concise" | "balanced" | "detailed";

type OutputVariable = {
  name: string;
  type: VariableType;
  description: string;
  itemField?: string;
};

type AutomationNodeData = {
  label: NodeKind;
  description: string;
  systemMessage?: string;
  variables?: string;
  nodeName?: string;
  variableDefinitions?: Array<{
    name: string;
    type: string;
    description: string;
    sourceValue: string;
  }>;
  outputVariables?: OutputVariable[];
  provider?: string;
  model?: string;
  temperature?: number;
  verbosity?: AgentVerbosity;
  contextMessages?: number;
  messageMode?: MessageMode;
  messageTemplate?: string;
  conditionVariable?: string;
  conditionOperator?: string;
  conditionValue?: string;
  targetNodeId?: string;
  targetWorkflowId?: string;
  endFlow?: boolean;
  setStartingPoint?: boolean;
  triggerType?: string;
  [key: string]: unknown;
};

type FlowNode = Node<AutomationNodeData>;

type ValidationIssue = {
  nodeId?: string;
  title: string;
  message: string;
  fix: string;
};

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SMART_PATH_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
type WorkflowDefinition = {
  nodes: Array<{
    id: string;
    type: NodeKind;
    position: { x: number; y: number };
    data: AutomationNodeData;
  }>;
  edges: Edge[];
};

type WorkflowEditorProps = {
  workflowId?: string;
  onBack: () => void;
};

const panelClass = "rounded-xl border border-border bg-card";
const inputClass =
  "mt-2.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/10";

const labelClass = "text-sm font-medium leading-6 text-muted-foreground";
const compactInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/10";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const nodeOptions: {
  label: NodeKind;
  descriptionKey: string;
  icon: PhosphorIcon;
}[] = [
  { label: "Trigger", descriptionKey: "editor.node.triggerDesc", icon: Lightning },
  { label: "AI Agent", descriptionKey: "editor.node.agentDesc", icon: Robot },
  {
    label: "Send Message",
    descriptionKey: "editor.node.outputDesc",
    icon: ChatCircleDots,
  },
  {
    label: "Condition",
    descriptionKey: "editor.node.conditionDesc",
    icon: GitFork,
  },
  {
    label: "Go To",
    descriptionKey: "editor.node.goToDesc",
    icon: ArrowBendUpRight,
  },
  {
    label: "Relocate",
    descriptionKey: "editor.node.relocateDesc",
    icon: Handshake,
  },
  {
    label: "Stopper",
    descriptionKey: "editor.node.stopperDesc",
    icon: PauseCircle,
  },
];

const PROMPT_BUILTINS = [
  {
    token: "customer_message",
    descriptionKey: "editor.token.customerMessage",
  },
  { token: "customer_name", descriptionKey: "editor.token.customerName" },
];

const geminiModels = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash · Recommended" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const NodeActionsContext = createContext<((nodeId: string) => void) | null>(null);

const initialNodes: FlowNode[] = [
  {
    id: "trigger-1",
    type: "automation",
    position: { x: 260, y: 40 },
    data: {
      label: "Trigger",
      nodeName: "Incoming message",
      description: "Start when a visitor sends a message",
      triggerType: "chat_message",
    },
  },
  {
    id: "ai-1",
    type: "automation",
    position: { x: 260, y: 280 },
    data: {
      label: "AI Agent",
      nodeName: "AI response",
      description: "Generate a response with AI",
      systemMessage:
        "You are a helpful assistant. Answer the visitor clearly and politely.",
      variables: "customer_message\ncustomer_name",
      outputVariables: [
        {
          name: "respond",
          type: "array",
          itemField: "replies",
          description: "Balasan AI; setiap item dikirim sebagai bubble",
        },
      ],
      variableDefinitions: [
        {
          name: "customer_message",
          type: "string",
          description: "Message sent by the visitor",
          sourceValue: "input.message",
        },
        {
          name: "customer_name",
          type: "string",
          description: "Visitor name",
          sourceValue: "input.customer_name",
        },
      ],
      provider: "gemini",
      model: "gemini-3.8-flash",
      temperature: 0.7,
      verbosity: "concise",
      contextMessages: 10,
    },
  },
  {
    id: "message-1",
    type: "automation",
    position: { x: 260, y: 520 },
    data: {
      label: "Send Message",
      nodeName: "Send AI reply",
      description: "Send the AI response to the visitor",
      messageMode: "smart_value",
      messageTemplate: "{{ai-response.respond.replies}}",
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "edge-1",
    source: "trigger-1",
    target: "ai-1",
    type: "flow",
  },
  {
    id: "edge-2",
    source: "ai-1",
    target: "message-1",
    type: "flow",
  },
];

const NODE_ICONS: Record<NodeKind, PhosphorIcon> = {
  Trigger: Lightning,
  "AI Agent": Robot,
  "Send Message": ChatCircleDots,
  Condition: GitFork,
  "Go To": ArrowBendUpRight,
  Relocate: Handshake,
  Stopper: PauseCircle,
};

const NODE_TONES: Record<NodeKind, { tile: string; glow: string }> = {
  Trigger: {
    tile: "bg-amber-400/15 text-amber-300",
    glow: "shadow-[0_0_16px_-6px_rgba(251,191,36,0.7)]",
  },
  "AI Agent": {
    tile: "bg-violet-400/15 text-violet-200",
    glow: "shadow-[0_0_20px_-4px_rgba(167,139,250,0.7)]",
  },
  "Send Message": {
    tile: "bg-primary/15 text-primary",
    glow: "shadow-[0_0_16px_-6px_var(--primary)]",
  },
  Condition: {
    tile: "bg-orange-400/15 text-orange-300",
    glow: "shadow-[0_0_16px_-6px_rgba(251,146,60,0.65)]",
  },
  "Go To": {
    tile: "bg-sky-400/15 text-sky-300",
    glow: "shadow-[0_0_16px_-6px_rgba(56,189,248,0.65)]",
  },
  Relocate: {
    tile: "bg-teal-400/15 text-teal-300",
    glow: "shadow-[0_0_16px_-6px_rgba(45,212,191,0.65)]",
  },
  Stopper: {
    tile: "bg-rose-400/15 text-rose-300",
    glow: "shadow-[0_0_16px_-6px_rgba(251,113,133,0.65)]",
  },
};

function AutomationNode({ id, data, selected }: NodeProps<FlowNode>) {
  const { t } = useI18n();
  const deleteNode = useContext(NodeActionsContext);
  const Icon = NODE_ICONS[data.label] ?? WorkflowIcon;
  const tone = NODE_TONES[data.label] ?? NODE_TONES["Send Message"];
  const isCondition = data.label === "Condition";
  const isAgent = data.label === "AI Agent";
  const hasSourceHandle = !["Relocate", "Go To"].includes(data.label);
  const nodeTitle = data.nodeName?.trim() || t("editor.untitledStep");
  const conditionVariable = data.conditionVariable?.trim();

  return (
    <div
      className={`group relative w-[224px] overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/20 transition ${
        selected
          ? "border-primary/70 ring-2 ring-primary/20"
          : "border-border hover:border-ring/40"
      } ${
        isAgent
          ? "bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_58%)]"
          : ""
      }`}
    >
      <button
        type="button"
        aria-label={t("editor.deleteNodeNamed", { name: nodeTitle })}
        title={t("editor.deleteNode")}
        onClick={(event) => {
          event.stopPropagation();
          deleteNode?.(id);
        }}
        className={`nodrag absolute top-1.5 right-1.5 z-10 flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive ${
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

      <div className="flex items-center gap-2.5 py-2.5 pr-8 pl-3">
        <span
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg ${tone.tile} ${tone.glow}`}
        >
          <Icon size={17} weight="duotone" />
          {isAgent && (
            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-violet-300 shadow-[0_0_6px_rgba(196,181,253,0.9)]" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-semibold text-foreground"
            title={nodeTitle}
          >
            {nodeTitle}
          </p>
          {isCondition && (
            <p
              className={`mt-0.5 truncate font-mono text-[10px] ${
                conditionVariable ? "text-primary" : "text-muted-foreground/70"
              }`}
              title={
                conditionVariable
                  ? `{{${conditionVariable}}}`
                  : t("editor.chooseBoolean")
              }
            >
              {conditionVariable
                ? `{{${conditionVariable}}}`
                : t("editor.chooseVariable")}
            </p>
          )}
        </div>
      </div>

      {isAgent && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
      )}

      {isCondition ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            title={t("editor.ifMatch")}
            style={{ top: "50%", background: "#34d399" }}
            className="!size-2.5 !rounded-full !border-2 !border-background"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            title={t("editor.else")}
            style={{ left: "50%", background: "#fb7185" }}
            className="!size-2.5 !rounded-full !border-2 !border-background"
          />
        </>
      ) : hasSourceHandle ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2.5 !rounded-full !border-2 !border-background !bg-primary"
        />
      ) : null}
    </div>
  );
}

const EDGE_CHIPS: Record<string, string> = {
  true: "border-emerald-400/40 bg-card text-emerald-300",
  false: "border-rose-400/40 bg-card text-rose-300",
};

const EDGE_LABELS: Record<string, string> = {
  true: "editor.ifMatch",
  false: "editor.else",
};

function FlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
}: EdgeProps) {
  const { t } = useI18n();
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 18,
  });

  const branch = sourceHandleId ?? "";
  const stroke =
    branch === "true"
      ? "#34d399"
      : branch === "false"
        ? "#fb7185"
        : "var(--primary)";
  const labelKey = EDGE_LABELS[branch];
  const label = labelKey ? t(labelKey) : undefined;

  return (
    <>
      <path
        d={path}
        fill="none"
        style={{ stroke }}
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.12}
      />
      <path
        d={path}
        fill="none"
        style={{ stroke }}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="7 9"
        className="flow-edge-dash"
      />
      {label && (
        <EdgeLabelRenderer>
          <span
            className={`absolute rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur ${EDGE_CHIPS[branch]}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 13}px)`,
            }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { automation: AutomationNode };
const edgeTypes = { flow: FlowEdge };

type AgentVariable = {
  name: string;
  token: string;
  type: string;
  description: string;
  itemField?: string;
};

function nodeVariableNamespace(node: FlowNode): string {
  const base = (node.data.nodeName?.trim() || node.id)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) return `agent-${node.id}`;
  return /^[a-z_]/.test(base) ? base : `agent-${base}`;
}

function getUpstreamAgentVariables(
  nodes: FlowNode[],
  edges: Edge[],
  targetId: string,
): AgentVariable[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nearestAgents: FlowNode[] = [];

  function walk(nodeId: string, seen: Set<string>) {
    for (const edge of edges) {
      if (edge.target !== nodeId) continue;

      const source = nodeById.get(edge.source);
      if (!source || seen.has(source.id)) continue;

      if (source.data.label === "AI Agent") {
        if (!nearestAgents.some((agent) => agent.id === source.id)) {
          nearestAgents.push(source);
        }
        continue;
      }

      walk(source.id, new Set([...seen, source.id]));
    }
  }

  walk(targetId, new Set([targetId]));

  const result: AgentVariable[] = [];
  for (const node of nodes) {
    if (!nearestAgents.some((agent) => agent.id === node.id)) continue;

    const namespace = nodeVariableNamespace(node);
    const agentLabel = node.data.nodeName?.trim() || node.id;

    for (const variable of node.data.outputVariables ?? []) {
      const name = variable.name.trim();

      if (!name) continue;

      if (variable.type === "array") {
        const field = variable.itemField?.trim() || "replies";
        const token = `${namespace}.${name}.${field}`;

        result.push({
          name: token,
          token,
          type: "array",
          description:
            variable.description ||
            `${agentLabel} — list; setiap item menjadi satu bubble (${field})`,
          itemField: field,
        });

        continue;
      }

      const token = `${namespace}.${name}`;

      result.push({
        name: token,
        token,
        type: variable.type,
        description: variable.description
          ? `${agentLabel} — ${variable.description}`
          : agentLabel,
      });
    }
  }

  return result.filter(
    (variable, index) =>
      result.findIndex((item) => item.token === variable.token) === index,
  );
}

function makeSnapshot(nodes: FlowNode[], edges: Edge[]): string {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.label,
      position: node.position,
      data: node.data,
    })),
    edges,
  });
}

function SmartValueTextarea({
  value,
  onChange,
  variables,
  rows = 5,
  placeholder,
  textareaRef,
  showVariables = true,
}: {
  value: string;
  onChange: (value: string) => void;
  variables: Array<{ token: string; description?: string; type?: string }>;
  rows?: number;
  placeholder?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  showVariables?: boolean;
}) {
  const { t } = useI18n();
  const localRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = textareaRef ?? localRef;
  const highlightRef = useRef<HTMLPreElement>(null);
  const parts = value.split(/(\{\{\s*[\w.-]+\s*\}\})/g);

  function insertVariable(name: string) {
    const input = inputRef.current;
    const token = `{{${name}}}`;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div>
      <div className="relative mt-2.5 overflow-hidden rounded-xl border border-border bg-background transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6 text-foreground"
        >
          {parts.map((part, index) =>
            /^\{\{\s*[\w.-]+\s*\}\}$/.test(part) ? (
              <span key={index} className="rounded bg-primary/10 text-primary">
                {part}
              </span>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
          {"\n"}
        </pre>
        <textarea
          ref={inputRef}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (highlightRef.current) {
              highlightRef.current.scrollTop = event.currentTarget.scrollTop;
              highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          placeholder={placeholder}
          className="relative block w-full resize-y bg-transparent px-4 py-3 text-sm leading-6 text-transparent caret-primary outline-none selection:bg-primary/20 placeholder:text-muted-foreground/70"
          spellCheck={false}
        />
      </div>
      {showVariables &&
        (variables.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">{t("editor.availableValues")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variables.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                  title={variable.description || variable.type}
                  className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-xs text-primary transition hover:border-primary/40 hover:bg-primary/15"
                >
                  {`{{${variable.token}}}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {t("editor.noVariablesSuggestion")}
          </p>
        ))}
    </div>
  );
}

export default function WorkflowEditor({
  workflowId,
  onBack,
}: WorkflowEditorProps) {
  const { language, t } = useI18n();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("success");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOption[]>([]);
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [aiDefaultModel, setAiDefaultModel] = useState<AiModelOption | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [draftData, setDraftData] = useState<AutomationNodeData | null>(null);
  const [agentTab, setAgentTab] = useState<"node" | "prompt" | "variables">("node");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(workflowId));
  const [isSaving, setIsSaving] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    makeSnapshot(initialNodes, initialEdges),
  );

  const changeSelection = useCallback((id: string | null) => {
    setAgentTab("node");
    setSelectedNodeId(id);
  }, []);

  useEffect(() => {
    let active = true;

    getAiSettings()
      .then((result) => {
        if (!active) return;

        setAiModels(result.models);

        const configured = result.providers.find(
          (provider) => provider.configured && provider.default_model,
        );
        const preferred = configured?.default_model
          ? result.models.find(
              (model) =>
                model.provider === configured.provider &&
                model.id === configured.default_model,
            )
          : undefined;

        setAiDefaultModel(preferred ?? result.models[0] ?? null);
      })
      .catch(() => {
        if (!active) return;

        setAiModels([]);
        setAiDefaultModel(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getWorkflowOptions()
      .then((options) => {
        if (active) setWorkflowOptions(options);
      })
      .catch(() => {
        if (active) setWorkflowOptions([]);
      });

    return () => {
      active = false;
    };
  }, [workflowId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkflow() {
      if (!workflowId) {
        setNodes(initialNodes);
        setEdges(initialEdges);
        setSavedSnapshot(makeSnapshot(initialNodes, initialEdges));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setNotice("");

      try {
        const workflow = await getWorkflow(workflowId);

        if (cancelled) return;

        const definition = workflow.definition;
        setWorkflowName(workflow.name);

        const loadedNodes = definition?.nodes?.length
          ? definition.nodes.map((node) => ({
              ...node,
              type: "automation",
              position: node.position ?? { x: 100, y: 100 },
              data: node.data as AutomationNodeData,
            })) as FlowNode[]
          : initialNodes;
        const loadedEdges = (definition?.edges ?? initialEdges).map((edge, index) => ({
          id: edge.id ?? `edge-${index}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle ?? null,
          type: "flow",
          animated: false,
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSavedSnapshot(makeSnapshot(loadedNodes, loadedEdges));

        changeSelection(null);
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load workflow:", error);
        setNoticeTone("error");
        setNotice(getErrorMessage(error, tRef.current("editor.loadError")));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkflow();

    return () => {
      cancelled = true;
    };
  }, [workflowId, changeSelection]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const inspectorData = draftData ?? selectedNode?.data ?? null;
  const nodesForSave = useMemo(
    () =>
      nodes.map((node) =>
        node.id === selectedNodeId && draftData
          ? { ...node, data: draftData }
          : node,
      ),
    [nodes, selectedNodeId, draftData],
  );
  const isDirty =
    !isLoading && makeSnapshot(nodesForSave, edges) !== savedSnapshot;
  const upstreamVariables = useMemo(
    () =>
      selectedNodeId
        ? getUpstreamAgentVariables(nodes, edges, selectedNodeId)
        : [],
    [nodes, edges, selectedNodeId],
  );
  const promptVariables = useMemo(() => {
    const values = [
      ...PROMPT_BUILTINS.map((item) => ({
        token: item.token,
        description: t(item.descriptionKey),
      })),
      ...upstreamVariables.map((variable) => ({
        token: variable.token,
        description: variable.description,
      })),
    ];

    return values.filter(
      (value, index) =>
        values.findIndex((item) => item.token === value.token) === index,
    );
  }, [upstreamVariables, t]);
  const booleanVariables = upstreamVariables.filter(
    (variable) => variable.type === "boolean",
  );
  const messageTemplate = String(inspectorData?.messageTemplate ?? "");
  const arrayBubbleVariable = upstreamVariables.find(
    (variable) =>
      variable.type === "array" &&
      messageTemplate.trim() === `{{${variable.token}}}`,
  );

  const currentWorkflowId = workflowId ? Number(workflowId) : null;
  const goToWorkflowOptions = useMemo<WorkflowOption[]>(() => {
    const currentOption: WorkflowOption = {
      id: currentWorkflowId ?? 0,
      name: workflowName || t("editor.currentWorkflowName"),
      status: "draft",
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.data.label,
        name: node.data.nodeName || node.data.label,
      })),
    };

    if (currentWorkflowId === null) return [currentOption];

    return [
      currentOption,
      ...workflowOptions.filter(
        (option) => option.id !== currentWorkflowId,
      ),
    ];
  }, [currentWorkflowId, nodes, workflowName, workflowOptions, t]);

  const selectedGoToWorkflowId = Number(
    inspectorData?.targetWorkflowId || currentWorkflowId || 0,
  );
  const selectedGoToWorkflow =
    goToWorkflowOptions.find(
      (option) => option.id === selectedGoToWorkflowId,
    ) ?? goToWorkflowOptions[0];
  const goToTargetNodes =
    selectedGoToWorkflowId === currentWorkflowId || selectedGoToWorkflowId === 0
      ? nodes.map((node) => ({
          id: node.id,
          type: node.data.label,
          name: node.data.nodeName || node.data.label,
        }))
      : (selectedGoToWorkflow?.nodes ?? []);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [isDirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(
      () => setNotice(""),
      noticeTone === "error" ? 7000 : 4200,
    );
    return () => window.clearTimeout(timer);
  }, [notice, noticeTone]);

  function requestBack() {
    if (isDirty) {
      setConfirmLeave(true);
      return;
    }
    onBack();
  }

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current) as FlowNode[]);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          type: "flow",
          animated: false,
        },
        current,
      ),
    );
  }, []);

  const availableAiModels: AiModelOption[] = aiModels.length > 0
    ? aiModels
    : geminiModels.map((model) => ({
        id: model.id,
        provider: "gemini" as AiProvider,
        provider_label: "Google Gemini",
      }));
  const defaultAiModel = aiDefaultModel ?? availableAiModels[0] ?? {
    id: "gemini-3.8-flash",
    provider: "gemini" as AiProvider,
    provider_label: "Google Gemini",
  };

  function addNode(label: NodeKind) {
    const id = `${label.toLowerCase().replaceAll(" ", "-")}-${crypto.randomUUID()}`;

    const defaults: Record<NodeKind, AutomationNodeData> = {
      Trigger: {
        label,
        nodeName: t("editor.default.triggerName"),
        description: t("editor.default.triggerDescription"),
        triggerType: "chat_message",
      },
      "AI Agent": {
        label,
        nodeName: t("editor.default.agentName"),
        description: t("editor.default.agentDescription"),
        systemMessage: t("editor.default.agentSystem"),
        variables: "customer_message",
        variableDefinitions: [
          {
            name: "customer_message",
            type: "string",
            description: t("editor.default.customerMessageDescription"),
            sourceValue: "input.message",
          },
        ],
        outputVariables: [
          {
            name: "respond",
            type: "array",
            itemField: "replies",
            description: t("editor.default.outputDescription"),
          },
        ],
        provider: defaultAiModel.provider,
        model: defaultAiModel.id,
        temperature: 0.7,
        verbosity: "concise",
        contextMessages: 10,
      },
      "Send Message": {
        label,
        nodeName: t("editor.default.sendName"),
        description: t("editor.default.sendDescription"),
        messageMode: "template",
        messageTemplate: "{{ai-response.respond.replies}}",
      },
      Condition: {
        label,
        nodeName: t("editor.default.conditionName"),
        description: t("editor.default.conditionDescription"),
        conditionVariable: "",
      },
      "Go To": {
        label,
        nodeName: t("editor.default.goToName"),
        description: t("editor.default.goToDescription"),
        targetNodeId: "",
        endFlow: false,
        setStartingPoint: false,
      },
      Relocate: {
        label,
        nodeName: t("editor.default.relocateName"),
        description: t("editor.default.relocateDescription"),
      },
      Stopper: {
        label,
        nodeName: t("editor.default.stopperName"),
        description: t("editor.default.stopperDescription"),
      },
    };

    const newNode: FlowNode = {
      id,
      type: "automation",
      position: {
        x: 260 + (nodes.length % 2) * 320,
        y: 80 + nodes.length * 150,
      },
      data: defaults[label],
    };

    setNodes((current) => [...current, newNode]);
    setDraftData({ ...newNode.data });
    changeSelection(id);
    setShowLibrary(false);
    setNotice("");
    setValidationIssues([]);
  }

  function updateNode(patch: Partial<AutomationNodeData>) {
    setDraftData((current) => (current ? { ...current, ...patch } : current));
  }

  function insertPromptToken(token: string) {
    const textarea = promptRef.current;
    const current = String(inspectorData?.systemMessage ?? "");
    const tokenText = `{{${token}}}`;

    if (!textarea) {
      updateNode({ systemMessage: `${current}${tokenText}` });
      return;
    }

    const start = textarea.selectionStart ?? current.length;
    const end = textarea.selectionEnd ?? current.length;
    const next = `${current.slice(0, start)}${tokenText}${current.slice(end)}`;

    updateNode({ systemMessage: next });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tokenText.length, start + tokenText.length);
    });
  }

  function updateOutputVariable(
    index: number,
    patch: Partial<OutputVariable>,
  ) {
    const current = inspectorData?.outputVariables ?? [];

    updateNode({
      outputVariables: current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function addOutputVariable() {
    updateNode({
      outputVariables: [
        ...(inspectorData?.outputVariables ?? []),
        { name: "", type: "string", description: "" },
      ],
    });
  }

  function removeOutputVariable(index: number) {
    updateNode({
      outputVariables: (inspectorData?.outputVariables ?? []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }

  function selectNode(node: FlowNode) {
    if (selectedNode?.id === node.id) return;
    if (selectedNode && draftData) {
      setNodes((current) =>
        current.map((item) =>
          item.id === selectedNode.id ? { ...item, data: { ...draftData } } : item,
        ),
      );
    }
    setDraftData({ ...node.data });
    changeSelection(node.id);
    setShowLibrary(false);
  }

  function saveNodeChanges() {
    if (!selectedNode || !draftData) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...draftData } }
          : node,
      ),
    );
    changeSelection(null);
    setDraftData(null);
    setShowLibrary(false);
    setNoticeTone("success");
    setNotice(t("editor.changesApplied"));
  }

  function cancelNodeChanges() {
    setDraftData(null);
    changeSelection(null);
  }

  const removeNode = useCallback((nodeId: string) => {
    setNodes((current) =>
      current.filter((node) => node.id !== nodeId),
    );
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    );
    setSelectedNodeId((current) => (current === nodeId ? null : current));
    setAgentTab("node");
    setDraftData(null);
  }, []);

  function validateCanvas(candidates: FlowNode[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const triggerNodes = candidates.filter(
      (node) => node.data.label === "Trigger",
    );
    const agentNamespaces = new Map<string, string>();

    if (triggerNodes.length > 1) {
      issues.push({
        title: t("editor.validation.multipleTrigger.title"),
        message: t("editor.validation.multipleTrigger.message", {
          count: triggerNodes.length,
        }),
        fix: t("editor.validation.multipleTrigger.fix"),
      });
    }

    for (const node of triggerNodes) {
      if (!edges.some((edge) => edge.source === node.id)) {
        issues.push({
          nodeId: node.id,
          title: t("editor.validation.triggerUnconnected.title"),
          message: t("editor.validation.triggerUnconnected.message", {
            name: node.data.nodeName || "Trigger",
          }),
          fix: t("editor.validation.triggerUnconnected.fix"),
        });
      }
    }

    for (const node of candidates) {
      const label = node.data.label;
      const nodeName = node.data.nodeName || label;

      if (label === "AI Agent") {
        const namespace = nodeVariableNamespace(node);
        const existingAgent = agentNamespaces.get(namespace);

        if (existingAgent) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.agentConflict.title"),
            message: t("editor.validation.agentConflict.message", {
              namespace,
              first: existingAgent,
              second: nodeName,
            }),
            fix: t("editor.validation.agentConflict.fix"),
          });
        } else {
          agentNamespaces.set(namespace, nodeName);
        }

        if (!String(node.data.systemMessage ?? "").trim()) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.emptyPrompt.title"),
            message: t("editor.validation.emptyPrompt.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.emptyPrompt.fix"),
          });
        }

        const seen = new Set<string>();

        for (const variable of node.data.outputVariables ?? []) {
          const name = variable.name.trim();
          if (!name) continue;

          if (!VARIABLE_NAME_PATTERN.test(name)) {
            issues.push({
              nodeId: node.id,
              title: t("editor.validation.invalidVariable.title"),
              message: t("editor.validation.invalidVariable.message", {
                name,
                node: nodeName,
              }),
              fix: t("editor.validation.invalidVariable.fix"),
            });
            continue;
          }

          if (seen.has(name)) {
            issues.push({
              nodeId: node.id,
              title: t("editor.validation.duplicateVariable.title"),
              message: t("editor.validation.duplicateVariable.message", {
                name,
                node: nodeName,
              }),
              fix: t("editor.validation.duplicateVariable.fix"),
            });
          }

          seen.add(name);

          if (
            variable.type === "array" &&
            variable.itemField?.trim() &&
            !VARIABLE_NAME_PATTERN.test(variable.itemField.trim())
          ) {
            issues.push({
              nodeId: node.id,
              title: t("editor.validation.invalidItemField.title"),
              message: t("editor.validation.invalidItemField.message", {
                field: variable.itemField,
                name,
              }),
              fix: t("editor.validation.invalidItemField.fix"),
            });
          }
        }
      }

      if (label === "Condition") {
        const field = String(node.data.conditionVariable ?? "").trim();

        if (!field) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.conditionNoVariable.title"),
            message: t("editor.validation.conditionNoVariable.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.conditionNoVariable.fix"),
          });
        } else if (!SMART_PATH_PATTERN.test(field)) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.conditionInvalidSmart.title"),
            message: t("editor.validation.conditionInvalidSmart.message", {
              name: nodeName,
              field,
            }),
            fix: t("editor.validation.conditionInvalidSmart.fix"),
          });
        } else {
          const available = getUpstreamAgentVariables(candidates, edges, node.id)
            .filter((variable) => variable.type === "boolean")
            .map((variable) => variable.name);

          if (available.length > 0 && !available.includes(field)) {
            issues.push({
              nodeId: node.id,
              title: t("editor.validation.conditionUnavailable.title"),
              message: t("editor.validation.conditionUnavailable.message", {
                field,
                name: nodeName,
              }),
              fix: t("editor.validation.conditionUnavailable.fix", {
                field,
                values: available.join(", "),
              }),
            });
          }
        }
      }

      if (label === "Send Message") {
        if (!String(node.data.messageTemplate ?? "").trim()) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.emptyMessage.title"),
            message: t("editor.validation.emptyMessage.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.emptyMessage.fix"),
          });
        }
      }

      if (label === "Go To") {
        const targetNodeId = String(node.data.targetNodeId ?? "").trim();
        const targetWorkflowId = Number(
          node.data.targetWorkflowId || currentWorkflowId || 0,
        );

        if (!targetNodeId) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.goToNoTarget.title"),
            message: t("editor.validation.goToNoTarget.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.goToNoTarget.fix"),
          });
          continue;
        }

        const targetWorkflow = goToWorkflowOptions.find(
          (option) => option.id === targetWorkflowId,
        );

        if (!targetWorkflow) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.goToWorkflowMissing.title"),
            message: t("editor.validation.goToWorkflowMissing.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.goToWorkflowMissing.fix"),
          });
          continue;
        }

        const targetNodes =
          targetWorkflowId === currentWorkflowId || targetWorkflowId === 0
            ? candidates
            : workflowOptions.find((option) => option.id === targetWorkflowId)
                ?.nodes ?? [];

        if (!targetNodes.some((target) => target.id === targetNodeId)) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.goToNodeMissing.title"),
            message: t("editor.validation.goToNodeMissing.message", {
              node: targetNodeId,
              workflow: targetWorkflow.name,
            }),
            fix: t("editor.validation.goToNodeMissing.fix"),
          });
        }

        if (
          targetNodeId === node.id &&
          targetWorkflowId === currentWorkflowId
        ) {
          issues.push({
            nodeId: node.id,
            title: t("editor.validation.goToSelf.title"),
            message: t("editor.validation.goToSelf.message", {
              name: nodeName,
            }),
            fix: t("editor.validation.goToSelf.fix"),
          });
        }
      }
    }

    return issues;
  }

  async function saveWorkflow(): Promise<boolean> {
    if (!workflowId) {
      setNoticeTone("error");
      setNotice(t("editor.saveFirst"));
      return false;
    }

    const issues = validateCanvas(nodesForSave);
    setValidationIssues(issues);

    if (issues.length > 0) {
      setNoticeTone("error");
      setNotice(
        `Workflow belum disimpan. Ada ${issues.length} hal yang perlu diperbaiki.`,
      );
      return false;
    }

    const definition: WorkflowDefinition = {
      nodes: nodesForSave.map((node) => ({
        id: node.id,
        type: node.data.label,
        position: node.position,
        data: node.data,
      })),
      edges,
    };

    setIsSaving(true);
    setNoticeTone("success");
    setNotice("");

    try {
      await updateWorkflow(workflowId, { definition });
      setSavedSnapshot(makeSnapshot(nodesForSave, edges));
      setNodes(nodesForSave);
      changeSelection(null);
      setDraftData(null);
      setShowLibrary(false);
      setValidationIssues([]);
      setNoticeTone("success");
      setNotice(t("editor.savedNotice"));
      return true;
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setNoticeTone("error");
      setNotice(getErrorMessage(error, t("editor.saveError")));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAndLeave() {
    const saved = await saveWorkflow();
    if (saved) {
      setConfirmLeave(false);
      onBack();
    }
  }

  return (
    <section className="relative flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {/* Editor header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-5 py-3.5 lg:px-7">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={requestBack}
            className={`${buttonClass} border border-border bg-muted/50 text-muted-foreground hover:bg-muted`}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t("editor.backAll")}</span>
          </button>

          <div className="h-8 w-px bg-muted" />

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {workflowName || t("editor.title")}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {t("editor.canvasMeta", { count: nodes.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <span className={`size-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-400"}`} />
            {isLoading ? t("editor.loading") : isDirty ? t("editor.unsaved") : t("editor.saved")}
          </span>
          <button
            type="button"
            onClick={() => void saveWorkflow()}
            disabled={isSaving || isLoading || !isDirty}
            className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}
          >
            <Save size={16} />
            {isSaving ? t("editor.saving") : t("editor.save")}
          </button>
        </div>
      </header>

      {validationIssues.length > 0 && (
        <div
          role="alert"
          className="max-h-44 shrink-0 overflow-y-auto border-b border-destructive/25 bg-destructive/[0.06] px-5 py-3 lg:px-7"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <TriangleAlert size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-destructive">
                  {t("editor.issues", { count: validationIssues.length })}
                </p>
                <button
                  type="button"
                  onClick={() => setValidationIssues([])}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t("editor.closeIssues")}
                >
                  <X size={14} />
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {validationIssues.map((issue, index) => (
                  <li
                    key={`${issue.nodeId ?? "workflow"}-${index}`}
                    className="rounded-lg border border-destructive/15 bg-background/40 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-foreground">
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {issue.message}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-destructive/90">
                      {issue.fix}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex h-0 min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
          <button
            type="button"
            onClick={() => {
              if (showLibrary) {
                setShowLibrary(false);
              } else {
                if (selectedNode) saveNodeChanges();
                setShowLibrary(true);
              }
            }}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur transition hover:border-ring/50 hover:bg-muted hover:text-foreground"
            aria-expanded={showLibrary}
            aria-label={showLibrary ? t("editor.closeLibrary") : t("editor.openLibrary")}
          >
            {showLibrary ? <X size={15} /> : <ListPlus size={15} />}
            {showLibrary ? t("editor.closeLibraryShort") : t("editor.nodeLibrary")}
          </button>
          {isLoading && (
            <div role="status" className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
              {t("editor.loadingWorkflow")}
            </div>
          )}
          {!isLoading && !selectedNode && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 hidden items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg sm:flex">
              <MousePointer2 size={14} className="text-muted-foreground" />
              {t("editor.canvasHint")}
            </div>
          )}

          <NodeActionsContext.Provider value={removeNode}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{
              type: "flow",
              animated: false,
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node as FlowNode)}
            onPaneClick={() => selectedNode && saveNodeChanges()}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.28 }}
            snapToGrid
            snapGrid={[16, 16]}
            minZoom={0.2}
            maxZoom={1.8}
            className="bg-[#0b0d11]"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#343945" gap={24} size={1} />
            <Controls className="!overflow-hidden !rounded-xl !border !border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!fill-foreground [&>button:hover]:!bg-muted" />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) =>
                node.data.label === "Condition"
                  ? "#f59e0b"
                  : node.data.label === "AI Agent"
                    ? "#8b5cf6"
                    : node.data.label === "Trigger"
                      ? "#eab308"
                      : node.data.label === "Stopper"
                        ? "#fb7185"
                        : "#0ea5e9"
              }
              maskColor="rgba(0,0,0,0.65)"
              className="!overflow-hidden !rounded-xl !border !border-border !bg-card"
            />
          </ReactFlow>
          </NodeActionsContext.Provider>
        </div>

        {/* Right-side node library */}
        {showLibrary && !selectedNode && (
          <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-border bg-card p-4">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("editor.builder")}</p>
                <h2 className="mt-2 text-base font-semibold text-foreground">{t("editor.nodeLibrary")}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("editor.chooseStep")}</p>
              </div>
              <button type="button" onClick={() => setShowLibrary(false)} aria-label={t("editor.closeLibrary")} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-2">
              {nodeOptions.map(({ label, descriptionKey, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => addNode(label)}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.045]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon size={17} weight="duotone" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {label}
                    </span>
                    <span className="mt-1 block truncate text-[10px] leading-4 text-muted-foreground">
                      {t(descriptionKey)}
                    </span>
                  </span>

                  <Plus size={14} className="shrink-0 text-muted-foreground/70 group-hover:text-primary" />
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Webhook size={14} className="text-primary" />
                {t("editor.chatWidget")}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t("editor.triggerWidgetHint")}
              </p>
            </div>
          </aside>
        )}
        {/* Node settings inspector */}

        {selectedNode && (
          <aside className="flex h-full max-h-full w-[min(460px,92vw)] max-w-[92vw] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
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
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-6">
              {inspectorData?.label !== "AI Agent" && (
                <>
                  <label className="block">
                    <span className={labelClass}>{t("editor.nodeName")}</span>
                    <input
                      className={inputClass}
                      value={String(inspectorData?.nodeName ?? inspectorData?.label ?? "")}
                      onChange={(event) => updateNode({ nodeName: event.target.value })}
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
                      onChange={(event) => updateNode({ description: event.target.value })}
                    />
                  </label>
                </>
              )}
              {inspectorData?.label === "Trigger" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("editor.triggerTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("editor.triggerDescription")}
                    </p>
                  </div>

                  <div className={`${panelClass} p-3.5`}>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <ChatCircleDots size={16} className="text-primary" />
                      {t("editor.customerMessage")}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {t("editor.triggerTokenHint", {
                        message: "{{customer_message}}",
                        name: "{{customer_name}}",
                      })}
                    </p>
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    {t("editor.triggerNote")}
                  </p>
                </div>
              )}
              {inspectorData?.label === "AI Agent" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t("editor.aiSettings")}</p>
                    <div className="mt-4 grid grid-cols-3 rounded-lg border border-border bg-muted/40 p-1">
                      {([
                        ["node", t("editor.tabNode")],
                        ["prompt", t("editor.tabPrompt")],
                        ["variables", t("editor.tabVariables")],
                      ] as const).map(([tab, label]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setAgentTab(tab)}
                          className={`rounded-md px-2 py-2 text-xs font-medium transition ${agentTab === tab ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        <p>
                          {t("editor.promptTip")}
                        </p>
                      </div>
                    </div>
                  )}

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

                      {(inspectorData?.outputVariables ?? []).map(
                        (variable, index) => {
                          const name = variable.name.trim();
                          const itemField =
                            variable.itemField?.trim() || "replies";
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
                                  aria-label={t("editor.removeVariable")}
                                  onClick={() => removeOutputVariable(index)}
                                  className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="space-y-2.5 p-3">
                                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_138px]">
                                  <label className="block min-w-0">
                                    <span className="text-[11px] text-muted-foreground">
                                      Name
                                    </span>
                                    <input
                                      className={`${compactInputClass} mt-1 font-mono`}
                                      value={variable.name}
                                      onChange={(event) =>
                                        updateOutputVariable(index, {
                                          name: event.target.value,
                                        })
                                      }
                                      placeholder="respond"
                                    />
                                    {name && !VARIABLE_NAME_PATTERN.test(name) && (
                                      <span className="mt-1 block text-[10px] leading-4 text-destructive">
                                        {t("editor.variableNameError")}
                                      </span>
                                    )}
                                  </label>

                                  <label className="block">
                                    <span className="text-[11px] text-muted-foreground">
                                      Type
                                    </span>
                                    <select
                                      className={`${compactInputClass} mt-1`}
                                      value={variable.type}
                                      onChange={(event) => {
                                        const type =
                                          event.target.value as VariableType;

                                        updateOutputVariable(index, {
                                          type,
                                          itemField:
                                            type === "array"
                                              ? variable.itemField || "replies"
                                              : variable.itemField,
                                        });
                                      }}
                                    >
                                      <option value="string">{t("editor.typeText")}</option>
                                      <option value="boolean">
                                        {t("editor.typeBoolean")}
                                      </option>
                                      <option value="array">
                                        {t("editor.typeArray")}
                                      </option>
                                    </select>
                                  </label>
                                </div>

                                {variable.type === "array" && (
                                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                    <label className="block min-w-0">
                                      <span className="text-[11px] text-muted-foreground">
                                        Item field
                                      </span>
                                      <input
                                        className={`${compactInputClass} mt-1 font-mono`}
                                        value={variable.itemField ?? "replies"}
                                        onChange={(event) =>
                                          updateOutputVariable(index, {
                                            itemField: event.target.value,
                                          })
                                        }
                                        placeholder="replies"
                                      />
                                      {itemField &&
                                        !VARIABLE_NAME_PATTERN.test(itemField) && (
                                          <span className="mt-1 block text-[10px] leading-4 text-destructive">
                                            Item field tidak boleh mengandung
                                            spasi.
                                          </span>
                                        )}
                                    </label>
                                    <span className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 font-mono text-[10px] text-primary">
                                      {`{{${name || "respond"}.${itemField}}}`}
                                    </span>
                                  </div>
                                )}

                                <label className="block">
                                  <span className="text-[11px] text-muted-foreground">
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
                        },
                      )}

                      {(inspectorData?.outputVariables ?? []).length === 0 && (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
                          <Variable
                            size={20}
                            className="mx-auto text-muted-foreground"
                          />
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

                  {agentTab === "node" && <div className="space-y-5">
                    <label className="block">
                      <span className={labelClass}>{t("editor.nodeName")}</span>
                      <input
                        className={inputClass}
                        value={String(inspectorData?.nodeName ?? "")}
                        onChange={(event) => updateNode({ nodeName: event.target.value })}
                        placeholder={t("editor.nodeNameExample")}
                      />
                    </label>

                    <div className={`${panelClass} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t("editor.aiModel")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("editor.aiModelHint")}
                          </p>
                        </div>
                        <span className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 text-xs font-medium text-primary">
                          {availableAiModels.find(
                            (model) =>
                              model.id === String(inspectorData?.model ?? "") &&
                              model.provider === String(inspectorData?.provider ?? "gemini"),
                          )?.provider_label ?? "Gemini"}
                        </span>
                      </div>
                      <select
                        className={inputClass}
                        value={`${String(inspectorData?.provider ?? "gemini")}::${String(inspectorData?.model ?? defaultAiModel.id)}`}
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
                            model.provider === String(inspectorData?.provider ?? "gemini"),
                        ) && inspectorData?.model && (
                          <option
                            value={`${String(inspectorData?.provider ?? "gemini")}::${String(inspectorData.model)}`}
                          >
                            {String(inspectorData?.provider ?? "gemini")} · {String(inspectorData.model)}
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
                              verbosity: event.target
                                .value as AgentVerbosity,
                            })
                          }
                        >
                          <option value="concise">{t("editor.verbosityConcise")}</option>
                          <option value="balanced">{t("editor.verbosityBalanced")}</option>
                          <option value="detailed">{t("editor.verbosityDetailed")}</option>
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
                          <option value="4">{t("editor.contextMessages", { count: 4 })}</option>
                          <option value="8">{t("editor.contextMessages", { count: 8 })}</option>
                          <option value="12">{t("editor.contextMessages", { count: 12 })}</option>
                          <option value="20">{t("editor.contextMessages", { count: 20 })}</option>
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
                  </div>}
                </div>
              )}
              {inspectorData?.label === "Send Message" && (
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
                      onChange={(value) => updateNode({ messageTemplate: value, messageMode: "smart_value" })}
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
                              <span key={index} className="rounded bg-primary/10 px-0.5 text-primary">{part}</span>
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
              )}
              {inspectorData?.label === "Condition" && (
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
              )}
              {inspectorData?.label === "Go To" && (
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
                        inspectorData?.targetWorkflowId ||
                          (currentWorkflowId ?? ""),
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
              )}
              {inspectorData?.label === "Relocate" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-teal-200">
                      <Handshake size={17} /> {t("editor.handoff")}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {t("editor.handoffHint")}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {t("editor.relocateNote")}
                  </p>
                </div>
              )}
              {inspectorData?.label === "Stopper" && (
                <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-rose-200">
                    <PauseCircle size={17} /> {t("editor.pausePoint")}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("editor.pauseHint")}
                  </p>
                </div>
              )}
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
        )}
      </div>

      {/* Editor footer */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-amber-400" />
          {t("editor.draft")}
        </span>
        <span>
          {t("editor.steps", { count: nodes.length })}{" "}
          <span className="mx-2 text-muted-foreground/50">·</span>{" "}
          {t("editor.connections", { count: edges.length })}
        </span>
      </footer>

      {notice && (
        <div
          role={noticeTone === "error" ? "alert" : "status"}
          className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/50 ${
            noticeTone === "error"
              ? "border-destructive/35 bg-destructive/10 text-destructive"
              : "border-border bg-muted text-foreground"
          }`}
        >
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
              noticeTone === "error"
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {noticeTone === "error" ? (
              <TriangleAlert size={13} />
            ) : (
              <Check size={13} />
            )}
          </span>
          <p className="flex-1 leading-5">{notice}</p>
          <button
            type="button"
            aria-label={t("editor.dismiss")}
            onClick={() => setNotice("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <AlertDialog
        open={confirmLeave}
        onOpenChange={(open) => {
          if (!open && !isSaving) setConfirmLeave(false);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-400/10 text-amber-300">
              <Save />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("editor.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("editor.unsavedHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-nowrap">
            <AlertDialogCancel disabled={isSaving} className="h-9 whitespace-nowrap px-3">
              {t("editor.continueEditing")}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setConfirmLeave(false);
                onBack();
              }}
              className={`${buttonClass} h-9 whitespace-nowrap border border-border bg-transparent px-3 text-muted-foreground hover:bg-muted/60`}
            >
              {t("editor.discardLeave")}
            </button>
            <button
              type="button"
              disabled={isSaving || isLoading}
              onClick={() => void saveAndLeave()}
              className={`${buttonClass} h-9 whitespace-nowrap bg-primary px-3 text-primary-foreground hover:bg-primary/90`}
            >
              {isSaving && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
              )}
              {t("editor.saveLeave")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
