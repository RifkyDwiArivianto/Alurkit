"use client";

import { useEffect } from "react";
import { FlowchartCanvas } from "@/features/flowchart/canvas/flowchart-canvas";
import { useIsMobile } from "@/lib/use-is-mobile";
import { OverlayScrim } from "@/components/layout/overlay-scrim";
import { useUiStore } from "@/stores/ui-store";
import { FlowchartInspector } from "./flowchart-inspector";
import { FlowchartInspectorSheet } from "./flowchart-inspector-sheet";
import { FlowchartPaletteSheet } from "./flowchart-palette-sheet";
import { FlowchartSidebar } from "./flowchart-sidebar";
import { FlowchartMobileTopBar } from "./flowchart-mobile-top-bar";
import { FlowchartTopBar } from "./flowchart-top-bar";
import { TestPanel } from "./test-panel";

export function FlowchartWorkspace() {
  const isMobile = useIsMobile();
  // Panel samping desktop yang masih terbuka saat jendela menyempit ke HP tidak punya tombol penutup di sana.
  useEffect(() => {
    if (isMobile) useUiStore.getState().closeOverlays();
  }, [isMobile]);
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-ink-950">
      {isMobile ? <FlowchartMobileTopBar /> : <FlowchartTopBar />}
      <div className="relative flex min-h-0 flex-1">
        <OverlayScrim />
        <FlowchartSidebar />
        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          <FlowchartCanvas />
          <TestPanel />
        </main>
        <FlowchartInspector />
      </div>
      {isMobile && (
        <>
          <FlowchartPaletteSheet />
          <FlowchartInspectorSheet />
        </>
      )}
    </div>
  );
}
