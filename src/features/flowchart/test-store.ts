import { create } from "zustand";
import type { StepOption } from "./analysis";

export type TestTab = "check" | "run";
/** Tinggi panel Uji alur di HP: kecil / sedang / besar. */
export type TestSize = "S" | "M" | "L";
/** Porsi tinggi layar per ukuran; L dibatasi sekitar 40% supaya canvas tetap terlihat. */
export const TEST_SIZE_RATIO: Record<TestSize, number> = { S: 0.24, M: 0.32, L: 0.4 };

export interface TraceStep {
  nodeId: string;
  /** Garis yang dilalui untuk sampai ke simbol ini; null pada simbol awal. */
  viaEdgeId: string | null;
  /** Label garis tersebut (mis. "Ya"); kosong jika tidak berlabel. */
  choice: string;
}

/** Batas langkah penelusuran, supaya alur berulang (siklus) tidak berjalan tanpa akhir. */
export const MAX_TRACE_STEPS = 200;

interface TestState {
  open: boolean;
  tab: TestTab;
  size: TestSize;
  /** Simbol bermasalah yang sedang disorot dari tab Cek struktur. */
  focusIds: string[];
  /** Naik setiap kali fokus diminta, supaya canvas memusat lagi walau simbolnya sama. */
  focusTick: number;
  trail: TraceStep[];

  openPanel: (tab?: TestTab) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setTab: (tab: TestTab) => void;
  setSize: (size: TestSize) => void;
  focus: (ids: string[]) => void;
  begin: (startId: string) => void;
  advance: (option: StepOption) => void;
  back: () => void;
  restart: () => void;
  resetTrace: () => void;
}

export const useTestStore = create<TestState>()((set) => ({
  open: false,
  tab: "check",
  size: "M",
  focusIds: [],
  focusTick: 0,
  trail: [],

  openPanel: (tab) => set((s) => ({ open: true, tab: tab ?? s.tab })),
  closePanel: () => set({ open: false, focusIds: [], trail: [] }),
  togglePanel: () => set((s) => (s.open ? { open: false, focusIds: [], trail: [] } : { open: true })),
  setTab: (tab) => set({ tab, focusIds: [] }),
  setSize: (size) => set({ size }),
  focus: (ids) => set((s) => (ids.length === 0 ? s : { focusIds: ids, focusTick: s.focusTick + 1 })),
  begin: (startId) => set({ trail: [{ nodeId: startId, viaEdgeId: null, choice: "" }], focusIds: [] }),
  advance: (o) =>
    set((s) =>
      s.trail.length === 0 || s.trail.length >= MAX_TRACE_STEPS
        ? s
        : { trail: [...s.trail, { nodeId: o.targetId, viaEdgeId: o.edgeId, choice: o.label }] },
    ),
  back: () => set((s) => (s.trail.length > 1 ? { trail: s.trail.slice(0, -1) } : s)),
  restart: () => set((s) => (s.trail.length > 1 ? { trail: s.trail.slice(0, 1) } : s)),
  resetTrace: () => set({ trail: [] }),
}));
