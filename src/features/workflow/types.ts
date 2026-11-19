import type { Edge, Node } from "@xyflow/react";
import type { ConfigByKind } from "./schemas";

export const NODE_KINDS = [
  "start",
  "setValue",
  "transform",
  "condition",
  "delay",
  "output",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

/** Data yang dibawa setiap node; `config` bergantung pada `kind`. */
export type WorkflowNodeData = {
  [K in NodeKind]: { kind: K; label: string; config: ConfigByKind[K] };
}[NodeKind];

export const WORKFLOW_NODE_TYPE = "workflow" as const;

export type WorkflowNode = Node<WorkflowNodeData, typeof WORKFLOW_NODE_TYPE>;
export type WorkflowEdge = Edge;
