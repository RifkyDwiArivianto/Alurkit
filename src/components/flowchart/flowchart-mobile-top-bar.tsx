"use client";

import { FileJson, FilePlus, FlaskConical, Image as ImageIcon, Printer, Redo2, Sparkles, Undo2 } from "lucide-react";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { exportFlowchartJson, exportFlowchartPng, importFlowchartFile, printFlowchart } from "@/features/flowchart/file-io";
import { loadSampleFlowchart, startNewFlowchart } from "@/features/flowchart/load-sample";
import { useFlowchartStore } from "@/features/flowchart/store";
import { useTestStore } from "@/features/flowchart/test-store";
import { useUiStore } from "@/stores/ui-store";

/** Top bar HP mode Flowchart: Uji alur, Undo/Redo, file, dan contoh semuanya ada di menu ⋯. */
export function FlowchartMobileTopBar() {
  const title = useFlowchartStore((s) => s.title);
  const setTitle = useFlowchartStore((s) => s.setTitle);
  const empty = useFlowchartStore((s) => s.nodes.length === 0 && s.lanes.length === 0);
  const status = useUiStore((s) => s.chartSaveStatus);
  const testOpen = useTestStore((s) => s.open);
  const toggleTest = useTestStore((s) => s.togglePanel);
  const undo = useFlowchartStore((s) => s.undo);
  const redo = useFlowchartStore((s) => s.redo);
  const canUndo = useFlowchartStore((s) => s.past.length > 0);
  const canRedo = useFlowchartStore((s) => s.future.length > 0);

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
      importLabel="Import JSON"
      importInputLabel="Pilih file flowchart JSON"
      onImportFile={(file) => void importFlowchartFile(file)}
      menuLead={[
        {
          type: "item",
          label: "Uji alur",
          icon: <FlaskConical className="size-4" aria-hidden />,
          onSelect: toggleTestPanel,
          title: testOpen ? "Tutup panel Uji alur" : "Cek struktur dan telusuri alur langkah demi langkah",
        },
        { type: "item", label: "Undo", icon: <Undo2 className="size-4" aria-hidden />, onSelect: undo, disabled: !canUndo },
        { type: "item", label: "Redo", icon: <Redo2 className="size-4" aria-hidden />, onSelect: redo, disabled: !canRedo },
      ]}
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
