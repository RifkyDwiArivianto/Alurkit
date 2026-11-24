import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { FLOW_KIND_DEFS } from "./defs";
import { useFlowchartStore } from "./store";
import type { FlowKind } from "./types";

export const CHART_CANVAS_ID = "alurkit-chart-canvas";
export const SHAPE_DRAG_MIME = "application/x-alurkit-shape";

/** Menempatkan simbol baru di tengah area canvas yang terlihat (berundak agar tidak menumpuk). */
export function usePlaceShape() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useFlowchartStore((s) => s.addNode);
  const count = useRef(0);

  return useCallback(
    (kind: FlowKind) => {
      const def = FLOW_KIND_DEFS[kind];
      const rect = document.getElementById(CHART_CANVAS_ID)?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const step = (count.current % 6) * 30;
      count.current += 1;
      return addNode(kind, screenToFlowPosition({ x: cx - def.width / 2 + step, y: cy - def.height / 2 + step }));
    },
    [addNode, screenToFlowPosition],
  );
}
