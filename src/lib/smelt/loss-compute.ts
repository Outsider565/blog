// Figure 5 (loss-compute): validation loss against cumulative training FLOPs for
// the 16 matched Baseline / SMELT cells, plus each cell's training curves.
// Layout and markup run at build time (static SVG) and in the browser (live
// re-layout at the container's real width, tweened state changes).
import raw from '../../data/smelt/loss-compute.json';
import type { Language } from '../site';
import { decadeTicks, linear, log10Scale, type Scale } from './plot';

export interface Arch { compute: number[]; loss: number[]; S: number; params: number; active: number; experts: number; H: number; L: number }
/** decay[k]: training loss at evenly spaced tokens over span[k] (billions); the first value is the stable line at the
 *  fork, the last the real logged end. edge: the first and last forks, [token, loss], where the stable line starts and ends. */
interface Train { stable: number[]; edge: [[number, number], [number, number]]; decay: number[][]; span: [number, number][] }
/** A source branch that overruns its matched branch end; it is clipped at `clip` (billions of tokens). */
export interface TrainNote { branch: number; arch: 'base' | 'loop'; from: number; to: number; clip: number; points: number }
export interface Cell {
  scale: string; es: number; base: Arch; loop: Arch; fRatio: number; kvRatio: number; horizonTokens: number[];
  /** delta.decay[k]: SMELT − Baseline training loss at evenly spaced shared tokens over the overlap of the two spans. */
  /** delta.edge: SMELT − Baseline stable lines at the first and last forks, where the strip's stable line starts and ends. */
  train: { base: Train; loop: Train; delta: { decay: number[][]; edge: [[number, number], [number, number]] }; notes?: TrainNote[] };
}
interface Data {
  cells: Cell[]; scales: string[]; branchSteps: number[];
  sparsity: { es: number; label: string; approx: boolean }[];
  grid: { start: number; step: number; n: number };
}
export const data = raw as unknown as Data;
export const cells = data.cells;
export const SCALES = data.scales;
export const SPARSITY = data.sparsity;
export const HORIZONS = 6;
/** Cells are stored scale-major: index = scale * 4 + sparsity. */
export const cellIndex = (scale: number, sparsity: number) => scale * 4 + sparsity;
export const scaleOf = (index: number) => Math.floor(index / 4);
export const sparsityOf = (index: number) => index % 4;
export const DEFAULT_CELL = cellIndex(3, 3); // 1.6B, S ≈ 97%: the 54B flagship
export const cellAt = (index: number) => cells[index] ?? cells[0]!;

export const deltas = (cell: Cell) => cell.loop.loss.map((value, k) => value - (cell.base.loss[k] ?? value));
export const finalLower = cells.filter(cell => (cell.loop.loss.at(-1) ?? 0) < (cell.base.loss.at(-1) ?? 0)).length;
export const pairsLower = cells.reduce((sum, cell) => sum + deltas(cell).filter(value => value < 0).length, 0);
export const largestParams = Math.max(...cells.map(cell => Math.max(cell.base.params, cell.loop.params)));

// ---------------------------------------------------------------- formatting
const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const power = (exponent: number) => `10${String(exponent).split('').map(character => sup[character] ?? character).join('')}`;
export function flops(value: number) {
  const exponent = Math.floor(Math.log10(value));
  return `${(value / 10 ** exponent).toFixed(2)}×${power(exponent)}`;
}
export const minus = (text: string) => text.replace('-', '−');
/** Screen coordinates are written with one decimal: plenty at 1 unit ≈ 1 CSS px, and a third smaller markup. */
export const f1 = (value: number) => (Math.abs(value) < 0.05 ? 0 : value).toFixed(1);
export const signedFixed = (value: number, digits = 4) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(digits)}`;
export const signedPercent = (value: number, digits = 1) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value * 100).toFixed(digits)}%`;
export const sparsityLabel = (index: number) => { const level = SPARSITY[index]!; return `S ${level.approx ? '≈' : '='} ${level.label}`; };
const params = (value: number) => `${value.toFixed(2)}B`;
const noteFor = (cell: Cell, k: number) => (cell.train.notes ?? []).filter(note => note.branch === k);
const groupDigits = (value: number) => value.toLocaleString('en-US');

export const copy = {
  zh: {
    chart: '验证损失与累计训练计算量：16 个匹配配置中的基线与 SMELT',
    sparsity: '稀疏度', all: '全部', scale: '规模', pick: '选择要查看训练曲线的模型', pickScale: '训练曲线的模型规模', pickSparsity: '训练曲线的稀疏度 S',
    xTitle: '累计训练计算量（FLOPs，对数轴）', xShort: '训练计算量（FLOPs）',
    yLoss: '验证损失', yDelta: '差值', deltaNote: 'SMELT − 基线', lowerZone: 'SMELT 更低',
    zoneZoom: 'Δ < 0：SMELT 更低',
    narrowKey: '上：验证损失 · 下：Δ = SMELT − 基线', insetKey: '上：训练损失 · 下：Δ = SMELT − 基线',
    base: '基线', loop: 'SMELT', legendBase: '基线', legendLoop: 'SMELT',
    staticNote: '空心点与虚线为基线，实心点与实线为 SMELT；大点为最长训练预算。',
    keys: '方向键切换数据点，回车载入训练曲线。',
    statFinal: '个配置中，SMELT 在最长训练预算下的验证损失更低',
    statPairs: '组匹配训练时长中 SMELT 更低',
    statParams: '最大总参数量（不含 embedding；1.6B 规模，S ≈ 97%）',
    horizon: (k: number, tokens: number) => `训练时长 ${k}/6（≈${Math.round(tokens)}B token）`,
    S: 'S', total: '总参数', vs: ' / ',
    insetTitle: (scale: string, s: string) => `训练曲线｜${scale}，${s}`,
    insetMeta: (cell: Cell) => `总参数 ${params(cell.base.params)} / ${params(cell.loop.params)} · SMELT 每 token 计算量为基线的 ${cell.fRatio.toFixed(3)} 倍`,
    yTrain: '训练损失', xTokens: '训练 token 数', stable: '稳定阶段', decay: '衰减分支终点',
    insetLabel: '所选配置的训练损失曲线与差值',
    readout: (cell: Cell) => {
      const b = cell.base.loss.at(-1)!; const l = cell.loop.loss.at(-1)!;
      const lower = deltas(cell).filter(value => value < 0).length;
      return `<strong>${cell.scale}，${sparsityLabel(SPARSITY.findIndex(level => level.es === cell.es))}</strong>：最长训练预算下验证损失 基线 ${b.toFixed(4)} → SMELT ${l.toFixed(4)}（${signedFixed(l - b)}，${signedPercent((l - b) / b)}）；6 个训练时长中 ${lower} 个 SMELT 更低。`;
    },
    tableSummary: '查看 16 个配置的数据',
    table: ['规模', '稀疏度 S（基线 / SMELT）', '总参数（基线 / SMELT）', '基线', 'SMELT', '差值', 'SMELT 更低'],
    tableNote: '损失为最长训练预算终点的验证损失；参数量不含 embedding。',
    pairTip: (cell: Cell, k: number) => {
      const b = cell.base.loss[k]!; const l = cell.loop.loss[k]!;
      const s = SPARSITY.findIndex(level => level.es === cell.es);
      const extra = (cell.loop.compute[k]! / cell.base.compute[k]! - 1);
      return [
        `${cell.scale} · ${sparsityLabel(s)} · 训练时长 ${k + 1}/6（≈${Math.round(cell.horizonTokens[k]!)}B token）`,
        `基线　${b.toFixed(4)} · ${flops(cell.base.compute[k]!)} FLOPs`,
        `SMELT ${l.toFixed(4)} · ${flops(cell.loop.compute[k]!)} FLOPs（${signedPercent(extra)}）`,
        `差值 ${signedFixed(l - b)}（${signedPercent((l - b) / b, 2)}）`,
        `稀疏度 S：基线 ${cell.base.S.toFixed(1)}% · SMELT ${cell.loop.S.toFixed(1)}%`,
        `总参数：基线 ${params(cell.base.params)} · SMELT ${params(cell.loop.params)}`,
      ].join('\n');
    },
    stableTip: (tokens: number, b: number, l: number) => [`≈${Math.round(tokens)}B token · ${'稳定阶段'}`, `基线 ${b.toFixed(4)}`, `SMELT ${l.toFixed(4)}`, `差值 ${signedFixed(l - b)}`].join('\n'),
    decayTip: (cell: Cell, k: number) => {
      const bt = cell.train.base.decay[k]!.at(-1)!; const lt = cell.train.loop.decay[k]!.at(-1)!;
      return [
        `衰减分支 ${k + 1}：第 ${groupDigits(data.branchSteps[k]!)} 步分叉，终点 ${cell.horizonTokens[k]!.toFixed(1)}B token`,
        `训练损失：基线 ${bt.toFixed(4)} · SMELT ${lt.toFixed(4)}（${signedFixed(lt - bt)}）`,
        `验证损失：基线 ${cell.base.loss[k]!.toFixed(4)} · SMELT ${cell.loop.loss[k]!.toFixed(4)}（${signedFixed(cell.loop.loss[k]! - cell.base.loss[k]!)}）`,
        ...noteFor(cell, k).map(note => `原始数据中这条${note.arch === 'loop' ? ' SMELT ' : '基线'}分支记录于 ${note.from.toFixed(1)}–${note.to.toFixed(1)}B token（${note.points} 个点，晚于分叉点），此处截至 ${note.clip.toFixed(1)}B，起点按日志绘制`),
      ].join('\n');
    },
  },
  en: {
    chart: 'Validation loss against cumulative training FLOPs: Baseline and SMELT in 16 matched cells',
    sparsity: 'Sparsity', all: 'All', scale: 'Scale', pick: 'Choose the model whose training curves to show', pickScale: 'Training-curve scale', pickSparsity: 'Training-curve sparsity S',
    xTitle: 'Cumulative training FLOPs (log scale)', xShort: 'Training FLOPs',
    yLoss: 'Validation loss', yDelta: 'Δ loss', deltaNote: 'SMELT − Baseline', lowerZone: 'SMELT lower',
    zoneZoom: 'Δ < 0: SMELT lower',
    narrowKey: 'Upper: loss · lower: Δ = SMELT − Baseline', insetKey: 'Upper: train loss · lower: SMELT − Baseline',
    base: 'Baseline', loop: 'SMELT', legendBase: 'Baseline', legendLoop: 'SMELT',
    staticNote: 'Hollow dots and dashed lines are Baseline, filled dots and solid lines SMELT; large dots mark the final horizon.',
    keys: 'Arrow keys move between points; Enter loads the training curves.',
    statFinal: 'cells where SMELT ends with lower validation loss',
    statPairs: 'matched horizons where SMELT is lower',
    statParams: 'largest total parameters, excluding embeddings (1.6B scale, S ≈ 97%)',
    horizon: (k: number, tokens: number) => `horizon ${k} of 6 (≈${Math.round(tokens)}B tokens)`,
    S: 'S', total: 'Total params', vs: ' / ',
    insetTitle: (scale: string, s: string) => `Training curves | ${scale}, ${s}`,
    insetMeta: (cell: Cell) => `Total params ${params(cell.base.params)} / ${params(cell.loop.params)} · SMELT uses ${cell.fRatio.toFixed(3)}× Baseline FLOPs per token`,
    yTrain: 'Training loss', xTokens: 'Training tokens', stable: 'stable phase', decay: 'decay-branch end',
    insetLabel: 'Training-loss curves and their difference for the selected cell',
    readout: (cell: Cell) => {
      const b = cell.base.loss.at(-1)!; const l = cell.loop.loss.at(-1)!;
      const lower = deltas(cell).filter(value => value < 0).length;
      return `<strong>${cell.scale}, ${sparsityLabel(SPARSITY.findIndex(level => level.es === cell.es))}</strong>: final-horizon validation loss Baseline ${b.toFixed(4)} → SMELT ${l.toFixed(4)} (${signedFixed(l - b)}, ${signedPercent((l - b) / b)}); SMELT is lower at ${lower} of 6 horizons.`;
    },
    tableSummary: 'Data for the 16 cells',
    table: ['Scale', 'S (Baseline / SMELT)', 'Total params (Baseline / SMELT)', 'Baseline', 'SMELT', 'Δ', 'SMELT lower'],
    tableNote: 'Losses are validation losses at the final horizon; parameter counts exclude embeddings.',
    pairTip: (cell: Cell, k: number) => {
      const b = cell.base.loss[k]!; const l = cell.loop.loss[k]!;
      const s = SPARSITY.findIndex(level => level.es === cell.es);
      const extra = (cell.loop.compute[k]! / cell.base.compute[k]! - 1);
      return [
        `${cell.scale} · ${sparsityLabel(s)} · horizon ${k + 1} of 6 (≈${Math.round(cell.horizonTokens[k]!)}B tokens)`,
        `Baseline ${b.toFixed(4)} · ${flops(cell.base.compute[k]!)} FLOPs`,
        `SMELT ${l.toFixed(4)} · ${flops(cell.loop.compute[k]!)} FLOPs (${signedPercent(extra)})`,
        `Δ ${signedFixed(l - b)} nats (${signedPercent((l - b) / b, 2)})`,
        `S: Baseline ${cell.base.S.toFixed(1)}% · SMELT ${cell.loop.S.toFixed(1)}%`,
        `Total params: Baseline ${params(cell.base.params)} · SMELT ${params(cell.loop.params)}`,
      ].join('\n');
    },
    stableTip: (tokens: number, b: number, l: number) => [`≈${Math.round(tokens)}B tokens · stable phase`, `Baseline ${b.toFixed(4)}`, `SMELT ${l.toFixed(4)}`, `Δ ${signedFixed(l - b)}`].join('\n'),
    decayTip: (cell: Cell, k: number) => {
      const bt = cell.train.base.decay[k]!.at(-1)!; const lt = cell.train.loop.decay[k]!.at(-1)!;
      return [
        `Decay branch ${k + 1}: forked at step ${groupDigits(data.branchSteps[k]!)}, ends at ${cell.horizonTokens[k]!.toFixed(1)}B tokens`,
        `Training loss: Baseline ${bt.toFixed(4)} · SMELT ${lt.toFixed(4)} (${signedFixed(lt - bt)})`,
        `Validation loss: Baseline ${cell.base.loss[k]!.toFixed(4)} · SMELT ${cell.loop.loss[k]!.toFixed(4)} (${signedFixed(cell.loop.loss[k]! - cell.base.loss[k]!)})`,
        ...noteFor(cell, k).map(note => `The source logs this ${note.arch === 'loop' ? 'SMELT' : 'Baseline'} branch at ${note.from.toFixed(1)}–${note.to.toFixed(1)}B tokens (${note.points} points, starting after its fork); shown from its first log up to ${note.clip.toFixed(1)}B`),
      ].join('\n');
    },
  },
} as const;
export type Copy = (typeof copy)[Language];

// ---------------------------------------------------------------- main chart layout
/** 'all' shows the four sparsity panels; '0'…'3' zooms into one. */
export type Mode = 'all' | '0' | '1' | '2' | '3';
export interface Panel {
  s: number; x0: number; x1: number; titleY: number; lossTop: number; lossBottom: number;
  dTop: number; dBottom: number; tickY: number; showY: boolean;
  x: Scale; y: Scale; d: Scale; yTicks: number[]; yStep: number; dTicks: number[]; dStep: number;
}
export interface MainLayout { width: number; height: number; narrow: boolean; mode: Mode; padL: number; xTitleY: number; panels: Panel[]; r: number }

const allCompute = cells.flatMap(cell => [...cell.base.compute, ...cell.loop.compute]);
const X_DOMAIN: [number, number] = [Math.min(...allCompute) / 10 ** 0.08, Math.max(...allCompute) * 10 ** 0.08];
function lossRange(sparsity: number | null) {
  const values = cells.filter((_, index) => sparsity === null || sparsityOf(index) === sparsity).flatMap(cell => [...cell.base.loss, ...cell.loop.loss]);
  const low = Math.min(...values); const high = Math.max(...values); const pad = (high - low) * 0.07;
  // Extra headroom when zoomed: the 100M series starts in the top-left corner, under the panel title.
  return [low - pad, high + pad * (sparsity === null ? 1 : 2.2)] as [number, number];
}
function deltaRange(sparsity: number | null) {
  const values = cells.filter((_, index) => sparsity === null || sparsityOf(index) === sparsity).flatMap(deltas);
  const low = Math.min(0, ...values); const high = Math.max(0, ...values); const pad = (high - low) * 0.16;
  return [low - pad, high + pad] as [number, number];
}
const stepOf = (values: number[]) => values.length > 1 ? values[1]! - values[0]! : 1;
/** Ticks on 1 / 2 / 5 × 10^k steps (no 2.5 steps, so one decimal never rounds a tick). */
function ticks(min: number, max: number, count: number) {
  const raw = (max - min) / Math.max(1, count);
  const power10 = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(factor => factor * power10).find(candidate => candidate >= raw * 0.999) ?? raw;
  const values: number[] = [];
  for (let value = Math.ceil(min / step - 1e-9) * step; value <= max + step * 1e-9; value += step) values.push(Number(value.toPrecision(12)));
  return values;
}
function tickLabel(value: number, step: number) {
  const decimals = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  return value.toFixed(decimals);
}

export function mainLayout(width: number, mode: Mode): MainLayout {
  const narrow = width < 560;
  const padL = narrow ? 46 : 58;
  const padR = 10; // room for the selected-cell ring on the right-most final point
  const columns = narrow ? 2 : 4;
  const gapX = narrow ? 14 : 16;
  const titleH = 26;
  const lossH = narrow ? 124 : 190;
  const dGap = 10;
  const dH = narrow ? 52 : 76;
  const tickH = 20;
  const rowGap = narrow ? 14 : 0;
  const rows = 4 / columns;
  const blockH = titleH + lossH + dGap + dH + tickH;
  const footer = narrow ? 44 : 30;
  const height = rows * blockH + (rows - 1) * rowGap + footer;
  const xTitleY = narrow ? height - 26 : height - 8;
  const panels: Panel[] = [];
  const build = (s: number, x0: number, x1: number, top: number, bottom: number, zoom: boolean, showY: boolean): Panel => {
    const dHeight = zoom ? (narrow ? 96 : 92) : dH;
    const lossTop = top + titleH;
    const tickY = bottom - 6;
    const dBottom = bottom - tickH;
    const dTop = dBottom - dHeight;
    const lossBottom = dTop - dGap;
    const [y0, y1] = lossRange(zoom ? s : null);
    const [d0, d1] = deltaRange(zoom ? s : null);
    const edge = (y1 - y0) * 0.05;
    const yTicks = ticks(y0, y1, 5).filter(value => value > y0 + edge && value < y1 - edge);
    const dTicks = ticks(d0, d1, zoom ? 3 : (narrow ? 2 : 3)).filter(value => value >= d0 && value <= d1);
    return {
      s, x0, x1, titleY: top + 16, lossTop, lossBottom, dTop, dBottom, tickY, showY,
      x: log10Scale(X_DOMAIN, [x0, x1]), y: linear([y0, y1], [lossBottom, lossTop]), d: linear([d0, d1], [dBottom, dTop]),
      yTicks, yStep: stepOf(yTicks), dTicks, dStep: stepOf(dTicks),
    };
  };
  if (mode === 'all') {
    const panelW = (width - padL - padR - (columns - 1) * gapX) / columns;
    for (let s = 0; s < 4; s++) {
      const column = s % columns; const row = Math.floor(s / columns);
      const x0 = padL + column * (panelW + gapX);
      const top = row * (blockH + rowGap);
      panels.push(build(s, x0, x0 + panelW, top, top + blockH, false, column === 0));
    }
  } else {
    panels.push(build(Number(mode), padL, width - padR, 0, height - footer, true, true));
  }
  return { width, height, narrow, mode, padL, xTitleY, panels, r: mode === 'all' ? (narrow ? 2.7 : 3.3) : (narrow ? 3.6 : 4.4) };
}

export const panelFor = (layout: MainLayout, sparsity: number) => layout.panels.find(panel => panel.s === sparsity);

/** Screen coordinates of one cell: 6 Baseline points, 6 SMELT points, 6 delta points (flat x,y arrays). */
export interface CellCoords { base: number[]; loop: number[]; delta: number[] }
export function cellCoords(layout: MainLayout, index: number): CellCoords | null {
  const cell = cellAt(index);
  const panel = panelFor(layout, sparsityOf(index));
  if (!panel) return null;
  const base: number[] = []; const loop: number[] = []; const delta: number[] = [];
  for (let k = 0; k < HORIZONS; k++) {
    const cb = cell.base.compute[k]!; const cl = cell.loop.compute[k]!;
    base.push(panel.x(cb), panel.y(cell.base.loss[k]!));
    loop.push(panel.x(cl), panel.y(cell.loop.loss[k]!));
    delta.push(panel.x(Math.sqrt(cb * cl)), panel.d(cell.loop.loss[k]! - cell.base.loss[k]!));
  }
  return { base, loop, delta };
}

/** Polyline through a flat x,y array. */
export const pathFromFlat = (flat: readonly number[]) => {
  let path = '';
  for (let index = 0; index + 1 < flat.length; index += 2) path += `${index ? 'L' : 'M'}${f1(flat[index]!)} ${f1(flat[index + 1]!)}`;
  return path;
};

/** The final horizon (k = 5) is drawn larger: it is the point the "16 / 16" headline counts. */
export const FINAL = HORIZONS - 1;
export const FINAL_BONUS = 1.2;
export const dotRadius = (r: number, k: number) => r + (k === FINAL ? FINAL_BONUS : 0);
export const deltaRadius = (r: number, k: number) => Math.max(2.2, r - 0.6) + (k === FINAL ? FINAL_BONUS : 0);

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** First corner of the delta strip's "SMELT lower" zone that no delta mark or line crosses. */
function zoneLabelSpot(layout: MainLayout, panel: Panel, label: string) {
  const width = [...label].reduce((sum, character) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(character) ? 12 : 6.6), 0);
  const zero = panel.d(0);
  const points: [number, number][] = [];
  for (let index = 0; index < cells.length; index++) {
    if (sparsityOf(index) !== panel.s) continue;
    const coords = cellCoords(layout, index)!;
    for (let k = 0; k < HORIZONS; k++) {
      points.push([coords.delta[2 * k]!, coords.delta[2 * k + 1]!]);
      // Sample the segment to the next point too, so labels never sit on a line.
      if (k < HORIZONS - 1) for (const t of [0.25, 0.5, 0.75]) points.push([coords.delta[2 * k]! + (coords.delta[2 * k + 2]! - coords.delta[2 * k]!) * t, coords.delta[2 * k + 1]! + (coords.delta[2 * k + 3]! - coords.delta[2 * k + 1]!) * t]);
    }
  }
  const candidates = [
    { x: panel.x1 - 6, y: panel.dBottom - 6, anchor: 'end' as const },
    { x: panel.x0 + 6, y: panel.dBottom - 6, anchor: 'start' as const },
    { x: panel.x1 - 6, y: zero + 15, anchor: 'end' as const },
    { x: panel.x0 + 6, y: zero + 15, anchor: 'start' as const },
  ];
  return candidates.find(spot => {
    const left = spot.anchor === 'end' ? spot.x - width : spot.x;
    const box = { x0: left - 5, x1: left + width + 5, y0: spot.y - 14, y1: spot.y + 5 };
    if (box.y0 < zero) return false;
    return !points.some(([x, y]) => x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1);
  });
}

/** Grid, ticks, titles and the delta zero line for every panel in the layout. */
export function mainAxesMarkup(layout: MainLayout, language: Language): string {
  const text = copy[language];
  const parts: string[] = [];
  const decades = decadeTicks(X_DOMAIN[0], X_DOMAIN[1]);
  for (const panel of layout.panels) {
    const zero = panel.d(0);
    parts.push(`<rect class="lc-zone" x="${panel.x0}" y="${zero.toFixed(1)}" width="${(panel.x1 - panel.x0).toFixed(1)}" height="${(panel.dBottom - zero).toFixed(1)}"/>`);
    for (const value of panel.yTicks) parts.push(`<line class="grid" x1="${panel.x0}" x2="${panel.x1.toFixed(1)}" y1="${panel.y(value).toFixed(1)}" y2="${panel.y(value).toFixed(1)}"/>`);
    for (const value of panel.dTicks) if (Math.abs(value) > 1e-9) parts.push(`<line class="grid" x1="${panel.x0}" x2="${panel.x1.toFixed(1)}" y1="${panel.d(value).toFixed(1)}" y2="${panel.d(value).toFixed(1)}"/>`);
    for (const value of decades) {
      const x = panel.x(value).toFixed(1);
      parts.push(`<line class="grid lc-vgrid" x1="${x}" x2="${x}" y1="${panel.lossTop}" y2="${panel.lossBottom}"/><line class="grid lc-vgrid" x1="${x}" x2="${x}" y1="${panel.dTop}" y2="${panel.dBottom}"/>`);
      parts.push(`<text class="lc-tick" x="${x}" y="${panel.tickY}" text-anchor="middle">${power(Math.round(Math.log10(value)))}</text>`);
    }
    parts.push(`<path class="axis" d="M${panel.x0} ${panel.lossBottom}H${panel.x1.toFixed(1)}"/>`);
    parts.push(`<line class="lc-zero" x1="${panel.x0}" x2="${panel.x1.toFixed(1)}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}"/>`);
    const title = sparsityLabel(panel.s);
    parts.push(`<text class="lc-panel-title" x="${panel.x0}" y="${panel.titleY}">${esc(title)}</text>`);
    if (panel.showY) {
      for (const value of panel.yTicks) parts.push(`<text class="lc-tick" x="${panel.x0 - 7}" y="${(panel.y(value) + 4.5).toFixed(1)}" text-anchor="end">${tickLabel(value, panel.yStep)}</text>`);
      for (const value of panel.dTicks) parts.push(`<text class="lc-tick" x="${panel.x0 - 7}" y="${(panel.d(value) + 4.5).toFixed(1)}" text-anchor="end">${Math.abs(value) < 1e-9 ? '0' : minus(tickLabel(value, panel.dStep))}</text>`);
    }
    if (panel.showY && !layout.narrow) {
      const lossMid = (panel.lossTop + panel.lossBottom) / 2; const dMid = (panel.dTop + panel.dBottom) / 2;
      parts.push(`<text class="axis-title" transform="translate(13 ${lossMid.toFixed(1)}) rotate(-90)" text-anchor="middle">${esc(text.yLoss)}</text>`);
      parts.push(`<text class="axis-title" transform="translate(13 ${dMid.toFixed(1)}) rotate(-90)" text-anchor="middle">Δ</text>`);
    }
    if (panel.s === layout.panels[0]!.s) {
      const label = layout.mode === 'all' ? text.lowerZone : text.zoneZoom;
      const spot = zoneLabelSpot(layout, panel, label);
      if (spot) parts.push(`<text class="lc-zone-label" x="${spot.x.toFixed(1)}" y="${spot.y.toFixed(1)}" text-anchor="${spot.anchor}">${esc(label)}</text>`);
    }
  }
  if (layout.narrow) {
    const first = layout.panels[0]!; const last = layout.panels.at(-1)!;
    parts.push(`<text class="axis-title" x="${((first.x0 + last.x1) / 2).toFixed(1)}" y="${layout.xTitleY}" text-anchor="middle">${esc(text.xShort)}</text>`);
    parts.push(`<text class="lc-tick" x="${((first.x0 + last.x1) / 2).toFixed(1)}" y="${layout.xTitleY + 20}" text-anchor="middle">${esc(text.narrowKey)}</text>`);
  } else {
    const first = layout.panels[0]!; const last = layout.panels.at(-1)!;
    parts.push(`<text class="axis-title" x="${((first.x0 + last.x1) / 2).toFixed(1)}" y="${layout.xTitleY}" text-anchor="middle">${esc(text.xTitle)}</text>`);
  }
  return parts.join('');
}

/** Data marks for all 16 cells. Cells outside the layout's panels start hidden. */
export function mainMarksMarkup(layout: MainLayout, selected: number): string {
  const parts: string[] = [];
  const counterpart = (index: number) => layout.mode === 'all' ? index : cellIndex(scaleOf(index), Number(layout.mode));
  const losses: string[] = []; const deltaParts: string[] = [];
  // Draw the larger scales first so the 100M series (shortest, top-left) sits on top.
  for (const index of [...cells.keys()].sort((a, b) => scaleOf(b) - scaleOf(a))) {
    const visible = !!panelFor(layout, sparsityOf(index));
    const coords = cellCoords(layout, visible ? index : counterpart(index))!;
    const classes = `lc-cell lc-s${scaleOf(index)}${visible ? '' : ' is-hidden'}${index === selected ? ' is-selected' : ''}`;
    const dots = (flat: number[], kind: string, radius: (r: number, k: number) => number) => Array.from({ length: HORIZONS }, (_, k) => `<circle class="lc-dot-${kind}${k === FINAL ? ' is-final' : ''}" cx="${f1(flat[2 * k]!)}" cy="${f1(flat[2 * k + 1]!)}" r="${radius(layout.r, k).toFixed(2)}"/>`).join('');
    losses.push(`<g class="${classes}" data-cell="${index}"><path class="lc-line-base" d="${pathFromFlat(coords.base)}"/><path class="lc-line-loop" d="${pathFromFlat(coords.loop)}"/>${dots(coords.base, 'base', dotRadius)}${dots(coords.loop, 'loop', dotRadius)}</g>`);
    deltaParts.push(`<g class="${classes}" data-cell="${index}"><path class="lc-line-delta" d="${pathFromFlat(coords.delta)}"/>${dots(coords.delta, 'delta', deltaRadius)}</g>`);
  }
  parts.push(`<g class="lc-loss-marks">${losses.join('')}</g><g class="lc-delta-marks">${deltaParts.join('')}</g>`);
  return parts.join('');
}

/** Approximate advance of 12.5px semibold sans text (digits ≈ 7.1, '.' ≈ 3.4, capitals ≈ 8.6). */
const labelWidth = (text: string) => [...text].reduce((sum, character) => sum + (character === '.' ? 3.4 : /[0-9]/.test(character) ? 7.1 : 8.6), 0);
interface Box { x0: number; x1: number; y0: number; y1: number }
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/** Scale labels in the zoomed single-panel view. Each label tries a few spots
 *  around its series (below-left, left and above-left of the first point,
 *  beside the last SMELT point) and takes the first whose box clears every
 *  visible mark and line and the labels already placed. */
export function mainLabelsMarkup(layout: MainLayout): string {
  if (layout.mode === 'all') return '';
  const s = Number(layout.mode);
  const panel = panelFor(layout, s);
  if (!panel) return '';
  const series = SCALES.map((_, scale) => cellCoords(layout, cellIndex(scale, s))!);
  // Every mark plus samples along every segment (about every 5 units), so a label never sits on a line.
  const cloud: [number, number][] = [];
  for (const coords of series) for (const flat of [coords.base, coords.loop]) {
    for (let k = 0; k < HORIZONS; k++) {
      const x = flat[2 * k]!; const y = flat[2 * k + 1]!;
      cloud.push([x, y]);
      if (k === HORIZONS - 1) continue;
      const nx = flat[2 * k + 2]!; const ny = flat[2 * k + 3]!;
      const steps = Math.ceil(Math.hypot(nx - x, ny - y) / 5);
      for (let i = 1; i < steps; i++) cloud.push([x + (nx - x) * i / steps, y + (ny - y) * i / steps]);
    }
  }
  const r = layout.r + FINAL_BONUS;
  const pad = layout.r + 0.8;
  const placed: Box[] = [];
  const parts: string[] = [];
  SCALES.forEach((name, scale) => {
    const coords = series[scale]!;
    const width = labelWidth(name);
    const fx = Math.min(coords.base[0]!, coords.loop[0]!);
    const yTop = Math.min(coords.base[1]!, coords.loop[1]!);
    const yLow = Math.max(coords.base[1]!, coords.loop[1]!);
    const lx = coords.loop[2 * FINAL]!; const ly = coords.loop[2 * FINAL + 1]!;
    const candidates: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }[] = [
      { x: fx - 7, y: yLow + 17, anchor: 'end' },
      { x: fx - r - 6, y: (yTop + yLow) / 2 + 4.5, anchor: 'end' },
      { x: fx - 7, y: yTop - 9, anchor: 'end' },
      { x: fx + r + 6, y: yTop - 8, anchor: 'start' },
      { x: lx + r + 6, y: ly + 4.5, anchor: 'start' },
      { x: lx, y: ly + r + 15, anchor: 'middle' },
      { x: lx - r - 6, y: ly + 17, anchor: 'end' },
    ];
    const boxOf = (spot: (typeof candidates)[number]): Box => {
      const left = spot.anchor === 'end' ? spot.x - width : spot.anchor === 'middle' ? spot.x - width / 2 : spot.x;
      return { x0: left - 2, x1: left + width + 2, y0: spot.y - 10.5, y1: spot.y + 3 };
    };
    const conflicts = (box: Box) => {
      if (box.x0 < panel.x0 + 1 || box.x1 > layout.width - 1 || box.y0 < panel.lossTop - 2 || box.y1 > panel.lossBottom - 1) return Infinity;
      let count = cloud.filter(([x, y]) => x > box.x0 - pad && x < box.x1 + pad && y > box.y0 - pad && y < box.y1 + pad).length;
      count += placed.filter(other => overlaps(box, other)).length * 100;
      return count;
    };
    let best = candidates[0]!; let bestCount = Infinity;
    for (const spot of candidates) {
      const count = conflicts(boxOf(spot));
      if (count < bestCount) { best = spot; bestCount = count; }
      if (count === 0) break;
    }
    placed.push(boxOf(best));
    parts.push(`<text class="lc-end-label lc-s${scale}" x="${f1(best.x)}" y="${f1(best.y)}" text-anchor="${best.anchor}">${name}</text>`);
  });
  return parts.join('');
}

// ---------------------------------------------------------------- inset: training curves
export interface InsetLayout {
  width: number; height: number; narrow: boolean; padL: number; x0: number; x1: number;
  top: number; bottom: number; dTop: number; dBottom: number; tickY: number; xTitleY: number;
  x: Scale; y: Scale; d: Scale; yTicks: number[]; yStep: number; dTicks: number[]; dStep: number;
}
const gridX = (index: number) => data.grid.start + data.grid.step * (index + 0.5);
export const stableTokens = Array.from({ length: data.grid.n }, (_, index) => gridX(index));
const TOKEN_DOMAIN: [number, number] = [data.grid.start, 218];

/** Token position of point i of an n-point series spread evenly over [t0, t1]. */
const along = (span: readonly [number, number], i: number, n: number) => span[0] + (span[1] - span[0]) * i / Math.max(1, n - 1);
/** Shared token span of branch k: the overlap of the two architectures' spans (delta.decay is sampled on it). */
export function deltaSpan(cell: Cell, k: number): [number, number] {
  const b = cell.train.base.span[k]!; const l = cell.train.loop.span[k]!;
  return [Math.max(b[0], l[0]), Math.min(b[1], l[1])];
}
export const stableDeltas = (cell: Cell) => cell.train.loop.stable.map((value, index) => value - cell.train.base.stable[index]!);
function quantile(sorted: readonly number[], p: number) {
  const at = p * (sorted.length - 1); const lo = Math.floor(at); const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

/** Loss range covers every value. The delta range is set by the stable phase
 *  (2nd–98th percentile of its 2B-token bin means, always including 0, padded
 *  by 80% of that span), so single-step training losses at branch ends cannot
 *  flatten the strip; decay deltas beyond it are clipped and marked with a caret. */
function insetRanges(cell: Cell) {
  const values = [...cell.train.base.stable, ...cell.train.loop.stable, ...cell.train.base.decay.flat(), ...cell.train.loop.decay.flat()];
  const low = Math.min(...values); const high = Math.max(...values); const pad = (high - low) * 0.05;
  const diffs = stableDeltas(cell).sort((a, b) => a - b);
  const dLow = Math.min(0, quantile(diffs, 0.02)); const dHigh = Math.max(0, quantile(diffs, 0.98));
  const dPad = Math.max(0.007, (dHigh - dLow) * 0.8);
  return { loss: [low - pad, high + pad] as [number, number], delta: [dLow - dPad, dHigh + dPad] as [number, number] };
}

export function insetLayout(width: number, cell: Cell): InsetLayout {
  const narrow = width < 560;
  const padL = narrow ? 46 : 58;
  const padR = narrow ? 4 : 8;
  const top = 10;
  const bottom = top + (narrow ? 150 : 168);
  const dTop = bottom + 12;
  const dBottom = dTop + (narrow ? 50 : 58);
  const tickY = dBottom + 18;
  const xTitleY = tickY + 22;
  const footY = narrow ? xTitleY + 20 : xTitleY;
  const ranges = insetRanges(cell);
  const edge = (ranges.loss[1] - ranges.loss[0]) * 0.05;
  const yTicks = ticks(ranges.loss[0], ranges.loss[1], narrow ? 3 : 4).filter(value => value > ranges.loss[0] + edge && value < ranges.loss[1] - edge);
  // Fine 1 / 2 / 5 steps, then keep 0 and every tick at least 17 units from the last kept one on its side.
  const dAll = ticks(ranges.delta[0], ranges.delta[1], 5).filter(value => value >= ranges.delta[0] && value <= ranges.delta[1]);
  const unit = (dBottom - dTop) / (ranges.delta[1] - ranges.delta[0]);
  const dTicks: number[] = [];
  for (const side of [1, -1]) {
    let last = 0;
    for (const value of dAll.filter(v => side > 0 ? v >= 0 : v < 0).sort((a, b) => side * (a - b))) {
      if (Math.abs(value) < 1e-12) { if (side > 0) dTicks.push(0); continue; }
      if (Math.abs(value - last) * unit >= 17) { dTicks.push(value); last = value; }
    }
  }
  dTicks.sort((a, b) => a - b);
  return {
    width, height: footY + 6, narrow, padL, x0: padL, x1: width - padR, top, bottom, dTop, dBottom, tickY, xTitleY,
    x: linear(TOKEN_DOMAIN, [padL, width - padR]), y: linear(ranges.loss, [bottom, top]), d: linear(ranges.delta, [dBottom, dTop]),
    yTicks, yStep: stepOf(yTicks), dTicks, dStep: stepOf(dAll),
  };
}

export interface InsetCoords { base: number[]; loop: number[]; delta: number[]; decayBase: number[][]; decayLoop: number[][]; decayDelta: number[][] }
/** The drawn stable phase, first fork to last, aligned point for point with insetCoords' base / loop / delta series. */
export const stablePoints = (cell: Cell) => [
  { token: cell.train.base.edge[0][0], base: cell.train.base.edge[0][1], loop: cell.train.loop.edge[0][1] },
  ...stableTokens.map((token, index) => ({ token, base: cell.train.base.stable[index]!, loop: cell.train.loop.stable[index]! })),
  { token: cell.train.base.edge[1][0], base: cell.train.base.edge[1][1], loop: cell.train.loop.edge[1][1] },
];
export function insetCoords(layout: InsetLayout, cell: Cell): InsetCoords {
  const { x, y, d } = layout;
  const [baseHead, baseTail] = cell.train.base.edge; const [loopHead, loopTail] = cell.train.loop.edge;
  const [deltaHead, deltaTail] = cell.train.delta.edge;
  // The stable lines run from the first fork to the last, so every decay branch starts on them.
  const base: number[] = [x(baseHead[0]), y(baseHead[1])]; const loop: number[] = [x(loopHead[0]), y(loopHead[1])];
  const delta: number[] = [x(deltaHead[0]), d(deltaHead[1])];
  stableTokens.forEach((token, index) => {
    const b = cell.train.base.stable[index]!; const l = cell.train.loop.stable[index]!;
    base.push(x(token), y(b)); loop.push(x(token), y(l)); delta.push(x(token), d(l - b));
  });
  base.push(x(baseTail[0]), y(baseTail[1])); loop.push(x(loopTail[0]), y(loopTail[1])); delta.push(x(deltaTail[0]), d(deltaTail[1]));
  // Each architecture's branch on its own logged token span; the delta on the shared span.
  const series = (values: readonly number[], span: readonly [number, number], scale: Scale) => values.flatMap((value, i) => [x(along(span, i, values.length)), scale(value)]);
  const decayBase = cell.train.base.decay.map((branch, k) => series(branch, cell.train.base.span[k]!, y));
  const decayLoop = cell.train.loop.decay.map((branch, k) => series(branch, cell.train.loop.span[k]!, y));
  const decayDelta = cell.train.delta.decay.map((branch, k) => series(branch, deltaSpan(cell, k), d));
  return { base, loop, delta, decayBase, decayLoop, decayDelta };
}

/** Closed area between a flat x,y series and a horizontal line. */
export function areaFromFlat(flat: readonly number[], baseline: number) {
  if (flat.length < 4) return '';
  return `${pathFromFlat(flat)}L${flat[flat.length - 2]!.toFixed(1)} ${baseline.toFixed(1)}L${flat[0]!.toFixed(1)} ${baseline.toFixed(1)}Z`;
}

export function insetAxesMarkup(layout: InsetLayout, language: Language): string {
  const text = copy[language];
  const parts: string[] = [];
  const zero = layout.d(0);
  for (const value of layout.yTicks) {
    const y = layout.y(value).toFixed(1);
    parts.push(`<line class="grid" x1="${layout.x0}" x2="${layout.x1}" y1="${y}" y2="${y}"/><text class="lc-tick" x="${layout.x0 - 7}" y="${(layout.y(value) + 4.5).toFixed(1)}" text-anchor="end">${tickLabel(value, layout.yStep)}</text>`);
  }
  for (const value of layout.dTicks) {
    const y = layout.d(value).toFixed(1);
    if (Math.abs(value) > 1e-9) parts.push(`<line class="grid" x1="${layout.x0}" x2="${layout.x1}" y1="${y}" y2="${y}"/>`);
    parts.push(`<text class="lc-tick" x="${layout.x0 - 7}" y="${(layout.d(value) + 4.5).toFixed(1)}" text-anchor="end">${Math.abs(value) < 1e-9 ? '0' : minus(tickLabel(value, layout.dStep))}</text>`);
  }
  for (const value of [50, 100, 150, 200]) {
    const x = layout.x(value).toFixed(1);
    parts.push(`<line class="grid lc-vgrid" x1="${x}" x2="${x}" y1="${layout.top}" y2="${layout.bottom}"/><line class="grid lc-vgrid" x1="${x}" x2="${x}" y1="${layout.dTop}" y2="${layout.dBottom}"/><text class="lc-tick" x="${x}" y="${layout.tickY}" text-anchor="middle">${value}B</text>`);
  }
  parts.push(`<path class="axis" d="M${layout.x0} ${layout.bottom}H${layout.x1}"/><line class="lc-zero" x1="${layout.x0}" x2="${layout.x1}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}"/>`);
  if (!layout.narrow) {
    parts.push(`<text class="axis-title" transform="translate(13 ${((layout.top + layout.bottom) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${esc(text.yTrain)}</text>`);
    parts.push(`<text class="axis-title" transform="translate(13 ${((layout.dTop + layout.dBottom) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">Δ</text>`);
    parts.push(`<text class="axis-title" x="${((layout.x0 + layout.x1) / 2).toFixed(1)}" y="${layout.xTitleY}" text-anchor="middle">${esc(text.xTokens)}</text>`);
  } else {
    const mid = ((layout.x0 + layout.x1) / 2).toFixed(1);
    parts.push(`<text class="axis-title" x="${mid}" y="${layout.xTitleY}" text-anchor="middle">${esc(text.xTokens)}</text><text class="lc-tick" x="${mid}" y="${layout.xTitleY + 20}" text-anchor="middle">${esc(text.insetKey)}</text>`);
  }
  return parts.join('');
}

export function insetMarksMarkup(layout: InsetLayout, cell: Cell, id: string): string {
  const coords = insetCoords(layout, cell);
  const zero = layout.d(0);
  const parts: string[] = [];
  parts.push(`<clipPath id="${id}-below"><rect data-clip="below" x="0" y="${zero.toFixed(1)}" width="${layout.width}" height="${(layout.dBottom - zero + 2).toFixed(1)}"/></clipPath>`);
  parts.push(`<clipPath id="${id}-above"><rect data-clip="above" x="0" y="${(layout.dTop - 2).toFixed(1)}" width="${layout.width}" height="${(zero - layout.dTop + 2).toFixed(1)}"/></clipPath>`);
  parts.push(`<path class="lc-tr-area is-below" clip-path="url(#${id}-below)" data-ref="area-below" d="${areaFromFlat(coords.delta, zero)}"/>`);
  parts.push(`<path class="lc-tr-area is-above" clip-path="url(#${id}-above)" data-ref="area-above" d="${areaFromFlat(coords.delta, zero)}"/>`);
  // Deltas beyond the strip are clipped at its edges (a caret marks them).
  parts.push(`<clipPath id="${id}-strip"><rect x="0" y="${f1(layout.dTop - 3)}" width="${layout.width}" height="${f1(layout.dBottom - layout.dTop + 6)}"/></clipPath>`);
  const strip = `clip-path="url(#${id}-strip)"`;
  parts.push(`<path class="lc-tr-delta" ${strip} data-ref="delta" d="${pathFromFlat(coords.delta)}"/>`);
  parts.push(`<path class="lc-tr-base" data-ref="base" d="${pathFromFlat(coords.base)}"/><path class="lc-tr-loop" data-ref="loop" d="${pathFromFlat(coords.loop)}"/>`);
  for (let k = 0; k < HORIZONS; k++) {
    const bb = coords.decayBase[k]!; const ll = coords.decayLoop[k]!; const dd = coords.decayDelta[k]!;
    parts.push(`<g class="lc-branch" data-branch="${k}">`
      + `<path class="lc-tr-decay-delta" ${strip} d="${pathFromFlat(dd)}"/>`
      + `<path class="lc-tr-decay-base" d="${pathFromFlat(bb)}"/><path class="lc-tr-decay-loop" d="${pathFromFlat(ll)}"/>`
      + `<circle class="lc-tr-end-base" cx="${f1(bb.at(-2)!)}" cy="${f1(bb.at(-1)!)}" r="3.6"/>`
      + `<circle class="lc-tr-end-loop" cx="${f1(ll.at(-2)!)}" cy="${f1(ll.at(-1)!)}" r="3.6"/>`
      + `<circle class="lc-tr-end-delta" ${strip} cx="${f1(dd.at(-2)!)}" cy="${f1(dd.at(-1)!)}" r="2.6"/>`
      + `</g>`);
  }
  parts.push(`<g class="lc-carets" data-ref="carets">${insetCaretsMarkup(layout, cell)}</g>`);
  return parts.join('');
}

/** Carets for deltas outside the strip: one per series and side, at the most
 *  extreme value, labelled with it unless the label would collide. */
export function insetCaretsMarkup(layout: InsetLayout, cell: Cell): string {
  const [d0, d1] = layout.d.domain as [number, number];
  const series: { tokens: number[]; values: number[] }[] = [{ tokens: stableTokens, values: stableDeltas(cell) }];
  cell.train.delta.decay.forEach((values, k) => { const span = deltaSpan(cell, k); series.push({ tokens: values.map((_, i) => along(span, i, values.length)), values }); });
  const parts: string[] = [];
  const placed: Box[] = [];
  for (const { tokens, values } of series) {
    for (const side of ['high', 'low'] as const) {
      let at = -1;
      values.forEach((value, i) => { if (side === 'high' ? value > d1 && (at < 0 || value > values[at]!) : value < d0 && (at < 0 || value < values[at]!)) at = i; });
      if (at < 0) continue;
      const value = values[at]!;
      const x = layout.x(tokens[at]!);
      const edge = side === 'high' ? layout.dTop : layout.dBottom;
      const tip = side === 'high' ? edge - 4 : edge + 4; const back = side === 'high' ? edge + 2 : edge - 2;
      parts.push(`<path class="lc-caret" d="M${f1(x - 4)} ${f1(back)}L${f1(x)} ${f1(tip)}L${f1(x + 4)} ${f1(back)}Z"/>`);
      const label = signedFixed(value, 3);
      const width = label.length * 6.9;
      const y = side === 'high' ? edge + 13 : edge - 5;
      let anchor: 'start' | 'end' = 'start'; let tx = x + 7;
      if (tx + width > layout.x1) { anchor = 'end'; tx = x - 7; }
      const left = anchor === 'start' ? tx : tx - width;
      const box = { x0: left - 3, x1: left + width + 3, y0: y - 11, y1: y + 3 };
      if (placed.some(other => overlaps(box, other))) continue;
      placed.push(box, { x0: x - 5, x1: x + 5, y0: Math.min(tip, back) - 1, y1: Math.max(tip, back) + 1 });
      parts.push(`<text class="lc-caret-label" x="${f1(tx)}" y="${f1(y)}" text-anchor="${anchor}">${label}</text>`);
    }
  }
  return parts.join('');
}
