import { BRANCH_HANDLES, NODE_DEFINITIONS } from "./node-definitions";
import type { WorkflowEdge, WorkflowNode } from "./types";

export interface ConnectionLike {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Aturan koneksi dasar (struktural). Deteksi siklus dan validasi alur
 * penuh dikerjakan di Tahap 4.
 */
export function canConnect(
  c: ConnectionLike,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): boolean {
  if (c.source === c.target) return false;

  const source = nodes.find((n) => n.id === c.source);
  const target = nodes.find((n) => n.id === c.target);
  if (!source || !target) return false;

  const s = NODE_DEFINITIONS[source.data.kind];
  const t = NODE_DEFINITIONS[target.data.kind];
  if (s.output === "none" || !t.hasInput) return false;

  const handle = c.sourceHandle ?? null;
  const handleOk =
    s.output === "branch"
      ? BRANCH_HANDLES.some((h) => h.id === handle)
      : handle === null;
  if (!handleOk) return false;

  return !edges.some(
    (e) =>
      e.source === c.source &&
      e.target === c.target &&
      (e.sourceHandle ?? null) === handle,
  );
}
