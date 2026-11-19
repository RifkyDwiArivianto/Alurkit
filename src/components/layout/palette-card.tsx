import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kartu di baris palet yang bisa digeser: ikon mini di atas, label di bawah. Tinggi sentuh ≥ 44px. */
export function PaletteCard({ icon, label, onSelect, disabled, title }: { icon: ReactNode; label: string; onSelect: () => void; disabled?: boolean; title?: string }) {
  return (
    <li className="shrink-0 snap-start">
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        title={title}
        className={cn(
          "flex min-h-[4.75rem] w-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-ink-700 bg-ink-850 px-1.5 py-2 text-center transition-colors",
          "hover:border-ink-500 hover:bg-ink-800 active:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {icon}
        <span className="text-xs leading-tight font-medium text-ink-100">{label}</span>
      </button>
    </li>
  );
}

export function PaletteRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </ul>
  );
}
