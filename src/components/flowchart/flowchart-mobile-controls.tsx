"use client";

import { MobileCanvasControls } from "@/components/layout/mobile-canvas-controls";
import { useTestStore } from "@/features/flowchart/test-store";

/** Kontrol mengambang canvas Flowchart (HP): zoom dan FAB palet. */
export function FlowchartMobileControls() {
  const testOpen = useTestStore((s) => s.open);
  return <MobileCanvasControls addLabel="Tambah simbol" panelOpen={testOpen} />;
}
