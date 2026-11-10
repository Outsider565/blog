// Figure 15 (residual-flow): scale / metric switching with tweened bars, layer
// focus linked to the angle glyph, and a reveal animation in which the visit-2
// vector swings away from visit 1 and grows to its measured length.
import { armReveal, bindSegmented, hideTooltip, reducedMotion, showTooltip, tween } from './kit';
import { barLayout, copy, fanShapes, fmtRatio, glyph, glyphGeometry, glyphShapes, layerValues, scales, subtitle, summary, type Metric, type Size, type Variant } from '../../lib/smelt/residual-flow';
import { lerp } from '../../lib/smelt/plot';

const svgNamespace = 'http://www.w3.org/2000/svg';
function node<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>, content?: string) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (content !== undefined) element.textContent = content;
  return element;
}

for (const root of document.querySelectorAll<HTMLElement>('[data-residual-flow]')) {
  const text = copy[root.dataset.language === 'en' ? 'en' : 'zh'];
  let size = (root.dataset.size ?? '1.6B') as Size;
  let metric = (root.dataset.metric ?? 'update') as Metric;
  let pinned: number | null = null;
  let hovered: number | null = null;
  const charts = [...root.querySelectorAll<SVGSVGElement>('[data-rf-bars]')];
  const sub = root.querySelector<HTMLElement>('[data-rf-sub]')!;
  const glyphSvg = root.querySelector<SVGSVGElement>('[data-rf-glyph]')!;
  const glyphReadout = root.querySelector<HTMLElement>('[data-rf-glyph-readout]')!;
  const stat = (name: string) => root.querySelector<HTMLElement>(`[data-rf-stat="${name}"]`)!;
  const cosLabel = root.querySelector<HTMLElement>('[data-rf-stat-label="cos"]')!;
  const part = <T extends SVGElement>(name: string) => glyphSvg.querySelector<T>(`[data-rf-${name}]`)!;
  const glyphParts = {
    arc: part<SVGPathElement>('arc'), arcLabel: part<SVGTextElement>('arc-label'), drop: part<SVGLineElement>('drop'), square: part<SVGPathElement>('square'),
    v1: part<SVGLineElement>('v1'), v1Head: part<SVGPathElement>('v1-head'), v2: part<SVGLineElement>('v2'), v2Head: part<SVGPathElement>('v2-head'),
    v1Label: part<SVGTextElement>('v1-label'), v2Label: part<SVGTextElement>('v2-label'),
  };

  // ---- Bars ----
  const layouts = new Map<SVGSVGElement, ReturnType<typeof barLayout>>();
  const cancels = new Map<SVGSVGElement, () => void>();

  function tipFor(index: number) {
    const value = scales[size];
    const pair = (series: 'attn' | 'moe') => [value.v1[series][index] ?? 0, value.v2[series][index] ?? 0] as [number, number];
    return text.tip(size, value.layers[index] ?? 0, metric, value.v1[metric][index] ?? 0, value.v2[metric][index] ?? 0, pair('attn'), pair('moe'), value.cos?.[index]);
  }

  function bindLayer(group: SVGGElement) {
    const index = Number(group.dataset.index);
    group.setAttribute('tabindex', '0');
    group.addEventListener('pointerenter', () => { hovered = index; refreshFocus(); });
    group.addEventListener('pointermove', event => showTooltip(group.dataset.tip ?? '', event));
    group.addEventListener('pointerleave', () => { hideTooltip(); if (hovered === index) { hovered = null; refreshFocus(); } });
    group.addEventListener('focus', () => { showTooltip(group.dataset.tip ?? '', group); hovered = index; refreshFocus(); });
    group.addEventListener('blur', () => { hideTooltip(); if (hovered === index) { hovered = null; refreshFocus(); } });
    group.addEventListener('click', () => { pinned = pinned === index ? null : index; refreshFocus(); });
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pinned = pinned === index ? null : index; refreshFocus(); }
    });
  }

  function ticksOf(svg: SVGSVGElement, layout: ReturnType<typeof barLayout>) {
    const { box } = layout;
    svg.querySelector('[data-rf-ticks]')!.replaceChildren(...layout.ticks.map(tick => {
      const group = node('g', {});
      group.append(node('line', { class: 'grid', x1: box.left, x2: box.width - box.right, y1: tick.y, y2: tick.y }), node('text', { x: box.left - 7, y: tick.y + 4.5, 'text-anchor': 'end' }, tick.label));
      return group;
    }));
  }

  function rebuild(svg: SVGSVGElement, layout: ReturnType<typeof barLayout>, animate: boolean) {
    const { box } = layout;
    const stripNodes: SVGElement[] = [node('text', { class: 'rf-strip-title', x: box.left, y: box.stripTop - 12 }, text.strip)];
    for (const tick of layout.cosTicks) {
      const group = node('g', {});
      group.append(node('line', { class: 'grid', x1: box.left, x2: box.width - box.right, y1: tick.y, y2: tick.y }), node('text', { x: box.left - 7, y: tick.y + 4.5, 'text-anchor': 'end' }, tick.label));
      stripNodes.push(group);
    }
    if (layout.cosPath) {
      const path = node('path', { class: 'rf-cos-line', pathLength: 1, d: layout.cosPath });
      if (animate && !reducedMotion()) {
        path.style.strokeDasharray = '1';
        path.style.strokeDashoffset = '1';
        requestAnimationFrame(() => requestAnimationFrame(() => { path.style.transition = 'stroke-dashoffset 900ms var(--smelt-ease)'; path.style.strokeDashoffset = '0'; }));
      }
      stripNodes.push(path);
    } else {
      stripNodes.push(
        node('line', { class: 'rf-cos-mean', x1: box.left, x2: box.width - box.right, y1: layout.cosMean.y, y2: layout.cosMean.y }),
        node('text', { class: 'rf-strip-note', x: box.width - box.right, y: box.stripTop - 12, 'text-anchor': 'end' }, text.stripMean(layout.cosMean.value)),
      );
    }
    svg.querySelector('[data-rf-strip]')!.replaceChildren(...stripNodes);
    const groups = layout.layers.map(layer => {
      const group = node('g', { class: 'rf-layer', 'data-index': layer.index, role: 'button', 'aria-pressed': 'false' });
      const tip = tipFor(layer.index);
      group.dataset.tip = tip;
      group.setAttribute('aria-label', tip.replaceAll('\n', '; '));
      group.append(
        node('rect', { class: 'rf-col', x: layer.center - layout.band / 2, y: box.top - 10, width: layout.band, height: layout.baseline - box.top + 10 }),
        node('rect', { class: 'hit', x: layer.center - layout.band / 2, y: box.top - 10, width: layout.band, height: box.stripBottom - box.top + 14 }),
        node('rect', { class: 'rf-bar is-v1', x: layer.first.x, y: layout.baseline, width: layout.barWidth, height: 0 }),
        node('rect', { class: 'rf-bar is-v2', x: layer.second.x, y: layout.baseline, width: layout.barWidth, height: 0 }),
      );
      if (layer.label) group.append(node('text', { class: 'rf-tick', x: layer.center, y: box.labelY, 'text-anchor': 'middle' }, layer.label));
      if (layer.cos) group.append(node('circle', { class: 'rf-cos-dot', cx: layer.center, cy: layer.cos.y, r: 3.2 }));
      bindLayer(group);
      return group;
    });
    svg.querySelector('[data-rf-layers]')!.replaceChildren(...groups);
  }

  function drawBars(animate: boolean) {
    for (const svg of charts) {
      const variant = svg.dataset.rfBars as Variant;
      const previous = layouts.get(svg);
      const next = barLayout(size, metric, variant);
      const sameShape = previous && previous.layers.length === next.layers.length;
      ticksOf(svg, next);
      if (!sameShape) rebuild(svg, next, animate);
      const groups = [...svg.querySelectorAll<SVGGElement>('.rf-layer')];
      groups.forEach((group, index) => { const tip = tipFor(index); group.dataset.tip = tip; group.setAttribute('aria-label', tip.replaceAll('\n', '; ')); });
      const rects = groups.map(group => [...group.querySelectorAll<SVGRectElement>('.rf-bar')] as SVGRectElement[]);
      const from = rects.map(([first, second]) => [Number(first?.getAttribute('y') ?? next.baseline), Number(second?.getAttribute('y') ?? next.baseline)] as const);
      cancels.get(svg)?.();
      const count = Math.max(1, next.layers.length);
      const duration = animate ? 620 : 0;
      cancels.set(svg, tween(duration + (sameShape ? 0 : count * 22), progress => {
        next.layers.forEach((layer, index) => {
          const [first, second] = rects[index] ?? [];
          const start = from[index] ?? [next.baseline, next.baseline];
          // Stagger the grow-in left to right when the bars are new.
          const local = sameShape ? progress : Math.min(1, Math.max(0, (progress * (duration + count * 22) - index * 22) / Math.max(1, duration)));
          const eased = sameShape ? local : 1 - (1 - local) ** 3;
          const firstY = lerp(start[0], layer.first.y, eased);
          const secondY = lerp(start[1], layer.second.y, eased);
          first?.setAttribute('y', firstY.toFixed(2));
          first?.setAttribute('height', Math.max(0, next.baseline - firstY).toFixed(2));
          second?.setAttribute('y', secondY.toFixed(2));
          second?.setAttribute('height', Math.max(0, next.baseline - secondY).toFixed(2));
        });
      }));
      layouts.set(svg, next);
    }
  }

  // ---- Glyph ----
  const initial = layerValues(size, metric, null);
  let painted = { ...glyphGeometry(size, metric, initial), cos: initial.cos };
  let cancelGlyph = () => {};
  function paintGlyph(theta: number, first: number, second: number, cos: number) {
    painted = { theta, first, second, cos };
    const shapes = glyphShapes(theta, first, second, cos.toFixed(2));
    const set = (element: SVGElement, attributes: Record<string, number | string>) => { for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, typeof value === 'number' ? value.toFixed(2) : value); };
    set(glyphParts.v1, { x2: shapes.first.x2, y2: shapes.first.y2 });
    set(glyphParts.v1Head, { d: shapes.first.head });
    set(glyphParts.v2, { x2: shapes.second.x2, y2: shapes.second.y2 });
    set(glyphParts.v2Head, { d: shapes.second.head });
    set(glyphParts.arc, { d: shapes.arc });
    set(glyphParts.arcLabel, { x: shapes.arcLabel.x, y: shapes.arcLabel.y });
    glyphParts.arcLabel.textContent = cos.toFixed(2);
    set(glyphParts.drop, { x1: shapes.drop.x1, y1: shapes.drop.y1, x2: shapes.drop.x2, y2: shapes.drop.y2 });
    set(glyphParts.square, { d: shapes.square });
    set(glyphParts.v1Label, { x: shapes.firstLabel.x, y: shapes.firstLabel.y });
    set(glyphParts.v2Label, { x: shapes.secondLabel.x, y: shapes.secondLabel.y });
  }

  function setGlyph(animate: boolean, fromZero = false) {
    const index = hovered ?? pinned;
    const values = layerValues(size, metric, index);
    const target = glyphGeometry(size, metric, values);
    const start = fromZero ? { theta: 0, first: target.first, second: target.first, cos: 1 } : { ...painted };
    cancelGlyph();
    cancelGlyph = tween(animate ? (fromZero ? 1100 : 420) : 0, progress => {
      const theta = lerp(start.theta, target.theta, progress);
      paintGlyph(theta, lerp(start.first, target.first, progress), lerp(start.second, target.second, progress), fromZero ? Math.cos(theta) : lerp(start.cos, values.cos, progress));
    });
    const label = values.layer === null ? text.blockAverage : text.layer(values.layer);
    glyphReadout.innerHTML = text.glyphReadout(label, values.second / values.first, values.cos);
    glyphSvg.setAttribute('aria-label', `${text.glyphTitle}: ${label}, cos ${values.cos.toFixed(2)}`);
  }

  const fan = glyphSvg.querySelector<SVGGElement>('[data-rf-fan]')!;
  function drawFan() {
    fan.replaceChildren(...fanShapes(size, metric).map(ray => node('line', { x1: glyph.ox, y1: glyph.oy, x2: ray.x2.toFixed(2), y2: ray.y2.toFixed(2), 'data-index': ray.index })));
  }

  function refreshFocus() {
    const active = hovered ?? pinned;
    for (const svg of charts) {
      svg.toggleAttribute('data-focus', active !== null);
      for (const group of svg.querySelectorAll<SVGGElement>('.rf-layer')) {
        const index = Number(group.dataset.index);
        group.toggleAttribute('data-active', index === active);
        group.toggleAttribute('data-pinned', index === pinned);
        group.setAttribute('aria-pressed', String(index === pinned));
      }
    }
    for (const ray of fan.querySelectorAll<SVGLineElement>('line')) ray.toggleAttribute('data-active', Number(ray.dataset.index) === active);
    setGlyph(true);
  }

  // ---- Stats ----
  let shown = summary(size, metric);
  let cancelStats = () => {};
  function setStats(animate: boolean) {
    const next = summary(size, metric);
    const previous = shown;
    cancelStats();
    cancelStats = tween(animate ? 520 : 0, progress => {
      stat('ratio').textContent = fmtRatio(lerp(previous.ratio, next.ratio, progress));
      stat('cos').textContent = lerp(previous.cos, next.cos, progress).toFixed(2);
    });
    stat('larger').textContent = text.statLarger(next.larger, next.total);
    cosLabel.textContent = text.statCosLabel(next.cos);
    shown = next;
  }

  function update(animate: boolean) {
    root.dataset.size = size;
    root.dataset.metric = metric;
    sub.innerHTML = subtitle(text, metric);
    drawBars(animate);
    drawFan();
    refreshFocus();
    setStats(animate);
  }

  for (const svg of charts) {
    layouts.set(svg, barLayout(size, metric, svg.dataset.rfBars as Variant));
    for (const group of svg.querySelectorAll<SVGGElement>('.rf-layer')) bindLayer(group);
  }
  bindSegmented(root.querySelector('[data-rf-size]')!, value => { size = value as Size; pinned = null; hovered = null; update(true); });
  bindSegmented(root.querySelector('[data-rf-metric]')!, value => { metric = value as Metric; update(true); });

  armReveal(root);
  const main = root.querySelector<HTMLElement>('.rf-main')!;
  if (main.dataset.reveal === 'armed' && !reducedMotion()) {
    paintGlyph(0, painted.first, painted.first, 1);
    main.addEventListener('smelt:reveal', () => setGlyph(true, true), { once: true });
  }
}
