import { useUiStore } from "@/stores/ui-store";
import { useExecutionStore } from "./execution-store";
import { sampleWorkflow } from "./sample";
import { useWorkflowStore } from "./store";

/** Mengganti isi canvas dengan contoh lengkap. Dapat di-undo; ditolak selama eksekusi berjalan. */
export function loadSampleWorkflow(): boolean {
  const { notify, requestFit } = useUiStore.getState();
  const exec = useExecutionStore.getState();
  if (exec.status === "running") {
    notify("error", "Hentikan eksekusi sebelum memuat contoh.");
    return false;
  }
  const sample = sampleWorkflow();
  useWorkflowStore.getState().replaceWorkflow(sample, { history: true });
  exec.clear();
  requestFit();
  notify("info", `“${sample.name}” dimuat. Tekan Ctrl+Enter untuk menjalankan, Ctrl+Z untuk membatalkan.`);
  return true;
}
