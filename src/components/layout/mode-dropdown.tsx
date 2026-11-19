"use client";

import { ChevronDown, Shapes, Workflow } from "lucide-react";
import { useRef, useState } from "react";
import { MenuItem, MenuPopover } from "@/components/ui/menu-popover";
import { cn } from "@/lib/utils";
import { useUiStore, type AppMode } from "@/stores/ui-store";

const MODES: { id: AppMode; label: string; hint: string; icon: typeof Workflow }[] = [
  { id: "flowchart", label: "Flowchart", hint: "Diagram sistem dengan swimlane", icon: Shapes },
  { id: "workflow", label: "Workflow", hint: "Alur yang bisa dijalankan", icon: Workflow },
];

/** Pengalih mode berlabel untuk top bar HP: tombol "Flowchart ▾" yang membuka daftar mode. */
export function ModeDropdown() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0]!;
  const CurrentIcon = current.icon;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-lg border border-ink-600 bg-ink-850 pr-2.5 pl-3 text-sm font-medium text-ink-100 transition-colors hover:bg-ink-800",
          open && "border-ink-500 bg-ink-800",
        )}
      >
        <CurrentIcon className="size-4 text-ember-400" aria-hidden />
        {current.label}
        <ChevronDown className={cn("size-4 text-ink-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <MenuPopover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} label="Mode editor" align="right" className="w-64">
        {MODES.map(({ id, label, hint, icon: Icon }) => (
          <MenuItem
            key={id}
            label={label}
            description={hint}
            icon={<Icon className="size-4" aria-hidden />}
            checked={mode === id}
            onSelect={() => {
              setOpen(false);
              if (id !== mode) setMode(id);
              else triggerRef.current?.focus();
            }}
          />
        ))}
      </MenuPopover>
    </div>
  );
}
