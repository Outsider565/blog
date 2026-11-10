// Figure 4: the expansion x^N = Σ_m C(N,m) c^m W^m U of a linear residual
// block. With shared weights the C(N,m) order-m terms coincide and add in
// length; with independent weights they are orthogonal and add in quadrature.
// Pure arithmetic with a = 1, c = N^{−α_N}; no measured data.
import { decadeTicks } from '../smelt/plot';
import { box, linear, log10Scale, xAxis, yAxis, type Frame } from './chart';
import { compact, el, html, leaf, stats, svg, variants, type Control, type Lang } from './markup';
import { alphas, type Alpha } from './init-norm';

export const counts = [1, 2, 4, 8, 16, 32, 64] as const;
export interface State { n: number; alpha: Alpha }
export const initial: State = { n: 16, alpha: '0.5' };

export const factorLabel: Record<Alpha, string> = { '0': '$c$ = 1', '0.5': '$c$ = $N$^{−1/2}', '1': '$c$ = $N$^{−1}', '1.5': '$c$ = $N$^{−3/2}' };

const logBinomial = (n: number, m: number) => { let total = 0; for (let index = 1; index <= m; index++) total += Math.log10(n - m + index) - Math.log10(index); return total; };

/** log10 lengths of the order-m terms: shared C(N,m)c^m, independent √C(N,m)·c^m. */
export function terms(state: State) {
  const logC = -Number(state.alpha) * Math.log10(state.n);
  return Array.from({ length: state.n + 1 }, (_, m) => {
    const binomial = logBinomial(state.n, m);
    return { m, shared: binomial + m * logC, untied: binomial / 2 + m * logC };
  });
}

const logSumSquares = (logs: number[]) => { const top = Math.max(...logs); return top + 0.5 * Math.log10(logs.reduce((sum, value) => sum + 10 ** (2 * (value - top)), 0)); };

export function norms(state: State) {
  const list = terms(state);
  const c = state.n ** -Number(state.alpha);
  return { shared: 10 ** logSumSquares(list.map(term => term.shared)), untied: (1 + c * c) ** (state.n / 2), firstShared: state.n * c, firstUntied: Math.sqrt(state.n) * c };
}

const copy = {
  zh: {
    n: '循环次数 $N$', alpha: '残差分支系数', shared: '共享权重', untied: '独立权重',
    x: '阶数 $m$', y: '第 $m$ 阶项的长度',
    normShared: '共享权重：‖$x$^{$N$}‖', normUntied: '独立权重：‖$x$^{$N$}‖', first: '一阶项：$N$·$c$ 对 √$N$·$c$',
    tip: (m: number, shared: number, untied: number) => `m = ${m}\n共享权重 ${compact(shared)} · 独立权重 ${compact(untied)}`,
    aria: (n: number, label: string) => `柱状图：N = ${n}、${label} 时，展开式中各阶项的长度，共享权重与独立权重各一组柱。`,
  },
  en: {
    n: 'Loop count $N$', alpha: 'Branch multiplier', shared: 'Shared weights', untied: 'Independent weights',
    x: 'Order $m$', y: 'Length of the order-$m$ term',
    normShared: 'Shared: ‖$x$^{$N$}‖', normUntied: 'Independent: ‖$x$^{$N$}‖', first: 'First order: $N$·$c$ vs. √$N$·$c$',
    tip: (m: number, shared: number, untied: number) => `m = ${m}\nshared ${compact(shared)} · independent ${compact(untied)}`,
    aria: (n: number, label: string) => `Bar chart: length of each order of the expansion for N = ${n} and ${label}, one bar for shared and one for independent weights.`,
  },
};

export function controls(state: State, language: Lang): Control[] {
  const text = copy[language];
  return [
    { key: 'n', label: text.n, value: String(state.n), options: counts.map(n => ({ value: String(n), label: String(n) })) },
    { key: 'alpha', label: text.alpha, value: state.alpha, options: alphas.map(alpha => ({ value: alpha, label: factorLabel[alpha] })) },
  ];
}
export const parse = (key: string, value: string, state: State): State => key === 'n' ? { ...state, n: Number(value) } : { ...state, alpha: value as Alpha };

const frames: Record<'wide' | 'narrow', Frame> = {
  wide: { width: 760, height: 300, left: 76, right: 16, top: 14, bottom: 50 },
  narrow: { width: 360, height: 280, left: 60, right: 10, top: 14, bottom: 50 },
};

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const list = terms(state);
  const top = Math.ceil(Math.max(...list.map(term => term.shared)) + 1e-9);
  const floor = Math.max(top - 14, Math.min(-1, Math.floor(Math.min(...list.map(term => term.untied)))), -8);
  const span = top - floor;
  const every = span > 12 ? 4 : span > 6 ? 2 : 1;
  const ticks = decadeTicks(10 ** floor, 10 ** top).filter(value => Math.round(top - Math.log10(value)) % every === 0);
  const chart = variants(variant => {
    const frame = frames[variant];
    const { x0, x1, y0, y1 } = box(frame);
    const band = (x1 - x0) / (state.n + 1);
    const x = linear([0, state.n], [x0 + band / 2, x1 - band / 2]);
    const y = log10Scale([10 ** floor, 10 ** top], [y1, y0]);
    const bar = Math.min(variant === 'wide' ? 22 : 12, band * 0.42);
    const step = state.n <= 16 ? (variant === 'narrow' && state.n === 16 ? 2 : 1) : state.n === 32 ? 4 : 8;
    const xTicks = list.filter(term => term.m % step === 0).map(term => term.m);
    const bars = list.map(term => {
      const column = (value: number, offset: number, className: string) => value <= floor ? '' : leaf('rect', { class: className, x: x(term.m) + offset, y: y(10 ** value), width: bar, height: Math.max(0.5, y1 - y(10 ** value)) });
      return el('g', { class: 'lm-term', 'data-tip': text.tip(term.m, 10 ** term.shared, 10 ** term.untied) }, [
        leaf('rect', { class: 'hit', x: x(term.m) - band / 2, y: y0, width: band, height: y1 - y0 }),
        column(term.shared, -bar - 0.5, 'lm-bar is-loop'),
        column(term.untied, 0.5, 'lm-bar is-base'),
      ]);
    }).join('');
    return svg(variant, frame.width, frame.height, text.aria(state.n, factorLabel[state.alpha].replaceAll('$', '')),
      yAxis(y, ticks, frame, value => compact(value), text.y) + xAxis(x, xTicks, frame, value => String(value), text.x) + bars);
  });
  const legend = el('div', { class: 'smelt-legend lm-legend' }, [
    el('span', { class: 'is-loop' }, `<i class="lm-swatch-bar"></i><span>${html(text.shared)}</span>`),
    el('span', { class: 'is-base' }, `<i class="lm-swatch-bar"></i><span>${html(text.untied)}</span>`),
  ]);
  const value = norms(state);
  return legend + chart + stats([
    { value: compact(value.shared), label: text.normShared, tone: 'loop' },
    { value: compact(value.untied), label: text.normUntied, tone: 'base' },
    { value: `${compact(value.firstShared)} / ${compact(value.firstUntied)}`, label: text.first },
  ]);
}

