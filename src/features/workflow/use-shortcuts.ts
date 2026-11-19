import { useEffect } from "react";
import { useFlowchartStore } from "@/features/flowchart/store";
import { useUiStore } from "@/stores/ui-store";
import { useExecutionStore } from "./execution-store";
import { useWorkflowStore } from "./store";

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Esc = tutup panel overlay (layar kecil); Ctrl/Cmd+Enter = Run (mode Workflow); Ctrl/Cmd+Z = Undo; Ctrl/Cmd+Shift+Z atau Ctrl+Y = Redo (undo bawaan tetap berlaku di dalam kolom input). */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && window.matchMedia("(max-width: 1023px)").matches) {
        const ui = useUiStore.getState();
        if (ui.sidebarOpen || ui.inspectorOpen) ui.closeOverlays();
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const t = e.target as HTMLElement | null;
      const editable = Boolean(t && (t.isContentEditable || EDITABLE.has(t.tagName)));

      const mode = useUiStore.getState().mode;

      if (key === "enter") {
        if (mode !== "workflow") return;
        e.preventDefault();
        const exec = useExecutionStore.getState();
        if (exec.status !== "running") void exec.run();
        return;
      }
      if (editable) return;
      const { undo, redo } = mode === "workflow" ? useWorkflowStore.getState() : useFlowchartStore.getState();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
