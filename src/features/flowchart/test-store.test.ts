import { beforeEach, describe, expect, it } from "vitest";
import { MAX_TRACE_STEPS, useTestStore } from "./test-store";

const get = () => useTestStore.getState();
const opt = (i: number, label = "") => ({ edgeId: `e${i}`, targetId: `n${i}`, label });

beforeEach(() => useTestStore.setState({ open: false, tab: "check", focusIds: [], focusTick: 0, trail: [] }));

describe("penelusuran", () => {
  it("begin memulai dari satu simbol, advance menambah langkah beserta pilihannya", () => {
    get().begin("n0");
    get().advance(opt(1, "Ya"));
    expect(get().trail).toEqual([
      { nodeId: "n0", viaEdgeId: null, choice: "" },
      { nodeId: "n1", viaEdgeId: "e1", choice: "Ya" },
    ]);
  });

  it("advance tanpa begin diabaikan", () => {
    get().advance(opt(1));
    expect(get().trail).toEqual([]);
  });

  it("back mundur satu langkah tapi tidak menghapus simbol awal; restart kembali ke awal", () => {
    get().begin("n0");
    get().advance(opt(1));
    get().advance(opt(2));
    get().back();
    expect(get().trail.map((t) => t.nodeId)).toEqual(["n0", "n1"]);
    get().restart();
    expect(get().trail.map((t) => t.nodeId)).toEqual(["n0"]);
    get().back();
    expect(get().trail.map((t) => t.nodeId)).toEqual(["n0"]);
  });

  it("dibatasi MAX_TRACE_STEPS supaya siklus tidak berjalan tanpa akhir", () => {
    get().begin("n0");
    for (let i = 0; i < MAX_TRACE_STEPS + 20; i++) get().advance(opt(i));
    expect(get().trail).toHaveLength(MAX_TRACE_STEPS);
  });
});

describe("panel dan fokus", () => {
  it("menutup panel membersihkan penelusuran dan sorotan", () => {
    get().openPanel("run");
    get().begin("n0");
    get().focus(["n1"]);
    get().closePanel();
    expect(get()).toMatchObject({ open: false, trail: [], focusIds: [] });
  });

  it("focus menaikkan tick walau simbolnya sama; daftar kosong diabaikan", () => {
    get().focus(["a"]);
    get().focus(["a"]);
    expect(get().focusTick).toBe(2);
    get().focus([]);
    expect(get().focusTick).toBe(2);
  });

  it("berpindah tab menghapus sorotan masalah", () => {
    get().focus(["a"]);
    get().setTab("run");
    expect(get().focusIds).toEqual([]);
  });
});
