import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { create } from "zustand";
import { canConnect } from "./connection-rules";
import { createEdge } from "./edge-factory";
import { newId } from "./ids";
import { createNodeData } from "./node-defaults";
import { NODE_DEFINITIONS } from "./node-definitions";
import type { ConfigByKind } from "./schemas";
import type { LoadedWorkflow } from "./serialize";
import {
  WORKFLOW_NODE_TYPE,
  type NodeKind,
  type WorkflowEdge,
  type WorkflowNode,
} from "./types";

export const DEFAULT_WORKFLOW_NAME = "Workflow tanpa judul";
const MAX_HISTORY = 100;

interface Snapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  name: string;
}

interface WorkflowState {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  past: Snapshot[];
  future: Snapshot[];

  setName: (name: string) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  /** Mengembalikan false jika koneksi ditolak oleh aturan. */
  connect: (connection: Connection) => boolean;
  /** Mengembalikan node baru, atau null jika ditolak (mis. Start kedua). */
  addNode: (kind: NodeKind, position: XYPosition) => WorkflowNode | null;
  removeNodes: (ids: string[]) => void;
  selectOnly: (id: string) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeConfig: <K extends NodeKind>(id: string, kind: K, patch: Partial<ConfigByKind[K]>) => void;

  replaceWorkflow: (workflow: LoadedWorkflow, options?: { history?: boolean }) => void;
  newWorkflow: () => void;

  beginDrag: () => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
}

const deselectNode = (n: WorkflowNode): WorkflowNode => (n.selected ? { ...n, selected: false } : n);
const deselectEdge = (e: WorkflowEdge): WorkflowEdge => (e.selected ? { ...e, selected: false } : e);

export const useWorkflowStore = create<WorkflowState>()((set, get) => {
  // Penggabungan riwayat: perubahan beruntun dengan kunci sama (mis. mengetik) menjadi satu langkah undo.
  let lastKey: string | null = null;
  let lastAt = 0;
  let dragStart: Snapshot | null = null;

  const current = (): Snapshot => {
    const { nodes, edges, name } = get();
    return { nodes, edges, name };
  };

  const pushPast = (snap: Snapshot) =>
    set((s) => ({ past: [...s.past.slice(-(MAX_HISTORY - 1)), snap], future: [] }));

  /** Simpan keadaan saat ini sebagai titik undo — panggil SEBELUM mengubah state. */
  const record = (key?: string, windowMs = 1000) => {
    const now = Date.now();
    if (key !== undefined && key === lastKey && now - lastAt < windowMs) {
      lastAt = now;
      return;
    }
    lastKey = key ?? null;
    lastAt = now;
    pushPast(current());
  };

  return {
    name: DEFAULT_WORKFLOW_NAME,
    nodes: [],
    edges: [],
    past: [],
    future: [],

    setName: (name) => {
      record("name");
      set({ name });
    },

    onNodesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("rf-remove", 100);
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
    },

    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("rf-remove", 100);
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
    },

    connect: (connection) => {
      const { nodes, edges } = get();
      if (!canConnect(connection, nodes, edges)) return false;
      record();
      set({ edges: [...edges, createEdge(connection)] });
      return true;
    },

    addNode: (kind, position) => {
      const { nodes } = get();
      if (NODE_DEFINITIONS[kind].singleton && nodes.some((n) => n.data.kind === kind)) return null;
      const node: WorkflowNode = {
        id: newId(kind),
        type: WORKFLOW_NODE_TYPE,
        position,
        data: createNodeData(kind),
        selected: true,
      };
      record();
      set({ nodes: [...nodes.map(deselectNode), node] });
      return node;
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

    selectOnly: (id) => set((s) => ({ nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })) })),

    updateNodeLabel: (id, label) => {
      if (!get().nodes.some((n) => n.id === id)) return;
      record(`label:${id}`);
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
      }));
    },

    updateNodeConfig: (id, kind, patch) => {
      if (!get().nodes.some((n) => n.id === id && n.data.kind === kind)) return;
      record(`config:${id}:${Object.keys(patch).sort().join(",")}`);
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id && n.data.kind === kind
            ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } as WorkflowNode["data"] }
            : n,
        ),
      }));
    },

    replaceWorkflow: (workflow, options) => {
      if (options?.history === false) {
        lastKey = null;
        set({ past: [], future: [] });
      } else {
        record();
      }
      set({
        name: workflow.name,
        nodes: workflow.nodes.map(deselectNode),
        edges: workflow.edges.map(deselectEdge),
      });
    },

    newWorkflow: () => {
      record();
      set({ name: DEFAULT_WORKFLOW_NAME, nodes: [], edges: [] });
    },

    beginDrag: () => {
      dragStart = current();
    },

    endDrag: () => {
      const start = dragStart;
      dragStart = null;
      if (!start) return;
      const moved = get().nodes.some((n) => {
        const before = start.nodes.find((x) => x.id === n.id);
        return before !== undefined && (before.position.x !== n.position.x || before.position.y !== n.position.y);
      });
      if (moved) {
        lastKey = null;
        pushPast(start);
      }
    },

    undo: () => {
      const { past, future } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      lastKey = null;
      set({
        nodes: prev.nodes.map(deselectNode),
        edges: prev.edges.map(deselectEdge),
        name: prev.name,
        past: past.slice(0, -1),
        future: [current(), ...future].slice(0, MAX_HISTORY),
      });
    },

    redo: () => {
      const { past, future } = get();
      const next = future[0];
      if (!next) return;
      lastKey = null;
      set({
        nodes: next.nodes.map(deselectNode),
        edges: next.edges.map(deselectEdge),
        name: next.name,
        past: [...past.slice(-(MAX_HISTORY - 1)), current()],
        future: future.slice(1),
      });
    },
  };
});
