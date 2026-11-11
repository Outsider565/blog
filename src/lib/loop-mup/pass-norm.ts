// Figure 9: L2 norm of the residual stream after the embedding (pass 0) and
// after every pass of trained Loop-μP models with N = 2, 4, 8. Data:
// pass-norm.json.
import data from '../../data/loop-mup/pass-norm.json';
import { decadeTicks } from '../smelt/plot';
import { box, linear, log10Scale, series, xAxis, yAxis, type Frame } from './chart';
import { compact, el, html, stats, svg, variants, type Control, type Lang, type Table } from './markup';

export const depths = ['12', '24', '48'] as const;
export interface State { layers: typeof depths[number] }
export const initial: State = { layers: '12' };
const loops = ['2', '4', '8'] as const;
const loopClass: Record<string, string> = { '2': 'is-n2', '4': 'is-n4', '8': 'is-n8' };

const copy = {
  zh: {
    layers: '层数 $L$', x: '循环轮次', y: '残差流范数 ‖$x$‖_{2}',
    final: (n: string) => `$N$ = ${n}：最后一轮循环后`, ratio: '最终范数最大/最小比值',
    tip: (n: string, pass: number, value: number) => `N = ${n}\n${pass === 0 ? 'Embedding 输出' : `第 ${pass} 轮循环后`}：${compact(value)}`,
    aria: (layers: string) => `折线图：L = ${layers} 的 Loop-μP 模型训练后，残差流范数随循环轮次的变化（N = 2、4、8）。`,
    table: '数据表', pass: '循环轮次',
  },
  en: {
    layers: 'Layers $L$', x: 'After pass', y: 'Residual-stream norm ‖$x$‖_{2}',
    final: (n: string) => `$N$ = ${n}: after the last pass`, ratio: 'Max/min ratio of the final norms',
    tip: (n: string, pass: number, value: number) => `N = ${n}\n${pass === 0 ? 'embedding output' : `after pass ${pass}`}: ${compact(value)}`,
    aria: (layers: string) => `Line chart: residual-stream norm after each pass of trained Loop-μP models with L = ${layers}, one line each for N = 2, 4 and 8.`,
    table: 'Data table', pass: 'Pass',
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'layers', label: copy[language].layers, value: state.layers, options: depths.map(layers => ({ value: layers, label: layers })) }];
}
export const parse = (_key: string, value: string): State => ({ layers: value as State['layers'] });

const frames: Record<'wide' | 'narrow', Frame> = {
  wide: { width: 760, height: 300, left: 76, right: 24, top: 14, bottom: 52 },
  narrow: { width: 360, height: 280, left: 60, right: 14, top: 14, bottom: 52 },
};

const norms = (layers: string) => (data.norm as Record<string, Record<string, number[]>>)[layers]!;

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const rows = norms(state.layers);
  const chart = variants(variant => {
    const frame = frames[variant];
    const { x0, x1, y0, y1 } = box(frame);
    const x = linear([0, 8], [x0 + 10, x1 - 10]);
    const y = log10Scale([1, 10000], [y1, y0]);
    const lines = loops.map(n => series(rows[n]!.map((value, pass) => ({ x: x(pass), y: y(value), tip: text.tip(n, pass, value) })), loopClass[n]!)).join('');
    return svg(variant, frame.width, frame.height, text.aria(state.layers),
      yAxis(y, decadeTicks(1, 10000), frame, value => compact(value), text.y) + xAxis(x, [0, 1, 2, 3, 4, 5, 6, 7, 8], frame, value => String(value), text.x) + lines);
  });
  const finals = loops.map(n => rows[n]![rows[n]!.length - 1]!);
  const legend = el('div', { class: 'smelt-legend lm-legend' }, loops.map(n => el('span', { class: loopClass[n] }, `<i class="smelt-swatch"></i><span>${html(`$N$ = ${n}`)}</span>`)).join(''));
  return legend + chart + stats([
    ...loops.map((n, index) => ({ value: compact(finals[index]!, 3), label: text.final(n), tone: n === '8' ? 'loop' as const : undefined })),
    { value: `×${(Math.max(...finals) / Math.min(...finals)).toFixed(2)}`, label: text.ratio },
  ]);
}

export function table(language: Lang): Table {
  const text = copy[language];
  return {
    summary: text.table,
    head: ['$L$', '$N$', ...Array.from({ length: 9 }, (_, pass) => `${text.pass} ${pass}`)],
    rows: depths.flatMap(layers => loops.map(n => ({ cells: [layers, n, ...Array.from({ length: 9 }, (_, pass) => { const value = norms(layers)[n]![pass]; return value === undefined ? '—' : compact(value, 4); })] }))),
  };
}

