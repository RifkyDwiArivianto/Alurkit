import { cloneContext, type DataContext, type JsonValue } from "../json";
import { NODE_DEFINITIONS } from "../node-definitions";
import type { WorkflowEdge, WorkflowNode } from "../types";
import {
  evaluateCondition,
  pickOutput,
  runSetValue,
  runStart,
  runTransform,
  WorkflowRuntimeError,
} from "./operations";

export type NodeRunStatus = "idle" | "running" | "success" | "error";

export type ExecutionEvent =
  | { type: "node-start"; nodeId: string }
  | { type: "node-success"; nodeId: string; durationMs: number; detail?: string }
  | { type: "node-error"; nodeId: string; message: string }
  | { type: "output"; nodeId: string; label: string; value: JsonValue };

export interface ExecutionOutput {
  nodeId: string;
  label: string;
  value: JsonValue;
}

export interface ExecutionResult {
  status: "success" | "error" | "cancelled";
  outputs: ExecutionOutput[];
  durationMs: number;
  error?: string;
}

export interface ExecuteOptions {
  signal?: AbortSignal;
  onEvent?: (event: ExecutionEvent) => void;
  /** Dapat diganti saat tes. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  maxSteps?: number;
}

export const DEFAULT_MAX_STEPS = 500;

export function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Dibatalkan", "AbortError"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Dibatalkan", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Menjalankan workflow dari node Start. Hanya operasi terdaftar yang dieksekusi
 * (tidak ada eval/Function). Validasi struktur dilakukan terpisah oleh `validateWorkflow`.
 */
export async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: ExecuteOptions = {},
): Promise<ExecutionResult> {
  const { signal, onEvent, sleep = defaultSleep, maxSteps = DEFAULT_MAX_STEPS } = options;
  const t0 = performance.now();
  const outputs: ExecutionOutput[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let steps = 0;

  const finish = (status: ExecutionResult["status"], error?: string): ExecutionResult => ({
    status,
    outputs,
    durationMs: Math.round(performance.now() - t0),
    ...(error !== undefined && { error }),
  });

  const start = nodes.find((n) => n.data.kind === "start");
  if (!start) return finish("error", "Tidak ada node Start.");

  async function run(node: WorkflowNode, input: DataContext | null): Promise<void> {
    if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
    if (++steps > maxSteps) throw new WorkflowRuntimeError(`Melebihi batas ${maxSteps} langkah eksekusi`);

    onEvent?.({ type: "node-start", nodeId: node.id });
    const t = performance.now();
    const label = node.data.label.trim() || NODE_DEFINITIONS[node.data.kind].label;
    let ctx: DataContext;
    let branch: "true" | "false" | null = null;
    let detail: string | undefined;

    try {
      const data = node.data;
      const current = input ?? cloneContext({});
      switch (data.kind) {
        case "start":
          ctx = runStart(data.config);
          break;
        case "setValue":
          ctx = runSetValue(data.config, current);
          detail = `${data.config.key} diatur`;
          break;
        case "transform":
          ctx = runTransform(data.config, current);
          detail = `${data.config.operation} → ${data.config.targetKey}`;
          break;
        case "condition": {
          const result = evaluateCondition(data.config, current);
          branch = result ? "true" : "false";
          ctx = current;
          detail = `kondisi ${result ? "benar (Ya)" : "salah (Tidak)"}`;
          break;
        }
        case "delay":
          await sleep(data.config.ms, signal);
          ctx = current;
          detail = `menunda ${data.config.ms} ms`;
          break;
        case "output": {
          const value = pickOutput(data.config, current);
          outputs.push({ nodeId: node.id, label, value });
          onEvent?.({ type: "output", nodeId: node.id, label, value });
          ctx = current;
          break;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const message = err instanceof Error ? err.message : "Kesalahan tak dikenal";
      onEvent?.({ type: "node-error", nodeId: node.id, message });
      throw new WorkflowRuntimeError(`${label}: ${message}`);
    }

    onEvent?.({
      type: "node-success",
      nodeId: node.id,
      durationMs: Math.round(performance.now() - t),
      ...(detail !== undefined && { detail }),
    });

    for (const edge of edges) {
      if (edge.source !== node.id) continue;
      if (branch !== null && edge.sourceHandle !== branch) continue;
      const next = byId.get(edge.target);
      if (next) await run(next, cloneContext(ctx));
    }
  }

  try {
    await run(start, null);
    return finish("success");
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return finish("cancelled");
    return finish("error", err instanceof Error ? err.message : "Kesalahan tak dikenal");
  }
}
