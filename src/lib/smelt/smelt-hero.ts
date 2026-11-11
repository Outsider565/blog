// Geometry for the opening animation: a standard Transformer next to a Looped
// Transformer with the same 12 physical layers, the middle half run twice.
// Used at build time (static final frame) and in the browser (pulse timing).
import hero from '../../data/smelt/smelt-hero.json';

export const physicalLayers = hero.physicalLayers;
export const loopFrom = hero.loopedSpan[0]!;
export const loopTo = hero.loopedSpan[1]!;
export const visits = hero.visits;
export const executedLayers = hero.executedLayers;
export const layerIndices = Array.from({ length: physicalLayers }, (_, index) => index + 1);
export const isLooped = (layer: number) => layer >= loopFrom && layer <= loopTo;

export type RowKind = 'standard' | 'looped';
export interface HeroRow { kind: RowKind; titleY: number; slabTop: number; slabH: number; railY: number; dotY: readonly number[]; arcTop?: number }
export interface HeroLayout {
  id: 'wide' | 'narrow';
  width: number;
  height: number;
  x0: number;
  slabW: number;
  pitch: number;
  inX: number;
  outX: number;
  radius: number;
  numberSize: number;
  rows: readonly [HeroRow, HeroRow];
}

export const wideLayout: HeroLayout = {
  id: 'wide', width: 760, height: 254, x0: 62, slabW: 32, pitch: 41, inX: 30, outX: 578, radius: 9, numberSize: 12.5,
  rows: [
    { kind: 'standard', titleY: 17, slabTop: 34, slabH: 44, railY: 56, dotY: [94] },
    { kind: 'looped', titleY: 129, slabTop: 168, slabH: 44, railY: 190, dotY: [228, 243], arcTop: 151 },
  ],
};

export const narrowLayout: HeroLayout = {
  // Slabs 18.5 wide so the two-digit labels 10–12 keep ≈ 2 units of clearance.
  id: 'narrow', width: 340, height: 226, x0: 47, slabW: 18.5, pitch: 23, inX: 31, outX: 325, radius: 7, numberSize: 12.5,
  rows: [
    { kind: 'standard', titleY: 15, slabTop: 28, slabH: 34, railY: 45, dotY: [74] },
    { kind: 'looped', titleY: 117, slabTop: 150, slabH: 34, railY: 167, dotY: [196, 209], arcTop: 133 },
  ],
};

export const slabLeft = (layout: HeroLayout, layer: number) => layout.x0 + (layer - 1) * layout.pitch;
export const slabCenter = (layout: HeroLayout, layer: number) => slabLeft(layout, layer) + layout.slabW / 2;
/** x of the gap midpoint after the looped span (return starts) and before it (return lands). */
export const loopRight = (layout: HeroLayout) => slabLeft(layout, loopTo) + layout.slabW + (layout.pitch - layout.slabW) / 2;
export const loopLeft = (layout: HeroLayout) => slabLeft(layout, loopFrom) - (layout.pitch - layout.slabW) / 2;

/** The drawn return path: up out of the span, back over it, and down into its first layer. */
export function arcPath(layout: HeroLayout, row: HeroRow, end = row.railY) {
  const top = row.arcTop ?? row.slabTop - 16;
  const r = layout.radius;
  const right = loopRight(layout);
  const left = loopLeft(layout);
  return `M${right} ${row.railY}V${top + r}A${r} ${r} 0 0 0 ${right - r} ${top}H${left + r}A${r} ${r} 0 0 0 ${left} ${top + r}V${end}`;
}

/** Lengths where the pulse's legs end: one leg for the standard row; forward, return and
 *  forward again for the looped row. */
export function legs(layout: HeroLayout, row: HeroRow): number[] {
  const { inX, outX, radius } = layout;
  if (row.kind === 'standard') return [outX - inX];
  const top = row.arcTop ?? row.slabTop - 16;
  const right = loopRight(layout);
  const left = loopLeft(layout);
  const arc = 2 * (row.railY - top - radius) + Math.PI * radius + (right - left - 2 * radius);
  const forward = right - inX;
  return [forward, forward + arc, forward + arc + (outX - left)];
}

/** Position of the pulse after travelling `distance` along its route (analytic, so it also
 *  works for a layout that is not currently displayed). */
export function pointAt(layout: HeroLayout, row: HeroRow, distance: number): [number, number] {
  const ends = legs(layout, row);
  const y0 = row.railY;
  if (row.kind === 'standard' || distance <= ends[0]!) return [layout.inX + Math.min(distance, ends.at(-1)!), y0];
  const top = row.arcTop ?? row.slabTop - 16;
  const r = layout.radius;
  const right = loopRight(layout);
  const left = loopLeft(layout);
  const rise = y0 - top - r;
  const span = right - left - 2 * r;
  const quarter = Math.PI * r / 2;
  let d = distance - ends[0]!;
  if (distance >= ends[1]!) return [Math.min(left + (distance - ends[1]!), layout.outX), y0];
  if (d <= rise) return [right, y0 - d];
  d -= rise;
  if (d <= quarter) { const a = d / r; return [right - r + r * Math.cos(a), top + r - r * Math.sin(a)]; }
  d -= quarter;
  if (d <= span) return [right - r - d, top];
  d -= span;
  if (d <= quarter) { const a = d / r; return [left + r - r * Math.sin(a), top + r - r * Math.cos(a)]; }
  d -= quarter;
  return [left, top + r + d];
}

export interface VisitEvent { layer: number; visit: number; at: number }
/** When the pulse reaches each layer centre, in units of one layer pitch of travel. The return
 *  leg takes `returnPitches` of time however long it is drawn. */
export function visitEvents(layout: HeroLayout, kind: RowKind, returnPitches: number): VisitEvent[] {
  const pitches = (x: number, from: number) => (x - from) / layout.pitch;
  const events: VisitEvent[] = [];
  if (kind === 'standard') {
    for (const layer of layerIndices) events.push({ layer, visit: 1, at: pitches(slabCenter(layout, layer), layout.inX) });
    return events;
  }
  const firstLeg = pitches(loopRight(layout), layout.inX);
  for (const layer of layerIndices) if (layer <= loopTo) events.push({ layer, visit: 1, at: pitches(slabCenter(layout, layer), layout.inX) });
  const resume = firstLeg + returnPitches;
  for (const layer of layerIndices) if (layer >= loopFrom) events.push({ layer, visit: isLooped(layer) ? 2 : 1, at: resume + pitches(slabCenter(layout, layer), loopLeft(layout)) });
  return events;
}

export const copy = {
  zh: {
    standard: '标准 Transformer', standardNote: '每层顺序执行 1 轮',
    looped: 'Looped Transformer', loopedNote: '中间 50% 层循环执行 2 轮',
    unique: ['物理层数'], executed: ['执行层数'], uniqueShort: '物理', executedShort: '执行',
    visit1: '第 1 轮', visit2: '第 2 轮', input: '输入', output: '输出', twice: '×2',
    caption: '同为 12 层物理参数：Looped Transformer 将第 4–9 层循环执行 2 轮，等效执行深度达 18 层。',
    replay: '重播', replayLabel: '重播动画',
    aria: '动画示意：标准 Transformer 的 12 层各执行 1 轮；Looped Transformer 同样只有 12 层物理参数，但将中间第 4–9 层循环执行 2 轮，共执行 18 层。',
  },
  en: {
    standard: 'Standard Transformer', standardNote: 'each layer runs once',
    looped: 'Looped Transformer', loopedNote: 'the middle 50% runs twice',
    unique: ['Unique', 'layers'], executed: ['Executed', 'layers'], uniqueShort: 'unique', executedShort: 'executed',
    visit1: 'visit 1', visit2: 'visit 2', input: 'Input', output: 'Output', twice: '×2',
    caption: 'Same 12 layers of parameters: the Looped Transformer runs layers 4–9 a second time and executes 18 layers.',
    replay: 'Replay', replayLabel: 'Replay the animation',
    aria: 'Animation: a standard Transformer runs each of its 12 layers once. A Looped Transformer has the same 12 layers of parameters but runs the middle layers 4–9 twice, executing 18 layers.',
  },
} as const;
