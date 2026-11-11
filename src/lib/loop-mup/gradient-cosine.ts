// Figure 8: the gradient of the shared matrix is a sum of N per-loop terms,
//   G = ℓ′ c_N Σ_r b_r (x^{r−1})ᵀ,
// where loop r contributes the outer product of its backward signal b_r and
// its input x^{r−1}. The heatmap shows the cosine similarity between the
// contributions of loops r and s, which factors into the cosine of the two
// inputs times the cosine of the two backward signals. In the large-width
// limit of the linear model,
//   ⟨x^p, x^q⟩/n → Σ_m C(p,m) C(q,m) c^{2m},   n⟨b_r, b_s⟩ → the same with N−r, N−s,
// evaluated at the Loop-μP multiplier c = 1/N (a = 1). The bars compare the
// length of the sum with N aligned and N orthogonal terms of the same size.
// Pure arithmetic; no measured data.
import { colorbar, heat, type Map as HeatMap } from './cosine-map';
import { el, leaf, stats, svg, svgText, variants, type Control, type Lang } from './markup';

export const counts = [4, 8, 16, 64] as const;
export interface State { n: number }
export const initial: State = { n: 8 };

interface Gram { cosine: number[][]; inputs: number[][]; backward: number[][]; mean: number; least: number; ratio: number }
const cache = new Map<number, Gram>();

/** Pairwise cosines of the N per-loop gradient contributions, and how long their sum is. */
export function gram(n: number): Gram {
  const cached = cache.get(n);
  if (cached) return cached;
  const c = 1 / n;
  const binomial: number[][] = [[1]];
  for (let p = 1; p < n; p++) binomial.push(Array.from({ length: p + 1 }, (_, m) => (binomial[p - 1]![m - 1] ?? 0) + (binomial[p - 1]![m] ?? 0)));
  // overlap[p][q] is the limit of ⟨W-polynomial after p loops, after q loops⟩ / n.
  const overlap = Array.from({ length: n }, (_, p) => Array.from({ length: n }, (_, q) => {
    let total = 0;
    for (let m = 0; m <= Math.min(p, q); m++) total += binomial[p]![m]! * binomial[q]![m]! * c ** (2 * m);
    return total;
  }));
  // Loop r = i + 1 reads x^{r−1} (i loops behind it) and receives b_r (N − r loops ahead of it).
  const forward = (i: number, j: number) => overlap[i]![j]!;
  const back = (i: number, j: number) => overlap[n - 1 - i]![n - 1 - j]!;
  const unit = (inner: (i: number, j: number) => number) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => inner(i, j) / Math.sqrt(inner(i, i) * inner(j, j))));
  const inputs = unit(forward);
  const backward = unit(back);
  const cosine = inputs.map((row, i) => row.map((value, j) => value * backward[i]![j]!));
  const length = Array.from({ length: n }, (_, i) => Math.sqrt(forward(i, i) * back(i, i)));
  let squared = 0;
  let off = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { squared += forward(i, j) * back(i, j); if (i !== j) off += cosine[i]![j]!; }
  const result = { cosine, inputs, backward, mean: off / (n * (n - 1)), least: Math.min(...cosine.flat()), ratio: Math.sqrt(squared) / (length.reduce((sum, value) => sum + value, 0) / n) };
  cache.set(n, result);
  return result;
}

const fixed = (value: number) => value.toFixed(2);

const copy = {
  zh: {
    n: '循环次数 $N$',
    title: (n: number) => `循环 ${n} 轮：各轮循环的梯度贡献`, axis: '循环轮次',
    tip: (i: number, j: number, value: number, inputs: number, backward: number) => `第 ${i} 轮与第 ${j} 轮循环的梯度贡献：余弦 ${fixed(value)}\n输入余弦 ${fixed(inputs)} × 反向信号余弦 ${fixed(backward)}`,
    sum: '$N$ 项合成范数', unit: '以单项平均范数为单位',
    rows: ['若 $N$ 项完全同向', '实际合成', '若 $N$ 项互相正交'],
    mean: '各轮梯度贡献两两平均余弦', least: (n: number) => `最小余弦：第 1 轮与第 ${n} 轮`, ratio: '合成范数相对单项平均范数的倍数',
    aria: (n: number, mean: string, ratio: string, root: string) => `热力图与条形图：循环 ${n} 轮时，各轮对共享权重梯度贡献的两两余弦相似度均为正（均值 ${mean}）；${n} 项合成范数为单项平均范数的 ${ratio} 倍（完全同向为 ${n} 倍，互相正交为 ${root} 倍）。`,
  },
  en: {
    n: 'Loop count $N$',
    title: (n: number) => `${n} loops: per-loop gradient contributions`, axis: 'Loop',
    tip: (i: number, j: number, value: number, inputs: number, backward: number) => `Gradient contributions of loops ${i} and ${j}: cosine ${fixed(value)}\ninputs ${fixed(inputs)} × backward signals ${fixed(backward)}`,
    sum: 'Length of the sum of the $N$ terms', unit: 'in units of the mean length of one term',
    rows: ['If the $N$ terms were perfectly aligned', 'Actual', 'If the $N$ terms were orthogonal'],
    mean: 'Mean pairwise cosine of the per-loop gradient contributions', least: (n: number) => `Smallest cosine: loops 1 and ${n}`, ratio: 'Length of the sum over the mean length of one term',
    aria: (n: number, mean: string, ratio: string, root: string) => `Heatmap and bar chart: with ${n} loops, the contributions of the loops to the gradient of the shared weights all have positive pairwise cosine similarity, ${mean} on average; the sum of the ${n} terms is ${ratio} times as long as a single term on average, against ${n} for perfectly aligned terms and ${root} for orthogonal ones.`,
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'n', label: copy[language].n, value: String(state.n), options: counts.map(n => ({ value: String(n), label: String(n) })) }];
}
export const parse = (_key: string, value: string, _state: State): State => ({ n: Number(value) });

/** Tooltip for the heatmap cell in row i, column j (0-based). */
export function cell(state: State, language: Lang, _kind: unknown, i: number, j: number): string {
  const { cosine, inputs, backward } = gram(state.n);
  return copy[language].tip(i + 1, j + 1, cosine[i]![j]!, inputs[i]![j]!, backward[i]![j]!);
}

const ticks = (n: number) => n <= 8 ? Array.from({ length: n }, (_, index) => index + 1) : n === 16 ? [1, 4, 8, 12, 16] : [1, 16, 32, 48, 64];
const root = (n: number) => { const value = Math.sqrt(n); return Number.isInteger(value) ? String(value) : fixed(value); };

/** Three bars: N aligned terms, the actual sum, N orthogonal terms. */
function bars(state: State, language: Lang, x: number, y: number, width: number) {
  const text = copy[language];
  const { n } = state;
  const { ratio } = gram(n);
  const rows = [
    { value: n, shown: String(n), tone: 'is-ghost' },
    { value: ratio, shown: fixed(ratio), tone: 'is-loop' },
    { value: Math.sqrt(n), shown: `√${n} ${Number.isInteger(Math.sqrt(n)) ? '=' : '≈'} ${root(n)}`, tone: 'is-muted' },
  ];
  return [
    el('text', { class: 'label-strong', x, y }, svgText(text.sum)),
    el('text', { class: 'lm-note', x, y: y + 20 }, text.unit),
    ...rows.map((row, index) => {
      const top = y + 50 + index * 58;
      const length = row.value / n * width;
      return el('text', { class: 'lm-note', x, y: top }, svgText(text.rows[index]!))
        + leaf('rect', { class: `lm-sum-bar ${row.tone}`, x, y: top + 9, width: length, height: 16, rx: 2 })
        + el('text', { class: `label${row.tone === 'is-loop' ? ' loop-text' : ''}`, x: x + length + 8, y: top + 22 }, row.shown);
    }),
  ].join('');
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const { n } = state;
  const result = gram(n);
  const map: HeatMap = { kind: 'loop', matrix: result.cosine, title: text.title(n), short: text.title(n), axis: text.axis, tip: () => '' };
  const label = text.aria(n, fixed(result.mean), fixed(result.ratio), root(n));
  const chart = variants(variant => variant === 'wide'
    ? svg(variant, 760, 340, label, heat(map, 44, 34, 250, ticks(n), false) + colorbar(312, 34, 250, true, language) + bars(state, language, 440, 74, 232))
    : svg(variant, 360, 596, label, heat(map, 44, 34, 250, ticks(n), true) + colorbar(60, 326, 240, false, language) + bars(state, language, 44, 392, 232)));
  return chart + stats([
    { value: fixed(result.mean), label: text.mean, tone: 'loop' },
    { value: fixed(result.least), label: text.least(n) },
    { value: `× ${fixed(result.ratio)}`, label: text.ratio },
  ]);
}
