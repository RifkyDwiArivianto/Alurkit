"use client";

import { useUiStore } from "@/stores/ui-store";

/** Latar gelap di belakang panel overlay (layar kecil); klik untuk menutup. */
export function OverlayScrim() {
  const overlayOpen = useUiStore((s) => s.sidebarOpen || s.inspectorOpen);
  const closeOverlays = useUiStore((s) => s.closeOverlays);
  if (!overlayOpen) return null;
  return (
    <button type="button" aria-label="Tutup panel" tabIndex={-1} onClick={closeOverlays} className="absolute inset-0 z-20 bg-black/50 lg:hidden" />
  );
}
