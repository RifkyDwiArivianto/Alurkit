"use client";

import { Plus } from "lucide-react";
import { PaletteCard, PaletteRow } from "@/components/layout/palette-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FLOW_KIND_DEFS, FLOW_KIND_ORDER } from "@/features/flowchart/defs";
import { useFlowchartStore } from "@/features/flowchart/store";
import { usePlaceShape } from "@/features/flowchart/use-place-shape";
import { useUiStore } from "@/stores/ui-store";
import { LaneRow, ShapeIcon } from "./flowchart-sidebar";

/** Palet simbol (HP): baris kartu yang bisa digeser + pengelola swimlane. Ketuk kartu = tambah simbol, sheet menutup. */
export function FlowchartPaletteSheet() {
  const open = useUiStore((s) => s.paletteOpen);
  const close = useUiStore((s) => s.closePalette);
  const lanes = useFlowchartStore((s) => s.lanes);
  const addLane = useFlowchartStore((s) => s.addLane);
  const placeShape = usePlaceShape();

  return (
    <BottomSheet open={open} onClose={close} title="Tambah simbol" modal maxHeight="72dvh">
      <PaletteRow label="Simbol flowchart">
        {FLOW_KIND_ORDER.map((kind) => (
          <PaletteCard
            key={kind}
            icon={<ShapeIcon kind={kind} />}
            label={FLOW_KIND_DEFS[kind].label}
            title={FLOW_KIND_DEFS[kind].hint}
            onSelect={() => {
              placeShape(kind);
              close();
            }}
          />
        ))}
      </PaletteRow>
      <p className="px-4 pb-1 text-[11px] text-ink-500">Geser ke samping untuk simbol lainnya.</p>

      <div className="mt-3 mb-2 flex items-center justify-between px-4">
        <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">Swimlane</h3>
        <Button variant="secondary" className="h-11 px-3.5" onClick={addLane} disabled={lanes.length >= 20}>
          <Plus className="size-4" aria-hidden /> Tambah lane
        </Button>
      </div>
      {lanes.length === 0 ? (
        <p className="mx-3 rounded-xl border border-dashed border-ink-600 p-3 text-xs leading-relaxed text-ink-400">
          Swimlane membagi diagram menjadi jalur per peran atau departemen. Tambahkan lane, lalu letakkan simbol di dalam jalur yang sesuai.
        </p>
      ) : (
        <ul className="space-y-2 px-3">
          {lanes.map((l, i) => (
            <LaneRow key={l.id} lane={l} index={i} count={lanes.length} />
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
