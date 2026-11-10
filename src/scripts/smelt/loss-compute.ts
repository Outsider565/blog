// Figure 5 (loss-compute): live layout at the container's width, sparsity zoom
// with morphing marks, pair hover / keyboard cursor, and the training-curve
// inset that morphs between cells.
import { armReveal, bindSegmented, countUp, hideTooltip, reducedMotion, showTooltip, svgNode, tween } from './kit';
import {
  areaFromFlat, cellAt, cellCoords, cellIndex, cells, copy, DEFAULT_CELL, deltaRadius, dotRadius, f1, FINAL, FINAL_BONUS, HORIZONS,
  insetAxesMarkup, insetCaretsMarkup, insetCoords, insetLayout, insetMarksMarkup, mainAxesMarkup, mainLabelsMarkup, mainLayout,
  mainMarksMarkup, panelFor, pathFromFlat, scaleOf, signedFixed, sparsityLabel, sparsityOf, stablePoints, type CellCoords,
  type InsetCoords, type InsetLayout, type MainLayout, type Mode,
} from '../../lib/smelt/loss-compute';
import type { Language } from '../../lib/site';

const lerpArray = (a: readonly number[], b: readonly number[], t: number) => a.map((value, index) => value + ((b[index] ?? value) - value) * t);
const cloneCoords = (c: CellCoords): CellCoords => ({ base: [...c.base], loop: [...c.loop], delta: [...c.delta] });
const mixCoords = (a: CellCoords, b: CellCoords, t: number): CellCoords => ({ base: lerpArray(a.base, b.base, t), loop: lerpArray(a.loop, b.loop, t), delta: lerpArray(a.delta, b.delta, t) });
const mixInset = (a: InsetCoords, b: InsetCoords, t: number): InsetCoords => ({
  base: lerpArray(a.base, b.base, t), loop: lerpArray(a.loop, b.loop, t), delta: lerpArray(a.delta, b.delta, t),
  decayBase: a.decayBase.map((branch, k) => lerpArray(branch, b.decayBase[k] ?? branch, t)),
  decayLoop: a.decayLoop.map((branch, k) => lerpArray(branch, b.decayLoop[k] ?? branch, t)),
  decayDelta: a.decayDelta.map((branch, k) => lerpArray(branch, b.decayDelta[k] ?? branch, t)),
});

interface CellRefs { loss: SVGGElement; delta: SVGGElement; basePath: SVGPathElement; loopPath: SVGPathElement; deltaPath: SVGPathElement; baseDots: SVGCircleElement[]; loopDots: SVGCircleElement[]; deltaDots: SVGCircleElement[] }
interface Pair { cell: number; k: number }
let instance = 0;

class LossCompute {
  readonly language: Language;
  readonly text: (typeof copy)[Language];
  readonly id: string;
  readonly mainWrap: HTMLElement;
  readonly svg: SVGSVGElement;
  readonly inset: HTMLElement;
  readonly insetSvg: SVGSVGElement;
  readonly readout: HTMLElement;
  axes!: SVGGElement;
  marks!: SVGGElement;
  labels!: SVGGElement;
  focus!: SVGGElement;
  clipRect!: SVGRectElement;
  selRing!: SVGCircleElement;
  insetAxes!: SVGGElement;
  insetMarks!: SVGGElement;
  insetFocus!: SVGGElement;
  width = 760;
  mode: Mode = 'all';
  selected = DEFAULT_CELL;
  layout!: MainLayout;
  radius = 3.3;
  current: CellCoords[] = [];
  refs: CellRefs[] = [];
  insetL!: InsetLayout;
  insetNow!: InsetCoords;
  insetZero: number | null = null;
  hover: Pair | null = null;
  cursor: Pair | null = null;
  lockedScale: number | null = null;
  keyboard = false;
  morphing = false;
  insetKeyboard = false;
  insetActive = false;
  cancelMain = () => {};
  cancelInset = () => {};

  constructor(readonly root: HTMLElement) {
    this.language = root.dataset.language === 'en' ? 'en' : 'zh';
    this.text = copy[this.language];
    this.id = `lc-live-${instance++}`;
    this.mainWrap = root.querySelector<HTMLElement>('[data-main]')!;
    this.inset = root.querySelector<HTMLElement>('[data-inset]')!;
    this.readout = root.querySelector<HTMLElement>('[data-readout]')!;
    // One live SVG per chart, laid out at the real container width; the narrow
    // static variants only exist for readers without JavaScript.
    for (const node of root.querySelectorAll('.lc-narrow')) node.remove();
    this.svg = this.mainWrap.querySelector<SVGSVGElement>('svg')!;
    this.insetSvg = this.inset.querySelector<SVGSVGElement>('svg')!;
    this.svg.classList.add('is-live');
    this.insetSvg.classList.add('is-live');
    // The static SVGs are images; the live ones are interactive groups with one tab stop each.
    for (const svg of [this.svg, this.insetSvg]) { svg.setAttribute('role', 'group'); svg.setAttribute('tabindex', '0'); }
    const describedBy = this.svg.dataset.describedby;
    if (describedBy) this.svg.setAttribute('aria-describedby', describedBy);
    this.upgradeKeys();
    this.readout.textContent = this.text.staticNote;
    this.width = this.measure();
    this.renderMain();
    this.renderInset();
    this.bind();
    this.reveal();
  }

  measure() { return Math.max(300, Math.round(this.mainWrap.clientWidth || 760)); }

  /** Scale keys render as text without JS; here they become highlight / pin buttons. */
  upgradeKeys() {
    for (const key of this.root.querySelectorAll<HTMLElement>('span[data-scale]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = key.className;
      button.dataset.scale = key.dataset.scale ?? '';
      button.setAttribute('aria-pressed', 'false');
      button.append(...key.childNodes);
      key.replaceWith(button);
    }
  }

  // ------------------------------------------------------------ main chart
  renderMain() {
    this.cancelMain();
    this.morphing = false;
    const layout = mainLayout(this.width, this.mode);
    this.layout = layout;
    this.radius = layout.r;
    this.svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    this.svg.replaceChildren();
    const defs = svgNode('defs');
    const clip = svgNode('clipPath', { id: `${this.id}-wipe` });
    this.clipRect = svgNode('rect', { x: -10, y: -10, width: layout.width + 20, height: layout.height + 20 });
    clip.append(this.clipRect);
    defs.append(clip);
    this.axes = svgNode('g', { class: 'lc-axes' });
    this.axes.innerHTML = mainAxesMarkup(layout, this.language);
    this.marks = svgNode('g', { class: 'lc-marks', 'clip-path': `url(#${this.id}-wipe)` });
    this.marks.innerHTML = mainMarksMarkup(layout, this.selected);
    this.labels = svgNode('g', { class: 'lc-labels' });
    this.labels.style.opacity = '';
    this.labels.innerHTML = mainLabelsMarkup(layout);
    this.focus = svgNode('g', { class: 'lc-focus', 'aria-hidden': 'true' });
    this.selRing = svgNode('circle', { class: 'lc-selected-ring', r: 0, 'aria-hidden': 'true' });
    this.svg.append(defs, this.axes, this.marks, this.labels, this.selRing, this.focus);
    this.refs = [];
    this.current = [];
    for (let index = 0; index < cells.length; index++) {
      const loss = this.marks.querySelector<SVGGElement>(`.lc-loss-marks [data-cell="${index}"]`)!;
      const delta = this.marks.querySelector<SVGGElement>(`.lc-delta-marks [data-cell="${index}"]`)!;
      this.refs[index] = {
        loss, delta,
        basePath: loss.querySelector<SVGPathElement>('.lc-line-base')!, loopPath: loss.querySelector<SVGPathElement>('.lc-line-loop')!,
        deltaPath: delta.querySelector<SVGPathElement>('.lc-line-delta')!,
        baseDots: [...loss.querySelectorAll<SVGCircleElement>('.lc-dot-base')], loopDots: [...loss.querySelectorAll<SVGCircleElement>('.lc-dot-loop')],
        deltaDots: [...delta.querySelectorAll<SVGCircleElement>('.lc-dot-delta')],
      };
      const own = cellCoords(layout, index);
      this.current[index] = own ?? cellCoords(layout, cellIndex(scaleOf(index), Number(this.mode)))!;
    }
    this.placeRing();
  }

  /** A quiet ring on the selected cell's final SMELT point: the cell shown in the training-curve panel. */
  placeRing() {
    if (this.morphing) return;
    const visible = !!panelFor(this.layout, sparsityOf(this.selected));
    const coords = this.current[this.selected];
    if (!visible || !coords) { this.selRing.setAttribute('r', '0'); return; }
    this.selRing.setAttribute('class', `lc-selected-ring lc-s${scaleOf(this.selected)}`);
    this.selRing.setAttribute('cx', f1(coords.loop[2 * FINAL]!));
    this.selRing.setAttribute('cy', f1(coords.loop[2 * FINAL + 1]!));
    this.selRing.setAttribute('r', (this.radius + FINAL_BONUS + 3.6).toFixed(1));
  }

  applyCell(index: number, coords: CellCoords, radius: number) {
    const refs = this.refs[index];
    if (!refs) return;
    refs.basePath.setAttribute('d', pathFromFlat(coords.base));
    refs.loopPath.setAttribute('d', pathFromFlat(coords.loop));
    refs.deltaPath.setAttribute('d', pathFromFlat(coords.delta));
    for (let k = 0; k < HORIZONS; k++) {
      const set = (dot: SVGCircleElement | undefined, flat: number[], r: number) => {
        if (!dot) return;
        dot.setAttribute('cx', f1(flat[2 * k]!));
        dot.setAttribute('cy', f1(flat[2 * k + 1]!));
        dot.setAttribute('r', r.toFixed(2));
      };
      set(refs.baseDots[k], coords.base, dotRadius(radius, k));
      set(refs.loopDots[k], coords.loop, dotRadius(radius, k));
      set(refs.deltaDots[k], coords.delta, deltaRadius(radius, k));
    }
  }

  crossfade(layer: SVGGElement, markup: string) {
    const next = svgNode('g', { class: layer.getAttribute('class') || '' });
    next.innerHTML = markup;
    if (reducedMotion()) { layer.replaceWith(next); return next; }
    next.style.opacity = '0';
    layer.after(next);
    layer.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => { next.style.opacity = ''; }));
    setTimeout(() => layer.remove(), 460);
    return next;
  }

  setMode(mode: Mode) {
    if (mode === this.mode) return;
    this.cancelMain();
    this.morphing = false;
    this.clearHover();
    const oldMode = this.mode;
    const oldLayout = this.layout;
    const next = mainLayout(this.width, mode);
    const single = (value: Mode) => value !== 'all';
    const from = this.current.map(cloneCoords);
    const to: CellCoords[] = [];
    for (let index = 0; index < cells.length; index++) {
      const wasVisible = !!panelFor(oldLayout, sparsityOf(index));
      const visible = !!panelFor(next, sparsityOf(index));
      let target = cellCoords(next, index);
      if (!visible) {
        // Leaving cells morph into their same-scale counterpart when moving between two zoomed levels; otherwise they fade in place.
        target = single(oldMode) && single(mode) ? cellCoords(next, cellIndex(scaleOf(index), Number(mode))) : cloneCoords(from[index]!);
      }
      if (!wasVisible && visible) {
        from[index] = single(oldMode) && single(mode) ? cloneCoords(this.current[cellIndex(scaleOf(index), Number(oldMode))]!) : cloneCoords(target!);
      }
      to[index] = target!;
      this.refs[index]?.loss.classList.toggle('is-hidden', !visible);
      this.refs[index]?.delta.classList.toggle('is-hidden', !visible);
    }
    this.mode = mode;
    this.layout = next;
    this.svg.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`);
    this.axes = this.crossfade(this.axes, mainAxesMarkup(next, this.language));
    this.labels.style.opacity = '0';
    this.selRing.setAttribute('r', '0');
    this.morphing = true;
    const r0 = this.radius; const r1 = next.r;
    this.cancelMain = tween(620, t => {
      const radius = r0 + (r1 - r0) * t;
      this.radius = radius;
      for (let index = 0; index < cells.length; index++) {
        const coords = mixCoords(from[index]!, to[index]!, t);
        this.current[index] = coords; // live positions, so an interrupted morph restarts from where marks are
        this.applyCell(index, coords, radius);
      }
    }, () => {
      this.current = to;
      this.radius = r1;
      this.morphing = false;
      this.labels.innerHTML = mainLabelsMarkup(next);
      this.labels.style.opacity = '';
      this.placeRing();
    });
  }

  visibleCells() { return [...cells.keys()].filter(index => !!panelFor(this.layout, sparsityOf(index))); }

  pointToSvg(event: { clientX: number; clientY: number }, svg: SVGSVGElement, width: number) {
    const box = svg.getBoundingClientRect();
    const scale = width / (box.width || width);
    return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
  }

  nearest(event: PointerEvent | MouseEvent): Pair | null {
    const point = this.pointToSvg(event, this.svg, this.layout.width);
    let best: Pair | null = null;
    let bestDistance = (this.layout.narrow ? 20 : 18) ** 2;
    for (const index of this.visibleCells()) {
      const coords = this.current[index]!;
      for (let k = 0; k < HORIZONS; k++) {
        for (const flat of [coords.base, coords.loop, coords.delta]) {
          const dx = flat[2 * k]! - point.x; const dy = flat[2 * k + 1]! - point.y;
          const distance = dx * dx + dy * dy;
          if (distance < bestDistance) { bestDistance = distance; best = { cell: index, k }; }
        }
      }
    }
    return best;
  }

  drawFocus(pair: Pair) {
    const coords = this.current[pair.cell]!;
    const panel = panelFor(this.layout, sparsityOf(pair.cell));
    if (!panel) return;
    const k = pair.k;
    const bx = coords.base[2 * k]!; const by = coords.base[2 * k + 1]!;
    const lx = coords.loop[2 * k]!; const ly = coords.loop[2 * k + 1]!;
    const dx = coords.delta[2 * k]!; const dy = coords.delta[2 * k + 1]!;
    const zero = panel.d(0);
    const r = dotRadius(this.radius, k) + 3;
    this.focus.setAttribute('class', `lc-focus lc-s${scaleOf(pair.cell)}`);
    this.focus.replaceChildren(
      svgNode('line', { class: 'lc-focus-guide', x1: dx, x2: dx, y1: Math.min(by, ly), y2: zero }),
      svgNode('line', { class: 'lc-focus-link', x1: bx, y1: by, x2: lx, y2: ly }),
      svgNode('circle', { class: 'lc-focus-ring', cx: bx, cy: by, r }),
      svgNode('circle', { class: 'lc-focus-ring', cx: lx, cy: ly, r }),
      svgNode('line', { class: 'lc-focus-drop', x1: dx, x2: dx, y1: zero, y2: dy }),
      svgNode('circle', { class: 'lc-focus-ring', cx: dx, cy: dy, r: deltaRadius(this.radius, k) + 3 }),
    );
  }

  setHover(pair: Pair, anchor: { clientX: number; clientY: number } | Element) {
    const cell = cellAt(pair.cell);
    const same = this.hover && this.hover.cell === pair.cell && this.hover.k === pair.k;
    showTooltip(this.text.pairTip(cell, pair.k), anchor);
    if (same) return;
    this.hover = pair;
    this.root.dataset.hl = String(scaleOf(pair.cell));
    this.drawFocus(pair);
    const delta = cell.loop.loss[pair.k]! - cell.base.loss[pair.k]!;
    const colon = this.language === 'zh' ? '：' : ': ';
    this.readout.setAttribute('aria-live', this.keyboard ? 'polite' : 'off');
    this.readout.innerHTML = `<strong>${cell.scale} · ${sparsityLabel(sparsityOf(pair.cell))}</strong> · ${this.text.horizon(pair.k + 1, cell.horizonTokens[pair.k]!)}${colon}${this.text.base} ${cell.base.loss[pair.k]!.toFixed(4)} · SMELT ${cell.loop.loss[pair.k]!.toFixed(4)} · Δ ${signedFixed(delta)}`;
    this.highlightBranch(pair.cell === this.selected ? pair.k : null);
  }

  clearHover() {
    this.hover = null;
    if (this.lockedScale === null) delete this.root.dataset.hl; else this.root.dataset.hl = String(this.lockedScale);
    this.focus?.replaceChildren();
    hideTooltip();
    this.readout.textContent = this.text.staticNote;
    this.highlightBranch(null);
  }

  // ------------------------------------------------------------ inset
  renderInset() {
    this.cancelInset();
    const cell = cellAt(this.selected);
    const layout = insetLayout(this.width, cell);
    this.insetL = layout;
    this.insetNow = insetCoords(layout, cell);
    this.insetZero = layout.d(0);
    this.insetSvg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    this.insetSvg.replaceChildren();
    this.insetAxes = svgNode('g', { class: 'lc-axes' });
    this.insetAxes.innerHTML = insetAxesMarkup(layout, this.language);
    this.insetMarks = svgNode('g', { class: 'lc-inset-marks' });
    this.insetMarks.innerHTML = insetMarksMarkup(layout, cell, this.id);
    this.insetFocus = svgNode('g', { class: 'lc-focus', 'aria-hidden': 'true' });
    this.insetSvg.append(this.insetAxes, this.insetMarks, this.insetFocus);
    this.updateInsetText();
  }

  updateInsetText() {
    const cell = cellAt(this.selected);
    const s = sparsityLabel(sparsityOf(this.selected));
    this.inset.querySelector('[data-inset-title]')!.textContent = this.text.insetTitle(cell.scale, s);
    this.inset.querySelector('[data-inset-meta]')!.textContent = this.text.insetMeta(cell);
    this.inset.querySelector('[data-inset-readout]')!.innerHTML = this.text.readout(cell);
  }

  applyInset(coords: InsetCoords, zero: number, layout: InsetLayout) {
    const marks = this.insetMarks;
    const ref = (name: string) => marks.querySelector<SVGPathElement>(`[data-ref="${name}"]`);
    ref('base')?.setAttribute('d', pathFromFlat(coords.base));
    ref('loop')?.setAttribute('d', pathFromFlat(coords.loop));
    ref('delta')?.setAttribute('d', pathFromFlat(coords.delta));
    const area = areaFromFlat(coords.delta, zero);
    ref('area-below')?.setAttribute('d', area);
    ref('area-above')?.setAttribute('d', area);
    const below = marks.querySelector('[data-clip="below"]'); const above = marks.querySelector('[data-clip="above"]');
    below?.setAttribute('y', zero.toFixed(2)); below?.setAttribute('height', Math.max(0, layout.dBottom - zero + 2).toFixed(2));
    above?.setAttribute('y', (layout.dTop - 2).toFixed(2)); above?.setAttribute('height', Math.max(0, zero - layout.dTop + 2).toFixed(2));
    for (const branch of marks.querySelectorAll<SVGGElement>('.lc-branch')) {
      const k = Number(branch.dataset.branch);
      const bb = coords.decayBase[k]!; const ll = coords.decayLoop[k]!; const dd = coords.decayDelta[k]!;
      branch.querySelector('.lc-tr-decay-base')?.setAttribute('d', pathFromFlat(bb));
      branch.querySelector('.lc-tr-decay-loop')?.setAttribute('d', pathFromFlat(ll));
      branch.querySelector('.lc-tr-decay-delta')?.setAttribute('d', pathFromFlat(dd));
      const place = (selector: string, flat: number[]) => { const dot = branch.querySelector(selector); dot?.setAttribute('cx', flat.at(-2)!.toFixed(2)); dot?.setAttribute('cy', flat.at(-1)!.toFixed(2)); };
      place('.lc-tr-end-base', bb); place('.lc-tr-end-loop', ll); place('.lc-tr-end-delta', dd);
    }
  }

  /** Mirror the selected cell in the scale / sparsity pickers above the training curves. */
  syncPickers() {
    const press = (selector: string, value: number) => {
      for (const button of this.root.querySelectorAll<HTMLButtonElement>(`${selector} button[data-value]`)) button.setAttribute('aria-pressed', String(Number(button.dataset.value) === value));
    };
    press('[data-pick-scale]', scaleOf(this.selected));
    press('[data-pick-sparsity]', sparsityOf(this.selected));
  }

  /** A picker choice; a zoomed main chart follows it to the new sparsity so the selected ring stays visible. */
  pick(scale: number, sparsity: number) {
    if (this.lockedScale !== null && this.lockedScale !== scale) {
      this.lockedScale = null;
      for (const key of this.root.querySelectorAll<HTMLButtonElement>('button[data-scale]')) key.setAttribute('aria-pressed', 'false');
      if (!this.hover) delete this.root.dataset.hl;
    }
    if (this.mode !== 'all' && Number(this.mode) !== sparsity) {
      this.setMode(String(sparsity) as Mode);
      for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-mode] button[data-value]')) button.setAttribute('aria-pressed', String(button.dataset.value === this.mode));
    }
    this.select(cellIndex(scale, sparsity));
  }

  select(index: number, branch: number | null = null) {
    if (index === this.selected) { this.highlightBranch(branch); return; }
    if (this.insetActive) { this.insetActive = false; this.insetFocus.replaceChildren(); }
    if (!this.hover) {
      this.focus.replaceChildren();
      hideTooltip();
      if (this.lockedScale === null) delete this.root.dataset.hl; else this.root.dataset.hl = String(this.lockedScale);
    }
    this.refs[this.selected]?.loss.classList.remove('is-selected');
    this.refs[this.selected]?.delta.classList.remove('is-selected');
    this.selected = index;
    this.syncPickers();
    this.refs[index]?.loss.classList.add('is-selected');
    this.refs[index]?.delta.classList.add('is-selected');
    this.placeRing();
    this.cancelInset();
    const cell = cellAt(index);
    const oldLayout = this.insetL; const from = this.insetNow;
    const layout = insetLayout(this.width, cell);
    const to = insetCoords(layout, cell);
    this.insetAxes = this.crossfade(this.insetAxes, insetAxesMarkup(layout, this.language));
    this.insetL = layout;
    this.updateInsetText();
    const z0 = this.insetZero ?? oldLayout.d(0); const z1 = layout.d(0);
    this.insetFocus.replaceChildren();
    const carets = this.insetMarks.querySelector<SVGGElement>('[data-ref="carets"]');
    carets?.classList.add('is-out');
    this.cancelInset = tween(620, t => {
      const coords = mixInset(from, to, t);
      this.insetNow = coords;
      this.insetZero = z0 + (z1 - z0) * t;
      this.applyInset(coords, this.insetZero, layout);
    }, () => {
      this.insetNow = to; this.insetZero = z1;
      if (carets) { carets.innerHTML = insetCaretsMarkup(layout, cell); carets.classList.remove('is-out'); }
    });
    this.highlightBranch(branch);
  }

  highlightBranch(k: number | null) {
    if (k === null) delete this.inset.dataset.branch; else this.inset.dataset.branch = String(k);
    for (const branch of this.insetMarks?.querySelectorAll<SVGGElement>('.lc-branch') ?? []) branch.classList.toggle('is-active', Number(branch.dataset.branch) === k);
  }

  insetPointer(event: PointerEvent | MouseEvent) {
    const layout = this.insetL;
    const point = this.pointToSvg(event, this.insetSvg, layout.width);
    const coords = this.insetNow;
    let best: number | null = null; let bestDistance = 16 ** 2;
    for (let k = 0; k < HORIZONS; k++) {
      for (const flat of [coords.decayBase[k]!, coords.decayLoop[k]!, coords.decayDelta[k]!]) {
        const dx = flat.at(-2)! - point.x; const dy = flat.at(-1)! - point.y;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) { bestDistance = distance; best = k; }
      }
    }
    if (best !== null) { this.showBranch(best, event); return; }
    if (point.x < layout.x0 || point.x > layout.x1 || point.y < layout.top - 6 || point.y > layout.dBottom + 6) { this.clearInsetHover(); return; }
    const token = layout.x.domain[0] + (point.x - layout.x0) / (layout.x1 - layout.x0) * (layout.x.domain[1] - layout.x.domain[0]);
    // Snap to the drawn stable points, including the first and last forks where the line starts and ends.
    const points = stablePoints(cellAt(this.selected));
    let at = 0; let gap = Infinity;
    points.forEach((point, i) => { const g = Math.abs(point.token - token); if (g < gap) { gap = g; at = i; } });
    if (gap > 3) { this.clearInsetHover(); return; }
    const { base: b, loop: l } = points[at]!;
    const x = coords.base[2 * at]!;
    this.insetActive = true;
    this.highlightBranch(null);
    this.insetFocus.replaceChildren(
      svgNode('line', { class: 'lc-focus-guide', x1: x, x2: x, y1: layout.top, y2: layout.dBottom }),
      svgNode('circle', { class: 'lc-tr-hover is-base', cx: x, cy: coords.base[2 * at + 1]!, r: 3.4 }),
      svgNode('circle', { class: 'lc-tr-hover is-loop', cx: coords.loop[2 * at]!, cy: coords.loop[2 * at + 1]!, r: 3.4 }),
      svgNode('circle', { class: 'lc-tr-hover is-delta', cx: coords.delta[2 * at]!, cy: Math.min(layout.dBottom, Math.max(layout.dTop, coords.delta[2 * at + 1]!)), r: 3 }),
    );
    showTooltip(this.text.stableTip(points[at]!.token, b, l), event);
  }

  showBranch(k: number, anchor: { clientX: number; clientY: number } | Element) {
    this.insetActive = true;
    this.insetFocus.replaceChildren();
    this.highlightBranch(k);
    showTooltip(this.text.decayTip(cellAt(this.selected), k), anchor);
    if (panelFor(this.layout, sparsityOf(this.selected))) { this.drawFocus({ cell: this.selected, k }); this.root.dataset.hl = String(scaleOf(this.selected)); }
  }

  clearInsetHover() {
    if (!this.insetActive) return;
    this.insetActive = false;
    this.insetFocus.replaceChildren();
    this.highlightBranch(null);
    if (this.hover) return;
    this.focus.replaceChildren();
    if (this.lockedScale === null) delete this.root.dataset.hl; else this.root.dataset.hl = String(this.lockedScale);
    hideTooltip();
  }

  // ------------------------------------------------------------ keyboard cursor
  moveCursor(step: 'left' | 'right' | 'up' | 'down') {
    const visible = this.visibleCells();
    let pair = this.cursor && visible.includes(this.cursor.cell) ? { ...this.cursor } : { cell: visible.includes(this.selected) ? this.selected : visible[0]!, k: HORIZONS - 1 };
    const panels = this.layout.panels.map(panel => panel.s);
    const scale = scaleOf(pair.cell); const sparsity = sparsityOf(pair.cell);
    if (step === 'left' || step === 'right') {
      const k = pair.k + (step === 'right' ? 1 : -1);
      const panel = panels.indexOf(sparsity);
      if (k >= 0 && k < HORIZONS) pair.k = k;
      else if (step === 'right' && panel < panels.length - 1) pair = { cell: cellIndex(scale, panels[panel + 1]!), k: 0 };
      else if (step === 'left' && panel > 0) pair = { cell: cellIndex(scale, panels[panel - 1]!), k: HORIZONS - 1 };
    } else {
      const nextScale = Math.min(3, Math.max(0, scale + (step === 'down' ? 1 : -1)));
      pair.cell = cellIndex(nextScale, sparsity);
    }
    this.cursor = pair;
    this.focusPair(pair);
  }

  focusPair(pair: Pair) {
    const refs = this.refs[pair.cell];
    this.setHover(pair, refs?.loopDots[pair.k] ?? this.svg);
  }

  // ------------------------------------------------------------ wiring
  bind() {
    const seg = this.root.querySelector('[data-mode]');
    if (seg) bindSegmented(seg, value => {
      const mode = (['all', '0', '1', '2', '3'].includes(value) ? value : 'all') as Mode;
      this.setMode(mode);
      if (mode !== 'all' && sparsityOf(this.selected) !== Number(mode)) this.select(cellIndex(scaleOf(this.selected), Number(mode)));
    });
    const pickScale = this.root.querySelector('[data-pick-scale]');
    const pickSparsity = this.root.querySelector('[data-pick-sparsity]');
    if (pickScale) bindSegmented(pickScale, value => this.pick(Number(value), sparsityOf(this.selected)));
    if (pickSparsity) bindSegmented(pickSparsity, value => this.pick(scaleOf(this.selected), Number(value)));

    for (const key of this.root.querySelectorAll<HTMLButtonElement>('[data-scale]')) {
      const scale = Number(key.dataset.scale);
      const enter = () => { if (!this.hover) this.root.dataset.hl = String(scale); };
      const leave = () => { if (!this.hover) { if (this.lockedScale === null) delete this.root.dataset.hl; else this.root.dataset.hl = String(this.lockedScale); } };
      key.addEventListener('pointerenter', enter);
      key.addEventListener('focus', enter);
      key.addEventListener('pointerleave', leave);
      key.addEventListener('blur', leave);
      key.addEventListener('click', () => {
        this.lockedScale = this.lockedScale === scale ? null : scale;
        for (const other of this.root.querySelectorAll<HTMLButtonElement>('[data-scale]')) other.setAttribute('aria-pressed', String(Number(other.dataset.scale) === this.lockedScale));
        leave();
        if (this.lockedScale !== null) this.root.dataset.hl = String(this.lockedScale);
      });
    }

    this.svg.addEventListener('pointermove', event => {
      this.keyboard = false;
      const pair = this.nearest(event);
      if (pair) this.setHover(pair, event); else if (this.hover) this.clearHover();
    });
    this.svg.addEventListener('pointerleave', () => { if (!this.keyboard) this.clearHover(); });
    this.svg.addEventListener('click', event => {
      const pair = this.nearest(event);
      if (!pair) return;
      this.setHover(pair, event);
      this.select(pair.cell, pair.k);
    });
    this.svg.addEventListener('focus', () => {
      if (!this.svg.matches(':focus-visible')) return;
      this.keyboard = true;
      this.moveCursor('left'); this.moveCursor('right');
    });
    this.svg.addEventListener('blur', () => { this.cursor = null; this.clearHover(); });
    this.svg.addEventListener('keydown', event => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      const step = map[event.key];
      if (step) { event.preventDefault(); this.keyboard = true; this.moveCursor(step); return; }
      if ((event.key === 'Enter' || event.key === ' ') && this.cursor) { event.preventDefault(); this.select(this.cursor.cell, this.cursor.k); this.focusPair(this.cursor); }
      if (event.key === 'Escape') { this.clearHover(); }
    });

    this.insetSvg.addEventListener('pointermove', event => { this.insetKeyboard = false; this.insetPointer(event); });
    this.insetSvg.addEventListener('click', event => this.insetPointer(event));
    this.insetSvg.addEventListener('pointerleave', () => { if (!this.insetKeyboard) this.clearInsetHover(); });
    let branchCursor = HORIZONS - 1;
    const showCursor = () => {
      const dot = this.insetMarks.querySelector(`[data-branch="${branchCursor}"] .lc-tr-end-loop`);
      this.showBranch(branchCursor, dot ?? this.insetSvg);
    };
    this.insetSvg.addEventListener('focus', () => { if (this.insetSvg.matches(':focus-visible')) { this.insetKeyboard = true; showCursor(); } });
    this.insetSvg.addEventListener('blur', () => this.clearInsetHover());
    this.insetSvg.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.insetKeyboard = true;
        branchCursor = Math.min(HORIZONS - 1, Math.max(0, branchCursor + (event.key === 'ArrowRight' ? 1 : -1)));
        showCursor();
      }
      if (event.key === 'Escape') this.clearInsetHover();
    });

    // Touch: a tap elsewhere dismisses the pinned tooltip.
    document.addEventListener('pointerdown', event => {
      const target = event.target as Node | null;
      if (target && !this.svg.contains(target) && this.hover) this.clearHover();
      if (target && !this.insetSvg.contains(target)) this.clearInsetHover();
    });

    let frame = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = this.measure();
        if (Math.abs(width - this.width) < 1) return;
        this.width = width;
        this.clearHover();
        this.renderMain();
        this.renderInset();
      });
    }).observe(this.mainWrap);
  }

  reveal() {
    const stats = this.root.querySelector<HTMLElement>('[data-stats]');
    armReveal(this.root);
    if (this.mainWrap.dataset.reveal === 'armed') {
      this.clipRect.setAttribute('width', '0');
      this.mainWrap.addEventListener('smelt:reveal', () => {
        const full = this.layout.width + 20;
        tween(1300, t => this.clipRect.setAttribute('width', (full * t).toFixed(1)));
      }, { once: true });
    }
    if (stats && stats.dataset.reveal === 'armed') {
      stats.addEventListener('smelt:reveal', () => {
        for (const value of stats.querySelectorAll<HTMLElement>('[data-count]')) {
          const target = Number(value.dataset.count);
          const suffix = value.dataset.suffix ?? '';
          countUp(value, target, v => `${Math.round(v)}${suffix}`, 900);
        }
      }, { once: true });
    }
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-loss-compute]')) {
  if (root.dataset.ready) continue;
  root.dataset.ready = 'true';
  new LossCompute(root);
}
