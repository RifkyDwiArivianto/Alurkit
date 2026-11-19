"use client";

import { FileJson, FlaskConical, Image as ImageIcon, PanelLeft, PanelRight, Printer, Redo2, Undo2, Upload } from "lucide-react";
import { useRef } from "react";
import { Logo, PanelToggle, SAVE_DOT, saveLabel } from "@/components/layout/top-bar";
import { ModeSwitch } from "@/components/layout/mode-switch";
import { Button } from "@/components/ui/button";
import {
  exportFlowchartJson,
  exportFlowchartPng,
  importFlowchartFile,
  printFlowchart,
} from "@/features/flowchart/file-io";
import { useFlowchartStore } from "@/features/flowchart/store";
import { useTestStore } from "@/features/flowchart/test-store";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

/** Top bar desktop (lg ke atas). Di bawah lg workspace memakai FlowchartMobileTopBar. */
export function FlowchartTopBar() {
  const title = useFlowchartStore((s) => s.title);
  const setTitle = useFlowchartStore((s) => s.setTitle);
  const nodeCount = useFlowchartStore((s) => s.nodes.length);
  const laneCount = useFlowchartStore((s) => s.lanes.length);
  const canUndo = useFlowchartStore((s) => s.past.length > 0);
  const canRedo = useFlowchartStore((s) => s.future.length > 0);
  const undo = useFlowchartStore((s) => s.undo);
  const redo = useFlowchartStore((s) => s.redo);

  const { sidebarOpen, inspectorOpen, toggleSidebar, toggleInspector } = useUiStore();
  const status = useUiStore((s) => s.chartSaveStatus);
  const savedAt = useUiStore((s) => s.chartSavedAt);
  const fileInput = useRef<HTMLInputElement>(null);
  const testOpen = useTestStore((s) => s.open);
  const toggleTest = useTestStore((s) => s.togglePanel);
  const toggleTestPanel = () => {
    // Di layar kecil panel samping menutupi canvas, jadi tutup dulu supaya sorotan alur terlihat.
    if (!testOpen && window.matchMedia("(max-width: 1023px)").matches) useUiStore.getState().closeOverlays();
    toggleTest();
  };
  const empty = nodeCount === 0 && laneCount === 0;

  return (
    <header className="relative flex max-lg:hidden h-14 shrink-0 items-center gap-2 border-b border-ink-700 bg-ink-900 px-3">
      <PanelToggle active={sidebarOpen} onClick={toggleSidebar} label="Tampilkan panel simbol" icon={PanelLeft} />
      <div className="hidden sm:block">
        <Logo />
      </div>
      <ModeSwitch />
      <div className="mx-2 hidden h-6 w-px bg-ink-700 md:block" />

      <input
        aria-label="Judul flowchart"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-ink-100 hover:border-ink-600 focus:border-ink-500 focus:bg-ink-850 focus:outline-none md:max-w-72 md:flex-none"
      />
      <span className="hidden items-center gap-1.5 rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-ink-400 xl:flex" title="Disimpan otomatis di penyimpanan lokal browser ini">
        <span className={cn("size-1.5 rounded-full", SAVE_DOT[status])} aria-hidden />
        {saveLabel(status, savedAt)} · {nodeCount} simbol · {laneCount} lane
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="size-4" />
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Pilih file flowchart JSON"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFlowchartFile(file);
          }}
        />
        <Button variant="secondary" size="sm" className="hidden lg:inline-flex" onClick={() => fileInput.current?.click()} title="Import flowchart dari file JSON">
          <Upload className="size-3.5" /> Import
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className={cn("hidden sm:inline-flex", testOpen && "border-ember-500 text-ember-400")}
          onClick={toggleTestPanel}
          aria-pressed={testOpen}
          aria-label="Uji alur"
          title="Cek struktur dan telusuri alur langkah demi langkah"
        >
          <FlaskConical className="size-3.5" /> <span className="hidden lg:inline">Uji alur</span>
        </Button>

        {/* Layar sedang ke atas: tombol ekspor langsung terlihat */}
        <div role="group" aria-label="Ekspor" className="ml-1 hidden items-center gap-1 sm:flex">
          <Button variant="secondary" size="sm" onClick={exportFlowchartJson} disabled={empty} aria-label="Ekspor JSON" title={empty ? "Diagram masih kosong" : "Ekspor ke file JSON"}>
            <FileJson className="size-3.5" /> <span className="hidden xl:inline">JSON</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void exportFlowchartPng()} disabled={empty} aria-label="Ekspor PNG" title={empty ? "Diagram masih kosong" : "Ekspor gambar PNG"}>
            <ImageIcon className="size-3.5" /> <span className="hidden xl:inline">PNG</span>
          </Button>
          <Button variant="primary" size="sm" onClick={printFlowchart} disabled={empty} aria-label="Ekspor PDF" title={empty ? "Diagram masih kosong" : "Cetak atau simpan sebagai PDF"}>
            <Printer className="size-3.5" /> <span className="hidden md:inline">PDF</span>
          </Button>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-ink-700 sm:block" />
        <PanelToggle active={inspectorOpen} onClick={toggleInspector} label="Tampilkan inspector" icon={PanelRight} />
      </div>

    </header>
  );
}
