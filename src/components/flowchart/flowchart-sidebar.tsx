"use client";

import { ArrowDown, ArrowUp, FilePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelHeader, SidePanel } from "@/components/ui/side-panel";
import { FLOW_KIND_DEFS, FLOW_KIND_ORDER } from "@/features/flowchart/defs";
import { MAX_LANE_H, MIN_LANE_H } from "@/features/flowchart/lanes";
import { PATH_SHAPES } from "@/features/flowchart/shapes";
import { loadSampleFlowchart, startNewFlowchart } from "@/features/flowchart/load-sample";
import { useFlowchartStore } from "@/features/flowchart/store";
import type { FlowKind, Lane } from "@/features/flowchart/types";
import { SHAPE_DRAG_MIME, usePlaceShape } from "@/features/flowchart/use-place-shape";
import { useUiStore } from "@/stores/ui-store";

const STROKE = "#b3a999";

export function ShapeIcon({ kind }: { kind: FlowKind }) {
  const path = PATH_SHAPES[kind];
  return (
    <svg viewBox="0 0 100 60" className="h-6 w-10 shrink-0" aria-hidden>
      {path ? (
        <g transform="translate(4 6) scale(0.92 0.48)" fill="none" stroke={STROKE} strokeWidth={1.8} vectorEffect="non-scaling-stroke">
          <path d={path.d} vectorEffect="non-scaling-stroke" />
          {path.extra?.map((d) => <path key={d} d={d} vectorEffect="non-scaling-stroke" />)}
        </g>
      ) : kind === "connector" ? (
        <circle cx="50" cy="30" r="22" fill="none" stroke={STROKE} strokeWidth={4} />
      ) : (
        <rect x="6" y="10" width="88" height="40" rx={kind === "terminator" ? 20 : 5} fill="none" stroke={STROKE} strokeWidth={4} strokeDasharray={kind === "note" ? "10 7" : undefined} />
      )}
    </svg>
  );
}

export function LaneRow({ lane, index, count }: { lane: Lane; index: number; count: number }) {
  const renameLane = useFlowchartStore((s) => s.renameLane);
  const setLaneHeight = useFlowchartStore((s) => s.setLaneHeight);
  const moveLane = useFlowchartStore((s) => s.moveLane);
  const removeLane = useFlowchartStore((s) => s.removeLane);
  const [draft, setDraft] = useState(String(lane.height));

  // sinkronkan bila tinggi berubah dari luar (undo, import)
  useEffect(() => setDraft(String(lane.height)), [lane.height]);

  function commitHeight() {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) return setDraft(String(lane.height));
    setLaneHeight(lane.id, n);
    setDraft(String(Math.min(MAX_LANE_H, Math.max(MIN_LANE_H, Math.round(n)))));
  }

  function handleRemove() {
    if (!removeLane(lane.id)) {
      useUiStore.getState().notify("error", `Lane “${lane.name}” masih berisi simbol. Pindahkan atau hapus simbolnya dulu.`);
    }
  }

  return (
    <li className="space-y-2 rounded-xl border border-ink-700 bg-ink-850 p-2.5">
      <input
        aria-label={`Nama lane ${index + 1}`}
        value={lane.name}
        maxLength={60}
        onChange={(e) => renameLane(lane.id, e.target.value)}
        className="h-8 w-full rounded-md border border-ink-600 bg-ink-900 px-2 text-sm text-ink-100 focus:border-ember-400 focus:outline-none"
      />
      <div className="flex items-center gap-1.5">
        <label className="flex items-center gap-1.5 text-xs text-ink-400">
          Tinggi
          <input
            type="number"
            inputMode="numeric"
            min={MIN_LANE_H}
            max={MAX_LANE_H}
            step={10}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitHeight}
            onKeyDown={(e) => e.key === "Enter" && commitHeight()}
            className="h-8 w-16 rounded-md border border-ink-600 bg-ink-900 px-2 text-sm text-ink-100 focus:border-ember-400 focus:outline-none"
          />
        </label>
        <div className="ml-auto flex gap-0.5">
          <Button variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => moveLane(lane.id, -1)} aria-label={`Naikkan lane ${lane.name}`} title="Naikkan">
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => moveLane(lane.id, 1)} aria-label={`Turunkan lane ${lane.name}`} title="Turunkan">
            <ArrowDown className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 hover:text-rose-300" onClick={handleRemove} aria-label={`Hapus lane ${lane.name}`} title="Hapus lane (harus kosong)">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function FlowchartSidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const lanes = useFlowchartStore((s) => s.lanes);
  const hasContent = useFlowchartStore((s) => s.nodes.length > 0 || s.lanes.length > 0);
  const addLane = useFlowchartStore((s) => s.addLane);
  const placeShape = usePlaceShape();

  function handleAdd(kind: FlowKind) {
    placeShape(kind);
    if (window.matchMedia("(max-width: 1023px)").matches) closeSidebar();
  }

  return (
    <SidePanel open={open} side="left" width={300} label="Simbol dan swimlane">
      <PanelHeader title="Simbol" />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 px-1 text-xs leading-relaxed text-ink-400">Klik untuk menambahkan ke tengah canvas, atau seret ke posisi yang diinginkan.</p>
        <ul className="grid grid-cols-2 gap-2">
          {FLOW_KIND_ORDER.map((kind) => {
            const def = FLOW_KIND_DEFS[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  draggable
                  onClick={() => handleAdd(kind)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(SHAPE_DRAG_MIME, kind);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={def.hint}
                  className="flex h-full w-full cursor-grab flex-col items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-850 px-2 py-2.5 text-center transition-colors hover:border-ink-500 hover:bg-ink-800 active:cursor-grabbing"
                >
                  <ShapeIcon kind={kind} />
                  <span className="text-xs font-medium text-ink-100">{def.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 mb-2 flex items-center justify-between px-1">
          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">Swimlane</h3>
          <Button variant="secondary" size="sm" onClick={addLane} disabled={lanes.length >= 20}>
            <Plus className="size-3.5" /> Lane
          </Button>
        </div>
        {lanes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-600 p-3 text-xs leading-relaxed text-ink-400">
            Swimlane membagi diagram menjadi jalur per peran atau departemen. Tambahkan lane, lalu letakkan simbol di dalam jalur yang sesuai.
          </p>
        ) : (
          <ul className="space-y-2">
            {lanes.map((l, i) => (
              <LaneRow key={l.id} lane={l} index={i} count={lanes.length} />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-ink-700 p-3">
        <p className="text-[11px] leading-relaxed text-ink-500">
          <kbd className="font-mono">Ctrl+Z</kbd> undo · <kbd className="font-mono">Delete</kbd> hapus · tarik titik di tepi simbol untuk menghubungkan
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={loadSampleFlowchart} title="Ganti isi canvas dengan contoh (dapat di-undo)">
            Muat contoh
          </Button>
          <Button variant="secondary" size="sm" onClick={startNewFlowchart} disabled={!hasContent} title="Mulai canvas kosong (dapat di-undo)">
            <FilePlus className="size-3.5" /> Baru
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

