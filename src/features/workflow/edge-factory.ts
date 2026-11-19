import { newId } from "./ids";
import { BRANCH_HANDLES } from "./node-definitions";
import type { WorkflowEdge } from "./types";

interface EdgeInput {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** Satu-satunya tempat edge dibuat, supaya tampilan konsisten (koneksi baru, import, muat ulang). */
export function createEdge(p: EdgeInput): WorkflowEdge {
  const branch = BRANCH_HANDLES.find((h) => h.id === p.sourceHandle);
  return {
    id: p.id ?? newId("edge"),
    source: p.source,
    target: p.target,
    sourceHandle: p.sourceHandle ?? null,
    targetHandle: p.targetHandle ?? null,
    type: "smoothstep",
    markerEnd: { type: "arrowclosed", width: 16, height: 16, color: "#8a8174" },
    style: { strokeWidth: 1.5 },
    ...(branch && {
      label: branch.label,
      labelStyle: { fill: "#d6cdbd", fontSize: 11 },
      labelBgStyle: { fill: "#1a1714" },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
    }),
  };
}
