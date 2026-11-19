import { describe, expect, it } from "vitest";
import { clampLaneHeight, laneBands, laneIdAt, moveLane, removeLane, resizeLane } from "./lanes";
import { FLOW_NODE_TYPE, type FlowNode, type Lane } from "./types";

const lanes = (): Lane[] => [
  { id: "a", name: "A", height: 200 },
  { id: "b", name: "B", height: 100 },
  { id: "c", name: "C", height: 300 },
];

const node = (id: string, y: number): FlowNode => ({
  id,
  type: FLOW_NODE_TYPE,
  position: { x: 0, y },
  width: 100,
  height: 40,
  data: { kind: "process", text: id, color: "default" },
});
// pusat y = y + 20
const nodes = () => [node("na", 80), node("nb", 230), node("nc", 400), node("out", 1000)];
const ys = (ns: FlowNode[]) => Object.fromEntries(ns.map((n) => [n.id, n.position.y]));

describe("laneBands / laneIdAt", () => {
  it("menumpuk lane dari atas", () => {
    expect(laneBands(lanes()).map((b) => [b.id, b.top])).toEqual([["a", 0], ["b", 200], ["c", 300]]);
  });
  it("menentukan lane dari titik tengah node (batas bawah milik lane berikutnya)", () => {
    const b = laneBands(lanes());
    expect(laneIdAt(node("x", 80), b)).toBe("a");
    expect(laneIdAt(node("x", 180), b)).toBe("b"); // pusat 200 → lane b
    expect(laneIdAt(node("x", 1000), b)).toBeNull();
  });
});

describe("resizeLane", () => {
  it("menggeser node di lane-lane bawah, bukan di lane itu sendiri", () => {
    const r = resizeLane({ lanes: lanes(), nodes: nodes() }, "a", 260);
    expect(r.lanes[0]?.height).toBe(260);
    expect(ys(r.nodes)).toEqual({ na: 80, nb: 290, nc: 460, out: 1060 });
  });
  it("membatasi tinggi minimum/maksimum", () => {
    expect(clampLaneHeight(10)).toBe(80);
    expect(clampLaneHeight(99999)).toBe(800);
    expect(clampLaneHeight(Number.NaN)).toBe(200);
  });
});

describe("moveLane", () => {
  it("menukar posisi lane dan memindahkan node di dalamnya", () => {
    const r = moveLane({ lanes: lanes(), nodes: nodes() }, "b", -1); // b naik di atas a
    expect(r.lanes.map((l) => l.id)).toEqual(["b", "a", "c"]);
    // na (lane a, tinggi 200) turun sebesar tinggi b (100); nb naik sebesar tinggi a (200)
    expect(ys(r.nodes)).toEqual({ na: 180, nb: 30, nc: 400, out: 1000 });
    const bands = laneBands(r.lanes);
    expect(laneIdAt(r.nodes.find((n) => n.id === "na") as FlowNode, bands)).toBe("a");
    expect(laneIdAt(r.nodes.find((n) => n.id === "nb") as FlowNode, bands)).toBe("b");
  });
  it("tidak melakukan apa pun di ujung daftar", () => {
    const s = { lanes: lanes(), nodes: nodes() };
    expect(moveLane(s, "a", -1)).toBe(s);
    expect(moveLane(s, "c", 1)).toBe(s);
  });
});

describe("removeLane", () => {
  it("menolak jika lane masih berisi node", () => {
    expect(removeLane({ lanes: lanes(), nodes: nodes() }, "a")).toBeNull();
  });
  it("menghapus lane kosong dan menarik node di bawahnya ke atas", () => {
    const r = removeLane({ lanes: lanes(), nodes: [node("nc", 400), node("na", 80)] }, "b");
    expect(r?.lanes.map((l) => l.id)).toEqual(["a", "c"]);
    expect(ys(r?.nodes ?? [])).toEqual({ nc: 300, na: 80 });
  });
});
