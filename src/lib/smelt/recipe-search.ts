// Data model, copy and geometry for the three recipe-search figures (loop span,
// executed depth, loop count). Runs at build time (Astro renders the default
// state) and in the browser (the script recomputes geometry and tweens to it).
import data from '../../data/smelt/recipe-search.json';
import { linear, linePath, signed } from './plot';
import type { Language } from '../site';

export type Mode = 'span' | 'aspect' | 'count';
export type Sparsity = '85' | '95';
export type Series = 'base' | 'loop';
export type Variant = 'wide' | 'narrow';
export interface State { mode: Mode; key: number; sparsity: Sparsity }

export interface Run {
  id: string;
  series: Series;
  key: number;
  physical: number;
  executed: number;
  looped: number;
  visits: number;
  pct: number;
  loss: number;
  core: number;
  coreSe: number;
  completion: number;
}

export const keys: Record<Mode, number[]> = { span: [0, 2, 4, 6, 8, 10, 12], aspect: [9, 12, 15, 18, 21], count: [1, 2, 3, 4] };
export const defaults: Record<Mode, number> = { span: 6, aspect: 18, count: 2 };
const physicalDepth = 12;
const baselineWidth = data.widths.baseline;
const smeltWidth = data.widths.smelt;

export const reference = (sparsity: Sparsity) => data.reference[sparsity];
export const loss4 = (value: number) => value.toFixed(4);
export const delta4 = (value: number) => signed(value, 4);

/** Every run of a sweep, Baseline points included, in x order. */
export function runs(mode: Mode, sparsity: Sparsity = '85'): Run[] {
  if (mode === 'span') {
    return data.span[sparsity].map(row => ({
      id: `s${row.looped}`, series: row.looped === 0 ? 'base' : 'loop', key: row.looped, physical: physicalDepth,
      executed: row.executed, looped: row.looped, visits: row.looped ? 2 : 1, pct: row.pct,
      loss: row.loss, core: row.core, coreSe: row.coreSe, completion: row.completion,
    }));
  }
  if (mode === 'aspect') {
    const base = data.aspect.baseline.map(row => ({
      id: `b${row.executed}`, series: 'base' as const, key: row.executed, physical: row.physical, executed: row.executed,
      looped: 0, visits: 1, pct: 0, loss: row.loss, core: row.core, coreSe: row.coreSe, completion: row.completion,
    }));
    const loop = data.aspect.looped.map(row => ({
      id: `l${row.executed}`, series: 'loop' as const, key: row.executed, physical: row.physical, executed: row.executed,
      looped: row.physical / 2, visits: 2, pct: 50, loss: row.loss, core: row.core, coreSe: row.coreSe, completion: row.completion,
    }));
    return [...base, ...loop];
  }
  return data.count.map(row => ({
    id: `c${row.visits}`, series: row.visits === 1 ? 'base' : 'loop', key: row.visits, physical: physicalDepth,
    executed: row.executed, looped: row.visits === 1 ? 0 : 6, visits: row.visits, pct: row.visits === 1 ? 0 : 50,
    loss: row.loss, core: row.core, coreSe: row.coreSe, completion: row.completion,
  }));
}

/** Lowest-loss run among the looped settings (and, for aspect, among Baselines too). */
export function bestRuns(mode: Mode, sparsity: Sparsity = '85'): Run[] {
  const all = runs(mode, sparsity);
  const pick = (list: Run[]) => list.reduce((best, run) => run.loss < best.loss ? run : best);
  const loop = all.filter(run => run.series === 'loop');
  if (mode === 'aspect') return [pick(all.filter(run => run.series === 'base')), pick(loop)];
  return [pick(loop)];
}

/** The run the readout and stats describe for a selection. */
export function focusRun(mode: Mode, key: number, sparsity: Sparsity = '85') {
  const all = runs(mode, sparsity);
  if (mode === 'aspect') return all.find(run => run.series === 'loop' && run.key === key);
  return all.find(run => run.key === key);
}

/* ------------------------------------------------------------------ copy */

type Copy = {
  base: string; loop: string; loopShort: string; yLabel: string; lowest: string; optimum: string;
  ref: (value: string) => string; refBest: (value: string) => string; refShort: string;
  control: Record<Mode, string>; sparsity: string; xTitle: Record<Mode, string>; xTitleNarrow: Record<Mode, string>;
  physicalExecuted: string; layers: (count: number) => string; notRun: string;
  stat: Record<Mode, (state: State) => [string, string, string]>;
  readout: (state: State) => string;
  tip: (mode: Mode, run: Run, sparsity: Sparsity) => string;
  pointLabel: (mode: Mode, run: Run) => string;
  schematicCaption: (state: State) => string;
  schematicNote: Record<Mode, string>;
  noLoopNote: string;
  schematicLabel: Record<Mode, string>;
  visit: (index: number) => string;
  physicalLine: (count: number) => string; executedLine: (count: number) => string;
  shift: string;
  table: { summary: string; note: Record<Mode, string>; group85: string; group95: string; loss: string; core: string; completion: string; looped: string; span: string; executed: string; physical: string; model: string };
  countModel: (visits: number) => string;
  chartLabel: Record<Mode, string>;
  bracketBase: string;
};

const spanRange = (looped: number) => {
  const start = Math.floor((physicalDepth - looped) / 2) + 1;
  return [start, start + looped - 1] as const;
};

export const copy: Record<Language, Copy> = {
  zh: {
    base: 'Baseline', loop: 'Looped Transformer', loopShort: 'Looped', yLabel: 'validation loss ↓', lowest: '最低', optimum: '最优',
    ref: value => `Baseline ${value}`, refBest: value => `Baseline 最优 ${value}`, refShort: 'Baseline 最优',
    control: { span: '循环层数', aspect: '执行深度', count: '循环轮数' }, sparsity: '稀疏度',
    xTitle: { span: '循环层数（物理总深 12 层）', aspect: '执行深度（层）· 等 FLOPs 下越深越窄 →', count: '循环块执行轮数' },
    xTitleNarrow: { span: '循环层数（共 12 层）', aspect: '执行深度 · 同 FLOPs 下越深越窄', count: '循环块执行轮数' },
    physicalExecuted: '标注：物理层数 / 执行层数', layers: count => `${count} 层`, notRun: '未训练',
    stat: {
      span: () => ['validation loss', '相对 Baseline', '单 token 执行层数'],
      aspect: state => {
        const loop = runs('aspect').find(run => run.series === 'loop' && run.key === state.key);
        return [loop ? `Looped ${loop.physical}/${loop.executed}` : 'Looped', `Baseline（${state.key} 层）`, 'Looped 相对 Baseline 最优'];
      },
      count: () => ['validation loss', '相对 Baseline', '执行层数'],
    },
    readout: state => {
      const run = focusRun(state.mode, state.key, state.sparsity);
      const [best] = bestRuns(state.mode, state.sparsity).slice(-1);
      const gap = run && best ? delta4(run.loss - best.loss).replace('+', '') : '';
      if (state.mode === 'span') {
        if (!run || run.looped === 0) return '不循环：标准 12 层 Baseline 对照模型。';
        const [start, end] = spanRange(run.looped);
        const where = run.looped === 12 ? '全部 12 层' : `第 ${start}–${end} 层（中间 ${run.pct}%）`;
        return `${where}循环执行 2 轮，单 token 等效经过 ${run.executed} 层。${run.id === best?.id ? '取得本组最低 validation loss。' : `loss 比循环中间 50% 高 ${gap}。`}`;
      }
      if (state.mode === 'aspect') {
        const base = runs('aspect').find(item => item.series === 'base' && item.key === state.key);
        if (!run) return `执行 ${state.key} 层：该档仅训练了 Baseline（${state.key} 层独立参数），loss 比 Baseline 最优值高 ${delta4((base?.loss ?? 0) - reference('85')).replace('+', '')}。`;
        const loopText = `Looped 仅含 ${run.physical} 层物理参数、中间 ${run.looped} 层循环 2 轮`;
        if (!base) return `执行 ${state.key} 层：该档仅训练了 Looped（物理 ${run.physical} 层，中间 ${run.looped} 层循环 2 轮），已越过其最优深度。`;
        if (run.id === best?.id) return `执行 ${state.key} 层：Baseline 需堆叠 ${state.key} 层独立参数且已过最优点；${loopText}，在此处取得全局最优。`;
        if (state.key === 12) return `执行 12 层：Baseline 的最优深度；${loopText}，因宽度缩减过多而落后于 Baseline。`;
        return `执行 ${state.key} 层：Baseline 含 ${state.key} 层独立参数；${loopText}。`;
      }
      if (!run || run.visits === 1) return '执行 1 轮即为 Baseline：12 层，隐藏维度 H = 1280。';
      if (run.id === best?.id) return '中间 6 层循环 2 轮（执行 18 层）；宽度由 1280 缩减至 1056 以对齐单 token FLOPs（偏差约 2%），取得本组最低 loss。';
      return `中间 6 层循环 ${run.visits} 轮（执行 ${run.executed} 层）；为维持等 FLOPs 需进一步缩窄模型，loss 比循环 2 轮高 ${gap}，但仍优于 Baseline。`;
    },
    tip: (mode, run, sparsity) => {
      const rows = [`validation loss ${loss4(run.loss)}`];
      const isRef = run.series === 'base' && run.loss === reference(sparsity);
      if (!isRef && (run.series === 'loop' || mode === 'aspect')) rows.push(`相对 Baseline${mode === 'aspect' ? ' 最优' : ''} ${delta4(run.loss - reference(sparsity))}`);
      rows.push(`DCLM Core ${run.core.toFixed(2)} ± ${run.coreSe.toFixed(2)}`);
      if (mode === 'span') return [run.looped ? `循环 ${run.looped} / 12 层（${run.pct}%）· 执行 ${run.executed} 层` : 'Baseline：不循环 · 12 层', ...rows].join('\n');
      if (mode === 'aspect') return [run.series === 'base' ? `Baseline · ${run.executed} 层${isRef ? '（最优）' : ''}` : `Looped · 物理 ${run.physical} 层，执行 ${run.executed} 层`, ...rows].join('\n');
      return [run.visits === 1 ? 'Baseline · 执行 1 轮，12 层' : `循环 ${run.visits} 轮 · 执行 ${run.executed} 层`, ...rows].join('\n');
    },
    pointLabel: (mode, run) => mode === 'span' ? (run.looped ? `循环 ${run.looped} / 12 层` : 'Baseline') : mode === 'aspect' ? `${run.series === 'base' ? 'Baseline' : 'Looped'} ${run.physical}/${run.executed}` : `${run.visits}×`,
    schematicCaption: state => {
      if (state.mode === 'span') return state.key === 0 ? '不循环 · 执行 12 层' : `执行 ${12 + state.key} 层`;
      if (state.mode === 'count') return state.key === 1 ? 'Baseline · 执行 12 层' : `执行 ${12 + 6 * (state.key - 1)} 层`;
      return `执行 ${state.key} 层`;
    },
    schematicNote: {
      span: '高亮层循环执行 2 轮，共享参数。',
      aspect: '虚线框：各自最优深宽形态。',
      count: '虚线框：Baseline 宽度。',
    },
    noLoopNote: '不循环：每层仅执行 1 轮。',
    schematicLabel: { span: '12 层模型的循环区间示意图', aspect: 'Baseline 与 Looped Transformer 的执行深度与宽度对比示意图', count: '循环块多轮执行的示意图' },
    visit: index => `第 ${index} 轮`,
    physicalLine: count => `物理 ${count} 层`, executedLine: count => `执行 ${count} 层`,
    shift: '最优执行深度 12 → 18',
    table: {
      summary: '数据表：validation loss 与 DCLM 指标', group85: 'S ≈ 85%', group95: 'S ≈ 95%',
      loss: 'validation loss ↓', core: 'DCLM Core ↑', completion: 'DCLM Completion ↓', looped: '循环层数', span: '比例', executed: '执行层数', physical: '物理层数', model: '模型',
      note: {
        span: '200M 规模，物理深度 12，循环 2 轮；加粗为同稀疏度内最优值。DCLM Core 的 ± 为 10 个评测随机种子的标准误。',
        aspect: '200M 规模，S ≈ 85%，循环中间 50% 物理层 2 轮；加粗为同架构内最优值。',
        count: '200M 规模，S ≈ 85%，循环中间 50% 物理层，物理深度与 Baseline 相同；执行 1 轮即为 Baseline。加粗为最优值。',
      },
    },
    countModel: visits => visits === 1 ? 'Baseline（1×）' : `Looped ${visits}×`,
    chartLabel: {
      span: '循环层数与 validation loss：两档稀疏度均在循环中间 6 层（50%）时取得最低 loss。',
      aspect: '执行深度与 validation loss：Baseline 在 12 层最优，Looped Transformer 在等效执行 18 层（物理 12 层）时最优。',
      count: '循环轮数与 validation loss：循环 2 轮最优；3 轮与 4 轮有所回退，但仍优于 Baseline。',
    },
    bracketBase: 'Baseline',
  },
  en: {
    base: 'Baseline', loop: 'Looped Transformer', loopShort: 'Looped', yLabel: 'Validation loss ↓', lowest: 'lowest', optimum: 'optimum',
    ref: value => `Baseline ${value}`, refBest: value => `best Baseline ${value}`, refShort: 'best Baseline',
    control: { span: 'Looped layers', aspect: 'Executed depth', count: 'Loop count' }, sparsity: 'Sparsity',
    xTitle: { span: 'Looped layers (of 12)', aspect: 'Executed depth (layers) · equal FLOPs: deeper = narrower →', count: 'Visits of the looped block' },
    xTitleNarrow: { span: 'Looped layers (of 12)', aspect: 'Executed depth (deeper = narrower)', count: 'Visits of the looped block' },
    physicalExecuted: 'Labels: physical / executed layers', layers: count => `${count} layers`, notRun: 'not run',
    stat: {
      span: () => ['Validation loss', 'vs Baseline', 'Layers run per token'],
      aspect: state => {
        const loop = runs('aspect').find(run => run.series === 'loop' && run.key === state.key);
        return [loop ? `Looped ${loop.physical}/${loop.executed}` : 'Looped', `Baseline (${state.key} layers)`, 'Looped vs best Baseline'];
      },
      count: () => ['Validation loss', 'vs Baseline', 'Layers executed'],
    },
    readout: state => {
      const run = focusRun(state.mode, state.key, state.sparsity);
      const [best] = bestRuns(state.mode, state.sparsity).slice(-1);
      const gap = run && best ? delta4(run.loss - best.loss).replace('+', '') : '';
      if (state.mode === 'span') {
        if (!run || run.looped === 0) return 'No looping: the standard 12-layer Baseline, for reference.';
        const [start, end] = spanRange(run.looped);
        const where = run.looped === 12 ? 'All 12 layers run' : `Layers ${start}–${end} (the middle ${run.pct}%) run`;
        return `${where} twice, so each token passes through ${run.executed} layers. ${run.id === best?.id ? 'Lowest validation loss in the sweep.' : `${gap} above looping the middle 50%.`}`;
      }
      if (state.mode === 'aspect') {
        const base = runs('aspect').find(item => item.series === 'base' && item.key === state.key);
        if (!run) return `${state.key} executed layers: only the Baseline was run here (${state.key} distinct layers), ${delta4((base?.loss ?? 0) - reference('85')).replace('+', '')} above its best.`;
        const shape = `${run.physical} physical layers, the middle ${run.looped} run twice`;
        if (!base) return `${state.key} executed layers: only the Looped Transformer was run here (${shape}); past its optimum.`;
        if (run.id === best?.id) return `${state.key} executed layers: the Baseline needs ${state.key} distinct layers and is past its optimum; the Looped Transformer reaches its optimum here with ${shape}.`;
        if (state.key === 12) return `12 executed layers: the Baseline's optimal depth; the Looped Transformer (${shape}) trails.`;
        return `${state.key} executed layers: the Baseline stacks ${state.key} distinct layers; the Looped Transformer has ${shape}.`;
      }
      if (!run || run.visits === 1) return 'One visit is the Baseline: 12 layers, width H = 1280.';
      if (run.id === best?.id) return 'The middle 6 layers run twice (18 executed layers); width drops from 1280 to 1056 to keep per-token FLOPs matched (within about 2%). Lowest in the sweep.';
      return `The middle 6 layers run ${run.visits} times (${run.executed} executed layers); to match FLOPs the model must be narrower. ${gap} above two visits, still below the Baseline.`;
    },
    tip: (mode, run, sparsity) => {
      const rows = [`Validation loss ${loss4(run.loss)}`];
      const isRef = run.series === 'base' && run.loss === reference(sparsity);
      if (!isRef && (run.series === 'loop' || mode === 'aspect')) rows.push(`vs ${mode === 'aspect' ? 'best ' : ''}Baseline ${delta4(run.loss - reference(sparsity))}`);
      rows.push(`DCLM Core ${run.core.toFixed(2)} ± ${run.coreSe.toFixed(2)}`);
      if (mode === 'span') return [run.looped ? `${run.looped} of 12 layers looped (${run.pct}%) · ${run.executed} executed` : 'Baseline: no looping · 12 layers', ...rows].join('\n');
      if (mode === 'aspect') return [run.series === 'base' ? `Baseline · ${run.executed} layers${isRef ? ' (best)' : ''}` : `Looped · ${run.physical} physical, ${run.executed} executed`, ...rows].join('\n');
      return [run.visits === 1 ? 'Baseline · one visit, 12 layers' : `${run.visits} visits · ${run.executed} executed layers`, ...rows].join('\n');
    },
    pointLabel: (mode, run) => mode === 'span' ? (run.looped ? `${run.looped} of 12 layers looped` : 'Baseline') : mode === 'aspect' ? `${run.series === 'base' ? 'Baseline' : 'Looped'} ${run.physical}/${run.executed}` : `${run.visits}×`,
    schematicCaption: state => {
      if (state.mode === 'span') return state.key === 0 ? 'No looping · 12 layers' : `${12 + state.key} layers executed`;
      if (state.mode === 'count') return state.key === 1 ? 'Baseline · 12 layers' : `${12 + 6 * (state.key - 1)} layers executed`;
      return `${state.key} layers executed`;
    },
    schematicNote: {
      span: 'Highlighted layers run twice with shared weights.',
      aspect: 'Dashed: the best shape for each.',
      count: 'Dashed: Baseline width.',
    },
    noLoopNote: 'No looping: every layer runs once.',
    schematicLabel: { span: 'Schematic of the 12-layer model', aspect: 'Schematic of executed depth and width for the Baseline and the Looped Transformer', count: 'Schematic of the looped block repeated' },
    visit: index => `visit ${index}`,
    physicalLine: count => `${count} physical`, executedLine: count => `${count} executed`,
    shift: 'optimal executed depth 12 → 18',
    table: {
      summary: 'Data: validation loss and DCLM metrics', group85: 'S ≈ 85%', group95: 'S ≈ 95%',
      loss: 'Val. loss ↓', core: 'DCLM Core ↑', completion: 'DCLM Completion ↓', looped: 'Looped layers', span: 'Span', executed: 'Executed', physical: 'Physical', model: 'Model',
      note: {
        span: '200M, physical depth 12, two passes; bold marks the best value within each sparsity level. DCLM Core ± is the standard error over 10 evaluation seeds.',
        aspect: '200M, S ≈ 85%, middle 50% looped twice. Bold marks the best value within each architecture.',
        count: '200M, S ≈ 85%, middle 50% looped, physical depth matched to the Baseline; one visit is the Baseline. Bold marks the best value.',
      },
    },
    countModel: visits => visits === 1 ? 'Baseline (1×)' : `Looped ${visits}×`,
    chartLabel: {
      span: 'Looped layers versus validation loss: at both sparsity levels, lowest when the middle 6 layers (50%) loop.',
      aspect: 'Executed depth versus validation loss: the Baseline is best at 12 layers, the Looped Transformer at 18 executed layers (12 physical).',
      count: 'Loop count versus validation loss: two visits are best; three and four regress but stay below the Baseline.',
    },
    bracketBase: 'Baseline',
  },
};

/* ------------------------------------------------------------ chart geometry */

export const frames: Record<Variant, { width: number; height: number; left: number; right: number; top: number; bottom: number }> = {
  wide: { width: 552, height: 300, left: 46, right: 16, top: 28, bottom: 56 },
  narrow: { width: 330, height: 270, left: 40, right: 10, top: 28, bottom: 56 },
};

// Same 0.05 span for both sparsities so effect sizes compare; the S ≈ 95% window is placed so its best
// point sits at the same height as the S ≈ 85% best.
const yDomains: Record<Sparsity, readonly [number, number]> = { '85': [1.918, 1.968], '95': [1.844, 1.894] };
const yTickValues: Record<Sparsity, number[]> = { '85': [1.92, 1.93, 1.94, 1.95, 1.96], '95': [1.85, 1.86, 1.87, 1.88, 1.89] };

export interface PointGeometry { id: string; cx: number; cy: number }
export interface ChartGeometry {
  points: PointGeometry[];
  lines: { base: number[]; loop: number[] };
  ref: { y: number; labelY: number };
  column: { x: number; width: number };
  bracket: { x: number; y1: number; y2: number; opacity: number };
  best: { x: number; y: number }[];
  yTicks: number[];
}

export function xScale(mode: Mode, variant: Variant) {
  const frame = frames[variant];
  const values = keys[mode];
  const step = (values[1] ?? 1) - (values[0] ?? 0);
  const pad = step * 0.45;
  return linear([(values[0] ?? 0) - pad, (values.at(-1) ?? 1) + pad], [frame.left, frame.width - frame.right]);
}
export function yScale(variant: Variant, sparsity: Sparsity) {
  const frame = frames[variant];
  return linear(yDomains[sparsity], [frame.height - frame.bottom, frame.top]);
}
export const yTicks = (sparsity: Sparsity) => yTickValues[sparsity];
/** Baseline offset of the 'lowest' label under the best point (clear of the selected halo and the gridline below). */
export const bestLabelOffset = 22;

/** Numeric geometry for one state; the browser tweens between two of these. */
export function chartGeometry(state: State, variant: Variant): ChartGeometry {
  const frame = frames[variant];
  const x = xScale(state.mode, variant);
  const y = yScale(variant, state.sparsity);
  const all = runs(state.mode, state.sparsity);
  const points = all.map(run => ({ id: run.id, cx: x(run.key), cy: y(run.loss) }));
  const flat = (list: Run[]) => list.flatMap(run => [x(run.key), y(run.loss)]);
  const lines = state.mode === 'aspect'
    ? { base: flat(all.filter(run => run.series === 'base')), loop: flat(all.filter(run => run.series === 'loop')) }
    : { base: [], loop: flat(all) };
  const refY = y(reference(state.sparsity));
  const step = Math.abs(x(keys[state.mode][1] ?? 1) - x(keys[state.mode][0] ?? 0));
  const columnWidth = Math.min(46, step * 0.72);
  const focus = focusRun(state.mode, state.key, state.sparsity);
  const focusY = focus ? y(focus.loss) : refY;
  const cx = x(state.key);
  // Aspect labels sit right of their points, so its bracket always goes left.
  const flip = state.mode === 'aspect' || cx > frame.width - frame.right - 70;
  const bracketX = cx + (flip ? -13 : 13);
  const isBase = !focus || (state.mode !== 'aspect' && focus.series === 'base');
  return {
    points,
    lines,
    ref: { y: refY, labelY: state.mode === 'aspect' ? refY + (variant === 'narrow' ? 26 : 19) : refY - 7 },
    column: { x: cx - columnWidth / 2, width: columnWidth },
    bracket: { x: bracketX, y1: refY, y2: focusY, opacity: isBase ? 0 : 1 },
    best: bestRuns(state.mode, state.sparsity).map(run => ({ x: x(run.key), y: y(run.loss) })),
    yTicks: yTicks(state.sparsity).map(value => y(value)),
  };
}

export const flatPath = (flat: number[]) => {
  const pairs: [number, number][] = [];
  for (let index = 0; index + 1 < flat.length; index += 2) pairs.push([flat[index]!, flat[index + 1]!]);
  return linePath(pairs);
};

/** True when the selected run is worse than the Baseline reference (the bracket turns neutral). */
export function bracketWorse(state: State) {
  const focus = focusRun(state.mode, state.key, state.sparsity);
  return Boolean(focus && focus.loss > reference(state.sparsity));
}

/** Recursively interpolate two geometry objects of the same shape. */
export function mix<T>(from: T, to: T, amount: number): T {
  if (typeof from === 'number' && typeof to === 'number') return (from + (to - from) * amount) as T;
  if (Array.isArray(from) && Array.isArray(to)) return to.map((value, index) => index < from.length ? mix(from[index], value, amount) : value) as T;
  if (from && to && typeof from === 'object' && typeof to === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(to as Record<string, unknown>)) result[key] = mix((from as Record<string, unknown>)[key], value, amount);
    return result as T;
  }
  return to;
}

/* -------------------------------------------------------- schematic geometry */

// Every stack stands on y = 236, which lines up with the chart's x axis on desktop.
export const schematicSize = { width: 190, height: { span: 284, aspect: 304, count: 284 } as Record<Mode, number>, floor: 236 };
export type SlabKind = 'plain' | 'base' | 'loop';
export interface Slab { x: number; y: number; w: number; h: number; o: number }
export interface SchematicGeometry {
  slabs: Slab[];
  kinds: SlabKind[];
  ghosts: { x: number; y: number; w: number; h: number; o: number }[];
  arrow: { right: number; top: number; bottom: number; o: number };
  token: string;
  numbers: { y: number; o: number }[];
  visits: { y: number; o: number }[];
  missing: number[];
}
export const poolSize: Record<Mode, number> = { span: 12, aspect: 18 + 21, count: 30 };

/** Drawn width for an executed depth: reported H where the paper gives it, else FLOPs ∝ L·H². */
export function drawnWidth(executed: number, looped: boolean) {
  if (executed === 12) return baselineWidth;
  if (looped && executed === 18) return smeltWidth;
  return baselineWidth * Math.sqrt(12 / executed);
}

interface Segment { count: number; kind: SlabKind }
function segments(physical: number, looped: number, visits: number, baseline: boolean): Segment[] {
  if (baseline || looped === 0 || visits === 1) return [{ count: physical, kind: 'base' }];
  const prefix = Math.floor((physical - looped) / 2);
  const suffix = physical - looped - prefix;
  const list: Segment[] = [{ count: prefix, kind: 'plain' }, ...Array.from({ length: visits }, (): Segment => ({ count: looped, kind: 'loop' })), { count: suffix, kind: 'plain' }];
  return list.filter(segment => segment.count > 0);
}

/** Lay a stack of segments bottom-up; unused pool entries collapse onto the top. */
function stack(list: Segment[], pool: number, center: number, width: number, bottom: number, pitch: number, gap: number, segmentGap: number) {
  const slabs: Slab[] = [];
  const kinds: SlabKind[] = [];
  const starts: number[] = [];
  let cursor = bottom;
  list.forEach((segment, index) => {
    if (index) cursor -= segmentGap;
    starts.push(cursor);
    for (let layer = 0; layer < segment.count; layer++) {
      slabs.push({ x: center - width / 2, y: cursor - pitch + gap, w: width, h: pitch - gap, o: 1 });
      kinds.push(segment.kind);
      cursor -= pitch;
    }
  });
  const top = cursor + gap;
  while (slabs.length < pool) { slabs.push({ x: center - width / 2, y: top, w: width, h: 0, o: 0 }); kinds.push('plain'); }
  return { slabs, kinds, top, starts };
}

export function schematicGeometry(state: State): SchematicGeometry {
  const empty = { right: 0, top: 0, bottom: 0, o: 0 };
  if (state.mode === 'span') {
    const looped = state.key;
    const prefix = Math.floor((12 - looped) / 2);
    const center = 86;
    const width = 80;
    const pitch = 17;
    const bottom = schematicSize.floor;
    const kinds: SlabKind[] = [];
    const slabs: Slab[] = Array.from({ length: 12 }, (_, index) => {
      kinds.push(looped === 0 ? 'base' : index >= prefix && index < prefix + looped ? 'loop' : 'plain');
      return { x: center - width / 2, y: bottom - (index + 1) * pitch + 4, w: width, h: pitch - 4, o: 1 };
    });
    const loopTop = bottom - (prefix + looped) * pitch + 4;
    const loopBottom = bottom - prefix * pitch;
    const right = center + width / 2;
    const top = bottom - 12 * pitch + 4;
    const mid = right + 18;
    const token = looped === 0
      ? `M${center} ${bottom + 18}V${top - 14}`
      : `M${center} ${bottom + 18}V${loopTop + 6}H${mid - 8}a8 8 0 0 1 8 8V${loopBottom - 14}a8 8 0 0 1 -8 8H${center}V${top - 14}`;
    const layerY = (index: number) => bottom - index * pitch - pitch / 2 + 6.5;
    return {
      slabs, kinds, ghosts: [],
      arrow: looped === 0 ? { right, top: loopTop + 6, bottom: loopBottom - 6, o: 0 } : { right, top: loopTop + 6, bottom: loopBottom - 6, o: 1 },
      token,
      numbers: [
        { y: layerY(0), o: prefix === 0 && looped ? 0 : 1 },
        { y: layerY(prefix), o: looped ? 1 : 0 },
        { y: layerY(prefix + looped - 1), o: looped > 1 ? 1 : 0 },
        { y: layerY(11), o: prefix + looped === 12 && looped ? 0 : 1 },
      ],
      visits: [], missing: [],
    };
  }
  if (state.mode === 'count') {
    const visits = state.key;
    const executed = 12 + 6 * (visits - 1);
    const center = 74;
    const full = 92;
    const width = full * drawnWidth(executed, visits > 1) / baselineWidth;
    const pitch = 6.6;
    const bottom = schematicSize.floor;
    const built = stack(segments(12, 6, visits, visits === 1), 30, center, width, bottom, pitch, 1.7, 3.5);
    const visitLabels = Array.from({ length: 4 }, (_, index) => {
      const start = built.starts[index + 1];
      if (visits === 1 || index >= visits || start === undefined) return { y: built.top + 8, o: 0 };
      return { y: start - 3 * pitch + 5, o: 1 };
    });
    return {
      slabs: built.slabs, kinds: built.kinds,
      ghosts: [{ x: center - full / 2, y: built.top - 3, w: full, h: bottom - built.top + 6, o: visits === 1 ? 0 : 1 }],
      arrow: empty, token: '', numbers: [], visits: visitLabels, missing: [],
    };
  }
  // aspect: Baseline column (left) and Looped column (right) at the same executed depth.
  const executed = state.key;
  const pitch = 8.8;
  const bottom = schematicSize.floor;
  const full = 80;
  const widest = drawnWidth(9, false);
  const columns = [48, 143];
  const baseRun = runs('aspect').find(run => run.series === 'base' && run.key === executed);
  const loopRun = runs('aspect').find(run => run.series === 'loop' && run.key === executed);
  const columnStack = (run: Run | undefined, looped: boolean, pool: number, center: number) => {
    if (!run) {
      const built = stack([], pool, center, 0, bottom, pitch, 2.2, 3);
      return built;
    }
    const width = full * drawnWidth(run.executed, looped) / widest;
    return stack(segments(run.physical, looped ? run.looped : 0, looped ? 2 : 1, !looped), pool, center, width, bottom, pitch, 2.2, 3);
  };
  const base = columnStack(baseRun, false, 18, columns[0]!);
  const loop = columnStack(loopRun, true, 21, columns[1]!);
  const ghost = (center: number, executedDepth: number, looped: boolean, segmentsCount: number) => {
    const width = full * drawnWidth(executedDepth, looped) / widest;
    const height = executedDepth * pitch + (segmentsCount - 1) * 3 - 2.2;
    return { x: center - width / 2 - 3, y: bottom - height - 3, w: width + 6, h: height + 6, o: 1 };
  };
  return {
    slabs: [...base.slabs, ...loop.slabs], kinds: [...base.kinds, ...loop.kinds],
    ghosts: [ghost(columns[0]!, 12, false, 1), ghost(columns[1]!, 18, true, 4)],
    arrow: empty, token: '', numbers: [], visits: [],
    missing: [baseRun ? 0 : 1, loopRun ? 0 : 1],
  };
}

export const spanNumbers = (looped: number) => {
  const prefix = Math.floor((12 - looped) / 2);
  return ['1', String(prefix + 1), String(prefix + looped), '12'];
};

/** Loop-arrow path for the span schematic, from the top of the looped block to its bottom. */
export function arrowPath(arrow: SchematicGeometry['arrow']) {
  const x0 = arrow.right + 3;
  const x1 = arrow.right + 18;
  const radius = Math.max(0, Math.min(8, (arrow.bottom - arrow.top) / 2));
  return `M${x0} ${arrow.top}H${x1 - radius}a${radius} ${radius} 0 0 1 ${radius} ${radius}V${arrow.bottom - radius}a${radius} ${radius} 0 0 1 ${-radius} ${radius}H${x0 + 5}`;
}
export function arrowHead(arrow: SchematicGeometry['arrow']) {
  const x = arrow.right + 3;
  return `M${x + 6} ${arrow.bottom - 4}L${x} ${arrow.bottom}L${x + 6} ${arrow.bottom + 4}`;
}

/* ------------------------------------------------------------- data tables */

export interface TableRow { cells: string[]; best: boolean[]; key: number; series: Series; group?: string }
export function tableRows(mode: Mode, language: Language): { head: string[]; groups: { title: string; rows: TableRow[] }[] } {
  const text = copy[language].table;
  const metrics = (run: Run) => [loss4(run.loss), `${run.core.toFixed(2)} ± ${run.coreSe.toFixed(2)}`, run.completion.toFixed(4)];
  const bestFlags = (list: Run[]) => {
    const loss = Math.min(...list.map(run => run.loss));
    const core = Math.max(...list.map(run => run.core));
    const completion = Math.min(...list.map(run => run.completion));
    return (run: Run) => [run.loss === loss, run.core === core, run.completion === completion];
  };
  if (mode === 'span') {
    const group = (sparsity: Sparsity, title: string) => {
      const list = runs('span', sparsity);
      const flags = bestFlags(list);
      return { title, rows: list.map(run => ({ key: run.key, series: run.series, group: sparsity, cells: [String(run.looped), `${run.pct}%`, String(run.executed), ...metrics(run)], best: [false, false, false, ...flags(run)] })) };
    };
    return { head: [text.looped, text.span, text.executed, text.loss, text.core, text.completion], groups: [group('85', text.group85), group('95', text.group95)] };
  }
  if (mode === 'aspect') {
    const all = runs('aspect');
    const group = (series: Series, title: string) => {
      const list = all.filter(run => run.series === series);
      const flags = bestFlags(list);
      return { title, rows: list.map(run => ({ key: run.key, series, cells: [String(run.physical), String(run.executed), ...metrics(run)], best: [false, false, ...flags(run)] })) };
    };
    return { head: [text.physical, text.executed, text.loss, text.core, text.completion], groups: [group('base', copy[language].base), group('loop', copy[language].loop)] };
  }
  const list = runs('count');
  const flags = bestFlags(list);
  return { head: [text.model, text.executed, text.loss, text.core, text.completion], groups: [{ title: '', rows: list.map(run => ({ key: run.key, series: run.series, cells: [copy[language].countModel(run.visits), String(run.executed), ...metrics(run)], best: [false, false, ...flags(run)] })) }] };
}

/* ------------------------------------------------------- stats and ticks */

export type Tone = 'loop' | 'base' | 'gain' | 'worse' | 'plain';
export interface Stat { label: string; value: number | null; decimals: number; signed: boolean; tone: Tone }

export function stats(state: State, language: Language): Stat[] {
  const labels = copy[language].stat[state.mode](state);
  const ref = reference(state.sparsity);
  const deltaStat = (label: string, run: Run | undefined): Stat => run && (state.mode === 'aspect' || run.series === 'loop')
    ? { label, value: run.loss - ref, decimals: 4, signed: true, tone: run.loss < ref ? 'gain' : 'worse' }
    : { label, value: null, decimals: 4, signed: true, tone: 'plain' };
  if (state.mode === 'aspect') {
    const all = runs('aspect');
    const loop = all.find(run => run.series === 'loop' && run.key === state.key);
    const base = all.find(run => run.series === 'base' && run.key === state.key);
    return [
      { label: labels[0], value: loop?.loss ?? null, decimals: 4, signed: false, tone: 'loop' },
      { label: labels[1], value: base?.loss ?? null, decimals: 4, signed: false, tone: 'base' },
      deltaStat(labels[2], loop),
    ];
  }
  const run = focusRun(state.mode, state.key, state.sparsity);
  return [
    { label: labels[0], value: run?.loss ?? null, decimals: 4, signed: false, tone: run?.series === 'base' ? 'base' : 'loop' },
    deltaStat(labels[1], run),
    { label: labels[2], value: run?.executed ?? null, decimals: 0, signed: false, tone: 'plain' },
  ];
}

export const formatStat = (stat: Pick<Stat, 'decimals' | 'signed'>, value: number | null) => value === null ? '—' : stat.signed ? signed(value, stat.decimals) : value.toFixed(stat.decimals);

/** Two-line x tick labels: the setting and, where useful, what it means. */
export function xTickLabels(mode: Mode, language: Language): { key: number; label: string; sub: string }[] {
  if (mode === 'span') return runs('span').map(run => ({ key: run.key, label: String(run.looped), sub: `${run.pct}%` }));
  if (mode === 'aspect') return keys.aspect.map(key => ({ key, label: String(key), sub: '' }));
  return runs('count').map(run => ({ key: run.key, label: `${run.visits}×`, sub: copy[language].layers(run.executed) }));
}
