import { z } from "zod";
import { canConnect } from "./connection-rules";
import { createEdge } from "./edge-factory";
import { CONFIG_SHAPES } from "./schemas";
import {
  WORKFLOW_NODE_TYPE,
  type NodeKind,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeData,
} from "./types";

export const WORKFLOW_FILE_VERSION = 1;
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_NODES = 500;
export const MAX_EDGES = 2_000;

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "ID tidak valid");

const nodeShape = <K extends NodeKind>(kind: K) =>
  z.object({
    id: idSchema,
    kind: z.literal(kind),
    label: z.string().max(40),
    position: z.object({ x: z.number().finite(), y: z.number().finite() }),
    config: CONFIG_SHAPES[kind],
  });

const nodeSchema = z.discriminatedUnion("kind", [
  nodeShape("start"),
  nodeShape("setValue"),
  nodeShape("transform"),
  nodeShape("condition"),
  nodeShape("delay"),
  nodeShape("output"),
]);

const edgeSchema = z.object({
  id: idSchema.optional(),
  source: idSchema,
  target: idSchema,
  sourceHandle: z.string().max(20).nullable().optional(),
});

const fileSchema = z.object({
  name: z.string().max(80),
  nodes: z.array(nodeSchema).max(MAX_NODES),
  edges: z.array(edgeSchema).max(MAX_EDGES),
});

export type SerializedWorkflow = {
  app: "alurkit";
  version: typeof WORKFLOW_FILE_VERSION;
} & z.infer<typeof fileSchema>;

export interface WorkflowLike {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export type LoadedWorkflow = WorkflowLike;
export type ParseResult = { ok: true; workflow: LoadedWorkflow } | { ok: false; error: string };

const round = (n: number) => Math.round(n * 10) / 10;

/** Hanya data yang bermakna — status UI (seleksi, ukuran terukur, gaya edge) tidak ikut. */
export function serializeWorkflow(w: WorkflowLike): SerializedWorkflow {
  return {
    app: "alurkit",
    version: WORKFLOW_FILE_VERSION,
    name: w.name,
    nodes: w.nodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      label: n.data.label,
      position: { x: round(n.position.x), y: round(n.position.y) },
      config: n.data.config,
    })) as SerializedWorkflow["nodes"],
    edges: w.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    })),
  };
}

export function stringifyWorkflow(w: WorkflowLike, pretty = false): string {
  return JSON.stringify(serializeWorkflow(w), null, pretty ? 2 : undefined);
}

function describeIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Struktur file tidak valid.";
  const where = issue.path.length ? ` (${issue.path.join(".")})` : "";
  return `Struktur file tidak valid${where}: ${issue.message}`;
}

export function parseWorkflowJson(text: string): ParseResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: "File terlalu besar (maksimum 1 MB)." };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "File bukan JSON yang valid." };
  }
  const app = raw !== null && typeof raw === "object" ? (raw as { app?: unknown }).app : undefined;
  if (app === "alurkit-flowchart" || app === "flowforge-flowchart") {
    return { ok: false, error: "Ini file Flowchart. Pindah ke mode Flowchart untuk mengimpornya." };
  }
  // "flowforge" = penanda file ekspor lama (sebelum ganti nama), masih diterima.
  if (app !== "alurkit" && app !== "flowforge") {
    return { ok: false, error: "Ini bukan file workflow Alurkit." };
  }
  const version = (raw as { version?: unknown }).version;
  if (version !== WORKFLOW_FILE_VERSION) {
    return { ok: false, error: `Versi file (${String(version)}) tidak didukung. Versi yang didukung: ${WORKFLOW_FILE_VERSION}.` };
  }

  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: describeIssue(parsed.error) };

  const nodes: WorkflowNode[] = [];
  const seenNodes = new Set<string>();
  for (const n of parsed.data.nodes) {
    if (seenNodes.has(n.id)) return { ok: false, error: `ID node ganda: ${n.id}` };
    seenNodes.add(n.id);
    nodes.push({
      id: n.id,
      type: WORKFLOW_NODE_TYPE,
      position: n.position,
      data: { kind: n.kind, label: n.label, config: n.config } as WorkflowNodeData,
    });
  }

  const edges: WorkflowEdge[] = [];
  const seenEdgeIds = new Set<string>();
  for (const e of parsed.data.edges) {
    if (!canConnect({ source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null }, nodes, edges)) {
      return { ok: false, error: `Koneksi tidak valid atau ganda: ${e.source} → ${e.target}` };
    }
    const id = e.id && !seenEdgeIds.has(e.id) ? e.id : undefined;
    const edge = createEdge({ ...(id !== undefined && { id }), source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null });
    seenEdgeIds.add(edge.id);
    edges.push(edge);
  }

  return { ok: true, workflow: { name: parsed.data.name, nodes, edges } };
}
