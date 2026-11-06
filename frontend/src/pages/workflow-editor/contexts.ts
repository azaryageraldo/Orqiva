import { createContext } from "react";

export type EditorActions = {
  /** Opens the component library anchored below the given node. */
  requestAddFrom: (nodeId: string) => void;
  /** Leaf nodes that can accept a new step (no outgoing connection yet). */
  terminalNodeIds: Set<string>;
};

export const NodeActionsContext = createContext<
  ((nodeId: string) => void) | null
>(null);

export const EditorActionsContext = createContext<EditorActions | null>(null);
