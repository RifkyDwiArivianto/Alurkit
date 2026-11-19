import { newId } from "@/features/workflow/ids";
import type { EdgeShape, FlowEdge, HandleId } from "./types";

interface FlowEdgeInput {
  id?: string;
  source: string;
  target: string;
  sourceHandle: HandleId;
  targetHandle: HandleId;
  label?: string;
  shape?: EdgeShape;
  dashed?: boolean;
}

/** Satu-satunya tempat edge flowchart dibuat, supaya gaya konsisten (koneksi baru, import, ubah gaya). */
export function createFlowEdge(p: FlowEdgeInput): FlowEdge {
  const dashed = p.dashed ?? false;
  return {
    id: p.id ?? newId("fe"),
    source: p.source,
    target: p.target,
    sourceHandle: p.sourceHandle,
    targetHandle: p.targetHandle,
    type: p.shape ?? "smoothstep",
    data: { dashed },
    markerEnd: { type: "arrowclosed", width: 18, height: 18, color: "#8a8174" },
    style: { strokeWidth: 1.6, ...(dashed && { strokeDasharray: "6 4" }) },
    ...(p.label ? {
      label: p.label,
      labelStyle: { fill: "#d6cdbd", fontSize: 12 },
      labelBgStyle: { fill: "#141210" },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
    } : {}),
  };
}

export function connectionKey(e: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) {
  return `${e.source}:${e.sourceHandle ?? ""}>${e.target}:${e.targetHandle ?? ""}`;
}
