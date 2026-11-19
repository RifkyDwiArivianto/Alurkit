import type { FlowColor } from "./types";

export interface FlowPalette {
  label: string;
  /** Tampilan di canvas gelap. */
  stroke: string;
  fill: string;
  /** Tampilan di hasil ekspor (latar putih, siap cetak). */
  printStroke: string;
  printFill: string;
}

export const FLOW_PALETTE: Record<FlowColor, FlowPalette> = {
  default: { label: "Netral", stroke: "#8a8174", fill: "#211e1a", printStroke: "#475569", printFill: "#ffffff" },
  blue: { label: "Biru", stroke: "#7dd3fc", fill: "#0f2a3a", printStroke: "#0369a1", printFill: "#e0f2fe" },
  green: { label: "Hijau", stroke: "#86efac", fill: "#0f2e1c", printStroke: "#15803d", printFill: "#dcfce7" },
  amber: { label: "Kuning", stroke: "#fbbf24", fill: "#33260a", printStroke: "#b45309", printFill: "#fef3c7" },
  rose: { label: "Merah", stroke: "#fb7185", fill: "#3a1219", printStroke: "#be123c", printFill: "#ffe4e6" },
  violet: { label: "Ungu", stroke: "#a78bfa", fill: "#241a3d", printStroke: "#6d28d9", printFill: "#ede9fe" },
};
