import { useSyncExternalStore } from "react";

/** Di bawah breakpoint lg Tailwind (1024px): tata letak HP/tablet. Harus sama dengan max-lg: dan "(max-width: 1023px)" di bagian lain. */
export const MOBILE_QUERY = "(max-width: 1023px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
// Render server dan hidrasi awal memakai tata letak desktop; React menyesuaikan segera setelah hidrasi.
const getServerSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Tinggi viewport (px); 0 saat render server. Dipakai untuk tinggi panel bawah di HP. */
export function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 0);
}
