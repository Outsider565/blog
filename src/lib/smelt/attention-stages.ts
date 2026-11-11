// Geometry and copy for Figure 16 (attention-stages): cross-visit similarity at
// each stage of attention. Shared by the Astro frontmatter and the browser script.
import data from '../../data/smelt/attention-stages.json';
import { linear } from './plot';

export type Language = 'zh' | 'en';
export type CosineKey = 'x' | 'q' | 'k' | 'v' | 'pv' | 'o';
export type StageKey = CosineKey | 'p';
export type Orientation = 'v' | 'h';

export const sizes = data.sizes as readonly string[];
export const sparsities = data.sparsities as readonly string[];
export const cosineKeys: readonly CosineKey[] = ['x', 'q', 'k', 'v', 'pv', 'o'];
export const stageOrder: readonly StageKey[] = ['x', 'q', 'k', 'p', 'v', 'pv', 'o'];
export const groups: readonly { id: 'input' | 'look' | 'read'; stages: readonly StageKey[] }[] = [
  { id: 'input', stages: ['x'] },
  { id: 'look', stages: ['q', 'k', 'p'] },
  { id: 'read', stages: ['v', 'pv', 'o'] },
];
export const patternSparsity = '85%';
export const defaultSize = '1.6B';
export const defaultSparsity = '85%';

type Cell = Record<CosineKey, [number, number]>;
type Pattern = { top8: [number, number]; control: [number, number]; chance: number; layers: [number, number, number][] };
const cells = data.cells as unknown as Record<string, Cell>;
const patterns = data.pattern as unknown as Record<string, Pattern>;
export const ranges = data.ranges as unknown as Record<CosineKey, [number, number]>;
export const patternRanges = data.patternRanges as unknown as { top8: [number, number]; control: [number, number] };

export const cellKey = (size: string, sparsity: string) => `${size}|${sparsity}`;
export const allCells = sparsities.flatMap(sparsity => sizes.map(size => ({ size, sparsity, key: cellKey(size, sparsity) })));
export function cell(size: string, sparsity: string): Cell {
  const found = cells[cellKey(size, sparsity)];
  if (!found) throw new Error(`attention-stages: no cell ${size} ${sparsity}`);
  return found;
}
export function pattern(size: string): Pattern {
  const found = patterns[size];
  if (!found) throw new Error(`attention-stages: no pattern ${size}`);
  return found;
}

export const copy = {
  zh: {
    groups: { input: '输入', look: '检索位置', read: '读取内容' },
    stages: { x: '层输入', q: '查询', k: '键', p: '注意力', v: '值', pv: '上下文', o: '输出' },
    long: { x: '层输入（Pre-LN 后的残差流）', q: '查询向量 Q（由 X 线性投影）', k: '键向量 K（由 X 线性投影）', p: '注意力权重分布 softmax(QKᵀ/√d)', v: '值向量 V（由 X 线性投影）', pv: '按注意力权重聚合的上下文 PV', o: '输出投影后写回残差流的向量 O' },
    axis: '两轮循环间的余弦相似度',
    patternAxis: 'top-8 重合率',
    scale: '规模',
    sparsity: '稀疏度 S',
    refLabel: (value: string) => `X 基准 ${value}`,
    control: (value: string) => `对照 ${value}`,
    chance: (value: string) => `随机 ${value}`,
    ratio: (value: string) => `${value}× 对照`,
    onlyAt: '仅在 S = 85% 测量',
    onlyAtLines: ['仅在', 'S = 85%', '测量'],
    legendBar: '当前配置',
    legendRail: '16 组配置范围',
    legendRef: '输入 X 基准线',
    legendDots: '逐层 top-8 重合率',
    legendControl: '对照：同层其他头',
    config: (size: string, sparsity: string) => `${size}，S = ${sparsity}`,
    tipCosine: (value: string, ci: string) => `两轮余弦相似度 ${value} ± ${ci}`,
    tipDelta: (delta: string) => `相对输入 X ${delta}`,
    tipInput: 'Q、K、V 均由其投影产生，作为比较基准',
    tipRange: (low: string, high: string) => `16 组配置范围 ${low}–${high}`,
    tipPattern: (same: string, control: string, chance: string) => `两轮 top-8 关注位置重合率 ${same}\n对照（同层其他头）${control}\n均匀随机基线 ${chance}`,
    tipLayer: (layer: number) => `第 ${layer} 层（循环块）`,
    tipLayerValues: (same: string, control: string) => `top-8 重合率 ${same}\n对照 ${control}`,
    readout: (config: string, q: string, k: string, x: string, v: string, o: string) => `<strong>${config}</strong>：Q、K 余弦保持在 ${q} / ${k}（输入 X 为 ${x}），而 V 降至 ${v}，输出 O 进一步降至 ${o}。`,
    stats: [
      ['0.89–0.93', 'Q、K 余弦相似度（16 组配置）', 'loop'],
      ['0.65–0.74', 'V 余弦相似度', ''],
      ['0.49–0.64', '输出 O 余弦相似度', ''],
      ['56–66%', 'top-8 关注位置重合率，S = 85%（对照 28–34%）', 'loop'],
    ],
    table: '查看全部数值',
    tableCosine: 'Attention 各阶段两轮余弦相似度（4 档规模 × 4 档稀疏度）',
    tablePattern: '两轮循环 top-8 关注位置重合率（S = 85%）',
    tableHead: { config: '配置', same: '同一注意力头', control: '对照' },
    aria: 'Attention 各计算阶段在两轮循环间的表征相似度',
  },
  en: {
    groups: { input: 'Input', look: 'Where to look', read: 'What is read' },
    stages: { x: 'input', q: 'query', k: 'key', p: 'pattern', v: 'value', pv: 'context', o: 'output' },
    long: { x: 'Layer input (residual stream after LayerNorm)', q: 'Query, a projection of X', k: 'Key, a projection of X', p: 'Attention pattern softmax(QKᵀ/√d)', v: 'Value, a projection of X', pv: 'Context read through the pattern', o: 'Output written back to the residual stream' },
    axis: 'Visit 1 vs visit 2 cosine',
    patternAxis: 'top-8 overlap',
    scale: 'Scale',
    sparsity: 'Sparsity S',
    refLabel: (value: string) => `X level ${value}`,
    control: (value: string) => `control ${value}`,
    chance: (value: string) => `chance ${value}`,
    ratio: (value: string) => `${value}× control`,
    onlyAt: 'measured at S = 85% only',
    onlyAtLines: ['measured', 'at S = 85%', 'only'],
    legendBar: 'selected configuration',
    legendRail: 'range over 16 configurations',
    legendRef: 'input X level',
    legendDots: 'top-8 overlap per layer',
    legendControl: 'control: other head, same layer',
    config: (size: string, sparsity: string) => `${size}, S = ${sparsity}`,
    tipCosine: (value: string, ci: string) => `Cross-visit cosine ${value} ± ${ci}`,
    tipDelta: (delta: string) => `${delta} vs. input X`,
    tipInput: 'Read by all three projections: the reference level',
    tipRange: (low: string, high: string) => `Range over 16 configurations ${low}–${high}`,
    tipPattern: (same: string, control: string, chance: string) => `Top-8 attended tokens shared across visits ${same}\nControl (other head, same layer) ${control}\nUniform chance ${chance}`,
    tipLayer: (layer: number) => `Layer ${layer} (repeated block)`,
    tipLayerValues: (same: string, control: string) => `Top-8 overlap ${same}\nControl ${control}`,
    readout: (config: string, q: string, k: string, x: string, v: string, o: string) => `<strong>${config}</strong>: Q and K stay at ${q} / ${k} (input X ${x}); V drops to ${v} and the output O to ${o}.`,
    stats: [
      ['0.89–0.93', 'Q and K cosine (16 configurations)', 'loop'],
      ['0.65–0.74', 'V cosine', ''],
      ['0.49–0.64', 'Output O cosine', ''],
      ['56–66%', 'top-8 attended tokens shared, S = 85% (control 28–34%)', 'loop'],
    ],
    table: 'All values',
    tableCosine: 'Cross-visit cosine at each stage (4 scales × 4 sparsities)',
    tablePattern: 'Top-8 attended tokens shared across visits (S = 85%)',
    tableHead: { config: 'Configuration', same: 'Same head', control: 'Control' },
    aria: 'Cross-visit similarity at each stage of attention',
  },
} as const;

export const symbols: Record<StageKey, string> = { x: 'X', q: 'Q', k: 'K', p: 'P', v: 'V', pv: 'PV', o: 'O' };
export const fmt = (value: number, digits = 2) => value.toFixed(digits);
export const pct = (value: number, digits = 0) => `${(value * 100).toFixed(digits)}%`;
export const signedFmt = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;

// ---------------------------------------------------------------- geometry
// Wide layout: stages run left to right as vertical bars (760 user units).
export const wide = { width: 760, height: 366, left: 56, right: 748, top: 104, bottom: 330, bar: 40 } as const;
// Narrow layout: stages run top to bottom as horizontal bars (340 user units).
export const narrow = { width: 340, x0: 96, x1: 298, groupRow: 28, row: 34, patternRow: 78, bar: 14, top: 4 } as const;
/** In the narrow layout the attention-pattern row is a small panel of its own:
 *  its % tick labels on top, the per-layer dots in the middle, labels below. */
export const narrowPatternY = (rowCentre: number) => rowCentre - 2;

// The attention-pattern column is 1.5 units wide so it can carry its own % axis.
const offsets: Record<StageKey, number> = { x: 0.5, q: 2, k: 3, p: 4.4, v: 5.7, pv: 6.7, o: 7.7 };
export const wideUnit = (wide.right - wide.left) / 8.2;
export const wideCenter = (stage: StageKey) => wide.left + wideUnit * offsets[stage];
/** Half width of a stage column; the attention-pattern panel is wider than a bar column. */
export const wideHalf = (stage: StageKey) => (stage === 'p' ? 0.75 : 0.5) * wideUnit;
/** Top of the attention-pattern panel (wide layout), above the 100% line so its label fits. */
export const widePanelTop = wide.top - 18;
/** Tick values of the attention-pattern panel's own percent axis. */
export const patternTicks = [0, 0.5, 1] as const;
export const ratioText = (top8: number, control: number) => (top8 / control).toFixed(1);
export const wideY = linear([0, 1], [wide.bottom, wide.top]);
export const narrowX = linear([0, 1], [narrow.x0, narrow.x1]);

/** Row layout of the narrow chart: y of every group header and stage row centre. */
export function narrowRows() {
  const headers: { id: string; y: number }[] = [];
  const rows = {} as Record<StageKey, number>;
  let y = narrow.top;
  for (const group of groups) {
    headers.push({ id: group.id, y: y + 18 });
    y += narrow.groupRow;
    for (const stage of group.stages) {
      const height = stage === 'p' ? narrow.patternRow : narrow.row;
      rows[stage] = y + height / 2;
      y += height;
    }
  }
  return { headers, rows, bottom: y, height: y + 30 };
}

/** Deterministic beeswarm offsets: place each value at the smallest free offset across the axis. */
export function swarm(values: readonly number[], toPosition: (value: number) => number, radius = 3, step = 7, limit = 3) {
  const placed: { along: number; across: number }[] = [];
  const order = values.map((value, index) => ({ value, index })).sort((first, second) => first.value - second.value);
  const result = new Array<number>(values.length).fill(0);
  for (const { value, index } of order) {
    const along = toPosition(value);
    const candidates = [0];
    for (let k = 1; k <= limit; k++) candidates.push(k * step, -k * step);
    const across = candidates.find(offset => placed.every(point => Math.hypot(point.along - along, point.across - offset) >= radius * 2 + 0.6)) ?? candidates.at(-1)!;
    placed.push({ along, across });
    result[index] = across;
  }
  return result;
}

/** Tooltip text for one cosine stage in one configuration. */
export function cosineTip(language: Language, stage: CosineKey, size: string, sparsity: string) {
  const text = copy[language];
  const values = cell(size, sparsity);
  const [value, ci] = values[stage];
  const lines = [`${symbols[stage]} · ${text.long[stage]}`, text.config(size, sparsity), text.tipCosine(fmt(value, 3), fmt(ci, 3))];
  lines.push(stage === 'x' ? text.tipInput : text.tipDelta(signedFmt(value - values.x[0])));
  lines.push(text.tipRange(fmt(ranges[stage][0], 3), fmt(ranges[stage][1], 3)));
  return lines.join('\n');
}

export function patternTip(language: Language, size: string) {
  const text = copy[language];
  const values = pattern(size);
  return [`P · ${text.long.p}`, text.config(size, patternSparsity), text.tipPattern(pct(values.top8[0], 1), pct(values.control[0], 1), pct(values.chance, 1))].join('\n');
}

export function layerTip(language: Language, layer: [number, number, number]) {
  const text = copy[language];
  return `${text.tipLayer(layer[0])}\n${text.tipLayerValues(pct(layer[1]), pct(layer[2]))}`;
}

export function readout(language: Language, size: string, sparsity: string) {
  const text = copy[language];
  const values = cell(size, sparsity);
  return text.readout(text.config(size, sparsity), fmt(values.q[0]), fmt(values.k[0]), fmt(values.x[0]), fmt(values.v[0]), fmt(values.o[0]));
}
