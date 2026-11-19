import { create } from "zustand";

export type LogTab = "log" | "result" | "issues";
export type SaveStatus = "idle" | "pending" | "saved" | "error";
export type ToastKind = "success" | "error" | "info";
export type AppMode = "workflow" | "flowchart";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface UiState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  logOpen: boolean;
  logTab: LogTab;
  saveStatus: SaveStatus;
  savedAt: number | null;
  mode: AppMode;
  chartSaveStatus: SaveStatus;
  chartSavedAt: number | null;
  toasts: Toast[];
  /** Naik setiap kali canvas perlu menyesuaikan viewport (setelah import/muat). */
  fitRequest: number;
  /** HP: sheet palet (tambah simbol/node) terbuka. */
  paletteOpen: boolean;
  /** HP: tinggi (px) bottom sheet yang sedang menutupi canvas; 0 bila tidak ada. */
  bottomInset: number;

  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleLog: () => void;
  openLog: (tab?: LogTab) => void;
  closeSidebar: () => void;
  setLogTab: (tab: LogTab) => void;
  /** Di layar kecil panel tampil sebagai overlay, jadi mulai dalam keadaan tertutup. */
  collapseForSmallScreen: () => void;
  closeOverlays: () => void;
  setSaveStatus: (status: SaveStatus, savedAt?: number | null) => void;
  setChartSaveStatus: (status: SaveStatus, savedAt?: number | null) => void;
  setMode: (mode: AppMode) => void;
  requestFit: () => void;
  openPalette: () => void;
  closePalette: () => void;
  setBottomInset: (px: number) => void;
  notify: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>()((set, get) => ({
  sidebarOpen: true,
  inspectorOpen: true,
  logOpen: false,
  logTab: "log",
  saveStatus: "idle",
  savedAt: null,
  mode: "flowchart",
  chartSaveStatus: "idle",
  chartSavedAt: null,
  toasts: [],
  fitRequest: 0,
  paletteOpen: false,
  bottomInset: 0,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  toggleLog: () => set((s) => ({ logOpen: !s.logOpen })),
  openLog: (tab) => set((s) => ({ logOpen: true, logTab: tab ?? s.logTab })),
  closeSidebar: () => set({ sidebarOpen: false }),
  setLogTab: (logTab) => set({ logTab }),
  collapseForSmallScreen: () => set({ sidebarOpen: false, inspectorOpen: false }),
  closeOverlays: () => set({ sidebarOpen: false, inspectorOpen: false }),
  setSaveStatus: (saveStatus, savedAt) =>
    set((s) => ({ saveStatus, savedAt: savedAt === undefined ? s.savedAt : savedAt })),
  setChartSaveStatus: (chartSaveStatus, chartSavedAt) =>
    set((s) => ({ chartSaveStatus, chartSavedAt: chartSavedAt === undefined ? s.chartSavedAt : chartSavedAt })),
  setMode: (mode) => set({ mode, paletteOpen: false }),
  requestFit: () => set((s) => ({ fitRequest: s.fitRequest + 1 })),
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  setBottomInset: (bottomInset) => set({ bottomInset }),

  notify: (kind, message) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message }] }));
    setTimeout(() => get().dismissToast(id), kind === "error" ? 7000 : 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
