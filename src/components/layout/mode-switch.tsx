"use client";

import { Shapes, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore, type AppMode } from "@/stores/ui-store";

const MODES: { id: AppMode; label: string; icon: typeof Workflow }[] = [
  { id: "flowchart", label: "Flowchart", icon: Shapes },
  { id: "workflow", label: "Workflow", icon: Workflow },
];

/** Pengalih antara Flowchart (merancang diagram sistem, mode utama) dan Workflow (bisa dijalankan). */
export function ModeSwitch() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);

  return (
    <div role="group" aria-label="Mode editor" className="flex shrink-0 rounded-lg border border-ink-600 bg-ink-850 p-0.5">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={mode === id}
          aria-label={label}
          title={label}
          onClick={() => setMode(id)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors sm:px-2.5",
            mode === id ? "bg-ember-500 text-ink-950" : "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
