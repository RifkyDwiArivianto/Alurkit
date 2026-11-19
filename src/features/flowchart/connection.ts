import { connectionKey } from "./edge-factory";
import { HANDLE_IDS, type FlowEdge, type FlowNode } from "./types";

interface ConnLike {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

const isHandle = (h: string | null | undefined) => HANDLE_IDS.some((x) => x === h);

/** Aturan koneksi flowchart: node harus ada, tidak ke diri sendiri, sisi valid, tidak ganda. */
export function canConnectFlow(c: ConnLike, nodes: FlowNode[], edges: FlowEdge[]): boolean {
  if (c.source === c.target) return false;
  if (!isHandle(c.sourceHandle) || !isHandle(c.targetHandle)) return false;
  if (!nodes.some((n) => n.id === c.source) || !nodes.some((n) => n.id === c.target)) return false;
  const key = connectionKey(c);
  return !edges.some((e) => connectionKey(e) === key);
}
