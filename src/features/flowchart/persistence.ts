import { parseFlowchartJson } from "./serialize";
import type { FlowchartDoc } from "./types";

export const FLOWCHART_STORAGE_KEY = "flowforge:flowchart:v1";

export type LoadOutcome =
  | { status: "empty" }
  | { status: "ok"; doc: FlowchartDoc }
  | { status: "corrupt" }
  | { status: "unavailable" };

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadFlowchart(storage: Storage | undefined = safeStorage()): LoadOutcome {
  if (!storage) return { status: "unavailable" };
  try {
    const raw = storage.getItem(FLOWCHART_STORAGE_KEY);
    if (raw === null) return { status: "empty" };
    const parsed = parseFlowchartJson(raw);
    if (parsed.ok) return { status: "ok", doc: parsed.doc };
    try {
      storage.setItem(`${FLOWCHART_STORAGE_KEY}:corrupt`, raw); // cadangan agar tidak hilang diam-diam
    } catch {
      /* diabaikan */
    }
    return { status: "corrupt" };
  } catch {
    return { status: "unavailable" };
  }
}

export function saveFlowchart(
  text: string,
  storage: Storage | undefined = safeStorage(),
): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: "Penyimpanan lokal tidak tersedia di browser ini." };
  try {
    storage.setItem(FLOWCHART_STORAGE_KEY, text);
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan (penyimpanan penuh atau diblokir)." };
  }
}
