// Figure 1: residual increments added head to tail. Independent layers point in
// unrelated directions (a random walk); a shared block points in nearly the same
// direction every loop. Increments are drawn in 2D from a fixed seed, with the
// looped directions spread so that their mean pairwise cosine is about 0.85.
import { el, leaf, stats, svg, svgText, variants, type Control, type Lang } from './markup';

export const counts = [1, 2, 4, 8, 16, 32, 64] as const;
export type Scaling = 'none' | 'sqrt' | 'linear';
export interface State { k: number; scaling: Scaling }
export const initial: State = { k: 16, scaling: 'none' };

const seed = 2824;
/** A small seeded generator (mulberry32), so the build and the browser draw the same samples. */
export function random(state: number) {
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// exp(−σ²) = 0.85 is the mean pairwise cosine of directions θ₀ + σ·z.
const spread = Math.sqrt(-Math.log(0.85));
const heading = -Math.PI / 2 + 0.55;
const angles = (() => {
  const next = random(seed);
  const untied: number[] = [];
  const looped: number[] = [];
  for (let index = 0; index < 64; index++) {
    untied.push(next() * 2 * Math.PI);
    const z = Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    looped.push(heading + spread * z);
  }
  return { untied, looped };
})();

export const factor = (scaling: Scaling, k: number) => scaling === 'none' ? 1 : scaling === 'sqrt' ? k ** -0.5 : 1 / k;

export function walk(kind: 'untied' | 'looped', state: State) {
  const step = factor(state.scaling, state.k);
  const points: [number, number][] = [[0, 0]];
  for (let index = 0; index < state.k; index++) {
    const [x, y] = points[index]!;
    const angle = angles[kind][index]!;
    points.push([x + step * Math.cos(angle), y + step * Math.sin(angle)]);
  }
  const [ex, ey] = points[points.length - 1]!;
  return { points, length: Math.hypot(ex, ey) };
}

const copy = {
  zh: {
    count: '增量个数（$L$ 或 $N$）', scaling: '残差分支系数 $c$',
    options: { none: '不缩放', sqrt: '1/√$L$ 或 1/√$N$', linear: '1/$L$ 或 1/$N$' },
    untied: '独立的 $L$ 层', looped: '同一个块循环 $N$ 次',
    untiedNote: '每层权重不同', loopedNote: '每次循环权重相同',
    unit: '长度 1', sum: '残差总增量',
    aria: (k: number) => `示意图：${k} 个独立层的增量方向各不相同，像随机游走；同一个块循环 ${k} 次的增量方向相近，沿一条线累加。`,
    length: '总增量长度',
  },
  en: {
    count: 'Increments ($L$ or $N$)', scaling: 'Branch multiplier $c$',
    options: { none: 'Unscaled', sqrt: '1/√$L$ or 1/√$N$', linear: '1/$L$ or 1/$N$' },
    untied: '$L$ independent layers', looped: 'One block looped $N$ times',
    untiedNote: 'different weights per layer', loopedNote: 'same weights every loop',
    unit: 'length 1', sum: 'total increment',
    aria: (k: number) => `Illustration: the increments of ${k} independent layers point in unrelated directions, like a random walk; the increments of one block looped ${k} times point in similar directions and add along a line.`,
    length: 'Total increment length',
  },
};

const growth: Record<Scaling, { untied: string; looped: string }> = {
  none: { untied: '∝ √$L$', looped: '∝ $N$' },
  sqrt: { untied: 'Θ(1)', looped: '∝ √$N$' },
  linear: { untied: '∝ 1/√$L$', looped: 'Θ(1)' },
};

export function controls(state: State, language: Lang): Control[] {
  const text = copy[language];
  return [
    { key: 'k', label: text.count, value: String(state.k), options: counts.map(k => ({ value: String(k), label: String(k) })) },
    { key: 'scaling', label: text.scaling, value: state.scaling, options: (['none', 'sqrt', 'linear'] as const).map(value => ({ value, label: text.options[value] })) },
  ];
}

export function parse(key: string, value: string, state: State): State {
  if (key === 'k') return { ...state, k: Number(value) };
  return { ...state, scaling: value as Scaling };
}

function panel(kind: 'untied' | 'looped', state: State, language: Lang, area: { x: number; y: number; w: number; h: number }, scale: number, center: [number, number]) {
  const text = copy[language];
  const { points } = walk(kind, state);
  const map = ([x, y]: readonly [number, number]): [number, number] => [area.x + area.w / 2 + (x - center[0]) * scale, area.y + area.h / 2 + (y - center[1]) * scale];
  const origin = map([0, 0]);
  const end = map(points[points.length - 1]!);
  const tone = kind === 'untied' ? 'base' : 'loop';
  const radius = scale;
  const path = points.map((point, index) => { const [x, y] = map(point); return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; }).join('');
  const joints = points.length <= 33 ? points.slice(1, -1).map(point => { const [x, y] = map(point); return leaf('circle', { class: `lm-joint is-${tone}`, cx: x, cy: y, r: 1.9 }); }).join('') : '';
  const dx = end[0] - origin[0];
  const dy = end[1] - origin[1];
  const length = Math.hypot(dx, dy);
  const ux = length ? dx / length : 0;
  const uy = length ? dy / length : 0;
  const head = Math.min(11, length * 0.45);
  const shaft = [end[0] - ux * head * 0.7, end[1] - uy * head * 0.7];
  const arrow = length > 3 ? leaf('path', { class: `lm-resultant is-${tone}`, d: `M${origin[0].toFixed(2)} ${origin[1].toFixed(2)}L${shaft[0]!.toFixed(2)} ${shaft[1]!.toFixed(2)}` })
    + leaf('path', { class: `lm-resultant-head is-${tone}`, d: `M${end[0].toFixed(2)} ${end[1].toFixed(2)}L${(end[0] - ux * head - uy * head * 0.45).toFixed(2)} ${(end[1] - uy * head + ux * head * 0.45).toFixed(2)}L${(end[0] - ux * head + uy * head * 0.45).toFixed(2)} ${(end[1] - uy * head - ux * head * 0.45).toFixed(2)}Z` }) : '';
  return el('g', { class: 'lm-walk' }, [
    leaf('rect', { class: 'lm-panel', x: area.x, y: area.y - 44, width: area.w, height: area.h + 44, rx: 6 }),
    el('text', { class: `label-strong ${tone}-text`, x: area.x + 14, y: area.y - 22 }, svgText(kind === 'untied' ? text.untied : text.looped)),
    el('text', { class: 'lm-note', x: area.x + 14, y: area.y - 5 }, svgText(kind === 'untied' ? text.untiedNote : text.loopedNote)),
    leaf('circle', { class: 'lm-unit', cx: origin[0], cy: origin[1], r: radius }),
    radius > 22 ? el('text', { class: 'lm-unit-label', x: origin[0] + radius * 0.74 + 4, y: origin[1] + radius * 0.74 + 14 }, svgText(text.unit)) : '',
    leaf('path', { class: `lm-steps is-${tone} lm-draw`, d: path, pathLength: 1 }),
    joints,
    arrow,
    leaf('circle', { class: 'lm-origin', cx: origin[0], cy: origin[1], r: 3.2 }),
  ]);
}

function bounds(points: [number, number][]) {
  const xs = [...points.map(point => point[0]), -1, 1];
  const ys = [...points.map(point => point[1]), -1, 1];
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const untied = walk('untied', state);
  const looped = walk('looped', state);
  const chart = variants(variant => {
    const wide = variant === 'wide';
    const width = wide ? 760 : 360;
    const panelW = wide ? 362 : 360;
    const panelH = wide ? 300 : 236;
    const areas = wide
      ? [{ x: 0, y: 46, w: panelW, h: panelH }, { x: 398, y: 46, w: panelW, h: panelH }]
      : [{ x: 0, y: 46, w: panelW, h: panelH }, { x: 0, y: 46 + panelH + 62, w: panelW, h: panelH }];
    const height = wide ? 46 + panelH + 4 : 46 + panelH * 2 + 66;
    const boxes = [bounds(untied.points), bounds(looped.points)];
    const pad = 26;
    const scale = Math.min(...boxes.map(b => Math.min((panelW - pad * 2) / (b.maxX - b.minX), (panelH - pad * 2) / (b.maxY - b.minY))));
    const centers = boxes.map(b => [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2] as [number, number]);
    return svg(variant, width, height, text.aria(state.k), panel('untied', state, language, areas[0]!, scale, centers[0]!) + panel('looped', state, language, areas[1]!, scale, centers[1]!));
  });
  const shape = growth[state.scaling];
  return chart + stats([
    { value: untied.length.toFixed(untied.length < 10 ? 2 : 1), note: shape.untied, label: `${text.untied} · ${text.length}`, tone: 'base' },
    { value: looped.length.toFixed(looped.length < 10 ? 2 : 1), note: shape.looped, label: `${text.looped} · ${text.length}`, tone: 'loop' },
  ]);
}
