"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ListChecks, Play, RotateCcw, ShieldCheck, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  analyzeFlowchart,
  buildGraph,
  nodeName,
  startNodes,
  stepOptions,
  type FlowGraph,
  type FlowIssue,
} from "@/features/flowchart/analysis";
import { FLOW_KIND_DEFS } from "@/features/flowchart/defs";
import { useFlowchartStore } from "@/features/flowchart/store";
import { MAX_TRACE_STEPS, TEST_SIZE_RATIO, useTestStore, type TestSize, type TestTab } from "@/features/flowchart/test-store";
import { useIsMobile, useViewportHeight } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";

function CheckTab({ issues, hasNodes }: { issues: FlowIssue[]; hasNodes: boolean }) {
  const focus = useTestStore((s) => s.focus);

  if (!hasNodes) {
    return <EmptyState icon={ListChecks} title="Belum ada yang diperiksa" description="Gambar alurnya dulu atau muat contoh, lalu buka lagi tab ini." />;
  }
  if (issues.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Struktur rapi" description="Semua pemeriksaan lolos. Lanjut ke tab Jalankan untuk menelusuri alurnya langkah demi langkah." />;
  }
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.length - errors;
  return (
    <div>
      <p className="px-4 pt-3 text-[11px] text-ink-400">
        {errors} error · {warnings} peringatan. Klik satu item untuk menyorotnya di canvas.
      </p>
      <ul className="space-y-1 p-2">
        {issues.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              disabled={i.nodeIds.length === 0}
              onClick={() => focus(i.nodeIds)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs enabled:hover:bg-ink-850"
            >
              <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", i.level === "error" ? "bg-rose-500/15 text-rose-300" : "bg-amber-400/15 text-amber-300")}>
                {i.level === "error" ? "Error" : "Peringatan"}
              </span>
              <span className="text-ink-200">{i.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunTab({ graph, issues }: { graph: FlowGraph; issues: FlowIssue[] }) {
  const trail = useTestStore((s) => s.trail);
  const begin = useTestStore((s) => s.begin);
  const advance = useTestStore((s) => s.advance);
  const back = useTestStore((s) => s.back);
  const restart = useTestStore((s) => s.restart);
  const setTab = useTestStore((s) => s.setTab);
  const lastRow = useRef<HTMLLIElement>(null);

  const starts = useMemo(() => startNodes(graph), [graph]);
  const last = trail[trail.length - 1];
  const current = last ? graph.byId.get(last.nodeId) : undefined;
  const options = useMemo(() => (current ? stepOptions(graph, current.id) : []), [graph, current]);

  useEffect(() => {
    lastRow.current?.scrollIntoView({ block: "nearest" });
  }, [trail.length]);

  if (graph.nodes.length === 0) {
    return <EmptyState icon={Play} title="Belum ada alur" description="Gambar flowchart atau muat contoh, lalu telusuri di sini." />;
  }
  if (starts.length === 0) {
    return (
      <EmptyState icon={Play} title="Belum ada titik Mulai" description="Penelusuran butuh simbol “Mulai / Selesai” yang punya garis keluar tetapi tanpa garis masuk.">
        <Button variant="secondary" size="sm" onClick={() => setTab("check")}>
          Lihat masalah
        </Button>
      </EmptyState>
    );
  }

  if (!current) {
    const hasErrors = issues.some((i) => i.level === "error");
    return (
      <div className="space-y-3 p-4">
        <p className="max-w-xl text-xs leading-relaxed text-ink-400">
          Telusuri rancanganmu langkah demi langkah. Di setiap Keputusan kamu memilih sendiri cabangnya. Garis putus-putus dianggap keterangan atau akses data, jadi tidak ikut ditelusuri.
        </p>
        {hasErrors && <p className="text-xs text-amber-300">Masih ada error struktur, jadi penelusuran bisa berhenti di tengah jalan. Cek tab Cek struktur.</p>}
        <div className="flex flex-wrap gap-2">
          {starts.map((s) => (
            <Button key={s.id} variant="primary" size="sm" onClick={() => begin(s.id)}>
              <Play className="size-3.5" /> {starts.length > 1 ? `Mulai dari “${nodeName(s)}”` : "Mulai uji"}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const step = trail.length;
  const atLimit = step >= MAX_TRACE_STEPS;
  const finished = options.length === 0;
  const isEnd = current.data.kind === "terminator";

  return (
    <div className="grid gap-x-4 gap-y-3 p-3 sm:grid-cols-2">
      <section aria-label="Langkah saat ini" className="min-w-0 space-y-3">
        <div className="rounded-xl border border-ember-500/50 bg-ember-500/10 p-3">
          <p className="text-[11px] font-medium text-ink-400">
            Langkah {step} · {FLOW_KIND_DEFS[current.data.kind].label}
          </p>
          <p className="mt-0.5 text-sm font-semibold break-words text-ink-100">{nodeName(current)}</p>
        </div>

        <div role="status" aria-live="polite" className="space-y-2">
          {atLimit ? (
            <p className="text-xs text-amber-300">Batas {MAX_TRACE_STEPS} langkah tercapai. Alurnya mungkin berulang tanpa akhir.</p>
          ) : finished && isEnd ? (
            <p className="text-xs text-emerald-300">Selesai di “{nodeName(current)}” setelah {step} langkah.</p>
          ) : finished ? (
            <p className="text-xs text-amber-300">Jalan buntu: tidak ada garis keluar dari “{nodeName(current)}”.</p>
          ) : options.length === 1 ? null : (
            <p className="text-xs text-ink-300">Pilih cabang berikutnya:</p>
          )}
        </div>

        {!finished && !atLimit && (
          <div className="flex flex-col gap-2">
            {options.map((o) => {
              const target = graph.byId.get(o.targetId);
              if (!target) return null;
              return (
                <Button key={o.edgeId} variant={options.length === 1 ? "primary" : "secondary"} size="sm" className="h-auto min-h-8 w-full justify-start py-1.5 text-left" onClick={() => advance(o)}>
                  {o.label && <span className="shrink-0 rounded bg-ink-950/40 px-1.5 py-0.5 text-[10px] font-semibold">{o.label}</span>}
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{nodeName(target)}</span>
                </Button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={back} disabled={step <= 1}>
            <Undo2 className="size-3.5" /> Mundur
          </Button>
          <Button variant="ghost" size="sm" onClick={restart} disabled={step <= 1}>
            <RotateCcw className="size-3.5" /> Dari awal
          </Button>
        </div>
      </section>

      <section aria-label="Riwayat langkah" className="min-w-0">
        <h3 className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-ink-400 uppercase">Riwayat</h3>
        <ol className="space-y-0.5 text-xs">
          {trail.map((t, i) => {
            const n = graph.byId.get(t.nodeId);
            if (!n) return null;
            const isLast = i === trail.length - 1;
            return (
              <li key={i} ref={isLast ? lastRow : undefined} className={cn("flex gap-2 rounded px-2 py-1", isLast ? "bg-ink-800 text-ink-100" : "text-ink-300")}>
                <span className="w-5 shrink-0 text-right font-mono text-ink-500">{i + 1}</span>
                <span className="min-w-0 break-words">
                  {t.choice && <span className="mr-1.5 rounded bg-ink-700 px-1 text-[10px] font-semibold text-ember-400">{t.choice}</span>}
                  {nodeName(n)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function TestPanelBody() {
  const tab = useTestStore((s) => s.tab);
  const setTab = useTestStore((s) => s.setTab);
  const closePanel = useTestStore((s) => s.closePanel);
  const trail = useTestStore((s) => s.trail);
  const size = useTestStore((s) => s.size);
  const setSize = useTestStore((s) => s.setSize);
  const resetTrace = useTestStore((s) => s.resetTrace);
  const nodes = useFlowchartStore((s) => s.nodes);
  const edges = useFlowchartStore((s) => s.edges);

  const graph = useMemo(() => buildGraph(nodes, edges), [nodes, edges]);
  const issues = useMemo(() => analyzeFlowchart(nodes, edges), [nodes, edges]);

  // Simbol yang sedang ditelusuri dihapus dari canvas: mulai ulang penelusuran.
  useEffect(() => {
    if (trail.some((t) => !graph.byId.has(t.nodeId))) resetTrace();
  }, [graph, trail, resetTrace]);

  const tabs: { id: TestTab; label: string }[] = [
    { id: "check", label: issues.length ? `Cek struktur (${issues.length})` : "Cek struktur" },
    { id: "run", label: "Jalankan" },
  ];

  return (
    <div className="flex h-64 flex-col max-lg:h-full">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-700 pr-2 pl-3">
        <div role="tablist" aria-label="Uji alur" className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`test-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`test-tabpanel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors max-lg:h-11 max-lg:px-2.5", tab === t.id ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-200")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {/* HP: pilihan tinggi panel */}
          <div role="group" aria-label="Tinggi panel" className="flex lg:hidden">
            {(["S", "M", "L"] as const satisfies readonly TestSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                aria-pressed={size === sz}
                aria-label={`Tinggi ${sz === "S" ? "kecil" : sz === "M" ? "sedang" : "besar"}`}
                onClick={() => setSize(sz)}
                className={cn("h-11 w-9 text-xs font-semibold transition-colors", size === sz ? "text-ember-400" : "text-ink-400 hover:text-ink-200")}
              >
                <span className={cn("inline-grid size-7 place-items-center rounded-md", size === sz && "bg-ink-800")}>{sz}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="size-8 max-lg:size-11" onClick={closePanel} aria-label="Tutup Uji alur" title="Tutup">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div role="tabpanel" id={`test-tabpanel-${tab}`} aria-labelledby={`test-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto">
        {tab === "check" ? <CheckTab issues={issues} hasNodes={graph.nodes.length > 0} /> : <RunTab graph={graph} issues={issues} />}
      </div>
    </div>
  );
}

/** Panel bawah mode Flowchart: Cek struktur (daftar masalah) dan Jalankan (telusuri alur per langkah). */
export function TestPanel() {
  const open = useTestStore((s) => s.open);
  const closePanel = useTestStore((s) => s.closePanel);
  const size = useTestStore((s) => s.size);
  const isMobile = useIsMobile();
  const vh = useViewportHeight();
  // HP: tinggi mengikuti pilihan S/M/L (maks ~40% layar). Desktop tetap 256px.
  const height = isMobile ? Math.max(168, Math.round(vh * TEST_SIZE_RATIO[size])) : 256;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          aria-label="Uji alur"
          initial={{ height: 0 }}
          animate={{ height }}
          exit={{ height: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          onKeyDown={(e) => {
            if (isMobile && e.key === "Escape") closePanel();
          }}
          className="shrink-0 overflow-hidden border-t border-ink-700 bg-ink-900 max-lg:pb-[env(safe-area-inset-bottom)]"
        >
          <TestPanelBody />
        </motion.section>
      )}
    </AnimatePresence>
  );
}
