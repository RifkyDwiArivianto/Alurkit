"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { LANE_HEADER_W } from "../lanes";

export type LaneNodeData = { name: string; index: number };
export type LaneFlowNode = Node<LaneNodeData, "lane">;

/** Jalur swimlane — node virtual (tidak disimpan) yang dibentuk dari daftar lane. */
function LaneNodeView({ data }: NodeProps<LaneFlowNode>) {
  return (
    <div className={cn("flex h-full w-full border-y border-ink-700", data.index % 2 === 0 ? "bg-ink-900/70" : "bg-ink-850/70")}>
      <div
        style={{ width: LANE_HEADER_W }}
        className="flex shrink-0 items-center justify-center overflow-hidden border-r border-ink-700 bg-ink-800/80 px-3 text-center text-[13px] font-semibold break-words text-ink-200"
      >
        {data.name}
      </div>
    </div>
  );
}

export const LaneNodeComponent = memo(LaneNodeView);
