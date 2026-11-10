// Figure 7 (ComputeFrontier): geometry shared by the Astro render and the script.
// Two layouts, one per SVG variant, so text stays at least 12 px on phones.
import data from '../../data/smelt/compute-frontier.json';
import { allocation, ceGain, frontierLoss, type Arch, type Law } from './scaling-fit';
import { linear, linePath, log10Scale, type Point } from './plot';

export const laws = data.coefficients as Record<Arch, Law>;
export const sparsities = data.evaluationSparsity;
export const fitWindow = data.fittedWindow as [number, number];
export const xLimit = data.xlim as [number, number];
export const lossDomain = [1.55, 2.4] as const;
export const gainDomain = [-5, 30] as const;
export const lossTicks = [1.6, 1.8, 2.0, 2.2, 2.4];
export const gainTicks = [0, 10, 20, 30];
export const tableBudgets = [1e20, 1e21, 1e22];
export const logRange = [Math.log10(xLimit[0]), Math.log10(xLimit[1])] as const;

export type Variant = 'wide' | 'narrow';
export interface Layout {
  variant: Variant; width: number; height: number;
  left: number; right: number;
  mainTop: number; mainBottom: number; stripTop: number; stripBottom: number;
  xTickY: number; xTitleY: number; yTitleX: number;
  /** Narrow layout puts the two y titles above their panels instead of rotating them. */
  titlesAbove: boolean;
  lens: { x: number; y: number; w: number; h: number }; inset: boolean;
  endLabels: boolean;
}

export const layouts: Record<Variant, Layout> = {
  // The two frontiers sit ~10 mnat apart on a 0.85-nat axis, so the loss panel only
  // has to show the shape; the CE Gain strip, which carries the growing gap, gets the height.
  wide: { variant: 'wide', width: 760, height: 452, left: 66, right: 708, mainTop: 14, mainBottom: 218, stripTop: 250, stripBottom: 390, xTickY: 412, xTitleY: 442, yTitleX: 17, titlesAbove: false, lens: { x: 438, y: 18, w: 266, h: 122 }, inset: true, endLabels: true },
  narrow: { variant: 'narrow', width: 340, height: 572, left: 42, right: 304, mainTop: 30, mainBottom: 186, stripTop: 226, stripBottom: 338, xTickY: 358, xTitleY: 384, yTitleX: 2, titlesAbove: true, lens: { x: 4, y: 406, w: 332, h: 156 }, inset: false, endLabels: true },
};

export const scales = (layout: Layout) => ({
  x: log10Scale(xLimit, [layout.left, layout.right]),
  y: linear(lossDomain, [layout.mainBottom, layout.mainTop]),
  g: linear(gainDomain, [layout.stripBottom, layout.stripTop]),
});

const sampleCount = 121;
export const samples = Array.from({ length: sampleCount }, (_, index) => 10 ** (logRange[0] + (logRange[1] - logRange[0]) * index / (sampleCount - 1)));

/** Frontier losses at the shared samples. */
export const frontierSeries = (arch: Arch, sparsity: number) => samples.map(compute => frontierLoss(laws[arch], compute, sparsity));
/** CE Gain (percent) at the shared samples. */
export const gainSeries = (sparsity: number) => samples.map(compute => 100 * ceGain(laws.smelt, laws.baseline, compute, sparsity).gain);

export function seriesPath(values: readonly number[], layout: Layout, kind: 'loss' | 'gain') {
  const { x, y, g } = scales(layout);
  const vertical = kind === 'loss' ? y : g;
  return linePath(values.map((value, index): Point => [x(samples[index]!), vertical(value)]));
}

export interface Snapshot {
  compute: number; sparsity: number; loss: number; referenceCompute: number; gain: number;
  /** Baseline frontier loss minus SMELT's at the same budget C (nats; positive: SMELT lower). */
  lossGap: number;
  allocation: Record<Arch, ReturnType<typeof allocation>>;
  extrapolated: boolean;
  table?: { point: number; ci95: number[]; probPositive: number };
}

export function snapshot(compute: number, sparsity: number): Snapshot {
  const result = ceGain(laws.smelt, laws.baseline, compute, sparsity);
  const key = String(sparsity) as keyof typeof data.ceGain;
  const table = data.ceGain[key]?.find(cell => Math.abs(Math.log10(cell.C / compute)) < 1e-6);
  return {
    compute, sparsity, loss: result.loss, referenceCompute: result.referenceCompute, gain: result.gain,
    lossGap: frontierLoss(laws.baseline, compute, sparsity) - result.loss,
    allocation: { baseline: allocation(laws.baseline, compute, sparsity), smelt: allocation(laws.smelt, compute, sparsity) },
    extrapolated: compute < fitWindow[0] * 0.999 || compute > fitWindow[1] * 1.001,
    table: table ? { point: table.point, ci95: table.ci95, probPositive: table.probPositive } : undefined,
  };
}

export const tableCells = (sparsity: number) => data.ceGain[String(sparsity) as keyof typeof data.ceGain] ?? [];

/** Everything that moves with the budget: markers, zoom box, connectors and the lens. */
export function markerGeometry(state: Snapshot, layout: Layout) {
  const { x, y, g } = scales(layout);
  const { compute, referenceCompute, loss, sparsity } = state;
  // Lens window: a fixed 0.17-decade span centred on the arrow, so the arrow's
  // length inside the lens still grows with CE Gain.
  const half = 0.085;
  const centre = (Math.log10(compute) + Math.log10(referenceCompute)) / 2;
  const lx: [number, number] = [10 ** (centre - half), 10 ** (centre + half)];
  const ends = [frontierLoss(laws.baseline, lx[0], sparsity), frontierLoss(laws.smelt, lx[0], sparsity), frontierLoss(laws.baseline, lx[1], sparsity), frontierLoss(laws.smelt, lx[1], sparsity)];
  const low = Math.min(...ends);
  const high = Math.max(...ends);
  const range = high - low || 1e-3;
  const ly: [number, number] = [low - range * 0.12, high + range * 0.1];
  const lens = layout.lens;
  const innerTop = lens.y + 30;
  const innerBottom = lens.y + lens.h - 26;
  const lxScale = log10Scale(lx, [lens.x + 10, lens.x + lens.w - 10]);
  const lyScale = linear(ly, [innerBottom, innerTop]);
  const lensSamples = Array.from({ length: 13 }, (_, index) => 10 ** (Math.log10(lx[0]) + (Math.log10(lx[1]) - Math.log10(lx[0])) * index / 12));
  const lensPath = (arch: Arch) => linePath(lensSamples.map((value): Point => [lxScale(value), lyScale(frontierLoss(laws[arch], value, sparsity))]));
  // Marks stay inside the plot: the zoom box is clamped to it, and when the Baseline's
  // budget falls past an axis end its dot gives way to an arrowhead on that edge.
  const clampX = (value: number) => Math.min(layout.right, Math.max(layout.left, value));
  const box = { x0: clampX(x(lx[0])), x1: clampX(x(lx[1])), y0: y(ly[1]), y1: y(ly[0]) };
  const baseX = x(referenceCompute);
  const outside = baseX > layout.right + 0.5 ? 1 : baseX < layout.left - 0.5 ? -1 : 0;
  // The arrowhead sits just outside the axis end, pointing on (the SMELT dot may sit on the edge itself).
  const edgeX = outside > 0 ? layout.right + 8 : layout.left - 8;
  const edge = outside ? `M${(edgeX - outside * 6).toFixed(2)} ${(y(loss) - 3.6).toFixed(2)}L${edgeX.toFixed(2)} ${y(loss).toFixed(2)}L${(edgeX - outside * 6).toFixed(2)} ${(y(loss) + 3.6).toFixed(2)}Z` : '';
  return {
    scrubX: x(compute),
    smelt: [x(compute), y(loss)] as Point,
    base: [clampX(baseX), y(loss)] as Point,
    baseVisible: !outside,
    edge,
    gainPoint: [x(compute), g(Math.max(gainDomain[0], Math.min(gainDomain[1], 100 * state.gain)))] as Point,
    box,
    connectors: layout.inset ? [[box.x0, box.y0, lens.x, lens.y + lens.h], [box.x1, box.y0, lens.x + lens.w, lens.y + lens.h]] as const : [],
    lens: {
      base: lensPath('baseline'), smelt: lensPath('smelt'),
      arrowY: lyScale(loss), arrowX0: lxScale(compute), arrowX1: lxScale(referenceCompute),
      /** Vertical reading of the same gap: the Baseline's loss at SMELT's budget. */
      gapY: lyScale(loss + state.lossGap),
      labelY: lens.y + 21, valueY: lens.y + lens.h - 9,
    },
  };
}

export function whiskers(sparsity: number, layout: Layout) {
  const { x, g } = scales(layout);
  return tableCells(sparsity).map(cell => {
    const [low, high] = cell.ci95 as [number, number];
    return {
      cell, x: x(cell.C), y: g(cell.point),
      y0: g(Math.max(gainDomain[0], low)), y1: g(Math.min(gainDomain[1], high)),
      clipped: high > gainDomain[1],
    };
  });
}

export const minorTicks = (() => {
  const values: number[] = [];
  for (let exponent = Math.round(logRange[0]); exponent < Math.round(logRange[1]); exponent++) for (let multiple = 2; multiple < 10; multiple++) values.push(multiple * 10 ** exponent);
  return values;
})();

/** Spread end labels so they keep a minimum vertical gap, preserving order. */
export function spreadLabels(positions: readonly number[], gap: number, low: number, high: number) {
  const order = positions.map((value, index) => ({ value, index })).sort((first, second) => first.value - second.value);
  const placed = order.map(entry => entry.value);
  for (let index = 1; index < placed.length; index++) placed[index] = Math.max(placed[index]!, placed[index - 1]! + gap);
  const overflow = placed.length ? placed[placed.length - 1]! - high : 0;
  if (overflow > 0) for (let index = 0; index < placed.length; index++) placed[index] = placed[index]! - overflow;
  if (placed.length && placed[0]! < low) { const shift = low - placed[0]!; for (let index = 0; index < placed.length; index++) placed[index] = placed[index]! + shift; }
  const result = new Array<number>(positions.length);
  order.forEach((entry, rank) => { result[entry.index] = placed[rank]!; });
  return result;
}

/** Arrowheads and end ticks of the dimension line inside the lens. */
export function dimensionPath(x0: number, x1: number, y: number) {
  const direction = Math.sign(x1 - x0) || 1;
  const length = Math.abs(x1 - x0);
  const head = length > 16 ? 6 : 0;
  const ticks = `M${x0.toFixed(2)} ${(y - 6).toFixed(2)}V${(y + 6).toFixed(2)}M${x1.toFixed(2)} ${(y - 6).toFixed(2)}V${(y + 6).toFixed(2)}`;
  const heads = head ? `M${(x0 + direction * head).toFixed(2)} ${(y - 3.2).toFixed(2)}L${x0.toFixed(2)} ${y.toFixed(2)}L${(x0 + direction * head).toFixed(2)} ${(y + 3.2).toFixed(2)}ZM${(x1 - direction * head).toFixed(2)} ${(y - 3.2).toFixed(2)}L${x1.toFixed(2)} ${y.toFixed(2)}L${(x1 - direction * head).toFixed(2)} ${(y + 3.2).toFixed(2)}Z` : '';
  return { line: `M${x0.toFixed(2)} ${y.toFixed(2)}H${x1.toFixed(2)}`, ticks, heads };
}

export const formatGain = (gain: number) => `${gain < 0 ? '−' : ''}${Math.abs(100 * gain).toFixed(1)}%`;
export const formatSparsity = (sparsity: number) => `${Math.round(sparsity * 100)}%`;

/** Vertical dimension inside the lens: SMELT's dot up (or down) to the Baseline frontier. */
export function gapDimension(x: number, y0: number, y1: number) {
  if (Math.abs(y1 - y0) < 7) return '';
  return `M${x.toFixed(2)} ${y0.toFixed(2)}V${y1.toFixed(2)}M${(x - 3.5).toFixed(2)} ${y1.toFixed(2)}h7`;
}

/** Where the lens texts go: CE Gain left, the vertical gap right. The inset lens (wide)
 *  drops the "Zoom" tag, since the box and connectors already say it. */
export function lensText(layout: Layout) {
  const { x, w } = layout.lens;
  return { tag: !layout.inset, gainX: layout.inset ? x + 12 : x + 54, gapX: x + w - 12 };
}
