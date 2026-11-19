"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronUp, ListChecks, ScrollText, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useExecutionStore, type LogLevel } from "@/features/workflow/execution-store";
import { useWorkflowStore } from "@/features/workflow/store";
import { useIsMobile, useViewportHeight } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { useUiStore, type LogTab } from "@/stores/ui-store";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-ink-300",
  success: "text-emerald-300",
  warning: "text-amber-300",
  error: "text-rose-300",
};

const time = (t: number) =>
  new Date(t).toLocaleTimeString("id-ID", { hour12: false }) + "." + String(t % 1000).padStart(3, "0");

function LogList() {
  const logs = useExecutionStore((s) => s.logs);
  const selectOnly = useWorkflowStore((s) => s.selectOnly);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [logs.length]);

  if (logs.length === 0) {
    return <EmptyState icon={ScrollText} title="Belum ada eksekusi" description="Tekan Run untuk menjalankan workflow. Log setiap langkah akan muncul di sini." />;
  }
  return (
    <ol className="space-y-0.5 p-2 font-mono text-xs" aria-label="Log eksekusi">
      {logs.map((l) => (
        <li key={l.id} className="flex gap-3 rounded px-2 py-1 hover:bg-ink-850">
          <span className="shrink-0 text-ink-500">{time(l.time)}</span>
          {l.nodeId ? (
            <button type="button" onClick={() => selectOnly(l.nodeId as string)} className={cn("text-left hover:underline", LEVEL_STYLE[l.level])} title="Pilih node di canvas">
              {l.message}
            </button>
          ) : (
            <span className={LEVEL_STYLE[l.level]}>{l.message}</span>
          )}
        </li>
      ))}
      <li ref={endRef} aria-hidden />
    </ol>
  );
}

function ResultList() {
  const outputs = useExecutionStore((s) => s.outputs);
  const status = useExecutionStore((s) => s.status);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(nodeId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(nodeId);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  if (outputs.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={status === "error" ? "Tidak ada hasil" : "Belum ada hasil"}
        description={status === "error" ? "Eksekusi gagal sebelum mencapai node Output. Lihat tab Log untuk detailnya." : "Output workflow akan ditampilkan di sini setelah dijalankan."}
      />
    );
  }
  return (
    <ul className="space-y-3 p-3">
      {outputs.map((o) => {
        const text = typeof o.value === "string" ? o.value : JSON.stringify(o.value, null, 2);
        return (
          <li key={o.nodeId} className="rounded-xl border border-ink-700 bg-ink-850">
            <div className="flex items-center justify-between border-b border-ink-700 px-3 py-1.5">
              <span className="text-xs font-medium text-ink-200">{o.label}</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => void copy(o.nodeId, text)}>
                {copied === o.nodeId ? <><Check className="size-3.5" /> Tersalin</> : "Salin"}
              </Button>
            </div>
            <pre className="max-h-40 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap text-ink-100">{text}</pre>
          </li>
        );
      })}
    </ul>
  );
}

function IssueList() {
  const issues = useExecutionStore((s) => s.issues);
  const selectOnly = useWorkflowStore((s) => s.selectOnly);
  if (issues.length === 0) {
    return <EmptyState icon={ShieldCheck} title="Tidak ada masalah" description="Struktur dan konfigurasi workflow lolos validasi." />;
  }
  return (
    <ul className="space-y-1 p-2">
      {issues.map((i, idx) => (
        <li key={`${i.nodeId ?? "w"}-${idx}`}>
          <button
            type="button"
            disabled={!i.nodeId}
            onClick={() => i.nodeId && selectOnly(i.nodeId)}
            className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs enabled:hover:bg-ink-850"
          >
            <span className={cn("mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", i.level === "error" ? "bg-rose-500/15 text-rose-300" : "bg-amber-400/15 text-amber-300")}>
              {i.level === "error" ? "Error" : "Peringatan"}
            </span>
            <span className="text-ink-200">{i.message}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** HP, kondisi tertutup: satu baris ~48px dengan handle. Ketuk atau tarik ke atas untuk membuka log. */
function LogPeek() {
  const openLog = useUiStore((s) => s.openLog);
  const status = useExecutionStore((s) => s.status);
  const count = useExecutionStore((s) => s.logs.length);
  const summary = status === "running" ? "berjalan…" : count === 0 ? "belum ada" : `${count} baris`;

  return (
    <motion.button
      type="button"
      aria-expanded={false}
      onClick={() => openLog()}
      onPanEnd={(_, info) => {
        if (info.offset.y < -24) openLog();
      }}
      className="flex h-[calc(3rem+env(safe-area-inset-bottom))] w-full shrink-0 touch-none flex-col items-center border-t border-ink-700 bg-ink-900 pb-[env(safe-area-inset-bottom)] text-ink-300 hover:bg-ink-850"
    >
      <span className="mt-1.5 h-1 w-9 rounded-full bg-ink-500" aria-hidden />
      <span className="mt-auto mb-auto flex items-center gap-2 text-xs font-medium">
        Log eksekusi · {summary}
        <ChevronUp className="size-4 text-ink-400" aria-hidden />
      </span>
    </motion.button>
  );
}

export function LogPanel() {
  const { logOpen, logTab, setLogTab, toggleLog } = useUiStore();
  const status = useExecutionStore((s) => s.status);
  const durationMs = useExecutionStore((s) => s.durationMs);
  const clear = useExecutionStore((s) => s.clear);
  const resultCount = useExecutionStore((s) => s.outputs.length);
  const issueCount = useExecutionStore((s) => s.issues.length);
  const isMobile = useIsMobile();
  const vh = useViewportHeight();
  // HP: panel terbuka memakai ~40% layar. Desktop tetap 256px.
  const height = isMobile ? Math.max(200, Math.round(vh * 0.4)) : 256;

  const tabs: { id: LogTab; label: string }[] = [
    { id: "log", label: "Log" },
    { id: "result", label: resultCount ? `Hasil (${resultCount})` : "Hasil" },
    { id: "issues", label: issueCount ? `Masalah (${issueCount})` : "Masalah" },
  ];

  return (
    <>
    {isMobile && !logOpen && <LogPeek />}
    <AnimatePresence initial={false}>
      {logOpen && (
        <motion.section
          aria-label="Log dan hasil eksekusi"
          initial={{ height: 0 }}
          animate={{ height }}
          exit={{ height: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          onKeyDown={(e) => {
            if (isMobile && e.key === "Escape") toggleLog();
          }}
          className="shrink-0 overflow-hidden border-t border-ink-700 bg-ink-900 max-lg:pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex h-64 flex-col max-lg:h-full">
            {/* HP: handle untuk menarik panel ke bawah */}
            <motion.div
              onPanEnd={(_, info) => {
                if (info.offset.y > 40) toggleLog();
              }}
              className="flex h-4 shrink-0 touch-none items-end justify-center lg:hidden"
              aria-hidden
            >
              <span className="h-1 w-9 rounded-full bg-ink-500" />
            </motion.div>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink-700 pr-2 pl-3">
              <div role="tablist" aria-label="Panel eksekusi" className="flex gap-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={logTab === t.id}
                    aria-controls={`tabpanel-${t.id}`}
                    onClick={() => setLogTab(t.id)}
                    className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors max-lg:h-11 max-lg:px-2.5", logTab === t.id ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-200")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 hidden text-[11px] text-ink-500 sm:inline">
                  {status === "running" ? "Berjalan…" : durationMs !== null ? `${durationMs} ms` : ""}
                </span>
                <Button variant="ghost" size="sm" className="h-8 max-lg:h-11" onClick={clear} disabled={status === "running"} title="Bersihkan log, hasil, dan status node">
                  <Trash2 className="size-3.5" /> <span className="hidden sm:inline">Bersihkan</span>
                </Button>
                <Button variant="ghost" size="icon" className="size-8 max-lg:size-11" onClick={toggleLog} aria-label="Tutup panel log" title="Tutup">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div role="tabpanel" id={`tabpanel-${logTab}`} aria-labelledby={`tab-${logTab}`} className="min-h-0 flex-1 overflow-y-auto">
              {logTab === "log" ? <LogList /> : logTab === "result" ? <ResultList /> : <IssueList />}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
    </>
  );
}
