"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

const ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

interface MenuPopoverProps {
  open: boolean;
  onClose: () => void;
  /** Tombol pemicu: fokus dikembalikan ke sini saat menu ditutup. */
  triggerRef: RefObject<HTMLElement | null>;
  label: string;
  align: "left" | "right";
  /** Meredupkan area di bawah top bar (dipakai menu ⋯). */
  dim?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Popover menu untuk top bar HP. Harus berada di dalam elemen `relative` yang membungkus tombol pemicunya (menjadi jangkar posisi).
 * Escape, klik di luar, dan Tab menutup menu; panah atas/bawah, Home, dan End berpindah antar item.
 */
export function MenuPopover({ open, onClose, triggerRef, label, align, dim = false, className, children }: MenuPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(
    (restoreFocus: boolean) => {
      onClose();
      if (restoreFocus) triggerRef.current?.focus();
    },
    [onClose, triggerRef],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Fokus ke item pertama (atau yang sudah dicentang) begitu menu terbuka.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const target = panel.querySelector<HTMLElement>('[aria-checked="true"]:not(:disabled)') ?? panel.querySelector<HTMLElement>(ITEM_SELECTOR);
    target?.focus();
  }, [open]);

  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") return close(false);
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (index + 1) % items.length;
    else if (e.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    items[next]?.focus();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Latar penangkap klik; dimulai tepat di bawah top bar HP (77px: 48 + 28 + 1 garis bawah) supaya top bar tetap terlihat. */}
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Tutup menu"
            tabIndex={-1}
            onClick={() => close(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn("fixed inset-x-0 top-[77px] bottom-0 z-30 cursor-default", dim ? "bg-black/55" : "bg-transparent")}
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={cn(
              "absolute top-[calc(100%+2px)] z-40 w-60 max-w-[calc(100vw-1rem)] rounded-xl border border-ink-600 bg-ink-850 p-1 shadow-2xl shadow-black/60",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MenuItemProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
  /** Untuk pilihan tunggal (mis. mode); item menjadi menuitemradio. */
  checked?: boolean;
  tone?: "default" | "accent";
}

export function MenuItem({ label, description, icon, onSelect, disabled, title, checked, tone = "default" }: MenuItemProps) {
  const isRadio = checked !== undefined;
  return (
    <button
      type="button"
      role={isRadio ? "menuitemradio" : "menuitem"}
      aria-checked={isRadio ? checked : undefined}
      disabled={disabled}
      title={title}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-ink-100 hover:bg-ink-800 focus-visible:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40",
        isRadio && checked && "text-ember-400",
      )}
    >
      {icon && <span className={cn("flex size-5 shrink-0 items-center justify-center", tone === "accent" || (isRadio && checked) ? "text-ember-400" : "text-ink-300")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {description && <span className="block truncate text-xs text-ink-400">{description}</span>}
      </span>
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-ink-700" />;
}
