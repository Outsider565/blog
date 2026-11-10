// The separate-fit scaling law of the SMELT paper (Eq. 3-6), shared by the
// ScalingFit and ComputeFrontier figures. Runs at build time and in the browser.
//
//   L(F, S, D) = E + A (1 - S)^b / F^a + K / D^c                       (Eq. 3)
//   F*(C, S)   = (a A (1 - S)^b C^c / (c K))^(1 / (a + c)),  D* = C / F*  (Eq. 4)
//   L*(C, S)   = E + G(S) C^-γ,  γ = a c / (a + c)                     (Eq. 5)
//   CE Gain    = 1 - C_tgt / C_ref at equal frontier loss              (Eq. 6)

export interface Law { E: number; A: number; K: number; a: number; b: number; c: number }
export type Arch = 'baseline' | 'smelt';
export const archs: readonly Arch[] = ['baseline', 'smelt'];

export interface Terms { E: number; capacity: number; data: number; total: number }

export function terms(law: Law, flops: number, sparsity: number, tokens: number): Terms {
  const capacity = law.A * (1 - sparsity) ** law.b / flops ** law.a;
  const data = law.K / tokens ** law.c;
  return { E: law.E, capacity, data, total: law.E + capacity + data };
}

export const gamma = (law: Law) => law.a * law.c / (law.a + law.c);

/** Compute-optimal per-token FLOPs at budget C (Eq. 4). */
export function optimalFlops(law: Law, compute: number, sparsity: number) {
  return (law.a * law.A * (1 - sparsity) ** law.b * compute ** law.c / (law.c * law.K)) ** (1 / (law.a + law.c));
}

export function allocation(law: Law, compute: number, sparsity: number) {
  const flops = optimalFlops(law, compute, sparsity);
  const tokens = compute / flops;
  // F/6 is the dense-equivalent parameter count, as in the paper's TPP.
  return { flops, tokens, tpp: tokens / (flops / 6) };
}

/** Lowest loss budget C can buy at sparsity S. */
export function frontierLoss(law: Law, compute: number, sparsity: number) {
  const flops = optimalFlops(law, compute, sparsity);
  return terms(law, flops, sparsity, compute / flops).total;
}

/** G in L* = E + G C^-γ; the frontier is an exact power law above E. */
export function frontierPrefactor(law: Law, sparsity: number) {
  const reference = 1e20;
  return (frontierLoss(law, reference, sparsity) - law.E) * reference ** gamma(law);
}

/** Budget at which this law's frontier reaches loss L; Infinity at or below its floor E. */
export function computeForLoss(law: Law, sparsity: number, loss: number) {
  if (loss <= law.E) return Infinity;
  return (frontierPrefactor(law, sparsity) / (loss - law.E)) ** (1 / gamma(law));
}

/** CE Gain of target over reference at the target's budget C (Eq. 6). */
export function ceGain(target: Law, reference: Law, compute: number, sparsity: number) {
  const loss = frontierLoss(target, compute, sparsity);
  const referenceCompute = computeForLoss(reference, sparsity, loss);
  return { loss, referenceCompute, gain: 1 - compute / referenceCompute };
}

// ---- formatting -------------------------------------------------------------

const superscript: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (value: number) => String(value).split('').map(character => superscript[character] ?? character).join('');

/** 1.172e21 → "1.17×10²¹"; 1e21 → "10²¹" (when the mantissa rounds to 1). */
export function sci(value: number, digits = 3) {
  if (!Number.isFinite(value)) return '∞';
  let exponent = Math.floor(Math.log10(Math.abs(value)));
  let mantissa = Number((value / 10 ** exponent).toPrecision(digits));
  if (mantissa >= 10) { mantissa /= 10; exponent += 1; }
  const text = mantissa.toFixed(Math.max(0, digits - 1));
  return Math.abs(mantissa - 1) < 1e-9 ? `10${sup(exponent)}` : `${text}×10${sup(exponent)}`;
}

// Farm Sans (the site's sans) has no glyphs for ⁰ ⁴–⁹, so they fall back to a CJK
// font and sit lower and smaller than ¹ ² ³. In HTML, render every superscript run
// as a real <sup>; keep the Unicode form for SVG text (serif) and ARIA strings.
const plainDigit: Record<string, string> = { '⁻': '−', '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (text: string) => text.replace(/[&<>"]/g, character => escapes[character] ?? character);
/** "8.12×10⁹ FLOPs" → "8.12×10<sup>9</sup> FLOPs" (escaped, safe for innerHTML / set:html). */
export const supHtml = (text: string) => escapeHtml(text).replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, run => `<sup>${[...run].map(character => plainDigit[character] ?? character).join('')}</sup>`);

/** 2.156e11 tokens → "216B". */
export function billions(value: number) {
  const billion = value / 1e9;
  return `${billion >= 100 ? billion.toFixed(0) : billion >= 10 ? billion.toFixed(0) : billion.toFixed(1)}B`;
}

export const minus = (text: string) => text.replace(/^-/, '−');
export const signedFixed = (value: number, decimals: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${Math.abs(value).toFixed(decimals)}`;

// ---- linked highlighting between SmeltFormula and ScalingFit ------------------
// Every component broadcasts the whole state on `document`; the formula owns the
// pinned term (click / tap), anyone may set the hovered one. Display = hover ?? pinned.

export type TermKey = 'E' | 'capacity' | 'data';
export const termKeys: readonly TermKey[] = ['E', 'capacity', 'data'];
export const termEvent = 'smelt:term';
export interface TermState { hover: TermKey | null; pinned: TermKey | null; source: string }
export const isTermKey = (value: string | undefined | null): value is TermKey => value === 'E' || value === 'capacity' || value === 'data';

// ---- Figure 6 playground ---------------------------------------------------------
// Slider ranges span the fitted window (min/max over the 144 sparse-grid endpoints:
// F 6.33e8..1.03e10, S 0.843..0.974, D 2.05e10..2.16e11), rounded outward slightly.
export const playground = {
  F: { min: 6.2e8, max: 1.05e10, log: true, step: 0.001 },
  S: { min: 0.84, max: 0.975, log: false, step: 0.0025 },
  D: { min: 2.0e10, max: 2.2e11, log: true, step: 0.001 },
  /** Bars show 0 … breakAt compressed into a stub, then breakAt … maxLoss to scale. */
  breakAt: 1.4,
  maxLoss: 2.4,
  /** Half-range of the difference bars, in millinats. */
  deltaRange: 15,
} as const;
export type PlayParam = 'F' | 'S' | 'D';
export const playParams: readonly PlayParam[] = ['F', 'S', 'D'];

/** Slider value (log10 for F and D) ↔ physical value. */
export const toSlider = (param: PlayParam, value: number) => playground[param].log ? Math.log10(value) : value;
export const fromSlider = (param: PlayParam, value: number) => playground[param].log ? 10 ** value : value;
export const sliderBounds = (param: PlayParam) => [toSlider(param, playground[param].min), toSlider(param, playground[param].max)] as const;
/** Position of a physical value along its slider, 0..1. */
export function sliderFraction(param: PlayParam, value: number) {
  const [low, high] = sliderBounds(param);
  return (toSlider(param, value) - low) / (high - low);
}
export function formatParam(param: PlayParam, value: number) {
  if (param === 'F') return sci(value, 3);
  if (param === 'S') return `${(value * 100).toFixed(1)}%`;
  return billions(value);
}
/** Fraction of the to-scale part of a bar for a loss value. */
export const barFraction = (loss: number) => (loss - playground.breakAt) / (playground.maxLoss - playground.breakAt);
