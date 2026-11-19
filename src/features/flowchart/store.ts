import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { create } from "zustand";
import { newId } from "@/features/workflow/ids";
import { canConnectFlow } from "./connection";
import { FLOW_KIND_DEFS } from "./defs";
import { createFlowEdge } from "./edge-factory";
import {
  clampLaneHeight,
  DEFAULT_LANE_H,
  moveLane as moveLaneState,
  removeLane as removeLaneState,
  resizeLane,
} from "./lanes";
import {
  FLOW_NODE_TYPE,
  HANDLE_IDS,
  type EdgeShape,
  type FlowColor,
  type FlowEdge,
  type FlowKind,
  type FlowNode,
  type FlowchartDoc,
  type HandleId,
  type Lane,
} from "./types";

export const DEFAULT_TITLE = "Flowchart tanpa judul";
const MAX_HISTORY = 100;
const MAX_LANES = 20;
const snap10 = (n: number) => Math.round(n / 10) * 10;

interface FlowchartState extends FlowchartDoc {
  past: FlowchartDoc[];
  future: FlowchartDoc[];

  setTitle: (title: string) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  connect: (connection: Connection) => boolean;
  addNode: (kind: FlowKind, position: XYPosition) => FlowNode;
  updateNode: (id: string, patch: Partial<{ text: string; color: FlowColor }>) => void;
  updateEdge: (id: string, patch: Partial<{ label: string; shape: EdgeShape; dashed: boolean }>) => void;
  removeNodes: (ids: string[]) => void;
  removeEdges: (ids: string[]) => void;

  addLane: () => void;
  renameLane: (id: string, name: string) => void;
  setLaneHeight: (id: string, height: number) => void;
  moveLane: (id: string, dir: -1 | 1) => void;
  /** false jika lane masih berisi simbol atau tidak ditemukan. */
  removeLane: (id: string) => boolean;

  /** Panggil saat drag/resize dimulai dan selesai; hanya dicatat jika posisi/ukuran berubah. */
  beginChange: () => void;
  endChange: () => void;
  undo: () => void;
  redo: () => void;
  replaceDoc: (doc: FlowchartDoc, options?: { history?: boolean }) => void;
  newDoc: () => void;
}

const deselectNode = (n: FlowNode): FlowNode => (n.selected ? { ...n, selected: false } : n);
const deselectEdge = (e: FlowEdge): FlowEdge => (e.selected ? { ...e, selected: false } : e);
const asHandle = (h: string | null | undefined): HandleId => HANDLE_IDS.find((x) => x === h) ?? "t";

export const useFlowchartStore = create<FlowchartState>()((set, get) => {
  let lastKey: string | null = null;
  let lastAt = 0;
  let changeStart: FlowchartDoc | null = null;

  const doc = (): FlowchartDoc => {
    const { title, lanes, nodes, edges } = get();
    return { title, lanes, nodes, edges };
  };
  const pushPast = (d: FlowchartDoc) =>
    set((s) => ({ past: [...s.past.slice(-(MAX_HISTORY - 1)), d], future: [] }));

  /** Simpan keadaan saat ini sebagai titik undo — panggil SEBELUM mengubah state. */
  const record = (key?: string, windowMs = 1000) => {
    const now = Date.now();
    if (key !== undefined && key === lastKey && now - lastAt < windowMs) {
      lastAt = now;
      return;
    }
    lastKey = key ?? null;
    lastAt = now;
    pushPast(doc());
  };

  const restore = (d: FlowchartDoc) => ({
    title: d.title,
    lanes: d.lanes,
    nodes: d.nodes.map(deselectNode),
    edges: d.edges.map(deselectEdge),
  });

  return {
    title: DEFAULT_TITLE,
    lanes: [],
    nodes: [],
    edges: [],
    past: [],
    future: [],

    setTitle: (title) => {
      record("title");
      set({ title });
    },

    onNodesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("rf-remove", 100);
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
    },

    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("rf-remove", 100);
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
    },

    connect: (c) => {
      const { nodes, edges } = get();
      if (!canConnectFlow(c, nodes, edges)) return false;
      record();
      const edge = createFlowEdge({
        source: c.source,
        target: c.target,
        sourceHandle: asHandle(c.sourceHandle),
        targetHandle: asHandle(c.targetHandle),
      });
      set({ edges: [...edges.map(deselectEdge), { ...edge, selected: true }] });
      return true;
    },

    addNode: (kind, position) => {
      const def = FLOW_KIND_DEFS[kind];
      const node: FlowNode = {
        id: newId("fn"),
        type: FLOW_NODE_TYPE,
        position: { x: snap10(position.x), y: snap10(position.y) },
        width: def.width,
        height: def.height,
        data: { kind, text: def.defaultText, color: "default" },
        selected: true,
      };
      record();
      set((s) => ({ nodes: [...s.nodes.map(deselectNode), node], edges: s.edges.map(deselectEdge) }));
      return node;
    },

    updateNode: (id, patch) => {
      if (!get().nodes.some((n) => n.id === id)) return;
      record(`node:${id}:${Object.keys(patch).sort().join(",")}`);
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      }));
    },

    updateEdge: (id, patch) => {
      const old = get().edges.find((e) => e.id === id);
      if (!old) return;
      record(`edge:${id}:${Object.keys(patch).sort().join(",")}`);
      const next = createFlowEdge({
        id,
        source: old.source,
        target: old.target,
        sourceHandle: asHandle(old.sourceHandle),
        targetHandle: asHandle(old.targetHandle),
        label: patch.label ?? (typeof old.label === "string" ? old.label : ""),
        shape: patch.shape ?? (old.type === "step" || old.type === "straight" || old.type === "default" ? old.type : "smoothstep"),
        dashed: patch.dashed ?? old.data?.dashed ?? false,
      });
      set((s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...next, selected: e.selected } : e)) }));
    },

    removeNodes: (ids) => {
      const gone = new Set(ids);
      if (!get().nodes.some((n) => gone.has(n.id))) return;
      record();
      set((s) => ({
        nodes: s.nodes.filter((n) => !gone.has(n.id)),
        edges: s.edges.filter((e) => !gone.has(e.source) && !gone.has(e.target)),
      }));
    },

    removeEdges: (ids) => {
      const gone = new Set(ids);
      if (!get().edges.some((e) => gone.has(e.id))) return;
      record();
      set((s) => ({ edges: s.edges.filter((e) => !gone.has(e.id)) }));
    },

    addLane: () => {
      const { lanes } = get();
      if (lanes.length >= MAX_LANES) return;
      record();
      const lane: Lane = { id: newId("lane"), name: `Lane ${lanes.length + 1}`, height: DEFAULT_LANE_H };
      set({ lanes: [...lanes, lane] });
    },

    renameLane: (id, name) => {
      if (!get().lanes.some((l) => l.id === id)) return;
      record(`lane:${id}:name`);
      set((s) => ({ lanes: s.lanes.map((l) => (l.id === id ? { ...l, name } : l)) }));
    },

    setLaneHeight: (id, height) => {
      const { lanes, nodes } = get();
      const target = lanes.find((l) => l.id === id);
      if (!target || clampLaneHeight(height) === target.height) return;
      record(`lane:${id}:height`);
      set(resizeLane({ lanes, nodes }, id, height));
    },

    moveLane: (id, dir) => {
      const { lanes, nodes } = get();
      const next = moveLaneState({ lanes, nodes }, id, dir);
      if (next.lanes === lanes) return;
      record();
      set(next);
    },

    removeLane: (id) => {
      const { lanes, nodes } = get();
      const next = removeLaneState({ lanes, nodes }, id);
      if (next === null || !lanes.some((l) => l.id === id)) return false;
      record();
      set(next);
      return true;
    },

    beginChange: () => {
      changeStart = doc();
    },

    endChange: () => {
      const start = changeStart;
      changeStart = null;
      if (!start) return;
      const changed = get().nodes.some((n) => {
        const before = start.nodes.find((x) => x.id === n.id);
        return (
          before !== undefined &&
          (before.position.x !== n.position.x ||
            before.position.y !== n.position.y ||
            before.width !== n.width ||
            before.height !== n.height)
        );
      });
      if (changed) {
        lastKey = null;
        pushPast(start);
      }
    },

    undo: () => {
      const { past, future } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      lastKey = null;
      set({ ...restore(prev), past: past.slice(0, -1), future: [doc(), ...future].slice(0, MAX_HISTORY) });
    },

    redo: () => {
      const { past, future } = get();
      const next = future[0];
      if (!next) return;
      lastKey = null;
      set({ ...restore(next), past: [...past.slice(-(MAX_HISTORY - 1)), doc()], future: future.slice(1) });
    },

    replaceDoc: (d, options) => {
      if (options?.history === false) {
        lastKey = null;
        set({ past: [], future: [] });
      } else {
        record();
      }
      set(restore(d));
    },

    newDoc: () => {
      record();
      set({ title: DEFAULT_TITLE, lanes: [], nodes: [], edges: [] });
    },
  };
});
