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
  GitBranch,
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

type NodeKind =
  | "Trigger"
  | "AI Agent"
  | "Send Message"
  | "Condition"
  | "Stopper";
type MessageMode = "template" | "smart_value";

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
  provider?: string;
  model?: string;
  temperature?: number;
  messageMode?: MessageMode;
  messageTemplate?: string;
  conditionVariable?: string;
  conditionOperator?: string;
  conditionValue?: string;
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
  { label: "AI Agent", description: "Generate an AI response", icon: Bot },
  {
    label: "Send Message",
    description: "Reply to the visitor",
    icon: MessageSquare,
  },
  {
    label: "Condition",
    description: "Branch using a rule",
    icon: GitBranch,
  },
  {
    label: "Stopper",
    description: "Wait for the next customer message",
    icon: CircleStop,
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
      messageTemplate: "{{ai_response}}",
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
  Stopper: CircleStop,
};

const NODE_TONES: Record<NodeKind, { tile: string }> = {
  Trigger: { tile: "bg-amber-400/15 text-amber-300" },
  "AI Agent": { tile: "bg-violet-400/15 text-violet-300" },
  "Send Message": { tile: "bg-primary/15 text-primary" },
  Condition: { tile: "bg-orange-400/15 text-orange-300" },
  Stopper: { tile: "bg-rose-400/15 text-rose-300" },
};

function nodeSubtitle(data: AutomationNodeData): string {
  switch (data.label) {
    case "Trigger":
      return "Starts from an incoming message";
    case "AI Agent":
      return [data.provider ? "Gemini" : null, data.model]
        .filter(Boolean)
        .join(" · ");
    case "Send Message":
      return data.messageMode === "smart_value"
        ? "Smart value reply"
        : "Template reply";
    case "Condition": {
      const rule = [
        data.conditionVariable,
        data.conditionOperator,
        data.conditionValue,
      ]
        .filter(Boolean)
        .join(" ");
      return rule || "No rule configured";
    }
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
  const isStopper = data.label === "Stopper";

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
      ) : isStopper ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-3 !rounded-full !border-2 !border-background !bg-rose-400"
        />
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-3 !rounded-full !border-2 !border-background !bg-primary"
        />
      )}
    </div>
  );
}

const EDGE_CHIPS: Record<string, string> = {
  true: "border-emerald-400/40 bg-card text-emerald-300",
  false: "border-rose-400/40 bg-card text-rose-300",
};

const EDGE_LABELS: Record<string, string> = {
  true: "True",
  false: "False",
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
  type: string;
  description: string;
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
      type: "string",
      description: "The response generated by this AI Agent",
    });
    const definitions = node.data.variableDefinitions ?? [];
    const vars = definitions.length
      ? definitions
      : String(node.data.variables ?? "")
          .split("\n")
          .filter(Boolean)
          .map((name) => ({ name, type: "string", description: "" }));

    for (const variable of vars) {
      if (variable.name.trim()) {
        result.push({ ...variable, name: variable.name.trim() });
      }
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
                key={variable.name}
                type="button"
                onClick={() => insertVariable(variable.name)}
                title={variable.description || variable.type}
                className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-xs text-primary transition hover:border-primary/40 hover:bg-primary/15"
              >
                {`{{${variable.name}}}`}
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

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setSavedSnapshot(makeSnapshot(loadedNodes, loadedEdges));

        changeSelection(null);
      } catch (error) {
        if (cancelled) return;

        console.error("Failed to load workflow:", error);
        setNotice("Workflow gagal dimuat. Periksa koneksi API dan coba lagi.");
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
        provider: "gemini",
        model: "gemini-3.8-flash",
        temperature: 0.7,
      },
      "Send Message": {
        label,
        nodeName: "Send message",
        description: "Send a message to the visitor",
        messageMode: "template",
        messageTemplate: "Hello! How can I help you?",
      },
      Condition: {
        label,
        nodeName: "Check condition",
        description: "Evaluate a condition",
        conditionVariable: "",
        conditionOperator: "equals",
        conditionValue: "true",
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
      setNotice("Workflow gagal disimpan. Periksa koneksi API dan coba lagi.");
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
                      Trigger configuration
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Define what starts this workflow.
                    </p>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Trigger event</span>
                    <select
                      className={inputClass}
                      value={String(
                        inspectorData?.triggerType ?? "chat_message",
                      )}
                      onChange={(event) =>
                        updateNode({ triggerType: event.target.value })
                      }
                    >
                      <option value="chat_message">
                        Incoming chat message
                      </option>
                      <option value="conversation_started">
                        Conversation started
                      </option>
                    </select>
                  </label>

                  <div className={`${panelClass} p-3.5`}>
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MessageSquare size={16} className="text-primary" />
                      Website Chat Widget
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Incoming visitor messages will be passed to the workflow
                      runtime after the chat widget and backend integration are
                      connected.
                    </p>
                  </div>
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

                  {agentTab === "variables" && <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Variable size={15} className="text-primary" />{" "}
                        Variables
                      </span>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
                        onClick={() =>
                          updateNode({
                            variableDefinitions: [
                              ...(inspectorData?.variableDefinitions ?? []),
                              {
                                name: "",
                                type: "string",
                                description: "",
                                sourceValue: "",
                              },
                            ],
                          })
                        }
                      >
                        <Plus size={13} className="mr-1 inline" /> Add variable
                      </button>
                    </div>
                    {(
                      inspectorData?.variableDefinitions ??
                      String(inspectorData?.variables ?? "")
                        .split("\n")
                        .filter(Boolean)
                        .map((name) => ({
                          name,
                          type: "string",
                          description: "",
                          sourceValue: "",
                        }))
                    ).map((variable, index) => {
                      const vars = inspectorData?.variableDefinitions ?? [];
                      const updateVariable = (
                        patch: Partial<typeof variable>,
                      ) => {
                        const current = vars.length
                          ? vars
                          : String(inspectorData?.variables ?? "")
                              .split("\n")
                              .filter(Boolean)
                              .map((name) => ({
                                name,
                                type: "string",
                                description: "",
                                sourceValue: "",
                              }));
                        updateNode({
                          variableDefinitions: current.map((item, i) =>
                            i === index ? { ...item, ...patch } : item,
                          ),
                          variables: current
                            .map((item, i) =>
                              i === index
                                ? String(patch.name ?? item.name)
                                : item.name,
                            )
                            .join("\n"),
                        });
                      };
                      return (
                        <div
                          key={`variable-${index}`}
                          className={`${panelClass} space-y-3 p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Variable {index + 1}
                            </span>
                            <button
                              type="button"
                              aria-label="Remove variable"
                              onClick={() =>
                                updateNode({
                                  variableDefinitions: (
                                    inspectorData?.variableDefinitions ?? []
                                  ).filter((_, i) => i !== index),
                                  variables: (
                                    inspectorData?.variableDefinitions ?? []
                                  )
                                    .filter((_, i) => i !== index)
                                    .map((item) => item.name)
                                    .join("\n"),
                                })
                              }
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
                                updateVariable({ name: event.target.value })
                              }
                              placeholder="customer_name"
                            />
                          </label>
                          <label className="block">
                            <span className={labelClass}>Data type</span>
                            <select
                              className={inputClass}
                              value={variable.type}
                              onChange={(event) =>
                                updateVariable({ type: event.target.value })
                              }
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="object">Object</option>
                              <option value="array">Array</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className={labelClass}>Description</span>
                            <input
                              className={inputClass}
                              value={variable.description}
                              onChange={(event) =>
                                updateVariable({
                                  description: event.target.value,
                                })
                              }
                              placeholder="What this variable contains"
                            />
                          </label>
                          <label className="block">
                            <span className={labelClass}>Source value</span>
                            <input
                              className={inputClass}
                              value={variable.sourceValue}
                              onChange={(event) =>
                                updateVariable({
                                  sourceValue: event.target.value,
                                })
                              }
                              placeholder="input.customer_name"
                            />
                          </label>
                        </div>
                      );
                    })}
                    <p className="text-xs leading-5 text-muted-foreground">
                      Give each variable a clear name and type. Connected Send
                      Message and Condition nodes can use these values.
                    </p>
                  </div>}

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

                  <p className="text-xs leading-5 text-muted-foreground">
                    Blue tokens are dynamic values provided by connected AI Agent nodes.
                  </p>
                </div>
              )}
              {inspectorData?.label === "Condition" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Condition rule
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Choose what value should be checked before branching.
                    </p>
                  </div>

                  <label className="block">
                    <span className="flex items-center justify-between gap-2">
                      <span className={labelClass}>Boolean smart value</span>
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">SMART VALUE</span>
                    </span>
                    <select
                      className={inputClass}
                      value={String(inspectorData?.conditionVariable ?? booleanVariables[0]?.name ?? "")}
                      onChange={(event) =>
                        updateNode({ conditionVariable: event.target.value })
                      }
                      disabled={booleanVariables.length === 0}
                    >
                      {booleanVariables.length === 0 ? (
                        <option value="">No connected boolean variables</option>
                      ) : booleanVariables.map((variable) => (
                        <option key={variable.name} value={variable.name}>{`{{${variable.name}}}`}</option>
                      ))}
                    </select>
                    {String(inspectorData?.conditionVariable ?? booleanVariables[0]?.name ?? "") && (
                      <span className="mt-2 inline-flex rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-xs text-primary">
                        {`{{${String(inspectorData?.conditionVariable ?? booleanVariables[0]?.name)}}}`}
                      </span>
                    )}
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">Select a boolean variable from a connected AI Agent.</span>
                  </label>

                  <label className="block">
                    <span className={labelClass}>Operator</span>
                    <select
                      className={inputClass}
                      value={String(inspectorData?.conditionOperator) === "not_equals" ? "not_equals" : "equals"}
                      onChange={(event) =>
                        updateNode({ conditionOperator: event.target.value })
                      }
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Does not equal</option>
                    </select>
                  </label>

                  {!["is_empty", "is_not_empty"].includes(
                    String(inspectorData?.conditionOperator),
                  ) && (
                    <label className="block">
                      <span className="flex items-center justify-between gap-2">
                        <span className={labelClass}>Compare value</span>
                        <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">BOOLEAN</span>
                      </span>
                      <select
                        className={inputClass}
                        value={String(inspectorData?.conditionValue ?? "true")}
                        onChange={(event) => updateNode({ conditionValue: event.target.value })}
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    </label>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                      <Check size={15} className="text-emerald-300" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">
                          True
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Rule matches.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.05] p-3">
                      <X size={15} className="text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-destructive">
                          False
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Rule does not match.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Connect the True and False outputs to the steps for each result.
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
