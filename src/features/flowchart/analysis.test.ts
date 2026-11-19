import { describe, expect, it } from "vitest";
import { analyzeFlowchart, buildGraph, endNodes, startNodes, stepOptions } from "./analysis";
import { createFlowEdge } from "./edge-factory";
import { FLOW_KIND_DEFS } from "./defs";
import { sampleFlowchart } from "./sample";
import { FLOW_NODE_TYPE, type FlowEdge, type FlowKind, type FlowNode } from "./types";

function n(id: string, kind: FlowKind, text = id, x = 0, y = 0): FlowNode {
  const d = FLOW_KIND_DEFS[kind];
  return { id, type: FLOW_NODE_TYPE, position: { x, y }, width: d.width, height: d.height, data: { kind, text, color: "default" } };
}
function e(id: string, source: string, target: string, label?: string, dashed = false): FlowEdge {
  return createFlowEdge({ id, source, target, sourceHandle: "r", targetHandle: "l", dashed, ...(label !== undefined && { label }) });
}
const ids = (issues: { id: string }[]) => issues.map((i) => i.id);

/** Mulai → Proses → Keputusan → (Ya) Selesai / (Tidak) kembali ke Proses. */
const okNodes = [n("s", "terminator", "Mulai", 0, 0), n("p", "process", "Isi data", 100, 0), n("d", "decision", "Valid?", 200, 0), n("f", "terminator", "Selesai", 300, 0)];
const okEdges = [e("1", "s", "p"), e("2", "p", "d"), e("3", "d", "f", "Ya"), e("4", "d", "p", "Tidak")];

describe("analyzeFlowchart", () => {
  it("canvas kosong tidak menghasilkan masalah", () => {
    expect(analyzeFlowchart([], [])).toEqual([]);
  });

  it("alur lengkap dengan pengulangan (siklus) tidak dianggap bermasalah", () => {
    expect(analyzeFlowchart(okNodes, okEdges)).toEqual([]);
  });

  it("catatan diabaikan sepenuhnya, termasuk yang tidak terhubung", () => {
    expect(analyzeFlowchart([...okNodes, n("c", "note", "Catatan")], okEdges)).toEqual([]);
  });

  it("tanpa titik Mulai adalah error; tanpa Selesai adalah peringatan", () => {
    const issues = analyzeFlowchart([n("p", "process"), n("q", "process")], [e("1", "p", "q")]);
    expect(issues.find((i) => i.id === "no-start")?.level).toBe("error");
    expect(issues.find((i) => i.id === "no-end")?.level).toBe("warning");
  });

  it("Keputusan dengan kurang dari dua cabang adalah error", () => {
    const issues = analyzeFlowchart(
      [n("s", "terminator", "Mulai"), n("d", "decision", "Cukup?"), n("f", "terminator", "Selesai")],
      [e("1", "s", "d"), e("2", "d", "f", "Ya")],
    );
    expect(issues.find((i) => i.id === "decision-branches:d")).toMatchObject({ level: "error", nodeIds: ["d"] });
  });

  it("cabang Keputusan tanpa label atau berlabel ganda diberi peringatan", () => {
    const base = [n("s", "terminator", "Mulai"), n("d", "decision", "Cukup?"), n("a", "terminator", "A"), n("b", "terminator", "B")];
    const unlabeled = analyzeFlowchart(base, [e("1", "s", "d"), e("2", "d", "a", "Ya"), e("3", "d", "b")]);
    expect(ids(unlabeled)).toContain("decision-labels:d");
    const dup = analyzeFlowchart(base, [e("1", "s", "d"), e("2", "d", "a", "Ya"), e("3", "d", "b", "ya")]);
    expect(ids(dup)).toContain("decision-dup:d");
  });

  it("jalan buntu, simbol terpencil, dan simbol yang tidak terjangkau dilaporkan", () => {
    const issues = analyzeFlowchart(
      [n("s", "terminator", "Mulai"), n("p", "process", "Buntu"), n("x", "process", "Sendiri"), n("y", "process", "Yatim"), n("z", "terminator", "Selesai")],
      [e("1", "s", "p"), e("2", "y", "z")],
    );
    expect(ids(issues)).toEqual(expect.arrayContaining(["dead-end:p", "isolated:x", "unreachable"]));
    expect(issues.find((i) => i.id === "unreachable")?.nodeIds).toEqual(["y", "z"]);
  });

  it("simbol bukan Keputusan yang bercabang diberi peringatan", () => {
    const issues = analyzeFlowchart(
      [n("s", "terminator", "Mulai"), n("p", "process", "Proses"), n("a", "terminator", "A"), n("b", "terminator", "B")],
      [e("1", "s", "p"), e("2", "p", "a"), e("3", "p", "b")],
    );
    expect(ids(issues)).toContain("fork:p");
  });

  it("beberapa titik Mulai diberi peringatan", () => {
    const issues = analyzeFlowchart(
      [n("s1", "terminator", "Mulai A", 0, 0), n("s2", "terminator", "Mulai B", 0, 100), n("f", "terminator", "Selesai", 300, 0)],
      [e("1", "s1", "f"), e("2", "s2", "f")],
    );
    expect(issues.find((i) => i.id === "multi-start")?.nodeIds).toEqual(["s1", "s2"]);
  });

  it("garis putus-putus ke basis data dianggap akses data: bukan cabang, bukan jalan buntu, tetap terjangkau", () => {
    const issues = analyzeFlowchart(
      [n("s", "terminator", "Mulai"), n("p", "process", "Simpan"), n("db", "database", "Data"), n("f", "terminator", "Selesai")],
      [e("1", "s", "p"), e("2", "p", "f"), e("3", "p", "db", "simpan", true)],
    );
    expect(issues).toEqual([]);
  });

  it("simbol yang hanya tersambung lewat garis putus-putus tetap dianggap terhubung", () => {
    const issues = analyzeFlowchart(
      [n("s", "terminator", "Mulai"), n("f", "terminator", "Selesai"), n("db", "database", "Data")],
      [e("1", "s", "f"), e("2", "s", "db", undefined, true)],
    );
    expect(ids(issues)).not.toContain("isolated:db");
    expect(ids(issues)).not.toContain("unreachable");
  });

  it("error diurutkan sebelum peringatan", () => {
    const issues = analyzeFlowchart([n("p", "process"), n("q", "process")], [e("1", "p", "q")]);
    const levels = issues.map((i) => i.level);
    expect(levels).toEqual([...levels].sort((a) => (a === "error" ? -1 : 1)));
  });

  it("contoh bawaan lolos tanpa masalah apa pun", () => {
    const doc = sampleFlowchart();
    expect(analyzeFlowchart(doc.nodes, doc.edges)).toEqual([]);
  });
});

describe("startNodes / endNodes / stepOptions", () => {
  const g = buildGraph(okNodes, okEdges);
  it("mengenali titik Mulai dan Selesai", () => {
    expect(startNodes(g).map((x) => x.id)).toEqual(["s"]);
    expect(endNodes(g).map((x) => x.id)).toEqual(["f"]);
  });
  it("garis putus-putus tidak ikut menjadi pilihan langkah", () => {
    const withAux = buildGraph(okNodes, [...okEdges, e("5", "p", "f", "arsip", true)]);
    expect(stepOptions(withAux, "p").map((o) => o.edgeId)).toEqual(["2"]);
  });
  it("mendahulukan cabang Ya, lalu Tidak, meski garis Tidak dibuat lebih dulu", () => {
    const rev = buildGraph(okNodes, [e("1", "s", "p"), e("2", "p", "d"), e("4", "d", "p", "Tidak"), e("3", "d", "f", "Ya")]);
    expect(stepOptions(rev, "d").map((o) => o.label)).toEqual(["Ya", "Tidak"]);
    expect(stepOptions(rev, "f")).toEqual([]);
  });
});
