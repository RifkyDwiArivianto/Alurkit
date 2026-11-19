"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { FlowchartWorkspace } from "@/components/flowchart/flowchart-workspace";
import { Toaster } from "@/components/ui/toaster";
import { useFlowchartPersistence } from "@/features/flowchart/use-flowchart-persistence";
import { useLiveValidation } from "@/features/workflow/use-live-validation";
import { usePersistence } from "@/features/workflow/use-persistence";
import { useShortcuts } from "@/features/workflow/use-shortcuts";
import { useModePersistence } from "@/stores/use-mode-persistence";
import { useUiStore } from "@/stores/ui-store";
import { WorkflowWorkspace } from "./workflow-workspace";

export function AppShell() {
  // Semua dokumen dimuat dan disimpan otomatis selama aplikasi terbuka, apa pun modenya.
  useLiveValidation();
  usePersistence();
  useFlowchartPersistence();
  useModePersistence();
  useShortcuts();
  const mode = useUiStore((s) => s.mode);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      useUiStore.getState().collapseForSmallScreen();
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {/* key: viewport dan state internal React Flow dipisah per mode */}
      <ReactFlowProvider key={mode}>
        {mode === "workflow" ? <WorkflowWorkspace /> : <FlowchartWorkspace />}
        <Toaster />
      </ReactFlowProvider>
    </MotionConfig>
  );
}
