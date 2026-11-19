import { FLOW_KIND_DEFS } from "./defs";
import type { FlowEdge, FlowNode } from "./types";

export type IssueLevel = "error" | "warning";

export interface FlowIssue {
  id: string;
  level: IssueLevel;
  message: string;
  /** Simbol yang bermasalah; dipakai untuk menyorot dan memusatkan canvas. */
  nodeIds: string[];
}

/**
 * Graf alur. Catatan (note) tidak ikut karena hanya keterangan. Garis putus-putus dianggap
 * keterangan atau akses data (mis. ke basis data), bukan langkah alur, jadi tidak masuk `out`/`inc`.
 */
export interface FlowGraph {
  nodes: FlowNode[];
  byId: Map<string, FlowNode>;
  /** Garis alur (tidak putus-putus) yang keluar dari / masuk ke tiap simbol. */
  out: Map<string, FlowEdge[]>;
  inc: Map<string, FlowEdge[]>;
  /** Semua garis termasuk putus-putus; hanya untuk keterjangkauan dan simbol terpencil. */
  reach: Map<string, string[]>;
  connected: Set<string>;
}

export interface StepOption {
  edgeId: string;
  targetId: string;
  /** Label garis (mis. "Ya"); kosong jika garis tidak diberi label. */
  label: string;
}

export function buildGraph(nodes: FlowNode[], edges: FlowEdge[]): FlowGraph {
  const flow = nodes.filter((n) => n.data.kind !== "note");
  const byId = new Map(flow.map((n) => [n.id, n]));
  const out = new Map<string, FlowEdge[]>();
  const inc = new Map<string, FlowEdge[]>();
  const reach = new Map<string, string[]>();
  const connected = new Set<string>();
  for (const n of flow) {
    out.set(n.id, []);
    inc.set(n.id, []);
    reach.set(n.id, []);
  }
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    connected.add(e.source);
    connected.add(e.target);
    reach.get(e.source)?.push(e.target);
    if (e.data?.dashed) continue;
    out.get(e.source)?.push(e);
    inc.get(e.target)?.push(e);
  }
  return { nodes: flow, byId, out, inc, reach, connected };
}

export function edgeLabel(e: FlowEdge): string {
  return typeof e.label === "string" ? e.label.trim() : "";
}

/** Nama singkat simbol untuk pesan: baris pertama teksnya, atau nama jenisnya jika kosong. */
export function nodeName(n: FlowNode): string {
  const line =
    n.data.text
      .split("\n")
      .map((s) => s.trim())
      .find(Boolean) ?? "";
  if (!line) return FLOW_KIND_DEFS[n.data.kind].label;
  return line.length > 32 ? `${line.slice(0, 31)}…` : line;
}

const quoted = (n: FlowNode) => `“${nodeName(n)}”`;
const byPosition = (a: FlowNode, b: FlowNode) => a.position.y - b.position.y || a.position.x - b.position.x;
const count = (m: Map<string, FlowEdge[]>, id: string) => m.get(id)?.length ?? 0;

/** Titik Mulai: simbol Mulai/Selesai yang punya garis keluar tetapi tidak punya garis masuk. */
export function startNodes(g: FlowGraph): FlowNode[] {
  return g.nodes
    .filter((n) => n.data.kind === "terminator" && count(g.inc, n.id) === 0 && count(g.out, n.id) > 0)
    .sort(byPosition);
}

/** Titik Selesai: simbol Mulai/Selesai yang punya garis masuk tetapi tidak punya garis keluar. */
export function endNodes(g: FlowGraph): FlowNode[] {
  return g.nodes
    .filter((n) => n.data.kind === "terminator" && count(g.inc, n.id) > 0 && count(g.out, n.id) === 0)
    .sort(byPosition);
}

const YES = /^(ya|yes|y|benar)$/i;
const NO = /^(tidak|no|n|salah)$/i;
const rank = (label: string) => (YES.test(label) ? 0 : NO.test(label) ? 1 : 2);

/** Pilihan langkah berikutnya dari sebuah simbol; "Ya" didahulukan, lalu "Tidak", lalu sisanya sesuai urutan dibuat. */
export function stepOptions(g: FlowGraph, nodeId: string): StepOption[] {
  const items = (g.out.get(nodeId) ?? []).map((e, index) => ({
    option: { edgeId: e.id, targetId: e.target, label: edgeLabel(e) },
    index,
  }));
  items.sort((a, b) => rank(a.option.label) - rank(b.option.label) || a.index - b.index);
  return items.map((x) => x.option);
}

function listNames(nodes: FlowNode[]): string {
  const shown = nodes.slice(0, 3).map(quoted).join(", ");
  return nodes.length > 3 ? `${shown}, dan ${nodes.length - 3} lainnya` : shown;
}

/**
 * Memeriksa struktur flowchart. Error = alur tidak bisa dijalankan atau ambigu;
 * peringatan = kemungkinan salah gambar atau belum lengkap. Siklus (pengulangan) sengaja
 * tidak dianggap masalah karena sah dalam flowchart.
 */
export function analyzeFlowchart(nodes: FlowNode[], edges: FlowEdge[]): FlowIssue[] {
  const g = buildGraph(nodes, edges);
  if (g.nodes.length === 0) return [];

  const errors: FlowIssue[] = [];
  const warnings: FlowIssue[] = [];
  const error = (id: string, message: string, nodeIds: string[] = []) => errors.push({ id, level: "error", message, nodeIds });
  const warn = (id: string, message: string, nodeIds: string[] = []) => warnings.push({ id, level: "warning", message, nodeIds });

  const starts = startNodes(g);
  const ends = endNodes(g);
  if (starts.length === 0) {
    error("no-start", "Belum ada titik Mulai. Tambahkan simbol “Mulai / Selesai” yang punya garis keluar tetapi tanpa garis masuk.");
  } else if (starts.length > 1) {
    warn("multi-start", `Ada ${starts.length} titik Mulai: ${listNames(starts)}. Saat diuji, kamu akan memilih salah satunya.`, starts.map((n) => n.id));
  }
  if (ends.length === 0) {
    warn("no-end", "Belum ada titik Selesai. Tambahkan simbol “Mulai / Selesai” sebagai akhir alur (punya garis masuk, tanpa garis keluar).");
  }

  const isolated = new Set<string>();
  for (const n of g.nodes) {
    const nIn = count(g.inc, n.id);
    const nOut = count(g.out, n.id);

    if (!g.connected.has(n.id)) {
      isolated.add(n.id);
      warn(`isolated:${n.id}`, `${quoted(n)} belum terhubung ke simbol lain.`, [n.id]);
      continue;
    }

    if (n.data.kind === "decision") {
      if (nOut < 2) {
        error(`decision-branches:${n.id}`, `Keputusan ${quoted(n)} baru punya ${nOut} cabang keluar. Minimal dua (mis. Ya dan Tidak).`, [n.id]);
        continue;
      }
      const labels = (g.out.get(n.id) ?? []).map(edgeLabel);
      const blank = labels.filter((l) => l === "").length;
      if (blank > 0) {
        warn(`decision-labels:${n.id}`, `${blank} dari ${nOut} cabang Keputusan ${quoted(n)} belum diberi label (mis. Ya / Tidak).`, [n.id]);
      }
      const named = labels.filter((l) => l !== "").map((l) => l.toLowerCase());
      const dup = named.find((l, i) => named.indexOf(l) !== i);
      if (dup !== undefined) {
        warn(`decision-dup:${n.id}`, `Cabang Keputusan ${quoted(n)} memakai label yang sama lebih dari sekali: “${dup}”.`, [n.id]);
      }
      continue;
    }

    if (nOut > 1) {
      warn(`fork:${n.id}`, `${quoted(n)} punya ${nOut} garis keluar padahal bukan Keputusan. Jika alurnya bercabang, pakai simbol Keputusan.`, [n.id]);
    }
    const anyOut = g.reach.get(n.id)?.length ?? 0;
    if (n.data.kind !== "terminator" && n.data.kind !== "database" && nIn > 0 && anyOut === 0) {
      warn(`dead-end:${n.id}`, `Jalan buntu: ${quoted(n)} tidak punya garis keluar.`, [n.id]);
    }
  }

  if (starts.length > 0) {
    const seen = new Set(starts.map((n) => n.id));
    const queue = [...seen];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (id === undefined) continue;
      for (const target of g.reach.get(id) ?? []) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    const unreachable = g.nodes.filter((n) => !seen.has(n.id) && !isolated.has(n.id));
    if (unreachable.length > 0) {
      warn("unreachable", `${unreachable.length} simbol tidak bisa dicapai dari titik Mulai: ${listNames(unreachable)}.`, unreachable.map((n) => n.id));
    }
  }

  return [...errors, ...warnings];
}
