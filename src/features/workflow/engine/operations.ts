import {
  cloneContext,
  createContext,
  formatValue,
  hasKey,
  isSafeKey,
  parseInputObject,
  tryParseJson,
  type DataContext,
  type JsonValue,
} from "../json";
import type { ConfigByKind } from "../schemas";

export class WorkflowRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowRuntimeError";
  }
}

const TEMPLATE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

function readKey(ctx: DataContext, key: string): JsonValue {
  if (!hasKey(ctx, key)) throw new WorkflowRuntimeError(`Kunci "${key}" tidak ada di data`);
  return ctx[key] as JsonValue;
}

function assertWritableKey(key: string) {
  if (!isSafeKey(key)) throw new WorkflowRuntimeError(`Nama kunci "${key}" tidak valid`);
}

/** Mengganti {{kunci}} dengan nilai dari data. Bukan evaluasi ekspresi — hanya pencarian kunci. */
export function interpolate(template: string, ctx: DataContext): string {
  return template.replace(TEMPLATE, (_m, key: string) => formatValue(readKey(ctx, key)));
}

function toFiniteNumber(text: string, what: string): number {
  const n = Number(text);
  if (text.trim() === "" || !Number.isFinite(n)) {
    throw new WorkflowRuntimeError(`${what} harus berupa angka (diterima: "${text}")`);
  }
  return n;
}

export function runStart(config: ConfigByKind["start"]): DataContext {
  const r = parseInputObject(config.inputJson);
  if (!r.ok) throw new WorkflowRuntimeError(`Data masukan tidak valid: ${r.error}`);
  return r.value;
}

export function runSetValue(config: ConfigByKind["setValue"], ctx: DataContext): DataContext {
  assertWritableKey(config.key);
  const text = interpolate(config.value, ctx);
  let value: JsonValue;
  switch (config.valueType) {
    case "string":
      value = text;
      break;
    case "number":
      value = toFiniteNumber(text, "Nilai");
      break;
    case "boolean": {
      const t = text.trim();
      if (t !== "true" && t !== "false") throw new WorkflowRuntimeError('Nilai boolean harus "true" atau "false"');
      value = t === "true";
      break;
    }
    case "json": {
      const r = tryParseJson(text);
      if (!r.ok) throw new WorkflowRuntimeError("Nilai bukan JSON yang valid");
      value = r.value;
      break;
    }
  }
  const next = cloneContext(ctx);
  next[config.key] = value;
  return next;
}

export function runTransform(config: ConfigByKind["transform"], ctx: DataContext): DataContext {
  assertWritableKey(config.targetKey);
  const src = readKey(ctx, config.sourceKey);
  const op = config.operation;

  const needText = (): string => {
    if (typeof src !== "string") throw new WorkflowRuntimeError(`Operasi "${op}" membutuhkan teks`);
    return src;
  };
  const needNumber = (): number => {
    if (typeof src !== "number") throw new WorkflowRuntimeError(`Operasi "${op}" membutuhkan angka`);
    return src;
  };

  let result: JsonValue;
  switch (op) {
    case "uppercase":
      result = needText().toUpperCase();
      break;
    case "lowercase":
      result = needText().toLowerCase();
      break;
    case "trim":
      result = needText().trim();
      break;
    case "length":
      if (typeof src === "string" || Array.isArray(src)) result = src.length;
      else throw new WorkflowRuntimeError('Operasi "length" membutuhkan teks atau array');
      break;
    case "toNumber":
      if (typeof src === "number") result = src;
      else if (typeof src === "string") result = toFiniteNumber(src, "Nilai");
      else throw new WorkflowRuntimeError("Tidak dapat diubah menjadi angka");
      break;
    case "toString":
      result = formatValue(src);
      break;
    case "add":
    case "subtract":
    case "multiply":
    case "divide": {
      const a = needNumber();
      const b = toFiniteNumber(interpolate(config.operand, ctx), "Operand");
      if (op === "divide" && b === 0) throw new WorkflowRuntimeError("Pembagian dengan nol");
      result = op === "add" ? a + b : op === "subtract" ? a - b : op === "multiply" ? a * b : a / b;
      break;
    }
    case "concat":
      if (typeof src !== "string" && typeof src !== "number") {
        throw new WorkflowRuntimeError('Operasi "concat" membutuhkan teks atau angka');
      }
      result = String(src) + interpolate(config.operand, ctx);
      break;
  }

  const next = cloneContext(ctx);
  next[config.targetKey] = result;
  return next;
}

function looseEquals(actual: JsonValue, expected: string): boolean {
  const e = expected.trim();
  if (typeof actual === "string") return actual === expected;
  if (typeof actual === "number") return e !== "" && Number(e) === actual;
  if (typeof actual === "boolean") return e === String(actual);
  if (actual === null) return e === "null";
  return JSON.stringify(actual) === e;
}

export function evaluateCondition(config: ConfigByKind["condition"], ctx: DataContext): boolean {
  const { key, operator } = config;
  if (operator === "exists") return hasKey(ctx, key);
  if (operator === "notExists") return !hasKey(ctx, key);

  const actual = readKey(ctx, key);
  const expected = interpolate(config.value, ctx);

  switch (operator) {
    case "eq":
      return looseEquals(actual, expected);
    case "neq":
      return !looseEquals(actual, expected);
    case "contains":
      if (typeof actual === "string") return actual.includes(expected);
      if (Array.isArray(actual)) return actual.some((item) => looseEquals(item, expected));
      throw new WorkflowRuntimeError('Operator "memuat" membutuhkan teks atau array');
    default: {
      if (typeof actual !== "number") throw new WorkflowRuntimeError(`Operator perbandingan membutuhkan angka pada "${key}"`);
      const b = toFiniteNumber(expected, "Nilai pembanding");
      return operator === "gt" ? actual > b : operator === "gte" ? actual >= b : operator === "lt" ? actual < b : actual <= b;
    }
  }
}

export function pickOutput(config: ConfigByKind["output"], ctx: DataContext): JsonValue {
  const key = config.key.trim();
  if (key === "") {
    const all: Record<string, JsonValue> = {};
    for (const k of Object.keys(ctx)) all[k] = ctx[k] as JsonValue;
    return all;
  }
  return readKey(ctx, key);
}

export { createContext };
