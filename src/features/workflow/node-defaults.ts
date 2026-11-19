import type { ConfigByKind } from "./schemas";
import { NODE_DEFINITIONS } from "./node-definitions";
import type { NodeKind, WorkflowNodeData } from "./types";

export const DEFAULT_CONFIGS: { [K in NodeKind]: ConfigByKind[K] } = {
  start: { inputJson: '{\n  "nama": "Dunia"\n}' },
  setValue: { key: "pesan", valueType: "string", value: "Halo, {{nama}}!" },
  transform: { operation: "uppercase", sourceKey: "pesan", targetKey: "pesan", operand: "" },
  condition: { key: "pesan", operator: "exists", value: "" },
  delay: { ms: 500 },
  output: { key: "" },
};

export function createNodeData(kind: NodeKind): WorkflowNodeData {
  return {
    kind,
    label: NODE_DEFINITIONS[kind].label,
    config: structuredClone(DEFAULT_CONFIGS[kind]),
  } as WorkflowNodeData;
}
