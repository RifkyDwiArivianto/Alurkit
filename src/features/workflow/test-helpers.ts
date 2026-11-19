import { createNodeData } from "./node-defaults";
import type { ConfigByKind } from "./schemas";
import type { NodeKind, WorkflowEdge, WorkflowNode, WorkflowNodeData } from "./types";

export function makeNode<K extends NodeKind>(
  kind: K,
  id: string,
  config?: Partial<ConfigByKind[K]>,
): WorkflowNode {
  const base = createNodeData(kind);
  const data = { ...base, config: { ...base.config, ...config } } as WorkflowNodeData;
  return { id, type: "workflow", position: { x: 0, y: 0 }, data };
}

export function makeEdge(source: string, target: string, sourceHandle: string | null = null): WorkflowEdge {
  return { id: `${source}-${sourceHandle ?? "out"}-${target}`, source, target, sourceHandle };
}
