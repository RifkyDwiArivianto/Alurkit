import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";
import { loadFlowchart, saveFlowchart } from "./persistence";
import { stringifyFlowchart } from "./serialize";
import { useFlowchartStore } from "./store";

const DEBOUNCE_MS = 600;

/** Memuat flowchart tersimpan saat mount, lalu menyimpan otomatis (debounce) setiap ada perubahan bermakna. */
export function useFlowchartPersistence() {
  useEffect(() => {
    const ui = () => useUiStore.getState();
    const outcome = loadFlowchart();

    if (outcome.status === "ok") {
      useFlowchartStore.getState().replaceDoc(outcome.doc, { history: false });
      ui().setChartSaveStatus("saved", null);
      ui().requestFit();
    } else if (outcome.status === "corrupt") {
      ui().notify("error", "Data flowchart tersimpan rusak dan tidak dimuat. Salinannya disimpan sebagai cadangan di penyimpanan lokal.");
    } else if (outcome.status === "unavailable") {
      ui().setChartSaveStatus("error");
    }

    let last = stringifyFlowchart(useFlowchartStore.getState());
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const commit = () => {
      timer = undefined;
      if (pending === null) return;
      const text = pending;
      pending = null;
      const result = saveFlowchart(text);
      if (result.ok) {
        last = text;
        ui().setChartSaveStatus("saved", Date.now());
      } else {
        const alreadyFailing = ui().chartSaveStatus === "error";
        ui().setChartSaveStatus("error");
        if (!alreadyFailing) ui().notify("error", result.error);
      }
    };

    const unsubscribe = useFlowchartStore.subscribe((s, prev) => {
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.lanes === prev.lanes && s.title === prev.title) return;
      const text = stringifyFlowchart(s);
      clearTimeout(timer);
      timer = undefined;
      if (text === last) {
        pending = null;
        if (ui().chartSaveStatus === "pending") ui().setChartSaveStatus("saved");
        return;
      }
      pending = text;
      ui().setChartSaveStatus("pending");
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
