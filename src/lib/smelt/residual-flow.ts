// Figure 15 (residual-flow): layout and copy shared by the Astro render and the
// browser script. Data: src/data/smelt/residual-flow.json (see its provenance).
import data from '../../data/smelt/residual-flow.json';
import { linear, ticks } from './plot';

export type Language = 'zh' | 'en';
export type Size = '100M' | '200M' | '600M' | '1.6B';
export type Metric = 'update' | 'relative';
interface VisitSeries { update: number[]; relative: number[]; residual: number[]; attn: number[]; moe: number[] }
export interface ScaleData { layers: number[]; v1: VisitSeries; v2: VisitSeries; cosMean: number; cosCi95: number[]; normRatio: number; cos?: number[]; cosOther?: number }

export const sizes = data.sizes as Size[];
export const scales = data.scales as Record<Size, ScaleData>;
export const metrics: Metric[] = ['update', 'relative'];
export const defaultSize: Size = '1.6B';
export const defaultMetric: Metric = 'update';

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

/** Values of one layer (index) or of the block average (index = null). */
export function layerValues(size: Size, metric: Metric, index: number | null) {
  const scale = scales[size];
  const first = index === null ? mean(scale.v1[metric]) : scale.v1[metric][index] ?? 0;
  const second = index === null ? mean(scale.v2[metric]) : scale.v2[metric][index] ?? 0;
  const perLayerCos = index !== null && scale.cos ? scale.cos[index] : undefined;
  return { first, second, cos: perLayerCos ?? scale.cosMean, perLayer: perLayerCos !== undefined, layer: index === null ? null : scale.layers[index] ?? null };
}

/** Headline numbers. The ratio is the ratio of the block-average updates, the same
 *  quantity the glyph shows for the block average, so the two never disagree. */
export function summary(size: Size, metric: Metric) {
  const scale = scales[size];
  const ratios = scale.layers.map((_, index) => (scale.v2[metric][index] ?? 0) / (scale.v1[metric][index] ?? 1));
  return { larger: ratios.filter(ratio => ratio > 1).length, total: ratios.length, ratio: mean(scale.v2[metric]) / mean(scale.v1[metric]), cos: scale.cosMean };
}

// ---------- Paired bars + cosine strip (two server-rendered variants) ----------
export const barVariants = {
  wide: { width: 480, left: 46, right: 6, top: 28, plot: 168 },
  narrow: { width: 340, left: 40, right: 4, top: 28, plot: 150 },
} as const;
export type Variant = keyof typeof barVariants;

function niceMaximum(value: number) {
  const power = 10 ** Math.floor(Math.log10(value));
  const factor = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(candidate => candidate * power >= value * 1.04) ?? 10;
  return factor * power;
}

export function barLayout(size: Size, metric: Metric, variant: Variant) {
  const spec = barVariants[variant];
  const baseline = spec.top + spec.plot;
  const stripTop = baseline + 76;
  const stripHeight = 40;
  const box = { ...spec, baseline, labelY: baseline + 18, titleY: baseline + 38, stripTop, stripBottom: stripTop + stripHeight, height: stripTop + stripHeight + 8 };
  const scale = scales[size];
  const maximum = niceMaximum(Math.max(...scale.v1[metric], ...scale.v2[metric]));
  const y = linear([0, maximum], [baseline, box.top]);
  const cosY = linear([0, 1], [box.stripBottom, box.stripTop]);
  const count = scale.layers.length;
  const band = (box.width - box.left - box.right) / count;
  const gap = band > 22 ? 2 : 1;
  const barWidth = Math.min(16, (band * 0.76 - gap) / 2);
  const labelStep = band >= 24 ? 1 : band >= 13 ? 2 : 3;
  const tickValues = ticks(0, maximum, variant === 'wide' ? 4 : 3).filter(value => value <= maximum + 1e-9);
  const digits = Math.max(0, ...tickValues.map(value => { const text = String(value); return text.includes('.') ? text.split('.')[1]!.length : 0; }));
  const layers = scale.layers.map((layer, index) => {
    const center = box.left + (index + 0.5) * band;
    const first = scale.v1[metric][index] ?? 0;
    const second = scale.v2[metric][index] ?? 0;
    const cos = scale.cos?.[index];
    return {
      index, layer, center,
      label: index % labelStep === 0 ? String(layer) : '',
      first: { x: center - gap / 2 - barWidth, y: y(first), value: first },
      second: { x: center + gap / 2, y: y(second), value: second },
      cos: cos === undefined ? null : { y: cosY(cos), value: cos },
    };
  });
  return {
    box,
    maximum,
    baseline,
    band,
    barWidth,
    gap,
    ticks: tickValues.map(value => ({ value, y: y(value), label: value.toFixed(digits) })),
    cosTicks: [0, 0.5, 1].map(value => ({ value, y: cosY(value), label: value === 0.5 ? '0.5' : String(value) })),
    cosMean: { y: cosY(scale.cosMean), value: scale.cosMean },
    cosPath: layers.every(layer => layer.cos) ? layers.map((layer, index) => `${index ? 'L' : 'M'}${layer.center.toFixed(2)} ${layer.cos!.y.toFixed(2)}`).join('') : '',
    layers,
  };
}

// ---------- Angle glyph ----------
/** radius: the protractor sits at radius + 10; reach: the longest vector of a scale. The
 *  gap between them keeps the visit-2 tip and its label inside the protractor arc. */
export const glyph = { width: 260, height: 246, ox: 30, oy: 204, radius: 176, reach: 142 };
export const protractor = [1, 0.75, 0.5, 0.25, 0];

/** Lengths are scaled so the longest value of the scale (current metric) spans glyph.reach. */
export function glyphGeometry(size: Size, metric: Metric, values: { first: number; second: number; cos: number }) {
  const longest = Math.max(...scales[size].v2[metric], ...scales[size].v1[metric]);
  const theta = Math.acos(Math.max(-1, Math.min(1, values.cos)));
  return { theta, first: glyph.reach * values.first / longest, second: glyph.reach * values.second / longest };
}

/** Width estimate (user units) of 13-unit sans text, used to keep labels off other marks. */
export const textWidth = (value: string, latin = 7.2, cjk = 13) => [...value].reduce((sum, character) => sum + (/[\u3000-\u9fff\uff00-\uffef]/.test(character) ? cjk : latin), 0);

export function arrowHead(x: number, y: number, angle: number, size = 7) {
  const back = (offset: number) => [x - size * Math.cos(angle - offset), y + size * Math.sin(angle - offset)] as const;
  const [ax, ay] = back(0.42);
  const [bx, by] = back(-0.42);
  return `M${x.toFixed(2)} ${y.toFixed(2)}L${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}Z`;
}

/** Faint per-layer visit-2 vectors (1.6B only, where per-layer cosine exists). */
export function fanShapes(size: Size, metric: Metric) {
  const scale = scales[size];
  if (!scale.cos) return [];
  return scale.layers.map((_, index) => {
    const values = layerValues(size, metric, index);
    const geometry = glyphGeometry(size, metric, values);
    return { index, x2: glyph.ox + geometry.second * Math.cos(geometry.theta), y2: glyph.oy - geometry.second * Math.sin(geometry.theta) };
  });
}

/** All glyph drawing attributes for a (theta, first, second) state.
 *  - The visit-2 label sits just right of the arrow tip, at the tip's height: with
 *    lengths capped at glyph.reach it stays inside the protractor arc.
 *  - The cosine label sits in the wedge between the vectors; when the dashed
 *    projection line would run through it, it moves to whichever side of that
 *    line needs the smaller shift and still lies inside the wedge. */
export function glyphShapes(theta: number, first: number, second: number, arcText = '0.00') {
  const { ox, oy } = glyph;
  const tipX = ox + second * Math.cos(theta);
  const tipY = oy - second * Math.sin(theta);
  const arcRadius = Math.min(38, Math.max(22, Math.min(first, second) * 0.55));
  const arcEnd = [ox + arcRadius * Math.cos(theta), oy - arcRadius * Math.sin(theta)] as const;
  const labelAngle = theta / 2;
  const labelRadius = arcRadius + 14;
  const mark = 6;
  const inset = (length: number) => Math.max(0, length - 5);
  const arcWidth = textWidth(arcText, 7.6);
  const arcY = oy - labelRadius * Math.sin(labelAngle) + 4;
  let arcX = ox + labelRadius * Math.cos(labelAngle) + 4;
  if (second > 0 && tipX > arcX - 4 && tipX < arcX + arcWidth + 4) {
    const left = tipX - 4 - arcWidth;
    // Leftmost x inside the wedge at the label's top edge (text rises about 10 units).
    const shaftX = theta > 0.02 ? ox + (oy - arcY + 10) / Math.tan(theta) + 3 : Infinity;
    const right = tipX + 4;
    arcX = left >= shaftX && arcX - left <= right - arcX ? left : right;
  }
  return {
    first: { x2: ox + inset(first), y2: oy, head: arrowHead(ox + first, oy, 0) },
    second: { x2: ox + inset(second) * Math.cos(theta), y2: oy - inset(second) * Math.sin(theta), head: arrowHead(tipX, tipY, theta) },
    arc: `M${(ox + arcRadius).toFixed(2)} ${oy}A${arcRadius} ${arcRadius} 0 0 0 ${arcEnd[0].toFixed(2)} ${arcEnd[1].toFixed(2)}`,
    arcLabel: { x: arcX, y: arcY },
    drop: { x1: tipX, y1: tipY, x2: tipX, y2: oy },
    square: `M${(tipX - mark).toFixed(2)} ${oy}V${oy - mark}H${tipX.toFixed(2)}`,
    firstLabel: { x: ox + Math.max(first / 2, 26), y: oy + 19 },
    // A short visit-2 vector puts its label just above the cosine label: keep a line between them.
    secondLabel: { x: tipX + 9, y: tipX + 9 < arcX + arcWidth ? Math.min(tipY + 4.5, arcY - 20) : tipY + 4.5 },
  };
}

// ---------- Formatting and copy ----------
export const fmtValue = (value: number) => value >= 1 ? value.toFixed(2) : value >= 0.1 ? value.toFixed(3) : value.toFixed(4);
export const fmtRatio = (value: number) => `${value.toFixed(value >= 10 ? 0 : 1)}×`;
export const degrees = (cos: number) => Math.round(Math.acos(cos) * 180 / Math.PI);
export const subtitle = (text: { barsMath: Record<Metric, string>; barsSub: Record<Metric, string> }, metric: Metric) => `<span class="rf-math">${text.barsMath[metric]}</span> · ${text.barsSub[metric]}`;

export const copy = {
  zh: {
    scale: '规模',
    metric: '指标',
    metricNames: { update: '更新范数', relative: '相对更新比' } as Record<Metric, string>,
    barsTitle: '各循环层写入残差流的更新量',
    barsSub: { update: '残差更新的 RMS 幅度 · S ≈ 85%', relative: '残差更新相对残差流范数之比 · S ≈ 85%' } as Record<Metric, string>,
    barsMath: { update: '‖Δ<i>x</i>‖ / √<i>H</i>', relative: '‖Δ<i>x</i>‖ / ‖<i>x</i>‖' } as Record<Metric, string>,
    axisLayer: '循环块物理层编号',
    strip: '两轮更新余弦',
    stripMean: (cos: number) => `循环块均值 ${cos.toFixed(2)}`,
    visit1: '第 1 轮循环',
    visit2: '第 2 轮循环',
    glyphVisit1: '第 1 轮',
    glyphVisit2: '第 2 轮',
    glyphTitle: '两轮残差更新的方向关系',
    same: '同向',
    orthogonal: '正交',
    blockAverage: '循环块平均',
    layer: (layer: number) => `第 ${layer} 层`,
    glyphReadout: (label: string, ratio: number, cos: number) => `<strong>${label}</strong><br>幅度比 ${fmtRatio(ratio)} · cos ${cos.toFixed(2)} · 夹角 ${degrees(cos)}°`,
    statLarger: (larger: number, total: number) => `${larger} / ${total}`,
    statLargerLabel: '个循环层在第 2 轮写入的残差更新更大',
    statRatioLabel: '第 2 轮 / 第 1 轮（循环块均值之比）',
    statCosLabel: (cos: number) => `两轮更新余弦相似度（夹角约 ${degrees(cos)}°）`,
    tip: (size: string, layer: number, metric: Metric, first: number, second: number, attn: [number, number], moe: [number, number], cos: number | undefined) =>
      `${size} · 第 ${layer} 层\n${metric === 'update' ? '更新范数' : '相对更新比'}：第 1 轮 ${fmtValue(first)}，第 2 轮 ${fmtValue(second)}（${fmtRatio(second / first)}）\nAttention 写入：${fmtValue(attn[0])} → ${fmtValue(attn[1])}\nMoE 写入：${fmtValue(moe[0])} → ${fmtValue(moe[1])}${cos === undefined ? '' : `\n两轮更新余弦：${cos.toFixed(2)}`}`,
    dataSummary: '数据：各循环层两轮残差更新统计（S ≈ 85%）',
    columns: ['规模', '层', '第 1 轮 ‖Δx‖/√H', '第 2 轮 ‖Δx‖/√H', '比值', '第 1 轮 ‖Δx‖/‖x‖', '第 2 轮 ‖Δx‖/‖x‖', '余弦'],
    aria: '各循环层在两轮循环中写入残差流的更新幅度与方向对比',
  },
  en: {
    scale: 'Scale',
    metric: 'Metric',
    metricNames: { update: 'Update size', relative: 'Relative to residual' } as Record<Metric, string>,
    barsTitle: 'Update each looped layer writes into the residual stream',
    barsSub: { update: 'RMS size of the update · S ≈ 85%', relative: 'update relative to the residual stream · S ≈ 85%' } as Record<Metric, string>,
    barsMath: { update: '‖Δ<i>x</i>‖ / √<i>H</i>', relative: '‖Δ<i>x</i>‖ / ‖<i>x</i>‖' } as Record<Metric, string>,
    axisLayer: 'Looped physical layer',
    strip: 'Cosine of the two updates',
    stripMean: (cos: number) => `Block average ${cos.toFixed(2)}`,
    visit1: 'Visit 1',
    visit2: 'Visit 2',
    glyphVisit1: 'Visit 1',
    glyphVisit2: 'Visit 2',
    glyphTitle: 'Direction of the two updates',
    same: 'same',
    orthogonal: 'orthogonal',
    blockAverage: 'Block average',
    layer: (layer: number) => `Layer ${layer}`,
    glyphReadout: (label: string, ratio: number, cos: number) => `<strong>${label}</strong><br>ratio ${fmtRatio(ratio)} · cos ${cos.toFixed(2)} · ${degrees(cos)}°`,
    statLarger: (larger: number, total: number) => `${larger} / ${total}`,
    statLargerLabel: 'looped layers where visit 2 writes the larger update',
    statRatioLabel: 'visit 2 / visit 1, ratio of block averages',
    statCosLabel: (cos: number) => `cosine between the two updates (about ${degrees(cos)}°)`,
    tip: (size: string, layer: number, metric: Metric, first: number, second: number, attn: [number, number], moe: [number, number], cos: number | undefined) =>
      `${size} · layer ${layer}\n${metric === 'update' ? 'Update size' : 'Relative to residual'}: visit 1 ${fmtValue(first)}, visit 2 ${fmtValue(second)} (${fmtRatio(second / first)})\nAttention write: ${fmtValue(attn[0])} → ${fmtValue(attn[1])}\nMoE write: ${fmtValue(moe[0])} → ${fmtValue(moe[1])}${cos === undefined ? '' : `\nCosine between the updates: ${cos.toFixed(2)}`}`,
    dataSummary: "Data: both visits' updates per looped layer (S ≈ 85%)",
    columns: ['Scale', 'Layer', 'Visit 1 ‖Δx‖/√H', 'Visit 2 ‖Δx‖/√H', 'Ratio', 'Visit 1 ‖Δx‖/‖x‖', 'Visit 2 ‖Δx‖/‖x‖', 'Cosine'],
    aria: 'Size and direction of the residual-stream update written by each looped layer on the two visits',
  },
} as const;
