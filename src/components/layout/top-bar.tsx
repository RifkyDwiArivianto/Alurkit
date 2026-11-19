"use client";

import {
  Download,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Play,
  Redo2,
  Square,
  Undo2,
  Upload,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useExecutionStore } from "@/features/workflow/execution-store";
import { exportWorkflow, importWorkflowFile } from "@/features/workflow/file-io";
import { useWorkflowStore } from "@/features/workflow/store";
import { cn } from "@/lib/utils";
import { ModeSwitch } from "./mode-switch";
import { useUiStore, type SaveStatus } from "@/stores/ui-store";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#ff7a3d" />
        <path d="M9 21h6a3 3 0 0 0 3-3v-1a3 3 0 0 1 3-3h2M9 13h4" stroke="#0d0c0b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="23.5" cy="14" r="2.2" fill="#0d0c0b" />
      </svg>
      <span className="hidden text-[15px] font-bold tracking-tight sm:block">FlowForge</span>
    </div>
  );
}

export function PanelToggle({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: typeof PanelLeft }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} aria-pressed={active} title={label} className={cn(active && "bg-ink-800 text-ember-400")}>
      <Icon className="size-4" />
    </Button>
  );
}

export const SAVE_DOT: Record<SaveStatus, string> = {
  idle: "bg-ink-500",
  pending: "bg-amber-400",
  saved: "bg-emerald-400",
  error: "bg-rose-400",
};

export function saveLabel(status: SaveStatus, savedAt: number | null) {
  switch (status) {
    case "pending":
      return "Menyimpan…";
    case "saved":
      return savedAt ? `Tersimpan ${new Date(savedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Tersimpan";
    case "error":
      return "Gagal menyimpan";
    default:
      return "Belum ada perubahan";
  }
}

/** Top bar desktop (lg ke atas). Di bawah lg workspace memakai WorkflowMobileTopBar. */
export function TopBar() {
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const edgeCount = useWorkflowStore((s) => s.edges.length);
  const canUndo = useWorkflowStore((s) => s.past.length > 0);
  const canRedo = useWorkflowStore((s) => s.future.length > 0);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);

  const runStatus = useExecutionStore((s) => s.status);
  const run = useExecutionStore((s) => s.run);
  const cancel = useExecutionStore((s) => s.cancel);
  const running = runStatus === "running";

  const { sidebarOpen, inspectorOpen, logOpen, toggleSidebar, toggleInspector, toggleLog } = useUiStore();
  const saveStatus = useUiStore((s) => s.saveStatus);
  const savedAt = useUiStore((s) => s.savedAt);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <header className="relative flex max-lg:hidden h-14 shrink-0 items-center gap-1.5 border-b border-ink-700 bg-ink-900 px-2 sm:gap-2 sm:px-3">
      <PanelToggle active={sidebarOpen} onClick={toggleSidebar} label="Tampilkan panel node" icon={PanelLeft} />
      <div className="hidden sm:block">
        <Logo />
      </div>
      <ModeSwitch />
      <div className="mx-2 hidden h-6 w-px bg-ink-700 md:block" />

      <input
        aria-label="Nama workflow"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        className="hidden h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-ink-100 hover:border-ink-600 focus:border-ink-500 focus:bg-ink-850 focus:outline-none sm:block md:max-w-72 md:flex-none"
      />
      <span className="hidden items-center gap-1.5 rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-ink-400 xl:flex" title="Disimpan otomatis di penyimpanan lokal browser ini">
        <span className={cn("size-1.5 rounded-full", SAVE_DOT[saveStatus])} aria-hidden />
        {saveLabel(saveStatus, savedAt)} · {nodeCount} node · {edgeCount} koneksi
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
          aria-label="Pilih file workflow JSON"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // izinkan memilih file yang sama lagi
            if (file) void importWorkflowFile(file);
          }}
        />
        <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={() => fileInput.current?.click()} disabled={running} title="Import workflow dari file JSON">
          <Upload className="size-3.5" /> Import
        </Button>
        <Button variant="secondary" size="sm" className="hidden md:inline-flex" onClick={exportWorkflow} disabled={nodeCount === 0} title={nodeCount === 0 ? "Belum ada node untuk diekspor" : "Export workflow ke file JSON"}>
          <Download className="size-3.5" /> Export
        </Button>

        {running ? (
          <Button variant="danger" size="sm" className="sm:ml-1" onClick={cancel} aria-label="Stop" title="Hentikan eksekusi">
            <Square className="size-3.5" /> <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="sm:ml-1" onClick={() => void run()} aria-label="Run" title="Jalankan workflow (Ctrl+Enter)">
            <Play className="size-3.5" /> <span className="hidden sm:inline">Run</span>
          </Button>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {runStatus === "running" ? "Workflow sedang berjalan" : runStatus === "success" ? "Workflow selesai" : runStatus === "error" ? "Workflow gagal" : runStatus === "cancelled" ? "Eksekusi dihentikan" : ""}
        </span>
        <div className="mx-1 hidden h-6 w-px bg-ink-700 sm:block" />
        <PanelToggle active={logOpen} onClick={toggleLog} label="Tampilkan panel log" icon={PanelBottom} />
        <PanelToggle active={inspectorOpen} onClick={toggleInspector} label="Tampilkan inspector" icon={PanelRight} />
      </div>

    </header>
  );
}
