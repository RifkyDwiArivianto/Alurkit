import { describe, expect, it } from "vitest";
import { makeEdge, makeNode } from "../test-helpers";
import { findCycleNodeIds, hasErrors, validateWorkflow } from "./validate";

describe("validateWorkflow", () => {
  it("workflow kosong adalah error", () => {
    expect(hasErrors(validateWorkflow([], []))).toBe(true);
  });

  it("alur lengkap yang benar tidak punya error", () => {
    const nodes = [makeNode("start", "s"), makeNode("setValue", "v"), makeNode("output", "o")];
    const edges = [makeEdge("s", "v"), makeEdge("v", "o")];
    expect(validateWorkflow(nodes, edges)).toEqual([]);
  });

  it("mewajibkan Start dan Output", () => {
    const issues = validateWorkflow([makeNode("setValue", "v")], []);
    expect(issues.filter((i) => i.level === "error").length).toBeGreaterThanOrEqual(2);
  });

  it("mendeteksi siklus", () => {
    const nodes = [makeNode("start", "s"), makeNode("setValue", "a"), makeNode("transform", "b"), makeNode("output", "o")];
    const edges = [makeEdge("s", "a"), makeEdge("a", "b"), makeEdge("b", "a"), makeEdge("b", "o")];
    expect([...findCycleNodeIds(nodes, edges)].sort()).toEqual(["a", "b"]);
    expect(validateWorkflow(nodes, edges).some((i) => i.level === "error" && i.message.includes("siklus"))).toBe(true);
  });

  it("melaporkan konfigurasi tidak valid per node", () => {
    const nodes = [makeNode("start", "s", { inputJson: "{" }), makeNode("output", "o")];
    const issues = validateWorkflow(nodes, [makeEdge("s", "o")]);
    expect(issues.some((i) => i.nodeId === "s" && i.level === "error")).toBe(true);
  });

  it("memberi peringatan untuk node tak terjangkau dan cabang kosong", () => {
    const nodes = [makeNode("start", "s"), makeNode("condition", "c"), makeNode("output", "o"), makeNode("delay", "d")];
    const edges = [makeEdge("s", "c"), makeEdge("c", "o", "true")];
    const warnings = validateWorkflow(nodes, edges).filter((i) => i.level === "warning");
    expect(warnings.some((w) => w.nodeId === "d")).toBe(true);
    expect(warnings.some((w) => w.nodeId === "c" && w.message.includes("Tidak"))).toBe(true);
  });

  it("menandai koneksi yang merujuk node yang tidak ada", () => {
    const nodes = [makeNode("start", "s"), makeNode("output", "o")];
    const issues = validateWorkflow(nodes, [makeEdge("s", "o"), makeEdge("s", "hantu")]);
    expect(issues.some((i) => i.message.startsWith("Koneksi tidak valid"))).toBe(true);
  });
});
