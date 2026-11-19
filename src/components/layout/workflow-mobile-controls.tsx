"use client";

import { useWorkflowStore } from "@/features/workflow/store";
import { useUiStore } from "@/stores/ui-store";
import { MobileCanvasControls } from "./mobile-canvas-controls";

/** Kontrol mengambang canvas Workflow (HP): zoom, undo/redo, dan FAB palet. */
export function WorkflowMobileControls() {
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canUndo = useWorkflowStore((s) => s.past.length > 0);
  const canRedo = useWorkflowStore((s) => s.future.length > 0);
  const logOpen = useUiStore((s) => s.logOpen);
  return <MobileCanvasControls addLabel="Tambah node" undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} panelOpen={logOpen} />;
}
