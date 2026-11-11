// Figures 3 and 12: cosine similarity between residual-stream increments.
// 'init' compares 64 independent 12-layer stacks with one stack looped 64
// times at initialization; 'trained' compares the 48 layers of a trained untied
// model with the 8 passes of trained looped models. Data: init-cosine.json,
// trained-cosine.json. Figure 8 (gradient-cosine.ts) draws its computed matrix
// with the same heatmap and colour bar.
import initData from '../../data/loop-mup/init-cosine.json';
import trainedData from '../../data/loop-mup/trained-cosine.json';
import { el, leaf, pick, stats, svg, svgText, variants, type Control, type Lang, type Stat } from './markup';

export type Mode = 'init' | 'trained';
export const depths = ['12', '24', '48'] as const;
export interface State { mode: Mode; layers: typeof depths[number] }
export const initial = (mode: Mode): State => ({ mode, layers: '48' });

type Kind = 'untied' | 'loop';
export interface Map { kind: Kind; matrix: number[][]; title: string; short: string; axis: string; tip: (i: number, j: number, value: number) => string }

const fixed = (value: number) => (value <= -0.005 ? '−' : '') + Math.abs(value).toFixed(2);

export function maps(state: State, language: Lang): Map[] {
  if (state.mode === 'init') return [
    { kind: 'untied', matrix: initData.untied, title: pick(language, '64 个独立的 12 层块', '64 independent 12-layer stacks'), short: pick(language, '64 个独立块', '64 untied stacks'), axis: pick(language, '增量序号', 'Increment index'), tip: (i, j, value) => pick(language, `增量 ${i} 与 ${j}：${fixed(value)}`, `Increments ${i} and ${j}: ${fixed(value)}`) },
    { kind: 'loop', matrix: initData.loop, title: pick(language, '同一个 12 层块循环 64 次', 'One 12-layer stack looped 64 times'), short: pick(language, '循环 64 次', 'Looped 64 times'), axis: pick(language, '增量序号', 'Increment index'), tip: (i, j, value) => pick(language, `增量 ${i} 与 ${j}：${fixed(value)}`, `Increments ${i} and ${j}: ${fixed(value)}`) },
  ];
  return [
    { kind: 'untied', matrix: trainedData.untied, title: pick(language, '非循环模型，$L$ = 48 层', 'Untied model, $L$ = 48 layers'), short: pick(language, '非循环 $L$ = 48', 'Untied $L$ = 48'), axis: pick(language, '层', 'Layer'), tip: (i, j, value) => pick(language, `第 ${i} 层与第 ${j} 层：${fixed(value)}`, `Layers ${i} and ${j}: ${fixed(value)}`) },
    { kind: 'loop', matrix: trainedData.loop[state.layers], title: pick(language, `循环模型，$L$ = ${state.layers}，$N$ = 8`, `Looped model, $L$ = ${state.layers}, $N$ = 8`), short: pick(language, `循环 $L$ = ${state.layers}`, `Looped $L$ = ${state.layers}`), axis: pick(language, '循环轮次', 'Pass'), tip: (i, j, value) => pick(language, `第 ${i} 轮与第 ${j} 轮循环：${fixed(value)}`, `Passes ${i} and ${j}: ${fixed(value)}`) },
  ];
}

export function controls(state: State, language: Lang): Control[] {
  if (state.mode === 'init') return [];
  return [{ key: 'layers', label: pick(language, '循环模型的层数 $L$', 'Looped model depth $L$'), value: state.layers, options: depths.map(value => ({ value, label: value })) }];
}
export const parse = (_key: string, value: string, state: State): State => ({ ...state, layers: value as State['layers'] });

const bin = (value: number) => Math.max(-10, Math.min(10, Math.round(value * 10)));
const binClass = (value: number) => { const b = bin(value); return b === 0 ? 'cm-z' : b > 0 ? `cm-p${b}` : `cm-n${-b}`; };

/** Cells merged into horizontal runs of the same colour bin. */
export function heat(map: Map, x: number, y: number, size: number, ticks: number[], compactAxis: boolean) {
  const n = map.matrix.length;
  const cell = size / n;
  const rects: string[] = [];
  map.matrix.forEach((row, i) => {
    let start = 0;
    for (let j = 1; j <= n; j++) {
      if (j < n && bin(row[j]!) === bin(row[start]!)) continue;
      rects.push(leaf('rect', { class: binClass(row[start]!), x: x + start * cell, y: y + i * cell, width: (j - start) * cell + 0.4, height: cell + 0.4 }));
      start = j;
    }
  });
  const tickMarks = ticks.map(tick => {
    const center = (tick - 0.5) * cell;
    return el('text', { x: x + center, y: y + size + 16, 'text-anchor': 'middle' }, String(tick)) + el('text', { x: x - 6, y: y + center + 4.5, 'text-anchor': 'end' }, String(tick));
  }).join('');
  return el('g', { class: `lm-heat is-${map.kind}` }, [
    el('text', { class: `label-strong ${map.kind === 'loop' ? 'loop-text' : 'base-text'}`, x, y: y - 12 }, svgText(compactAxis ? map.short : map.title)),
    el('g', { class: 'lm-heat-cells' }, rects),
    leaf('rect', { class: 'lm-heat-frame', x, y, width: size, height: size }),
    tickMarks,
    compactAxis ? '' : el('text', { class: 'lm-axis-note', x: x + size / 2, y: y + size + 36, 'text-anchor': 'middle' }, svgText(map.axis)),
    leaf('rect', { class: 'lm-heat-hit', x, y, width: size, height: size, 'data-lm-heat': map.kind, 'data-n': n, tabindex: 0, role: 'img', 'aria-label': `${map.title.replaceAll('$', '')}` }),
  ]);
}

export function colorbar(x: number, y: number, length: number, vertical: boolean, language: Lang) {
  const steps = Array.from({ length: 21 }, (_, index) => index - 10);
  const unit = length / steps.length;
  const blocks = steps.map((step, index) => leaf('rect', {
    class: step === 0 ? 'cm-z' : step > 0 ? `cm-p${step}` : `cm-n${-step}`,
    x: vertical ? x : x + index * unit, y: vertical ? y + (steps.length - 1 - index) * unit : y,
    width: vertical ? 12 : unit + 0.4, height: vertical ? unit + 0.4 : 12,
  })).join('');
  const label = (value: string, offset: number) => vertical
    ? el('text', { x: x + 18, y: y + offset + 4.5 }, value)
    : el('text', { x: x + offset, y: y + 28, 'text-anchor': 'middle' }, value);
  const title = pick(language, '余弦相似度', 'Cosine similarity');
  return el('g', { class: 'lm-colorbar' }, [blocks, leaf('rect', { class: 'lm-heat-frame', x, y, width: vertical ? 12 : length, height: vertical ? length : 12 }),
    label('1', vertical ? 0 : length), label('0', length / 2), label('−1', vertical ? length : 0),
    vertical ? el('text', { class: 'lm-axis-note', transform: `translate(${x + 52} ${y + length / 2}) rotate(90)`, 'text-anchor': 'middle' }, title) : el('text', { class: 'lm-axis-note', x: x + length / 2, y: y - 6, 'text-anchor': 'middle' }, title)]);
}

const ticksFor = (n: number) => n === 64 ? [1, 16, 32, 48, 64] : n === 48 ? [1, 12, 24, 36, 48] : [1, 2, 3, 4, 5, 6, 7, 8];

function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function offDiagonal(matrix: number[][], limit = matrix.length) {
  const values: number[] = [];
  for (let i = 0; i < limit; i++) for (let j = 0; j < limit; j++) if (i !== j) values.push(matrix[i]![j]!);
  return mean(values);
}

export function summary(state: State, language: Lang): Stat[] {
  const [untied, loop] = maps(state, language);
  if (state.mode === 'init') return [
    { value: fixed(offDiagonal(untied!.matrix)), label: pick(language, '独立块：增量两两的平均余弦', 'Untied: mean pairwise cosine'), tone: 'base' },
    { value: fixed(offDiagonal(loop!.matrix)), label: pick(language, '循环：增量两两的平均余弦', 'Looped: mean pairwise cosine'), tone: 'loop' },
  ];
  const n = loop!.matrix.length;
  const last = mean(loop!.matrix[n - 1]!.slice(0, n - 1));
  const adjacent = mean(untied!.matrix.slice(0, -1).map((row, index) => row[index + 1]!));
  return [
    { value: fixed(offDiagonal(loop!.matrix, n - 1)), label: pick(language, `循环 $L$ = ${state.layers}：前 7 次循环两两的平均余弦`, `Looped $L$ = ${state.layers}: mean cosine among passes 1–7`), tone: 'loop' },
    { value: fixed(last), label: pick(language, '最后一次循环与其余循环的平均余弦', 'Final pass vs. the others'), tone: 'loop' },
    { value: fixed(offDiagonal(untied!.matrix)), label: pick(language, '非循环 $L$ = 48：各层两两的平均余弦', 'Untied $L$ = 48: mean cosine over all layer pairs'), tone: 'base' },
    { value: fixed(adjacent), label: pick(language, '非循环：相邻层的平均余弦', 'Untied: mean cosine of adjacent layers'), tone: 'base' },
  ];
}

export function view(state: State, language: Lang): string {
  const pair = maps(state, language);
  const label = state.mode === 'init'
    ? pick(language, '热力图：初始化时，64 个独立块的增量两两近似正交，同一个块循环 64 次的增量两两正相关。', 'Heatmaps: at initialization, the increments of 64 untied stacks are nearly orthogonal, while those of one stack looped 64 times are all positively correlated.')
    : pick(language, `热力图：训练后，非循环 48 层模型各层增量的余弦相似度，以及 L = ${state.layers} 的循环模型 8 次循环增量之间的余弦相似度。`, `Heatmaps: after training, cosine similarity between the layer increments of an untied 48-layer model and between the 8 pass increments of a looped model with L = ${state.layers}.`);
  const chart = variants(variant => {
    if (variant === 'wide') {
      const size = 270;
      return svg(variant, 760, 370, label, heat(pair[0]!, 44, 34, size, ticksFor(pair[0]!.matrix.length), false) + heat(pair[1]!, 392, 34, size, ticksFor(pair[1]!.matrix.length), false) + colorbar(700, 34, size, true, language));
    }
    const size = 148;
    return svg(variant, 360, 262, label, heat(pair[0]!, 28, 30, size, ticksFor(pair[0]!.matrix.length).filter((_, index, list) => list.length < 6 || index % 2 === 0), true) + heat(pair[1]!, 206, 30, size, ticksFor(pair[1]!.matrix.length).filter((_, index, list) => list.length < 6 || index % 2 === 0), true) + colorbar(60, 230, 240, false, language));
  });
  return chart + stats(summary(state, language));
}

/** Hover or focus a heatmap to read one cell. */
export function cell(state: State, language: Lang, kind: Kind, i: number, j: number) {
  const map = maps(state, language).find(candidate => candidate.kind === kind)!;
  return map.tip(i + 1, j + 1, map.matrix[i]![j]!);
}
