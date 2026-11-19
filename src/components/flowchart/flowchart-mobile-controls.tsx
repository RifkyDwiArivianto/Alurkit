"use client";

import { MobileCanvasControls } from "@/components/layout/mobile-canvas-controls";
import { useFlowchartStore } from "@/features/flowchart/store";
import { useTestStore } from "@/features/flowchart/test-store";

/** Kontrol mengambang canvas Flowchart (HP): zoom, undo/redo, dan FAB palet. */
export function FlowchartMobileControls() {
  const undo = useFlowchartStore((s) => s.undo);
  const redo = useFlowchartStore((s) => s.redo);
  const canUndo = useFlowchartStore((s) => s.past.length > 0);
  const canRedo = useFlowchartStore((s) => s.future.length > 0);
  const testOpen = useTestStore((s) => s.open);
  return <MobileCanvasControls addLabel="Tambah simbol" undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} panelOpen={testOpen} />;
}
