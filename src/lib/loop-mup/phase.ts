// Figure 9: the plane of branch and learning-rate exponents (α, γ) for one
// residual block, either shared across N loops or untied across L layers. The
// branch multiplier is a·N^{−α} and the learning rate η·N^{−γ} (L for layers).
// Three scales decide each point: the forward residual (N^{1−α_N} for loops,
// L^{1/2−α_L} for independent layers), the per-block update (·^{−γ}) and the
// output response (·^{1−α−γ}). Loops leave one point; layers leave a segment.
import { el, html, leaf, svg, svgText, variants, type Control, type Lang } from './markup';

export type Mode = 'loop' | 'depth';
export interface State { alpha: number; gamma: number; mode: Mode }
export const initial: State = { alpha: 1, gamma: 0, mode: 'loop' };
export const step = 0.25;
export const limits = { alpha: [0, 2] as const, gamma: [-1, 1] as const };
const presets = [0, 0.5, 1, 1.5];

type Region = 'init' | 'training' | 'trivial' | 'loop-mup' | 'feasible';
/** The smallest branch exponent with a stable forward pass: aligned loops add as N, untied layers as √L. */
export const forwardBound = (mode: Mode) => mode === 'loop' ? 1 : 0.5;
export function region({ alpha, gamma, mode }: State): Region {
  if (alpha < forwardBound(mode)) return 'init';
  if (gamma < 0 || alpha + gamma < 1) return 'training';
  if (alpha + gamma > 1) return 'trivial';
  return mode === 'loop' ? 'loop-mup' : 'feasible';
}

/** Quarters as fractions: 0.75 → "3/4", −0.5 → "−1/2". */
export function fraction(value: number): string {
  const quarters = Math.round(value * 4);
  if (quarters === 0) return '0';
  const sign = quarters < 0 ? '−' : '';
  const magnitude = Math.abs(quarters);
  const divisor = magnitude % 4 === 0 ? 4 : magnitude % 2 === 0 ? 2 : 1;
  const numerator = magnitude / divisor;
  const denominator = 4 / divisor;
  return denominator === 1 ? `${sign}${numerator}` : `${sign}${numerator}/${denominator}`;
}

const symbol = (mode: Mode) => mode === 'loop' ? 'N' : 'L';

const copy = {
  zh: {
    mode: '权重', modes: { loop: '共享权重，循环 $N$ 次', depth: '独立权重，$L$ 层' } as Record<Mode, string>,
    presets: (mode: Mode) => `学习率不随 $${symbol(mode)}$ 变化（$γ$_{$${symbol(mode)}$} = 0）时的${mode === 'loop' ? '循环' : '深度'}因子`,
    regions: { init: '初始化不稳定', training: '训练不稳定', trivial: '更新消失', 'loop-mup': 'Loop-μP', feasible: '可行' } as Record<Region, string>,
    narrowInit: '初始化\n不稳定',
    verdict: (name: Region, { alpha, mode }: State) => {
      const v = symbol(mode);
      if (name === 'init') return `初始化不稳定：残差流随 $${v}$ 增长。`;
      if (name === 'training') return `训练不稳定：一步更新后的变化随 $${v}$ 增长。`;
      if (name === 'trivial') return `更新消失：一步更新对输出的影响随 $${v}$ 趋于 0。`;
      if (name === 'loop-mup') return 'Loop-μP：三个量都与 $N$ 无关。';
      if (alpha === 0.5) return 'Depth-μP：可行区间的左端点，初始化的残差增量与 $L$ 无关。';
      if (alpha === 1) return 'CompleteP：可行区间的右端点，学习率与 $L$ 无关。';
      return '可行：位于 Depth-μP 与 CompleteP 之间，输出的变化与 $L$ 无关。';
    },
    meters: (mode: Mode) => ['初始化时的残差增量', mode === 'loop' ? '一步更新后，第一次循环的变化' : '一步更新后，单层的变化', '一步更新后，输出的变化'],
    status: (mode: Mode) => ({ grow: `随 $${symbol(mode)}$ 增长`, flat: `与 $${symbol(mode)}$ 无关`, fade: `随 $${symbol(mode)}$ 趋于 0` }),
    axes: (mode: Mode) => [`分支系数指数 $α$_{$${symbol(mode)}$}`, `学习率指数 $γ$_{$${symbol(mode)}$}`],
    aria: (mode: Mode, alpha: string, gamma: string, verdict: string) => `相图（${mode === 'loop' ? '共享权重的循环' : '独立权重的层'}）：横轴 α_${symbol(mode)}，纵轴 γ_${symbol(mode)}。当前点 (${alpha}, ${gamma})，${verdict}`,
  },
  en: {
    mode: 'Weights', modes: { loop: 'Shared, $N$ loops', depth: 'Independent, $L$ layers' } as Record<Mode, string>,
    presets: (mode: Mode) => `${mode === 'loop' ? 'Loop' : 'Depth'} factor with an $${symbol(mode)}$-independent learning rate ($γ$_{$${symbol(mode)}$} = 0)`,
    regions: { init: 'Unstable at init', training: 'Unstable in training', trivial: 'Updates vanish', 'loop-mup': 'Loop-μP', feasible: 'Feasible' } as Record<Region, string>,
    narrowInit: 'Unstable\nat init',
    verdict: (name: Region, { alpha, mode }: State) => {
      const v = symbol(mode);
      if (name === 'init') return `Unstable at initialization: the residual stream grows with $${v}$.`;
      if (name === 'training') return `Unstable in training: the change after one step grows with $${v}$.`;
      if (name === 'trivial') return `Updates vanish: the effect of one step on the output goes to 0 with $${v}$.`;
      if (name === 'loop-mup') return 'Loop-μP: all three scales are independent of $N$.';
      if (alpha === 0.5) return 'Depth-μP: the left end of the feasible interval; the initial residual increment is independent of $L$.';
      if (alpha === 1) return 'CompleteP: the right end of the feasible interval; the learning rate is independent of $L$.';
      return 'Feasible: between Depth-μP and CompleteP; the output change is independent of $L$.';
    },
    meters: (mode: Mode) => ['Residual increment at initialization', mode === 'loop' ? 'Change of the first loop after one step' : 'Change of one layer after one step', 'Change of the output after one step'],
    status: (mode: Mode) => ({ grow: `grows with $${symbol(mode)}$`, flat: `independent of $${symbol(mode)}$`, fade: `goes to 0 with $${symbol(mode)}$` }),
    axes: (mode: Mode) => [`Branch exponent $α$_{$${symbol(mode)}$}`, `Learning-rate exponent $γ$_{$${symbol(mode)}$}`],
    aria: (mode: Mode, alpha: string, gamma: string, verdict: string) => `Phase diagram (${mode === 'loop' ? 'shared loops' : 'independent layers'}): α_${symbol(mode)} on the horizontal axis, γ_${symbol(mode)} on the vertical axis. Current point (${alpha}, ${gamma}): ${verdict}`,
  },
};

/** One sentence on where a point of the plane lands. */
export const verdict = (state: State, language: Lang) => copy[language].verdict(region(state), state);

export function controls(state: State, language: Lang): Control[] {
  const text = copy[language];
  const v = symbol(state.mode);
  const value = state.gamma === 0 && presets.includes(state.alpha) ? String(state.alpha) : '';
  const labels: Record<string, string> = { '0': '1', '0.5': `$${v}$^{−1/2}`, '1': `$${v}$^{−1}`, '1.5': `$${v}$^{−3/2}` };
  return [
    { key: 'mode', label: text.mode, value: state.mode, options: (['loop', 'depth'] as const).map(mode => ({ value: mode, label: text.modes[mode] })) },
    { key: 'preset', label: text.presets(state.mode), value, options: presets.map(alpha => ({ value: String(alpha), label: labels[String(alpha)]! })) },
  ];
}

export function parse(key: string, value: string, state: State): State {
  if (key === 'mode') return { ...state, mode: value as Mode };
  if (key === 'preset') return { ...state, alpha: Number(value), gamma: 0 };
  if (key === 'point') { const [alpha, gamma] = value.split(',').map(Number); return clampState({ ...state, alpha: alpha!, gamma: gamma! }); }
  return state;
}

export function clampState({ alpha, gamma, mode }: State): State {
  const snap = (value: number, [low, high]: readonly [number, number]) => Math.min(high, Math.max(low, Math.round(value / step) * step));
  return { alpha: snap(alpha, limits.alpha), gamma: snap(gamma, limits.gamma), mode };
}

/** Exponents of the forward residual, the per-block update and the output response. */
export const exponents = ({ alpha, gamma, mode }: State) => [forwardBound(mode) - alpha, -gamma, 1 - alpha - gamma];

const plane = { wide: { width: 420, height: 330, left: 58, right: 16, top: 16, bottom: 48 }, narrow: { width: 360, height: 300, left: 52, right: 12, top: 14, bottom: 46 } };

function diagram(state: State, language: Lang, variant: 'wide' | 'narrow') {
  const text = copy[language];
  const frame = plane[variant];
  const loop = state.mode === 'loop';
  const bound = forwardBound(state.mode);
  const x0 = frame.left, x1 = frame.width - frame.right, y0 = frame.top, y1 = frame.height - frame.bottom;
  const x = (alpha: number) => x0 + (alpha - limits.alpha[0]) / (limits.alpha[1] - limits.alpha[0]) * (x1 - x0);
  const y = (gamma: number) => y1 - (gamma - limits.gamma[0]) / (limits.gamma[1] - limits.gamma[0]) * (y1 - y0);
  const area = (className: string, corners: [number, number][]) => leaf('polygon', { class: className, points: corners.map(([alpha, gamma]) => `${x(alpha).toFixed(2)},${y(gamma).toFixed(2)}`).join(' ') });
  const label = (name: Region, alpha: number, gamma: number, source = text.regions[name]) => {
    const lines = source.split('\n');
    return el('text', { class: `lm-region-label is-${name}`, x: x(alpha), y: y(gamma) - (lines.length - 1) * 8, 'text-anchor': 'middle' },
      lines.map((line, index) => el('tspan', { x: x(alpha), dy: index ? 17 : 0 }, svgText(line))));
  };
  const grid = [0, 0.5, 1, 1.5, 2].map(alpha => el('text', { x: x(alpha), y: y1 + 18, 'text-anchor': 'middle' }, fraction(alpha)))
    .concat([-1, -0.5, 0, 0.5, 1].map(gamma => el('text', { x: x0 - 8, y: y(gamma) + 4.5, 'text-anchor': 'end' }, fraction(gamma)))).join('');
  const point = state;
  const star = (cx: number, cy: number, r: number) => {
    const points = Array.from({ length: 10 }, (_, index) => { const angle = -Math.PI / 2 + index * Math.PI / 5; const radius = index % 2 ? r * 0.45 : r; return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`; }).join(' ');
    return leaf('polygon', { class: 'lm-star', points });
  };
  // Loops: the forward bound α ≥ 1 meets the training bound α ≤ 1 in one point.
  // Layers: the forward bound drops to 1/2 and a segment of the diagonal survives.
  const regions = loop ? [
    area('lm-region is-init', [[0, -1], [1, -1], [1, 1], [0, 1]]),
    area('lm-region is-training', [[1, -1], [2, -1], [2, 0], [1, 0]]),
    area('lm-region is-trivial', [[1, 0], [2, 0], [2, 1], [1, 1]]),
  ] : [
    area('lm-region is-init', [[0, -1], [0.5, -1], [0.5, 1], [0, 1]]),
    area('lm-region is-training', [[0.5, -1], [2, -1], [2, 0], [1, 0], [0.5, 0.5]]),
    area('lm-region is-trivial', [[0.5, 0.5], [1, 0], [2, 0], [2, 1], [0.5, 1]]),
  ];
  const answer = loop
    ? el('g', { class: 'lm-loop-mup' }, [star(x(1), y(0), 11), el('text', { class: 'lm-star-label', x: x(1) - 14, y: y(0) - 12, 'text-anchor': 'end' }, 'Loop-μP')])
    : el('g', { class: 'lm-feasible' }, [
      leaf('line', { class: 'lm-feasible-line', x1: x(0.5), y1: y(0.5), x2: x(1), y2: y(0) }),
      leaf('circle', { class: 'lm-feasible-end', cx: x(0.5), cy: y(0.5), r: 5.5 }), leaf('circle', { class: 'lm-feasible-end', cx: x(1), cy: y(0), r: 5.5 }),
      el('text', { class: 'lm-feasible-label', x: x(0.5) + 11, y: y(0.5) - 9 }, 'Depth-μP'),
      el('text', { class: 'lm-feasible-label', x: x(1) + 11, y: y(0) - 9 }, 'CompleteP'),
    ]);
  const current = region(point);
  // Where the dashed diagonal is labelled: inside the "unstable at init" strip, which is narrower for layers.
  const note = loop ? 0.36 : 0.22;
  const [alphaTitle, gammaTitle] = text.axes(state.mode);
  const aria = text.aria(state.mode, fraction(point.alpha), fraction(point.gamma), text.verdict(current, state).replaceAll('$', ''));
  return svg(variant, frame.width, frame.height, aria, [
    ...regions,
    leaf('line', { class: 'lm-boundary', x1: x(bound), x2: x(bound), y1: y0, y2: y1 }),
    leaf('line', { class: 'lm-boundary', x1: x(1), x2: x1, y1: y(0), y2: y(0) }),
    leaf('line', { class: 'lm-diagonal', x1: x(0), x2: x(2), y1: y(1), y2: y(-1) }),
    el('text', { class: 'lm-diagonal-label', x: x(note), y: y(1 - note) - 8, transform: `rotate(${(Math.atan2(y(-1) - y(1), x(2) - x(0)) * 180 / Math.PI).toFixed(2)} ${x(note).toFixed(2)} ${(y(1 - note) - 8).toFixed(2)})`, 'text-anchor': 'middle' }, svgText(`$α$_{$${symbol(state.mode)}$} + $γ$_{$${symbol(state.mode)}$} = 1`)),
    loop ? label('init', 0.5, -0.62) : label('init', 0.25, -0.62, text.narrowInit),
    label('training', 1.5, -0.62), label('trivial', 1.5, 0.62),
    answer,
    leaf('line', { class: 'axis', x1: x0, x2: x1, y1, y2: y1 }), leaf('line', { class: 'axis', x1: x0, x2: x0, y1: y0, y2: y1 }), grid,
    el('text', { class: 'axis-title', x: (x0 + x1) / 2, y: frame.height - 6, 'text-anchor': 'middle' }, svgText(alphaTitle!)),
    el('text', { class: 'axis-title', transform: `translate(${x0 - 38} ${(y0 + y1) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, svgText(gammaTitle!)),
    el('g', { class: `lm-point is-${current}` }, [
      leaf('line', { class: 'lm-crosshair', x1: x0, x2: x(point.alpha), y1: y(point.gamma), y2: y(point.gamma) }),
      leaf('line', { class: 'lm-crosshair', x1: x(point.alpha), x2: x(point.alpha), y1: y1, y2: y(point.gamma) }),
      leaf('circle', { cx: x(point.alpha), cy: y(point.gamma), r: 7.5 }),
    ]),
    leaf('rect', { class: 'lm-plane-hit', x: x0, y: y0, width: x1 - x0, height: y1 - y0, 'data-lm-plane': '', 'data-lm-focus': 'plane', 'data-x0': x0, 'data-x1': x1, 'data-y0': y0, 'data-y1': y1, tabindex: 0, role: 'group', 'aria-label': aria }),
  ].join(''), 'lm-phase-svg');
}

function meters(state: State, language: Lang) {
  const text = copy[language];
  const v = symbol(state.mode);
  const formulas = [state.mode === 'loop' ? '$N$^{1−$α$_{$N$}}' : '$L$^{1/2−$α$_{$L$}}', `$${v}$^{−$γ$_{$${v}$}}`, `$${v}$^{1−$α$_{$${v}$}−$γ$_{$${v}$}}`];
  const names = text.meters(state.mode);
  const statuses = text.status(state.mode);
  const current = region(state);
  return el('div', { class: 'lm-meters' }, exponents(state).map((exponent, index) => {
    const status = Math.abs(exponent) < 1e-9 ? 'flat' : exponent > 0 ? 'grow' : 'fade';
    const tone = status === 'flat' ? 'good' : status === 'grow' || index === 2 ? 'bad' : 'muted';
    const width = Math.min(1, Math.abs(exponent) / 2) * 50;
    return el('div', { class: `lm-meter is-${tone}` }, [
      el('span', { class: 'lm-meter-name' }, html(names[index]!)),
      el('span', { class: 'lm-meter-formula' }, `∝ ${html(formulas[index]!)} = ${html(`$${v}$^{${fraction(exponent)}}`)}`),
      el('span', { class: 'lm-meter-bar', 'aria-hidden': 'true' }, el('i', { style: `left:${exponent >= 0 ? 50 : 50 - width}%;width:${status === 'flat' ? 0 : width}%` })),
      el('span', { class: 'lm-meter-status' }, html(statuses[status])),
    ]);
  }).join('') + el('p', { class: `lm-verdict is-${current}` }, html(text.verdict(current, state))));
}

export function view(state: State, language: Lang): string {
  return el('div', { class: 'lm-phase' }, variants(variant => diagram(state, language, variant)) + meters(state, language));
}
