"use client";

import { useUiStore } from "@/stores/ui-store";
import { MobileCanvasControls } from "./mobile-canvas-controls";

/** Kontrol mengambang canvas Workflow (HP): zoom dan FAB palet. */
export function WorkflowMobileControls() {
  const logOpen = useUiStore((s) => s.logOpen);
  return <MobileCanvasControls addLabel="Tambah node" panelOpen={logOpen} />;
}
