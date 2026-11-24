import { describe, expect, it } from "vitest";
import { LEGACY_STORAGE_KEY, loadFromStorage, saveToStorage, STORAGE_KEY } from "./persistence";
import { stringifyWorkflow } from "./serialize";
import { makeEdge, makeNode } from "./test-helpers";

function fakeStorage(failWrites = false) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new Error("QuotaExceededError");
      data.set(k, v);
    },
  } as unknown as Storage;
  return { storage, data };
}

describe("persistence", () => {
  it("kosong → empty", () => {
    expect(loadFromStorage(fakeStorage().storage).status).toBe("empty");
  });

  it("simpan lalu muat kembali", () => {
    const { storage } = fakeStorage();
    const text = stringifyWorkflow({
      name: "Tersimpan",
      nodes: [makeNode("start", "s"), makeNode("output", "o")],
      edges: [makeEdge("s", "o")],
    });
    expect(saveToStorage(text, storage).ok).toBe(true);
    const out = loadFromStorage(storage);
    expect(out.status).toBe("ok");
    if (out.status === "ok") expect(out.workflow.nodes).toHaveLength(2);
  });

  it("data di key lama (flowforge:…) tetap dimuat, simpan berikutnya ke key baru", () => {
    const { storage, data } = fakeStorage();
    const text = stringifyWorkflow({ name: "Lama", nodes: [makeNode("start", "s")], edges: [] });
    storage.setItem(LEGACY_STORAGE_KEY, text);
    const out = loadFromStorage(storage);
    expect(out.status).toBe("ok");
    saveToStorage(text, storage);
    expect(data.has(STORAGE_KEY)).toBe(true);
  });

  it("data rusak → corrupt dan dicadangkan", () => {
    const { storage, data } = fakeStorage();
    storage.setItem(STORAGE_KEY, "{rusak");
    expect(loadFromStorage(storage).status).toBe("corrupt");
    expect(data.get(`${STORAGE_KEY}:corrupt`)).toBe("{rusak");
  });

  it("gagal menulis dilaporkan, bukan dilempar", () => {
    const r = saveToStorage("{}", fakeStorage(true).storage);
    expect(r.ok).toBe(false);
  });

  it("tanpa storage → unavailable / gagal simpan", () => {
    expect(saveToStorage("{}", undefined).ok).toBe(false);
  });
});
