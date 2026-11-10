// Figure 1: the budget-matching recipe as five states, from the Baseline to SMELT.
// Shared by the Astro component (static final state) and the browser script (tweens).
import data from '../../data/smelt/budget-match.json';
import type { Language } from '../site';

export type MeterKey = 'flops' | 'params' | 'kv';
export const meterKeys: readonly MeterKey[] = ['flops', 'params', 'kv'];
export const steps = data.steps;
export type Step = typeof steps[number];
export type StepConfig = Step['config'];
export const finalStep = steps.length - 1;
export const baseline = steps[0]!.config;
export const smelt = steps[finalStep]!.config;
export const tolerance = data.tolerance as Record<MeterKey, number>;
export const loopFrom = data.loopedSpan[0]!;
export const loopTo = data.loopedSpan[1]!;
export const layerIndices = Array.from({ length: baseline.physical }, (_, index) => index + 1);

// ---- meters ----------------------------------------------------------------
export const meterDomain = [0.5, 1.6] as const;
export const meterPosition = (ratio: number) => Math.min(100, Math.max(0, (ratio - meterDomain[0]) / (meterDomain[1] - meterDomain[0]) * 100));
export const meterTicks = [0.5, 1, 1.5];
/** FLOPs of the three teaching intermediates inherit the calibrated attention term. */
export const isApproximate = (step: number, key: MeterKey) => key === 'flops' && step > 1 && step < finalStep;
export const ratioOf = (step: number, key: MeterKey) => steps[step]!.ratio[key];
export const matched = (ratio: number, key: MeterKey) => Math.abs(ratio - 1) <= tolerance[key] + 1e-9;

export function formatRatio(value: number, step: number, key: MeterKey) {
  const digits = step === finalStep ? 3 : 2;
  return `${isApproximate(step, key) ? '≈' : ''}${value.toFixed(digits)}×`;
}

export function statusText(step: number, key: MeterKey, language: Language) {
  const ratio = ratioOf(step, key);
  const deviation = ratio - 1;
  const size = Math.abs(deviation);
  const approx = isApproximate(step, key) ? '≈' : '';
  const amount = `${(size * 100).toFixed(size >= 0.1 ? 0 : 1)}%`;
  // No-break spaces keep a status on one line ("matched · +0.4%" never splits after the dot).
  const nb = '\u00a0';
  if (step === 0) return { text: language === 'zh' ? '基线预算' : `reference${nb}budget`, state: 'reference' as const };
  if (size < 5e-5) return { text: language === 'zh' ? '不变' : 'unchanged', state: 'matched' as const };
  if (matched(ratio, key)) return { text: `${language === 'zh' ? '已匹配' : 'matched'}${nb}·${nb}${approx}${deviation >= 0 ? '+' : '−'}${amount}`, state: 'matched' as const };
  return { text: language === 'zh' ? `${deviation > 0 ? '超出' : '不足'}${nb}${approx}${amount}` : `${approx}${amount}${nb}${deviation > 0 ? 'over' : 'under'}`, state: 'off' as const };
}

const superscript: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const flopsLabel = (value: number) => `${(value / 1e9).toFixed(2)}×10${'9'.split('').map(digit => superscript[digit]).join('')}`;
export const paramsLabel = (value: number) => `${(value / 1e9).toFixed(2)}B`;
export const groupDigits = (value: number) => value.toLocaleString('en-US');

/** Absolute value shown in a meter's tooltip; the final state uses the paper's rounded numbers. */
export function absoluteLabel(step: number, key: MeterKey) {
  const item = steps[step]!;
  const approx = isApproximate(step, key) ? '≈' : '';
  if (key === 'flops') return `${approx}${step === finalStep ? flopsLabel(data.paper.flopsSmelt) : step === 0 ? flopsLabel(data.paper.flopsBase) : flopsLabel(item.absolute.flops)}`;
  if (key === 'params') return step === finalStep ? paramsLabel(data.paper.paramsSmelt) : step === 0 ? paramsLabel(data.paper.paramsBase) : paramsLabel(item.absolute.params);
  return groupDigits(item.absolute.kvValues);
}

/** Tooltip for a meter: Baseline value, current value and the paper's tolerance. */
export function meterTip(step: number, key: MeterKey, language: Language) {
  const text = copy[language];
  const zh = language === 'zh';
  const open = zh ? '（' : ' (';
  const close = zh ? '）' : ')';
  const unit = key === 'kv' ? `${open}${text.kvUnit}${close}` : '';
  return [
    text.meters[key],
    `${text.reference}${text.colon}${absoluteLabel(0, key)}${unit}`,
    `${text.current}${text.colon}${absoluteLabel(step, key)}${open}${formatRatio(ratioOf(step, key), step, key)}${close}`,
    `${text.tolerance}${text.colon}< ${Math.round(tolerance[key] * 100)}%`,
  ].join('\n');
}

// ---- diagram geometry --------------------------------------------------------
/** Continuous shape the diagram is drawn from; tweens interpolate it. */
export interface Shape { hidden: number; headsPerGroup: number; headDim: number; cell: number }
export const shapeOf = (config: StepConfig): Shape => ({
  hidden: config.hidden,
  headsPerGroup: config.heads / config.kvHeads,
  headDim: config.headDim,
  // Expert squares keep area proportional to parameters per expert (3 · H · d_ffn).
  cell: Math.sqrt(config.paramsPerExpert / baseline.paramsPerExpert),
});
export const mixShape = (from: Shape, to: Shape, t: number): Shape => ({
  hidden: from.hidden + (to.hidden - from.hidden) * t,
  headsPerGroup: from.headsPerGroup + (to.headsPerGroup - from.headsPerGroup) * t,
  headDim: from.headDim + (to.headDim - from.headDim) * t,
  cell: from.cell + (to.cell - from.cell) * t,
});

export const panelSize = { width: 200, height: 224 } as const;
export const attentionSize = { width: 220, height: 224 } as const;

// Layers panel: bar width is proportional to the hidden size.
export const layers = { cx: 120, unit: 0.1, barH: 11, pitch: 16.5, bottom: 200, ruler: 214 } as const;
export const layerY = (layer: number) => layers.bottom - layers.barH - (layer - 1) * layers.pitch;
export const layerWidth = (hidden: number) => hidden * layers.unit;
export const baseWidth = layerWidth(baseline.hidden);
export const bracketX = layers.cx - baseWidth / 2 - 18;

// Attention panel: one group of query heads per KV head (GQA); bar height ∝ head dim.
export const attention = { groups: [58, 162], headW: 9, headGap: 3.5, unit: 0.6, qBottom: 100, kvTop: 140, kvW: 9, kvGap: 2, maxHeads: 6 } as const;
export function headX(shape: Shape, group: number, slot: number) {
  const n = shape.headsPerGroup;
  const span = n * attention.headW + (n - 1) * attention.headGap;
  return attention.groups[group]! - span / 2 + slot * (attention.headW + attention.headGap);
}
export const headVisibility = (shape: Shape, slot: number) => Math.min(1, Math.max(0, shape.headsPerGroup - slot));
export const headHeight = (shape: Shape) => shape.headDim * attention.unit;

// Experts panel: a grid of slots, the first 192 filled at the Baseline. 16 columns
// beside the other panels; 24 columns when the panel spans a phone-width figure.
export const experts = { pitch: 11, size: 8.6 } as const;
export function expertGrid(columns: number, margin: number) {
  const rows = Math.ceil(smelt.experts / columns);
  return {
    width: columns * experts.pitch + 2 * margin,
    height: rows * experts.pitch + 2 * margin,
    slots: Array.from({ length: smelt.experts }, (_, index) => ({
      index,
      x: margin + (index % columns) * experts.pitch + (experts.pitch - experts.size) / 2,
      y: margin + Math.floor(index / columns) * experts.pitch + (experts.pitch - experts.size) / 2,
      added: index >= baseline.experts,
    })),
  };
}
export const expertGrids = [{ id: 'wide', ...expertGrid(16, 12) }, { id: 'compact', ...expertGrid(24, 6) }] as const;
/** Eight routed experts for one token (illustrative positions, top-8 in both models). Once the
 *  pool grows to 288, top-8 is chosen from all of them, so the second set includes added experts. */
export const routedBase: ReadonlySet<number> = new Set([3, 26, 45, 71, 92, 118, 141, 170]);
export const routedMore: ReadonlySet<number> = new Set([3, 45, 92, 118, 170, 205, 233, 262]);
export const routedAt = (step: number) => step >= 3 ? routedMore : routedBase;

// ---- copy ------------------------------------------------------------------
const r = (step: number, key: MeterKey) => formatRatio(ratioOf(step, key), step, key);
const b = baseline;
const s = smelt;
const n = steps[2]!.config;
const qWidth = (config: StepConfig) => config.heads * config.headDim;
const gqa = (config: StepConfig) => `${config.heads / config.kvHeads}:1`;

export const copy = {
  zh: {
    stepper: '预算匹配的五个步骤',
    labels: ['基线', '循环 ×2', '缩窄', '加专家', '调注意力'],
    titles: ['基线', '循环中间 50% 的层', '缩窄模型', '增加专家', '调整注意力 = SMELT'],
    bodies: [
      `${b.physical} 层，隐藏维度 ${b.hidden}，每层 ${b.experts} 个专家、每个 token 激活 ${b.topk} 个。三项预算都以它为 1×。`,
      `第 ${loopFrom}–${loopTo} 层执行两次，执行层数 ${b.executed} → ${steps[1]!.config.executed}。参数一个没加，但每 token FLOPs 和 KV cache 都涨到 ${r(1, 'flops')}。`,
      `隐藏维度 ${b.hidden} → ${n.hidden}，专家 FFN ${b.ffn} → ${n.ffn}，Q 头 ${b.heads} → ${n.heads}。FLOPs 回到 ${r(2, 'flops')}，循环多花的计算被抵消；但每个专家都变小了，总参数量跌到 ${r(2, 'params')}。`,
      `每层专家 ${n.experts} → ${s.experts}，每个 token 仍只激活 ${s.topk} 个，所以 FLOPs 几乎不动（${r(3, 'flops')}），总参数量回到 ${r(3, 'params')}。只剩 KV cache 还在 ${r(3, 'kv')}。`,
      `head dim ${n.headDim} → ${s.headDim}，Q 头 ${n.heads} → ${s.heads}（GQA ${gqa(n)}\u00a0→\u00a0${gqa(s)}），Q 总宽度 ${s.heads} × ${s.headDim} = ${qWidth(s)}，正好等于隐藏维度。KV cache 回到 ${r(4, 'kv')}，FLOPs ${r(4, 'flops')}：三项预算全部对齐。`,
    ],
    stepWord: (index: number) => `第 ${index + 1} 步`,
    prev: '上一步', next: '下一步',
    meters: { flops: '每 token FLOPs', params: '总参数量', kv: 'KV cache' } as Record<MeterKey, string>,
    budgets: '三项预算（相对基线）',
    reference: '基线', current: '当前', tolerance: '论文的典型误差', kvUnit: '每 token 缓存的 K/V 数', colon: '：',
    panels: {
      layers: { title: '深度与宽度', key: [['loop', '执行两次的层'], ['ghost', '基线宽度']] },
      attention: { title: '注意力（每层）', key: [['hollow', 'Q 头'], ['added-head', '新增的 Q 头'], ['filled', 'K/V 头（被缓存）']] },
      experts: { title: 'MoE 专家（每层）', key: [['expert', '面积 ∝ 每个专家的参数量'], ['added', `新增的 ${s.experts - b.experts} 个专家`], ['routed', '一个 token 的 top-8']] },
    },
    table: '配置与推算方法', item: '项目', baselineName: '基线', smeltName: 'SMELT',
    pair: '200M 规模、S ≈ 95% 的一对匹配模型。',
  },
  en: {
    stepper: 'Five steps of budget matching',
    labels: ['Baseline', 'Loop ×2', 'Narrow', 'Experts', 'Attention'],
    titles: ['Baseline', 'Loop the middle 50%', 'Narrow the model', 'Add experts', 'Adjust attention = SMELT'],
    bodies: [
      `${b.physical} layers, hidden size ${b.hidden}, ${b.experts} experts per layer with ${b.topk} active per token. All three budgets are measured against it (1×).`,
      `Layers ${loopFrom}–${loopTo} run twice, so ${steps[1]!.config.executed} layers execute instead of ${b.executed}. No parameter is added, but per-token FLOPs and KV cache both rise to ${r(1, 'flops')}.`,
      `Hidden size ${b.hidden} → ${n.hidden}, expert FFN ${b.ffn} → ${n.ffn}, query heads ${b.heads} → ${n.heads}. FLOPs fall back to ${r(2, 'flops')}, paying for the loop, but every expert shrinks, so total parameters drop to ${r(2, 'params')}.`,
      `Experts per layer ${n.experts} → ${s.experts}, still ${s.topk} active per token, so FLOPs barely move (${r(3, 'flops')}) and total parameters return to ${r(3, 'params')}. Only the KV cache is still at ${r(3, 'kv')}.`,
      `Head dim ${n.headDim} → ${s.headDim} and query heads ${n.heads} → ${s.heads} (GQA ${gqa(n)}\u00a0→\u00a0${gqa(s)}), so the query width is ${s.heads} × ${s.headDim} = ${qWidth(s)}, the hidden size. KV cache returns to ${r(4, 'kv')} and FLOPs land at ${r(4, 'flops')}: all three budgets match.`,
    ],
    stepWord: (index: number) => `Step ${index + 1}`,
    prev: 'Previous step', next: 'Next step',
    meters: { flops: 'Per-token FLOPs', params: 'Total parameters', kv: 'KV cache' } as Record<MeterKey, string>,
    budgets: 'Budgets vs. the Baseline',
    reference: 'Baseline', current: 'Now', tolerance: "Paper's typical mismatch", kvUnit: 'K/V entries cached per token', colon: ': ',
    panels: {
      layers: { title: 'Depth and width', key: [['loop', 'layers run twice'], ['ghost', 'Baseline width']] },
      attention: { title: 'Attention (per layer)', key: [['hollow', 'query heads'], ['added-head', 'added query head'], ['filled', 'K/V heads (cached)']] },
      experts: { title: 'MoE experts (per layer)', key: [['expert', 'area ∝ parameters per expert'], ['added', `${s.experts - b.experts} added experts`], ['routed', "one token's top-8"]] },
    },
    table: 'Configurations and arithmetic', item: '', baselineName: 'Baseline', smeltName: 'SMELT',
    pair: 'The matched pair at the 200M scale, S ≈ 95%.',
  },
} as const;

/** Values printed under each panel; `changed` marks what differs from the Baseline. */
export function panelFields(config: StepConfig) {
  return {
    executed: { value: String(config.executed), changed: config.executed !== baseline.executed },
    hidden: { value: String(config.hidden), changed: config.hidden !== baseline.hidden },
    heads: { value: String(config.heads), changed: config.heads !== baseline.heads },
    kvHeads: { value: String(config.kvHeads), changed: config.kvHeads !== baseline.kvHeads },
    headDim: { value: String(config.headDim), changed: config.headDim !== baseline.headDim },
    experts: { value: String(config.experts), changed: config.experts !== baseline.experts },
    ffn: { value: String(config.ffn), changed: config.ffn !== baseline.ffn },
  };
}
export type FieldKey = keyof ReturnType<typeof panelFields>;

export const paper = data.paper;
export const provenance = data.provenance;
