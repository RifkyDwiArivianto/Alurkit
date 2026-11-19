import { parseWorkflowJson, type LoadedWorkflow } from "./serialize";

export const STORAGE_KEY = "flowforge:workflow:v1";

export type LoadOutcome =
  | { status: "empty" }
  | { status: "ok"; workflow: LoadedWorkflow }
  | { status: "corrupt" }
  | { status: "unavailable" };

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // mis. akses penyimpanan diblokir browser
  }
}

export function loadFromStorage(storage: Storage | undefined = safeStorage()): LoadOutcome {
  if (!storage) return { status: "unavailable" };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { status: "empty" };
    const parsed = parseWorkflowJson(raw);
    if (parsed.ok) return { status: "ok", workflow: parsed.workflow };
    try {
      storage.setItem(`${STORAGE_KEY}:corrupt`, raw); // simpan cadangan agar tidak hilang diam-diam
    } catch {
      /* diabaikan */
    }
    return { status: "corrupt" };
  } catch {
    return { status: "unavailable" };
  }
}

export function saveToStorage(
  text: string,
  storage: Storage | undefined = safeStorage(),
): { ok: true } | { ok: false; error: string } {
  if (!storage) return { ok: false, error: "Penyimpanan lokal tidak tersedia di browser ini." };
  try {
    storage.setItem(STORAGE_KEY, text);
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menyimpan (penyimpanan penuh atau diblokir)." };
  }
}
