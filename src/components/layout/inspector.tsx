"use client";

import { MousePointerClick, SlidersHorizontal, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { NodeConfigForm } from "@/components/inspector/node-forms";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/form-fields";
import { PanelHeader, SidePanel } from "@/components/ui/side-panel";
import { NODE_DEFINITIONS } from "@/features/workflow/node-definitions";
import { NODE_ICONS } from "@/features/workflow/node-icons";
import { useWorkflowStore } from "@/features/workflow/store";
import { useUiStore } from "@/stores/ui-store";

function Meta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-800 py-2 text-xs">
      <dt className="text-ink-400">{label}</dt>
      <dd className="truncate font-mono text-ink-200">{value}</dd>
    </div>
  );
}

function SelectedNode({ id }: { id: string }) {
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === id));
  const edges = useWorkflowStore((s) => s.edges);
  const removeNodes = useWorkflowStore((s) => s.removeNodes);
  const updateLabel = useWorkflowStore((s) => s.updateNodeLabel);
  if (!node) return null;

  const def = NODE_DEFINITIONS[node.data.kind];
  const Icon = NODE_ICONS[node.data.kind];
  const incoming = edges.filter((e) => e.target === id).length;
  const outgoing = edges.filter((e) => e.source === id).length;

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl" style={{ background: `${def.accent}22`, color: def.accent }}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{def.label}</p>
          <p className="text-xs text-ink-400">{def.summary}</p>
        </div>
      </div>

      <div className="space-y-4">
        <TextField
          label="Nama node"
          value={node.data.label}
          onChange={(label) => updateLabel(id, label)}
          error={node.data.label.trim() === "" ? "Wajib diisi" : undefined}
          maxLength={40}
        />
        <NodeConfigForm node={node} />
      </div>

      <dl>
        <Meta label="ID" value={node.id} />
        <Meta label="Masuk / keluar" value={`${incoming} / ${outgoing}`} />
      </dl>

      <Button variant="danger" className="w-full" onClick={() => removeNodes([id])}>
        <Trash2 className="size-4" /> Hapus node
      </Button>
    </div>
  );
}

/** Isi inspector: dipakai panel samping (desktop) dan bottom sheet (HP). */
export function InspectorBody() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selected = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const first = selected[0];

  return selected.length === 1 && first ? (
    <SelectedNode key={first.id} id={first.id} />
  ) : selected.length > 1 ? (
    <EmptyState icon={SlidersHorizontal} title={`${selected.length} node dipilih`} description="Pilih satu node untuk mengedit konfigurasinya. Tekan Delete untuk menghapus semua yang dipilih." />
  ) : (
    <EmptyState icon={MousePointerClick} title="Belum ada node dipilih" description="Pilih node di canvas untuk mengedit konfigurasinya di sini." />
  );
}

export function Inspector() {
  const open = useUiStore((s) => s.inspectorOpen);

  return (
    <SidePanel open={open} side="right" width={320} label="Inspector">
      <PanelHeader title="Inspector" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InspectorBody />
      </div>
    </SidePanel>
  );
}
