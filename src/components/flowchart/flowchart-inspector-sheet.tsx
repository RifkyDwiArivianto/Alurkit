"use client";

import { useCallback, useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { nodeSize } from "@/features/flowchart/lanes";
import { useFlowchartStore } from "@/features/flowchart/store";
import { CHART_CANVAS_ID } from "@/features/flowchart/use-place-shape";
import { useRevealForSheet, type RevealBox } from "@/lib/use-reveal-for-sheet";
import { FlowchartInspectorBody } from "./flowchart-inspector";

/**
 * Inspector sebagai bottom sheet (HP). Muncul otomatis saat tepat satu simbol atau garis dipilih; menutupnya
 * (tombol, tarik, Escape) juga membatalkan pilihan, jadi mengetuk simbol itu lagi membukanya kembali.
 */
export function FlowchartInspectorSheet() {
  const nodes = useFlowchartStore((s) => s.nodes);
  const edges = useFlowchartStore((s) => s.edges);
  const onNodesChange = useFlowchartStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowchartStore((s) => s.onEdgesChange);

  const selNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const selEdges = useMemo(() => edges.filter((e) => e.selected), [edges]);
  const key = selNodes.length + selEdges.length === 1 ? (selNodes[0]?.id ?? selEdges[0]?.id ?? null) : null;

  const getBox = useCallback((): RevealBox | null => {
    const { nodes: ns, edges: es } = useFlowchartStore.getState();
    const n = ns.find((x) => x.selected);
    if (n) {
      const s = nodeSize(n);
      return { x: n.position.x, y: n.position.y, w: s.w, h: s.h };
    }
    const e = es.find((x) => x.selected);
    const a = e && ns.find((x) => x.id === e.source);
    const b = e && ns.find((x) => x.id === e.target);
    if (!a || !b) return null;
    const sa = nodeSize(a);
    const sb = nodeSize(b);
    return { x: (a.position.x + sa.w / 2 + b.position.x + sb.w / 2) / 2, y: (a.position.y + sa.h / 2 + b.position.y + sb.h / 2) / 2, w: 0, h: 0 };
  }, []);
  useRevealForSheet(CHART_CANVAS_ID, key, getBox);

  const close = useCallback(() => {
    onNodesChange(selNodes.map((n) => ({ type: "select" as const, id: n.id, selected: false })));
    onEdgesChange(selEdges.map((e) => ({ type: "select" as const, id: e.id, selected: false })));
  }, [onNodesChange, onEdgesChange, selNodes, selEdges]);

  return (
    <BottomSheet open={key !== null} onClose={close} title="Inspector" maxHeight="55dvh">
      <FlowchartInspectorBody />
    </BottomSheet>
  );
}
