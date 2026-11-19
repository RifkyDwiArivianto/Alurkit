import { create } from "zustand";
import { useUiStore } from "@/stores/ui-store";
import {
  executeWorkflow,
  type ExecutionEvent,
  type ExecutionOutput,
  type NodeRunStatus,
} from "./engine/execute";
import { validateWorkflow, type ValidationIssue } from "./engine/validate";
import { formatValue } from "./json";
import { NODE_DEFINITIONS } from "./node-definitions";
import { useWorkflowStore } from "./store";

export type RunStatus = "idle" | "running" | "success" | "error" | "cancelled";
export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  id: number;
  time: number;
  level: LogLevel;
  message: string;
  nodeId?: string;
}

interface ExecutionState {
  status: RunStatus;
  nodeStatus: Record<string, NodeRunStatus>;
  logs: LogEntry[];
  outputs: ExecutionOutput[];
  durationMs: number | null;
  /** Hasil validasi langsung (diperbarui saat workflow berubah). */
  issues: ValidationIssue[];
  run: () => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

const MAX_LOGS = 500;
let logId = 0;
let controller: AbortController | null = null;

export const useExecutionStore = create<ExecutionState>()((set, get) => {
  const log = (level: LogLevel, message: string, nodeId?: string) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-(MAX_LOGS - 1)),
        { id: ++logId, time: Date.now(), level, message, ...(nodeId !== undefined && { nodeId }) },
      ],
    }));

  return {
    status: "idle",
    nodeStatus: {},
    logs: [],
    outputs: [],
    durationMs: null,
    issues: [],

    run: async () => {
      if (get().status === "running") return;
      const { nodes, edges } = useWorkflowStore.getState();
      const ui = useUiStore.getState();
      const labels = new Map(
        nodes.map((n) => [n.id, n.data.label.trim() || NODE_DEFINITIONS[n.data.kind].label]),
      );
      const nameOf = (id: string) => labels.get(id) ?? id;

      const issues = validateWorkflow(nodes, edges);
      set({ issues, logs: [], outputs: [], nodeStatus: {}, durationMs: null });
      ui.openLog("log");
      log("info", "Memeriksa workflow…");

      for (const w of issues.filter((i) => i.level === "warning")) log("warning", w.message, w.nodeId);
      const errors = issues.filter((i) => i.level === "error");
      if (errors.length > 0) {
        for (const e of errors) log("error", e.message, e.nodeId);
        log("error", `Validasi gagal: ${errors.length} error. Eksekusi tidak dijalankan.`);
        set({ status: "error" });
        return;
      }

      controller = new AbortController();
      set({ status: "running" });
      log("info", "Eksekusi dimulai");
      let sawNodeError = false;

      const onEvent = (e: ExecutionEvent) => {
        switch (e.type) {
          case "node-start":
            set((s) => ({ nodeStatus: { ...s.nodeStatus, [e.nodeId]: "running" } }));
            log("info", `▶ ${nameOf(e.nodeId)}`, e.nodeId);
            break;
          case "node-success":
            set((s) => ({ nodeStatus: { ...s.nodeStatus, [e.nodeId]: "success" } }));
            log("success", `✓ ${nameOf(e.nodeId)} (${e.durationMs} ms)${e.detail ? ` — ${e.detail}` : ""}`, e.nodeId);
            break;
          case "node-error":
            sawNodeError = true;
            set((s) => ({ nodeStatus: { ...s.nodeStatus, [e.nodeId]: "error" } }));
            log("error", `✗ ${nameOf(e.nodeId)}: ${e.message}`, e.nodeId);
            break;
          case "output": {
            const text = formatValue(e.value);
            log("info", `Output “${e.label}”: ${text.length > 120 ? `${text.slice(0, 119)}…` : text}`, e.nodeId);
            break;
          }
        }
      };

      const result = await executeWorkflow(nodes, edges, { signal: controller.signal, onEvent });
      controller = null;
      set({ status: result.status, outputs: result.outputs, durationMs: result.durationMs });

      if (result.status === "success") {
        log("success", `Selesai dalam ${result.durationMs} ms · ${result.outputs.length} output`);
        if (result.outputs.length > 0) useUiStore.getState().setLogTab("result");
      } else if (result.status === "cancelled") {
        log("warning", "Eksekusi dihentikan oleh pengguna");
      } else {
        if (!sawNodeError && result.error) log("error", result.error);
        log("error", "Eksekusi gagal");
      }
    },

    cancel: () => controller?.abort(),

    clear: () => {
      if (get().status === "running") return;
      set({ status: "idle", nodeStatus: {}, logs: [], outputs: [], durationMs: null });
    },
  };
});
