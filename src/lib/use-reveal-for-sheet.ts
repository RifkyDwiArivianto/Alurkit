import { useReactFlow } from "@xyflow/react";
import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

/** Kotak (koordinat flow) yang harus tetap terlihat. w/h = 0 berarti satu titik. */
export interface RevealBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Menggeser viewport canvas supaya target tidak tertutup bottom sheet. Hanya bergerak bila target keluar dari
 * area yang terlihat; zoom pengguna dipertahankan. Dipicu saat `key` (id seleksi) atau tinggi sheet berubah.
 * Memakai setViewport, bukan transform CSS, sehingga pengukuran handle React Flow tetap benar.
 */
export function useRevealForSheet(canvasId: string, key: string | null, getBox: () => RevealBox | null) {
  const { getViewport, setViewport } = useReactFlow();
  const inset = useUiStore((s) => s.bottomInset);

  useEffect(() => {
    if (!key || inset <= 0) return;
    const el = document.getElementById(canvasId);
    const box = getBox();
    if (!el || !box) return;

    const rect = el.getBoundingClientRect();
    const overlap = Math.max(0, rect.bottom - (window.innerHeight - inset));
    const visibleH = rect.height - overlap;
    if (visibleH <= 0) return;

    const vp = getViewport();
    const margin = 16;
    const left = box.x * vp.zoom + vp.x;
    const top = box.y * vp.zoom + vp.y;
    const right = left + box.w * vp.zoom;
    const bottom = top + box.h * vp.zoom;
    const visible = left >= margin && right <= rect.width - margin && top >= margin && bottom <= visibleH - margin;
    if (visible) return;

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    void setViewport({ x: rect.width / 2 - cx * vp.zoom, y: visibleH / 2 - cy * vp.zoom, zoom: vp.zoom }, { duration: 250 });
  }, [key, inset, canvasId, getBox, getViewport, setViewport]);
}
