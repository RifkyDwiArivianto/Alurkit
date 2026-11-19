import { describe, expect, it } from "vitest";
import { executeWorkflow } from "./engine/execute";
import { hasErrors, validateWorkflow } from "./engine/validate";
import { NODE_KINDS } from "./types";
import { sampleWorkflow } from "./sample";
import { parseWorkflowJson, stringifyWorkflow } from "./serialize";
import { TRANSFORM_OPS, VALUE_TYPES } from "./schemas";

const fastSleep = async () => {};

describe("contoh workflow", () => {
  const sample = sampleWorkflow();
  const data = sample.nodes.map((n) => n.data);

  it("valid tanpa error maupun peringatan", () => {
    expect(validateWorkflow(sample.nodes, sample.edges)).toEqual([]);
    expect(hasErrors(validateWorkflow(sample.nodes, sample.edges))).toBe(false);
  });

  it("memakai semua jenis node, semua operasi Transform, dan semua tipe Set Value", () => {
    expect(new Set(data.map((d) => d.kind))).toEqual(new Set(NODE_KINDS));
    const ops = data.flatMap((d) => (d.kind === "transform" ? [d.config.operation] : []));
    expect(new Set(ops)).toEqual(new Set(TRANSFORM_OPS));
    const types = data.flatMap((d) => (d.kind === "setValue" ? [d.config.valueType] : []));
    expect(new Set(types)).toEqual(new Set(VALUE_TYPES));
  });

  it("memakai beberapa operator Condition, cabang Ya dan Tidak, serta lebih dari satu Output", () => {
    const operators = data.flatMap((d) => (d.kind === "condition" ? [d.config.operator] : []));
    for (const op of ["eq", "gte", "gt", "contains"]) expect(operators).toContain(op);
    expect(sample.edges.some((e) => e.sourceHandle === "true")).toBe(true);
    expect(sample.edges.some((e) => e.sourceHandle === "false")).toBe(true);
    expect(data.filter((d) => d.kind === "output").length).toBeGreaterThan(1);
  });

  it("lolos export lalu import (round-trip)", () => {
    const r = parseWorkflowJson(stringifyWorkflow(sample, true));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.workflow.nodes).toHaveLength(sample.nodes.length);
    expect(r.workflow.edges).toHaveLength(sample.edges.length);
  });

  it("berjalan sukses dan menghasilkan semua output yang diharapkan", async () => {
    const r = await executeWorkflow(sample.nodes, sample.edges, { sleep: fastSleep });
    expect(r.status).toBe("success");
    const by = (label: string) => r.outputs.find((o) => o.label === label)?.value;
    expect(by("Hasil: nama tampil")).toBe("BUDI SANTOSO (MEMBER)");
    expect(by("Hasil: total bayar")).toBe("54000 rupiah");
    expect(by("Hasil: bonus")).toBe(true);
    expect(by("Hasil: ringkasan")).toBe("Pesanan Jus Alpukat x3 dengan 2 catatan khusus.");
    expect(by("Hasil: seluruh data")).toMatchObject({
      jumlah_catatan: 2,
      dapur: { prioritas: "rendah", alert: "tanpa gula" },
    });
    expect(r.outputs).toHaveLength(5);
  });

  it("memilih cabang Tidak bila kondisi tidak terpenuhi", async () => {
    const nodes = sample.nodes.map((n) =>
      n.data.kind === "start"
        ? { ...n, data: { ...n.data, config: { inputJson: n.data.config.inputJson.replace('"jumlah": 3', '"jumlah": 1').replace('"member": true', '"member": false') } } }
        : n,
    );
    const r = await executeWorkflow(nodes, sample.edges, { sleep: fastSleep });
    expect(r.status).toBe("success");
    const by = (label: string) => r.outputs.find((o) => o.label === label)?.value;
    expect(by("Hasil: nama tampil")).toBe("BUDI SANTOSO (UMUM)");
    expect(by("Hasil: total bayar")).toBe("23000 rupiah"); // 18000 + 5000, tanpa potongan
  });
});
