"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import { Sparkles, SquarePlus, Workflow } from "lucide-react";
import { useCallback, useEffect, type DragEvent } from "react";
import { WorkflowMobileControls } from "@/components/layout/workflow-mobile-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { StartChoices } from "@/components/ui/start-choices";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useUiStore } from "@/stores/ui-store";
import { canConnect } from "../connection-rules";
import { NODE_DEFINITIONS } from "../node-definitions";
import { loadSampleWorkflow } from "../load-sample";
import { useWorkflowStore } from "../store";
import { WORKFLOW_NODE_TYPE, NODE_KINDS, type NodeKind, type WorkflowNode } from "../types";
import { CANVAS_ID, DRAG_MIME, dropOffset, usePlaceNode } from "../use-place-node";
import { WorkflowNodeComponent } from "./workflow-node";

const nodeTypes: NodeTypes = { [WORKFLOW_NODE_TYPE]: WorkflowNodeComponent };

function isNodeKind(v: string): v is NodeKind {
  return (NODE_KINDS as readonly string[]).includes(v);
}

export function WorkflowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const connect = useWorkflowStore((s) => s.connect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const beginDrag = useWorkflowStore((s) => s.beginDrag);
  const endDrag = useWorkflowStore((s) => s.endDrag);
  const fitRequest = useUiStore((s) => s.fitRequest);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const placeNode = usePlaceNode();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (fitRequest === 0) return;
    const t = setTimeout(() => void fitView({ padding: 0.25, duration: 300, maxZoom: 1 }), 60);
    return () => clearTimeout(t);
  }, [fitRequest, fitView]);

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

  const isValidConnection = useCallback((c: Edge | Connection) => {
    const { nodes: ns, edges: es } = useWorkflowStore.getState();
    return canConnect(c, ns, es);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      const kind = e.dataTransfer.getData(DRAG_MIME);
      if (!isNodeKind(kind)) return;
      e.preventDefault();
      const o = dropOffset();
      addNode(kind, screenToFlowPosition({ x: e.clientX - o.x, y: e.clientY - o.y }));
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div id={CANVAS_ID} className="relative min-h-0 flex-1" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<WorkflowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStart={() => beginDrag()}
        onNodeDragStop={() => endDrag()}
        onSelectionDragStart={() => beginDrag()}
        onSelectionDragStop={() => endDrag()}
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.2}
        maxZoom={2}
        snapToGrid
        snapGrid={[16, 16]}
        colorMode="dark"
        proOptions={{ hideAttribution: isMobile }}
        aria-label="Canvas workflow"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="#3a352e" />
        <Controls position="bottom-left" showInteractive={false} className="max-lg:hidden!" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          maskColor="rgb(13 12 11 / 0.7)"
          nodeColor={(n) => NODE_DEFINITIONS[(n as WorkflowNode).data.kind].accent}
          className="max-lg:hidden!"
        />
      </ReactFlow>

      {isMobile && <WorkflowMobileControls />}

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto rounded-2xl border border-ink-700 bg-ink-900/90 backdrop-blur">
            <EmptyState
              icon={Workflow}
              title="Canvas masih kosong"
              description="Mulai dengan node Start lalu hubungkan node lain, atau lihat contoh lengkap yang bisa langsung dijalankan."
            >
              <StartChoices
                scratch={{
                  icon: SquarePlus,
                  title: "Mulai dari awal",
                  hint: "Canvas dimulai dengan node Start; tambah node lain dari panel kiri.",
                  onSelect: () => void placeNode("start"),
                }}
                sample={{
                  icon: Sparkles,
                  title: "Muat contoh",
                  hint: "Pesanan kedai dengan 4 jalur, semua jenis node, cabang Ya/Tidak, dan beberapa Output.",
                  onSelect: () => void loadSampleWorkflow(),
                }}
              />
            </EmptyState>
          </div>
        </div>
      )}
    </div>
  );
}
