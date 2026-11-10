// Figure 7: final validation loss against the base learning rate for N = 1, 2,
// 4, 8. At L = 12 the four loop factors are compared; at L = 24 and 48 only
// Loop-μP was trained. Stars mark each N's best learning rate and a dashed line
// joins them, so a vertical line means the optimum did not move. The side chart
// gives the best loss of each loop factor at L = 12. Data: lr-transfer.json.
import data from '../../data/loop-mup/lr-transfer.json';
import { ticks } from '../smelt/plot';
import { box, linear, log2Scale, series, xAxis, yAxis, type Frame } from './chart';
import { el, html, leaf, learningRate, pick, stats, svg, svgText, variants, type Control, type Lang, type Table } from './markup';

export const factors = ['none', 'sqrt', 'linear', 'threehalves'] as const;
export type Factor = typeof factors[number];
export const depths = ['12', '24', '48'] as const;
export interface State { factor: Factor; layers: typeof depths[number] }
export const initial: State = { factor: 'linear', layers: '12' };

export const factorLabel: Record<Factor, { zh: string; en: string }> = {
  none: { zh: '不缩放（1）', en: 'Unscaled (1)' },
  sqrt: { zh: '$N$^{−1/2}', en: '$N$^{−1/2}' },
  linear: { zh: '$N$^{−1}（Loop-μP）', en: '$N$^{−1} (Loop-μP)' },
  threehalves: { zh: '$N$^{−3/2}', en: '$N$^{−3/2}' },
};
const factorClass: Record<Factor, string> = { none: 'is-a0', sqrt: 'is-a05', linear: 'is-a1', threehalves: 'is-a15' };
const loopClass = ['is-n1', 'is-n2', 'is-n4', 'is-n8'];

type Panel = typeof data.panels[number];
export const panelOf = (state: State): Panel => data.panels.find(panel => panel.factor === state.factor && String(panel.layers) === state.layers)!;

/** Index of the lowest final loss among the runs that did not diverge. */
export function best(panel: Panel, loop: number) {
  let index = -1;
  panel.loss[loop]!.forEach((value, position) => { if (panel.ok[loop]![position] && (index < 0 || value < panel.loss[loop]![index]!)) index = position; });
  return index;
}

const domains: Record<string, [number, number]> = Object.fromEntries(depths.map(layers => {
  const values = data.panels.filter(panel => String(panel.layers) === layers).flatMap(panel => panel.loss.flatMap((row, loop) => row.filter((_, index) => panel.ok[loop]![index])));
  const low = Math.floor((Math.min(...values) - 0.004) * 50) / 50;
  const high = Math.ceil((Math.max(...values) + 0.004) * 50) / 50;
  return [layers, [low, high]];
}));

const copy = {
  zh: {
    factor: '循环因子', layers: '层数 $L$', loss: '最终验证 loss', lr: '基础学习率 $η$_{0}（×10⁻³）', diverged: '发散',
    side: '$L$ = 12 时各循环因子的最低 loss', loops: '循环次数 $N$',
    bestAt: (n: number) => `$N$ = ${n} 时最优的 $η$_{0}`,
    tip: (n: number, lr: number, loss: number, ok: boolean) => `N = ${n}，η₀ = ${learningRate(lr)}\n${ok ? `loss ${loss.toFixed(3)}` : '发散'}`,
    sideTip: (factor: string, n: number, loss: number) => `${factor}\nN = ${n}：最低 loss ${loss.toFixed(3)}`,
    aria: (factor: string, layers: string) => `折线图：L = ${layers}、循环因子 ${factor} 时，N = 1、2、4、8 的最终验证 loss 随基础学习率的变化，星号标出各 N 的最优学习率；右侧为 L = 12 时四种循环因子的最低 loss。`,
    table: '数据表', panel: '设置',
  },
  en: {
    factor: 'Loop factor', layers: 'Layers $L$', loss: 'Final validation loss', lr: 'Base learning rate $η$_{0} (×10⁻³)', diverged: 'diverged',
    side: 'Best loss of each loop factor at $L$ = 12', loops: 'Loop count $N$',
    bestAt: (n: number) => `Best $η$_{0} at $N$ = ${n}`,
    tip: (n: number, lr: number, loss: number, ok: boolean) => `N = ${n}, η₀ = ${learningRate(lr)}\n${ok ? `loss ${loss.toFixed(3)}` : 'diverged'}`,
    sideTip: (factor: string, n: number, loss: number) => `${factor}\nN = ${n}: best loss ${loss.toFixed(3)}`,
    aria: (factor: string, layers: string) => `Line chart: final validation loss against the base learning rate for N = 1, 2, 4 and 8 at L = ${layers} with loop factor ${factor}; stars mark each N's best learning rate. A side chart shows the best loss of the four loop factors at L = 12.`,
    table: 'Data table', panel: 'Setting',
  },
};

export function controls(state: State, language: Lang): Control[] {
  const text = copy[language];
  return [
    { key: 'factor', label: text.factor, value: state.factor, options: factors.map(factor => ({ value: factor, label: factorLabel[factor][language] })) },
    { key: 'layers', label: text.layers, value: state.layers, options: depths.map(layers => ({ value: layers, label: layers })) },
  ];
}

// L = 24 and 48 were trained with Loop-μP only, so the two controls move together.
export function parse(key: string, value: string, state: State): State {
  if (key === 'factor') return { factor: value as Factor, layers: value === 'linear' ? state.layers : '12' };
  return { factor: value === '12' ? state.factor : 'linear', layers: value as State['layers'] };
}

const plain = (label: string) => label.replaceAll('$', '').replace('^{−1/2}', '^−1/2').replace('^{−1}', '^−1').replace('^{−3/2}', '^−3/2');
const lrLabel = (value: number) => String(Number((value * 1000).toPrecision(3)));

function main(state: State, language: Lang, frame: Frame, offsetX: number, offsetY: number) {
  const text = copy[language];
  const panel = panelOf(state);
  const { x0, x1, y0, y1 } = box(frame);
  const x = linear([0, panel.lr.length - 1], [x0 + 12, x1 - 12]);
  const y = linear(domains[state.layers]!, [y1, y0]);
  const [low, high] = domains[state.layers]!;
  const gridValues = ticks(low, high, 5);
  const lines = data.loops.map((n, loop) => {
    const points = panel.lr.map((lr, index) => ({ lr, index, loss: panel.loss[loop]![index]!, ok: panel.ok[loop]![index]! }));
    const kept = points.filter(point => point.ok);
    const crosses = points.filter(point => !point.ok).map(point => el('g', { class: `lm-diverged ${loopClass[loop]}`, 'data-tip': text.tip(n, point.lr, point.loss, false) }, [
      leaf('circle', { class: 'hit', cx: x(point.index), cy: y0 - 2, r: 10 }),
      leaf('path', { d: `M${(x(point.index) - 4).toFixed(2)} ${(y0 - 6).toFixed(2)}l8 8m0 -8l-8 8` }),
    ])).join('');
    return series(kept.map(point => ({ x: x(point.index), y: y(point.loss), tip: text.tip(n, point.lr, point.loss, true) })), loopClass[loop]!) + crosses;
  }).join('');
  const stars = data.loops.map((_, loop) => { const index = best(panel, loop); return { x: x(index), y: y(panel.loss[loop]![index]!), loop }; });
  const envelope = leaf('path', { class: 'lm-envelope', d: stars.map((star, index) => `${index ? 'L' : 'M'}${star.x.toFixed(2)} ${star.y.toFixed(2)}`).join('') });
  const starMarks = stars.map(star => {
    const points = Array.from({ length: 10 }, (_, index) => { const angle = -Math.PI / 2 + index * Math.PI / 5; const radius = index % 2 ? 3.4 : 8; return `${(star.x + radius * Math.cos(angle)).toFixed(2)},${(star.y + radius * Math.sin(angle)).toFixed(2)}`; }).join(' ');
    return leaf('polygon', { class: `lm-best ${loopClass[star.loop]}`, points });
  }).join('');
  return el('g', { transform: offsetX || offsetY ? `translate(${offsetX} ${offsetY})` : undefined }, [
    yAxis(y, gridValues, frame, value => value.toFixed(2), text.loss),
    xAxis(x, panel.lr.map((_, index) => index), frame, index => lrLabel(panel.lr[index]!), text.lr),
    lines, envelope, starMarks,
  ].join(''));
}

function side(state: State, language: Lang, frame: Frame, offsetX: number, offsetY: number) {
  const text = copy[language];
  const { x0, x1, y0, y1 } = box(frame);
  const x = log2Scale([1, 8], [x0 + 10, x1 - 10]);
  const rows = factors.map(factor => {
    const panel = data.panels.find(candidate => candidate.factor === factor && candidate.layers === 12)!;
    return { factor, values: data.loops.map((_, loop) => panel.loss[loop]![best(panel, loop)]!) };
  });
  const all = rows.flatMap(row => row.values);
  const low = Math.floor((Math.min(...all) - 0.005) * 50) / 50;
  const high = Math.ceil((Math.max(...all) + 0.005) * 50) / 50;
  const y = linear([low, high], [y1, y0]);
  const lines = rows.map(row => series(row.values.map((value, loop) => ({ x: x(data.loops[loop]!), y: y(value), tip: text.sideTip(plain(factorLabel[row.factor][language]), data.loops[loop]!, value) })), `${factorClass[row.factor]}${row.factor === state.factor || (state.layers !== '12' && row.factor === 'linear') ? ' is-active' : ' is-faint'}`, { radius: 3 })).join('');
  const short: Record<Factor, string> = { none: pick(language, '不缩放', 'Unscaled'), sqrt: '$N$^{−1/2}', linear: '$N$^{−1}', threehalves: '$N$^{−3/2}' };
  const columns = frame.width > 300 ? 4 : 2;
  const key = factors.map((factor, index) => {
    const kx = x0 - 40 + (index % columns) * ((frame.width - 20) / columns);
    const ky = 36 + Math.floor(index / columns) * 20;
    return el('g', { class: factorClass[factor] }, leaf('line', { class: 'lm-line', x1: kx, x2: kx + 16, y1: ky - 4.5, y2: ky - 4.5 }) + el('text', { class: 'lm-key-label', x: kx + 22, y: ky }, svgText(short[factor])));
  }).join('');
  return el('g', { transform: `translate(${offsetX} ${offsetY})` }, [
    el('text', { class: 'lm-side-title', x: x0 - 40, y: 14 }, svgText(text.side)),
    key,
    yAxis(y, ticks(low, high, 4), frame, value => value.toFixed(2)),
    xAxis(x, data.loops, frame, value => String(value), text.loops),
    lines,
  ].join(''));
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const panel = panelOf(state);
  const label = text.aria(plain(factorLabel[state.factor][language]), state.layers);
  const chart = variants(variant => variant === 'wide'
    ? svg(variant, 760, 336, label, main(state, language, { width: 520, height: 336, left: 66, right: 10, top: 22, bottom: 52 }, 0, 0) + side(state, language, { width: 222, height: 336, left: 52, right: 8, top: 78, bottom: 52 }, 538, 0))
    : svg(variant, 360, 590, label, main(state, language, { width: 360, height: 320, left: 58, right: 8, top: 22, bottom: 52 }, 0, 0) + side(state, language, { width: 360, height: 246, left: 58, right: 16, top: 60, bottom: 50 }, 0, 344)));
  const legend = el('div', { class: 'smelt-legend lm-legend' }, [
    ...data.loops.map((n, loop) => el('span', { class: loopClass[loop] }, `<i class="smelt-swatch"></i><span>${html(`$N$ = ${n}`)}</span>`)),
    el('span', { class: 'lm-legend-star' }, `<i class="lm-swatch-star">★</i><span>${pick(language, '最优学习率', 'best learning rate')}</span>`),
    panel.ok.some(row => row.some(ok => !ok)) ? el('span', { class: 'lm-legend-diverged' }, `<i>✕</i><span>${text.diverged}</span>`) : '',
  ]);
  return legend + chart + stats(data.loops.map((n, loop) => {
    const index = best(panel, loop);
    return { value: lrLabel(panel.lr[index]!), note: '×10⁻³', label: text.bestAt(n), tone: loop === 3 ? 'loop' : undefined };
  }));
}

export function table(language: Lang): Table {
  const text = copy[language];
  return {
    summary: text.table,
    head: [text.panel, '$N$', ...data.panels[0]!.lr.map(lr => `$η$_{0} = ${lrLabel(lr)}`)],
    rows: data.panels.flatMap(panel => data.loops.map((n, loop) => {
      const index = best(panel, loop);
      return {
        cells: [`$L$ = ${panel.layers} · ${factorLabel[panel.factor as Factor][language]}`, String(n), ...panel.loss[loop]!.map((value, position) => panel.ok[loop]![position] ? value.toFixed(3) : text.diverged)],
        best: [false, false, ...panel.lr.map((_, position) => position === index)],
      };
    })),
  };
}

