// Numbers on the SMELT poster. Everything is read from the article's figure
// data (src/data/smelt/) or recomputed with the article's own helpers, so the
// poster and the article cannot drift apart.
import budget from '../../data/smelt/budget-match.json';
import recipe from '../../data/smelt/recipe-search.json';
import lossCompute from '../../data/smelt/loss-compute.json';
import frontier from '../../data/smelt/compute-frontier.json';
import domains from '../../data/smelt/domain-gain.json';
import icl from '../../data/smelt/icl-gain.json';
import expertData from '../../data/smelt/expert-reuse.json';
import stageData from '../../data/smelt/attention-stages.json';
import sinkData from '../../data/smelt/attention-sink.json';
import { ceGain, computeForLoss, frontierLoss } from '../smelt/scaling-fit';
import { counted, pairs, wins, type MetricKey } from '../smelt/downstream-pairs';
import { familyMean } from '../smelt/domain-gain';
import { randomMean } from '../smelt/expert-reuse';

/* ── 1. Budget matching: the three budgets after each step (200M, S ≈ 95%). ── */
export type BudgetKey = 'flops' | 'params' | 'kv';
export const budgetKeys: readonly BudgetKey[] = ['flops', 'params', 'kv'];
export const budgetTolerance = budget.tolerance as Record<BudgetKey, number>;
export const budgetSteps = budget.steps.map(step => ({ id: step.id, ratio: step.ratio as Record<BudgetKey, number> }));
export const isMatched = (key: BudgetKey, value: number) => Math.abs(value - 1) <= budgetTolerance[key] + 1e-9;

/* ── 2. Loop recipe (200M, S ≈ 85%): validation loss minus the 12-layer Baseline. ── */
const reference = recipe.reference['85'];
const delta = (loss: number) => loss - reference;
export const spanSweep = recipe.span['85'].map(row => ({ pct: row.pct, delta: delta(row.loss) }));
export const aspectSweep = {
  baseline: recipe.aspect.baseline.map(row => ({ executed: row.executed, delta: delta(row.loss) })),
  looped: recipe.aspect.looped.map(row => ({ executed: row.executed, delta: delta(row.loss) })),
};
export const countSweep = recipe.count.map(row => ({ visits: row.visits, delta: delta(row.loss) }));

/* ── 3. Scaling: the 16 matched cells at their longest horizon, and the CE Gain frontier. ── */
export const gridSizes = lossCompute.scales as readonly string[];
export const gridSparsity = lossCompute.sparsity.map(item => ({ es: item.es, label: item.label, approx: item.approx }));
export const lossGrid = gridSparsity.map(level => ({
  ...level,
  cells: gridSizes.map(size => {
    const cell = lossCompute.cells.find(item => item.scale === size && item.es === level.es);
    if (!cell) throw new Error(`Missing loss cell ${size}/${level.es}`);
    return { size, delta: cell.loop.loss.at(-1)! - cell.base.loss.at(-1)! };
  }),
}));
export const lossWins = lossGrid.flatMap(row => row.cells).filter(cell => cell.delta < 0).length;

export const coefficients = frontier.coefficients;
export const fittedWindow = frontier.fittedWindow as [number, number];
export const frontierRange = [6e20, 1.8e21] as [number, number];
export const frontierSparsity = frontier.evaluationSparsity as number[];
export const primaryFrontierSparsity = frontierSparsity[0]!;
export const gainAt = (compute: number, sparsity: number) => ceGain(coefficients.smelt, coefficients.baseline, compute, sparsity).gain;
export function frontierLossCurve(arch: 'baseline' | 'smelt', sparsity: number, from: number, to: number, samples = 48) {
  const [l0, l1] = [Math.log10(from), Math.log10(to)];
  return Array.from({ length: samples + 1 }, (_, index) => {
    const compute = 10 ** (l0 + (l1 - l0) * index / samples);
    return { compute, loss: frontierLoss(coefficients[arch], compute, sparsity) };
  });
}
export const frontierMarks = [1e21].map(compute => {
  const loss = frontierLoss(coefficients.smelt, compute, primaryFrontierSparsity);
  const baseCompute = computeForLoss(coefficients.baseline, loss, primaryFrontierSparsity);
  return { compute, baseCompute, loss, gain: gainAt(compute, primaryFrontierSparsity) };
});

/* ── 4. Downstream. ── */
export function winCount(metric: MetricKey) {
  const pool = pairs.filter(pair => counted(pair, metric, 'bar'));
  return { won: pool.filter(pair => wins(pair, metric)).length, total: pool.length };
}
export const primarySparsity = domains.primary;
export const primarySparsityLabel = `${Math.round(domains.sparsities[domains.primary]! * 100)}%`;
export const domainGains = domains.families
  .map(family => ({ key: family.key, label: family.label, zh: family.zh, gain: familyMean(family, domains.primary) }))
  .sort((a, b) => b.gain - a.gain);
export const iclGaps = icl.mean.shots.map((shots, index) => ({ shots, gap: icl.mean.loop[index]! - icl.mean.base[index]! }));
const dyck = icl.tasks.find(task => task.key.includes('dyck'));
export const dyckCurve = dyck ? dyck.shots.map((shots, index) => ({ shots, base: dyck.base[index]!, loop: dyck.loop[index]! })) : [];
export const dyckLast = dyck ? { shots: dyck.shots.at(-1)!, base: dyck.base.at(-1)!, loop: dyck.loop.at(-1)! } : undefined;
export const iclZeroGap = iclGaps[0]?.gap ?? 0;
export const iclOneGap = iclGaps[1]?.gap ?? 0;
export const iclTaskCount = icl.tasks.length;

/* ── 5. Inside the loop, at the largest scale. ── */
export const mechanismSize = '1.6B';
export const expertRows = expertData.sparsity
  .filter(level => level.key !== '1')
  .map(level => {
    const cells = expertData.cells as Record<string, Record<string, { mean: number }>>;
    return { label: level.label, experts: level.experts, measured: cells[level.key]![mechanismSize]!.mean, random: randomMean(level.experts) };
  });
export const expertTopK = expertData.k;

export const stageSparsity = '85%';
export const stageKeys = ['x', 'q', 'k', 'v', 'pv', 'o'] as const;
const stageCell = (stageData.cells as Record<string, Record<string, number[]>>)[`${mechanismSize}|${stageSparsity}`]!;
/** Mean cross-visit cosine (the second entry is its standard error). */
export const stages = stageKeys.map(key => ({ key, cosine: stageCell[key]![0]! }));

const sink = (sinkData.scales as Record<string, { physicalDepth: number; baseline: number[][]; visit1: number[][]; visit2: number[][]; block: { visit1: number; visit2: number; change: number } }>)[mechanismSize]!;
export const sinkDepth = sink.physicalDepth;
export const sinkBaseline = sink.baseline.map(row => ({ layer: row[0]!, share: row[1]! }));
export const sinkVisit1 = sink.visit1.map(row => ({ layer: row[0]!, share: row[2]! }));
export const sinkVisit2 = sink.visit2.map(row => ({ layer: row[0]!, share: row[2]! }));
export const sinkBlock = sink.block;
