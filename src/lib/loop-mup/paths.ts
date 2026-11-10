// Figure 6: expanding (I + cW)^N U as paths. Every loop either follows the
// identity trunk or takes the residual branch, so the expansion has 2^N terms,
// one per path. The C(N, m) paths that take the branch m times give the same
// vector c^m W^m U when the weights are shared, so their lengths add; with
// independent weights they give C(N, m) orthogonal vectors, which add in
// quadrature. The orthogonal sums are drawn with each new segment at a right
// angle to the sum so far, so the drawn length is exactly √C(N, m). No data.
import { el, html, leaf, plain, svg, svgText, variants, type Control, type Lang } from './markup';

export const counts = [2, 3, 4] as const;
/** Bit r−1 of `path` is set when loop r takes the residual branch. */
export interface State { n: number; path: number }
export const initial: State = { n: 3, path: 0b010 };

const taken = (path: number, n: number) => Array.from({ length: n }, (_, index) => (path >> index & 1) === 1);
const loopsOf = (path: number, n: number) => taken(path, n).flatMap((on, index) => on ? [index + 1] : []);
/** Paths that take the branch m times, in increasing order. */
export const group = (n: number, m: number) => Array.from({ length: 1 << n }, (_, path) => path).filter(path => loopsOf(path, n).length === m);

/** The term of the expansion that a path contributes, in label notation. */
export function term(path: number, n: number, shared: boolean): string {
  const loops = loopsOf(path, n);
  const m = loops.length;
  if (m === 0) return '$U$';
  const power = m === 1 ? '$c$' : `$c$^{${m}}`;
  if (shared) return `${power}${m === 1 ? '$W$' : `$W$^{${m}}`}$U$`;
  return `${power}${[...loops].reverse().map(loop => `$W$_{${loop}}`).join('')}$U$`;
}

/** Length of the order-m part in units of c^m: C(N, m) aligned copies, or √C(N, m) orthogonal ones. */
export function lengths(n: number, m: number) {
  const count = group(n, m).length;
  return { count, shared: count, untied: Math.sqrt(count) };
}

const copy = {
  zh: {
    n: '循环次数 $N$', loop: (r: number) => `第 ${r} 次`,
    sharedTerm: '共享权重时，这种选法给出 ', untiedTerm: '独立权重时给出 ',
    head: ['所有选法（■ 表示这次循环走分支）', '共享权重：同一个向量，首尾相接', '独立权重：互相正交，勾股合成'],
    shared: '共享权重', untied: '独立权重',
    order: (m: number) => `走 ${m} 次分支`, ways: (count: number) => `${count} 种选法`,
    describe: (loops: number[]) => loops.length ? `第 ${loops.join('、')} 次循环走分支` : '每次循环都走主干',
    aria: (n: number, description: string, shared: string, untied: string) => `示意图：循环 ${n} 次共有 ${1 << n} 种选法。当前选中的选法：${description}；共享权重时给出 ${shared}，独立权重时给出 ${untied}。`,
  },
  en: {
    n: 'Loop count $N$', loop: (r: number) => `loop ${r}`,
    sharedTerm: 'With shared weights this path gives ', untiedTerm: 'With independent weights it gives ',
    head: ['All paths (■ marks a loop that takes the branch)', 'Shared weights: one vector, added end to end', 'Independent weights: orthogonal, added by Pythagoras'],
    shared: 'Shared weights', untied: 'Independent weights',
    order: (m: number) => `${m} ${m === 1 ? 'branch' : 'branches'}`, ways: (count: number) => `${count} ${count === 1 ? 'path' : 'paths'}`,
    describe: (loops: number[]) => loops.length ? `branch in ${loops.length === 1 ? 'loop' : 'loops'} ${loops.join(', ')}` : 'trunk in every loop',
    aria: (n: number, description: string, shared: string, untied: string) => `Illustration: ${n} loops give ${1 << n} paths. Selected path: ${description}; it contributes ${shared} with shared weights and ${untied} with independent weights.`,
  },
};

export function controls(state: State, language: Lang): Control[] {
  return [{ key: 'n', label: copy[language].n, value: String(state.n), options: counts.map(n => ({ value: String(n), label: String(n) })) }];
}

export function parse(key: string, value: string, state: State): State {
  if (key === 'n') return { n: Number(value), path: initial.path };
  return { ...state, path: Number(value) };
}

/** The unrolled block: a trunk with one residual branch per loop, and the selected path on top. */
function diagram(state: State, language: Lang, variant: 'wide' | 'narrow') {
  const text = copy[language];
  const wide = variant === 'wide';
  const width = wide ? 760 : 360;
  const cell = Math.min(wide ? 170 : 96, (width - (wide ? 128 : 68)) / state.n);
  const start = (width - cell * state.n) / 2;
  const trunk = 112, branch = 62, boxWidth = wide ? 52 : 40, boxHeight = 28, inset = wide ? 16 : 10, tail = wide ? 22 : 9;
  const from = start - tail, to = start + cell * state.n + tail;
  const choice = taken(state.path, state.n);
  let rails = leaf('path', { class: 'lm-route-rail', d: `M${from} ${trunk}H${to}` });
  let route = `M${from} ${trunk}`;
  let marks = '';
  choice.forEach((on, index) => {
    const left = start + index * cell, fork = left + inset, merge = left + cell - inset, middle = left + cell / 2;
    rails += leaf('path', { class: 'lm-route-rail', d: `M${fork} ${trunk}V${branch}H${merge}V${trunk}` });
    route += `H${fork}${on ? `V${branch}H${merge}V${trunk}` : `H${merge}`}`;
    marks += [
      leaf('rect', { class: `lm-route-box${on ? ' is-on' : ''}`, x: middle - boxWidth / 2, y: branch - boxHeight / 2, width: boxWidth, height: boxHeight, rx: 5 }),
      el('text', { class: 'label', x: middle, y: branch + 5, 'text-anchor': 'middle' }, svgText('$c$$W$')),
      leaf('circle', { class: 'lm-route-fork', cx: fork, cy: trunk, r: 2.6 }),
      leaf('circle', { class: 'lm-route-join', cx: merge, cy: trunk, r: 8 }),
      leaf('path', { class: 'lm-route-plus', d: `M${merge - 4} ${trunk}H${merge + 4}M${merge} ${trunk - 4}V${trunk + 4}` }),
      el('text', { class: 'lm-note', x: middle, y: 28, 'text-anchor': 'middle' }, text.loop(index + 1)),
    ].join('');
  });
  route += `H${to}`;
  const loops = loopsOf(state.path, state.n);
  const label = text.aria(state.n, text.describe(loops), plain(term(state.path, state.n, true)), plain(term(state.path, state.n, false)));
  return svg(variant, width, 138, label, [
    rails, leaf('path', { class: 'lm-route', d: route }), marks,
    leaf('path', { class: 'lm-route-head', d: `M${to + 7} ${trunk}L${to - 3} ${trunk - 5}L${to - 3} ${trunk + 5}Z` }),
    el('text', { class: 'label', x: from - 7, y: trunk + 5, 'text-anchor': 'end' }, svgText('$U$')),
    el('text', { class: 'label', x: to + 12, y: trunk + 5 }, svgText(`$x$^{${state.n}}`)),
  ].join(''));
}

const unit = 20;
/** `count` copies of one vector laid end to end. */
function aligned(count: number, active: number, neutral = false) {
  const width = count * unit + 12;
  const lines = Array.from({ length: count }, (_, index) => leaf('line', { class: index === active ? 'is-on' : undefined, x1: 6 + index * unit, y1: 8, x2: 6 + (index + 1) * unit - 5, y2: 8 })).join('');
  return el('svg', { class: `lm-mini${neutral ? ' is-neutral' : ''}${active >= 0 ? ' has-on' : ''}`, width, height: 16, viewBox: `0 0 ${width} 16`, 'aria-hidden': 'true' }, lines);
}
/** `count` mutually orthogonal unit vectors: each new one is drawn at a right angle to the sum so far. */
function orthogonal(count: number, active: number) {
  const points: [number, number][] = [[0, 0], [1, 0]];
  for (let index = 1; index < count; index++) { const [x, y] = points[index]!; const length = Math.hypot(x, y); points.push([x - y / length, y + x / length]); }
  const xs = points.map(point => point[0]);
  const top = Math.max(...points.map(point => point[1]));
  const left = Math.min(...xs);
  const width = (Math.max(...xs) - left) * unit + 12;
  const height = top * unit + 16;
  const map = ([x, y]: [number, number]) => ({ x: (x - left) * unit + 6, y: (top - y) * unit + 8 });
  const lines = Array.from({ length: count }, (_, index) => { const a = map(points[index]!); const b = map(points[index + 1]!); return leaf('line', { class: index === active ? 'is-on' : undefined, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); }).join('');
  const origin = map(points[0]!);
  const end = map(points[count]!);
  const sum = count > 1 ? leaf('line', { class: 'lm-mini-sum', x1: origin.x, y1: origin.y, x2: end.x, y2: end.y }) : '';
  return el('svg', { class: `lm-mini${active >= 0 ? ' has-on' : ''}`, width, height, viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`, 'aria-hidden': 'true' }, sum + lines);
}

function table(state: State, language: Lang) {
  const text = copy[language];
  const rows = Array.from({ length: state.n + 1 }, (_, m) => {
    const paths = group(state.n, m);
    const count = paths.length;
    const active = paths.indexOf(state.path);
    const scale = m === 0 ? '' : m === 1 ? '$c$' : `$c$^{${m}}`;
    const root = Math.sqrt(count);
    const shared = m === 0 ? '1' : `${count > 1 ? count : ''}${scale}`;
    const untied = m === 0 ? '1' : count === 1 ? scale : `√${count}·${scale} ${Number.isInteger(root) ? `= ${root}` : `≈ ${root.toFixed(2)}`}${scale}`;
    const glyphs = paths.map(path => el('button', { type: 'button', class: 'lm-path', 'data-lm-key': 'path', 'data-lm-value': String(path), 'aria-pressed': String(path === state.path), 'aria-label': text.describe(loopsOf(path, state.n)) },
      taken(path, state.n).map(on => `<i${on ? ' class="is-on"' : ''}></i>`))).join('');
    return el('div', { class: 'lm-paths-row' }, [
      el('span', { class: 'lm-paths-label' }, `${text.order(m)}<small>${text.ways(count)}</small>`),
      el('span', { class: 'lm-paths-glyphs' }, glyphs),
      el('span', { class: `lm-paths-sum ${m ? 'is-loop' : 'is-neutral'}`, 'data-label': text.shared }, aligned(count, active, m === 0) + `<b>${html(shared)}</b>`),
      el('span', { class: `lm-paths-sum ${m ? 'is-base' : 'is-neutral'}`, 'data-label': text.untied }, (m ? orthogonal(count, active) : aligned(1, active, true)) + `<b>${html(untied)}</b>`),
    ]);
  }).join('');
  const head = el('div', { class: 'lm-paths-row lm-paths-head' }, ['<span></span>', el('span', {}, text.head[0]!), el('span', { class: 'is-loop' }, text.head[1]!), el('span', { class: 'is-base' }, text.head[2]!)]);
  return el('div', { class: 'lm-paths' }, head + rows);
}

export function view(state: State, language: Lang): string {
  const text = copy[language];
  const terms = el('p', { class: 'lm-path-terms' }, [
    el('span', { class: 'is-loop' }, `${text.sharedTerm}<b>${html(term(state.path, state.n, true))}</b>`),
    el('span', { class: 'is-base' }, `${text.untiedTerm}<b>${html(term(state.path, state.n, false))}</b>`),
  ]);
  return variants(variant => diagram(state, language, variant)) + terms + table(state, language);
}
