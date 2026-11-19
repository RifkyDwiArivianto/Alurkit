import type { NodeKind } from "./types";

export type OutputMode = "none" | "single" | "branch";

export interface NodeDefinition {
  kind: NodeKind;
  label: string;
  summary: string;
  accent: string;
  hasInput: boolean;
  output: OutputMode;
  /** Hanya boleh ada satu node jenis ini per workflow. */
  singleton?: boolean;
}

export const NODE_DEFINITIONS: Record<NodeKind, NodeDefinition> = {
  start: {
    kind: "start",
    label: "Start / Input",
    summary: "Titik awal dan data masukan workflow.",
    accent: "#5eead4",
    hasInput: false,
    output: "single",
    singleton: true,
  },
  setValue: {
    kind: "setValue",
    label: "Set Value",
    summary: "Menetapkan atau menimpa sebuah nilai.",
    accent: "#fbbf24",
    hasInput: true,
    output: "single",
  },
  transform: {
    kind: "transform",
    label: "Transform Data",
    summary: "Mengubah data dengan operasi terdaftar.",
    accent: "#a78bfa",
    hasInput: true,
    output: "single",
  },
  condition: {
    kind: "condition",
    label: "Condition / Branch",
    summary: "Mencabangkan alur berdasarkan kondisi.",
    accent: "#fb7185",
    hasInput: true,
    output: "branch",
  },
  delay: {
    kind: "delay",
    label: "Delay",
    summary: "Menunda alur selama durasi tertentu.",
    accent: "#7dd3fc",
    hasInput: true,
    output: "single",
  },
  output: {
    kind: "output",
    label: "Output",
    summary: "Menampilkan hasil akhir workflow.",
    accent: "#86efac",
    hasInput: true,
    output: "none",
  },
};

export const NODE_ORDER: NodeKind[] = [
  "start",
  "setValue",
  "transform",
  "condition",
  "delay",
  "output",
];

/** Handle keluaran node Condition. */
export const BRANCH_HANDLES = [
  { id: "true", label: "Ya" },
  { id: "false", label: "Tidak" },
] as const;
