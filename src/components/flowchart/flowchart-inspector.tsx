"use client";

import { MousePointerClick, SlidersHorizontal, Trash2 } from "lucide-react";
import { useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form-fields";
import { PanelHeader, SidePanel } from "@/components/ui/side-panel";
import { FLOW_PALETTE } from "@/features/flowchart/colors";
import { FLOW_KIND_DEFS } from "@/features/flowchart/defs";
import { laneBands, laneIdAt, nodeSize } from "@/features/flowchart/lanes";
import { useFlowchartStore } from "@/features/flowchart/store";
import { FLOW_COLORS, type EdgeShape } from "@/features/flowchart/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const SHAPE_OPTIONS: readonly { value: EdgeShape; label: string }[] = [
  { value: "smoothstep", label: "Siku membulat" },
  { value: "step", label: "Siku tajam" },
  { value: "straight", label: "Lurus" },
  { value: "default", label: "Melengkung" },
];

function NodeInspector({ id }: { id: string }) {
  const node = useFlowchartStore((s) => s.nodes.find((n) => n.id === id));
  const lanes = useFlowchartStore((s) => s.lanes);
  const updateNode = useFlowchartStore((s) => s.updateNode);
  const removeNodes = useFlowchartStore((s) => s.removeNodes);
  if (!node) return null;

  const def = FLOW_KIND_DEFS[node.data.kind];
  const bands = laneBands(lanes);
  const laneId = laneIdAt(node, bands);
  const laneName = bands.find((b) => b.id === laneId)?.name;
  const size = nodeSize(node);

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-sm font-semibold">{def.label}</p>
        <p className="text-xs text-ink-400">{def.hint}</p>
      </div>

      <TextAreaField label="Teks" value={node.data.text} onChange={(text) => updateNode(id, { text })} rows={3} hint="Gunakan Enter untuk baris baru." />

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-ink-300">Warna</legend>
        <div className="flex flex-wrap gap-2">
          {FLOW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={node.data.color === c}
              aria-label={FLOW_PALETTE[c].label}
              title={FLOW_PALETTE[c].label}
              onClick={() => updateNode(id, { color: c })}
              style={{ background: FLOW_PALETTE[c].fill, borderColor: FLOW_PALETTE[c].stroke }}
              className={cn("size-8 rounded-lg border-2 transition-shadow", node.data.color === c && "ring-2 ring-ember-400 ring-offset-2 ring-offset-ink-900")}
            />
          ))}
        </div>
      </fieldset>

      <dl>
        <div className="flex items-baseline justify-between gap-3 border-b border-ink-800 py-2 text-xs">
          <dt className="text-ink-400">Swimlane</dt>
          <dd className="truncate text-ink-200">{lanes.length === 0 ? "Tidak ada lane" : (laneName ?? "Di luar lane")}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-ink-800 py-2 text-xs">
          <dt className="text-ink-400">Ukuran</dt>
          <dd className="font-mono text-ink-200">{Math.round(size.w)} × {Math.round(size.h)}</dd>
        </div>
      </dl>
      <p className="text-xs leading-relaxed text-ink-500">Seret sudut atau sisi simbol yang terpilih untuk mengubah ukurannya.</p>

      <Button variant="danger" className="w-full" onClick={() => removeNodes([id])}>
        <Trash2 className="size-4" /> Hapus simbol
      </Button>
    </div>
  );
}

function EdgeInspector({ id }: { id: string }) {
  const edge = useFlowchartStore((s) => s.edges.find((e) => e.id === id));
  const updateEdge = useFlowchartStore((s) => s.updateEdge);
  const removeEdges = useFlowchartStore((s) => s.removeEdges);
  const checkId = useId();
  if (!edge) return null;

  const shape: EdgeShape = edge.type === "step" || edge.type === "straight" || edge.type === "default" ? edge.type : "smoothstep";

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="text-sm font-semibold">Garis penghubung</p>
        <p className="text-xs text-ink-400">Beri label (mis. “Ya”/“Tidak”) pada cabang keputusan.</p>
      </div>
      <TextField label="Label" value={typeof edge.label === "string" ? edge.label : ""} onChange={(label) => updateEdge(id, { label })} maxLength={100} />
      <SelectField label="Bentuk garis" value={shape} options={SHAPE_OPTIONS} onChange={(s) => updateEdge(id, { shape: s })} />
      <div className="flex items-center gap-2.5">
        <input
          id={checkId}
          type="checkbox"
          checked={edge.data?.dashed ?? false}
          onChange={(e) => updateEdge(id, { dashed: e.target.checked })}
          className="size-4 accent-ember-500"
        />
        <label htmlFor={checkId} className="text-sm text-ink-200">Garis putus-putus</label>
      </div>
      <Button variant="danger" className="w-full" onClick={() => removeEdges([id])}>
        <Trash2 className="size-4" /> Hapus garis
      </Button>
    </div>
  );
}

/** Isi inspector: dipakai panel samping (desktop) dan bottom sheet (HP). */
export function FlowchartInspectorBody() {
  const nodes = useFlowchartStore((s) => s.nodes);
  const edges = useFlowchartStore((s) => s.edges);
  const selNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const selEdges = useMemo(() => edges.filter((e) => e.selected), [edges]);
  const total = selNodes.length + selEdges.length;
  const firstNode = selNodes[0];
  const firstEdge = selEdges[0];

  return total === 1 && firstNode ? (
    <NodeInspector key={firstNode.id} id={firstNode.id} />
  ) : total === 1 && firstEdge ? (
    <EdgeInspector key={firstEdge.id} id={firstEdge.id} />
  ) : total > 1 ? (
    <EmptyState icon={SlidersHorizontal} title={`${total} item dipilih`} description="Pilih satu simbol atau garis untuk mengeditnya. Tekan Delete untuk menghapus semua yang dipilih." />
  ) : (
    <EmptyState icon={MousePointerClick} title="Belum ada yang dipilih" description="Pilih simbol atau garis di canvas untuk mengedit teks, warna, dan bentuknya." />
  );
}

export function FlowchartInspector() {
  const open = useUiStore((s) => s.inspectorOpen);

  return (
    <SidePanel open={open} side="right" width={320} label="Inspector flowchart">
      <PanelHeader title="Inspector" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FlowchartInspectorBody />
      </div>
    </SidePanel>
  );
}
