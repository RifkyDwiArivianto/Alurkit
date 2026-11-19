import type { FlowKind } from "./types";

/**
 * Geometri bentuk dalam ruang 100×100 (diregangkan ke ukuran node).
 * Dipakai bersama oleh canvas (SVG) dan ekspor agar tampilannya sama.
 */
export interface PathShape {
  d: string;
  extra?: string[];
}

export const PATH_SHAPES: Partial<Record<FlowKind, PathShape>> = {
  decision: { d: "M50 0 L100 50 L50 100 L0 50 Z" },
  io: { d: "M14 0 H100 L86 100 H0 Z" },
  document: { d: "M0 0 H100 V86 C83 98 67 98 50 86 C33 74 17 74 0 86 Z" },
  database: {
    d: "M0 15 C0 -5 100 -5 100 15 V86 C100 104.5 0 104.5 0 86 Z",
    extra: ["M0 15 C0 33.3 100 33.3 100 15"],
  },
  subprocess: { d: "M0 0 H100 V100 H0 Z", extra: ["M9 0 V100", "M91 0 V100"] },
};

/** Area teks sebagai pecahan lebar/tinggi node (kiri/kanan = x, atas/bawah = y). */
export const TEXT_INSET: Record<FlowKind, { x: number; top: number; bottom: number }> = {
  terminator: { x: 0.1, top: 0.08, bottom: 0.08 },
  process: { x: 0.06, top: 0.08, bottom: 0.08 },
  decision: { x: 0.22, top: 0.2, bottom: 0.2 },
  io: { x: 0.14, top: 0.08, bottom: 0.08 },
  document: { x: 0.06, top: 0.08, bottom: 0.2 },
  database: { x: 0.06, top: 0.3, bottom: 0.1 },
  subprocess: { x: 0.12, top: 0.08, bottom: 0.08 },
  connector: { x: 0.1, top: 0.1, bottom: 0.1 },
  note: { x: 0.06, top: 0.08, bottom: 0.08 },
};
