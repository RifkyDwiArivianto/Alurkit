import { describe, expect, it } from "vitest";
import { compactFlowchart as sampleFlowchart } from "./test-fixtures";
import { MAX_FILE_BYTES, parseFlowchartJson, stringifyFlowchart } from "./serialize";

const base = () => JSON.parse(stringifyFlowchart(sampleFlowchart())) as Record<string, unknown>;
const mutate = (fn: (f: Record<string, any>) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const f = base();
  fn(f);
  return JSON.stringify(f);
};
const fail = (text: string, part: string) => {
  const r = parseFlowchartJson(text);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain(part);
};

describe("round-trip", () => {
  it("menjaga judul, lane, simbol, ukuran, label, dan gaya garis", () => {
    const src = sampleFlowchart();
    src.edges[3] = { ...src.edges[3]!, data: { dashed: true }, type: "straight" };
    const r = parseFlowchartJson(stringifyFlowchart(src, true));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.title).toBe(src.title);
    expect(r.doc.lanes.map((l) => l.name)).toEqual(["Pelanggan", "Admin", "Gudang"]);
    expect(r.doc.nodes).toHaveLength(src.nodes.length);
    expect(r.doc.nodes[3]).toMatchObject({ width: 170, height: 110, data: { kind: "decision", color: "amber" } });
    expect(r.doc.edges[3]).toMatchObject({ label: "Ya", type: "straight", data: { dashed: true } });
  });
  it("tidak menyimpan status UI", () => {
    const src = sampleFlowchart();
    src.nodes[0] = { ...src.nodes[0]!, selected: true };
    expect(stringifyFlowchart(src)).not.toContain("selected");
  });
});

describe("kompatibilitas file lama", () => {
  it("file flowchart lama (app: flowforge-flowchart) tetap bisa diimpor", () => {
    expect(parseFlowchartJson(mutate((f) => (f.app = "flowforge-flowchart"))).ok).toBe(true);
  });
  it("file Workflow lama (app: flowforge) tetap ditolak dengan petunjuk mode", () => {
    fail(JSON.stringify({ app: "flowforge", version: 1 }), "file Workflow");
  });
});

describe("penolakan", () => {
  it("bukan JSON, file Workflow, app lain, versi salah", () => {
    fail("{", "bukan JSON");
    fail(JSON.stringify({ app: "alurkit", version: 1 }), "file Workflow");
    fail(JSON.stringify({ app: "lain" }), "bukan file flowchart");
    fail(mutate((f) => (f.version = 7)), "tidak didukung");
  });
  it("struktur salah: warna, sisi, ukuran, ID berbahaya", () => {
    fail(mutate((f) => (f.nodes[0].color = "pink")), "Struktur file tidak valid");
    fail(mutate((f) => (f.edges[0].sourceHandle = "x")), "Struktur file tidak valid");
    fail(mutate((f) => (f.nodes[0].width = 5)), "Struktur file tidak valid");
    fail(mutate((f) => (f.nodes[0].id = "__proto__ x")), "Struktur file tidak valid");
  });
  it("ID ganda, garis ke simbol hilang, ke diri sendiri, dan duplikat", () => {
    fail(mutate((f) => (f.nodes[1].id = f.nodes[0].id)), "ID simbol ganda");
    fail(mutate((f) => (f.lanes[1].id = f.lanes[0].id)), "ID lane ganda");
    fail(mutate((f) => f.edges.push({ source: "n1", target: "hantu", sourceHandle: "r", targetHandle: "l" })), "Koneksi tidak valid");
    fail(mutate((f) => f.edges.push({ source: "n1", target: "n1", sourceHandle: "r", targetHandle: "l" })), "Koneksi tidak valid");
    fail(mutate((f) => f.edges.push({ ...f.edges[0] })), "Koneksi tidak valid");
  });
  it("file terlalu besar", () => fail("x".repeat(MAX_FILE_BYTES + 1), "terlalu besar"));
});
