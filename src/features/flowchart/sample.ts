import { FLOW_KIND_DEFS } from "./defs";
import { createFlowEdge } from "./edge-factory";
import {
  FLOW_NODE_TYPE,
  type EdgeShape,
  type FlowColor,
  type FlowEdge,
  type FlowKind,
  type FlowNode,
  type FlowchartDoc,
  type HandleId,
} from "./types";

export const SAMPLE_FLOWCHART_TITLE = "Contoh: Peminjaman Buku Perpustakaan (Sistem Usulan)";

interface Shape {
  color?: FlowColor;
  /** Ukuran khusus (bawaan: ukuran standar jenis simbolnya). */
  w?: number;
  h?: number;
}

function node(id: string, kind: FlowKind, text: string, x: number, y: number, o: Shape = {}): FlowNode {
  const def = FLOW_KIND_DEFS[kind];
  return {
    id,
    type: FLOW_NODE_TYPE,
    position: { x, y },
    width: o.w ?? def.width,
    height: o.h ?? def.height,
    data: { kind, text, color: o.color ?? "default" },
  };
}

interface Link {
  label?: string;
  shape?: EdgeShape;
  dashed?: boolean;
}

function edge(id: string, source: string, sh: HandleId, target: string, th: HandleId, o: Link = {}): FlowEdge {
  return createFlowEdge({
    id,
    source,
    target,
    sourceHandle: sh,
    targetHandle: th,
    ...(o.label !== undefined && { label: o.label }),
    ...(o.shape !== undefined && { shape: o.shape }),
    ...(o.dashed !== undefined && { dashed: o.dashed }),
  });
}

/**
 * Contoh yang memakai seluruh kemampuan mode Flowchart:
 * - 4 swimlane dengan tinggi berbeda (Anggota, Petugas, Sistem, Kepala Perpustakaan);
 * - ke-9 jenis simbol: Mulai/Selesai, Proses, Keputusan, Input/Output, Dokumen, Basis data, Sub-proses, Konektor, Catatan;
 * - ke-6 warna, satu simbol berukuran khusus (catatan);
 * - label garis (Ya/Tidak dan keterangan), ke-4 bentuk garis (smoothstep, step, straight, default), garis putus-putus;
 * - dua jalur gagal bertemu di Konektor "A"; jalur utama berakhir di Selesai.
 *
 * Lane (tinggi): Anggota 0–200, Petugas 200–440, Sistem 440–760, Kepala 760–960.
 */
export function sampleFlowchart(): FlowchartDoc {
  const nodes: FlowNode[] = [
    // ── Anggota ───────────────────────────────────────────────────────────
    node("n1", "terminator", "Mulai", 40, 72, { color: "green" }),
    node("n2", "io", "Ajukan peminjaman dan kartu anggota", 290, 68),
    node("n13", "io", "Terima buku dan struk", 1325, 68),
    node("n14", "terminator", "Selesai", 1570, 72, { color: "green" }),
    node("n16", "terminator", "Tidak jadi meminjam", 1017, 72, { color: "rose" }),

    // ── Petugas ───────────────────────────────────────────────────────────
    node("n19", "note", "Kebijakan: maks. 3 buku, pinjam 7 hari, denda Rp1.000/hari", 40, 214, { w: 200, h: 90 }),
    node("n3", "process", "Pindai kartu dan buku", 295, 288, { color: "blue" }),
    node("n6", "process", "Tolak dan beri tahu anggota", 565, 288, { color: "rose" }),
    node("n8", "process", "Catat ke daftar tunggu", 825, 288, { color: "violet" }),
    node("n15", "connector", "A", 1075, 298),
    node("n12", "process", "Serahkan buku dan struk", 1330, 288, { color: "green" }),

    // ── Sistem ────────────────────────────────────────────────────────────
    node("n4", "decision", "Anggota aktif dan tanpa denda?", 560, 470, { color: "amber" }),
    node("n5", "database", "Data anggota", 585, 640),
    node("n7", "decision", "Stok buku tersedia?", 820, 470, { color: "amber" }),
    node("n9", "subprocess", "Hitung tenggat dan denda", 1090, 493, { color: "blue" }),
    node("n10", "database", "Data peminjaman", 1115, 640, { color: "green" }),
    node("n11", "document", "Struk peminjaman", 1330, 487),

    // ── Kepala Perpustakaan ───────────────────────────────────────────────
    node("n17", "document", "Laporan peminjaman bulanan", 1095, 822),
    node("n18", "process", "Tinjau dan evaluasi koleksi", 1330, 828, { color: "violet" }),
    node("n20", "terminator", "Selesai", 1570, 832, { color: "green" }),
  ];

  const edges: FlowEdge[] = [
    // Jalur utama (berhasil)
    edge("e1", "n1", "r", "n2", "l"),
    edge("e2", "n2", "b", "n3", "t"),
    edge("e3", "n3", "r", "n4", "l", { shape: "step" }),
    edge("e6", "n4", "r", "n7", "l", { label: "Ya", shape: "straight" }),
    edge("e8", "n7", "r", "n9", "l", { label: "Ya", shape: "straight" }),
    edge("e10", "n9", "r", "n11", "l", { shape: "straight" }),
    edge("e11", "n11", "t", "n12", "b", { shape: "straight" }),
    edge("e12", "n12", "t", "n13", "b", { shape: "straight" }),
    edge("e13", "n13", "r", "n14", "l", { shape: "straight" }),

    // Jalur gagal: ditolak atau stok habis, bertemu di konektor A
    edge("e4", "n4", "t", "n6", "b", { label: "Tidak", shape: "straight" }),
    edge("e7", "n7", "t", "n8", "b", { label: "Tidak", shape: "straight" }),
    edge("e14", "n6", "t", "n15", "r"),
    edge("e15", "n8", "r", "n15", "l", { shape: "straight" }),
    edge("e16", "n15", "t", "n16", "b", { shape: "straight" }),

    // Akses data (garis putus-putus) dan pelaporan
    edge("e5", "n4", "b", "n5", "t", { label: "cek data", shape: "straight", dashed: true }),
    edge("e9", "n9", "b", "n10", "t", { label: "simpan", shape: "straight", dashed: true }),
    edge("e17", "n10", "b", "n17", "t", { label: "rekap bulanan", shape: "straight", dashed: true }),
    edge("e18", "n17", "r", "n18", "l", { shape: "straight" }),
    edge("e19", "n18", "r", "n20", "l", { shape: "straight" }),

    // Catatan kebijakan: garis lengkung putus-putus
    edge("e20", "n19", "r", "n3", "l", { shape: "default", dashed: true }),
  ];

  return {
    title: SAMPLE_FLOWCHART_TITLE,
    lanes: [
      { id: "lane-anggota", name: "Anggota", height: 200 },
      { id: "lane-petugas", name: "Petugas", height: 240 },
      { id: "lane-sistem", name: "Sistem", height: 320 },
      { id: "lane-kepala", name: "Kepala Perpustakaan", height: 200 },
    ],
    nodes,
    edges,
  };
}
