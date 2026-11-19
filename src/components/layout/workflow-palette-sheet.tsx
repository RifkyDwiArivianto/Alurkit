"use client";

import { useMemo } from "react";
import { PaletteCard, PaletteRow } from "@/components/layout/palette-card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { NODE_DEFINITIONS, NODE_ORDER } from "@/features/workflow/node-definitions";
import { NODE_ICONS } from "@/features/workflow/node-icons";
import { useWorkflowStore } from "@/features/workflow/store";
import { usePlaceNode } from "@/features/workflow/use-place-node";
import { useUiStore } from "@/stores/ui-store";

/** Palet node (HP): pola sama dengan palet simbol Flowchart. Node Start dinonaktifkan bila sudah ada. */
export function WorkflowPaletteSheet() {
  const open = useUiStore((s) => s.paletteOpen);
  const close = useUiStore((s) => s.closePalette);
  const nodes = useWorkflowStore((s) => s.nodes);
  const placeNode = usePlaceNode();
  const hasStart = useMemo(() => nodes.some((n) => n.data.kind === "start"), [nodes]);

  return (
    <BottomSheet open={open} onClose={close} title="Tambah node" modal maxHeight="60dvh">
      <PaletteRow label="Node workflow">
        {NODE_ORDER.map((kind) => {
          const def = NODE_DEFINITIONS[kind];
          const Icon = NODE_ICONS[kind];
          const disabled = kind === "start" && hasStart;
          return (
            <PaletteCard
              key={kind}
              icon={
                <span className="grid size-8 place-items-center rounded-lg" style={{ background: `${def.accent}22`, color: def.accent }}>
                  <Icon className="size-4" aria-hidden />
                </span>
              }
              label={def.label}
              title={disabled ? "Sudah ada di canvas" : def.summary}
              disabled={disabled}
              onSelect={() => {
                if (placeNode(kind)) close();
              }}
            />
          );
        })}
      </PaletteRow>
      <p className="px-4 pb-2 text-[11px] text-ink-500">Geser ke samping untuk node lainnya.</p>
    </BottomSheet>
  );
}
