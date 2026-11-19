"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, type ToastKind } from "@/stores/ui-store";

const STYLE: Record<ToastKind, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: "text-emerald-300" },
  error: { icon: TriangleAlert, ring: "text-rose-300" },
  info: { icon: Info, ring: "text-sky-300" },
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { icon: Icon, ring } = STYLE[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              role={t.kind === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-ink-600 bg-ink-850 px-4 py-3 text-sm shadow-2xl shadow-black/50"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", ring)} aria-hidden />
              <p className="flex-1 text-ink-100">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="text-ink-400 hover:text-ink-100">
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
