import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from "@xyflow/react";
import { FLOW_PALETTE } from "./colors";
import { LANE_HEADER_W, laneBands, nodeSize } from "./lanes";
import { PATH_SHAPES, TEXT_INSET } from "./shapes";
import type { FlowEdge, FlowNode, FlowchartDoc, HandleId } from "./types";

export type MeasureText = (text: string, fontSize: number) => number;
/** Perkiraan lebar teks bila canvas tidak tersedia (mis. saat tes). */
export const approxMeasure: MeasureText = (t, size) => t.length * size * 0.56;

export interface RenderOptions {
  measure?: MeasureText;
  /** Tanpa atribut width/height supaya mengikuti ukuran wadah (untuk cetak). */
  responsive?: boolean;
}
export interface RenderResult {
  svg: string;
  width: number;
  height: number;
}

const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const PAD = 48;
const TITLE_H = 44;
const INK = "#0f172a";
const LINE = "#475569";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n1 = (n: number) => Math.round(n * 10) / 10;

export function wrapText(text: string, maxWidth: number, fontSize: number, measure: MeasureText): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      let w = word;
      while (w.length > 1 && measure(w, fontSize) > maxWidth) {
        let k = w.length - 1;
        while (k > 1 && measure(w.slice(0, k), fontSize) > maxWidth) k--;
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(w.slice(0, k));
        w = w.slice(k);
      }
      const candidate = line ? `${line} ${w}` : w;
      if (line && measure(candidate, fontSize) > maxWidth) {
        out.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}

function textBlock(
  text: string,
  area: { x: number; y: number; w: number; h: number },
  fontSize: number,
  measure: MeasureText,
  opts: { anchor?: "middle" | "start"; weight?: number; fill?: string } = {},
): string {
  const lh = fontSize * 1.3;
  let lines = wrapText(text, area.w, fontSize, measure);
  const maxLines = Math.max(1, Math.floor(area.h / lh));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${(lines[maxLines - 1] ?? "").replace(/.{0,1}$/, "")}…`;
  }
  const anchor = opts.anchor ?? "middle";
  const x = anchor === "middle" ? area.x + area.w / 2 : area.x;
  const top = area.y + area.h / 2 - (lines.length * lh) / 2;
  const tspans = lines
    .map((l, i) => `<text x="${n1(x)}" y="${n1(top + (i + 0.5) * lh)}" text-anchor="${anchor}" dominant-baseline="central">${esc(l)}</text>`)
    .join("");
  return `<g font-size="${fontSize}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? INK}">${tspans}</g>`;
}

function handlePoint(n: FlowNode, h: HandleId) {
  const { w, h: hh } = nodeSize(n);
  const { x, y } = n.position;
  switch (h) {
    case "t": return { x: x + w / 2, y, pos: Position.Top };
    case "r": return { x: x + w, y: y + hh / 2, pos: Position.Right };
    case "b": return { x: x + w / 2, y: y + hh, pos: Position.Bottom };
    case "l": return { x, y: y + hh / 2, pos: Position.Left };
  }
}

function edgeGeometry(e: FlowEdge, byId: Map<string, FlowNode>): { d: string; lx: number; ly: number } | null {
  const s = byId.get(e.source);
  const t = byId.get(e.target);
  if (!s || !t) return null;
  const sp = handlePoint(s, (e.sourceHandle as HandleId) ?? "r");
  const tp = handlePoint(t, (e.targetHandle as HandleId) ?? "l");
  const base = { sourceX: sp.x, sourceY: sp.y, sourcePosition: sp.pos, targetX: tp.x, targetY: tp.y, targetPosition: tp.pos };
  const [d, lx, ly] =
    e.type === "straight"
      ? getStraightPath({ sourceX: sp.x, sourceY: sp.y, targetX: tp.x, targetY: tp.y })
      : e.type === "default"
        ? getBezierPath(base)
        : getSmoothStepPath({ ...base, borderRadius: e.type === "step" ? 0 : 8 });
  return { d, lx, ly };
}

function nodeSvg(n: FlowNode, measure: MeasureText): string {
  const { w, h } = nodeSize(n);
  const { x, y } = n.position;
  const pal = FLOW_PALETTE[n.data.color];
  const attrs = `fill="${pal.printFill}" stroke="${pal.printStroke}" stroke-width="1.6"`;
  const kind = n.data.kind;
  let shape: string;

  const path = PATH_SHAPES[kind];
  if (path) {
    const extra = (path.extra ?? [])
      .map((d) => `<path d="${d}" fill="none" stroke="${pal.printStroke}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`)
      .join("");
    shape = `<svg x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><path d="${path.d}" ${attrs} vector-effect="non-scaling-stroke"/>${extra}</svg>`;
  } else if (kind === "terminator") {
    shape = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="${n1(h / 2)}" ${attrs}/>`;
  } else if (kind === "connector") {
    shape = `<ellipse cx="${n1(x + w / 2)}" cy="${n1(y + h / 2)}" rx="${n1(w / 2)}" ry="${n1(h / 2)}" ${attrs}/>`;
  } else if (kind === "note") {
    shape = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="4" ${attrs} stroke-dasharray="5 4"/>`;
  } else {
    shape = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="6" ${attrs}/>`;
  }

  const inset = TEXT_INSET[kind];
  const area = {
    x: x + w * inset.x,
    y: y + h * inset.top,
    w: w * (1 - 2 * inset.x),
    h: h * (1 - inset.top - inset.bottom),
  };
  const text = textBlock(n.data.text, area, kind === "connector" ? 12 : 13, measure, {
    anchor: kind === "note" ? "start" : "middle",
    weight: kind === "terminator" ? 600 : 400,
  });
  return `<g>${shape}${text}</g>`;
}

export function renderFlowchartSvg(doc: FlowchartDoc, options: RenderOptions = {}): RenderResult {
  const measure = options.measure ?? approxMeasure;
  const { nodes, edges, lanes, title } = doc;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const bands = laneBands(lanes);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const s = nodeSize(n);
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + s.w);
    maxY = Math.max(maxY, n.position.y + s.h);
  }
  if (bands.length > 0) {
    const last = bands[bands.length - 1];
    const bodyRight = Math.max(maxX === -Infinity ? 0 : maxX + 60, 700);
    minX = Math.min(minX, -LANE_HEADER_W);
    minY = Math.min(minY, 0);
    maxX = bodyRight;
    maxY = Math.max(maxY, last ? last.top + last.height : 0);
  }
  const empty = !Number.isFinite(minX);
  if (empty) {
    minX = 0; minY = 0; maxX = 320; maxY = 80;
  }

  const width = Math.ceil(maxX - minX + PAD * 2);
  const height = Math.ceil(maxY - minY + PAD * 2 + TITLE_H);
  const ox = PAD - minX;
  const oy = PAD + TITLE_H - minY;
  const laneLeft = -LANE_HEADER_W;

  const laneSvg = bands
    .map((b, i) => {
      const bodyFill = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const headFill = i % 2 === 0 ? "#f1f5f9" : "#e2e8f0";
      const label = textBlock(b.name, { x: laneLeft + 8, y: b.top + 6, w: LANE_HEADER_W - 16, h: b.height - 12 }, 13, measure, { weight: 600 });
      return `<rect x="${laneLeft}" y="${b.top}" width="${n1(maxX - laneLeft)}" height="${b.height}" fill="${bodyFill}" stroke="#cbd5e1"/><rect x="${laneLeft}" y="${b.top}" width="${LANE_HEADER_W}" height="${b.height}" fill="${headFill}" stroke="#cbd5e1"/>${label}`;
    })
    .join("");

  const edgeParts = edges.flatMap((e) => {
    const g = edgeGeometry(e, byId);
    return g ? [{ e, g }] : [];
  });
  const edgeSvg = edgeParts
    .map(({ e, g }) => `<path d="${g.d}" fill="none" stroke="${LINE}" stroke-width="1.6"${e.data?.dashed ? ' stroke-dasharray="6 4"' : ""} marker-end="url(#ff-arrow)"/>`)
    .join("");
  const labelSvg = edgeParts
    .map(({ e, g }) => {
      if (typeof e.label !== "string" || !e.label) return "";
      const tw = measure(e.label, 12) + 12;
      return `<rect x="${n1(g.lx - tw / 2)}" y="${n1(g.ly - 9)}" width="${n1(tw)}" height="18" rx="4" fill="#ffffff"/><g font-size="12" fill="${INK}"><text x="${n1(g.lx)}" y="${n1(g.ly)}" text-anchor="middle" dominant-baseline="central">${esc(e.label)}</text></g>`;
    })
    .join("");

  const body = empty
    ? `<g font-size="14" fill="#64748b"><text x="0" y="40">Diagram kosong</text></g>`
    : `${laneSvg}${edgeSvg}${nodes.map((n) => nodeSvg(n, measure)).join("")}${labelSvg}`;

  const size = options.responsive ? "" : ` width="${width}" height="${height}"`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="0 0 ${width} ${height}" font-family="${FONT}">` +
    `<defs><marker id="ff-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${LINE}"/></marker></defs>` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>` +
    `<g font-size="20" font-weight="700" fill="${INK}"><text x="${PAD}" y="${PAD - 6 + TITLE_H / 2}" dominant-baseline="central">${esc(title)}</text></g>` +
    `<g transform="translate(${n1(ox)} ${n1(oy)})">${body}</g></svg>`;

  return { svg, width, height };
}
