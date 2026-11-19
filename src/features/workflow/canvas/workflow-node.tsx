"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { motion } from "motion/react";
import { memo, type CSSProperties } from "react";
import { useExecutionStore } from "../execution-store";
import { cn } from "@/lib/utils";
import { BRANCH_HANDLES, NODE_DEFINITIONS } from "../node-definitions";
import { NODE_ICONS } from "../node-icons";
import { summarizeNode } from "../node-summary";
import type { WorkflowNode } from "../types";

function StatusBadge({ id }: { id: string }) {
  const run = useExecutionStore((s) => s.nodeStatus[id]);
  const issue = useExecutionStore((s) => {
    let level: "error" | "warning" | null = null;
    for (const i of s.issues) {
      if (i.nodeId !== id) continue;
      if (i.level === "error") return "error";
      level = "warning";
    }
    return level;
  });

  if (run === "running") return <Loader2 aria-label="Sedang berjalan" className="size-4 animate-spin text-ember-400 motion-reduce:animate-none" />;
  if (run === "success") return <Check aria-label="Berhasil" className="size-4 text-emerald-300" />;
  if (run === "error") return <X aria-label="Gagal" className="size-4 text-rose-300" />;
  if (issue === "error") return <AlertTriangle aria-label="Konfigurasi bermasalah" className="size-4 text-rose-300" />;
  if (issue === "warning") return <AlertTriangle aria-label="Ada peringatan" className="size-4 text-amber-300" />;
  return null;
}

function WorkflowNodeView({ id, data, selected }: NodeProps<WorkflowNode>) {
  const runStatus = useExecutionStore((s) => s.nodeStatus[id]);
  const def = NODE_DEFINITIONS[data.kind];
  const Icon = NODE_ICONS[data.kind];
  const handleStyle: CSSProperties = {
    width: 12,
    height: 12,
    background: def.accent,
    border: "2px solid #1a1714",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      style={{ "--accent": def.accent } as CSSProperties}
      className={cn(
        "w-52 rounded-xl border bg-ink-850 shadow-lg shadow-black/40 transition-[border-color,box-shadow] duration-150",
        runStatus === "error"
          ? "border-rose-400"
          : runStatus === "running"
            ? "border-ember-400 shadow-[0_0_0_3px_rgb(255_122_61_/_0.25)]"
            : selected
              ? "border-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_28%,transparent)]"
              : "border-ink-600 hover:border-ink-500",
      )}
    >
      {def.hasInput && <Handle type="target" position={Position.Left} style={handleStyle} />}

      <div className="flex items-center gap-2.5 p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${def.accent}22`, color: def.accent }}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink-100">{data.label || def.label}</p>
          <p className="truncate font-mono text-[11px] text-ink-400">{summarizeNode(data)}</p>
        </div>
        <div className="ml-auto shrink-0">
          <StatusBadge id={id} />
        </div>
      </div>

      {def.output === "single" && <Handle type="source" position={Position.Right} style={handleStyle} />}

      {def.output === "branch" && (
        <div className="border-t border-ink-700">
          {BRANCH_HANDLES.map((h) => (
            <div key={h.id} className="relative flex justify-end px-3 py-1.5 text-[11px] text-ink-300">
              {h.label}
              <Handle id={h.id} type="source" position={Position.Right} style={handleStyle} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export const WorkflowNodeComponent = memo(WorkflowNodeView);
