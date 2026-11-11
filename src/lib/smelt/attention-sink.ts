// Figure 18 (attention-sink): segment-start (BOS) attention mass against depth,
// Baseline vs SMELT visit 1 / visit 2. One builder returns the SVG markup for a
// scale and a layout width; the Astro frontmatter and the browser both use it.
import data from '../../data/smelt/attention-sink.json';
import { linePath, linear } from './plot';

export type Language = 'zh' | 'en';
export type Variant = 'wide' | 'narrow';
type BasePoint = [number, number, number, number];
type LoopPoint = [number, number, number, number, number];
interface Scale {
  physicalDepth: number; executedDepth: number; visit1Window: [number, number]; visit2Window: [number, number];
  baseline: BasePoint[]; visit1: LoopPoint[]; visit2: LoopPoint[]; block: { baseline: number; visit1: number; visit2: number; change: number };
}
export const sizes = data.sizes as readonly string[];
export const defaultSize = '1.6B';
export const heads = data.heads as { size: string; layers: number[]; nHeads: number; visit1: number[][]; visit2: number[][]; lower: number };
export function scaleData(size: string): Scale {
  const found = (data.scales as unknown as Record<string, Scale>)[size];
  if (!found) throw new Error(`attention-sink: no scale ${size}`);
  return found;
}

export const copy = {
  zh: {
    view: '视图',
    views: { depth: '按深度', heads: '逐个注意力头' },
    headsMeta: '1.6B · S = 85% · 循环块 15 层 × 22 个注意力头',
    headsLower: (lower: number, total: number) => `<strong>${lower} / ${total}</strong> 个（层，头）组合在第 2 轮循环时 BOS 注意力占比更低。`,
    headsAxis: { x: '注意力头', y: '物理层' },
    headsMean: (value: string) => `均值 ${value}`,
    tipHead: (layer: number, head: number) => `第 ${layer} 层 · 头 ${head}`,
    tipHeadVisit: (visit: 1 | 2, value: string) => `第 ${visit} 轮 ${value}`,
    tipHeadDelta: (delta: string) => `第 2 轮 − 第 1 轮 ${delta}`,
    headsGrid: (visit: string, mean: string) => `${visit}：各（层，头）的 BOS 注意力占比，均值 ${mean}。可用方向键逐格浏览。`,
    headsTable: '逐个注意力头（1.6B）：第 2 轮 − 第 1 轮的 BOS 注意力占比；加粗项表示第 2 轮更高',
    headsTableCorner: '物理层 \\ 头',
    scale: '规模',
    trace: 'SMELT 前向执行顺序',
    segments: { prelude: '前序层', visit1: '第 1 轮', visit2: '第 2 轮', coda: '后序层' },
    shared: (start: number, end: number) => `同一组物理层 ${start}–${end}，循环执行 2 轮`,
    bottom: (depth: number, executed: number) => `横轴对齐模型首尾：Baseline 共 ${depth} 层，SMELT 按实际执行的 ${executed} 层展开`,
    bottomShort: (depth: number) => `Baseline（${depth} 层）· SMELT 按执行顺序`,
    axis: 'BOS 注意力占比',
    legendBase: 'Baseline',
    legendV1: 'SMELT 第 1 轮',
    legendV2: 'SMELT 第 2 轮',
    tipBase: (layer: number, depth: number) => `Baseline · 第 ${layer} 层（共 ${depth} 层）`,
    tipLoop: (visit: 1 | 2, layer: number) => `SMELT · 第 ${layer} 层（第 ${visit} 轮）`,
    tipExec: (depth: number, total: number) => `执行深度 ${depth} / ${total}`,
    tipMass: (value: string, low: string, high: string) => `BOS 注意力占比 ${value}（95% CI ${low}–${high}）`,
    tipPartner: (visit: 1 | 2, value: string, delta: string) => `第 ${visit} 轮 ${value}（第 2 轮 − 第 1 轮 ${delta}）`,
    stats: {
      block: '循环块平均 BOS 占比（第 1 轮 → 第 2 轮）',
      change: '第 2 轮相对第 1 轮变化',
      count: '第 2 轮 BOS 占比下降的循环层数',
    },
    aria: (size: string) => `${size} 模型中 BOS 注意力占比随深度的演化：Baseline 与 SMELT 两轮循环`,
    table: '查看数值',
    tableHead: { layer: '物理层', base: 'Baseline', v1: '第 1 轮', v2: '第 2 轮' },
  },
  en: {
    view: 'View',
    views: { depth: 'By depth', heads: 'Per head' },
    headsMeta: '1.6B · S = 85% · 15 repeated layers × 22 heads',
    headsLower: (lower: number, total: number) => `<strong>${lower} of ${total}</strong> (layer, head) cells put less mass on BOS on visit 2.`,
    headsAxis: { x: 'attention head', y: 'physical layer' },
    headsMean: (value: string) => `mean ${value}`,
    tipHead: (layer: number, head: number) => `Layer ${layer} · head ${head}`,
    tipHeadVisit: (visit: 1 | 2, value: string) => `Visit ${visit}: ${value}`,
    tipHeadDelta: (delta: string) => `visit 2 − visit 1 ${delta}`,
    headsGrid: (visit: string, mean: string) => `${visit}: BOS attention mass of every (layer, head), mean ${mean}. Use the arrow keys to step through cells.`,
    headsTable: 'Per head (1.6B): BOS mass on visit 2 minus visit 1; bold cells are higher on visit 2',
    headsTableCorner: 'Layer \\ head',
    scale: 'Scale',
    trace: 'SMELT execution order',
    segments: { prelude: 'prelude', visit1: 'visit 1', visit2: 'visit 2', coda: 'coda' },
    shared: (start: number, end: number) => `the same physical layers ${start}–${end}, run twice`,
    bottom: (depth: number, executed: number) => `Baseline physical layer (of ${depth}) · SMELT points placed by execution order (of ${executed})`,
    bottomShort: (_depth: number) => `Baseline layer · SMELT by execution order`,
    axis: 'BOS attention mass',
    legendBase: 'Baseline',
    legendV1: 'SMELT, visit 1',
    legendV2: 'SMELT, visit 2',
    tipBase: (layer: number, depth: number) => `Baseline · layer ${layer} of ${depth}`,
    tipLoop: (visit: 1 | 2, layer: number) => `SMELT · layer ${layer}, visit ${visit}`,
    tipExec: (depth: number, total: number) => `Execution depth ${depth} of ${total}`,
    tipMass: (value: string, low: string, high: string) => `BOS attention mass ${value} (95% CI ${low}–${high})`,
    tipPartner: (visit: 1 | 2, value: string, delta: string) => `Visit ${visit}: ${value} (visit 2 − visit 1 ${delta})`,
    stats: {
      block: 'Repeated-block mean, visit 1 → visit 2',
      change: 'Visit 2 relative to visit 1',
      count: 'Repeated layers where visit 2 is lower',
    },
    aria: (size: string) => `BOS attention mass against depth at ${size}: Baseline and SMELT's two visits`,
    table: 'Values',
    tableHead: { layer: 'Physical layer', base: 'Baseline', v1: 'Visit 1', v2: 'Visit 2' },
  },
} as const;

const geometry = {
  wide: { width: 760, height: 418, left: 58, right: 744, top: 108, bottom: 352, band: 40, bandHeight: 11, font: 13 },
  narrow: { width: 340, height: 392, left: 34, right: 332, top: 132, bottom: 324, band: 58, bandHeight: 10, font: 12.5 },
} as const;

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const f2 = (value: number) => value.toFixed(2);
const f3 = (value: number) => value.toFixed(3);
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
const n = (value: number) => value.toFixed(2);

export function summary(size: string) {
  const scale = scaleData(size);
  const lower = scale.visit1.filter((point, index) => (scale.visit2[index]?.[2] ?? Infinity) < point[2]).length;
  return { ...scale.block, lower, total: scale.visit1.length };
}

/** SVG markup (inner content) for one scale and one layout width. */
export function sinkMarkup(language: Language, size: string, variant: Variant, uid: string) {
  const text = copy[language];
  const g = geometry[variant];
  const scale = scaleData(size);
  const L = scale.physicalDepth;
  const E = scale.executedDepth;
  const x = linear([0.5, L + 0.5], [g.left, g.right]);
  const xe = (depth: number) => x(0.5 + (depth - 0.5) * L / E);
  const y = linear([0, 1], [g.bottom, g.top]);
  const out: string[] = [];
  const [v1s, v1e] = scale.visit1Window;
  const [v2s, v2e] = scale.visit2Window;
  const segments = [
    { id: 'prelude', from: 1, to: v1s - 1 },
    { id: 'visit1', from: v1s, to: v1e },
    { id: 'visit2', from: v2s, to: v2e },
    { id: 'coda', from: v2e + 1, to: E },
  ] as const;

  // Execution trace band: SMELT's forward pass laid along the same width.
  const bandY = g.band;
  const c1 = (xe(v1s - 0.5) + xe(v1e + 0.5)) / 2;
  const c2 = (xe(v2s - 0.5) + xe(v2e + 0.5)) / 2;
  const physicalStart = scale.visit1[0]?.[0] ?? v1s;
  const physicalEnd = scale.visit1.at(-1)?.[0] ?? v1e;
  out.push(`<text x="0" y="13" class="sink-trace-title">${escape(text.trace)}</text>`);
  out.push(`<path d="M${n(c1)} ${bandY - 3}C${n(c1)} ${bandY - 17} ${n(c2)} ${bandY - 17} ${n(c2)} ${bandY - 3}" class="sink-arc" />`);
  out.push(`<path d="M${n(c2 - 4)} ${bandY - 8}L${n(c2)} ${bandY - 3}L${n(c2 + 4)} ${bandY - 8}" class="sink-arc" />`);
  out.push(`<text x="${n((c1 + c2) / 2)}" y="${bandY - 17}" text-anchor="middle" class="sink-arc-label">${escape(variant === 'wide' ? text.shared(physicalStart, physicalEnd) : `${physicalStart}–${physicalEnd} ×2`)}</text>`);
  for (const segment of segments) {
    if (segment.to < segment.from) continue;
    const left = xe(segment.from - 0.5);
    const right = xe(segment.to + 0.5);
    out.push(`<rect x="${n(left + 0.5)}" y="${bandY}" width="${n(right - left - 1)}" height="${g.bandHeight}" rx="2" class="sink-band is-${segment.id}" data-segment="${segment.id}" />`);
    const range = `${segment.from}–${segment.to}`;
    const outer = segment.id === 'prelude' || segment.id === 'coda';
    const label = variant === 'wide' && outer ? `${text.segments[segment.id]} ${range}` : range;
    out.push(`<text x="${n((left + right) / 2)}" y="${bandY + g.bandHeight + 16}" text-anchor="middle" class="sink-band-label is-${segment.id}">${escape(label)}</text>`);
  }
  out.push(`<circle cx="${n(xe(0.5))}" cy="${bandY + g.bandHeight / 2}" r="4.5" class="sink-playhead" data-playhead />`);

  // Visit windows inside the plot.
  for (const [id, from, to] of [['visit1', v1s, v1e], ['visit2', v2s, v2e]] as const) {
    const left = xe(from - 0.5);
    const right = xe(to + 0.5);
    out.push(`<rect x="${n(left)}" y="${g.top - 12}" width="${n(right - left)}" height="${g.bottom - g.top + 12}" class="sink-window is-${id}" />`);
    out.push(`<text x="${n((left + right) / 2)}" y="${g.top + 4}" text-anchor="middle" class="sink-window-label">${escape(text.segments[id])}</text>`);
  }

  // Axes.
  const yTicks = variant === 'wide' ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0, 0.25, 0.5, 0.75, 1];
  for (const tick of yTicks) {
    out.push(`<line x1="${g.left - 6}" x2="${g.right}" y1="${n(y(tick))}" y2="${n(y(tick))}" class="grid" />`);
    // Phones label every other line so the tick labels fit the narrow margin.
    if (variant === 'narrow' && (tick === 0.25 || tick === 0.75)) continue;
    out.push(`<text x="${g.left - 10}" y="${n(y(tick) + 4.5)}" text-anchor="end">${tick === 0 ? '0' : variant === 'wide' ? tick.toFixed(1) : String(tick)}</text>`);
  }
  out.push(`<path d="M${g.left - 6} ${g.bottom}H${g.right}" class="axis" />`);
  const step = L <= 12 ? (variant === 'wide' ? 1 : 3) : L <= 20 ? (variant === 'wide' ? 2 : 5) : 5;
  const xTicks = [1];
  for (let layer = step; layer <= L; layer += step) if (layer !== 1) xTicks.push(layer);
  if (!xTicks.includes(L)) xTicks.push(L);
  for (const tick of xTicks) {
    if (tick !== L && tick !== 1 && L - tick < step * 0.5) continue;
    if (tick !== 1 && step > 1 && tick - 1 < step * 0.75) continue;
    out.push(`<line x1="${n(x(tick))}" x2="${n(x(tick))}" y1="${g.bottom}" y2="${g.bottom + 4}" class="axis" />`);
    out.push(`<text x="${n(x(tick))}" y="${g.bottom + 19}" text-anchor="middle" class="base-text">${tick}</text>`);
  }
  out.push(`<text x="${n((g.left + g.right) / 2)}" y="${g.bottom + 42}" text-anchor="middle" class="axis-title">${escape(variant === 'wide' ? text.bottom(L, E) : text.bottomShort(L))}</text>`);
  out.push(variant === 'wide'
    ? `<text transform="translate(15 ${n((g.top + g.bottom) / 2)}) rotate(-90)" text-anchor="middle" class="axis-title">${escape(text.axis)}</text>`
    : `<text x="0" y="${g.top - 20}" class="axis-title">${escape(text.axis)} ↑</text>`);

  // Series, revealed by a sweeping clip that follows the playhead.
  const basePoints = scale.baseline.map(point => [x(point[0]), y(point[1])] as const);
  const v1Points = scale.visit1.map(point => [xe(point[1]), y(point[2])] as const);
  const v2Points = scale.visit2.map(point => [xe(point[1]), y(point[2])] as const);
  out.push(`<clipPath id="${uid}-clip"><rect x="0" y="0" width="${g.width}" height="${g.height}" data-sweep /></clipPath>`);
  out.push(`<g clip-path="url(#${uid}-clip)">`);
  out.push(`<path d="${linePath(basePoints)}" class="base-line sink-base-line" />`);
  out.push(`<path d="${linePath(v1Points)}" class="loop-line sink-v1-line" />`);
  out.push(`<path d="${linePath(v2Points)}" class="loop-line sink-v2-line" />`);
  // Connectors between the two visits of the same physical layer (shown on hover).
  scale.visit1.forEach((point, index) => {
    const partner = scale.visit2[index];
    const a = v1Points[index];
    const b = v2Points[index];
    if (!partner || !a || !b) return;
    const lift = Math.min(a[1], b[1]) - 26;
    out.push(`<path d="M${n(a[0])} ${n(a[1])}Q${n((a[0] + b[0]) / 2)} ${n(lift)} ${n(b[0])} ${n(b[1])}" class="sink-link" data-link="${point[0]}" />`);
  });
  scale.baseline.forEach((point, index) => {
    const [px, py] = basePoints[index]!;
    const tip = [text.tipBase(point[0], L), text.tipMass(f3(point[1]), f3(point[2]), f3(point[3]))].join('\n');
    out.push(`<g class="sink-point is-base" data-series="base" data-layer-base="${point[0]}" data-x="${n(px)}" tabindex="${index === 0 ? 0 : -1}" data-tip="${escape(tip)}" role="img" aria-label="${escape(tip.replaceAll('\n', '; '))}"><circle cx="${n(px)}" cy="${n(py)}" r="9" class="hit" /><circle cx="${n(px)}" cy="${n(py)}" r="3" class="base-dot sink-mark" /></g>`);
  });
  for (const visit of [1, 2] as const) {
    const series = visit === 1 ? scale.visit1 : scale.visit2;
    const other = visit === 1 ? scale.visit2 : scale.visit1;
    const points = visit === 1 ? v1Points : v2Points;
    series.forEach((point, index) => {
      const [px, py] = points[index]!;
      const partner = other[index];
      const delta = (scale.visit2[index]?.[2] ?? 0) - (scale.visit1[index]?.[2] ?? 0);
      const tip = [text.tipLoop(visit, point[0]), text.tipExec(point[1], E), text.tipMass(f3(point[2]), f3(point[3]), f3(point[4])), partner ? text.tipPartner(visit === 1 ? 2 : 1, f3(partner[2]), signed(delta)) : ''].filter(Boolean).join('\n');
      const mark = visit === 1
        ? `<rect x="${n(px - 3.2)}" y="${n(py - 3.2)}" width="6.4" height="6.4" class="sink-mark sink-v1-mark" />`
        : `<path d="M${n(px)} ${n(py - 4.6)}L${n(px + 4.6)} ${n(py)}L${n(px)} ${n(py + 4.6)}L${n(px - 4.6)} ${n(py)}Z" class="sink-mark sink-v2-mark" />`;
      out.push(`<g class="sink-point is-v${visit}" data-series="v${visit}" data-layer="${point[0]}" data-x="${n(px)}" tabindex="${index === 0 ? 0 : -1}" data-tip="${escape(tip)}" role="img" aria-label="${escape(tip.replaceAll('\n', '; '))}"><circle cx="${n(px)}" cy="${n(py)}" r="9" class="hit" />${mark}</g>`);
    });
  }
  out.push('</g>');
  out.push(`<line x1="${n(xe(0.5))}" x2="${n(xe(0.5))}" y1="${bandY + g.bandHeight}" y2="${g.bottom}" class="sink-cursor" data-cursor />`);
  return out.join('');
}

export const viewBox = (variant: Variant) => `0 0 ${geometry[variant].width} ${geometry[variant].height}`;
export const sweepWidth = (variant: Variant) => geometry[variant].width;
/** Plot extent of a layout, for the playhead sweep. */
export const plotSpan = (variant: Variant) => [geometry[variant].left, geometry[variant].right] as const;
export { f2 };
