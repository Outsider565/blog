// Figure 4: the three-line ledger behind the choice of (α_N, γ_N). Each line is
// a number of pieces times the size of one piece, drawn as a bar of that many
// segments: N increments of size c_N at initialization, one feature update of
// the step size N^{−γ_N}, and N output pushes of size c_N·N^{−γ_N}. Values are
// relative to N = 1 (a = η = 1). Pure arithmetic; no measured data.
import { factorLabel } from './binomial';
import { alphas, type Alpha } from './init-norm';
import { compact, el, html, leaf, type Control, type Lang } from './markup';
import { region, verdict } from './phase';

export const counts = [1, 2, 4, 8, 16, 32, 64] as const;
export const gammas = ['0.5', '0', '-0.5'] as const;
export type Gamma = typeof gammas[number];
export interface State { n: number; alpha: Alpha; gamma: Gamma }
export const initial: State = { n: 8, alpha: '1', gamma: '0' };

/** The three lines: how many pieces, the size of one piece and the exponent of N in their product. */
export function rows(state: State) {
  const alpha = Number(state.alpha);
  const gamma = Number(state.gamma);
  const branch = state.n ** -alpha;
  const stepSize = state.n ** -gamma;
  return [
    { pieces: state.n, each: branch, exponent: 1 - alpha },
    { pieces: 1, each: stepSize, exponent: -gamma },
    { pieces: state.n, each: branch * stepSize, exponent: 1 - alpha - gamma },
  ];
}

const copy = {
  zh: {
    n: '循环次数 $N$', alpha: '残差分支系数', gamma: '学习率',
    rates: { '0.5': '÷ √$N$', '0': '不随 $N$ 变', '-0.5': '× √$N$' } as Record<Gamma, string>,
    reference: '虚线：$N$ = 1 时的大小', piece: '每一段：一份',
    names: ['初始化时的总增量', '一步更新后，单次循环的特征变化', '一步更新后，输出的变化'],
    formulas: [
      (n: number, each: string, total: string) => `$N$ 份 × 每份 $c$_{$N$} = ${n} × ${each} = ${total}`,
      (_: number, each: string) => `1 份 × 步长 = ${each}`,
      (n: number, each: string, total: string) => `$N$ 份 × 每份 $c$_{$N$}·步长 = ${n} × ${each} = ${total}`,
    ],
    status: { grow: '随 $N$ 增长', flat: '与 $N$ 无关', fade: '随 $N$ 趋于 0' },
    aria: (n: number, values: string[]) => `条形图：N = ${n} 时，初始化的总增量、单次循环的特征变化和输出的变化分别是 N = 1 时的 ${values.join('、')} 倍。`,
  },
  en: {
    n: 'Loop count $N$', alpha: 'Branch multiplier', gamma: 'Learning rate',
    rates: { '0.5': '÷ √$N$', '0': 'Same for every $N$', '-0.5': '× √$N$' } as Record<Gamma, string>,
    reference: 'Dashed line: the size at $N$ = 1', piece: 'Each segment: one piece',
    names: ['Total increment at initialization', 'Feature change of one loop after one step', 'Change of the output after one step'],
    formulas: [
      (n: number, each: string, total: string) => `$N$ pieces × $c$_{$N$} each = ${n} × ${each} = ${total}`,
      (_: number, each: string) => `1 piece × step size = ${each}`,
      (n: number, each: string, total: string) => `$N$ pieces × $c$_{$N$}·step size each = ${n} × ${each} = ${total}`,
    ],
    status: { grow: 'grows with $N$', flat: 'independent of $N$', fade: 'goes to 0 with $N$' },
    aria: (n: number, values: string[]) => `Bar chart: at N = ${n}, the total increment at initialization, the feature change of one loop and the change of the output are ${values.join(', ')} times their size at N = 1.`,
  },
};

export function controls(state: State, language: Lang): Control[] {
  const text = copy[language];
  return [
    { key: 'n', label: text.n, value: String(state.n), options: counts.map(n => ({ value: String(n), label: String(n) })) },
    { key: 'alpha', label: text.alpha, value: state.alpha, options: alphas.map(alpha => ({ value: alpha, label: factorLabel[alpha] })) },
    { key: 'gamma', label: text.gamma, value: state.gamma, options: gammas.map(gamma => ({ value: gamma, label: text.rates[gamma] })) },
  ];
}

export function parse(key: string, value: string, state: State): State {
  if (key === 'n') return { ...state, n: Number(value) };
  if (key === 'alpha') return { ...state, alpha: value as Alpha };
  return { ...state, gamma: value as Gamma };
}

// The track is 800 units wide and shows up to four times the N = 1 size.
const track = 800;
const span = 4;

function bar(pieces: number, each: number) {
  const width = each * track / span;
  const total = pieces * width;
  let body = '';
  if (width >= 4) {
    const gap = Math.min(2.5, width * 0.12);
    for (let index = 0; index < pieces && index * width < track; index++) body += leaf('rect', { x: index * width, y: 0, width: Math.max(0.5, Math.min(width - gap, track - index * width)), height: 20 });
  } else body = leaf('rect', { x: 0, y: 0, width: Math.max(2, Math.min(total, track)), height: 20 });
  return el('span', { class: `lm-ledger-track${total > track + 1e-6 ? ' is-over' : ''}`, 'aria-hidden': 'true' },
    el('svg', { viewBox: `0 0 ${track} 20`, preserveAspectRatio: 'none' }, body) + el('i', { class: 'lm-ledger-ref', style: `left:${100 / span}%` }));
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const list = rows(state);
  const lines = list.map((row, index) => {
    const status = Math.abs(row.exponent) < 1e-9 ? 'flat' : row.exponent > 0 ? 'grow' : 'fade';
    const tone = status === 'flat' ? 'good' : status === 'grow' || index === 2 ? 'bad' : 'muted';
    return el('div', { class: `lm-ledger-row is-${tone}` }, [
      el('span', { class: 'lm-ledger-name' }, html(text.names[index]!)),
      el('span', { class: 'lm-ledger-status' }, html(text.status[status])),
      el('span', { class: 'lm-ledger-formula' }, html(text.formulas[index]!(row.pieces, compact(row.each), compact(row.pieces * row.each)))),
      bar(row.pieces, row.each),
    ]);
  }).join('');
  const legend = el('div', { class: 'smelt-legend lm-legend' }, [
    el('span', {}, `<i class="lm-swatch-ref"></i><span>${html(text.reference)}</span>`),
    el('span', {}, `<i class="lm-swatch-bar"></i><span>${html(text.piece)}</span>`),
  ]);
  const current = { alpha: Number(state.alpha), gamma: Number(state.gamma), mode: 'loop' as const };
  const label = text.aria(state.n, list.map(row => compact(row.pieces * row.each)));
  return legend + el('div', { class: 'lm-ledger', role: 'img', 'aria-label': label }, lines)
    + el('p', { class: `lm-verdict is-${region(current)}` }, html(verdict(current, language)));
}
