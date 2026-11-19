"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useUiStore } from "@/stores/ui-store";

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Modal: ada latar redup, fokus terkunci di dalam sheet, dan fokus dikembalikan saat ditutup. Non-modal: canvas tetap bisa disentuh. */
  modal?: boolean;
  /** Tinggi maksimum; pakai satuan dvh supaya mengikuti bilah alamat browser HP. */
  maxHeight?: string;
  children: ReactNode;
}

/**
 * Lembar bawah untuk layar HP: handle bar yang bisa ditarik ke bawah, animasi Motion (mengikuti reduced-motion
 * lewat MotionConfig di app-shell), dan padding env(safe-area-inset-bottom). Tingginya dilaporkan ke ui-store
 * (bottomInset) agar canvas bisa digeser dan kontrol mengambang disembunyikan.
 */
export function BottomSheet({ open, onClose, title, modal = false, maxHeight = "60dvh", children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <SheetBody key="sheet" onClose={onClose} title={title} modal={modal} maxHeight={maxHeight}>
          {children}
        </SheetBody>
      )}
    </AnimatePresence>
  );
}

function SheetBody({ onClose, title, modal, maxHeight, children }: Omit<BottomSheetProps, "open">) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const setBottomInset = useUiStore((s) => s.setBottomInset);

  // Laporkan tinggi sheet selama terpasang.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => setBottomInset(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      setBottomInset(0);
    };
  }, [setBottomInset]);

  // Sheet modal mengambil fokus dan mengembalikannya ke pemicu (mis. tombol +) saat ditutup.
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, [modal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!modal || e.key !== "Tab") return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {modal && (
        <motion.button
          key="scrim"
          type="button"
          aria-label="Tutup"
          tabIndex={-1}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[45] cursor-default bg-black/55"
        />
      )}
      <motion.div
        key="panel"
        ref={ref}
        role={modal ? "dialog" : "region"}
        aria-modal={modal || undefined}
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 600) onClose();
        }}
        style={{ maxHeight }}
        className={`fixed inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-ink-600 bg-ink-900 shadow-2xl shadow-black/60 outline-none ${modal ? "z-[46]" : "z-30"}`}
      >
        {/* Handle dan judul: area tarik ke bawah untuk menutup */}
        <div onPointerDown={(e) => controls.start(e)} className="shrink-0 cursor-grab touch-none select-none">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-ink-500" aria-hidden />
          <div className="flex h-12 items-center justify-between pr-1 pl-4">
            <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">{title}</h2>
            <button
              type="button"
              aria-label={`Tutup ${title.toLowerCase()}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink-300 hover:bg-ink-800 hover:text-ink-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
      </motion.div>
    </>
  );
}
