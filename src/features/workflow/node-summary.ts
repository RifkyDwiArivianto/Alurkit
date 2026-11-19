import { parseInputObject } from "./json";
import type { WorkflowNodeData } from "./types";

const OP_SYMBOL = { eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤" } as const;

function clip(s: string, n = 28) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}

/** Ringkasan satu baris dari konfigurasi node, ditampilkan di kartu node. */
export function summarizeNode(data: WorkflowNodeData): string {
  switch (data.kind) {
    case "start": {
      const r = parseInputObject(data.config.inputJson);
      return r.ok ? `Input: ${Object.keys(r.value).length} kunci` : "Input tidak valid";
    }
    case "setValue":
      return `${data.config.key || "?"} = ${clip(data.config.value)}`;
    case "transform": {
      const { operation, sourceKey, targetKey } = data.config;
      return `${operation}(${sourceKey || "?"}) → ${targetKey || "?"}`;
    }
    case "condition": {
      const { key, operator, value } = data.config;
      if (operator === "exists") return `${key || "?"} ada`;
      if (operator === "notExists") return `${key || "?"} tidak ada`;
      if (operator === "contains") return `${key || "?"} memuat ${clip(value, 16)}`;
      return `${key || "?"} ${OP_SYMBOL[operator]} ${clip(value, 16)}`;
    }
    case "delay":
      return `Tunda ${data.config.ms} ms`;
    case "output":
      return data.config.key ? `Tampilkan ${data.config.key}` : "Tampilkan seluruh data";
  }
}
