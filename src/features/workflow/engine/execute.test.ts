import { describe, expect, it } from "vitest";
import { makeEdge, makeNode } from "../test-helpers";
import { executeWorkflow, type ExecutionEvent } from "./execute";

const fastSleep = async () => {};

describe("executeWorkflow", () => {
  it("menjalankan alur linear dengan interpolasi dan transformasi", async () => {
    const nodes = [
      makeNode("start", "s", { inputJson: '{"nama":"ayu"}' }),
      makeNode("setValue", "v", { key: "pesan", valueType: "string", value: "Halo, {{nama}}!" }),
      makeNode("transform", "t", { operation: "uppercase", sourceKey: "pesan", targetKey: "pesan" }),
      makeNode("output", "o", { key: "pesan" }),
    ];
    const edges = [makeEdge("s", "v"), makeEdge("v", "t"), makeEdge("t", "o")];
    const events: ExecutionEvent[] = [];
    const r = await executeWorkflow(nodes, edges, { sleep: fastSleep, onEvent: (e) => events.push(e) });
    expect(r.status).toBe("success");
    expect(r.outputs.map((o) => o.value)).toEqual(["HALO, AYU!"]);
    expect(events.filter((e) => e.type === "node-success")).toHaveLength(4);
  });

  it("mengikuti cabang Condition yang tepat", async () => {
    const mk = (n: number) => [
      makeNode("start", "s", { inputJson: `{"n":${n}}` }),
      makeNode("condition", "c", { key: "n", operator: "gt", value: "5" }),
      makeNode("setValue", "yes", { key: "hasil", valueType: "string", value: "besar" }),
      makeNode("setValue", "no", { key: "hasil", valueType: "string", value: "kecil" }),
      makeNode("output", "o", { key: "hasil" }),
    ];
    const edges = [
      makeEdge("s", "c"),
      makeEdge("c", "yes", "true"),
      makeEdge("c", "no", "false"),
      makeEdge("yes", "o"),
      makeEdge("no", "o"),
    ];
    expect((await executeWorkflow(mk(9), edges, { sleep: fastSleep })).outputs[0]?.value).toBe("besar");
    expect((await executeWorkflow(mk(1), edges, { sleep: fastSleep })).outputs[0]?.value).toBe("kecil");
  });

  it("berhenti dengan status error dan melaporkan node yang gagal", async () => {
    const nodes = [
      makeNode("start", "s"),
      makeNode("transform", "t", { operation: "uppercase", sourceKey: "tidakAda", targetKey: "x" }),
      makeNode("output", "o"),
    ];
    const events: ExecutionEvent[] = [];
    const r = await executeWorkflow(nodes, [makeEdge("s", "t"), makeEdge("t", "o")], {
      sleep: fastSleep,
      onEvent: (e) => events.push(e),
    });
    expect(r.status).toBe("error");
    expect(r.outputs).toHaveLength(0);
    expect(events.some((e) => e.type === "node-error" && e.nodeId === "t")).toBe(true);
  });

  it("memanggil sleep dengan durasi Delay", async () => {
    const calls: number[] = [];
    const nodes = [makeNode("start", "s"), makeNode("delay", "d", { ms: 1234 }), makeNode("output", "o")];
    await executeWorkflow(nodes, [makeEdge("s", "d"), makeEdge("d", "o")], {
      sleep: async (ms) => void calls.push(ms),
    });
    expect(calls).toEqual([1234]);
  });

  it("dibatalkan lewat AbortSignal", async () => {
    const ac = new AbortController();
    const nodes = [makeNode("start", "s"), makeNode("delay", "d", { ms: 5000 }), makeNode("output", "o")];
    const p = executeWorkflow(nodes, [makeEdge("s", "d"), makeEdge("d", "o")], { signal: ac.signal });
    setTimeout(() => ac.abort(), 10);
    const r = await p;
    expect(r.status).toBe("cancelled");
    expect(r.outputs).toHaveLength(0);
  });

  it("membatasi jumlah langkah (pengaman jika siklus lolos)", async () => {
    const nodes = [makeNode("start", "s"), makeNode("setValue", "a"), makeNode("setValue", "b")];
    const edges = [makeEdge("s", "a"), makeEdge("a", "b"), makeEdge("b", "a")];
    const r = await executeWorkflow(nodes, edges, { sleep: fastSleep, maxSteps: 20 });
    expect(r.status).toBe("error");
    expect(r.error).toContain("batas");
  });

  it("error jika tidak ada Start", async () => {
    expect((await executeWorkflow([makeNode("output", "o")], [])).status).toBe("error");
  });
});
