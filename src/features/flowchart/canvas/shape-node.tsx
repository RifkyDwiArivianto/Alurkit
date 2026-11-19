"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { FLOW_PALETTE } from "../colors";
import { FLOW_KIND_DEFS } from "../defs";
import { PATH_SHAPES, TEXT_INSET } from "../shapes";
import { useFlowchartStore } from "../store";
import { useTestStore } from "../test-store";
import type { FlowNode, HandleId } from "../types";

/** Sorotan saat Uji alur: simbol yang sedang ditelusuri, yang sudah dilewati, dan yang bermasalah. */
const MARK_FILTER = {
  current: "drop-shadow(0 0 10px #ff9560) drop-shadow(0 0 2px #ff9560)",
  visited: "drop-shadow(0 0 6px rgb(255 149 96 / 0.5))",
  issue: "drop-shadow(0 0 10px #fb7185) drop-shadow(0 0 2px #fb7185)",
} as const;

function useTestMark(id: string): keyof typeof MARK_FILTER | null {
  return useTestStore((s) => {
    if (s.trail[s.trail.length - 1]?.nodeId === id) return "current";
    if (s.focusIds.includes(id)) return "issue";
    return s.trail.some((t) => t.nodeId === id) ? "visited" : null;
  });
}

const SIDES: { id: HandleId; position: Position }[] = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
];

function ShapeNodeView({ id, data, selected }: NodeProps<FlowNode>) {
  const def = FLOW_KIND_DEFS[data.kind];
  const pal = FLOW_PALETTE[data.color];
  const inset = TEXT_INSET[data.kind];
  const beginChange = useFlowchartStore((s) => s.beginChange);
  const endChange = useFlowchartStore((s) => s.endChange);
  const path = PATH_SHAPES[data.kind];
  const mark = useTestMark(id);

  const box: CSSProperties = { background: pal.fill, borderColor: pal.stroke };
  const handleStyle: CSSProperties = { width: 12, height: 12, background: pal.stroke, border: "2px solid #141210" };

  return (
    <div className="group relative h-full w-full transition-[filter] duration-200" style={mark ? { filter: MARK_FILTER[mark] } : undefined} data-test-mark={mark ?? undefined}>
      <NodeResizer
        isVisible={selected}
        minWidth={def.minWidth}
        minHeight={def.minHeight}
        keepAspectRatio={data.kind === "connector"}
        lineStyle={{ borderColor: "#ff9560" }}
        handleStyle={{ width: 10, height: 10, borderRadius: 3, background: "#141210", border: "1.5px solid #ff9560" }}
        onResizeStart={() => beginChange()}
        onResizeEnd={() => endChange()}
      />

      {path ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d={path.d} fill={pal.fill} stroke={pal.stroke} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          {path.extra?.map((d) => (
            <path key={d} d={d} fill="none" stroke={pal.stroke} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      ) : (
        <div
          aria-hidden
          style={box}
          className={cn(
            "absolute inset-0 border-[1.6px]",
            data.kind === "terminator" || data.kind === "connector" ? "rounded-full" : data.kind === "note" ? "rounded border-dashed" : "rounded-md",
          )}
        />
      )}

      <div
        style={{ left: `${inset.x * 100}%`, right: `${inset.x * 100}%`, top: `${inset.top * 100}%`, bottom: `${inset.bottom * 100}%` }}
        className={cn(
          "absolute flex items-center overflow-hidden text-[13px] leading-tight break-words whitespace-pre-wrap text-ink-100",
          data.kind === "note" ? "justify-start text-left" : "justify-center text-center",
          data.kind === "terminator" && "font-semibold",
        )}
      >
        {data.text}
      </div>

      {SIDES.map((s) => (
        <Handle
          key={s.id}
          id={s.id}
          type="source"
          position={s.position}
          style={handleStyle}
          className={cn("transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
        />
      ))}
    </div>
  );
}

export const ShapeNodeComponent = memo(ShapeNodeView);
