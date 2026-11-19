"use client";

import { useCallback, useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useWorkflowStore } from "@/features/workflow/store";
import { CANVAS_ID } from "@/features/workflow/use-place-node";
import { useRevealForSheet, type RevealBox } from "@/lib/use-reveal-for-sheet";
import { InspectorBody } from "./inspector";

const NODE_W = 208;
const NODE_H = 72;

/** Inspector Workflow sebagai bottom sheet (HP); perilaku sama dengan FlowchartInspectorSheet. */
export function WorkflowInspectorSheet() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);

  const selNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  // Inspector Workflow hanya mengedit node; garis tidak membuka sheet.
  const key = selNodes.length === 1 ? (selNodes[0]?.id ?? null) : null;

  const getBox = useCallback((): RevealBox | null => {
    const n = useWorkflowStore.getState().nodes.find((x) => x.selected);
    if (!n) return null;
    return { x: n.position.x, y: n.position.y, w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H };
  }, []);
  useRevealForSheet(CANVAS_ID, key, getBox);

  const close = useCallback(() => {
    onNodesChange(selNodes.map((n) => ({ type: "select" as const, id: n.id, selected: false })));
    onEdgesChange(edges.filter((e) => e.selected).map((e) => ({ type: "select" as const, id: e.id, selected: false })));
  }, [onNodesChange, onEdgesChange, selNodes, edges]);

  return (
    <BottomSheet open={key !== null} onClose={close} title="Inspector" maxHeight="55dvh">
      <InspectorBody />
    </BottomSheet>
  );
}
