"use client";

import { useMemo } from "react";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form-fields";
import {
  NUMERIC_TRANSFORM_OPS,
  VALUELESS_OPERATORS,
  validateConfig,
  type ConfigByKind,
} from "@/features/workflow/schemas";
import { useWorkflowStore } from "@/features/workflow/store";
import type { NodeKind, WorkflowNode } from "@/features/workflow/types";

interface FormProps<K extends NodeKind> {
  config: ConfigByKind[K];
  errors: Record<string, string>;
  onChange: (patch: Partial<ConfigByKind[K]>) => void;
}

const VALUE_TYPE_OPTIONS = [
  { value: "string", label: "Teks" },
  { value: "number", label: "Angka" },
  { value: "boolean", label: "Boolean" },
  { value: "json", label: "JSON" },
] as const;

const TRANSFORM_OPTIONS = [
  { value: "uppercase", label: "Huruf besar" },
  { value: "lowercase", label: "Huruf kecil" },
  { value: "trim", label: "Pangkas spasi" },
  { value: "length", label: "Panjang (teks/array)" },
  { value: "toNumber", label: "Ubah ke angka" },
  { value: "toString", label: "Ubah ke teks" },
  { value: "add", label: "Tambah" },
  { value: "subtract", label: "Kurang" },
  { value: "multiply", label: "Kali" },
  { value: "divide", label: "Bagi" },
  { value: "concat", label: "Gabungkan teks" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "eq", label: "sama dengan" },
  { value: "neq", label: "tidak sama dengan" },
  { value: "gt", label: "lebih besar dari" },
  { value: "gte", label: "lebih besar atau sama" },
  { value: "lt", label: "lebih kecil dari" },
  { value: "lte", label: "lebih kecil atau sama" },
  { value: "contains", label: "memuat" },
  { value: "exists", label: "ada" },
  { value: "notExists", label: "tidak ada" },
] as const;

const TEMPLATE_HINT = "Gunakan {{kunci}} untuk menyisipkan nilai yang sudah ada.";

function StartForm({ config, errors, onChange }: FormProps<"start">) {
  return (
    <TextAreaField
      label="Data masukan (JSON)"
      value={config.inputJson}
      onChange={(inputJson) => onChange({ inputJson })}
      error={errors.inputJson}
      hint="Objek JSON sebagai data awal. Kunci: huruf, angka, atau _."
      rows={6}
      mono
    />
  );
}

function SetValueForm({ config, errors, onChange }: FormProps<"setValue">) {
  return (
    <>
      <TextField label="Kunci tujuan" value={config.key} onChange={(key) => onChange({ key })} error={errors.key} mono />
      <SelectField label="Tipe nilai" value={config.valueType} options={VALUE_TYPE_OPTIONS} onChange={(valueType) => onChange({ valueType })} />
      <TextAreaField label="Nilai" value={config.value} onChange={(value) => onChange({ value })} error={errors.value} hint={TEMPLATE_HINT} rows={3} />
    </>
  );
}

function TransformForm({ config, errors, onChange }: FormProps<"transform">) {
  const needsOperand = NUMERIC_TRANSFORM_OPS.includes(config.operation) || config.operation === "concat";
  return (
    <>
      <SelectField label="Operasi" value={config.operation} options={TRANSFORM_OPTIONS} onChange={(operation) => onChange({ operation })} />
      <TextField label="Kunci sumber" value={config.sourceKey} onChange={(sourceKey) => onChange({ sourceKey })} error={errors.sourceKey} mono />
      <TextField label="Kunci hasil" value={config.targetKey} onChange={(targetKey) => onChange({ targetKey })} error={errors.targetKey} mono />
      {needsOperand && (
        <TextField
          label={config.operation === "concat" ? "Teks tambahan" : "Operand (angka)"}
          value={config.operand}
          onChange={(operand) => onChange({ operand })}
          error={errors.operand}
          hint={TEMPLATE_HINT}
        />
      )}
    </>
  );
}

function ConditionForm({ config, errors, onChange }: FormProps<"condition">) {
  return (
    <>
      <TextField label="Kunci yang diperiksa" value={config.key} onChange={(key) => onChange({ key })} error={errors.key} mono />
      <SelectField label="Operator" value={config.operator} options={OPERATOR_OPTIONS} onChange={(operator) => onChange({ operator })} hint="Cabang “Ya” dijalankan jika kondisi benar, “Tidak” jika salah." />
      {!VALUELESS_OPERATORS.includes(config.operator) && (
        <TextField label="Nilai pembanding" value={config.value} onChange={(value) => onChange({ value })} error={errors.value} hint={TEMPLATE_HINT} />
      )}
    </>
  );
}

function DelayForm({ config, errors, onChange }: FormProps<"delay">) {
  return (
    <TextField
      label="Durasi (ms)"
      type="number"
      value={config.ms}
      onChange={(v) => onChange({ ms: v === "" ? 0 : Number(v) })}
      error={errors.ms}
      hint="Maksimum 10.000 ms."
    />
  );
}

function OutputForm({ config, errors, onChange }: FormProps<"output">) {
  return (
    <TextField
      label="Kunci yang ditampilkan"
      value={config.key}
      onChange={(key) => onChange({ key })}
      error={errors.key}
      hint="Kosongkan untuk menampilkan seluruh data."
      mono
    />
  );
}

export function NodeConfigForm({ node }: { node: WorkflowNode }) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig);
  const { data } = node;
  const errors = useMemo(() => validateConfig(data.kind, data.config), [data.kind, data.config]);
  const id = node.id;

  switch (data.kind) {
    case "start":
      return <StartForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "start", p)} />;
    case "setValue":
      return <SetValueForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "setValue", p)} />;
    case "transform":
      return <TransformForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "transform", p)} />;
    case "condition":
      return <ConditionForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "condition", p)} />;
    case "delay":
      return <DelayForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "delay", p)} />;
    case "output":
      return <OutputForm config={data.config} errors={errors} onChange={(p) => updateConfig(id, "output", p)} />;
  }
}
