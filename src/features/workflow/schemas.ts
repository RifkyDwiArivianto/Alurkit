import { z } from "zod";
import { FORBIDDEN_KEYS, KEY_PATTERN, parseInputObject, tryParseJson } from "./json";
import type { NodeKind } from "./types";

export const VALUE_TYPES = ["string", "number", "boolean", "json"] as const;
export const TRANSFORM_OPS = [
  "uppercase",
  "lowercase",
  "trim",
  "length",
  "toNumber",
  "toString",
  "add",
  "subtract",
  "multiply",
  "divide",
  "concat",
] as const;
export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "exists",
  "notExists",
] as const;

export const NUMERIC_TRANSFORM_OPS: readonly string[] = ["add", "subtract", "multiply", "divide"];
export const NUMERIC_OPERATORS: readonly string[] = ["gt", "gte", "lt", "lte"];
export const VALUELESS_OPERATORS: readonly string[] = ["exists", "notExists"];
export const MAX_DELAY_MS = 10_000;

/** Bentuk (tipe) konfigurasi saja — dipakai saat import agar struktur file aman. */
export const CONFIG_SHAPES = {
  start: z.object({ inputJson: z.string().max(10_000) }),
  setValue: z.object({
    key: z.string().max(100),
    valueType: z.enum(VALUE_TYPES),
    value: z.string().max(10_000),
  }),
  transform: z.object({
    operation: z.enum(TRANSFORM_OPS),
    sourceKey: z.string().max(100),
    targetKey: z.string().max(100),
    operand: z.string().max(1_000),
  }),
  condition: z.object({
    key: z.string().max(100),
    operator: z.enum(CONDITION_OPERATORS),
    value: z.string().max(1_000),
  }),
  delay: z.object({ ms: z.number().finite() }),
  output: z.object({ key: z.string().max(100) }),
} as const;

export type ConfigByKind = { [K in keyof typeof CONFIG_SHAPES]: z.infer<(typeof CONFIG_SHAPES)[K]> };

const keyMessage = "Gunakan huruf, angka, atau _ (maks. 40 karakter, tidak diawali angka)";
const requiredKey = z
  .string()
  .trim()
  .min(1, "Wajib diisi")
  .regex(KEY_PATTERN, keyMessage)
  .refine((k) => !FORBIDDEN_KEYS.has(k), "Nama kunci ini tidak diizinkan");

const isNumeric = (s: string) => s.trim() !== "" && Number.isFinite(Number(s));
const hasTemplate = (s: string) => s.includes("{{");

/** Aturan isi konfigurasi — dipakai untuk validasi di inspector dan sebelum eksekusi. */
export const CONFIG_SCHEMAS: Record<NodeKind, z.ZodTypeAny> = {
  start: CONFIG_SHAPES.start.superRefine((v, ctx) => {
    const r = parseInputObject(v.inputJson);
    if (!r.ok) ctx.addIssue({ code: "custom", path: ["inputJson"], message: r.error });
  }),

  setValue: CONFIG_SHAPES.setValue.extend({ key: requiredKey }).superRefine((v, ctx) => {
    if (hasTemplate(v.value)) return; // nilai akhir baru diketahui saat dijalankan
    const fail = (message: string) => ctx.addIssue({ code: "custom", path: ["value"], message });
    if (v.valueType === "number" && !isNumeric(v.value)) fail("Harus berupa angka");
    if (v.valueType === "boolean" && !["true", "false"].includes(v.value.trim())) fail('Harus "true" atau "false"');
    if (v.valueType === "json" && !tryParseJson(v.value).ok) fail("Bukan JSON yang valid");
  }),

  transform: CONFIG_SHAPES.transform
    .extend({ sourceKey: requiredKey, targetKey: requiredKey })
    .superRefine((v, ctx) => {
      if (NUMERIC_TRANSFORM_OPS.includes(v.operation) && !hasTemplate(v.operand)) {
        if (!isNumeric(v.operand)) {
          ctx.addIssue({ code: "custom", path: ["operand"], message: "Operand harus berupa angka" });
        } else if (v.operation === "divide" && Number(v.operand) === 0) {
          ctx.addIssue({ code: "custom", path: ["operand"], message: "Tidak boleh membagi dengan nol" });
        }
      }
    }),

  condition: CONFIG_SHAPES.condition.extend({ key: requiredKey }).superRefine((v, ctx) => {
    if (VALUELESS_OPERATORS.includes(v.operator)) return;
    if (NUMERIC_OPERATORS.includes(v.operator) && !hasTemplate(v.value) && !isNumeric(v.value)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Nilai pembanding harus berupa angka" });
    }
  }),

  delay: CONFIG_SHAPES.delay.extend({
    ms: z
      .number({ invalid_type_error: "Masukkan angka" })
      .int("Harus bilangan bulat")
      .min(0, "Tidak boleh negatif")
      .max(MAX_DELAY_MS, `Maksimum ${MAX_DELAY_MS.toLocaleString("id-ID")} ms`),
  }),

  output: CONFIG_SHAPES.output.extend({
    key: z
      .string()
      .trim()
      .refine((k) => k === "" || (KEY_PATTERN.test(k) && !FORBIDDEN_KEYS.has(k)), keyMessage),
  }),
};

/** Hasil: peta nama-field → pesan error pertama. Kosong jika valid. */
export function validateConfig(kind: NodeKind, config: unknown): Record<string, string> {
  const result = CONFIG_SCHEMAS[kind].safeParse(config);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "_");
    if (!(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
