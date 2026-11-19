export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Data yang mengalir antar node. Dibuat tanpa prototype agar aman dari prototype pollution. */
export type DataContext = Record<string, JsonValue>;

export const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !FORBIDDEN_KEYS.has(key);
}

export function createContext(): DataContext {
  return Object.create(null) as DataContext;
}

export function cloneContext(ctx: DataContext): DataContext {
  return Object.assign(createContext(), ctx);
}

export function hasKey(ctx: DataContext, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(ctx, key);
}

export function tryParseJson(text: string): { ok: true; value: JsonValue } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as JsonValue };
  } catch {
    return { ok: false };
  }
}

export function parseInputObject(
  text: string,
): { ok: true; value: DataContext } | { ok: false; error: string } {
  const parsed = tryParseJson(text);
  if (!parsed.ok) return { ok: false, error: 'Bukan JSON yang valid, contoh: {"nama":"Dunia"}' };
  const v = parsed.value;
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    return { ok: false, error: "Harus berupa objek JSON, bukan array atau nilai tunggal" };
  }
  const ctx = createContext();
  for (const [k, val] of Object.entries(v)) {
    if (!isSafeKey(k)) {
      return { ok: false, error: `Kunci "${k}" tidak valid (huruf, angka, _; tidak diawali angka)` };
    }
    ctx[k] = val;
  }
  return { ok: true, value: ctx };
}

export function formatValue(v: JsonValue): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}
