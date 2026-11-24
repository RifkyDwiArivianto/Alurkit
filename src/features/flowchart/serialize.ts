import { z } from "zod";
import { canConnectFlow } from "./connection";
import { createFlowEdge } from "./edge-factory";
import { MAX_LANE_H, MIN_LANE_H, nodeSize } from "./lanes";
import {
  EDGE_SHAPES,
  FLOW_COLORS,
  FLOW_KINDS,
  FLOW_NODE_TYPE,
  HANDLE_IDS,
  type EdgeShape,
  type FlowEdge,
  type FlowNode,
  type FlowchartDoc,
} from "./types";

export const FLOWCHART_APP = "alurkit-flowchart";
/** Penanda app pada file ekspor lama (sebelum ganti nama) — masih diterima saat impor. */
const LEGACY_FLOWCHART_APP = "flowforge-flowchart";
const WORKFLOW_APPS: unknown[] = ["alurkit", "flowforge"];
export const FLOWCHART_FILE_VERSION = 1;
export const MAX_FILE_BYTES = 1_000_000;

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "ID tidak valid");
const size = z.number().finite().min(20).max(2000);
const coord = z.number().finite().min(-100_000).max(100_000);

const fileSchema = z.object({
  title: z.string().max(80),
  lanes: z
    .array(z.object({ id: idSchema, name: z.string().max(60), height: z.number().finite().min(MIN_LANE_H).max(MAX_LANE_H) }))
    .max(20),
  nodes: z
    .array(
      z.object({
        id: idSchema,
        kind: z.enum(FLOW_KINDS),
        text: z.string().max(500),
        color: z.enum(FLOW_COLORS),
        position: z.object({ x: coord, y: coord }),
        width: size,
        height: size,
      }),
    )
    .max(500),
  edges: z
    .array(
      z.object({
        id: idSchema.optional(),
        source: idSchema,
        target: idSchema,
        sourceHandle: z.enum(HANDLE_IDS),
        targetHandle: z.enum(HANDLE_IDS),
        label: z.string().max(100).optional(),
        shape: z.enum(EDGE_SHAPES).default("smoothstep"),
        dashed: z.boolean().default(false),
      }),
    )
    .max(2000),
});

export type SerializedFlowchart = { app: typeof FLOWCHART_APP; version: typeof FLOWCHART_FILE_VERSION } & z.input<typeof fileSchema>;

export type ParseResult = { ok: true; doc: FlowchartDoc } | { ok: false; error: string };

const round = (n: number) => Math.round(n * 10) / 10;
const shapeOf = (e: FlowEdge): EdgeShape =>
  e.type === "step" || e.type === "straight" || e.type === "default" ? e.type : "smoothstep";

export function serializeFlowchart(doc: FlowchartDoc): SerializedFlowchart {
  return {
    app: FLOWCHART_APP,
    version: FLOWCHART_FILE_VERSION,
    title: doc.title,
    lanes: doc.lanes.map((l) => ({ id: l.id, name: l.name, height: l.height })),
    nodes: doc.nodes.map((n) => {
      const s = nodeSize(n);
      return {
        id: n.id,
        kind: n.data.kind,
        text: n.data.text,
        color: n.data.color,
        position: { x: round(n.position.x), y: round(n.position.y) },
        width: round(s.w),
        height: round(s.h),
      };
    }),
    edges: doc.edges.flatMap((e) => {
      const sh = e.sourceHandle;
      const th = e.targetHandle;
      if (!HANDLE_IDS.some((h) => h === sh) || !HANDLE_IDS.some((h) => h === th)) return [];
      return [
        {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: sh as (typeof HANDLE_IDS)[number],
          targetHandle: th as (typeof HANDLE_IDS)[number],
          ...(typeof e.label === "string" && e.label ? { label: e.label } : {}),
          shape: shapeOf(e),
          dashed: e.data?.dashed ?? false,
        },
      ];
    }),
  };
}

export function stringifyFlowchart(doc: FlowchartDoc, pretty = false): string {
  return JSON.stringify(serializeFlowchart(doc), null, pretty ? 2 : undefined);
}

export function parseFlowchartJson(text: string): ParseResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: "File terlalu besar (maksimum 1 MB)." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "File bukan JSON yang valid." };
  }
  const app = raw !== null && typeof raw === "object" ? (raw as { app?: unknown }).app : undefined;
  if (WORKFLOW_APPS.includes(app)) return { ok: false, error: "Ini file Workflow. Pindah ke mode Workflow untuk mengimpornya." };
  if (app !== FLOWCHART_APP && app !== LEGACY_FLOWCHART_APP) return { ok: false, error: "Ini bukan file flowchart Alurkit." };
  const version = (raw as { version?: unknown }).version;
  if (version !== FLOWCHART_FILE_VERSION) {
    return { ok: false, error: `Versi file (${String(version)}) tidak didukung. Versi yang didukung: ${FLOWCHART_FILE_VERSION}.` };
  }

  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue && issue.path.length ? ` (${issue.path.join(".")})` : "";
    return { ok: false, error: `Struktur file tidak valid${where}: ${issue?.message ?? "tidak dikenali"}` };
  }

  const laneIds = new Set<string>();
  for (const l of parsed.data.lanes) {
    if (laneIds.has(l.id)) return { ok: false, error: `ID lane ganda: ${l.id}` };
    laneIds.add(l.id);
  }

  const nodes: FlowNode[] = [];
  const nodeIds = new Set<string>();
  for (const n of parsed.data.nodes) {
    if (nodeIds.has(n.id)) return { ok: false, error: `ID simbol ganda: ${n.id}` };
    nodeIds.add(n.id);
    nodes.push({
      id: n.id,
      type: FLOW_NODE_TYPE,
      position: n.position,
      width: n.width,
      height: n.height,
      data: { kind: n.kind, text: n.text, color: n.color },
    });
  }

  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  for (const e of parsed.data.edges) {
    if (!canConnectFlow(e, nodes, edges)) {
      return { ok: false, error: `Koneksi tidak valid atau ganda: ${e.source} → ${e.target}` };
    }
    const id = e.id && !edgeIds.has(e.id) ? e.id : undefined;
    const edge = createFlowEdge({
      ...(id !== undefined && { id }),
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      ...(e.label !== undefined && { label: e.label }),
      shape: e.shape,
      dashed: e.dashed,
    });
    edgeIds.add(edge.id);
    edges.push(edge);
  }

  return { ok: true, doc: { title: parsed.data.title, lanes: parsed.data.lanes, nodes, edges } };
}
