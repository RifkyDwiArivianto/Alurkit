"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidePanelProps {
  open: boolean;
  side: "left" | "right";
  width: number;
  label: string;
  children: ReactNode;
}

/** Panel samping yang menutup/membuka dengan animasi lebar; menjadi overlay di bawah breakpoint lg. */
export function SidePanel({ open, side, width, label, children }: SidePanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          aria-label={label}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            "shrink-0 overflow-hidden bg-ink-900 max-lg:absolute max-lg:inset-y-0 max-lg:z-30 max-lg:shadow-2xl max-lg:shadow-black/60",
            side === "left" ? "left-0 border-r border-ink-700" : "right-0 border-l border-ink-700",
          )}
        >
          <div style={{ width, maxWidth: "100vw" }} className="flex h-full flex-col">
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-700 px-4">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">{title}</h2>
      {children}
    </div>
  );
}
