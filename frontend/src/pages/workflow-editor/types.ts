import type { Edge, Node } from "@xyflow/react";

export type NodeKind =
  | "Trigger"
  | "AI Agent"
  | "Send Message"
  | "Condition"
  | "Go To"
  | "Relocate"
  | "Stopper";

export type MessageMode = "template" | "smart_value";
export type VariableType = "string" | "boolean" | "array";
export type AgentVerbosity = "concise" | "balanced" | "detailed";

export type OutputVariable = {
  name: string;
  type: VariableType;
  description: string;
  itemField?: string;
};

export type AutomationNodeData = {
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

export type FlowNode = Node<AutomationNodeData>;

export type ValidationIssue = {
  nodeId?: string;
  title: string;
  message: string;
  fix: string;
};

export type WorkflowDefinition = {
  nodes: Array<{
    id: string;
    type: NodeKind;
    position: { x: number; y: number };
    data: AutomationNodeData;
  }>;
  edges: Edge[];
};

export type WorkflowEditorProps = {
  workflowId?: string;
  onBack: () => void;
};

export type AgentVariable = {
  name: string;
  token: string;
  type: string;
  description: string;
  itemField?: string;
};

export type LibraryCategory = "trigger" | "action" | "condition";
