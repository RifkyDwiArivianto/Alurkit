import { describe, expect, it } from "vitest";
import { FLOW_KIND_DEFS } from "./defs";
import { laneBands, laneIdAt, nodeSize } from "./lanes";
import { renderFlowchartSvg } from "./render-svg";
import { sampleFlowchart } from "./sample";
import { parseFlowchartJson, stringifyFlowchart } from "./serialize";
import { EDGE_SHAPES, FLOW_COLORS, FLOW_KINDS } from "./types";

describe("contoh flowchart", () => {
  const doc = sampleFlowchart();

  it("memakai semua jenis simbol, semua warna, dan semua bentuk garis", () => {
    expect(new Set(doc.nodes.map((n) => n.data.kind))).toEqual(new Set(FLOW_KINDS));
    expect(new Set(doc.nodes.map((n) => n.data.color))).toEqual(new Set(FLOW_COLORS));
    expect(new Set(doc.edges.map((e) => e.type))).toEqual(new Set(EDGE_SHAPES));
  });

  it("memakai swimlane, label garis, garis putus-putus, dan ukuran simbol khusus", () => {
    expect(doc.lanes.length).toBeGreaterThanOrEqual(4);
    expect(new Set(doc.lanes.map((l) => l.height)).size).toBeGreaterThan(1);
    expect(doc.edges.some((e) => e.label === "Ya")).toBe(true);
    expect(doc.edges.some((e) => e.label === "Tidak")).toBe(true);
    expect(doc.edges.some((e) => e.data?.dashed)).toBe(true);
    expect(doc.nodes.some((n) => n.width !== FLOW_KIND_DEFS[n.data.kind].width)).toBe(true);
  });

  it("setiap simbol berada di dalam satu lane, dan tidak ada simbol yang saling tumpang tindih", () => {
    const bands = laneBands(doc.lanes);
    for (const n of doc.nodes) expect(laneIdAt(n, bands), n.id).not.toBeNull();
    for (const [i, a] of doc.nodes.entries()) {
      for (const b of doc.nodes.slice(i + 1)) {
        const sa = nodeSize(a);
        const sb = nodeSize(b);
        const apart =
          a.position.x + sa.w <= b.position.x || b.position.x + sb.w <= a.position.x ||
          a.position.y + sa.h <= b.position.y || b.position.y + sb.h <= a.position.y;
        expect(apart, `${a.id} bertumpuk dengan ${b.id}`).toBe(true);
      }
    }
  });

  it("setiap simbol (selain catatan) terhubung dengan minimal satu garis", () => {
    const used = new Set(doc.edges.flatMap((e) => [e.source, e.target]));
    for (const n of doc.nodes) expect(used.has(n.id), n.id).toBe(true);
  });

  it("lolos export lalu import, dan dapat dirender ke SVG", () => {
    const r = parseFlowchartJson(stringifyFlowchart(doc, true));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.nodes).toHaveLength(doc.nodes.length);
    expect(r.doc.edges).toHaveLength(doc.edges.length);
    expect(r.doc.edges.map((e) => e.type).sort()).toEqual(doc.edges.map((e) => e.type).sort());
    const { svg } = renderFlowchartSvg(doc);
    // nama lane panjang dibungkus per baris, jadi "Kepala Perpustakaan" muncul sebagai dua elemen teks
    for (const t of ["Anggota", "Petugas", "Sistem", "Kepala", "Perpustakaan"]) expect(svg).toContain(t);
  });
});
