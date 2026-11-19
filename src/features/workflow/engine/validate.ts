import { canConnect } from "../connection-rules";
import { NODE_DEFINITIONS } from "../node-definitions";
import { validateConfig } from "../schemas";
import type { WorkflowEdge, WorkflowNode } from "../types";

export interface ValidationIssue {
  level: "error" | "warning";
  nodeId?: string;
  message: string;
}

/** Mengembalikan true jika graf (hanya dari node yang ada) memuat siklus. */
export function findCycleNodeIds(nodes: WorkflowNode[], edges: WorkflowEdge[]): Set<string> {
  const ids = new Set(nodes.map((n) => n.id));
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
  }
  const state = new Map<string, 1 | 2>(); // 1 = sedang dikunjungi, 2 = selesai
  const inCycle = new Set<string>();

  const visit = (id: string, stack: string[]) => {
    state.set(id, 1);
    stack.push(id);
    for (const next of adj.get(id) ?? []) {
      const s = state.get(next);
      if (s === 1) {
        for (const n of stack.slice(stack.indexOf(next))) inCycle.add(n);
      } else if (s === undefined) {
        visit(next, stack);
      }
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const n of nodes) if (!state.has(n.id)) visit(n.id, []);
  return inCycle;
}

export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const name = (n: WorkflowNode) => n.data.label.trim() || NODE_DEFINITIONS[n.data.kind].label;
  const error = (message: string, nodeId?: string) => issues.push({ level: "error", message, nodeId });
  const warn = (message: string, nodeId?: string) => issues.push({ level: "warning", message, nodeId });

  if (nodes.length === 0) {
    error("Workflow kosong. Tambahkan node Start dan Output.");
    return issues;
  }

  const starts = nodes.filter((n) => n.data.kind === "start");
  if (starts.length === 0) error("Workflow harus memiliki satu node Start.");
  if (starts.length > 1) error("Workflow hanya boleh memiliki satu node Start.");
  if (!nodes.some((n) => n.data.kind === "output")) error("Workflow harus memiliki minimal satu node Output.");

  // Koneksi: referensi hilang atau melanggar aturan struktural
  const seen: WorkflowEdge[] = [];
  for (const e of edges) {
    if (!canConnect(e, nodes, seen)) {
      error(`Koneksi tidak valid: ${e.source} → ${e.target}`);
    } else {
      seen.push(e);
    }
  }

  // Konfigurasi node
  for (const n of nodes) {
    if (n.data.label.trim() === "") error("Nama node tidak boleh kosong.", n.id);
    const errs = validateConfig(n.data.kind, n.data.config);
    for (const msg of Object.values(errs)) error(`${name(n)}: ${msg}`, n.id);
  }

  // Siklus
  for (const id of findCycleNodeIds(nodes, edges)) {
    const n = nodes.find((x) => x.id === id);
    if (n) error(`${name(n)} berada dalam siklus (loop tidak didukung).`, id);
  }

  // Keterjangkauan dari Start
  const start = starts[0];
  if (start && starts.length === 1) {
    const reach = new Set<string>([start.id]);
    const queue = [start.id];
    while (queue.length) {
      const cur = queue.shift() as string;
      for (const e of edges) {
        if (e.source === cur && !reach.has(e.target)) {
          reach.add(e.target);
          queue.push(e.target);
        }
      }
    }
    for (const n of nodes) {
      if (!reach.has(n.id)) warn(`${name(n)} tidak terhubung dari Start dan tidak akan dijalankan.`, n.id);
    }
  }

  // Jalan buntu dan cabang kosong
  for (const n of nodes) {
    const def = NODE_DEFINITIONS[n.data.kind];
    const outs = edges.filter((e) => e.source === n.id);
    if (def.output === "single" && outs.length === 0) warn(`${name(n)} tidak punya koneksi keluar (jalan buntu).`, n.id);
    if (def.output === "branch") {
      for (const handle of ["true", "false"]) {
        if (!outs.some((e) => e.sourceHandle === handle)) {
          warn(`${name(n)}: cabang “${handle === "true" ? "Ya" : "Tidak"}” belum terhubung.`, n.id);
        }
      }
    }
  }

  return issues;
}

export const hasErrors = (issues: ValidationIssue[]) => issues.some((i) => i.level === "error");
