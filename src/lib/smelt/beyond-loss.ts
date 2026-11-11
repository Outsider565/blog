// Geometry, residuals and copy for BeyondLoss (Figure 10): downstream score
// against validation loss with the Baseline-fitted sigmoid, and the SMELT
// residual by scale. Shared by the Astro component and the browser script.
import data from '../../data/smelt/beyond-loss.json';
import { pairs, sizes, sparsities, steps, tickText, type Pair } from './downstream-pairs';
import { linear, ticks, type Scale } from './plot';
import type { Language } from '../site';

export type BenchKey = 'core' | 'mmlu' | 'comp';
export const benchKeys: BenchKey[] = ['core', 'mmlu', 'comp'];
export type ScaleKey = 'all' | string;
const byKey = new Map(data.metrics.map(metric => [metric.key, metric]));
export const bench = (key: BenchKey) => byKey.get(key)!;

/** Baseline fit ŷ(loss) in raw units (fraction or nats). */
export function fitValue(key: BenchKey, loss: number) {
  const { fit } = bench(key);
  const direction = fit.direction === 'increasing' ? 1 : -1;
  const exponent = Math.max(-700, Math.min(700, -direction * fit.alpha * (loss - fit.tau)));
  return fit.b + fit.a / (1 + Math.exp(exponent));
}
/** Display units for the score axis: accuracies in %, the completion loss in nats. */
export const toDisplay = (key: BenchKey, raw: number) => key === 'comp' ? raw : raw * 100;
export const rawValue = (pair: Pair, key: BenchKey, arch: 0 | 1) => pair[key][arch];
/** Residual δ = scale · sign · (y − ŷ(ℓ)); positive means better than a Baseline at the same loss. */
export function residual(pair: Pair, key: BenchKey, arch: 0 | 1) {
  const metric = bench(key);
  return metric.scale * metric.sign * (rawValue(pair, key, arch) - fitValue(key, pair.loss[arch]));
}
export const unit = (key: BenchKey, language: Language) => key === 'comp' ? (language === 'zh' ? 'mnat' : 'mnat') : 'pp';
export const signed = (value: number, digits: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;
export const digits = (key: BenchKey) => key === 'comp' ? 1 : 2;

export function scaleSummary(key: BenchKey, size: string) {
  const own = pairs.filter(pair => pair.size === size);
  const loop = own.map(pair => residual(pair, key, 1));
  const base = own.map(pair => residual(pair, key, 0));
  const recorded = bench(key).perScale[size as keyof ReturnType<typeof bench>['perScale']];
  return {
    mean: recorded?.mean ?? loop.reduce((sum, value) => sum + value, 0) / loop.length,
    positive: recorded?.positive ?? loop.filter(value => value > 0).length,
    total: own.length,
    baseMean: base.reduce((sum, value) => sum + value, 0) / base.length,
  };
}
export const pooled = (key: BenchKey) => {
  const metric = bench(key);
  const positive = pairs.filter(pair => residual(pair, key, 1) > 0).length;
  return { mean: metric.mean, ci: metric.ci as number[], positive, total: pairs.length, r2: metric.r2 };
};
export const monotone = (key: BenchKey) => sizes.every((size, index) => index === 0 || scaleSummary(key, size).mean > scaleSummary(key, sizes[index - 1]!).mean);

// Panels are authored 340 units wide; two columns on desktop and tablet, one
// stacked column on phones keep 13-unit text at or above 12 px.
export const size = { width: 340, height: 306 } as const;
export const scatterBox = { x0: 42, x1: 330, y0: 12, y1: 258 } as const;
export const residualBox = { x0: 42, x1: 332, y0: 12, y1: 228 } as const;
export const lossDomain = [1.62, 2.56] as const;
export const lossScale = linear(lossDomain, [scatterBox.x0, scatterBox.x1]);
export const lossTicks = [1.8, 2.0, 2.2, 2.4];

const scoreDomains: Record<BenchKey, readonly [number, number]> = { core: [5, 49], mmlu: [21, 61], comp: [1.9, 3.1] };
export function scoreAxis(key: BenchKey): { scale: Scale; ticks: { value: number; label: string }[] } {
  const domain = scoreDomains[key];
  const values = ticks(domain[0], domain[1], key === 'comp' ? 6 : 5);
  return { scale: linear(domain, [scatterBox.y1, scatterBox.y0]), ticks: values.map(value => ({ value, label: tickText(value) })) };
}

export function residualAxis(key: BenchKey) {
  const values = [...pairs.map(pair => residual(pair, key, 1)), ...sizes.map(size => scaleSummary(key, size).baseMean)];
  const metric = bench(key);
  const low = Math.min(...values, metric.ci[0] ?? 0, 0);
  const high = Math.max(...values, metric.ci[1] ?? 0);
  const pad = (high - low) * 0.07;
  const domain = [low - pad, high + pad] as const;
  const values2 = ticks(domain[0], domain[1], 6);
  const label = (value: number) => Math.abs(value) < 1e-9 ? '0' : `${value > 0 ? '+' : '−'}${tickText(Math.abs(value))}`;
  return { scale: linear(domain, [residualBox.y1, residualBox.y0]), ticks: values2.map(value => ({ value, label: label(value) })) };
}

export const columns = [...sizes, 'all'] as const;
const band = (residualBox.x1 - residualBox.x0) / columns.length;
export const columnCenter = (index: number) => residualBox.x0 + band * (index + 0.5);
export const columnWidth = band;
/** Deterministic spread of the 24 endpoints of a scale across its column. */
export function jitter(pair: Pair) {
  const order = sparsities.findIndex(item => item.es === pair.es) * steps.length + steps.indexOf(pair.step);
  return ((order * 7) % 24) / 23 - 0.5;
}

export function fitPath(key: BenchKey, axis = scoreAxis(key)) {
  const samples = 96;
  const points: [number, number][] = [];
  for (let index = 0; index <= samples; index++) {
    const loss = lossDomain[0] + (lossDomain[1] - lossDomain[0]) * index / samples;
    points.push([lossScale(loss), axis.scale(toDisplay(key, fitValue(key, loss)))]);
  }
  return points;
}

const benchCopy = {
  core: {
    zh: { name: 'DCLM Core', axis: 'DCLM Core（中心化准确率，%）', better: '越高越好' },
    en: { name: 'DCLM Core', axis: 'DCLM Core (centered accuracy, %)', better: 'higher is better' },
  },
  mmlu: {
    zh: { name: 'MMLU', axis: 'MMLU 准确率（%）', better: '越高越好' },
    en: { name: 'MMLU', axis: 'MMLU accuracy (%)', better: 'higher is better' },
  },
  comp: {
    zh: { name: 'DCLM Completion', axis: 'DCLM Completion（nats）', better: '越低越好' },
    en: { name: 'DCLM Completion', axis: 'DCLM Completion (nats)', better: 'lower is better' },
  },
} as const;
export const benchText = (key: BenchKey, language: Language) => benchCopy[key][language];

export const copy = {
  zh: {
    benchmark: '评测基准', scale: '规模', all: '全部',
    scatterTitle: '下游得分 vs. validation loss', residualTitle: '同 loss 下的额外下游收益',
    residualAxis: (key: BenchKey) => `SMELT 拟合残差（${key === 'comp' ? 'mnat，已翻转符号使正值代表更优' : 'pp'}）`,
    loss: 'validation loss', base: 'Baseline', loop: 'SMELT', fit: 'Baseline 拟合曲线', stickUp: 'SMELT 优于拟合曲线', stickDown: 'SMELT 低于拟合曲线',
    baseTick: '同规模 Baseline 平均残差', chance: '随机水平 25%',
    mean: '平均拟合残差', ci: '95% 置信区间', baseMean: '同规模 Baseline', sameScaleGap: '相对同规模 Baseline 差值',
    statMean: (key: BenchKey) => `平均拟合残差（${key === 'comp' ? 'mnat' : 'pp'}）；95% CI`,
    statMeanScale: (key: BenchKey, scale: string) => `${scale} 平均拟合残差（${key === 'comp' ? 'mnat' : 'pp'}）；同规模 Baseline`,
    statScales: '个模型规模的平均残差为正',
    statPoints: '个 SMELT 评测点优于 Baseline 拟合曲线',
    statPointsScale: (scale: string) => `个 ${scale} 的 SMELT 评测点优于 Baseline 拟合曲线`,
    table: '数据表：各规模平均拟合残差', endpoints: '数据表：全部 96 组配对评测点', positive: '优于拟合曲线',
    pooled: '全部（合并）', pooledBase: 'Baseline 合并拟合残差均值为 0（曲线由 Baseline 拟合）',
    branch: '训练检查点（步）', lossCol: 'validation loss（Baseline / SMELT）', scoreCol: '得分（Baseline / SMELT）', fitCol: '同 loss 处拟合值',
    loopResidual: 'SMELT 拟合残差', baseResidual: 'Baseline 拟合残差',
    scatterKeys: '可用方向键逐点浏览',
  },
  en: {
    benchmark: 'Benchmark', scale: 'Scale', all: 'All',
    scatterTitle: 'Score against validation loss', residualTitle: 'Extra gain at equal loss',
    residualAxis: (key: BenchKey) => `SMELT residual (${key === 'comp' ? 'mnat, sign flipped so higher is better' : 'pp'})`,
    loss: 'Validation loss', base: 'Baseline', loop: 'SMELT', fit: 'Baseline fit', stickUp: 'SMELT beats the curve', stickDown: 'SMELT falls short of it',
    baseTick: 'Same-scale Baseline mean residual', chance: 'Chance 25%',
    mean: 'Mean residual', ci: '95% CI', baseMean: 'Same-scale Baseline', sameScaleGap: 'Gap to same-scale Baseline',
    statMean: (key: BenchKey) => `mean SMELT residual (${key === 'comp' ? 'mnat' : 'pp'}); 95% CI`,
    statMeanScale: (key: BenchKey, scale: string) => `mean SMELT residual at ${scale} (${key === 'comp' ? 'mnat' : 'pp'}); same-scale Baseline`,
    statScales: 'scales with a positive mean residual',
    statPoints: 'SMELT endpoints that beat the Baseline curve',
    statPointsScale: (scale: string) => `${scale} SMELT endpoints that beat the Baseline curve`,
    table: 'Data: mean residual by scale', endpoints: 'Data: all 96 matched endpoints', positive: 'Beat the curve',
    pooled: 'All (pooled)', pooledBase: 'Pooled Baseline mean residual is 0 (the curve is fitted to the Baseline)',
    branch: 'Branch (step)', lossCol: 'Validation loss B / S', scoreCol: 'Score B / S', fitCol: 'Fit at SMELT loss',
    loopResidual: 'SMELT residual', baseResidual: 'Baseline residual',
    scatterKeys: 'arrow keys step through the points',
  },
} as const;

/** Headline numbers: pooled over all scales, or for the selected scale. */
export function statValues(key: BenchKey, language: Language, scale: ScaleKey = 'all') {
  const all = pooled(key);
  const d = digits(key);
  const text = copy[language];
  const positiveScales = sizes.filter(size => scaleSummary(key, size).mean > 0).length;
  if (scale !== 'all') {
    const own = scaleSummary(key, scale);
    return {
      meanValue: own.mean, positive: own.positive, total: own.total,
      mean: signed(own.mean, d),
      meanLabel: `${text.statMeanScale(key, scale)} ${signed(own.baseMean, d)}`,
      scales: `${positiveScales} / ${sizes.length}`,
      points: `${own.positive} / ${own.total}`,
      pointsLabel: text.statPointsScale(scale),
    };
  }
  return {
    meanValue: all.mean, positive: all.positive, total: all.total,
    mean: signed(all.mean, d),
    meanLabel: `${text.statMean(key)} ${signed(all.ci[0] ?? 0, d)}${language === 'zh' ? ' 至 ' : ' to '}${signed(all.ci[1] ?? 0, d)}`,
    scales: `${positiveScales} / ${sizes.length}`,
    points: `${all.positive} / ${all.total}`,
    pointsLabel: text.statPoints,
  };
}

/** Readout sentence for the current benchmark and selected scale. */
export function readout(key: BenchKey, scale: ScaleKey, language: Language) {
  const zh = language === 'zh';
  const d = digits(key);
  const u = unit(key, language);
  const name = benchText(key, language).name;
  if (scale !== 'all') {
    const own = scaleSummary(key, scale);
    return zh
      ? `${scale}：${own.total} 个 SMELT 评测点中有 ${own.positive} 个优于 Baseline 拟合曲线，平均拟合残差 ${signed(own.mean, d)} ${u}。`
      : `${scale}: ${own.positive} of ${own.total} SMELT endpoints beat the Baseline curve, mean residual ${signed(own.mean, d)} ${u}.`;
  }
  const means = sizes.map(size => scaleSummary(key, size).mean);
  const first = means[0] ?? 0;
  const last = means[means.length - 1] ?? 0;
  return monotone(key)
    ? (zh
      ? `相对四档规模合并拟合的 Baseline 曲线，SMELT 在 ${name} 上的平均残差从 100M 的 ${signed(first, d)} ${u} 单调增至 1.6B 的 ${signed(last, d)} ${u}。`
      : `Against the Baseline curve pooled over all four scales, SMELT's mean ${name} residual rises at every step, from ${signed(first, d)} ${u} at 100M to ${signed(last, d)} ${u} at 1.6B.`)
    : (zh
      ? `相对合并拟合的 Baseline 曲线，SMELT 在 ${name} 上两档较大规模的平均残差高于较小规模（${sizes.map((size, index) => `${size} ${signed(means[index] ?? 0, d)}`).join('、')} ${u}），但未严格单调递增。`
      : `Against the pooled Baseline curve, SMELT's mean ${name} residual is higher at the two larger scales than at the two smaller ones (${sizes.map((size, index) => `${size} ${signed(means[index] ?? 0, d)}`).join(', ')} ${u}), though not at every step.`);
}

/** In-chart annotation for panel a: three short lines placed in the empty corner. */
export function note(key: BenchKey, scale: ScaleKey, language: Language) {
  const zh = language === 'zh';
  const d = digits(key);
  const value = scale === 'all' ? pooled(key).mean : scaleSummary(key, scale).mean;
  const amount = key === 'comp' ? `${Math.abs(value).toFixed(d)} mnat` : `${signed(value, d)} pp`;
  const lines = key === 'comp'
    ? (zh ? ['相同 validation loss 下', `${scale === 'all' ? '' : `${scale} `}SMELT 平均低 ${amount}`, '差值较小，放大残差见右图 b'] : ['At equal validation loss', `${scale === 'all' ? '' : `${scale} `}SMELT is ${amount} lower:`, 'too small to see here; see b'])
    : (zh ? ['相同 validation loss 下', `${scale === 'all' ? '' : `${scale} `}SMELT 平均 ${amount}`, '高于 Baseline 曲线'] : ['At equal validation loss', `${scale === 'all' ? '' : `${scale} `}SMELT averages ${amount}`, 'above the Baseline curve']);
  const left = key === 'comp';
  return { lines, x: left ? scatterBox.x0 + 10 : scatterBox.x1 - 6, anchor: left ? 'start' : 'end', y: scatterBox.y0 + 24 };
}

export function pointTip(pair: Pair, arch: 0 | 1, key: BenchKey, language: Language) {
  const zh = language === 'zh';
  const text = copy[language];
  const value = toDisplay(key, rawValue(pair, key, arch));
  const predicted = toDisplay(key, fitValue(key, pair.loss[arch]));
  const sparsity = sparsities.find(item => item.es === pair.es)?.en ?? '';
  const step = pair.step >= 196000 ? '196k' : `${Math.round(pair.step / 1000)}k`;
  const d = key === 'comp' ? 3 : 2;
  return [
    `${arch ? text.loop : text.base} · ${pair.size} · S ${sparsity} · ${step}${zh ? ' 步分支' : ' step branch'}`,
    `${text.loss} ${pair.loss[arch].toFixed(4)}`,
    `${benchText(key, language).name} ${value.toFixed(d)}${zh ? '；拟合 ' : '; fit '}${predicted.toFixed(d)}`,
    `${zh ? '拟合残差 ' : 'Residual '}${signed(residual(pair, key, arch), digits(key))} ${unit(key, language)}`,
  ].join('\n');
}

/** One row of the per-endpoint table, formatted for display. */
export function endpointRow(pair: Pair, key: BenchKey, language: Language) {
  const d = key === 'comp' ? 3 : 2;
  const u = unit(key, language);
  const sparsity = sparsities.find(item => item.es === pair.es)?.en ?? '';
  const step = pair.step >= 196000 ? '196k' : `${Math.round(pair.step / 1000)}k`;
  const loop = residual(pair, key, 1);
  return {
    size: pair.size, sparsity, step,
    loss: `${pair.loss[0].toFixed(4)} / ${pair.loss[1].toFixed(4)}`,
    score: `${toDisplay(key, pair[key][0]).toFixed(d)} / ${toDisplay(key, pair[key][1]).toFixed(d)}`,
    fit: toDisplay(key, fitValue(key, pair.loss[1])).toFixed(d),
    loop: `${signed(loop, digits(key))} ${u}`, loopUp: loop > 0,
    base: `${signed(residual(pair, key, 0), digits(key))} ${u}`,
  };
}

/** SMELT endpoints visible at this scale, sorted by validation loss (keyboard order in panel a). */
export function keyboardOrder(arch: 0 | 1, scale: ScaleKey) {
  return pairs.filter(pair => scale === 'all' || pair.size === scale).sort((a, b) => a.loss[arch] - b.loss[arch]).map(pair => pair.index);
}
