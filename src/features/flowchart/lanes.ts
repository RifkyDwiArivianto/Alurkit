import { FLOW_KIND_DEFS } from "./defs";
import type { FlowNode, Lane } from "./types";

export const LANE_HEADER_W = 140;
export const MIN_LANE_H = 80;
export const MAX_LANE_H = 800;
export const DEFAULT_LANE_H = 200;
export const MIN_LANE_BODY_W = 1800;
export const LANE_PREFIX = "lane:";

export interface LaneBand {
  id: string;
  name: string;
  top: number;
  height: number;
  index: number;
}

export function laneBands(lanes: Lane[]): LaneBand[] {
  let top = 0;
  return lanes.map((l, index) => {
    const band = { id: l.id, name: l.name, top, height: l.height, index };
    top += l.height;
    return band;
  });
}

export function nodeSize(n: FlowNode): { w: number; h: number } {
  const def = FLOW_KIND_DEFS[n.data.kind];
  return { w: n.width ?? n.measured?.width ?? def.width, h: n.height ?? n.measured?.height ?? def.height };
}

/** Lane tempat titik tengah node berada, atau null jika di luar semua lane. */
export function laneIdAt(node: FlowNode, bands: LaneBand[]): string | null {
  const cy = node.position.y + nodeSize(node).h / 2;
  return bands.find((b) => cy >= b.top && cy < b.top + b.height)?.id ?? null;
}

/** Lebar badan lane: cukup lebar untuk semua node dengan ruang kosong di kanan. */
export function laneBodyWidth(nodes: FlowNode[]): number {
  const right = nodes.reduce((m, n) => Math.max(m, n.position.x + nodeSize(n).w), 0);
  return Math.max(MIN_LANE_BODY_W, Math.ceil((right + 400) / 100) * 100);
}

export const clampLaneHeight = (h: number) =>
  Math.min(MAX_LANE_H, Math.max(MIN_LANE_H, Number.isFinite(h) ? Math.round(h) : DEFAULT_LANE_H));

interface LaneState {
  lanes: Lane[];
  nodes: FlowNode[];
}

const shiftY = (n: FlowNode, dy: number): FlowNode => ({ ...n, position: { ...n.position, y: n.position.y + dy } });

/** Mengubah tinggi lane; node di lane-lane bawahnya ikut bergeser. */
export function resizeLane(state: LaneState, id: string, height: number): LaneState {
  const bands = laneBands(state.lanes);
  const band = bands.find((b) => b.id === id);
  if (!band) return state;
  const next = clampLaneHeight(height);
  const dy = next - band.height;
  if (dy === 0) return state;
  const bottom = band.top + band.height;
  return {
    lanes: state.lanes.map((l) => (l.id === id ? { ...l, height: next } : l)),
    nodes: state.nodes.map((n) => (n.position.y + nodeSize(n).h / 2 >= bottom ? shiftY(n, dy) : n)),
  };
}

/** Menukar lane dengan tetangganya; node di dalam kedua lane ikut berpindah. */
export function moveLane(state: LaneState, id: string, dir: -1 | 1): LaneState {
  const i = state.lanes.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.lanes.length) return state;

  const bands = laneBands(state.lanes);
  const upper = bands[Math.min(i, j)];
  const lower = bands[Math.max(i, j)];
  if (!upper || !lower) return state;

  const lanes = [...state.lanes];
  const a = lanes[i];
  const b = lanes[j];
  if (!a || !b) return state;
  lanes[i] = b;
  lanes[j] = a;

  const nodes = state.nodes.map((n) => {
    const at = laneIdAt(n, bands);
    if (at === upper.id) return shiftY(n, lower.height);
    if (at === lower.id) return shiftY(n, -upper.height);
    return n;
  });
  return { lanes, nodes };
}

/** Menghapus lane kosong. Mengembalikan null jika masih ada node di dalamnya. */
export function removeLane(state: LaneState, id: string): LaneState | null {
  const bands = laneBands(state.lanes);
  const band = bands.find((b) => b.id === id);
  if (!band) return state;
  if (state.nodes.some((n) => laneIdAt(n, bands) === id)) return null;
  const bottom = band.top + band.height;
  return {
    lanes: state.lanes.filter((l) => l.id !== id),
    nodes: state.nodes.map((n) => (n.position.y + nodeSize(n).h / 2 >= bottom ? shiftY(n, -band.height) : n)),
  };
}
