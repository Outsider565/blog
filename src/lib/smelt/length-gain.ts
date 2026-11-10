// Layout and copy for Figure 12 (normalized gain by sample length). Shared by
// the Astro component and the browser script.
import data from '../../data/smelt/length-gain.json';
import { bandPath, linePath, linear, type Point } from './plot';
import type { Language } from '../site';

export type Variant = 'wide' | 'narrow';
export type SeriesKey = 'loop' | 'size' | 'experts';
export const seriesKeys: SeriesKey[] = ['loop', 'size', 'experts'];

export interface Geometry { width: number; height: number; x0: number; x1: number; y0: number; y1: number }
export const geometry: Record<Variant, Geometry> = {
  wide: { width: 760, height: 408, x0: 60, x1: 620, y0: 344, y1: 46 },
  narrow: { width: 360, height: 360, x0: 30, x1: 354, y0: 294, y1: 54 },
};
export const yDomain = [0.4, 1.4] as const;
export const yTicks = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
export const half = data.buckets.length / 2;

export const xAt = (variant: Variant, index: number) => {
  const g = geometry[variant];
  const step = (g.x1 - g.x0) / data.buckets.length;
  return g.x0 + (index + 0.5) * step;
};
export const stepOf = (variant: Variant) => (geometry[variant].x1 - geometry[variant].x0) / data.buckets.length;
export const yScale = (variant: Variant) => linear(yDomain, [geometry[variant].y0, geometry[variant].y1]);

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
export function halves(key: SeriesKey) {
  const shape = data.series[key].shape;
  const short = mean(shape.slice(0, half));
  const long = mean(shape.slice(half));
  return { short, long, ratio: long / short };
}

export function seriesPaths(variant: Variant, key: SeriesKey) {
  const y = yScale(variant);
  const { shape, sem } = data.series[key];
  const points: Point[] = shape.map((value, index) => [xAt(variant, index), y(value)]);
  const upper: Point[] = shape.map((value, index) => [xAt(variant, index), y(value + (sem[index] ?? 0))]);
  const lower: Point[] = shape.map((value, index) => [xAt(variant, index), y(value - (sem[index] ?? 0))]);
  return { points, line: linePath(points), band: bandPath(upper, lower) };
}

/** Horizontal segments at the short-half and long-half means. */
export function halfSegments(variant: Variant, short: number, long: number) {
  const y = yScale(variant);
  const inset = stepOf(variant) * 0.28;
  return {
    short: { x1: xAt(variant, 0) - inset, x2: xAt(variant, half - 1) + inset, y: y(short) },
    long: { x1: xAt(variant, half) - inset, x2: xAt(variant, data.buckets.length - 1) + inset, y: y(long) },
  };
}

/** Right-margin label positions (wide layout), pushed apart so they never overlap. */
export function labelPositions(variant: Variant, keys: readonly SeriesKey[], gap = 34) {
  const y = yScale(variant);
  const items = keys.map(key => ({ key, y: y(halves(key).long) })).sort((a, b) => a.y - b.y);
  for (let index = 1; index < items.length; index++) {
    const previous = items[index - 1]!;
    const item = items[index]!;
    if (item.y - previous.y < gap) item.y = previous.y + gap;
  }
  return Object.fromEntries(items.map(item => [item.key, item.y])) as Record<SeriesKey, number>;
}

export const ratioLabel = (value: number) => `${value.toFixed(2)}×`;
/** "0.985 ± 0.003": three decimals so small standard errors never print as 0.00. */
export const valueWithSem = (value: number, sem: number) => `${value.toFixed(3)}\u00a0±\u00a0${sem.toFixed(3)}`;
export const bucketLabel = (value: number, compact: boolean) => compact && value >= 1024 ? `${value / 1024}K` : String(value);

const copy = {
  zh: {
    series: { loop: 'SMELT vs 基线', size: '增加参数', experts: '增加专家' },
    direct: { loop: 'SMELT', size: '增加参数', experts: '增加专家' },
    seriesLong: { loop: 'SMELT vs 基线（匹配对比）', size: '增加参数（基线内部对照）', experts: '增加专家（基线内部对照）' },
    contrasts: { loop: '组匹配的 SMELT / 基线对比', size: '组相邻规模的基线对比', experts: '组相邻稀疏度的基线对比' },
    yAxis: '归一化收益',
    xAxis: '样本长度区间（上界，token）',
    xAxisShort: '样本长度（上界，token）',
    short: '短样本 32–256',
    long: '长样本 512–4096',
    average: '= 平均',
    bucket: (value: number) => `长度区间上界：${value}\u00a0token`,
    stat: { loop: 'SMELT：长样本平均收益 ÷ 短样本平均收益', size: '增加参数：长短样本几乎一样', experts: '增加专家：反而略偏向短样本' },
    legend: '显示或隐藏曲线',
    aria: '归一化收益随样本长度的变化',
  },
  en: {
    series: { loop: 'SMELT vs Baseline', size: 'More parameters', experts: 'More experts' },
    direct: { loop: 'SMELT', size: 'More params', experts: 'More experts' },
    seriesLong: { loop: 'SMELT vs Baseline (matched pairs)', size: 'More parameters (Baseline only)', experts: 'More experts (Baseline only)' },
    contrasts: { loop: 'matched SMELT / Baseline contrasts', size: 'Baseline contrasts between adjacent scales', experts: 'Baseline contrasts between adjacent sparsities' },
    yAxis: 'Normalized gain',
    xAxis: 'Sample length bucket (upper bound, tokens)',
    xAxisShort: 'Sample length (upper bound, tokens)',
    short: 'Short 32–256',
    long: 'Long 512–4096',
    average: '= mean',
    bucket: (value: number) => `Length bucket, upper bound ${value}\u00a0tokens`,
    stat: { loop: 'SMELT: mean gain on long samples ÷ on short ones', size: 'More parameters: long ≈ short', experts: 'More experts: tilts slightly toward short samples' },
    legend: 'Show or hide curves',
    aria: 'Normalized gain across sample lengths',
  },
} as const;
export const lengthCopy = (language: Language) => copy[language];

export function bucketTip(index: number, language: Language, visible: readonly SeriesKey[] = seriesKeys) {
  const text = copy[language];
  const lines = visible.map(key => {
    const series = data.series[key];
    return `${text.series[key]}  ${valueWithSem(series.shape[index] ?? 0, series.sem[index] ?? 0)}`;
  });
  return [text.bucket(data.buckets[index] ?? 0), ...lines].join('\n');
}
