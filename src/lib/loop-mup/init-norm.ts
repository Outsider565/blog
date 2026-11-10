// Figure 2: residual-stream norm at initialization for looped (N loops of one
// 12-layer stack) and untied (m_L independent stacks) Transformers, under the
// four branch multipliers. Data: init-scaling.json.
import data from '../../data/loop-mup/init-scaling.json';
import { decadeTicks } from '../smelt/plot';
import { box, log10Scale, log2Scale, series, xAxis, yAxis, type Frame } from './chart';
import { compact, el, plain, stats, svg, svgText, variants, type Control, type Lang, type Table } from './markup';

export const alphas = ['0', '0.5', '1', '1.5'] as const;
export type Alpha = typeof alphas[number];
export interface State { alpha: Alpha }
export const initial: State = { alpha: '0' };

export const multiplier: Record<Alpha, { zh: string; en: string }> = {
  '0': { zh: '不缩放（1）', en: 'Unscaled (1)' },
  '0.5': { zh: '$N$^{−1/2} 或 $m$_{$L$}^{−1/2}', en: '$N$^{−1/2} or $m$_{$L$}^{−1/2}' },
  '1': { zh: '$N$^{−1} 或 $m$_{$L$}^{−1}', en: '$N$^{−1} or $m$_{$L$}^{−1}' },
  '1.5': { zh: '$N$^{−3/2} 或 $m$_{$L$}^{−3/2}', en: '$N$^{−3/2} or $m$_{$L$}^{−3/2}' },
};

const copy = {
  zh: {
    control: '残差分支系数', loop: '循环模型', untied: '非循环模型',
    x: '循环次数 $N$ 或深度倍数 $m$_{$L$}', y: '残差流范数 ‖$x$‖_{rms}',
    at64: (kind: string) => `${kind}，$N$ 或 $m$_{$L$} = 64`,
    tip: (kind: string, k: number, value: number) => `${kind}\n${kind === '循环模型' ? 'N' : 'm_L'} = ${k}：‖x‖ = ${compact(value)}`,
    aria: (label: string) => `折线图：分支系数为 ${label} 时，循环模型与非循环模型在初始化时的残差流范数随 N 或 m_L 的变化。`,
    table: '数据表', k: '$N$ 或 $m$_{$L$}',
  },
  en: {
    control: 'Branch multiplier', loop: 'Looped', untied: 'Untied',
    x: 'Loop count $N$ or depth multiplier $m$_{$L$}', y: 'Residual-stream norm ‖$x$‖_{rms}',
    at64: (kind: string) => `${kind}, $N$ or $m$_{$L$} = 64`,
    tip: (kind: string, k: number, value: number) => `${kind}\n${kind === 'Looped' ? 'N' : 'm_L'} = ${k}: ‖x‖ = ${compact(value)}`,
    aria: (label: string) => `Line chart: residual-stream norm at initialization against N or m_L for looped and untied models with branch multiplier ${label}.`,
    table: 'Data table', k: '$N$ or $m$_{$L$}',
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'alpha', label: copy[language].control, value: state.alpha, options: alphas.map(alpha => ({ value: alpha, label: multiplier[alpha][language] })) }];
}
export const parse = (_key: string, value: string): State => ({ alpha: value as Alpha });

const frames: Record<'wide' | 'narrow', Frame> = {
  wide: { width: 760, height: 320, left: 76, right: 130, top: 16, bottom: 52 },
  narrow: { width: 360, height: 300, left: 60, right: 84, top: 16, bottom: 52 },
};

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const k = data.k;
  const loop = data.norm.loop[state.alpha];
  const untied = data.norm.untied[state.alpha];
  const chart = variants(variant => {
    const frame = frames[variant];
    const { x0, x1, y0, y1 } = box(frame);
    const x = log2Scale([1, 64], [x0 + 8, x1 - 8]);
    const y = log10Scale([0.01, 100], [y1, y0]);
    const line = (values: number[], kind: 'loop' | 'untied') => series(values.map((value, index) => ({ x: x(k[index]!), y: y(value), tip: text.tip(kind === 'loop' ? text.loop : text.untied, k[index]!, value) })), kind === 'loop' ? 'is-loop' : 'is-base');
    const endLabel = (values: number[], kind: 'loop' | 'untied', other: number[]) => {
      const last = values[values.length - 1]!;
      const gap = Math.abs(y(last) - y(other[other.length - 1]!));
      const nudge = gap < 30 ? (y(last) < y(other[other.length - 1]!) ? -9 : 9) : 0;
      return el('text', { class: kind === 'loop' ? 'loop-text' : 'base-text', x: x(64) + 12, y: y(last) + 4.5 + nudge }, svgText(`${kind === 'loop' ? text.loop : text.untied} ${compact(last)}`));
    };
    return svg(variant, frame.width, frame.height, text.aria(plain(multiplier[state.alpha][language])),
      yAxis(y, decadeTicks(0.01, 100), frame, value => compact(value), text.y)
      + xAxis(x, k, frame, value => String(value), text.x)
      + line(untied, 'untied') + line(loop, 'loop')
      + (variant === 'wide' ? endLabel(loop, 'loop', untied) + endLabel(untied, 'untied', loop) : ''));
  });
  return chart + stats([
    { value: compact(loop[loop.length - 1]!), label: text.at64(text.loop), tone: 'loop' },
    { value: compact(untied[untied.length - 1]!), label: text.at64(text.untied), tone: 'base' },
  ]);
}

export function table(language: Lang): Table {
  const text = copy[language];
  return {
    summary: text.table,
    head: [text.k, ...alphas.flatMap(alpha => [`${text.loop} · ${multiplier[alpha][language]}`, `${text.untied} · ${multiplier[alpha][language]}`])],
    rows: data.k.map((k, index) => ({ cells: [String(k), ...alphas.flatMap(alpha => [compact(data.norm.loop[alpha][index]!), compact(data.norm.untied[alpha][index]!)])] })),
  };
}
