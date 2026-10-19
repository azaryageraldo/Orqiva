import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Bot,
  CircleStop,
  Check,
  CornerUpRight,
  GitBranch,
  Handshake,
  ListPlus,
  MessageSquare,
  MousePointer2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Variable,
  Webhook,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";

import { getWorkflow, updateWorkflow } from "../services/workflow";
import { getErrorMessage } from "../services/api";

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
  messageMode?: MessageMode;
  messageTemplate?: string;
  conditionVariable?: string;
  conditionOperator?: string;
  conditionValue?: string;
  targetNodeId?: string;
  endFlow?: boolean;
  setStartingPoint?: boolean;
  triggerType?: string;
  [key: string]: unknown;
};

type FlowNode = Node<AutomationNodeData>;
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
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

const nodeOptions: {
  label: NodeKind;
  description: string;
  icon: typeof Zap;
}[] = [
  { label: "Trigger", description: "Start from a chat message", icon: Zap },
  { label: "AI Agent", description: "Generate replies and decisions", icon: Bot },
  {
    label: "Send Message",
    description: "Reply with one or more bubbles",
    icon: MessageSquare,
  },
  {
    label: "Condition",
    description: "Branch on a yes/no variable",
    icon: GitBranch,
  },
  {
    label: "Go To",
    description: "Jump to another step",
    icon: CornerUpRight,
  },
  {
    label: "Relocate",
    description: "Hand the chat to a human admin",
    icon: Handshake,
  },
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
          type: "string",
          description: "Jawaban AI yang dikirim ke pelanggan",
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
      messageTemplate: "{{respond}}",
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

const NODE_ICONS: Record<NodeKind, typeof Zap> = {
  Trigger: Zap,
  "AI Agent": Bot,
  "Send Message": MessageSquare,
  Condition: GitBranch,
  "Go To": CornerUpRight,
  Relocate: Handshake,
  Stopper: CircleStop,
};

const NODE_TONES: Record<NodeKind, { tile: string }> = {
  Trigger: { tile: "bg-amber-400/15 text-amber-300" },
  "AI Agent": { tile: "bg-violet-400/15 text-violet-300" },
  "Send Message": { tile: "bg-primary/15 text-primary" },
  Condition: { tile: "bg-orange-400/15 text-orange-300" },
  "Go To": { tile: "bg-sky-400/15 text-sky-300" },
  Relocate: { tile: "bg-teal-400/15 text-teal-300" },
  Stopper: { tile: "bg-rose-400/15 text-rose-300" },
};

function nodeSubtitle(data: AutomationNodeData): string {
  switch (data.label) {
    case "Trigger":
      return "Starts from an incoming message";
    case "AI Agent": {
      const count = (data.outputVariables ?? []).filter(
        (item) => item.name.trim() !== "",
      ).length;
      return [data.model, count ? `${count} variables` : null]
        .filter(Boolean)
        .join(" · ") || "Gemini";
    }
    case "Send Message":
      return String(data.messageTemplate ?? "").trim() || "No message yet";
    case "Condition":
      return data.conditionVariable
        ? `{{${data.conditionVariable}}} · If match / Else`
        : "Pilih variabel boolean";
    case "Go To":
      return data.endFlow ? "Jump · end flow" : "Jump to a step";
    case "Relocate":
      return "Handoff to a human admin";
    case "Stopper":
      return "Waits for the next message";
    default:
      return "";
  }
}

function AutomationNode({ id, data, selected }: NodeProps<FlowNode>) {
  const deleteNode = useContext(NodeActionsContext);
  const Icon = NODE_ICONS[data.label] ?? WorkflowIcon;
  const tone = NODE_TONES[data.label] ?? NODE_TONES["Send Message"];
  const isCondition = data.label === "Condition";
  const hasSourceHandle = !["Send Message", "Relocate", "Go To"].includes(
    data.label,
  );

  return (
    <div
      className={`group relative w-[252px] rounded-2xl border bg-card shadow-lg shadow-black/20 transition ${
        selected
          ? "border-primary/70 ring-2 ring-primary/20"
          : "border-border hover:border-ring/40"
      }`}
    >
      <button
        type="button"
        aria-label={`Delete ${data.nodeName || data.label}`}
        title="Delete node"
        onClick={(event) => {
          event.stopPropagation();
          deleteNode?.(id);
        }}
        className={`nodrag absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Trash2 size={14} />
      </button>

      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !rounded-full !border-2 !border-background !bg-muted-foreground/70"
      />

      <div className="flex items-center gap-3 p-3.5 pr-9">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.tile}`}
        >
          <Icon size={19} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {data.label}
          </p>
          <p
            className="mt-1 truncate text-sm font-semibold text-foreground"
            title={data.nodeName || data.label}
          >
            {data.nodeName || data.label}
          </p>
        </div>
      </div>

      <div className="border-t border-border/70 px-3.5 py-2">
        <p className="truncate text-[11px] text-muted-foreground" title={nodeSubtitle(data)}>
          {nodeSubtitle(data)}
        </p>
      </div>

      {isCondition && (
        <div className="flex items-center justify-between border-t border-border/70 px-3.5 py-1.5 text-[10px] font-semibold">
          <span className="text-rose-300">↓ Else</span>
          <span className="text-emerald-300">If match →</span>
        </div>
      )}

      {isCondition ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "50%", background: "#34d399" }}
            className="!size-3 !rounded-full !border-2 !border-background"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: "50%", background: "#fb7185" }}
            className="!size-3 !rounded-full !border-2 !border-background"
          />
        </>
      ) : hasSourceHandle ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-3 !rounded-full !border-2 !border-background !bg-primary"
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
  true: "If match",
  false: "Else",
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
  const label = EDGE_LABELS[branch];

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

function getUpstreamAgentVariables(
  nodes: FlowNode[],
  edges: Edge[],
  targetId: string,
): AgentVariable[] {
  const upstream = new Set<string>();
  const pending = [targetId];

  while (pending.length) {
    const current = pending.pop()!;
    for (const edge of edges) {
      if (edge.target === current && !upstream.has(edge.source)) {
        upstream.add(edge.source);
        pending.push(edge.source);
      }
    }
  }

  const result: AgentVariable[] = [];
  for (const node of nodes) {
    if (!upstream.has(node.id) || node.data.label !== "AI Agent") continue;
    result.push({
      name: "ai_response",
      token: "ai_response",
      type: "string",
      description: "Jawaban teks AI (format lama)",
    });

    for (const variable of node.data.outputVariables ?? []) {
      const name = variable.name.trim();

      if (!name) continue;

      if (variable.type === "array") {
        const field = variable.itemField?.trim() || "replies";

        result.push({
          name,
          token: `${name}.${field}`,
          type: "array",
          description:
            variable.description ||
            `List — setiap item menjadi satu bubble (${field})`,
          itemField: field,
        });

        continue;
      }

      result.push({
        name,
        token: name,
        type: variable.type,
        description: variable.description,
      });
    }
  }

  return result.filter(
    (variable, index) =>
      result.findIndex((item) => item.name === variable.name) === index,
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
}: {
  value: string;
  onChange: (value: string) => void;
  variables: AgentVariable[];
  rows?: number;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
      {variables.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Available values</p>
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
          Connect an AI Agent before this step and define its variables to see suggestions.
        </p>
      )}
    </div>
  );
}

export default function WorkflowEditor({
  workflowId,
  onBack,
}: WorkflowEditorProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showLibrary, setShowLibrary] = useState(false);
  const [draftData, setDraftData] = useState<AutomationNodeData | null>(null);
  const [agentTab, setAgentTab] = useState<"node" | "prompt" | "variables">("node");
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

        // Node Stopper lama diganti Go To dengan End flow aktif,
        // sehingga alurnya tetap sama tetapi tipe node lebih sederhana.
        const convertedStopperIds = new Set(
          loadedNodes
            .filter((node) => node.data.label === "Stopper")
            .map((node) => node.id),
        );

        const migratedNodes = loadedNodes.map((node) => {
          if (node.data.label !== "Stopper") return node;

          const outgoing = loadedEdges.find(
            (edge) => edge.source === node.id,
          );

          return {
            ...node,
            data: {
              ...node.data,
              label: "Go To" as NodeKind,
              nodeName: node.data.nodeName || "Continue from here",
              targetNodeId: outgoing?.target ?? "",
              endFlow: true,
              setStartingPoint: false,
            },
          };
        });

        const migratedEdges = loadedEdges.filter(
          (edge) => !convertedStopperIds.has(edge.source),
        );

        setNodes(migratedNodes);
        setEdges(migratedEdges);
        setSavedSnapshot(makeSnapshot(migratedNodes, migratedEdges));

        changeSelection(null);
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load workflow:", error);
        setNotice(getErrorMessage(error, "Workflow gagal dimuat. Coba lagi."));
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
  const booleanVariables = upstreamVariables.filter(
    (variable) => variable.type === "boolean",
  );
  const messageTemplate = String(inspectorData?.messageTemplate ?? "");
  const arrayBubbleVariable = upstreamVariables.find(
    (variable) =>
      variable.type === "array" &&
      messageTemplate.trim() === `{{${variable.token}}}`,
  );

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
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

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

  function addNode(label: NodeKind) {
    const id = `${label.toLowerCase().replaceAll(" ", "-")}-${crypto.randomUUID()}`;

    const defaults: Record<NodeKind, AutomationNodeData> = {
      Trigger: {
        label,
        nodeName: "Incoming message",
        description: "Start when a visitor sends a message",
        triggerType: "chat_message",
      },
      "AI Agent": {
        label,
        nodeName: "AI response",
        description: "Generate an AI response",
        systemMessage: "You are a helpful assistant.",
        variables: "customer_message",
        variableDefinitions: [
          {
            name: "customer_message",
            type: "string",
            description: "Message sent by the visitor",
            sourceValue: "input.message",
          },
        ],
        outputVariables: [
          {
            name: "respond",
            type: "string",
            description: "Jawaban AI yang dikirim ke pelanggan",
          },
        ],
        provider: "gemini",
        model: "gemini-3.8-flash",
        temperature: 0.7,
      },
      "Send Message": {
        label,
        nodeName: "Send message",
        description: "Send a message to the visitor",
        messageMode: "template",
        messageTemplate: "{{respond}}",
      },
      Condition: {
        label,
        nodeName: "Check condition",
        description: "Branch on a yes/no variable",
        conditionVariable: "",
      },
      "Go To": {
        label,
        nodeName: "Go to step",
        description: "Jump to another step",
        targetNodeId: "",
        endFlow: false,
        setStartingPoint: false,
      },
      Relocate: {
        label,
        nodeName: "Handoff to admin",
        description: "Escalate the conversation to a human",
      },
      Stopper: {
        label,
        nodeName: "Wait for next message",
        description: "Wait for the next customer message",
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
  }

  function updateNode(patch: Partial<AutomationNodeData>) {
    setDraftData((current) => (current ? { ...current, ...patch } : current));
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
    setNotice("Changes applied to the canvas. Save the workflow to keep them.");
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

  async function saveWorkflow(): Promise<boolean> {
    if (!workflowId) {
      setNotice("Simpan workflow melalui halaman Workflows terlebih dahulu.");
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
    setNotice("");

    try {
      await updateWorkflow(workflowId, { definition });
      setSavedSnapshot(makeSnapshot(nodesForSave, edges));
      setNodes(nodesForSave);
      changeSelection(null);
      setDraftData(null);
      setShowLibrary(false);
      setNotice("Workflow saved.");
      return true;
    } catch (error) {
      console.error("Failed to save workflow:", error);
      setNotice(getErrorMessage(error, "Workflow gagal disimpan. Coba lagi."));
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
            <span className="hidden sm:inline">All workflows</span>
          </button>

          <div className="h-8 w-px bg-muted" />

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {workflowName || "Workflow editor"}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Workflow canvas · {nodes.length} steps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <span className={`size-1.5 rounded-full ${isDirty ? "bg-amber-400" : "bg-emerald-400"}`} />
            {isLoading ? "Loading" : isDirty ? "Unsaved changes" : "Saved"}
          </span>
          <button
            type="button"
            onClick={() => void saveWorkflow()}
            disabled={isSaving || isLoading || !isDirty}
            className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save workflow"}
          </button>
        </div>
      </header>

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
            aria-label={showLibrary ? "Close node library" : "Open node library"}
          >
            {showLibrary ? <X size={15} /> : <ListPlus size={15} />}
            {showLibrary ? "Close library" : "Node library"}
          </button>
          {isLoading && (
            <div role="status" className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
              Loading workflow...
            </div>
          )}
          {!isLoading && !selectedNode && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 hidden items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg sm:flex">
              <MousePointer2 size={14} className="text-muted-foreground" />
              Drag between ports to connect steps · Select a node to configure it
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Builder</p>
                <h2 className="mt-2 text-base font-semibold text-foreground">Node library</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a step to add to your workflow.</p>
              </div>
              <button type="button" onClick={() => setShowLibrary(false)} aria-label="Close node library" className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-2">
              {nodeOptions.map(({ label, description, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => addNode(label)}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.045]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {label}
                    </span>
                    <span className="mt-1 block truncate text-[10px] leading-4 text-muted-foreground">
                      {description}
                    </span>
                  </span>

                  <Plus size={14} className="shrink-0 text-muted-foreground/70 group-hover:text-primary" />
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Webhook size={14} className="text-primary" />
                Chat Widget
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                The Trigger starts the workflow when a customer message arrives
                from the chat widget.
              </p>
            </div>
          </aside>
        )}
        {/* Node settings inspector */}

        {selectedNode && (
          <aside className="flex h-full max-h-full w-[min(420px,88vw)] max-w-[88vw] shrink-0 flex-col overflow-hidden border-l border-border bg-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Settings2 size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Node settings
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inspectorData?.label}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={saveNodeChanges}
                aria-label="Close node settings"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-6">
              {inspectorData?.label !== "AI Agent" && (
                <>
                  <label className="block">
                    <span className={labelClass}>Node name</span>
                    <input
                      className={inputClass}
                      value={String(inspectorData?.nodeName ?? inspectorData?.label ?? "")}
                      onChange={(event) => updateNode({ nodeName: event.target.value })}
                      placeholder="Give this node a name"
                      aria-label="Node name"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Description</span>
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
                      Incoming chat message
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Workflow dimulai saat pelanggan mengirim pesan.
                    </p>
                  </div>

                  <div className={`${panelClass} p-3.5`}>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquare size={16} className="text-primary" />
                      Customer message
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Pesan pelanggan otomatis tersedia di AI Agent sebagai{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                        {"{{customer_message}}"}
                      </code>{" "}
                      dan nama pengunjung sebagai{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                        {"{{customer_name}}"}
                      </code>
                      .
                    </p>
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Jika ada node Go To dengan &ldquo;Set starting point&rdquo;,
                    percakapan baru dimulai dari node tujuan tersebut, bukan
                    dari Trigger.
                  </p>
                </div>
              )}
              {inspectorData?.label === "AI Agent" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">AI Agent settings</p>
                    <div className="mt-4 grid grid-cols-3 rounded-lg border border-border bg-muted/40 p-1">
                      {([
                        ["node", "Node"],
                        ["prompt", "Prompt"],
                        ["variables", "Variables"],
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
                  <label className="block">
                    <span className={labelClass}>
                      <span className="inline-flex items-center gap-2">
                        <Bot size={15} className="text-violet-300" />
                        System Message
                      </span>
                    </span>
                    <textarea
                      rows={6}
                      className={inputClass}
                      placeholder="You are a helpful assistant..."
                      value={String(inspectorData?.systemMessage ?? "")}
                      onChange={(event) =>
                        updateNode({ systemMessage: event.target.value })
                      }
                    />
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                      Define the AI's role, instructions, tone, and constraints.
                    </span>
                  </label>
                  )}

                  {agentTab === "variables" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Variable size={15} className="text-primary" /> Output
                        variables
                      </span>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
                        onClick={addOutputVariable}
                      >
                        <Plus size={13} className="mr-1 inline" /> Add variable
                      </button>
                    </div>

                    <p className="text-xs leading-5 text-muted-foreground">
                      AI mengisi variabel ini otomatis. Text untuk Send Message,
                      Yes-No untuk Condition, dan List untuk beberapa bubble.
                    </p>

                    {(inspectorData?.outputVariables ?? []).map(
                      (variable, index) => (
                        <div
                          key={`output-variable-${index}`}
                          className={`${panelClass} space-y-3 p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Variable {index + 1}
                            </span>
                            <button
                              type="button"
                              aria-label="Remove variable"
                              onClick={() => removeOutputVariable(index)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <label className="block">
                            <span className={labelClass}>Name</span>
                            <input
                              className={inputClass}
                              value={variable.name}
                              onChange={(event) =>
                                updateOutputVariable(index, {
                                  name: event.target.value,
                                })
                              }
                              placeholder="respond"
                            />
                          </label>

                          <label className="block">
                            <span className={labelClass}>Type</span>
                            <select
                              className={inputClass}
                              value={variable.type}
                              onChange={(event) => {
                                const type = event.target.value as VariableType;

                                updateOutputVariable(index, {
                                  type,
                                  itemField:
                                    type === "array"
                                      ? variable.itemField || "replies"
                                      : variable.itemField,
                                });
                              }}
                            >
                              <option value="string">Text</option>
                              <option value="boolean">
                                Yes-No (Condition)
                              </option>
                              <option value="array">
                                List (multiple bubbles)
                              </option>
                            </select>
                          </label>

                          {variable.type === "array" && (
                            <label className="block">
                              <span className={labelClass}>
                                Nama sub-variabel
                              </span>
                              <input
                                className={inputClass}
                                value={variable.itemField ?? "replies"}
                                onChange={(event) =>
                                  updateOutputVariable(index, {
                                    itemField: event.target.value,
                                  })
                                }
                                placeholder="replies"
                              />
                              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                                Dipanggil di Send Message sebagai{" "}
                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                                  {`{{${variable.name || "respond"}.${variable.itemField || "replies"}}}`}
                                </code>
                                . Setiap item menjadi satu bubble.
                              </span>
                            </label>
                          )}

                          <label className="block">
                            <span className={labelClass}>Description</span>
                            <input
                              className={inputClass}
                              value={variable.description}
                              onChange={(event) =>
                                updateOutputVariable(index, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="Jawaban AI untuk pelanggan"
                            />
                            <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                              Deskripsi ini membantu AI memahami isi variabel.
                            </span>
                          </label>
                        </div>
                      ),
                    )}

                    <div className={`${panelClass} p-3.5`}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Contoh
                      </p>
                      <div className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
                        <p>
                          <code className="font-mono text-foreground">respond</code>{" "}
                          (Text) → dikirim lewat Send Message.
                        </p>
                        <p>
                          <code className="font-mono text-foreground">beli</code>{" "}
                          (Yes-No) → dipakai di Condition.
                        </p>
                        <p>
                          <code className="font-mono text-foreground">
                            respond
                          </code>{" "}
                          (List, sub-variabel{" "}
                          <code className="font-mono text-foreground">replies</code>
                          ) → beberapa bubble chat.
                        </p>
                      </div>
                    </div>
                  </div>
                  )}

                  {agentTab === "node" && <div className="space-y-5">
                    <label className="block">
                      <span className={labelClass}>Node name</span>
                      <input
                        className={inputClass}
                        value={String(inspectorData?.nodeName ?? "")}
                        onChange={(event) => updateNode({ nodeName: event.target.value })}
                        placeholder="e.g. Answer customer questions"
                      />
                    </label>

                    <div className={`${panelClass} p-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">AI model</p>
                          <p className="mt-1 text-xs text-muted-foreground">Gemini is the default provider.</p>
                        </div>
                        <span className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 text-xs font-medium text-primary">Gemini</span>
                      </div>
                      <select
                        className={inputClass}
                        value={String(inspectorData?.model ?? "gemini-3.8-flash")}
                        onChange={(event) => updateNode({ provider: "gemini", model: event.target.value })}
                      >
                        {geminiModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                        {!geminiModels.some((model) => model.id === inspectorData?.model) && inspectorData?.model && (
                          <option value={String(inspectorData.model)}>{String(inspectorData.model)}</option>
                        )}
                      </select>
                    </div>

                    <label className="block">
                      <span className={labelClass}>
                        Temperature:{" "}
                        {Number(inspectorData?.temperature ?? 0.7).toFixed(1)}
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
                        <span>More focused</span>
                        <span>More creative</span>
                      </span>
                    </label>
                  </div>}
                </div>
              )}
              {inspectorData?.label === "Send Message" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Message configuration
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Compose a static reply or use dynamic values.
                    </p>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Message</span>
                    <SmartValueTextarea
                      rows={6}
                      value={String(inspectorData?.messageTemplate ?? "")}
                      onChange={(value) => updateNode({ messageTemplate: value, messageMode: "smart_value" })}
                      variables={upstreamVariables}
                      placeholder="Hi {{customer_name}}, how can I help?"
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
                        "Your message preview will appear here."
                      )}
                    </p>
                  </div>

                  {arrayBubbleVariable && (
                    <p className="text-xs leading-5 text-primary">
                      List terdeteksi: setiap item akan dikirim sebagai bubble
                      chat terpisah.
                    </p>
                  )}

                  <p className="text-xs leading-5 text-muted-foreground">
                    Blue tokens are dynamic values provided by connected AI Agent nodes.
                  </p>
                </div>
              )}
              {inspectorData?.label === "Condition" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Condition
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Pilih variabel Yes-No dari AI Agent. Jika nilainya true,
                      alur masuk ke If match. Jika false, masuk ke Else.
                    </p>
                  </div>

                  {booleanVariables.length === 0 ? (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5 text-xs leading-5 text-amber-200">
                      Belum ada variabel boolean. Tambahkan variabel bertipe
                      Yes-No di AI Agent yang terhubung sebelum node ini.
                    </div>
                  ) : (
                    <label className="block">
                      <span className={labelClass}>Boolean variable</span>
                      <select
                        className={inputClass}
                        value={String(
                          inspectorData?.conditionVariable ?? "",
                        )}
                        onChange={(event) =>
                          updateNode({
                            conditionVariable: event.target.value,
                          })
                        }
                      >
                        <option value="">Pilih variabel…</option>
                        {booleanVariables.map((variable) => (
                          <option key={variable.name} value={variable.name}>
                            {`{{${variable.name}}}`}
                            {variable.description
                              ? ` — ${variable.description}`
                              : ""}
                          </option>
                        ))}
                      </select>
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                        Contoh: prompt AI menulis &ldquo;set beli=true jika
                        pelanggan ingin membeli&rdquo;, lalu variabel{" "}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                          beli
                        </code>{" "}
                        dipakai di sini.
                      </span>
                    </label>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                      <Check size={15} className="text-emerald-300" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">
                          If match
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Variabel bernilai true.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.05] p-3">
                      <X size={15} className="text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          Else
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Variabel bernilai false.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Hubungkan port hijau (If match) dan port merah (Else) ke
                    langkah berikutnya.
                  </p>
                </div>
              )}
              {inspectorData?.label === "Go To" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Go To
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Lompat ke node lain tanpa menggambar koneksi tambahan.
                    </p>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Node tujuan</span>
                    <select
                      className={inputClass}
                      value={String(inspectorData?.targetNodeId ?? "")}
                      onChange={(event) =>
                        updateNode({ targetNodeId: event.target.value })
                      }
                    >
                      <option value="">Pilih node tujuan…</option>
                      {nodes
                        .filter((node) => node.id !== selectedNodeId)
                        .map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.data.nodeName || node.data.label}
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
                        End flow
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        Berhenti dulu di node tujuan. Alur lanjut saat pelanggan
                        mengirim pesan lagi.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      checked={Boolean(inspectorData?.setStartingPoint)}
                      onChange={(event) =>
                        updateNode({
                          setStartingPoint: event.target.checked,
                        })
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        Set starting point
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        Percakapan baru dimulai dari node tujuan ini, bukan dari
                        Trigger.
                      </span>
                    </span>
                  </label>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Hanya satu Go To yang boleh memakai Set starting point, dan
                    node tujuan tidak boleh dirinya sendiri.
                  </p>
                </div>
              )}
              {inspectorData?.label === "Relocate" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-400/20 bg-teal-400/[0.06] p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-teal-200">
                      <Handshake size={17} /> Handoff to admin
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Saat alur masuk ke node ini, AI berhenti membalas.
                      Percakapan ditandai sudah ditangani admin manusia, dan
                      pesan pelanggan berikutnya tidak dijawab AI.
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Tempatkan Relocate di akhir alur, misalnya setelah Condition
                    mendeteksi pelanggan minta bantuan manusia.
                  </p>
                </div>
              )}
              {inspectorData?.label === "Stopper" && (
                <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-rose-200">
                    <CircleStop size={17} /> Pause point
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    This step pauses the workflow. When the customer sends another message, execution continues from the next connected step.
                  </p>
                </div>
              )}
              <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border bg-card pt-4 pb-1">
                <button
                  type="button"
                  onClick={cancelNodeChanges}
                  className={`${buttonClass} border border-border bg-muted/50 text-muted-foreground hover:bg-muted`}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNodeChanges}
                  className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}
                >
                  <Check size={14} /> Save changes
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
          Draft workflow
        </span>
        <span>
          {nodes.length} steps <span className="mx-2 text-muted-foreground/50">·</span>{" "}
          {edges.length} connections
        </span>
      </footer>

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground shadow-2xl shadow-black/50">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={13} /></span>
          <p className="flex-1 leading-5">{notice}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>
      )}

      {confirmLeave && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" className="w-full max-w-md rounded-2xl border border-border bg-[#14161b] p-6 shadow-2xl shadow-black/60">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Save size={18} /></div>
            <h2 id="unsaved-title" className="mt-4 text-lg font-semibold text-foreground">Unsaved workflow changes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">You have changes that are not saved yet. Save them before leaving?</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmLeave(false)} className={`${buttonClass} border border-border bg-muted/50 text-muted-foreground hover:bg-muted`}>Continue editing</button>
              <button type="button" disabled={isSaving} onClick={() => { setConfirmLeave(false); onBack(); }} className={`${buttonClass} border border-border bg-transparent text-muted-foreground hover:bg-muted/60`}>Leave without saving</button>
              <button type="button" disabled={isSaving || isLoading} onClick={() => void saveAndLeave()} className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary`}>
                {isSaving && <span className="size-4 animate-spin rounded-full border-2 border-ring/40 border-t-white" />}
                Save and leave
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
