import { describe, expect, it } from "vitest";
import { renderFlowchartSvg, wrapText, approxMeasure } from "./render-svg";
import { compactFlowchart as sampleFlowchart } from "./test-fixtures";
import { DEFAULT_TITLE } from "./store";

describe("wrapText", () => {
  const m = (t: string) => t.length * 10;
  it("membungkus pada spasi dan menghormati baris baru", () => {
    expect(wrapText("satu dua tiga", 80, 10, m)).toEqual(["satu dua", "tiga"]);
    expect(wrapText("a\nb", 80, 10, m)).toEqual(["a", "b"]);
  });
  it("memecah kata yang lebih lebar dari area dan selalu berakhir", () => {
    const lines = wrapText("supercalifragilistic", 50, 10, m);
    expect(lines.every((l) => l.length <= 5)).toBe(true);
    expect(lines.join("")).toBe("supercalifragilistic");
    expect(wrapText("abc", 0, 10, m).join("")).toBe("abc");
  });
});

describe("renderFlowchartSvg", () => {
  const doc = sampleFlowchart();
  const { svg, width, height } = renderFlowchartSvg(doc);

  it("menghasilkan SVG berukuran dan berjudul", () => {
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain(`width="${width}" height="${height}"`);
    expect(svg).toContain("Contoh: Proses Pemesanan");
  });
  it("memuat semua lane, teks simbol, dan label garis", () => {
    // teks panjang dibungkus per baris, jadi "Stok tersedia?" muncul sebagai dua elemen teks
    for (const t of ["Pelanggan", "Admin", "Gudang", "Mulai", "Stok", "tersedia?", "Ya", "Tidak"]) expect(svg).toContain(t);
  });
  it("menggambar satu path berpanah per garis", () => {
    expect(svg.match(/marker-end="url\(#ff-arrow\)"/g)).toHaveLength(doc.edges.length);
  });
  it("mode responsif tidak menyertakan width/height", () => {
    const r = renderFlowchartSvg(doc, { responsive: true });
    expect(r.svg.split(">")[0]).not.toContain("width=");
  });
  it("meng-escape karakter khusus pada teks dan judul", () => {
    const d = sampleFlowchart();
    d.title = 'A <b> & "C"';
    d.nodes[1] = { ...d.nodes[1]!, data: { ...d.nodes[1]!.data, text: "x < y & z" } };
    const out = renderFlowchartSvg(d, { measure: approxMeasure }).svg;
    expect(out).toContain("A &lt;b&gt; &amp; &quot;C&quot;");
    expect(out).toContain("x &lt; y &amp; z");
    expect(out).not.toContain("<b>");
  });
  it("diagram kosong tetap valid", () => {
    const r = renderFlowchartSvg({ title: DEFAULT_TITLE, lanes: [], nodes: [], edges: [] });
    expect(r.svg).toContain("Diagram kosong");
    expect(r.width).toBeGreaterThan(0);
  });
  it("hanya lane tanpa simbol tetap memuat jalur", () => {
    const r = renderFlowchartSvg({ title: "T", lanes: [{ id: "l", name: "Peran", height: 200 }], nodes: [], edges: [] });
    expect(r.svg).toContain("Peran");
  });
});
