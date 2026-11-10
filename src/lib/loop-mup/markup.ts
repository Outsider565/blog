// String builders shared by the Loop-μP figures. Each figure renders its view
// as markup from a plain state object, so the same function produces the
// static build-time SVG and every re-render in the browser.
import type { Language } from '../site';

export type Lang = Language;
type Value = string | number | boolean | undefined | null;

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (value: string | number) => String(value).replace(/[&<>"]/g, character => escapes[character]!);

const attribute = (value: Value) => typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : esc(String(value));

/** <tag attrs>children</tag>; attributes that are false, null or undefined are left out. */
export function el(tag: string, attributes: Record<string, Value> = {}, children: string | string[] = ''): string {
  const list = Object.entries(attributes).filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => value === true ? ` ${key}` : ` ${key}="${attribute(value)}"`).join('');
  const body = Array.isArray(children) ? children.join('') : children;
  return `<${tag}${list}>${body}</${tag}>`;
}

/** Self-closing SVG element. */
export function leaf(tag: string, attributes: Record<string, Value> = {}): string {
  return el(tag, attributes).replace(/><\/[a-z]+>$/, '/>');
}

// A tiny math notation for labels: $N$ is an italic variable; ^{…} and _{…}
// (or one character after ^ or _) are super- and subscripts and may nest;
// [w:…], [d:…] and [l:…] colour width, depth and loop terms.
type Node = { kind: 'text'; text: string } | { kind: 'var' | 'sup' | 'sub' | 'w' | 'd' | 'l'; children: Node[] };

function parse(source: string): Node[] {
  let position = 0;
  const group = (close?: string): Node[] => {
    const nodes: Node[] = [];
    let text = '';
    const flush = () => { if (text) nodes.push({ kind: 'text', text }); text = ''; };
    while (position < source.length) {
      const character = source[position]!;
      if (close && character === close) { position++; break; }
      if (character === '$') {
        flush();
        const end = source.indexOf('$', position + 1);
        const inner = source.slice(position + 1, end < 0 ? source.length : end);
        position = end < 0 ? source.length : end + 1;
        nodes.push({ kind: 'var', children: parse(inner) });
      } else if ((character === '^' || character === '_') && position + 1 < source.length) {
        flush();
        const kind = character === '^' ? 'sup' : 'sub';
        if (source[position + 1] === '{') { position += 2; nodes.push({ kind, children: group('}') }); }
        else { nodes.push({ kind, children: [{ kind: 'text', text: source[position + 1]! }] }); position += 2; }
      } else if (character === '[' && /^[wdl]:/.test(source.slice(position + 1, position + 3))) {
        flush();
        const kind = source[position + 1] as 'w' | 'd' | 'l';
        position += 3;
        nodes.push({ kind, children: group(']') });
      } else { text += character; position++; }
    }
    flush();
    return nodes;
  };
  return group();
}

const colour = { w: 'lm-width', d: 'lm-depth', l: 'lm-loop' } as const;

function toHtml(nodes: Node[]): string {
  return nodes.map(node => {
    if (node.kind === 'text') return esc(node.text);
    const inner = toHtml(node.children);
    if (node.kind === 'var') return `<var>${inner}</var>`;
    if (node.kind === 'sup' || node.kind === 'sub') return `<${node.kind}>${inner}</${node.kind}>`;
    return `<span class="${colour[node.kind]}">${inner}</span>`;
  }).join('');
}

function toSvg(nodes: Node[]): string {
  return nodes.map(node => {
    if (node.kind === 'text') return esc(node.text);
    const inner = toSvg(node.children);
    if (node.kind === 'var') return `<tspan class="lm-var">${inner}</tspan>`;
    if (node.kind === 'sup') return `<tspan class="lm-script" dy="-6">${inner}</tspan><tspan dy="6">​</tspan>`;
    if (node.kind === 'sub') return `<tspan class="lm-script" dy="4">${inner}</tspan><tspan dy="-4">​</tspan>`;
    return `<tspan class="${colour[node.kind]}">${inner}</tspan>`;
  }).join('');
}

const superscripts: Record<string, string> = { '-': '⁻', '−': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '/': 'ᐟ' };
function toPlain(nodes: Node[]): string {
  return nodes.map(node => {
    if (node.kind === 'text') return node.text;
    const inner = toPlain(node.children);
    return node.kind === 'sup' ? [...inner].map(character => superscripts[character] ?? character).join('') : inner;
  }).join('');
}

/** Notation → HTML (var, sup, sub, coloured spans). */
export const html = (source: string) => toHtml(parse(source));
/** Notation → SVG tspans. A zero-width character after each script restores the baseline. */
export const svgText = (source: string) => toSvg(parse(source));
/** Notation → plain Unicode, for tooltips and aria labels. */
export const plain = (source: string) => toPlain(parse(source));

export const pick = <T>(language: Lang, zh: T, en: T) => language === 'zh' ? zh : en;

const superscriptDigits: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** 3.2e18 → "3.2×10¹⁸"; small magnitudes keep plain decimals. */
export function compact(value: number, digits = 3): string {
  if (value === 0) return '0';
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent >= -2 && exponent < 4) return Number(value.toPrecision(digits)).toString();
  const mantissa = value / 10 ** exponent;
  const power = `10${String(exponent).split('').map(character => superscriptDigits[character] ?? character).join('')}`;
  return Math.abs(mantissa - 1) < 0.005 ? power : `${Number(mantissa.toPrecision(digits - 1))}×${power}`;
}

/** Learning rates in units of 10⁻³ ("1.25×10⁻³"). */
export const learningRate = (value: number) => `${Number((value * 1000).toPrecision(3))}×10⁻³`;

export interface Control { key: string; label: string; options: { value: string; label: string }[]; value: string }
export interface Stat { value: string; label: string; note?: string; tone?: 'loop' | 'base' | 'good' | 'bad' | 'muted' }
export interface Table { summary: string; head: string[]; rows: { cells: string[]; best?: boolean[]; group?: string }[]; note?: string }

/** Segmented controls; buttons carry data-lm-key/data-lm-value for the delegated click handler. */
export function controls(list: Control[], uid: string): string {
  return list.map(control => el('div', { class: 'smelt-control' }, [
    el('span', { class: 'smelt-control-label', id: `${uid}-${control.key}` }, html(control.label)),
    el('div', { class: 'smelt-seg', role: 'group', 'aria-labelledby': `${uid}-${control.key}` },
      control.options.map(option => el('button', { type: 'button', 'data-lm-key': control.key, 'data-lm-value': option.value, 'aria-pressed': String(option.value === control.value) }, html(option.label)))),
  ])).join('');
}

export function stats(list: Stat[]): string {
  return el('div', { class: 'smelt-stats lm-stats' }, list.map(stat => el('div', { class: 'smelt-stat' }, [
    el('span', { class: `smelt-stat-value${stat.tone ? ` is-${stat.tone}` : ''}` }, html(stat.value) + (stat.note ? `<small class="lm-stat-note">${html(stat.note)}</small>` : '')),
    el('span', { class: 'smelt-stat-label' }, html(stat.label)),
  ])));
}

/** A chart rendered at two widths; CSS shows the one that fits the figure. */
export function variants(render: (variant: 'wide' | 'narrow') => string): string {
  return render('wide') + render('narrow');
}

export function svg(variant: 'wide' | 'narrow', width: number, height: number, label: string, body: string, extraClass = ''): string {
  return el('svg', { class: `smelt-chart lm-chart is-${variant}${extraClass ? ` ${extraClass}` : ''}`, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label, 'data-variant': variant }, body);
}
