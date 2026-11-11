// Figure 14 (expert-reuse): layout and copy shared by the Astro render and the
// browser script. Data: src/data/smelt/expert-reuse.json (see its provenance).
import data from '../../data/smelt/expert-reuse.json';
import { linear, ticks } from './plot';

export type Language = 'zh' | 'en';
export type SparsityKey = '1' | '8' | '24' | '42';
export type Size = '100M' | '200M' | '600M' | '1.6B';
export interface Cell { mean: number; ci95: number[]; dist: number[]; pairs: number }

export const k = data.k;
export const sizes = data.sizes as Size[];
export const sparsity = data.sparsity as { key: SparsityKey; label: string; exact: boolean; experts: number }[];
export const cells = data.cells as Record<SparsityKey, Record<Size, Cell>>;
export const defaultSelection = { es: '8' as SparsityKey, size: '1.6B' as Size };
export const sizeColor: Record<Size, string> = { '100M': 'var(--smelt-s100)', '200M': 'var(--smelt-s200)', '600M': 'var(--smelt-s600)', '1.6B': 'var(--smelt-s1p6)' };

export const expertsOf = (es: SparsityKey) => sparsity.find(entry => entry.key === es)!.experts;
export const sparsityLabel = (es: SparsityKey) => { const entry = sparsity.find(item => item.key === es)!; return `S ${entry.exact ? '=' : '≈'} ${entry.label}`; };

/** Expected overlap of two independent uniform top-k draws from E experts. */
export const randomMean = (experts: number) => k * k / experts;

/** Hypergeometric P(overlap = j) for two independent uniform top-k draws from E experts. */
export function randomDistribution(experts: number): number[] {
  const logChoose = (n: number, r: number) => { let value = 0; for (let index = 0; index < r; index++) value += Math.log(n - index) - Math.log(index + 1); return value; };
  const total = logChoose(experts, k);
  return Array.from({ length: k + 1 }, (_, shared) => experts - k < k - shared ? 0 : Math.exp(logChoose(k, shared) + logChoose(experts - k, k - shared) - total));
}

/** Columns and cell size (px) of the illustrative expert pool; rows follow from E.
 *  Cells shrink as the pool grows so every pool fits one box, yet the count stays literal. */
export const poolShape: Record<number, { cols: number; cell: number }> = { 16: { cols: 4, cell: 24 }, 96: { cols: 12, cell: 17 }, 288: { cols: 24, cell: 11 }, 504: { cols: 28, cell: 9 } };
export const poolStyle = (experts: number) => { const shape = poolShape[experts] ?? { cols: 16, cell: 12 }; return `--cols:${shape.cols}; --er-cell:${shape.cell}px`; };
export const maxExperts = Math.max(...sparsity.map(entry => entry.experts));

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic illustrative picks: visit 1 takes k experts, visit 2 keeps `shared` of them and adds new ones. */
export function illustrativePicks(es: SparsityKey, size: Size) {
  const experts = expertsOf(es);
  const shared = Math.round(cells[es][size].mean);
  const random = mulberry32(experts * 131 + sizes.indexOf(size) * 7919 + 17);
  const shuffle = (values: number[]) => {
    for (let index = values.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [values[index], values[swap]] = [values[swap]!, values[index]!];
    }
    return values;
  };
  const order = shuffle(Array.from({ length: experts }, (_, index) => index));
  const first = order.slice(0, k).sort((a, b) => a - b);
  const kept = shuffle([...first]).slice(0, shared).sort((a, b) => a - b);
  const added = order.slice(k, k + k - shared).sort((a, b) => a - b);
  return { experts, shared, first, second: [...kept, ...added].sort((a, b) => a - b), kept, added };
}

/** State of every pool cell after both visits: '1', '2', 'b' (both) or ''. */
export function poolStates(es: SparsityKey, size: Size) {
  const picks = illustrativePicks(es, size);
  const states = Array.from({ length: maxExperts }, () => '');
  for (const index of picks.first) states[index] = '1';
  for (const index of picks.added) states[index] = '2';
  for (const index of picks.kept) states[index] = 'b';
  return { ...picks, states };
}

// ---------- Distribution chart (SVG, authored 360 units wide) ----------
export const dist = { width: 360, height: 236, left: 44, right: 10, top: 46, bottom: 46 };
const niceMaxima = [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1];

/** One y range per sparsity level so switching scale keeps the axis still. It is set by
 *  the measured distributions only; a taller random-routing bar is clipped at the top. */
export function distMaximum(es: SparsityKey) {
  const peak = Math.max(...sizes.flatMap(size => cells[es][size].dist));
  return niceMaxima.find(value => value >= peak * 1.08) ?? 1;
}

export function distLayout(es: SparsityKey, size: Size) {
  const { width, height, left, right, top, bottom } = dist;
  const experts = expertsOf(es);
  const cell = cells[es][size];
  const random = randomDistribution(experts);
  const maximum = distMaximum(es);
  const y = linear([0, maximum], [height - bottom, top]);
  const band = (width - left - right) / (k + 1);
  const center = (value: number) => left + (value + 0.5) * band;
  const barWidth = Math.min(13, band * 0.36);
  const step = maximum > 0.6 ? 0.2 : maximum > 0.3 ? 0.1 : 0.05;
  return {
    maximum,
    center,
    band,
    barWidth,
    baseline: height - bottom,
    ticks: ticks(0, maximum, Math.round(maximum / step)).map(value => ({ value, y: y(value), label: `${Math.round(value * 100)}%` })),
    bars: cell.dist.map((share, shared) => {
      const randomShare = random[shared] ?? 0;
      const randomY = Math.max(top, y(randomShare));
      return {
        shared,
        x: center(shared),
        measured: { y: y(share), h: height - bottom - y(share), share },
        random: { y: randomY, h: height - bottom - randomY, share: randomShare, clipped: randomShare > maximum },
      };
    }),
    meanX: center(cell.mean),
    randomX: center(randomMean(experts)),
    mean: cell.mean,
    randomMean: randomMean(experts),
  };
}

const textWidth = (value: string) => [...value].reduce((sum, character) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(character) ? 13 : 7.4), 0);
const fitsRight = (meanX: number, width: number) => meanX + 5 + width <= dist.width - 2;
const fitsLeft = (meanX: number, randomX: number, width: number) => meanX - 5 - width >= randomX + 6;

/** Measured-mean label text. One form per sparsity level (so switching scale does not
 *  change the wording): the full form when, at every scale, it fits right of its line
 *  or left of it without reaching the random line; the short form otherwise. */
export function meanLabelText(text: { meanLabel: (value: number) => string; meanLabelShort: (value: number) => string }, es: SparsityKey, value: number) {
  const full = sizes.every(size => {
    const layout = distLayout(es, size);
    const width = textWidth(text.meanLabel(layout.mean));
    return fitsRight(layout.meanX, width) || fitsLeft(layout.meanX, layout.randomX, width);
  });
  return full ? text.meanLabel(value) : text.meanLabelShort(value);
}

/** The random label sits on the top row (its dashed line is taller) and the measured
 *  label on the row below; the measured mean is always right of the random one.
 *  - The measured label flips to the left of its line near the right edge.
 *  - When the flipped measured label would sit right under the random label, the
 *    random label moves to the left of its own line, so each label reads with its line. */
export function meanLabels(layout: { meanX: number; randomX: number }, measuredText: string, randomText: string) {
  const measuredWidth = textWidth(measuredText);
  const randomWidth = textWidth(randomText);
  const flip = !fitsRight(layout.meanX, measuredWidth);
  const measuredLeft = flip ? layout.meanX - 5 - measuredWidth : layout.meanX + 5;
  const randomRight = layout.randomX + 5 + randomWidth;
  const moveRandom = flip && randomRight > measuredLeft - 24 && layout.randomX - 5 - randomWidth >= 0;
  return {
    measured: flip ? { x: -5, anchor: 'end' } : { x: 5, anchor: 'start' },
    random: moveRandom ? { x: -5, anchor: 'end' } : { x: 5, anchor: 'start' },
  };
}

// ---------- Overview (HTML, positions in percent of the 0..k track) ----------
export const trackPercent = (value: number) => `${(value / k * 100).toFixed(3)}%`;
export const ratioRange = (es: SparsityKey) => {
  const ratios = sizes.map(size => cells[es][size].mean / randomMean(expertsOf(es)));
  return [Math.min(...ratios), Math.max(...ratios)] as const;
};

// ---------- Formatting and copy ----------
export const fmt = (value: number, digits = 2) => value.toFixed(digits);
export const fmtRatio = (value: number) => value >= 10 ? value.toFixed(0) : value.toFixed(1);
export const fmtShare = (value: number) => value >= 0.1 ? `${(value * 100).toFixed(1)}%` : value >= 0.001 ? `${(value * 100).toFixed(2)}%` : value > 0 ? '<0.1%' : '0%';

export const copy = {
  zh: {
    aria: '两轮循环选中专家集合的重合度：实测分布与随机路由基线对比',
    sparsity: '稀疏度',
    scale: '规模',
    overviewTitle: '两轮循环重合的专家数',
    overviewNote: '每轮从 E 个专家中路由选出 8 个',
    randomLegend: '随机路由期望 8²/E',
    ratioHead: '相对随机倍数',
    ratio: (low: number, high: number) => `${fmtRatio(low)}–${fmtRatio(high)}×`,
    experts: (experts: number) => `E = ${experts}`,
    axisShared: '两轮均被选中的专家数',
    poolTitle: '同一 token 先后两轮经过同一 MoE 层',
    poolSub: (experts: number) => `共 ${experts} 个专家，每轮路由 top-8`,
    first: '仅第 1 轮',
    second: '仅第 2 轮',
    both: '两轮重合',
    idle: '未激活',
    visit1: '第 1 轮循环',
    visit2: '第 2 轮循环',
    replay: '重播',
    distTitle: '跨轮重合专家数的分布',
    distSub: '按 token × 循环层统计；空心柱为随机路由基线',
    share: '占比',
    meanLabel: (value: number) => `实测均值 ${fmt(value)}`,
    meanLabelShort: (value: number) => `均值 ${fmt(value)}`,
    randomLabel: (value: number) => `随机 ${fmt(value)}`,
    measured: '实测分布',
    random: '随机路由',
    dotTip: (size: string, es: SparsityKey, mean: number, randomValue: number) => `${size} · ${sparsityLabel(es)}\n两轮平均重合 ${fmt(mean)} / 8 个专家\n随机路由期望 ${fmt(randomValue)}\n约为随机基线的 ${fmtRatio(mean / randomValue)} 倍`,
    randomTip: (experts: number, value: number) => `独立随机路由期望\n两次独立从 ${experts} 个专家中各取 top-8，平均重合 8²/${experts} = ${fmt(value)} 个`,
    barTip: (shared: number, measured: number, randomShare: number) => `重合 ${shared} 个专家\n实测占比：${fmtShare(measured)}\n随机路由：${fmtShare(randomShare)}`,
    readout: (size: string, es: SparsityKey, mean: number, randomValue: number) => `<strong>${size} · ${sparsityLabel(es)}</strong>：两轮循环平均重合 <strong>${fmt(mean)}</strong> 个专家，而独立随机路由期望仅为 ${fmt(randomValue)} 个（实测约为随机的 ${fmtRatio(mean / randomValue)} 倍）。`,
    dataSummary: '数据：全部 16 组配置的跨轮重合专家数',
    columns: ['S', '规模', '专家总数 E', '实测均值', '95% CI', '随机期望', '倍数'],
  },
  en: {
    aria: 'Overlap between the expert sets picked on the two visits: measured versus random routing',
    sparsity: 'Sparsity',
    scale: 'Scale',
    overviewTitle: 'Experts shared by the two visits',
    overviewNote: '8 picked from E experts on each visit',
    randomLegend: 'Random routing, 8²/E',
    ratioHead: '× random',
    ratio: (low: number, high: number) => `${fmtRatio(low)}–${fmtRatio(high)}×`,
    experts: (experts: number) => `E = ${experts}`,
    axisShared: 'Experts picked on both visits',
    poolTitle: 'One token, two visits to the same MoE layer',
    poolSub: (experts: number) => `${experts} experts, top-8 on each visit`,
    first: 'Visit 1 only',
    second: 'Visit 2 only',
    both: 'Both visits',
    idle: 'Not picked',
    visit1: 'Visit 1',
    visit2: 'Visit 2',
    replay: 'Replay',
    distTitle: 'How many experts both visits share',
    distSub: 'Over token × looped-layer pairs; hollow bars: random routing',
    share: 'Share',
    meanLabel: (value: number) => `Measured mean ${fmt(value)}`,
    meanLabelShort: (value: number) => `Mean ${fmt(value)}`,
    randomLabel: (value: number) => `Random ${fmt(value)}`,
    measured: 'Measured',
    random: 'Random routing',
    dotTip: (size: string, es: SparsityKey, mean: number, randomValue: number) => `${size} · ${sparsityLabel(es)}\n${fmt(mean)} of 8 experts shared\nRandom routing: ${fmt(randomValue)}\n${fmtRatio(mean / randomValue)}× random`,
    randomTip: (experts: number, value: number) => `Random-routing expectation\nTwo independent top-8 draws from ${experts} experts share 8²/${experts} = ${fmt(value)} on average`,
    barTip: (shared: number, measured: number, randomShare: number) => `${shared} experts shared\nMeasured: ${fmtShare(measured)} of tokens\nRandom routing: ${fmtShare(randomShare)}`,
    readout: (size: string, es: SparsityKey, mean: number, randomValue: number) => `<strong>${size} · ${sparsityLabel(es)}</strong>: the two visits share <strong>${fmt(mean)}</strong> experts on average, against ${fmt(randomValue)} under random routing (${fmtRatio(mean / randomValue)}×).`,
    dataSummary: 'Data: shared experts in all 16 configurations',
    columns: ['S', 'Scale', 'Experts E', 'Measured mean', '95% CI', 'Random', 'Ratio'],
  },
} as const;
