"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

const BTN =
  "inline-flex size-11 items-center justify-center text-ink-200 transition-colors hover:bg-ink-700 active:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40";
const GROUP = "flex overflow-hidden rounded-xl border border-ink-600 bg-ink-850/95 shadow-lg shadow-black/40 backdrop-blur";

interface MobileCanvasControlsProps {
  addLabel: string;
  /** Panel bawah inline (Uji alur / log) yang sedang terbuka; kontrol disembunyikan seperti saat ada sheet. */
  panelOpen?: boolean;
}

/**
 * Kontrol mengambang canvas di HP. Kiri bawah: tumpukan zoom (Undo/Redo ada di menu ⋯ top bar). Kanan bawah: FAB "+" yang
 * membuka palet. Semua disembunyikan selama ada sheet atau panel bawah terbuka.
 */
export function MobileCanvasControls({ addLabel, panelOpen = false }: MobileCanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const sheetOpen = useUiStore((s) => s.bottomInset > 0);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const openPalette = useUiStore((s) => s.openPalette);
  if (sheetOpen || panelOpen) return null;

  return (
    <>
      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-10 flex flex-col items-start">
        <div role="group" aria-label="Zoom" className={`${GROUP} flex-col`}>
          <button type="button" className={BTN} onClick={() => void zoomIn({ duration: 150 })} aria-label="Perbesar">
            <Plus className="size-5" aria-hidden />
          </button>
          <button type="button" className={BTN} onClick={() => void zoomOut({ duration: 150 })} aria-label="Perkecil">
            <Minus className="size-5" aria-hidden />
          </button>
          <button type="button" className={BTN} onClick={() => void fitView({ padding: 0.2, duration: 250, maxZoom: 1 })} aria-label="Sesuaikan tampilan">
            <Maximize className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={openPalette}
        aria-label={addLabel}
        aria-haspopup="dialog"
        aria-expanded={paletteOpen}
        className="absolute right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 inline-flex size-[52px] items-center justify-center rounded-full bg-ember-500 text-ink-950 shadow-xl shadow-black/50 transition-colors hover:bg-ember-400 active:bg-ember-600"
      >
        <Plus className="size-7" aria-hidden />
      </button>
    </>
  );
}
