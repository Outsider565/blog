// Small plotting helpers shared by the SMELT figures. They run both at build
// time (Astro frontmatter renders the static SVG) and in the browser.

export type Point = readonly [number, number];
export type Scale = ((value: number) => number) & { domain: readonly [number, number]; range: readonly [number, number] };

export function linear(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const map = (value: number) => d1 === d0 ? (r0 + r1) / 2 : r0 + (value - d0) / (d1 - d0) * (r1 - r0);
  return Object.assign(map, { domain, range });
}

export function log10Scale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const inner = linear([Math.log10(domain[0]), Math.log10(domain[1])], range);
  return Object.assign((value: number) => inner(Math.log10(value)), { domain, range });
}

/** Evenly spaced "nice" ticks (1, 2, 2.5, 5 × 10^k steps) covering [min, max]. */
export function ticks(min: number, max: number, count = 5): number[] {
  if (max <= min) return [min];
  const raw = (max - min) / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * power).find(candidate => candidate >= raw) ?? raw;
  const first = Math.ceil(min / step - 1e-9) * step;
  const values: number[] = [];
  for (let value = first; value <= max + step * 1e-9; value += step) values.push(Number(value.toPrecision(12)));
  return values;
}

/** Powers of ten inside [min, max]. */
export function decadeTicks(min: number, max: number): number[] {
  const values: number[] = [];
  for (let exponent = Math.ceil(Math.log10(min) - 1e-9); exponent <= Math.floor(Math.log10(max) + 1e-9); exponent++) values.push(10 ** exponent);
  return values;
}

/** Round to the precision implied by a tick step, without trailing noise. */
export function tickLabel(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return value.toFixed(decimals);
}

const superscripts: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** 1e21 → "10²¹"; 3e20 → "3×10²⁰". */
export function powerLabel(value: number): string {
  const exponent = Math.floor(Math.log10(value) + 1e-9);
  const mantissa = value / 10 ** exponent;
  const power = `10${String(exponent).split('').map(character => superscripts[character] ?? character).join('')}`;
  return Math.abs(mantissa - 1) < 1e-6 ? power : `${Number(mantissa.toPrecision(2))}×${power}`;
}

export const fixed = (value: number, decimals = 2) => value.toFixed(decimals);
export const percent = (value: number, decimals = 1) => `${(value * 100).toFixed(decimals)}%`;
export const signed = (value: number, decimals = 2) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(decimals)}`;

/** Polyline path through the points. */
export function linePath(points: readonly Point[]): string {
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
}

/** Monotone cubic (Fritsch–Carlson) path: smooth without overshooting data. */
export function smoothPath(points: readonly Point[]): string {
  const n = points.length;
  if (n < 3) return linePath(points);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let index = 0; index < n - 1; index++) {
    dx.push(points[index + 1]![0] - points[index]![0]);
    slope.push((points[index + 1]![1] - points[index]![1]) / (dx[index] || 1));
  }
  const tangent = [slope[0]!];
  for (let index = 1; index < n - 1; index++) {
    const previous = slope[index - 1]!;
    const next = slope[index]!;
    tangent.push(previous * next <= 0 ? 0 : 3 * (dx[index - 1]! + dx[index]!) / ((2 * dx[index]! + dx[index - 1]!) / previous + (dx[index]! + 2 * dx[index - 1]!) / next));
  }
  tangent.push(slope[n - 2]!);
  let path = `M${points[0]![0].toFixed(2)} ${points[0]![1].toFixed(2)}`;
  for (let index = 0; index < n - 1; index++) {
    const [x0, y0] = points[index]!;
    const [x1, y1] = points[index + 1]!;
    const third = dx[index]! / 3;
    path += `C${(x0 + third).toFixed(2)} ${(y0 + tangent[index]! * third).toFixed(2)} ${(x1 - third).toFixed(2)} ${(y1 - tangent[index + 1]! * third).toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return path;
}

/** Closed band between an upper and a lower series sharing x positions. */
export function bandPath(upper: readonly Point[], lower: readonly Point[]): string {
  return `${linePath(upper)}${[...lower].reverse().map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join('')}Z`;
}

export const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
export const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;
