"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import { Shapes, Sparkles, SquarePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, type DragEvent } from "react";
import { FlowchartMobileControls } from "@/components/flowchart/flowchart-mobile-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { StartChoices } from "@/components/ui/start-choices";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useUiStore } from "@/stores/ui-store";
import { canConnectFlow } from "../connection";
import { FLOW_PALETTE } from "../colors";
import { FLOW_KIND_DEFS } from "../defs";
import { LANE_HEADER_W, LANE_PREFIX, laneBands, laneBodyWidth, nodeSize } from "../lanes";
import { sampleFlowchart } from "../sample";
import { useFlowchartStore } from "../store";
import { useTestStore } from "../test-store";
import { FLOW_KINDS, FLOW_NODE_TYPE, type FlowEdge, type FlowKind, type FlowNode } from "../types";
import { CHART_CANVAS_ID, SHAPE_DRAG_MIME, usePlaceShape } from "../use-place-shape";
import { LaneNodeComponent, type LaneFlowNode } from "./lane-node";
import { ShapeNodeComponent } from "./shape-node";

type AnyNode = FlowNode | LaneFlowNode;

const nodeTypes: NodeTypes = { [FLOW_NODE_TYPE]: ShapeNodeComponent, lane: LaneNodeComponent };

const isFlowKind = (v: string): v is FlowKind => (FLOW_KINDS as readonly string[]).includes(v);

export function FlowchartCanvas() {
  const nodes = useFlowchartStore((s) => s.nodes);
  const edges = useFlowchartStore((s) => s.edges);
  const lanes = useFlowchartStore((s) => s.lanes);
  const onNodesChange = useFlowchartStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowchartStore((s) => s.onEdgesChange);
  const connect = useFlowchartStore((s) => s.connect);
  const addNode = useFlowchartStore((s) => s.addNode);
  const beginChange = useFlowchartStore((s) => s.beginChange);
  const endChange = useFlowchartStore((s) => s.endChange);
  const replaceDoc = useFlowchartStore((s) => s.replaceDoc);
  const fitRequest = useUiStore((s) => s.fitRequest);
  const requestFit = useUiStore((s) => s.requestFit);
  const { screenToFlowPosition, fitView, setCenter, getZoom } = useReactFlow();
  const testOpen = useTestStore((s) => s.open);
  const trail = useTestStore((s) => s.trail);
  const focusIds = useTestStore((s) => s.focusIds);
  const focusTick = useTestStore((s) => s.focusTick);
  const currentId = trail[trail.length - 1]?.nodeId ?? null;
  const placeShape = usePlaceShape();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (fitRequest === 0) return;
    const t = setTimeout(() => void fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
  }, [fitRequest, fitView]);

  // Uji alur: pusatkan canvas ke simbol yang sedang ditelusuri (zoom pengguna dipertahankan).
  useEffect(() => {
    if (!testOpen || !currentId) return;
    const n = useFlowchartStore.getState().nodes.find((x) => x.id === currentId);
    if (!n) return;
    const size = nodeSize(n);
    void setCenter(n.position.x + size.w / 2, n.position.y + size.h / 2, { duration: 300, zoom: Math.min(Math.max(getZoom(), 0.6), 1.2) });
  }, [testOpen, currentId, setCenter, getZoom]);

  // Uji alur: pusatkan canvas ke simbol bermasalah yang dipilih dari daftar.
  useEffect(() => {
    if (focusTick === 0 || focusIds.length === 0) return;
    void fitView({ nodes: focusIds.map((id) => ({ id })), duration: 300, padding: 0.3, maxZoom: 1 });
  }, [focusTick, focusIds, fitView]);

  // Garis yang sudah dilalui penelusuran ditandai; dokumennya sendiri tidak diubah.
  const shownEdges = useMemo(() => {
    if (trail.length < 2) return edges;
    const taken = new Set(trail.map((t) => t.viaEdgeId));
    return edges.map((e) =>
      taken.has(e.id)
        ? {
            ...e,
            animated: true,
            style: { ...e.style, stroke: "#ff9560", strokeWidth: 2.6 },
            markerEnd: typeof e.markerEnd === "object" ? { ...e.markerEnd, color: "#ff9560" } : e.markerEnd,
          }
        : e,
    );
  }, [edges, trail]);

  const allNodes = useMemo<AnyNode[]>(() => {
    const bodyW = laneBodyWidth(nodes);
    const laneNodes: LaneFlowNode[] = laneBands(lanes).map((b) => ({
      id: `${LANE_PREFIX}${b.id}`,
      type: "lane",
      position: { x: -LANE_HEADER_W, y: b.top },
      width: LANE_HEADER_W + bodyW,
      height: b.height,
      data: { name: b.name, index: b.index },
      draggable: false,
      selectable: false,
      deletable: false,
      focusable: false,
      connectable: false,
      zIndex: -1,
    }));
    return [...laneNodes, ...nodes];
  }, [lanes, nodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<AnyNode>[]) => {
      const mine = changes.filter((c) => !("id" in c) || !c.id.startsWith(LANE_PREFIX));
      if (mine.length > 0) onNodesChange(mine as NodeChange<FlowNode>[]);
    },
    [onNodesChange],
  );

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

  const isValidConnection = useCallback((c: Edge | Connection) => {
    const { nodes: ns, edges: es } = useFlowchartStore.getState();
    return canConnectFlow(c, ns, es);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(SHAPE_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      const kind = e.dataTransfer.getData(SHAPE_DRAG_MIME);
      if (!isFlowKind(kind)) return;
      e.preventDefault();
      const def = FLOW_KIND_DEFS[kind];
      addNode(kind, screenToFlowPosition({ x: e.clientX - def.width / 2, y: e.clientY - def.height / 2 }));
    },
    [addNode, screenToFlowPosition],
  );

  const empty = nodes.length === 0 && lanes.length === 0;

  return (
    <div id={CHART_CANVAS_ID} className="relative min-h-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<AnyNode, FlowEdge>
        nodes={allNodes}
        edges={shownEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Loose}
        onNodeDragStart={() => beginChange()}
        onNodeDragStop={() => endChange()}
        onSelectionDragStart={() => beginChange()}
        onSelectionDragStop={() => endChange()}
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[10, 10]}
        colorMode="dark"
        aria-label="Canvas flowchart"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#3a352e" />
        <Controls position="bottom-left" showInteractive={false} className="max-lg:hidden!" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          maskColor="rgb(13 12 11 / 0.7)"
          nodeColor={(n) => (n.type === "lane" ? "#2b2722" : FLOW_PALETTE[(n as FlowNode).data.color].stroke)}
          className="max-lg:hidden!"
        />
      </ReactFlow>

      {isMobile && <FlowchartMobileControls />}

      {empty && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto rounded-2xl border border-ink-700 bg-ink-900/90 backdrop-blur">
            <EmptyState
              icon={Shapes}
              title="Flowchart masih kosong"
              description="Tambahkan simbol lalu hubungkan lewat titik di tepinya, atau lihat contoh lengkap dengan swimlane per peran."
            >
              <StartChoices
                scratch={{
                  icon: SquarePlus,
                  title: "Mulai dari awal",
                  hint: "Canvas dimulai dengan simbol “Mulai”; tambah simbol dan swimlane dari panel kiri.",
                  onSelect: () => void placeShape("terminator"),
                }}
                sample={{
                  icon: Sparkles,
                  title: "Muat contoh",
                  hint: "Peminjaman buku dengan 4 swimlane, 9 jenis simbol, 6 warna, dan 4 gaya garis.",
                  onSelect: () => {
                    replaceDoc(sampleFlowchart(), { history: true });
                    requestFit();
                  },
                }}
              />
            </EmptyState>
          </div>
        </div>
      )}
    </div>
  );
}
