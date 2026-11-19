import { useEffect } from "react";
import { useUiStore } from "./ui-store";

const KEY = "flowforge:mode";

/** Mengingat mode terakhir (Workflow/Flowchart) di browser ini. */
export function useModePersistence() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "flowchart" || saved === "workflow") useUiStore.getState().setMode(saved);
    } catch {
      /* penyimpanan diblokir — mode tidak diingat */
    }
    return useUiStore.subscribe((s, prev) => {
      if (s.mode === prev.mode) return;
      try {
        localStorage.setItem(KEY, s.mode);
      } catch {
        /* diabaikan */
      }
    });
  }, []);
}
