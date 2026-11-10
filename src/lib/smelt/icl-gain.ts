// Layout and copy for Figure 13 (gain vs number of in-context examples).
// Shared by the Astro component and the browser script.
import data from '../../data/smelt/icl-gain.json';
import { linePath, linear, ticks, type Point } from './plot';
import type { Language } from '../site';

export const allShots = [0, 1, 2, 4, 8, 16, 32];
export const width = 350;
export const height = 292;
export const frame = { x0: 44, x1: 340, y0: 236, y1: 30 };
export const gapDomain = [-2, 6] as const;
export const gapTicks = [-2, 0, 2, 4, 6];

export interface Curve { key: string; label: string; shots: number[]; base: number[]; loop: number[] }
export const meanCurve: Curve = { key: 'mean', label: '', ...data.mean };
export const tasks: Curve[] = data.tasks;
export const curveOf = (key: string): Curve => key === 'mean' ? meanCurve : tasks.find(task => task.key === key) ?? meanCurve;
export const defaultTask = 'bigbench_dyck_languages';

const step = (frame.x1 - frame.x0) / allShots.length;
export const xAt = (shot: number) => frame.x0 + (allShots.indexOf(shot) + 0.5) * step;
export const columnWidth = step;
export const gapScale = linear(gapDomain, [frame.y0, frame.y1]);
export const gaps = (curve: Curve) => curve.loop.map((value, index) => value - (curve.base[index] ?? 0));

export function gapPath(curve: Curve) {
  return linePath(gaps(curve).map((gap, index): Point => [xAt(curve.shots[index] ?? 0), gapScale(gap)]));
}

/** Where to print a curve's last gap value on the gap chart (clear of the mean's label). */
export function endLabel(curve: Curve, avoid?: { x: number; y: number }) {
  const g = gaps(curve);
  const last = curve.shots.length - 1;
  const x = xAt(curve.shots[last] ?? 0);
  const y = gapScale(g[last] ?? 0);
  const clash = avoid && Math.abs(avoid.x - x) < 30 && Math.abs(avoid.y - y) < 22;
  const below = clash && y >= avoid.y;
  return { x: last === allShots.length - 1 ? x + 5 : x, y: below ? y + 21 : y - 10, anchor: last === allShots.length - 1 ? 'end' : 'middle', text: `${(g[last] ?? 0) >= 0 ? '+' : '−'}${Math.abs(g[last] ?? 0).toFixed(1)}` } as const;
}

/** A readable y range for one task's accuracies: at least 4 pp tall, on nice ticks. */
export function accuracyDomain(curve: Curve) {
  const values = [...curve.base, ...curve.loop];
  let low = Math.min(...values);
  let high = Math.max(...values);
  const span = Math.max(high - low, 4);
  const middle = (low + high) / 2;
  low = Math.max(0, Math.min(low, middle - span / 2) - span * 0.1);
  high = Math.max(high, middle + span / 2) + span * 0.12;
  const stepOf = (marks: number[]) => (marks[1] ?? 1) - (marks[0] ?? 0) || 1;
  const snap = (size: number) => [Math.floor(low / size + 1e-9) * size, Math.ceil(high / size - 1e-9) * size] as const;
  // Snap the domain to the tick step, then make sure the gridlines use that same step,
  // so the top and bottom of the panel always carry a labelled line.
  let stepSize = stepOf(ticks(low, high, 4));
  let domain = snap(stepSize);
  const coarser = stepOf(ticks(domain[0], domain[1], 4));
  if (coarser > stepSize + 1e-9) { stepSize = coarser; domain = snap(stepSize); }
  const marks: number[] = [];
  for (let value = domain[0]; value <= domain[1] + stepSize * 1e-6; value += stepSize) marks.push(Number(value.toPrecision(12)));
  return { domain, ticks: marks, step: stepSize };
}

/** Seven points per series (k = 0 … 32); curves measured only to k = 8 repeat their last point so tweens collapse cleanly. */
export function accuracyPoints(curve: Curve, domain: readonly [number, number]) {
  const y = linear(domain, [frame.y0, frame.y1]);
  const pad = (values: number[]) => allShots.map((_, index) => {
    const at = Math.min(index, curve.shots.length - 1);
    return [xAt(curve.shots[at] ?? 0), y(values[at] ?? 0)] as Point;
  });
  return { base: pad(curve.base), loop: pad(curve.loop) };
}

/** Signed percentage points with a no-break space, so the unit never wraps onto its own line. */
export const signedPp = (value: number, digits = 1) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}\u00a0pp`;
export const percentText = (value: number) => `${value.toFixed(1)}%`;

const copy = {
  zh: {
    task: '任务',
    meanOption: '16 个任务平均',
    meanLegend: '16 个任务平均',
    selectedLegend: '所选任务',
    otherLegend: '其他任务',
    gapTitle: 'SMELT 相对基线的准确率差',
    gapNote: '准确率差 = SMELT − 基线（百分点）',
    gapAxis: '准确率差（pp）',
    accuracyNote: '两种架构的准确率（%）',
    accuracyAxis: '准确率（%）',
    xAxis: 'in-context 示例数 k',
    extra: 'k = 16、32：仅 5 个任务',
    base: '基线',
    loop: 'SMELT',
    gap: '差',
    stat1: '16 个任务平均：没有示例（k = 0）时 SMELT 的领先',
    stat2: (low: string, high: string) => `k = 1 时的领先；k = 2–8 保持在 ${low}\u2060–\u2060${high}\u00a0pp`,
    stat3: (loop: string, base: string) => `Dyck Languages 在 k = 32：SMELT ${loop}，基线 ${base}`,
    readout: (label: string, k0: string, kMax: string) => `${label}：${k0}；${kMax}。`,
    point: (k: number, loop: string, base: string, gap: string) => `k = ${k} 时 SMELT ${loop}、基线 ${base}（${gap}）`,
    aria: '准确率差随 in-context 示例数的变化',
    ariaAccuracy: '所选任务的准确率',
  },
  en: {
    task: 'Task',
    meanOption: 'Mean of 16 tasks',
    meanLegend: 'Mean of 16 tasks',
    selectedLegend: 'Selected task',
    otherLegend: 'Other tasks',
    gapTitle: 'SMELT’s accuracy relative to the Baseline',
    gapNote: 'Accuracy gap = SMELT − Baseline (percentage points)',
    gapAxis: 'Accuracy gap (pp)',
    accuracyNote: 'Accuracy of both architectures (%)',
    accuracyAxis: 'Accuracy (%)',
    xAxis: 'In-context examples k',
    extra: 'k = 16, 32: five tasks only',
    base: 'Baseline',
    loop: 'SMELT',
    gap: 'gap',
    stat1: "Mean of 16 tasks: SMELT's lead with no examples (k = 0)",
    stat2: (low: string, high: string) => `Lead at k = 1; ${low}\u2060–\u2060${high}\u00a0pp from k = 2 to 8`,
    stat3: (loop: string, base: string) => `Dyck Languages at k = 32: SMELT ${loop} vs Baseline ${base}`,
    readout: (label: string, k0: string, kMax: string) => `${label}: ${k0}; ${kMax}.`,
    point: (k: number, loop: string, base: string, gap: string) => `at k = ${k}, SMELT ${loop} vs Baseline ${base} (${gap})`,
    aria: 'Accuracy gap across numbers of in-context examples',
    ariaAccuracy: 'Accuracy of the selected task',
  },
} as const;
export const iclCopy = (language: Language) => copy[language];

export const labelOf = (curve: Curve, language: Language) => curve.key === 'mean' ? copy[language].meanOption : curve.label;

export function readout(curve: Curve, language: Language) {
  const text = copy[language];
  const last = curve.shots.length - 1;
  const at = (index: number) => text.point(curve.shots[index] ?? 0, percentText(curve.loop[index] ?? 0), percentText(curve.base[index] ?? 0), signedPp((curve.loop[index] ?? 0) - (curve.base[index] ?? 0)));
  return text.readout(labelOf(curve, language), at(0), at(last));
}

export function columnTip(curve: Curve, index: number, language: Language) {
  const text = copy[language];
  const at = Math.min(index, curve.shots.length - 1);
  if (at !== index) return '';
  const loop = curve.loop[at] ?? 0;
  const base = curve.base[at] ?? 0;
  return `${labelOf(curve, language)} · k = ${curve.shots[at]}\nSMELT  ${percentText(loop)}\n${text.base}  ${percentText(base)}\n${text.gap}  ${signedPp(loop - base, 2)}`;
}

export function lineTip(curve: Curve, language: Language) {
  const text = copy[language];
  const g = gaps(curve);
  const last = curve.shots.length - 1;
  return `${labelOf(curve, language)}\nk = 0：${signedPp(g[0] ?? 0, 2)}\nk = ${curve.shots[last]}：${signedPp(g[last] ?? 0, 2)}`.replaceAll('：', language === 'zh' ? '：' : ': ');
}
