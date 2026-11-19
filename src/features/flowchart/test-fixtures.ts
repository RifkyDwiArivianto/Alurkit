import { FLOW_KIND_DEFS } from "./defs";
import { createFlowEdge } from "./edge-factory";
import {
  FLOW_NODE_TYPE,
  type FlowColor,
  type FlowKind,
  type FlowNode,
  type FlowchartDoc,
  type HandleId,
} from "./types";

function node(id: string, kind: FlowKind, text: string, x: number, y: number, color: FlowColor = "default"): FlowNode {
  const def = FLOW_KIND_DEFS[kind];
  return { id, type: FLOW_NODE_TYPE, position: { x, y }, width: def.width, height: def.height, data: { kind, text, color } };
}

/** Contoh kecil khusus tes: proses pemesanan dengan tiga swimlane. */
export function compactFlowchart(): FlowchartDoc {
  const e = (id: string, source: string, sh: HandleId, target: string, th: HandleId, label?: string) =>
    createFlowEdge({ id, source, target, sourceHandle: sh, targetHandle: th, ...(label !== undefined && { label }) });
  return {
    title: "Contoh: Proses Pemesanan",
    lanes: [
      { id: "lane-pelanggan", name: "Pelanggan", height: 200 },
      { id: "lane-admin", name: "Admin", height: 200 },
      { id: "lane-gudang", name: "Gudang", height: 200 },
    ],
    nodes: [
      node("n1", "terminator", "Mulai", 60, 72, "green"),
      node("n2", "io", "Isi formulir pesanan", 290, 68),
      node("n3", "process", "Verifikasi pesanan", 300, 268, "blue"),
      node("n4", "decision", "Stok tersedia?", 560, 445, "amber"),
      node("n5", "process", "Kemas dan kirim barang", 830, 468),
      node("n6", "process", "Beri tahu stok habis", 830, 268, "rose"),
      node("n7", "terminator", "Selesai", 1090, 72, "green"),
    ],
    edges: [
      e("e1", "n1", "r", "n2", "l"),
      e("e2", "n2", "b", "n3", "t"),
      e("e3", "n3", "r", "n4", "l"),
      e("e4", "n4", "r", "n5", "l", "Ya"),
      e("e5", "n4", "t", "n6", "b", "Tidak"),
      e("e6", "n5", "r", "n7", "b"),
      e("e7", "n6", "r", "n7", "l"),
    ],
  };
}
