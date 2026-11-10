// Figure 5: at large width, multiplying by a Gaussian matrix W with entries
// 𝒩(0, 1/n) keeps a vector's length and turns it to an orthogonal direction.
// Left: 200 samples of WU against U, drawn in polar coordinates (angle to U,
// length ratio). Given U, the coordinates of WU are independent 𝒩(0, ‖U‖²/n),
// so each sample draws WU directly instead of a whole matrix. Right: one
// sampled W applied three times, and the pairwise cosines of U, WU, W²U, W³U.
// Everything is simulated from a fixed seed; no measured data.
import { el, html, leaf, stats, svg, svgText, variants, type Control, type Lang } from './markup';
import { random } from './vector-sum';

export const widths = [2, 4, 16, 64, 256, 1024] as const;
export interface State { n: number }
export const initial: State = { n: 1024 };

const samples = 200;
const seed = 5120;
const normal = (uniform: () => number) => () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());

interface Sample { angle: number; ratio: number }
const clouds = new Map<number, Sample[]>();
/** Angle between U and WU (radians) and the length ratio ‖WU‖/‖U‖, for 200 independent draws. */
export function cloud(n: number): Sample[] {
  const cached = clouds.get(n);
  if (cached) return cached;
  const draw = normal(random(seed + n));
  const list = Array.from({ length: samples }, () => {
    let uu = 0, ww = 0, uw = 0;
    for (let index = 0; index < n; index++) { const u = draw(); const w = draw(); uu += u * u; ww += w * w; uw += u * w; }
    return { angle: Math.acos(Math.max(-1, Math.min(1, uw / Math.sqrt(uu * ww)))), ratio: Math.sqrt(ww / n) };
  });
  clouds.set(n, list);
  return list;
}

interface Chain { cosine: number[][]; length: number[] }
const chains = new Map<number, Chain>();
/** One W and one U: pairwise cosines and RMS lengths of U, WU, W²U and W³U. */
export function chain(n: number): Chain {
  const cached = chains.get(n);
  if (cached) return cached;
  const draw = normal(random(seed * 31 + n));
  const matrix = new Float32Array(n * n);
  const scale = 1 / Math.sqrt(n);
  for (let index = 0; index < matrix.length; index++) matrix[index] = draw() * scale;
  const vectors = [Float64Array.from({ length: n }, draw)];
  for (let power = 1; power < 4; power++) {
    const previous = vectors[power - 1]!;
    const next = new Float64Array(n);
    for (let row = 0; row < n; row++) { let total = 0; const offset = row * n; for (let column = 0; column < n; column++) total += matrix[offset + column]! * previous[column]!; next[row] = total; }
    vectors.push(next);
  }
  const dot = (a: Float64Array, b: Float64Array) => { let total = 0; for (let index = 0; index < n; index++) total += a[index]! * b[index]!; return total; };
  const result = { cosine: vectors.map(a => vectors.map(b => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b)))), length: vectors.map(vector => Math.sqrt(dot(vector, vector) / n)) };
  chains.set(n, result);
  return result;
}

const degrees = (radians: number) => radians * 180 / Math.PI;
function spread(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { mean, deviation: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) };
}

/** Summary numbers shown under the figure. */
export function summary(n: number) {
  const list = cloud(n);
  const { cosine } = chain(n);
  const off = cosine.flatMap((row, i) => row.filter((_, j) => j > i).map(Math.abs));
  return { angle: spread(list.map(sample => degrees(sample.angle))), ratio: spread(list.map(sample => sample.ratio)), off: Math.max(...off) };
}

const names = ['$U$', '$WU$', '$W$^{2}$U$', '$W$^{3}$U$'];
const copy = {
  zh: {
    n: '宽度 $n$', right: '90°（正交）', same: '0°（同向）', opposite: '180°（反向）',
    current: (n: number) => `$n$ = ${n}：${samples} 次采样的 $WU$`, reference: '$n$ = 2 作对照', keep: '实线圈：长度与 $U$ 相同',
    gram: '同一个 $W$ 连乘：两两夹角的余弦', lengths: (values: string) => `RMS 长度：${values}`,
    angle: '$U$ 与 $WU$ 的夹角（偏差约 57°/√$n$）', ratio: '长度比 ‖$WU$‖ / ‖$U$‖', off: '$U$、$WU$、$W$^{2}$U$、$W$^{3}$U$ 两两余弦的最大绝对值',
    aria: (n: number, angle: string, ratio: string, off: string) => `示意图：宽度 n = ${n} 时，${samples} 次采样中 WU 与 U 的夹角为 ${angle}，长度比为 ${ratio}；U、WU、W²U、W³U 两两余弦的绝对值最大为 ${off}。`,
  },
  en: {
    n: 'Width $n$', right: '90° (orthogonal)', same: '0° (same way)', opposite: '180° (opposite)',
    current: (n: number) => `$n$ = ${n}: ${samples} samples of $WU$`, reference: '$n$ = 2 for comparison', keep: 'Solid arc: same length as $U$',
    gram: 'Pairwise cosines under one sampled $W$', lengths: (values: string) => `RMS lengths: ${values}`,
    angle: 'Angle between $U$ and $WU$ (spread about 57°/√$n$)', ratio: 'Length ratio ‖$WU$‖ / ‖$U$‖', off: 'Largest absolute cosine among $U$, $WU$, $W$^{2}$U$, $W$^{3}$U$',
    aria: (n: number, angle: string, ratio: string, off: string) => `Illustration: at width n = ${n}, over ${samples} samples the angle between WU and U is ${angle} and the length ratio is ${ratio}; the largest absolute pairwise cosine among U, WU, W²U and W³U is ${off}.`,
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'n', label: copy[language].n, value: String(state.n), options: widths.map(n => ({ value: String(n), label: String(n) })) }];
}
export const parse = (_key: string, value: string, _state: State): State => ({ n: Number(value) });

const signedCosine = (value: number) => { const text = Math.abs(value).toFixed(2); return value < 0 && text !== '0.00' ? `−${text}` : text; };

function gauge(state: State, language: Lang, cx: number, cy: number, radius: number) {
  const text = copy[language];
  const at = (angle: number, ratio: number): [number, number] => [cx + ratio * radius * Math.cos(angle), cy - ratio * radius * Math.sin(angle)];
  const arc = (ratio: number, className: string) => { const r = ratio * radius; return leaf('path', { class: className, d: `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}` }); };
  const ticks = [30, 60, 90, 120, 150].map(angle => { const [x1, y1] = at(angle * Math.PI / 180, 2); const [x2, y2] = at(angle * Math.PI / 180, 2.06); return leaf('line', { class: 'axis', x1, y1, x2, y2 }); }).join('');
  const dots = (list: Sample[], className: string) => list.map(sample => { const [x, y] = at(sample.angle, Math.min(sample.ratio, 2)); return leaf('circle', { class: className, cx: x, cy: y, r: 2.6 }); }).join('');
  const [tipX] = at(0, 1);
  return [
    arc(2, 'lm-gauge-outer'), arc(1, 'lm-gauge-unit'), ticks,
    leaf('line', { class: 'axis', x1: cx - 2 * radius, x2: cx + 2 * radius, y1: cy, y2: cy }),
    leaf('line', { class: 'lm-gauge-right', x1: cx, x2: cx, y1: cy, y2: cy - 2 * radius }),
    state.n > 2 ? dots(cloud(2), 'lm-gauge-dot is-reference') : '',
    dots(cloud(state.n), 'lm-gauge-dot is-loop'),
    leaf('line', { class: 'lm-gauge-vector', x1: cx, y1: cy, x2: tipX - 9, y2: cy }),
    leaf('path', { class: 'lm-gauge-head', d: `M${tipX} ${cy}L${tipX - 11} ${cy - 5}L${tipX - 11} ${cy + 5}Z` }),
    el('text', { class: 'label', x: cx + radius / 2, y: cy + 19, 'text-anchor': 'middle' }, svgText('$U$')),
    el('text', { x: cx, y: cy - 2 * radius - 10, 'text-anchor': 'middle' }, text.right),
    el('text', { x: cx + 2 * radius, y: cy + 19, 'text-anchor': 'end' }, text.same),
    el('text', { x: cx - 2 * radius, y: cy + 19 }, text.opposite),
  ].join('');
}

function gram(state: State, language: Lang, x0: number, y0: number, cell: number, centre: number) {
  const text = copy[language];
  const { cosine, length } = chain(state.n);
  const cells = cosine.map((row, i) => row.map((value, j) => {
    const level = Math.round(Math.abs(value) * 10);
    return leaf('rect', { class: level === 0 ? 'cm-z' : `cm-${value < 0 ? 'n' : 'p'}${level}`, x: x0 + j * cell, y: y0 + i * cell, width: cell, height: cell })
      + el('text', { class: `lm-cell-value${level >= 6 ? ' is-strong' : ''}`, x: x0 + (j + 0.5) * cell, y: y0 + (i + 0.5) * cell + 4.5, 'text-anchor': 'middle' }, signedCosine(value));
  }).join('')).join('');
  const heads = names.map((name, index) => el('text', { class: 'label', x: x0 + (index + 0.5) * cell, y: y0 - 9, 'text-anchor': 'middle' }, svgText(name))
    + el('text', { class: 'label', x: x0 - 8, y: y0 + (index + 0.5) * cell + 4.5, 'text-anchor': 'end' }, svgText(name))).join('');
  return [
    el('text', { class: 'label', x: centre, y: y0 - 38, 'text-anchor': 'middle' }, svgText(text.gram)),
    cells, heads,
    leaf('rect', { class: 'lm-heat-frame', x: x0, y: y0, width: cell * 4, height: cell * 4 }),
    el('text', { x: centre, y: y0 + cell * 4 + 22, 'text-anchor': 'middle' }, text.lengths(length.map(value => value.toFixed(2)).join(' · '))),
  ].join('');
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const numbers = summary(state.n);
  const angle = `${numbers.angle.mean.toFixed(0)}° ± ${numbers.angle.deviation.toFixed(1)}°`;
  const ratio = `${numbers.ratio.mean.toFixed(2)} ± ${numbers.ratio.deviation.toFixed(2)}`;
  const label = text.aria(state.n, angle, ratio, numbers.off.toFixed(2));
  const chart = variants(variant => variant === 'wide'
    ? svg(variant, 760, 300, label, gauge(state, language, 230, 258, 108) + gram(state, language, 548, 76, 48, 628))
    : svg(variant, 360, 514, label, gauge(state, language, 180, 196, 80) + gram(state, language, 112, 300, 46, 180)));
  const legend = el('div', { class: 'smelt-legend lm-legend' }, [
    el('span', { class: 'is-loop' }, `<i class="lm-swatch-dot"></i><span>${html(text.current(state.n))}</span>`),
    state.n > 2 ? el('span', { class: 'is-reference' }, `<i class="lm-swatch-dot"></i><span>${html(text.reference)}</span>`) : '',
    el('span', {}, `<i class="lm-swatch-line"></i><span>${html(text.keep)}</span>`),
  ]);
  return legend + chart + stats([
    { value: angle, label: text.angle, tone: 'loop' },
    { value: ratio, label: text.ratio },
    { value: numbers.off.toFixed(2), label: text.off },
  ]);
}
