import type { Edge } from "@xyflow/react";
import {
  ArrowBendUpRight,
  ChatCircleDots,
  GitFork,
  Handshake,
  Lightning,
  PauseCircle,
  Robot,
  SquaresFour,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import type {
  AutomationNodeData,
  FlowNode,
  LibraryCategory,
  NodeKind,
} from "./types";

export type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export type NodeStyle = {
  icon: PhosphorIcon;
  /** Icon tile background + text colour. */
  tile: string;
  /** Thin gradient bar on top of the card. */
  accent: string;
  /** Small uppercase type badge. */
  badge: string;
  /** Handle fill colour. */
  handle: string;
};

export const NODE_STYLES: Record<NodeKind, NodeStyle> = {
  Trigger: {
    icon: Lightning,
    tile: "bg-amber-400/15 text-amber-300",
    accent: "from-amber-400/90 via-amber-400/35 to-transparent",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    handle: "#fbbf24",
  },
  "AI Agent": {
    icon: Robot,
    tile: "bg-violet-400/15 text-violet-200",
    accent: "from-violet-400/90 via-violet-400/35 to-transparent",
    badge: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    handle: "#a78bfa",
  },
  "Send Message": {
    icon: ChatCircleDots,
    tile: "bg-primary/15 text-primary",
    accent: "from-primary via-primary/35 to-transparent",
    badge: "border-primary/25 bg-primary/10 text-primary",
    handle: "var(--primary)",
  },
  Condition: {
    icon: GitFork,
    tile: "bg-orange-400/15 text-orange-300",
    accent: "from-orange-400/90 via-orange-400/35 to-transparent",
    badge: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    handle: "#fb923c",
  },
  "Go To": {
    icon: ArrowBendUpRight,
    tile: "bg-sky-400/15 text-sky-300",
    accent: "from-sky-400/90 via-sky-400/35 to-transparent",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    handle: "#38bdf8",
  },
  Relocate: {
    icon: Handshake,
    tile: "bg-teal-400/15 text-teal-300",
    accent: "from-teal-400/90 via-teal-400/35 to-transparent",
    badge: "border-teal-400/25 bg-teal-400/10 text-teal-300",
    handle: "#2dd4bf",
  },
  Stopper: {
    icon: PauseCircle,
    tile: "bg-rose-400/15 text-rose-300",
    accent: "from-rose-400/90 via-rose-400/35 to-transparent",
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    handle: "#fb7185",
  },
};

export const nodeOptions: {
  label: NodeKind;
  descriptionKey: string;
  icon: PhosphorIcon;
}[] = [
  {
    label: "Trigger",
    descriptionKey: "editor.node.triggerDesc",
    icon: Lightning,
  },
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

export const LIBRARY_GROUPS: Array<{
  key: LibraryCategory;
  titleKey: string;
  descriptionKey: string;
  icon: PhosphorIcon;
  tone: string;
  labels: NodeKind[];
}> = [
  {
    key: "trigger",
    titleKey: "editor.addTrigger",
    descriptionKey: "editor.addTriggerDesc",
    icon: Lightning,
    tone: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    labels: ["Trigger"],
  },
  {
    key: "action",
    titleKey: "editor.addAction",
    descriptionKey: "editor.addActionDesc",
    icon: SquaresFour,
    tone: "border-primary/25 bg-primary/10 text-primary",
    labels: ["AI Agent", "Send Message", "Go To", "Relocate", "Stopper"],
  },
  {
    key: "condition",
    titleKey: "editor.addCondition",
    descriptionKey: "editor.addConditionDesc",
    icon: GitFork,
    tone: "border-orange-400/25 bg-orange-400/10 text-orange-300",
    labels: ["Condition"],
  },
];

export const PROMPT_BUILTINS = [
  {
    token: "customer_message",
    descriptionKey: "editor.token.customerMessage",
  },
  { token: "customer_name", descriptionKey: "editor.token.customerName" },
];

export const geminiModels = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash · Recommended" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export const initialNodes: FlowNode[] = [
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

export const initialEdges: Edge[] = [
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

export function createNodeData(
  label: NodeKind,
  t: Translate,
  model: { provider: string; id: string },
): AutomationNodeData {
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
      provider: model.provider,
      model: model.id,
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

  return defaults[label];
}
