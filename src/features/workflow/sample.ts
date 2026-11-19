import { createEdge } from "./edge-factory";
import type { ConfigByKind } from "./schemas";
import type { LoadedWorkflow } from "./serialize";
import { WORKFLOW_NODE_TYPE, type NodeKind, type WorkflowEdge, type WorkflowNode, type WorkflowNodeData } from "./types";

export const SAMPLE_WORKFLOW_NAME = "Contoh: Pemrosesan Pesanan (4 jalur)";

const COL = 288; // lebar node 208 + jarak 80
const BAND = 260; // jarak vertikal antar jalur
const x = (col: number) => col * COL;

/**
 * Posisi baris: `main` sejajar dengan tengah node Condition, `yes`/`no` adalah baris cabang di atas/bawahnya.
 * y0 = tepi atas node Condition pada jalur tersebut.
 */
const row = {
  main: (y0: number) => y0 + 29,
  yes: (y0: number) => y0 - 34,
  no: (y0: number) => y0 + 92,
};

function make<K extends NodeKind>(id: string, kind: K, label: string, config: ConfigByKind[K], px: number, py: number): WorkflowNode {
  return {
    id,
    type: WORKFLOW_NODE_TYPE,
    position: { x: px, y: py },
    data: { kind, label, config } as WorkflowNodeData,
  };
}

const INPUT = {
  pelanggan: "  budi santoso  ",
  item: "Jus Alpukat",
  harga: 18000,
  jumlah: 3,
  ongkir: 5000,
  member: true,
  kode_promo: "HEMAT10",
  poin_lama: "120",
  catatan: ["tanpa gula", "es sedikit"],
};

/**
 * Contoh yang memakai seluruh kemampuan mode Workflow:
 * - semua 6 jenis node, dengan satu Start yang bercabang ke 4 jalur paralel (fan-out);
 * - ke-11 operasi Transform (trim, uppercase, lowercase, concat, multiply, subtract, add, divide, toNumber, length, toString);
 * - ke-4 tipe Set Value (string, number, boolean, json) dan pengisian `{{kunci}}`;
 * - Condition dengan cabang Ya/Tidak (eq, gte, gt, contains) yang bertemu lagi di satu node;
 * - Delay, serta beberapa Output (satu kunci, dan seluruh data).
 */
export function sampleWorkflow(): LoadedWorkflow {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const add = (n: WorkflowNode) => nodes.push(n);
  const link = (id: string, source: string, target: string, handle?: "true" | "false") =>
    edges.push(createEdge({ id, source, target, sourceHandle: handle ?? null }));

  // ── Jalur 1: rapikan data pelanggan ───────────────────────────────────────
  const y1 = 0;
  add(make("transform-trim", "transform", "Rapikan nama", { operation: "trim", sourceKey: "pelanggan", targetKey: "pelanggan", operand: "" }, x(1), row.main(y1)));
  add(make("transform-upper", "transform", "Huruf kapital nama", { operation: "uppercase", sourceKey: "pelanggan", targetKey: "nama_tampil", operand: "" }, x(2), row.main(y1)));
  add(make("transform-lower", "transform", "Samakan kode promo", { operation: "lowercase", sourceKey: "kode_promo", targetKey: "kode_promo", operand: "" }, x(3), row.main(y1)));
  add(make("condition-member", "condition", "Pelanggan member?", { key: "member", operator: "eq", value: "true" }, x(4), y1));
  add(make("transform-member", "transform", "Tandai: member", { operation: "concat", sourceKey: "nama_tampil", targetKey: "nama_tampil", operand: " (MEMBER)" }, x(5), row.yes(y1)));
  add(make("transform-umum", "transform", "Tandai: umum", { operation: "concat", sourceKey: "nama_tampil", targetKey: "nama_tampil", operand: " (UMUM)" }, x(5), row.no(y1)));
  add(make("output-nama", "output", "Hasil: nama tampil", { key: "nama_tampil" }, x(6), row.main(y1)));

  // ── Jalur 2: hitung harga ────────────────────────────────────────────────
  const y2 = BAND;
  add(make("transform-subtotal", "transform", "Hitung subtotal", { operation: "multiply", sourceKey: "harga", targetKey: "subtotal", operand: "{{jumlah}}" }, x(1), row.main(y2)));
  add(make("condition-belanja", "condition", "Belanja ≥ Rp50.000?", { key: "subtotal", operator: "gte", value: "50000" }, x(2), y2));
  add(make("setvalue-potongan", "setValue", "Beri potongan", { key: "diskon", valueType: "number", value: "5000" }, x(3), row.yes(y2)));
  add(make("setvalue-tanpa", "setValue", "Tanpa potongan", { key: "diskon", valueType: "number", value: "0" }, x(3), row.no(y2)));
  add(make("transform-kurang", "transform", "Kurangi potongan", { operation: "subtract", sourceKey: "subtotal", targetKey: "total_bayar", operand: "{{diskon}}" }, x(4), row.main(y2)));
  add(make("transform-ongkir", "transform", "Tambah ongkir", { operation: "add", sourceKey: "total_bayar", targetKey: "total_bayar", operand: "{{ongkir}}" }, x(5), row.main(y2)));
  add(make("transform-rupiah", "transform", "Tulis satuan rupiah", { operation: "concat", sourceKey: "total_bayar", targetKey: "total_teks", operand: " rupiah" }, x(6), row.main(y2)));
  add(make("output-total", "output", "Hasil: total bayar", { key: "total_teks" }, x(7), row.main(y2)));

  // ── Jalur 3: poin loyalitas ──────────────────────────────────────────────
  const y3 = BAND * 2;
  add(make("transform-poin-angka", "transform", "Poin ke angka", { operation: "toNumber", sourceKey: "poin_lama", targetKey: "poin_lama", operand: "" }, x(1), row.main(y3)));
  add(make("transform-kredit", "transform", "Konversi poin ke kredit", { operation: "divide", sourceKey: "poin_lama", targetKey: "kredit_poin", operand: "10" }, x(2), row.main(y3)));
  add(make("condition-kredit", "condition", "Kredit di atas 10?", { key: "kredit_poin", operator: "gt", value: "10" }, x(3), y3));
  add(make("setvalue-bonus", "setValue", "Dapat bonus", { key: "dapat_bonus", valueType: "boolean", value: "true" }, x(4), row.yes(y3)));
  add(make("setvalue-nobonus", "setValue", "Tidak ada bonus", { key: "dapat_bonus", valueType: "boolean", value: "false" }, x(4), row.no(y3)));
  add(make("output-bonus", "output", "Hasil: bonus", { key: "dapat_bonus" }, x(5), row.main(y3)));

  // ── Jalur 4: dapur dan ringkasan ─────────────────────────────────────────
  const y4 = BAND * 3;
  add(make("transform-hitung-catatan", "transform", "Hitung jumlah catatan", { operation: "length", sourceKey: "catatan", targetKey: "jumlah_catatan", operand: "" }, x(1), row.main(y4)));
  add(make("transform-catatan-teks", "transform", "Catatan ke teks", { operation: "toString", sourceKey: "jumlah_catatan", targetKey: "catatan_teks", operand: "" }, x(2), row.main(y4)));
  add(make("condition-gula", "condition", "Ada catatan tanpa gula?", { key: "catatan", operator: "contains", value: "tanpa gula" }, x(3), y4));
  add(make("setvalue-rendah", "setValue", "Prioritas rendah", { key: "dapur", valueType: "json", value: '{"prioritas":"rendah","alert":"tanpa gula"}' }, x(4), row.yes(y4)));
  add(make("setvalue-normal", "setValue", "Prioritas normal", { key: "dapur", valueType: "json", value: '{"prioritas":"normal","alert":"-"}' }, x(4), row.no(y4)));
  add(make("delay-siapkan", "delay", "Siapkan pesanan", { ms: 800 }, x(5), row.main(y4)));
  add(make("setvalue-ringkasan", "setValue", "Susun ringkasan", { key: "ringkasan", valueType: "string", value: "Pesanan {{item}} x{{jumlah}} dengan {{catatan_teks}} catatan khusus." }, x(6), row.main(y4)));
  add(make("output-ringkasan", "output", "Hasil: ringkasan", { key: "ringkasan" }, x(7), row.yes(y4)));
  add(make("output-semua", "output", "Hasil: seluruh data", { key: "" }, x(7), row.no(y4)));

  // ── Start: satu titik awal, empat jalur paralel ──────────────────────────
  const startY = Math.round((row.main(y1) + row.main(y4)) / 2 / 16) * 16;
  add(make("start-pesanan", "start", "Pesanan masuk", { inputJson: JSON.stringify(INPUT, null, 2) }, 0, startY));

  // Koneksi (urutan menentukan urutan jalur dijalankan)
  link("e-s-1", "start-pesanan", "transform-trim");
  link("e-s-2", "start-pesanan", "transform-subtotal");
  link("e-s-3", "start-pesanan", "transform-poin-angka");
  link("e-s-4", "start-pesanan", "transform-hitung-catatan");

  link("e-1a", "transform-trim", "transform-upper");
  link("e-1b", "transform-upper", "transform-lower");
  link("e-1c", "transform-lower", "condition-member");
  link("e-1d", "condition-member", "transform-member", "true");
  link("e-1e", "condition-member", "transform-umum", "false");
  link("e-1f", "transform-member", "output-nama");
  link("e-1g", "transform-umum", "output-nama");

  link("e-2a", "transform-subtotal", "condition-belanja");
  link("e-2b", "condition-belanja", "setvalue-potongan", "true");
  link("e-2c", "condition-belanja", "setvalue-tanpa", "false");
  link("e-2d", "setvalue-potongan", "transform-kurang");
  link("e-2e", "setvalue-tanpa", "transform-kurang");
  link("e-2f", "transform-kurang", "transform-ongkir");
  link("e-2g", "transform-ongkir", "transform-rupiah");
  link("e-2h", "transform-rupiah", "output-total");

  link("e-3a", "transform-poin-angka", "transform-kredit");
  link("e-3b", "transform-kredit", "condition-kredit");
  link("e-3c", "condition-kredit", "setvalue-bonus", "true");
  link("e-3d", "condition-kredit", "setvalue-nobonus", "false");
  link("e-3e", "setvalue-bonus", "output-bonus");
  link("e-3f", "setvalue-nobonus", "output-bonus");

  link("e-4a", "transform-hitung-catatan", "transform-catatan-teks");
  link("e-4b", "transform-catatan-teks", "condition-gula");
  link("e-4c", "condition-gula", "setvalue-rendah", "true");
  link("e-4d", "condition-gula", "setvalue-normal", "false");
  link("e-4e", "setvalue-rendah", "delay-siapkan");
  link("e-4f", "setvalue-normal", "delay-siapkan");
  link("e-4g", "delay-siapkan", "setvalue-ringkasan");
  link("e-4h", "setvalue-ringkasan", "output-ringkasan");
  link("e-4i", "setvalue-ringkasan", "output-semua");

  return { name: SAMPLE_WORKFLOW_NAME, nodes, edges };
}
