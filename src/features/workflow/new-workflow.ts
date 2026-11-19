import { useUiStore } from "@/stores/ui-store";
import { useExecutionStore } from "./execution-store";
import { useWorkflowStore } from "./store";

/** Mengosongkan canvas. Dapat di-undo; ditolak selama eksekusi berjalan. */
export function startNewWorkflow() {
  const exec = useExecutionStore.getState();
  const { notify } = useUiStore.getState();
  if (exec.status === "running") return notify("error", "Hentikan eksekusi sebelum membuat workflow baru.");
  useWorkflowStore.getState().newWorkflow();
  exec.clear();
  notify("info", "Workflow baru dibuat. Tekan Ctrl+Z untuk mengembalikan yang sebelumnya.");
}
