import { useUiStore } from "@/stores/ui-store";
import { renderFlowchartSvg, type MeasureText } from "./render-svg";
import { MAX_FILE_BYTES, parseFlowchartJson, stringifyFlowchart } from "./serialize";
import { useFlowchartStore } from "./store";
import type { FlowchartDoc } from "./types";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "flowchart"
  );
}

const currentDoc = (): FlowchartDoc => {
  const { title, lanes, nodes, edges } = useFlowchartStore.getState();
  return { title, lanes, nodes, edges };
};

const notify = (kind: "success" | "error" | "info", message: string) => useUiStore.getState().notify(kind, message);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Pengukur lebar teks yang akurat lewat canvas; jatuh ke perkiraan bila tidak tersedia. */
function canvasMeasure(): MeasureText | undefined {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return undefined;
  return (text, size) => {
    ctx.font = `${size}px 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
    return ctx.measureText(text).width;
  };
}

export function exportFlowchartJson() {
  const doc = currentDoc();
  const name = `${slugify(doc.title)}.flowchart.json`;
  download(new Blob([stringifyFlowchart(doc, true)], { type: "application/json" }), name);
  notify("success", `Flowchart diekspor sebagai ${name}`);
}

export async function importFlowchartFile(file: File) {
  if (file.size > MAX_FILE_BYTES) return notify("error", "File terlalu besar (maksimum 1 MB).");
  let text: string;
  try {
    text = await file.text();
  } catch {
    return notify("error", "File tidak dapat dibaca.");
  }
  const result = parseFlowchartJson(text);
  if (!result.ok) return notify("error", `Import gagal. ${result.error}`);
  useFlowchartStore.getState().replaceDoc(result.doc, { history: true });
  useUiStore.getState().requestFit();
  notify("success", `“${result.doc.title}” diimpor (${result.doc.nodes.length} simbol). Ctrl+Z untuk membatalkan.`);
}

export async function exportFlowchartPng() {
  const measure = canvasMeasure();
  const doc = currentDoc();
  const { svg, width, height } = renderFlowchartSvg(doc, measure ? { measure } : {});
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gambar gagal dirender"));
      img.src = url;
    });
    const scale = Math.min(2, 8000 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Gagal membuat PNG");
    const name = `${slugify(doc.title)}.png`;
    download(blob, name);
    notify("success", `Diagram diekspor sebagai ${name}`);
  } catch (err) {
    notify("error", `Ekspor PNG gagal. ${err instanceof Error ? err.message : ""}`.trim());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Membuka dialog cetak browser; pilih "Simpan sebagai PDF" sebagai printer. */
export function printFlowchart() {
  const measure = canvasMeasure();
  const doc = currentDoc();
  const { svg } = renderFlowchartSvg(doc, { ...(measure && { measure }), responsive: true });
  const esc = doc.title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc}</title><style>@page{size:A4 landscape;margin:10mm}html,body{margin:0;background:#fff}svg{display:block;width:100%;height:auto;max-height:188mm}</style></head><body>${svg}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const d = iframe.contentDocument;
  if (!win || !d) {
    iframe.remove();
    return notify("error", "Tidak dapat membuka dialog cetak.");
  }
  d.open();
  d.write(html);
  d.close();
  win.addEventListener("afterprint", () => iframe.remove());
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 120_000);
  }, 250);
  notify("info", "Di dialog cetak, pilih “Simpan sebagai PDF” sebagai printer.");
}
