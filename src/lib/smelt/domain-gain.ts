// Layout and copy for Figure 11 (CE Gain by validation domain). Shared by the
// Astro component (static SVG) and the browser script (sparsity transitions).
import data from '../../data/smelt/domain-gain.json';
import { linear, type Scale } from './plot';
import type { Language } from '../site';

export type Variant = 'wide' | 'narrow';
export type Family = (typeof data.families)[number];
export type Source = Family['sources'][number];

export interface Geometry {
  width: number;
  height: number;
  top: number;
  rowHeight: number;
  center: number;
  x0: number;
  x1: number;
  barHeight: number;
  radius: number;
}

export const geometry: Record<Variant, Geometry> = {
  wide: { width: 760, height: 398, top: 34, rowHeight: 64, center: 32, x0: 178, x1: 688, barHeight: 24, radius: 4.8 },
  narrow: { width: 360, height: 486, top: 34, rowHeight: 82, center: 52, x0: 2, x1: 350, barHeight: 22, radius: 4.4 },
};

export const domainMax = 26;
export const tickValues = [0, 5, 10, 15, 20, 25];
export const xScale = (variant: Variant): Scale => linear([0, domainMax], [geometry[variant].x0, geometry[variant].x1]);

export const sparsityLabels = data.sparsities.map(value => `${Math.round(value * 100)}%`);
export const familyMean = (family: Family, sparsity: number) => family.sources.reduce((sum, source) => sum + (source.gain[sparsity] ?? 0), 0) / family.sources.length;
export const familyRange = (family: Family, sparsity: number) => {
  const values = family.sources.map(source => source.gain[sparsity] ?? 0);
  return [Math.min(...values), Math.max(...values)] as const;
};

/** Family indices ordered by mean CE Gain, highest first. */
export function rankOrder(sparsity: number) {
  return data.families.map((family, index) => ({ index, mean: familyMean(family, sparsity) })).sort((a, b) => b.mean - a.mean).map(item => item.index);
}

/** Beeswarm offsets: each dot takes the smallest |y| that keeps it clear of the dots already placed. */
export function swarm(xs: readonly number[], radius: number, gap = 1.2): number[] {
  const order = xs.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x);
  const placed: { x: number; y: number }[] = [];
  const offsets = new Array<number>(xs.length).fill(0);
  const distance = 2 * radius + gap;
  for (const { x, index } of order) {
    const blocked: [number, number][] = [];
    for (const other of placed) {
      const dx = Math.abs(other.x - x);
      if (dx >= distance) continue;
      const dy = Math.sqrt(distance * distance - dx * dx);
      blocked.push([other.y - dy, other.y + dy]);
    }
    const candidates = [0, ...blocked.flat()].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const y = candidates.find(candidate => blocked.every(([low, high]) => candidate <= low + 1e-6 || candidate >= high - 1e-6)) ?? 0;
    placed.push({ x, y });
    offsets[index] = y;
  }
  return offsets;
}

export interface RowLayout { top: number; rank: number; mean: number; barWidth: number; dots: { x: number; y: number }[] }

export function layout(variant: Variant, sparsity: number) {
  const g = geometry[variant];
  const x = xScale(variant);
  const ranks = rankOrder(sparsity);
  const rows: RowLayout[] = data.families.map((family, index) => {
    const rank = ranks.indexOf(index);
    const mean = familyMean(family, sparsity);
    const xs = family.sources.map(source => x(source.gain[sparsity] ?? 0));
    const ys = swarm(xs, g.radius);
    return { top: g.top + rank * g.rowHeight, rank, mean, barWidth: x(mean) - g.x0, dots: xs.map((value, dot) => ({ x: value, y: g.center + (ys[dot] ?? 0) })) };
  });
  return { rows, reference: x(data.aggregate[sparsity] ?? 0) };
}

const copy = {
  zh: {
    sparsity: '稀疏度 S',
    meanLegend: '领域均值',
    sourceLegend: '单个验证子集',
    referenceLegend: '整体验证集',
    axis: 'CE Gain（达到相同 validation loss 时节省的训练算力比例）',
    axisShort: 'CE Gain（节省训练算力比例）',
    reference: '整体',
    sources: (count: number) => `${count} 个子集`,
    source: '验证子集',
    mean: '个验证子集的平均 CE Gain',
    range: '范围',
    ci: '95% 置信区间',
    stat1: (label: string) => `${label}：五大领域中收益最高`,
    stat2: (label: string) => `${label}：幅度最小，但仍保持正收益`,
    stat3: '个验证子集的 CE Gain 均为正值',
    referenceTip: (value: string, sparsity: string) => `整体验证集：${value}\n在全量验证集上直接拟合，S≈${sparsity}，C = 10²¹ FLOPs\n统计口径不同于分数据源均值，仅作参照`,
    aria: '按验证集领域拆分的 CE Gain 对比',
  },
  en: {
    sparsity: 'Sparsity S',
    meanLegend: 'Domain mean',
    sourceLegend: 'Individual validation source',
    referenceLegend: 'Whole validation set',
    axis: 'CE Gain (training compute saved at equal validation loss)',
    axisShort: 'CE Gain (compute saved)',
    reference: 'Overall',
    sources: (count: number) => `${count} sources`,
    source: 'source',
    mean: 'sources, mean CE Gain',
    range: 'Range',
    ci: '95% CI',
    stat1: (label: string) => `${label}, the highest of five domains`,
    stat2: (label: string) => `${label}, the lowest, still positive`,
    stat3: 'validation sources with a positive CE Gain',
    referenceTip: (value: string, sparsity: string) => `Whole validation set: ${value}\nFitted on all validation data, S ≈ ${sparsity}, C = 10²¹ FLOPs\nA different estimator from the per-source mean; shown for reference`,
    aria: 'CE Gain broken down by validation domain',
  },
} as const;

export const domainCopy = (language: Language) => copy[language];
export const pct = (value: number) => `${value.toFixed(1)}%`;

export function familyName(family: Family, language: Language) {
  return language === 'zh' ? `${family.label}（${family.zh}）` : family.label;
}

export function familyTip(family: Family, sparsity: number, language: Language) {
  const text = copy[language];
  const [low, high] = familyRange(family, sparsity);
  const s = sparsityLabels[sparsity] ?? '';
  return language === 'zh'
    ? `${familyName(family, language)} · S≈${s}\n${family.sources.length} ${text.mean}：${pct(familyMean(family, sparsity))}\n${text.range}：${pct(low)}–${pct(high)}`
    : `${family.label} · S ≈ ${s}\n${family.sources.length} ${text.mean}: ${pct(familyMean(family, sparsity))}\n${text.range}: ${pct(low)}–${pct(high)}`;
}

export function sourceTip(family: Family, index: number, sparsity: number, language: Language) {
  const text = copy[language];
  const source = family.sources[index]!;
  const s = sparsityLabels[sparsity] ?? '';
  const ci = sparsity === data.primary ? `\n${text.ci}：${pct(source.ci[0] ?? 0)}–${pct(source.ci[1] ?? 0)}` : '';
  return language === 'zh'
    ? `${family.label} · ${text.source} ${index + 1} / ${family.sources.length}\nCE Gain（S≈${s}）：${pct(source.gain[sparsity] ?? 0)}${ci}`
    : `${family.label} · ${text.source} ${index + 1} of ${family.sources.length}\nCE Gain (S ≈ ${s}): ${pct(source.gain[sparsity] ?? 0)}${ci.replace('：', ': ')}`;
}

export function stats(sparsity: number) {
  const ranks = rankOrder(sparsity);
  const top = data.families[ranks[0]!]!;
  const bottom = data.families[ranks[ranks.length - 1]!]!;
  const positive = data.families.flatMap(family => family.sources).filter(source => (source.gain[sparsity] ?? 0) > 0).length;
  const total = data.families.reduce((sum, family) => sum + family.sources.length, 0);
  return { top, topMean: familyMean(top, sparsity), bottom, bottomMean: familyMean(bottom, sparsity), positive, total };
}
