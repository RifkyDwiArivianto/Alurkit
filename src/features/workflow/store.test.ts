import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_WORKFLOW_NAME, useWorkflowStore } from "./store";

const get = () => useWorkflowStore.getState();
const pos = { x: 0, y: 0 };

beforeEach(() => {
  useWorkflowStore.setState({ name: DEFAULT_WORKFLOW_NAME, nodes: [], edges: [], past: [], future: [] });
});

function build() {
  const start = get().addNode("start", pos)!;
  const set = get().addNode("setValue", { x: 300, y: 0 })!;
  const cond = get().addNode("condition", { x: 600, y: 0 })!;
  const out = get().addNode("output", { x: 900, y: 0 })!;
  return { start, set, cond, out };
}

describe("addNode", () => {
  it("menambah node dengan label bawaan dan menjadikannya satu-satunya yang terpilih", () => {
    const a = get().addNode("setValue", pos)!;
    const b = get().addNode("delay", pos)!;
    expect(a.data.label).toBe("Set Value");
    expect(get().nodes.filter((n) => n.selected).map((n) => n.id)).toEqual([b.id]);
  });

  it("hanya mengizinkan satu node Start", () => {
    expect(get().addNode("start", pos)).not.toBeNull();
    expect(get().addNode("start", pos)).toBeNull();
    expect(get().nodes).toHaveLength(1);
  });
});

describe("connect", () => {
  it("menerima koneksi valid", () => {
    const { start, set } = build();
    expect(get().connect({ source: start.id, target: set.id, sourceHandle: null, targetHandle: null })).toBe(true);
    expect(get().edges).toHaveLength(1);
  });

  it("menolak koneksi ke diri sendiri dan duplikat", () => {
    const { start, set } = build();
    const c = { source: start.id, target: set.id, sourceHandle: null, targetHandle: null };
    expect(get().connect({ ...c, target: start.id })).toBe(false);
    expect(get().connect(c)).toBe(true);
    expect(get().connect(c)).toBe(false);
  });

  it("menolak masuk ke Start dan keluar dari Output", () => {
    const { start, set, out } = build();
    expect(get().connect({ source: set.id, target: start.id, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().connect({ source: out.id, target: set.id, sourceHandle: null, targetHandle: null })).toBe(false);
  });

  it("Condition wajib memakai handle true/false dan memberi label cabang", () => {
    const { cond, out } = build();
    expect(get().connect({ source: cond.id, target: out.id, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().connect({ source: cond.id, target: out.id, sourceHandle: "true", targetHandle: null })).toBe(true);
    expect(get().edges[0]?.label).toBe("Ya");
  });
});

describe("perubahan dari canvas dan penghapusan", () => {
  it("menerapkan perubahan posisi", () => {
    const n = get().addNode("delay", pos)!;
    get().onNodesChange([{ type: "position", id: n.id, position: { x: 120, y: 80 } }]);
    expect(get().nodes[0]?.position).toEqual({ x: 120, y: 80 });
  });

  it("removeNodes ikut menghapus edge yang terhubung", () => {
    const { start, set, out } = build();
    get().connect({ source: start.id, target: set.id, sourceHandle: null, targetHandle: null });
    get().connect({ source: set.id, target: out.id, sourceHandle: null, targetHandle: null });
    get().removeNodes([set.id]);
    expect(get().nodes.map((n) => n.id)).not.toContain(set.id);
    expect(get().edges).toHaveLength(0);
  });

  it("perubahan 'remove' dari React Flow menghapus node", () => {
    const n = get().addNode("delay", pos)!;
    get().onNodesChange([{ type: "remove", id: n.id }]);
    expect(get().nodes).toHaveLength(0);
  });
});

describe("update node", () => {
  it("memperbarui label dan konfigurasi tanpa mengubah node lain", () => {
    const a = get().addNode("delay", pos)!;
    const b = get().addNode("delay", pos)!;
    get().updateNodeLabel(a.id, "Tunggu");
    get().updateNodeConfig(a.id, "delay", { ms: 250 });
    const na = get().nodes.find((n) => n.id === a.id)!;
    const nb = get().nodes.find((n) => n.id === b.id)!;
    expect(na.data.label).toBe("Tunggu");
    expect(na.data.kind === "delay" && na.data.config.ms).toBe(250);
    expect(nb.data.kind === "delay" && nb.data.config.ms).toBe(500);
  });

  it("mengabaikan update untuk jenis yang tidak cocok", () => {
    const a = get().addNode("delay", pos)!;
    get().updateNodeConfig(a.id, "output", { key: "x" });
    expect(get().past).toHaveLength(1); // hanya addNode
  });
});

describe("undo/redo", () => {
  it("undo membatalkan penambahan node dan redo mengembalikannya", () => {
    get().addNode("delay", pos);
    get().undo();
    expect(get().nodes).toHaveLength(0);
    get().redo();
    expect(get().nodes).toHaveLength(1);
  });

  it("menggabungkan pengetikan beruntun pada field yang sama menjadi satu langkah", () => {
    const n = get().addNode("delay", pos)!;
    get().updateNodeConfig(n.id, "delay", { ms: 1 });
    get().updateNodeConfig(n.id, "delay", { ms: 12 });
    get().updateNodeConfig(n.id, "delay", { ms: 123 });
    expect(get().past).toHaveLength(2);
    get().undo();
    const d = get().nodes[0]!.data;
    expect(d.kind === "delay" && d.config.ms).toBe(500);
  });

  it("drag hanya masuk riwayat jika node benar-benar berpindah", () => {
    const n = get().addNode("delay", pos)!;
    get().beginDrag();
    get().endDrag();
    expect(get().past).toHaveLength(1);

    get().beginDrag();
    get().onNodesChange([{ type: "position", id: n.id, position: { x: 50, y: 60 } }]);
    get().endDrag();
    expect(get().past).toHaveLength(2);
    get().undo();
    expect(get().nodes[0]?.position).toEqual({ x: 0, y: 0 });
  });

  it("aksi baru setelah undo menghapus riwayat redo", () => {
    get().addNode("delay", pos);
    get().undo();
    expect(get().future).toHaveLength(1);
    get().addNode("setValue", pos);
    expect(get().future).toHaveLength(0);
  });

  it("penghapusan node beserta edge dari React Flow menjadi satu langkah undo", () => {
    const { start, set } = build();
    get().connect({ source: start.id, target: set.id, sourceHandle: null, targetHandle: null });
    const edgeId = get().edges[0]!.id;
    get().onNodesChange([{ type: "remove", id: set.id }]);
    get().onEdgesChange([{ type: "remove", id: edgeId }]);
    expect(get().edges).toHaveLength(0);
    get().undo();
    expect(get().nodes.map((n) => n.id)).toContain(set.id);
    expect(get().edges).toHaveLength(1);
  });

  it("replaceWorkflow dengan history:false mengosongkan riwayat; newWorkflow bisa di-undo", () => {
    get().addNode("delay", pos);
    get().replaceWorkflow({ name: "X", nodes: [], edges: [] }, { history: false });
    expect(get().past).toHaveLength(0);
    expect(get().name).toBe("X");

    get().addNode("delay", pos);
    get().newWorkflow();
    expect(get().nodes).toHaveLength(0);
    get().undo();
    expect(get().nodes).toHaveLength(1);
  });
});
