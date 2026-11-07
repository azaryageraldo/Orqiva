import {
  useCallback,
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
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  MousePointer2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useI18n } from "@/lib/i18n";
import { edgeConnectionKey, tidyLayout } from "@/lib/workflowLayout";
import {
  getAiSettings,
  type AiModelOption,
  type AiProvider,
} from "../services/aiSettings";
import {
  getWorkflow,
  getWorkflowOptions,
  updateWorkflow,
} from "../services/workflow";
import type { WorkflowOption } from "../services/channel";
import { getErrorMessage } from "../services/api";

import AutomationNode from "./workflow-editor/AutomationNode";
import FlowEdge from "./workflow-editor/FlowEdge";
import NodeLibraryPanel from "./workflow-editor/NodeLibraryPanel";
import CanvasToolbar from "./workflow-editor/CanvasToolbar";
import EditorHeader from "./workflow-editor/EditorHeader";
import NodeInspector from "./workflow-editor/NodeInspector";
import {
  geminiModels,
  initialEdges,
  initialNodes,
  PROMPT_BUILTINS,
} from "./workflow-editor/nodeMeta";
import {
  EditorActionsContext,
  NodeActionsContext,
} from "./workflow-editor/contexts";
import type {
  AutomationNodeData,
  FlowNode,
  NodeKind,
  OutputVariable,
  ValidationIssue,
  AgentVariable,
  WorkflowDefinition,
  WorkflowEditorProps,
} from "./workflow-editor/types";

const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SMART_PATH_PATTERN =
  /^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

const APPENDABLE_LABELS: AutomationNodeData["label"][] = [
  "Trigger",
  "AI Agent",
  "Send Message",
];

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

export default function WorkflowEditor({
  workflowId,
  onBack,
}: WorkflowEditorProps) {
  const { t } = useI18n();
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
  const [blockMode, setBlockMode] = useState(false);
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
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [pendingAddPosition, setPendingAddPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingFit, setPendingFit] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const flowRef = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);

  const terminalNodeIds = useMemo<Set<string>>(() => {
    const sources = new Set(edges.map((edge) => edge.source));
    return new Set(
      nodes
        .filter((node) => APPENDABLE_LABELS.includes(node.data.label))
        .filter((node) => !sources.has(node.id))
        .map((node) => node.id),
    );
  }, [nodes, edges]);

  const requestAddFrom = useCallback(
    (nodeId: string) => {
      const parent = nodes.find((node) => node.id === nodeId);

      setAgentTab("node");
      setSelectedNodeId(null);
      setDraftData(null);
      setPendingParentId(nodeId);
      setPendingAddPosition(
        parent
          ? { x: parent.position.x, y: parent.position.y + 176 }
          : { x: 260, y: 80 },
      );
      setShowLibrary(true);
    },
    [nodes],
  );

  const editorActions = {
    requestAddFrom,
    terminalNodeIds,
  };

  useEffect(() => {
    if (!pendingFit) return;

    const frame = window.requestAnimationFrame(() => {
      const instance = flowRef.current;

      if (!instance) {
        setPendingFit(false);
        return;
      }

      void instance
        .fitView({ padding: 0.2, minZoom: 0.55, duration: 350 })
        .then(() => {
          const viewport = instance.getViewport();

          if (viewport.y < 72) {
            void instance.setViewport({ ...viewport, y: 72 });
          }

          setPendingFit(false);
        });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingFit]);

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
        setSelectedNodeIds(new Set());
        setPendingFit(true);

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
    const key = edgeConnectionKey(connection);

    if (edges.some((edge) => edgeConnectionKey(edge) === key)) {
      setNoticeTone("error");
      setNotice(tRef.current("editor.duplicateEdge"));
      return;
    }

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
  }, [edges]);

  const onSelectionChange = useCallback(
    (change: OnSelectionChangeParams<FlowNode, Edge>) => {
      const nodeIds = new Set(
        change.nodes.map((selection) => selection.id),
      );
      setSelectedNodeIds(nodeIds);
    },
    [],
  );

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
      position:
        pendingAddPosition !== null
          ? pendingAddPosition
          : {
              x: 260 + (nodes.length % 2) * 320,
              y: 80 + nodes.length * 150,
            },
      data: defaults[label],
    };

    setNodes((current) => [...current, newNode]);

    if (pendingParentId) {
      setEdges((current) => [
        ...current,
        {
          id: `edge-${crypto.randomUUID()}`,
          source: pendingParentId,
          target: id,
          type: "flow",
          animated: false,
        },
      ]);
    }

    setDraftData({ ...newNode.data });
    changeSelection(id);
    setShowLibrary(false);
    setPendingParentId(null);
    setPendingAddPosition(null);
    setNotice("");
    setValidationIssues([]);
  }

  function tidyCanvas() {
    const result = tidyLayout(nodes, edges);

    setNodes(result.nodes);
    setEdges(result.edges);
    setNoticeTone("success");
    setNotice(
      result.removedEdges > 0
        ? t("editor.tidyNotice", { count: result.removedEdges })
        : t("editor.tidyClean"),
    );
    setPendingFit(true);
  }

  function deleteSelectedNodes() {
    setNodes((current) =>
      current.filter((node) => !selectedNodeIds.has(node.id)),
    );
    setEdges((current) =>
      current.filter(
        (edge) =>
          !selectedNodeIds.has(edge.source) &&
          !selectedNodeIds.has(edge.target),
      ),
    );
    setSelectedNodeIds(new Set());
    setDraftData(null);
    changeSelection(null);
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
    setSelectedNodeIds((current) => {
      if (!current.has(nodeId)) return current;

      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
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
      <EditorHeader
        workflowName={workflowName}
        onBack={requestBack}
        isDirty={isDirty}
        isSaving={isSaving}
        isLoading={isLoading}
        onSave={() => void saveWorkflow()}
      />

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
      <div className="relative flex h-0 min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
          <CanvasToolbar
            blockMode={blockMode}
            selectedCount={selectedNodeIds.size}
            isLoading={isLoading}
            isDisabled={nodes.length === 0}
            onTidy={tidyCanvas}
            onToggleBlockMode={() => setBlockMode((prev) => !prev)}
            onDeleteSelected={deleteSelectedNodes}
          />
          <button
            type="button"
            onClick={() => {
              if (showLibrary) {
                setShowLibrary(false);
                setPendingParentId(null);
                setPendingAddPosition(null);
              } else {
                if (selectedNode) saveNodeChanges();
                setPendingParentId(null);
                setPendingAddPosition(null);
                setShowLibrary(true);
              }
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center size-9 rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg backdrop-blur transition hover:bg-primary/90"
            aria-expanded={showLibrary}
            aria-label={showLibrary ? t("editor.closeLibrary") : t("editor.openLibrary")}
            title={showLibrary ? t("editor.closeLibrary") : t("editor.openLibrary")}
          >
            {showLibrary ? <X size={15} /> : <Plus size={16} />}
          </button>
          {isLoading && (
            <div role="status" className="absolute left-4 top-14 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
              {t("editor.loadingWorkflow")}
            </div>
          )}
          {!isLoading && !selectedNode && !showLibrary && (
            <div className="pointer-events-none absolute left-16 bottom-4 z-10 hidden items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg sm:flex">
              <MousePointer2 size={14} className="text-muted-foreground" />
              {t("editor.canvasHint")}
            </div>
          )}

          <EditorActionsContext.Provider value={editorActions}>
          <NodeActionsContext.Provider value={removeNode}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ automation: AutomationNode }}
            edgeTypes={{ flow: FlowEdge }}
            defaultEdgeOptions={{
              type: "flow",
              animated: false,
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            onNodeClick={(_, node) => selectNode(node as FlowNode)}
            onPaneClick={() => {
              if (selectedNode) saveNodeChanges();
              if (showLibrary) {
                setShowLibrary(false);
                setPendingParentId(null);
                setPendingAddPosition(null);
              }
            }}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            panOnDrag={!blockMode}
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
          </EditorActionsContext.Provider>
        </div>

        {/* Right-side node library slide-over */}
        <NodeLibraryPanel
          key={showLibrary ? "open" : "closed"}
          open={showLibrary}
          onClose={() => {
            setShowLibrary(false);
            setPendingParentId(null);
            setPendingAddPosition(null);
          }}
          onAdd={addNode}
          parentNodeId={pendingParentId}
        />
        {/* Node settings inspector */}
        {selectedNode && (
          <NodeInspector
            inspectorData={inspectorData}
            updateNode={updateNode}
            saveNodeChanges={saveNodeChanges}
            cancelNodeChanges={cancelNodeChanges}
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
            deleteOutputVariable={removeOutputVariable}
            upstreamVariables={upstreamVariables}
            arrayBubbleVariable={Boolean(arrayBubbleVariable)}
            booleanVariables={booleanVariables}
            goToWorkflowOptions={goToWorkflowOptions}
            currentWorkflowId={currentWorkflowId}
            selectedNodeId={selectedNodeId}
            selectedGoToWorkflowId={selectedGoToWorkflowId}
            goToTargetNodes={goToTargetNodes}
          />
        )}
      </div>

      {/* Editor footer */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 text-xs text-muted-foreground">
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

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={(open) => {
          if (!open && !isSaving) setConfirmLeave(false);
        }}
        tone="warning"
        title={t("editor.unsavedTitle")}
        description={t("editor.unsavedHint")}
        cancelLabel={t("editor.continueEditing")}
        confirmLabel={isSaving ? t("editor.saving") : t("editor.saveLeave")}
        confirmVariant="default"
        loading={isSaving || isLoading}
        onConfirm={() => void saveAndLeave()}
        secondaryAction={{
          label: t("editor.discardLeave"),
          onClick: () => {
            setConfirmLeave(false);
            onBack();
          },
          variant: "outline",
        }}
      />
    </section>
  );
}
