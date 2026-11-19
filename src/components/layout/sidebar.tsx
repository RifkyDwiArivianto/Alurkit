"use client";

import { FilePlus, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PanelHeader, SidePanel } from "@/components/ui/side-panel";
import { NODE_DEFINITIONS, NODE_ORDER } from "@/features/workflow/node-definitions";
import { NODE_ICONS } from "@/features/workflow/node-icons";
import { loadSampleWorkflow } from "@/features/workflow/load-sample";
import { startNewWorkflow } from "@/features/workflow/new-workflow";
import { useWorkflowStore } from "@/features/workflow/store";
import type { NodeKind } from "@/features/workflow/types";
import { DRAG_MIME, usePlaceNode } from "@/features/workflow/use-place-node";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

function PaletteItem({ kind, disabled, onAdd }: { kind: NodeKind; disabled: boolean; onAdd: (k: NodeKind) => void }) {
  const def = NODE_DEFINITIONS[kind];
  const Icon = NODE_ICONS[kind];
  return (
    <li>
      <button
        type="button"
        draggable={!disabled}
        disabled={disabled}
        onClick={() => onAdd(kind)}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, kind);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 p-2.5 text-left transition-colors",
          "enabled:cursor-grab enabled:hover:border-ink-500 enabled:hover:bg-ink-800 enabled:active:cursor-grabbing disabled:opacity-45",
        )}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ background: `${def.accent}22`, color: def.accent }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink-100">{def.label}</span>
          <span className="block truncate text-xs text-ink-400">
            {disabled ? "Sudah ada di canvas" : def.summary}
          </span>
        </span>
      </button>
    </li>
  );
}

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const nodes = useWorkflowStore((s) => s.nodes);
  const placeNode = usePlaceNode();
  const hasStart = useMemo(() => nodes.some((n) => n.data.kind === "start"), [nodes]);

  function handleAdd(kind: NodeKind) {
    const node = placeNode(kind);
    if (node && window.matchMedia("(max-width: 1023px)").matches) closeSidebar();
  }

  return (
    <SidePanel open={open} side="left" width={288} label="Daftar node">
      <PanelHeader title="Node" />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 px-1 text-xs leading-relaxed text-ink-400">
          Klik untuk menambahkan ke tengah canvas, atau seret ke posisi yang diinginkan.
        </p>
        <ul className="space-y-2">
          {NODE_ORDER.map((kind) => (
            <PaletteItem key={kind} kind={kind} disabled={kind === "start" && hasStart} onAdd={handleAdd} />
          ))}
        </ul>
      </div>
      <div className="shrink-0 space-y-2 border-t border-ink-700 p-3">
        <p className="text-[11px] leading-relaxed text-ink-500">
          <kbd className="font-mono">Ctrl+Enter</kbd> jalankan · <kbd className="font-mono">Ctrl+Z</kbd> undo · <kbd className="font-mono">Delete</kbd> hapus
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => void loadSampleWorkflow()} title="Ganti isi canvas dengan contoh (dapat di-undo)">
            <Sparkles className="size-3.5" /> Muat contoh
          </Button>
          <Button variant="secondary" size="sm" onClick={startNewWorkflow} disabled={nodes.length === 0} title="Mulai canvas kosong (dapat di-undo)">
            <FilePlus className="size-3.5" /> Workflow baru
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}
