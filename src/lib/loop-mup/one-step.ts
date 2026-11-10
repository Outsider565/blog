// Figure 6: RMS change of the final residual stream after AdamW steps 1–10 at
// one learning rate shared across N, for the four loop factors N^{−α_N}.
// Data: init-scaling.json.
import data from '../../data/loop-mup/init-scaling.json';
import { decadeTicks } from '../smelt/plot';
import { box, log10Scale, log2Scale, series, xAxis, yAxis, type Frame } from './chart';
import { compact, el, html, stats, svg, svgText, variants, type Control, type Lang, type Table } from './markup';
import { alphas, type Alpha } from './init-norm';

export interface State { step: number }
export const initial: State = { step: 1 };
export const steps = Array.from({ length: 10 }, (_, index) => index + 1);

export const alphaLabel: Record<Alpha, string> = { '0': '$α$_{$N$} = 0', '0.5': '$α$_{$N$} = 1/2', '1': '$α$_{$N$} = 1', '1.5': '$α$_{$N$} = 3/2' };
export const alphaClass: Record<Alpha, string> = { '0': 'is-a0', '0.5': 'is-a05', '1': 'is-a1', '1.5': 'is-a15' };

const all = alphas.flatMap(alpha => data.step[alpha].flat());
const range: [number, number] = [10 ** Math.floor(Math.log10(Math.min(...all))), 10 ** Math.ceil(Math.log10(Math.max(...all)))];

const copy = {
  zh: {
    control: 'AdamW 步数', x: '循环次数 $N$', y: '一步后残差流的变化',
    ratio: (alpha: string) => `${alpha}：$N$ 从 1 到 64`,
    tip: (alpha: string, k: number, value: number) => `${alpha}\nN = ${k}：${compact(value)}`,
    aria: (step: number) => `折线图：第 ${step} 步 AdamW 更新后，最终残差流变化量随循环次数 N 的变化，四种循环因子各一条线。`,
    table: '数据表', step: '步数',
  },
  en: {
    control: 'AdamW step', x: 'Loop count $N$', y: 'Change of the residual stream',
    ratio: (alpha: string) => `${alpha}: $N$ from 1 to 64`,
    tip: (alpha: string, k: number, value: number) => `${alpha}\nN = ${k}: ${compact(value)}`,
    aria: (step: number) => `Line chart: RMS change of the final residual stream after AdamW step ${step} against the loop count N, one line per loop factor.`,
    table: 'Data table', step: 'Step',
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'step', label: copy[language].control, value: String(state.step), options: steps.map(step => ({ value: String(step), label: String(step) })) }];
}
export const parse = (_key: string, value: string): State => ({ step: Number(value) });

const frames: Record<'wide' | 'narrow', Frame> = {
  wide: { width: 760, height: 320, left: 76, right: 118, top: 16, bottom: 52 },
  narrow: { width: 360, height: 300, left: 60, right: 22, top: 16, bottom: 52 },
};

const ascii = (label: string) => label.replaceAll('$', '').replace('_{N}', 'N');

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const k = data.k;
  const at = (alpha: Alpha) => data.step[alpha][state.step - 1]!;
  const chart = variants(variant => {
    const frame = frames[variant];
    const { x0, x1, y0, y1 } = box(frame);
    const x = log2Scale([1, 64], [x0 + 8, x1 - 8]);
    const y = log10Scale(range, [y1, y0]);
    const lines = alphas.map(alpha => series(at(alpha).map((value, index) => ({ x: x(k[index]!), y: y(value), tip: text.tip(ascii(alphaLabel[alpha]), k[index]!, value) })), alphaClass[alpha])).join('');
    const labels = variant === 'wide' ? alphas.map(alpha => el('text', { class: `lm-series-label ${alphaClass[alpha]}`, x: x(64) + 12, y: y(at(alpha)[k.length - 1]!) + 4.5 }, svgText(alphaLabel[alpha]))).join('') : '';
    return svg(variant, frame.width, frame.height, text.aria(state.step),
      yAxis(y, decadeTicks(range[0], range[1]), frame, value => compact(value), text.y) + xAxis(x, k, frame, value => String(value), text.x) + lines + labels);
  });
  const legend = el('div', { class: 'smelt-legend lm-legend' }, alphas.map(alpha => el('span', { class: alphaClass[alpha] }, `<i class="smelt-swatch"></i><span>${html(alphaLabel[alpha])}</span>`)).join(''));
  return chart + legend + stats(alphas.map(alpha => {
    const values = at(alpha);
    const ratio = values[values.length - 1]! / values[0]!;
    return { value: `×${compact(ratio, 2)}`, label: text.ratio(alphaLabel[alpha]), tone: alpha === '1' ? 'loop' : undefined };
  }));
}

export function table(language: Lang): Table {
  const text = copy[language];
  return {
    summary: text.table,
    head: [text.step, '$N$', ...alphas.map(alpha => alphaLabel[alpha])],
    rows: steps.flatMap(step => data.k.map((k, index) => ({ cells: [String(step), String(k), ...alphas.map(alpha => compact(data.step[alpha][step - 1]![index]!))] }))),
  };
}
