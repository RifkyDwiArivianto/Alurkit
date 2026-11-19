import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";
import { loadFromStorage, saveToStorage } from "./persistence";
import { stringifyWorkflow } from "./serialize";
import { useWorkflowStore } from "./store";

const DEBOUNCE_MS = 600;

/** Memuat workflow tersimpan saat mount, lalu menyimpan otomatis (debounce) setiap ada perubahan bermakna. */
export function usePersistence() {
  useEffect(() => {
    const ui = () => useUiStore.getState();
    const outcome = loadFromStorage();

    if (outcome.status === "ok") {
      useWorkflowStore.getState().replaceWorkflow(outcome.workflow, { history: false });
      ui().setSaveStatus("saved", null);
      ui().requestFit();
    } else if (outcome.status === "corrupt") {
      ui().notify("error", "Data tersimpan rusak dan tidak dimuat. Salinannya disimpan sebagai cadangan di penyimpanan lokal.");
    } else if (outcome.status === "unavailable") {
      ui().setSaveStatus("error");
      ui().notify("error", "Penyimpanan lokal tidak tersedia, perubahan tidak akan tersimpan. Gunakan Export untuk menyimpan.");
    }

    let last = stringifyWorkflow(useWorkflowStore.getState());
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const commit = () => {
      timer = undefined;
      if (pending === null) return;
      const text = pending;
      pending = null;
      const result = saveToStorage(text);
      if (result.ok) {
        last = text;
        ui().setSaveStatus("saved", Date.now());
      } else {
        const alreadyFailing = ui().saveStatus === "error";
        ui().setSaveStatus("error");
        if (!alreadyFailing) ui().notify("error", result.error);
      }
    };

    const unsubscribe = useWorkflowStore.subscribe((s, prev) => {
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.name === prev.name) return;
      const text = stringifyWorkflow(s);
      clearTimeout(timer);
      timer = undefined;
      if (text === last) {
        pending = null; // perubahan hanya seleksi/ukuran, atau kembali ke versi tersimpan
        if (ui().saveStatus === "pending") ui().setSaveStatus("saved");
        return;
      }
      pending = text;
      ui().setSaveStatus("pending");
      timer = setTimeout(commit, DEBOUNCE_MS);
    });

    const flush = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        commit();
      }
    };
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      unsubscribe();
      flush();
    };
  }, []);
}
