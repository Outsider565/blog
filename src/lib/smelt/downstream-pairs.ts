// Geometry, statistics and copy for the DownstreamPairs figures (DCLM Core,
// DCLM Completion and MMLU on all 96 matched Baseline / SMELT configurations).
// Shared by the Astro component (static SVG) and the browser script (tweens).
import data from '../../data/smelt/downstream-pairs.json';
import { linear, log10Scale, powerLabel, ticks, type Scale } from './plot';

const superscript: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** FLOPs with three significant digits, e.g. 1.29×10¹⁹ (tick labels use powerLabel). */
export function flopsLabel(value: number) {
  const exponent = Math.floor(Math.log10(value) + 1e-9);
  const mantissa = (value / 10 ** exponent).toFixed(2);
  return `${mantissa}×10${[...String(exponent)].map(character => superscript[character] ?? character).join('')}`;
}
import type { Language } from '../site';

export type MetricKey = 'core' | 'mmlu' | 'comp';
export type Scope = 'bar' | 'all';
export type Sparsity = 'all' | `${number}`;
export interface Pair {
  index: number;
  size: string;
  es: number;
  step: number;
  flops: readonly [number, number];
  loss: readonly [number, number];
  core: readonly [number, number];
  mmlu: readonly [number, number];
  comp: readonly [number, number];
}

const tuple = (values: readonly number[]) => [values[0] ?? NaN, values[1] ?? NaN] as const;
export const pairs: Pair[] = data.pairs.map((pair, index) => ({
  index,
  size: pair.size,
  es: pair.es,
  step: pair.step,
  flops: tuple(pair.flops),
  loss: tuple(pair.loss),
  core: tuple(pair.core),
  mmlu: tuple(pair.mmlu),
  comp: tuple(pair.comp),
}));
export const sizes = data.sizes;
export const sparsities = data.sparsity;
export const steps = data.steps;
export const chance = data.chance.mmlu;
export const bar = data.bar.mmlu;

/** Values as displayed: accuracies in %, the completion loss in nats. */
export const display = (pair: Pair, metric: MetricKey, arch: 0 | 1) => pair[metric][arch] * (metric === 'comp' ? 1 : 100);
/** Positive when SMELT is better (higher score, or lower completion loss). */
export const gap = (pair: Pair, metric: MetricKey) => metric === 'comp' ? display(pair, metric, 0) - display(pair, metric, 1) : display(pair, metric, 1) - display(pair, metric, 0);
export const wins = (pair: Pair, metric: MetricKey) => gap(pair, metric) > 0;
/** MMLU counts only pairs whose Baseline is at least 10 pp above chance (paper, sec:dclm-mmlu). */
export const counted = (pair: Pair, metric: MetricKey, scope: Scope) => metric !== 'mmlu' || scope === 'all' || pair.mmlu[0] >= bar - 1e-12;
export const inSparsity = (pair: Pair, sparsity: Sparsity) => sparsity === 'all' || pair.es === Number(sparsity);

export function tally(metric: MetricKey, scope: Scope, sparsity: Sparsity, size?: string) {
  const pool = pairs.filter(pair => inSparsity(pair, sparsity) && (!size || pair.size === size) && counted(pair, metric, scope));
  const won = pool.filter(pair => wins(pair, metric)).length;
  const mean = pool.length ? pool.reduce((sum, pair) => sum + gap(pair, metric), 0) / pool.length : 0;
  return { won, total: pool.length, mean, pool };
}

// Panel geometry: one SVG per scale, authored 164 units wide so that 13-unit
// text stays at or above 12 px from phones (2 columns) to desktop (4 columns).
export const panel = { width: 164, height: 186, left: 31, right: 7, top: 30, bottom: 26 } as const;
export const plotBox = { x0: panel.left, x1: panel.width - panel.right, y0: panel.top, y1: panel.height - panel.bottom } as const;

const flopsBySize = new Map(sizes.map(size => [size, pairs.filter(pair => pair.size === size).flatMap(pair => [...pair.flops])]));
export function xScale(size: string): Scale {
  const values = flopsBySize.get(size) ?? [1e19, 1e21];
  const low = Math.log10(Math.min(...values)) - 0.06;
  const high = Math.log10(Math.max(...values)) + 0.06;
  return log10Scale([10 ** low, 10 ** high], [plotBox.x0, plotBox.x1]);
}
/** Labelled x ticks at 1× and 3× powers of ten, pruned so labels never collide. */
export function xTicks(size: string) {
  const x = xScale(size);
  const [low, high] = x.domain;
  const candidates: { value: number; label: string; position: number; width: number; priority: number }[] = [];
  for (let exponent = Math.floor(Math.log10(low)); exponent <= Math.ceil(Math.log10(high)); exponent++) {
    for (const mantissa of [1, 3]) {
      const value = mantissa * 10 ** exponent;
      if (value < low || value > high) continue;
      const label = powerLabel(value);
      // Georgia at 13 units: about 7 units per digit or sign, 4.5 per superscript.
      const width = [...label].reduce((sum, character) => sum + (/[⁰-⁹¹²³⁻]/.test(character) ? 4.5 : 7), 0);
      candidates.push({ value, label, position: x(value), width, priority: mantissa === 1 ? 0 : 1 });
    }
  }
  const kept: typeof candidates = [];
  for (const tick of [...candidates].sort((a, b) => a.priority - b.priority)) {
    if (tick.position - tick.width / 2 < -6 || tick.position + tick.width / 2 > panel.width + 1) continue;
    if (kept.every(other => Math.abs(other.position - tick.position) > (other.width + tick.width) / 2 + 8)) kept.push(tick);
  }
  return kept.sort((a, b) => a.value - b.value).map(({ value, label }) => ({ value, label }));
}

/** Tick text without float noise: 2.5 stays 2.5, 20 stays 20. */
export const tickText = (value: number) => String(Number(value.toPrecision(6)));

/** Y domain for one panel: the visible pairs of the selected sparsity, padded, plus tick values. */
export function yAxis(metric: MetricKey, sparsity: Sparsity, size: string) {
  const values = pairs.filter(pair => pair.size === size && inSparsity(pair, sparsity)).flatMap(pair => [display(pair, metric, 0), display(pair, metric, 1)]);
  let low = Math.min(...values);
  let high = Math.max(...values);
  const pad = Math.max((high - low) * 0.1, metric === 'comp' ? 0.02 : 0.6);
  low -= pad;
  high += pad;
  let values2 = ticks(low, high, 4);
  if (values2.length > 5) values2 = ticks(low, high, 3);
  return { scale: linear([low, high], [plotBox.y1, plotBox.y0]), ticks: values2.map(value => ({ value, label: tickText(value) })) };
}

export interface PairGeometry { xb: number; yb: number; xl: number; yl: number }
export function pairGeometry(pair: Pair, metric: MetricKey, y: Scale): PairGeometry {
  const x = xScale(pair.size);
  return { xb: x(pair.flops[0]), yb: y(display(pair, metric, 0)), xl: x(pair.flops[1]), yl: y(display(pair, metric, 1)) };
}

export const sparsityLabel = (es: number) => sparsities.find(item => item.es === es)?.en ?? String(es);
export const stepLabel = (step: number) => step >= 196000 ? '196k' : `${Math.round(step / 1000)}k`;

const metricCopy = {
  core: {
    zh: { name: 'DCLM Core', axis: 'DCLM Core（中心化准确率，%）', better: '越高越好', unit: 'pp', winLabel: '组匹配对中 SMELT 的 DCLM Core 更高' },
    en: { name: 'DCLM Core', axis: 'DCLM Core (centered accuracy, %)', better: 'higher is better', unit: 'pp', winLabel: 'matched pairs where SMELT scores higher on DCLM Core' },
  },
  comp: {
    zh: { name: 'DCLM Completion', axis: 'DCLM Completion（标准答案损失，nats）', better: '越低越好', unit: 'nats', winLabel: '组匹配对中 SMELT 的 DCLM Completion 损失更低' },
    en: { name: 'DCLM Completion', axis: 'DCLM Completion (gold-answer loss, nats)', better: 'lower is better', unit: 'nats', winLabel: 'matched pairs where SMELT has the lower DCLM Completion loss' },
  },
  mmlu: {
    zh: { name: 'MMLU', axis: 'MMLU 准确率（%）', better: '越高越好', unit: 'pp', winLabel: '组基线明显高于随机水平的匹配对中 SMELT 的 MMLU 更高' },
    en: { name: 'MMLU', axis: 'MMLU accuracy (%)', better: 'higher is better', unit: 'pp', winLabel: 'pairs with a clearly above-chance Baseline where SMELT scores higher on MMLU' },
  },
} as const;
export const metricText = (metric: MetricKey, language: Language) => metricCopy[metric][language];
export const winLabel = (metric: MetricKey, scope: Scope, language: Language) => metric === 'mmlu' && scope === 'all'
  ? (language === 'zh' ? '组匹配对中 SMELT 的 MMLU 更高（不设门槛）' : 'matched pairs where SMELT scores higher on MMLU (no bar)')
  : metricCopy[metric][language].winLabel;

export const copy = {
  zh: {
    metric: '指标', sparsity: '稀疏度 S', all: '全部', scope: '统计范围', scopeBar: '基线明显高于随机（30 组）', scopeAll: '全部 96 组',
    base: '基线', loop: 'SMELT', loopAhead: 'SMELT 更好', baseAhead: '基线更好', excluded: '未计入（基线 < 35%）',
    chance: '随机水平 25%', barLine: '计入门槛：基线 ≥ 35%',
    ledgerRows: '每格一组匹配对：每行一个稀疏度（0% → ≈97%），每列一个衰减分支（10k → 196k 步）', cellWin: 'SMELT 更好', cellLoss: '基线更好', cellOut: '未计入',
    xAxis: '累计训练 FLOPs（对数坐标）',
    branchFirst: '10k', branchLast: '196k',
    step: '步分支', flops: 'FLOPs', diff: '差值', notCounted: '未计入胜率：基线低于 35%',
    ahead: (better: boolean) => better ? 'SMELT 更好' : '基线更好',
    table: '数据表：全部 96 组匹配对', scale: '规模', branch: '分支（步）',
    wins: (won: number, total: number) => `${won} / ${total}`,
  },
  en: {
    metric: 'Metric', sparsity: 'Sparsity S', all: 'All', scope: 'Count', scopeBar: 'Baseline clearly above chance (30)', scopeAll: 'All 96',
    base: 'Baseline', loop: 'SMELT', loopAhead: 'SMELT better', baseAhead: 'Baseline better', excluded: 'Not counted (Baseline < 35%)',
    chance: 'Chance 25%', barLine: 'Counting bar: Baseline ≥ 35%',
    ledgerRows: 'One cell per matched pair: each row is a sparsity (0% → ≈97%), each column a decay branch (10k → 196k steps)', cellWin: 'SMELT better', cellLoss: 'Baseline better', cellOut: 'Not counted',
    xAxis: 'Cumulative training FLOPs (log scale)',
    branchFirst: '10k', branchLast: '196k',
    step: 'step branch', flops: 'FLOPs', diff: 'Gap', notCounted: 'Not counted: Baseline below 35%',
    ahead: (better: boolean) => better ? 'SMELT better' : 'Baseline better',
    table: 'Data: all 96 matched pairs', scale: 'Scale', branch: 'Branch (step)',
    wins: (won: number, total: number) => `${won} / ${total}`,
  },
} as const;

const formatValue = (metric: MetricKey, value: number) => metric === 'comp' ? value.toFixed(3) : value.toFixed(2);
export const formatGap = (metric: MetricKey, value: number, _language?: Language) => {
  const sign = value >= 0 ? '+' : '−';
  return metric === 'comp' ? `${sign}${(Math.abs(value) * 1000).toFixed(1)} mnat` : `${sign}${Math.abs(value).toFixed(2)} pp`;
};

/** Tooltip text: first line is the configuration. */
export function pairTip(pair: Pair, metric: MetricKey, scope: Scope, language: Language) {
  const text = copy[language];
  const name = metricText(metric, language).name;
  const sparsity = sparsityLabel(pair.es);
  const head = language === 'zh'
    ? `${pair.size} · S ${sparsity} · ${stepLabel(pair.step)} ${text.step}`
    : `${pair.size} · S ${sparsity} · ${stepLabel(pair.step)} ${text.step}`;
  const better = wins(pair, metric);
  const lines = [
    head,
    `${text.flops}${language === 'zh' ? '：' : ': '}${text.base} ${flopsLabel(pair.flops[0])} · SMELT ${flopsLabel(pair.flops[1])}`,
    `${name}: ${text.base} ${formatValue(metric, display(pair, metric, 0))} · SMELT ${formatValue(metric, display(pair, metric, 1))}`,
    `${text.diff} ${formatGap(metric, gap(pair, metric), language)}${language === 'zh' ? '，' : ', '}${text.ahead(better)}`,
  ];
  if (!counted(pair, metric, scope)) lines.push(text.notCounted);
  return lines.join('\n');
}

/** Spoken once per state change: the counter followed by the summary sentence. */
export const announcement = (metric: MetricKey, scope: Scope, sparsity: Sparsity, language: Language) => {
  const { won, total } = tally(metric, scope, sparsity);
  return `${won} / ${total} ${winLabel(metric, scope, language)}${language === 'zh' ? '。' : '. '}${summary(metric, scope, sparsity, language)}`;
};

/** One-sentence summary under the chart for the current state. */
export function summary(metric: MetricKey, scope: Scope, sparsity: Sparsity, language: Language) {
  const { won, total, mean } = tally(metric, scope, sparsity);
  const gapText = formatGap(metric, mean, language);
  const zh = language === 'zh';
  const label = sparsity === 'all' ? '' : sparsityLabel(Number(sparsity));
  const prefix = label ? (zh ? `S ${label}：` : `S ${label}: `) : '';
  if (metric === 'mmlu' && scope === 'bar') return zh
    ? `${prefix}基线明显高于随机的 ${total} 组中，SMELT 在 ${won} 组上更好，平均差值 ${gapText}。`
    : `${prefix}SMELT is better on ${won} of the ${total} pairs with an above-chance Baseline, by ${gapText} on average.`;
  return zh ? `${prefix}${total} 组中 SMELT 在 ${won} 组上更好，平均差值 ${gapText}。` : `${prefix}SMELT is better on ${won} of ${total} pairs, by ${gapText} on average.`;
}
