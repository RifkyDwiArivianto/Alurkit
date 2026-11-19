import type { Edge, Node } from "@xyflow/react";

export const FLOW_KINDS = [
  "terminator",
  "process",
  "decision",
  "io",
  "document",
  "database",
  "subprocess",
  "connector",
  "note",
] as const;
export type FlowKind = (typeof FLOW_KINDS)[number];

export const FLOW_COLORS = ["default", "blue", "green", "amber", "rose", "violet"] as const;
export type FlowColor = (typeof FLOW_COLORS)[number];

export const EDGE_SHAPES = ["smoothstep", "step", "straight", "default"] as const;
export type EdgeShape = (typeof EDGE_SHAPES)[number];

/** Sisi tempat garis menempel: atas, kanan, bawah, kiri. */
export const HANDLE_IDS = ["t", "r", "b", "l"] as const;
export type HandleId = (typeof HANDLE_IDS)[number];

export type FlowNodeData = { kind: FlowKind; text: string; color: FlowColor };
export const FLOW_NODE_TYPE = "shape" as const;
export type FlowNode = Node<FlowNodeData, typeof FLOW_NODE_TYPE>;

export type FlowEdgeData = { dashed: boolean };
export type FlowEdge = Edge<FlowEdgeData>;

/** Satu jalur (baris) swimlane — mewakili peran atau departemen. */
export interface Lane {
  id: string;
  name: string;
  height: number;
}

export interface FlowchartDoc {
  title: string;
  lanes: Lane[];
  nodes: FlowNode[];
  edges: FlowEdge[];
}
