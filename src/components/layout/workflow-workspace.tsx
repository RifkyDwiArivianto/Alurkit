"use client";

import { useEffect } from "react";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useUiStore } from "@/stores/ui-store";
import { WorkflowCanvas } from "@/features/workflow/canvas/workflow-canvas";
import { Inspector } from "./inspector";
import { WorkflowInspectorSheet } from "./workflow-inspector-sheet";
import { WorkflowPaletteSheet } from "./workflow-palette-sheet";
import { LogPanel } from "./log-panel";
import { OverlayScrim } from "./overlay-scrim";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { WorkflowMobileTopBar } from "./workflow-mobile-top-bar";

export function WorkflowWorkspace() {
  const isMobile = useIsMobile();
  // Panel samping desktop yang masih terbuka saat jendela menyempit ke HP tidak punya tombol penutup di sana.
  useEffect(() => {
    if (isMobile) useUiStore.getState().closeOverlays();
  }, [isMobile]);
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-ink-950">
      {isMobile ? <WorkflowMobileTopBar /> : <TopBar />}
      <div className="relative flex min-h-0 flex-1">
        <OverlayScrim />
        <Sidebar />
        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          <WorkflowCanvas />
          <LogPanel />
        </main>
        <Inspector />
      </div>
      {isMobile && (
        <>
          <WorkflowPaletteSheet />
          <WorkflowInspectorSheet />
        </>
      )}
    </div>
  );
}
