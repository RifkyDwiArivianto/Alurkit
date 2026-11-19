import { useUiStore } from "@/stores/ui-store";
import { sampleFlowchart } from "./sample";
import { useFlowchartStore } from "./store";

/** Mengganti isi canvas dengan contoh lengkap. Dapat di-undo. */
export function loadSampleFlowchart() {
  useFlowchartStore.getState().replaceDoc(sampleFlowchart(), { history: true });
  useUiStore.getState().requestFit();
}

/** Mengosongkan canvas. Dapat di-undo. */
export function startNewFlowchart() {
  useFlowchartStore.getState().newDoc();
  useUiStore.getState().notify("info", "Flowchart baru dibuat. Tekan Ctrl+Z untuk mengembalikan yang sebelumnya.");
}
