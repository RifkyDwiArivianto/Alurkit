import { useReactFlow } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { useWorkflowStore } from "./store";
import type { NodeKind } from "./types";

export const CANVAS_ID = "flowforge-canvas";
export const DRAG_MIME = "application/x-flowforge-node";
const NODE_W = 208;
const NODE_H = 72;

/** Menempatkan node baru di tengah area canvas yang terlihat (berundak agar tidak menumpuk). */
export function usePlaceNode() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkflowStore((s) => s.addNode);
  const count = useRef(0);

  return useCallback(
    (kind: NodeKind) => {
      const rect = document.getElementById(CANVAS_ID)?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const step = (count.current % 6) * 28;
      const node = addNode(
        kind,
        screenToFlowPosition({ x: cx - NODE_W / 2 + step, y: cy - NODE_H / 2 + step }),
      );
      if (node) count.current += 1;
      return node;
    },
    [addNode, screenToFlowPosition],
  );
}

export function dropOffset() {
  return { x: NODE_W / 2, y: NODE_H / 2 };
}
