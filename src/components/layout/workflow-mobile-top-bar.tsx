"use client";

import { Download, FilePlus, Play, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExecutionStore } from "@/features/workflow/execution-store";
import { exportWorkflow, importWorkflowFile } from "@/features/workflow/file-io";
import { loadSampleWorkflow } from "@/features/workflow/load-sample";
import { startNewWorkflow } from "@/features/workflow/new-workflow";
import { useWorkflowStore } from "@/features/workflow/store";
import { useUiStore } from "@/stores/ui-store";
import { MobileTopBar } from "./mobile-top-bar";

/** Top bar HP mode Workflow: Run/Stop sebagai aksi utama; file dan contoh ada di menu ⋯. */
export function WorkflowMobileTopBar() {
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const runStatus = useExecutionStore((s) => s.status);
  const run = useExecutionStore((s) => s.run);
  const cancel = useExecutionStore((s) => s.cancel);
  const running = runStatus === "running";
  const saveStatus = useUiStore((s) => s.saveStatus);
  const savedAt = useUiStore((s) => s.savedAt);

  return (
    <MobileTopBar
      title={name}
      onTitleChange={setName}
      titleLabel="Nama workflow"
      saveStatus={saveStatus}
      savedAt={savedAt}
      importLabel="Import JSON"
      importDisabled={running}
      importInputLabel="Pilih file workflow JSON"
      onImportFile={(file) => void importWorkflowFile(file)}
      primary={
        <>
          {running ? (
            <Button variant="danger" className="h-11 px-3.5" onClick={cancel} aria-label="Stop" title="Hentikan eksekusi">
              <Square className="size-4" aria-hidden /> Stop
            </Button>
          ) : (
            <Button variant="primary" className="h-11 px-3.5" onClick={() => void run()} aria-label="Run" title="Jalankan workflow">
              <Play className="size-4" aria-hidden /> Run
            </Button>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {runStatus === "running" ? "Workflow sedang berjalan" : runStatus === "success" ? "Workflow selesai" : runStatus === "error" ? "Workflow gagal" : runStatus === "cancelled" ? "Eksekusi dihentikan" : ""}
          </span>
        </>
      }
      menuItems={[
        {
          type: "item",
          label: "Ekspor JSON",
          icon: <Download className="size-4" aria-hidden />,
          onSelect: exportWorkflow,
          disabled: nodeCount === 0,
          title: nodeCount === 0 ? "Belum ada node untuk diekspor" : "Ekspor workflow ke file JSON",
        },
        { type: "separator" },
        { type: "item", label: "Muat contoh", icon: <Sparkles className="size-4" aria-hidden />, onSelect: () => void loadSampleWorkflow(), title: "Ganti isi canvas dengan contoh (dapat di-undo)" },
        { type: "item", label: "Workflow baru", icon: <FilePlus className="size-4" aria-hidden />, onSelect: startNewWorkflow, disabled: nodeCount === 0, title: "Mulai canvas kosong (dapat di-undo)" },
      ]}
    />
  );
}
