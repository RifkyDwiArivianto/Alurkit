import { describe, expect, it } from "vitest";
import { makeEdge, makeNode } from "./test-helpers";
import { MAX_FILE_BYTES, parseWorkflowJson, serializeWorkflow, stringifyWorkflow } from "./serialize";

const sample = () => {
  const nodes = [
    makeNode("start", "s", { inputJson: '{"n":3}' }),
    makeNode("condition", "c", { key: "n", operator: "gt", value: "1" }),
    makeNode("output", "o", { key: "n" }),
  ];
  nodes[1]!.position = { x: 10.26, y: 20 };
  const edges = [makeEdge("s", "c"), makeEdge("c", "o", "true")];
  return { name: "Contoh", nodes, edges };
};

const withFile = (patch: (f: Record<string, unknown>) => void) => {
  const f = JSON.parse(stringifyWorkflow(sample())) as Record<string, unknown>;
  patch(f);
  return JSON.stringify(f);
};

describe("serialisasi", () => {
  it("round-trip menjaga node, konfigurasi, posisi (dibulatkan), dan edge", () => {
    const r = parseWorkflowJson(stringifyWorkflow(sample(), true));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.workflow.name).toBe("Contoh");
    expect(r.workflow.nodes.map((n) => n.data.kind)).toEqual(["start", "condition", "output"]);
    expect(r.workflow.nodes[1]?.position).toEqual({ x: 10.3, y: 20 });
    expect(r.workflow.edges).toHaveLength(2);
    expect(r.workflow.edges[1]?.label).toBe("Ya");
  });

  it("file ekspor lama (app: flowforge) tetap bisa diimpor", () => {
    expect(parseWorkflowJson(withFile((f) => (f.app = "flowforge"))).ok).toBe(true);
  });

  it("file baru memakai penanda app: alurkit", () => {
    expect(serializeWorkflow(sample()).app).toBe("alurkit");
  });

  it("tidak menyertakan status UI seperti seleksi", () => {
    const w = sample();
    w.nodes[0]!.selected = true;
    expect(JSON.stringify(serializeWorkflow(w))).not.toContain("selected");
  });
});

describe("penolakan file tidak valid", () => {
  const fail = (text: string, part: string) => {
    const r = parseWorkflowJson(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(part);
  };

  it("bukan JSON / bukan Alurkit / versi salah", () => {
    fail("{", "bukan JSON");
    fail("[]", "bukan file workflow");
    fail(withFile((f) => (f.app = "lain")), "bukan file workflow");
    fail(withFile((f) => (f.version = 99)), "tidak didukung");
  });

  it("tipe konfigurasi salah", () => {
    fail(
      withFile((f) => {
        const nodes = f.nodes as { kind: string; config: Record<string, unknown> }[];
        nodes.push({ kind: "delay", config: { ms: "lama" }, id: "d", label: "D", position: { x: 0, y: 0 } } as never);
      }),
      "Struktur file tidak valid",
    );
  });

  it("ID node ganda, edge ke node hilang, dan koneksi melanggar aturan", () => {
    fail(withFile((f) => ((f.nodes as { id: string }[])[2]!.id = "s")), "ID node ganda");
    fail(withFile((f) => (f.edges as unknown[]).push({ source: "s", target: "hantu" })), "Koneksi tidak valid");
    fail(withFile((f) => (f.edges as unknown[]).push({ source: "c", target: "s", sourceHandle: "true" })), "Koneksi tidak valid");
  });

  it("file terlalu besar", () => {
    fail("x".repeat(MAX_FILE_BYTES + 1), "terlalu besar");
  });

  it("ID dengan karakter berbahaya ditolak", () => {
    fail(withFile((f) => ((f.nodes as { id: string }[])[0]!.id = "__proto__ x")), "Struktur file tidak valid");
  });
});
