"use client";

import { FileJson, FilePlus, FlaskConical, Image as ImageIcon, Printer, Sparkles } from "lucide-react";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { Button } from "@/components/ui/button";
import { exportFlowchartJson, exportFlowchartPng, importFlowchartFile, printFlowchart } from "@/features/flowchart/file-io";
import { loadSampleFlowchart, startNewFlowchart } from "@/features/flowchart/load-sample";
import { useFlowchartStore } from "@/features/flowchart/store";
import { useTestStore } from "@/features/flowchart/test-store";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

/** Top bar HP mode Flowchart: "Uji alur" sebagai aksi utama; file dan contoh ada di menu ⋯. */
export function FlowchartMobileTopBar() {
  const title = useFlowchartStore((s) => s.title);
  const setTitle = useFlowchartStore((s) => s.setTitle);
  const empty = useFlowchartStore((s) => s.nodes.length === 0 && s.lanes.length === 0);
  const status = useUiStore((s) => s.chartSaveStatus);
  const savedAt = useUiStore((s) => s.chartSavedAt);
  const testOpen = useTestStore((s) => s.open);
  const toggleTest = useTestStore((s) => s.togglePanel);

  const toggleTestPanel = () => {
    // Panel samping menutupi canvas, jadi tutup dulu supaya sorotan alur terlihat.
    if (!testOpen) useUiStore.getState().closeOverlays();
    toggleTest();
  };
  const emptyHint = empty ? "Diagram masih kosong" : undefined;

  return (
    <MobileTopBar
      title={title}
      onTitleChange={setTitle}
      titleLabel="Judul flowchart"
      saveStatus={status}
      savedAt={savedAt}
      importLabel="Import JSON"
      importInputLabel="Pilih file flowchart JSON"
      onImportFile={(file) => void importFlowchartFile(file)}
      primary={
        <Button
          variant="primary"
          className={cn("h-11 px-3.5", testOpen && "ring-2 ring-ember-400/60 ring-offset-2 ring-offset-ink-900")}
          onClick={toggleTestPanel}
          aria-pressed={testOpen}
          title="Cek struktur dan telusuri alur langkah demi langkah"
        >
          <FlaskConical className="size-4" aria-hidden /> Uji alur
        </Button>
      }
      menuItems={[
        { type: "item", label: "Ekspor JSON", icon: <FileJson className="size-4" aria-hidden />, onSelect: exportFlowchartJson, disabled: empty, title: emptyHint ?? "Ekspor ke file JSON" },
        { type: "item", label: "Ekspor PNG", icon: <ImageIcon className="size-4" aria-hidden />, onSelect: () => void exportFlowchartPng(), disabled: empty, title: emptyHint ?? "Ekspor gambar PNG" },
        { type: "item", label: "Ekspor PDF", icon: <Printer className="size-4" aria-hidden />, onSelect: printFlowchart, disabled: empty, title: emptyHint ?? "Cetak atau simpan sebagai PDF" },
        { type: "separator" },
        { type: "item", label: "Muat contoh", icon: <Sparkles className="size-4" aria-hidden />, onSelect: loadSampleFlowchart, title: "Ganti isi canvas dengan contoh (dapat di-undo)" },
        { type: "item", label: "Diagram baru", icon: <FilePlus className="size-4" aria-hidden />, onSelect: startNewFlowchart, disabled: empty, title: "Mulai canvas kosong (dapat di-undo)" },
      ]}
    />
  );
}
