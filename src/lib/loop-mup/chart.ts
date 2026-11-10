// Axes and frames for the Loop-μP line charts, as SVG strings.
import { linear, log10Scale, type Scale } from '../smelt/plot';
import { el, leaf, svgText } from './markup';

export interface Frame { width: number; height: number; left: number; right: number; top: number; bottom: number }
export const box = (frame: Frame) => ({ x0: frame.left, x1: frame.width - frame.right, y0: frame.top, y1: frame.height - frame.bottom });

export function log2Scale(domain: readonly [number, number], range: readonly [number, number]): Scale {
  const inner = linear([Math.log2(domain[0]), Math.log2(domain[1])], range);
  return Object.assign((value: number) => inner(Math.log2(value)), { domain, range });
}
export { linear, log10Scale };

/** Horizontal grid lines with labels on the left, plus an optional rotated axis title. */
export function yAxis(scale: Scale, values: number[], frame: Frame, format: (value: number) => string, title?: string): string {
  const { x0, x1, y0, y1 } = box(frame);
  const lines = values.map(value => {
    const y = scale(value);
    return leaf('line', { class: 'grid', x1: x0, x2: x1, y1: y, y2: y }) + el('text', { x: x0 - 8, y: y + 4.5, 'text-anchor': 'end' }, svgText(format(value)));
  }).join('');
  const label = title ? el('text', { class: 'axis-title', transform: `translate(${frame.left - 46} ${(y0 + y1) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, svgText(title)) : '';
  return lines + label;
}

/** Baseline with tick labels below, plus an optional axis title. */
export function xAxis(scale: Scale, values: number[], frame: Frame, format: (value: number) => string, title?: string): string {
  const { x0, x1, y1 } = box(frame);
  const labels = values.map(value => el('text', { x: scale(value), y: y1 + 19, 'text-anchor': 'middle' }, svgText(format(value)))).join('');
  const label = title ? el('text', { class: 'axis-title', x: (x0 + x1) / 2, y: frame.height - 4, 'text-anchor': 'middle' }, svgText(title)) : '';
  return leaf('line', { class: 'axis', x1: x0, x2: x1, y1, y2: y1 }) + labels + label;
}

/** A series as a path with dots; each dot can carry a tooltip. */
export function series(points: { x: number; y: number; tip?: string }[], className: string, options: { dots?: boolean; radius?: number; dash?: string } = {}): string {
  if (!points.length) return '';
  const d = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('');
  const path = leaf('path', { class: `lm-line ${className}`, d, 'stroke-dasharray': options.dash, pathLength: options.dash ? undefined : 1 });
  const dots = options.dots === false ? '' : points.map(point => el('g', { class: `lm-dot ${className}`, 'data-tip': point.tip, role: point.tip ? 'img' : undefined, 'aria-label': point.tip?.replaceAll('\n', ' · ') }, [
    point.tip ? leaf('circle', { class: 'hit', cx: point.x, cy: point.y, r: 11 }) : '',
    leaf('circle', { cx: point.x, cy: point.y, r: options.radius ?? 3.6 }),
  ])).join('');
  return path + dots;
}
