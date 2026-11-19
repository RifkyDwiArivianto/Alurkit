import { describe, expect, it } from "vitest";
import { createContext, type DataContext } from "../json";
import {
  evaluateCondition,
  interpolate,
  pickOutput,
  runSetValue,
  runStart,
  runTransform,
  WorkflowRuntimeError,
} from "./operations";

const ctx = (o: Record<string, unknown>): DataContext => Object.assign(createContext(), o) as DataContext;

describe("interpolate", () => {
  it("mengganti {{kunci}} dan menolak kunci yang hilang", () => {
    expect(interpolate("Halo, {{nama}}!", ctx({ nama: "Ayu" }))).toBe("Halo, Ayu!");
    expect(() => interpolate("{{x}}", ctx({}))).toThrow(WorkflowRuntimeError);
  });
  it("tidak mengevaluasi ekspresi", () => {
    expect(interpolate("{{1+1}}", ctx({}))).toBe("{{1+1}}");
  });
});

describe("runStart", () => {
  it("mem-parse input objek dan menolak yang tidak valid", () => {
    expect(runStart({ inputJson: '{"a":1}' }).a).toBe(1);
    expect(() => runStart({ inputJson: "[1]" })).toThrow();
    expect(() => runStart({ inputJson: '{"__proto__":1}' })).toThrow();
  });
});

describe("runSetValue", () => {
  it("mengonversi tipe dan tidak mengubah data awal", () => {
    const base = ctx({ n: 2 });
    const out = runSetValue({ key: "x", valueType: "number", value: "{{n}}" }, base);
    expect(out.x).toBe(2);
    expect("x" in base).toBe(false);
  });
  it("menolak angka/boolean/json yang tidak valid dan kunci berbahaya", () => {
    expect(() => runSetValue({ key: "x", valueType: "number", value: "abc" }, ctx({}))).toThrow();
    expect(() => runSetValue({ key: "x", valueType: "boolean", value: "ya" }, ctx({}))).toThrow();
    expect(() => runSetValue({ key: "x", valueType: "json", value: "{" }, ctx({}))).toThrow();
    expect(() => runSetValue({ key: "__proto__", valueType: "string", value: "a" }, ctx({}))).toThrow();
  });
});

describe("runTransform", () => {
  const t = (operation: Parameters<typeof runTransform>[0]["operation"], operand = "") =>
    ({ operation, sourceKey: "v", targetKey: "r", operand });
  it("operasi teks", () => {
    expect(runTransform(t("uppercase"), ctx({ v: "ab" })).r).toBe("AB");
    expect(runTransform(t("trim"), ctx({ v: "  a " })).r).toBe("a");
    expect(runTransform(t("length"), ctx({ v: [1, 2, 3] })).r).toBe(3);
    expect(runTransform(t("concat", "-{{v}}"), ctx({ v: "a" })).r).toBe("a-a");
  });
  it("operasi angka dan galat", () => {
    expect(runTransform(t("add", "3"), ctx({ v: 2 })).r).toBe(5);
    expect(runTransform(t("divide", "4"), ctx({ v: 2 })).r).toBe(0.5);
    expect(() => runTransform(t("divide", "0"), ctx({ v: 2 }))).toThrow();
    expect(() => runTransform(t("add", "1"), ctx({ v: "x" }))).toThrow();
    expect(() => runTransform(t("uppercase"), ctx({}))).toThrow();
    expect(runTransform(t("toNumber"), ctx({ v: "4.5" })).r).toBe(4.5);
  });
});

describe("evaluateCondition", () => {
  const c = (operator: Parameters<typeof evaluateCondition>[0]["operator"], value = "") => ({ key: "v", operator, value });
  it("perbandingan", () => {
    expect(evaluateCondition(c("gt", "1"), ctx({ v: 2 }))).toBe(true);
    expect(evaluateCondition(c("lte", "1"), ctx({ v: 2 }))).toBe(false);
    expect(evaluateCondition(c("eq", "a"), ctx({ v: "a" }))).toBe(true);
    expect(evaluateCondition(c("neq", "true"), ctx({ v: true }))).toBe(false);
    expect(evaluateCondition(c("contains", "ell"), ctx({ v: "hello" }))).toBe(true);
  });
  it("exists tidak melempar; operator lain melempar jika kunci hilang", () => {
    expect(evaluateCondition(c("exists"), ctx({}))).toBe(false);
    expect(evaluateCondition(c("notExists"), ctx({}))).toBe(true);
    expect(() => evaluateCondition(c("eq", "a"), ctx({}))).toThrow();
    expect(() => evaluateCondition(c("gt", "1"), ctx({ v: "x" }))).toThrow();
  });
});

describe("pickOutput", () => {
  it("seluruh data atau satu kunci", () => {
    expect(pickOutput({ key: "" }, ctx({ a: 1 }))).toEqual({ a: 1 });
    expect(pickOutput({ key: "a" }, ctx({ a: 1 }))).toBe(1);
    expect(() => pickOutput({ key: "z" }, ctx({}))).toThrow();
  });
});
