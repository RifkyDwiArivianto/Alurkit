"use client";

import { Ellipsis, Pencil, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MenuItem, MenuPopover, MenuSeparator } from "@/components/ui/menu-popover";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/stores/ui-store";
import { ModeDropdown } from "./mode-dropdown";
import { Logo, SAVE_DOT, saveLabel } from "./top-bar";

export type MobileMenuEntry =
  | { type: "item"; label: string; icon: ReactNode; onSelect: () => void; disabled?: boolean; title?: string }
  | { type: "separator" };

interface MobileTopBarProps {
  title: string;
  onTitleChange: (value: string) => void;
  /** aria-label kolom judul; sama dengan versi desktop ("Nama workflow" / "Judul flowchart"). */
  titleLabel: string;
  saveStatus: SaveStatus;
  savedAt: number | null;
  /** Aksi utama opsional di kanan baris pertama (Workflow: Run/Stop). Flowchart tidak punya; aksinya ada di menu ⋯. */
  primary?: ReactNode;
  /** Item menu ⋯ sebelum "Import JSON" (mis. Uji alur, Undo, Redo); diikuti pemisah. */
  menuLead?: MobileMenuEntry[];
  /** Item menu ⋯ setelah "Import JSON". */
  menuItems: MobileMenuEntry[];
  importLabel: string;
  importDisabled?: boolean;
  onImportFile: (file: File) => void;
  importInputLabel: string;
}

/**
 * Top bar HP (di bawah lg), dua baris:
 *  1) [Mode ▾] ........ [aksi utama] [⋯]   (48px)
 *  2) Judul ✎ ........ ● status simpan      (28px)
 */
export function MobileTopBar({
  title,
  onTitleChange,
  titleLabel,
  saveStatus,
  savedAt,
  primary,
  menuLead = [],
  menuItems,
  importLabel,
  importDisabled,
  onImportFile,
  importInputLabel,
}: MobileTopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const select = (action: () => void) => () => {
    setMenuOpen(false);
    menuTrigger.current?.focus();
    action();
  };

  return (
    <header className="relative z-40 shrink-0 border-b border-ink-700 bg-ink-900">
      <div className="flex h-12 items-center gap-2 px-2">
        <Logo alwaysWordmark={!primary} />
        <div className="min-w-0 flex-1" />
        {primary}
        <ModeDropdown />

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={importInputLabel}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // izinkan memilih file yang sama lagi
            if (file) onImportFile(file);
          }}
        />
        <div className="relative">
          <button
            ref={menuTrigger}
            type="button"
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-lg border border-ink-600 bg-ink-850 text-ink-200 transition-colors hover:bg-ink-800",
              menuOpen && "border-ink-500 bg-ink-800 text-ember-400",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
          <MenuPopover open={menuOpen} onClose={() => setMenuOpen(false)} triggerRef={menuTrigger} label="Menu" align="right" dim>
            {menuLead.length > 0 && (
              <>
                {renderEntries(menuLead, select)}
                <MenuSeparator />
              </>
            )}
            <MenuItem
              label={importLabel}
              icon={<Upload className="size-4" aria-hidden />}
              disabled={importDisabled}
              onSelect={select(() => fileInput.current?.click())}
            />
            {renderEntries(menuItems, select)}
          </MenuPopover>
        </div>
      </div>

      <div className="flex h-7 items-center justify-between gap-3 border-t border-ink-700/60 px-3">
        <TitleField value={title} onChange={onTitleChange} label={titleLabel} />
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-400" title="Disimpan otomatis di penyimpanan lokal browser ini">
          <span className={cn("size-1.5 rounded-full", SAVE_DOT[saveStatus])} aria-hidden />
          {saveLabel(saveStatus, savedAt)}
        </span>
      </div>
    </header>
  );
}

function renderEntries(entries: MobileMenuEntry[], select: (action: () => void) => () => void) {
  return entries.map((entry, i) =>
    entry.type === "separator" ? (
      <MenuSeparator key={`sep-${i}`} />
    ) : (
      <MenuItem key={entry.label} label={entry.label} icon={entry.icon} disabled={entry.disabled} title={entry.title} onSelect={select(entry.onSelect)} />
    ),
  );
}

/** Judul dokumen: teks dengan ikon pensil; ketuk untuk mengganti nama. Enter/blur menyimpan, Escape membatalkan. */
function TitleField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const original = useRef(value);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label={label}
        value={value}
        maxLength={80}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false);
          else if (e.key === "Escape") {
            e.stopPropagation();
            onChange(original.current);
            setEditing(false);
          }
        }}
        // 16px mencegah iOS Safari memperbesar halaman saat fokus
        className="h-6 min-w-0 flex-1 rounded-md border border-ink-500 bg-ink-850 px-1.5 text-base font-medium text-ink-100 focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        original.current = value; // nilai sebelum diedit, untuk Escape
        setEditing(true);
      }}
      aria-label={`Ganti nama: ${value || "Tanpa judul"}`}
      className="-ml-1 flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1 text-left text-xs font-medium text-ink-200 hover:bg-ink-800"
    >
      <span className="truncate">{value || "Tanpa judul"}</span>
      <Pencil className="size-3 shrink-0 text-ink-400" aria-hidden />
    </button>
  );
}
