import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TITLE, useFlowchartStore } from "./store";

const get = () => useFlowchartStore.getState();
const reset = () => useFlowchartStore.setState({ title: DEFAULT_TITLE, lanes: [], nodes: [], edges: [], past: [], future: [] });
const link = (source: string, target: string, sh = "r", th = "l") => ({ source, target, sourceHandle: sh, targetHandle: th });

beforeEach(reset);

describe("addNode", () => {
  it("memakai ukuran dan teks bawaan, posisi dibulatkan ke grid 10, dan terpilih", () => {
    const n = get().addNode("decision", { x: 103, y: 57 });
    expect(n.position).toEqual({ x: 100, y: 60 });
    expect([n.width, n.height, n.data.text]).toEqual([170, 110, "Kondisi?"]);
    expect(get().nodes.filter((x) => x.selected).map((x) => x.id)).toEqual([n.id]);
  });
});

describe("connect", () => {
  it("menerima koneksi valid dan menolak diri sendiri, duplikat, serta sisi tak dikenal", () => {
    const a = get().addNode("process", { x: 0, y: 0 });
    const b = get().addNode("process", { x: 300, y: 0 });
    expect(get().connect(link(a.id, b.id))).toBe(true);
    expect(get().connect(link(a.id, b.id))).toBe(false);
    expect(get().connect(link(a.id, a.id))).toBe(false);
    expect(get().connect(link(a.id, b.id, "x", "l"))).toBe(false);
    expect(get().connect(link(a.id, "hantu"))).toBe(false);
    expect(get().edges).toHaveLength(1);
  });
  it("garis berbeda sisi antara dua simbol yang sama diizinkan", () => {
    const a = get().addNode("process", { x: 0, y: 0 });
    const b = get().addNode("process", { x: 300, y: 0 });
    expect(get().connect(link(a.id, b.id, "r", "l"))).toBe(true);
    expect(get().connect(link(a.id, b.id, "b", "t"))).toBe(true);
  });
});

describe("updateEdge", () => {
  it("mengubah label, bentuk, dan garis putus-putus tanpa kehilangan ujungnya", () => {
    const a = get().addNode("decision", { x: 0, y: 0 });
    const b = get().addNode("process", { x: 300, y: 0 });
    get().connect(link(a.id, b.id));
    const id = get().edges[0]!.id;
    get().updateEdge(id, { label: "Ya" });
    get().updateEdge(id, { shape: "straight", dashed: true });
    const e = get().edges[0]!;
    expect([e.label, e.type, e.data?.dashed, e.source, e.target, e.sourceHandle]).toEqual(["Ya", "straight", true, a.id, b.id, "r"]);
    expect((e.style as { strokeDasharray?: string }).strokeDasharray).toBe("6 4");
    get().updateEdge(id, { label: "" });
    expect(get().edges[0]?.label).toBeUndefined();
  });
});

describe("hapus", () => {
  it("removeNodes ikut menghapus garis yang terhubung", () => {
    const a = get().addNode("process", { x: 0, y: 0 });
    const b = get().addNode("process", { x: 300, y: 0 });
    get().connect(link(a.id, b.id));
    get().removeNodes([a.id]);
    expect(get().nodes.map((n) => n.id)).toEqual([b.id]);
    expect(get().edges).toHaveLength(0);
  });
});

describe("swimlane di store", () => {
  it("menambah lane bernomor, mengubah tinggi (node bawah ikut), menolak hapus lane berisi", () => {
    get().addLane();
    get().addLane();
    expect(get().lanes.map((l) => l.name)).toEqual(["Lane 1", "Lane 2"]);
    const l1 = get().lanes[0]!;
    const l2 = get().lanes[1]!;
    const n = get().addNode("process", { x: 0, y: 240 }); // di lane 2 (200..400)
    get().setLaneHeight(l1.id, 300);
    expect(get().nodes.find((x) => x.id === n.id)?.position.y).toBe(340);
    expect(get().removeLane(l2.id)).toBe(false);
    get().removeNodes([n.id]);
    expect(get().removeLane(l2.id)).toBe(true);
    expect(get().lanes).toHaveLength(1);
  });
  it("moveLane dapat di-undo dan mengembalikan posisi node", () => {
    get().addLane();
    get().addLane();
    const l1 = get().lanes[0]!;
    const l2 = get().lanes[1]!;
    const n = get().addNode("process", { x: 0, y: 40 });
    get().moveLane(l1.id, 1);
    expect(get().lanes.map((l) => l.id)).toEqual([l2.id, l1.id]);
    get().undo();
    expect(get().lanes.map((l) => l.id)).toEqual([l1.id, l2.id]);
    expect(get().nodes.find((x) => x.id === n.id)?.position.y).toBe(40);
  });
});

describe("undo/redo", () => {
  it("undo/redo penambahan simbol", () => {
    get().addNode("process", { x: 0, y: 0 });
    get().undo();
    expect(get().nodes).toHaveLength(0);
    get().redo();
    expect(get().nodes).toHaveLength(1);
  });
  it("mengetik teks beruntun digabung jadi satu langkah", () => {
    const n = get().addNode("process", { x: 0, y: 0 });
    get().updateNode(n.id, { text: "A" });
    get().updateNode(n.id, { text: "AB" });
    get().updateNode(n.id, { text: "ABC" });
    expect(get().past).toHaveLength(2);
    get().undo();
    expect(get().nodes[0]?.data.text).toBe("Proses");
  });
  it("drag dan resize hanya tercatat jika benar-benar berubah", () => {
    const n = get().addNode("process", { x: 0, y: 0 });
    get().beginChange();
    get().endChange();
    expect(get().past).toHaveLength(1);

    get().beginChange();
    get().onNodesChange([{ type: "dimensions", id: n.id, setAttributes: true, dimensions: { width: 300, height: 90 } }]);
    get().endChange();
    expect(get().past).toHaveLength(2);
    expect([get().nodes[0]?.width, get().nodes[0]?.height]).toEqual([300, 90]);
    get().undo();
    expect([get().nodes[0]?.width, get().nodes[0]?.height]).toEqual([160, 64]);
  });
  it("aksi baru setelah undo menghapus riwayat redo; newDoc bisa di-undo", () => {
    get().addNode("process", { x: 0, y: 0 });
    get().undo();
    get().addNode("note", { x: 0, y: 0 });
    expect(get().future).toHaveLength(0);
    get().newDoc();
    expect(get().nodes).toHaveLength(0);
    get().undo();
    expect(get().nodes).toHaveLength(1);
  });
});
