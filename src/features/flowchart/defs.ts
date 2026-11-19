import type { FlowKind } from "./types";

export interface FlowKindDef {
  kind: FlowKind;
  label: string;
  hint: string;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  defaultText: string;
}

export const FLOW_KIND_DEFS: Record<FlowKind, FlowKindDef> = {
  terminator: { kind: "terminator", label: "Mulai / Selesai", hint: "Awal atau akhir alur", width: 160, height: 56, minWidth: 80, minHeight: 40, defaultText: "Mulai" },
  process: { kind: "process", label: "Proses", hint: "Langkah atau aktivitas", width: 160, height: 64, minWidth: 80, minHeight: 40, defaultText: "Proses" },
  decision: { kind: "decision", label: "Keputusan", hint: "Percabangan ya/tidak", width: 170, height: 110, minWidth: 110, minHeight: 80, defaultText: "Kondisi?" },
  io: { kind: "io", label: "Input / Output", hint: "Data masuk atau keluar", width: 170, height: 64, minWidth: 100, minHeight: 40, defaultText: "Input data" },
  document: { kind: "document", label: "Dokumen", hint: "Dokumen atau laporan", width: 160, height: 76, minWidth: 90, minHeight: 50, defaultText: "Dokumen" },
  database: { kind: "database", label: "Basis data", hint: "Penyimpanan data", width: 120, height: 88, minWidth: 80, minHeight: 64, defaultText: "Data" },
  subprocess: { kind: "subprocess", label: "Sub-proses", hint: "Proses yang dirinci di tempat lain", width: 170, height: 64, minWidth: 100, minHeight: 40, defaultText: "Sub-proses" },
  connector: { kind: "connector", label: "Konektor", hint: "Sambungan antar bagian", width: 44, height: 44, minWidth: 32, minHeight: 32, defaultText: "A" },
  note: { kind: "note", label: "Catatan", hint: "Keterangan bebas", width: 180, height: 80, minWidth: 80, minHeight: 40, defaultText: "Catatan" },
};

export const FLOW_KIND_ORDER: FlowKind[] = [
  "terminator",
  "process",
  "decision",
  "io",
  "document",
  "database",
  "subprocess",
  "connector",
  "note",
];
