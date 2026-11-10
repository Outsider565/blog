// DownstreamPairs: ledger counter, metric / scope / sparsity filters, tweened
// re-scaling of the four per-scale panels and linked hover between ledger and chart.
import { armReveal, bindSegmented, hideTooltip, reducedMotion, showTooltip, svgNode, tween } from './kit';
import { lerp, linePath, type Point } from '../../lib/smelt/plot';
import {
  announcement, bar, chance, counted, inSparsity, metricText, pairGeometry, pairTip, pairs, plotBox, sizes, sparsities, steps, summary, tally,
  winLabel, wins, yAxis, type MetricKey, type PairGeometry, type Scope, type Sparsity,
} from '../../lib/smelt/downstream-pairs';
import type { Language } from '../../lib/site';

interface Marks { link: SVGLineElement; base: SVGCircleElement; loop: SVGCircleElement; hit: SVGGElement; rect: SVGRectElement; cell: HTMLElement }

function init(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = 'true';
  const language = (root.dataset.language === 'en' ? 'en' : 'zh') as Language;
  const state = { metric: (root.dataset.metric || 'core') as MetricKey, scope: 'bar' as Scope, sparsity: 'all' as Sparsity };
  const pick = <T extends Element>(selector: string) => root.querySelector<T>(selector);

  const marks: Marks[] = pairs.map(pair => ({
    link: pick<SVGLineElement>(`[data-dp-link="${pair.index}"]`)!,
    base: pick<SVGCircleElement>(`[data-dp-base="${pair.index}"]`)!,
    loop: pick<SVGCircleElement>(`[data-dp-loop="${pair.index}"]`)!,
    hit: pick<SVGGElement>(`[data-dp-hit="${pair.index}"]`)!,
    rect: pick<SVGRectElement>(`[data-dp-hit="${pair.index}"] rect`)!,
    cell: pick<HTMLElement>(`[data-dp-cell="${pair.index}"]`)!,
  }));
  if (marks.some(mark => !mark.link || !mark.base || !mark.loop || !mark.hit || !mark.rect || !mark.cell)) return;
  const panels = new Map(sizes.map(size => [size, pick<SVGSVGElement>(`[data-dp-panel="${size}"]`)!]));
  const trails = new Map([...root.querySelectorAll<SVGPathElement>('[data-dp-trail]')].map(path => [path.dataset.dpTrail!, path]));
  const won = pick<HTMLElement>('[data-dp-won]')!;
  const totalNode = pick<HTMLElement>('[data-dp-total]')!;
  const winText = pick<HTMLElement>('[data-dp-win-label]')!;
  const readout = pick<HTMLElement>('[data-dp-readout]')!;
  const axisText = pick<HTMLElement>('[data-dp-axis]')!;
  const betterText = pick<HTMLElement>('[data-dp-better]')!;
  const live = pick<HTMLElement>('[data-dp-live]');

  // Current pixel geometry of every pair, read from the server-rendered SVG.
  let current: PairGeometry[] = marks.map(mark => ({
    xb: Number(mark.base.getAttribute('cx')), yb: Number(mark.base.getAttribute('cy')),
    xl: Number(mark.loop.getAttribute('cx')), yl: Number(mark.loop.getAttribute('cy')),
  }));
  let cancel = () => {};
  let cancelCount = () => {};

  const place = (geometry: PairGeometry[]) => {
    for (const pair of pairs) {
      const g = geometry[pair.index]!;
      const mark = marks[pair.index]!;
      mark.link.setAttribute('x1', g.xb.toFixed(2)); mark.link.setAttribute('y1', g.yb.toFixed(2));
      mark.link.setAttribute('x2', g.xl.toFixed(2)); mark.link.setAttribute('y2', g.yl.toFixed(2));
      mark.base.setAttribute('cx', g.xb.toFixed(2)); mark.base.setAttribute('cy', g.yb.toFixed(2));
      mark.loop.setAttribute('cx', g.xl.toFixed(2)); mark.loop.setAttribute('cy', g.yl.toFixed(2));
    }
    for (const size of sizes) for (const item of sparsities) for (const arch of [0, 1] as const) {
      const path = trails.get(`${size}|${item.es}|${arch}`);
      if (!path) continue;
      const points = pairs.filter(pair => pair.size === size && pair.es === item.es).map(pair => { const g = geometry[pair.index]!; return (arch ? [g.xl, g.yl] : [g.xb, g.yb]) as Point; });
      path.setAttribute('d', linePath(points));
    }
  };
  const placeHits = (geometry: PairGeometry[]) => {
    for (const pair of pairs) {
      const g = geometry[pair.index]!;
      const rect = marks[pair.index]!.rect;
      rect.setAttribute('x', (Math.min(g.xb, g.xl) - 6).toFixed(2));
      rect.setAttribute('y', (Math.min(g.yb, g.yl) - 6).toFixed(2));
      rect.setAttribute('width', (Math.abs(g.xb - g.xl) + 12).toFixed(2));
      rect.setAttribute('height', (Math.abs(g.yb - g.yl) + 12).toFixed(2));
    }
  };

  const setTicks = (size: string, axis: ReturnType<typeof yAxis>, animate: boolean) => {
    const svg = panels.get(size);
    const group = svg?.querySelector<SVGGElement>('[data-dp-yticks]');
    if (!svg || !group) return;
    const old = [...group.children] as SVGGElement[];
    const fresh = axis.ticks.map(tick => {
      const y = axis.scale(tick.value);
      const node = svgNode('g', { class: animate ? 'dp-tick is-entering' : 'dp-tick' });
      node.append(svgNode('line', { class: 'grid', x1: plotBox.x0, x2: plotBox.x1, y1: y.toFixed(2), y2: y.toFixed(2) }));
      node.append(svgNode('text', { x: plotBox.x0 - 5, y: (y + 4.5).toFixed(2), 'text-anchor': 'end' }, tick.label));
      return node;
    });
    group.append(...fresh);
    if (!animate) { old.forEach(node => node.remove()); return; }
    requestAnimationFrame(() => {
      for (const node of fresh) node.classList.remove('is-entering');
      for (const node of old) node.classList.add('is-leaving');
    });
    setTimeout(() => old.forEach(node => node.remove()), 320);
    // References (MMLU chance and counting bar) follow the new scale.
    for (const [selector, value] of [['[data-dp-chance]', chance * 100], ['[data-dp-bar]', bar * 100]] as const) {
      const line = svg.querySelector<SVGLineElement>(selector);
      if (!line) continue;
      const y = axis.scale(value);
      line.setAttribute('y1', y.toFixed(2)); line.setAttribute('y2', y.toFixed(2));
      line.classList.toggle('is-out', y < plotBox.y0 - 1 || y > plotBox.y1 + 1);
    }
  };

  // Count from whatever is on screen to the new total. The previous tween is
  // cancelled first and the last frame writes the exact target, so quick
  // clicks can never leave a stale number behind. The spoken summary is set
  // once, when the count settles (the visible digits change every frame).
  const countTo = (target: number, total: number, spoken: string) => {
    totalNode.textContent = String(total);
    const from = Number(won.textContent) || 0;
    cancelCount();
    cancelCount = tween(Math.min(600, 120 + Math.abs(target - from) * 12), progress => { won.textContent = String(Math.round(lerp(from, target, progress))); }, () => {
      won.textContent = String(target);
      if (live) live.textContent = spoken;
    });
  };

  const update = (animate = true) => {
    goLive();
    const { metric, scope, sparsity } = state;
    const info = metricText(metric, language);
    const axes = new Map(sizes.map(size => [size, yAxis(metric, sparsity, size)]));
    const target = pairs.map(pair => pairGeometry(pair, metric, axes.get(pair.size)!.scale));
    for (const pair of pairs) {
      const mark = marks[pair.index]!;
      const visible = inSparsity(pair, sparsity);
      const status = !counted(pair, metric, scope) ? 'is-excluded' : wins(pair, metric) ? 'is-win' : 'is-loss';
      for (const node of [mark.link, mark.cell]) {
        node.classList.remove('is-win', 'is-loss', 'is-excluded');
        node.classList.add(status);
      }
      mark.base.classList.toggle('is-excluded', status === 'is-excluded');
      mark.loop.classList.toggle('is-excluded', status === 'is-excluded');
      for (const node of [mark.link, mark.base, mark.loop, mark.hit, mark.cell]) node.classList.toggle('is-off', !visible);
      const tip = pairTip(pair, metric, scope, language);
      mark.hit.dataset.tip = tip;
      mark.hit.setAttribute('aria-label', tip.replaceAll('\n', '; '));
    }
    for (const [key, path] of trails) {
      const es = key.split('|')[1];
      path.classList.toggle('is-off', sparsity !== 'all' && es !== sparsity);
      path.classList.toggle('is-on', sparsity !== 'all' && es === sparsity);
    }
    for (const size of sizes) {
      setTicks(size, axes.get(size)!, animate);
      const own = tally(metric, scope, sparsity, size);
      const panelCount = pick<SVGTextElement>(`[data-dp-panel-count="${size}"]`);
      const ledgerCount = pick<HTMLElement>(`[data-dp-size-count="${size}"]`);
      if (panelCount) panelCount.textContent = `${own.won} / ${own.total}`;
      if (ledgerCount) ledgerCount.textContent = `${own.won}/${own.total}`;
    }
    const all = tally(metric, scope, sparsity);
    countTo(all.won, all.total, announcement(metric, scope, sparsity, language));
    winText.textContent = winLabel(metric, scope, language);
    readout.textContent = summary(metric, scope, sparsity, language);
    axisText.textContent = info.axis;
    betterText.textContent = info.better;
    root.dataset.metric = metric;
    const excludedLegend = pick<HTMLElement>('[data-dp-excluded-legend]');
    if (excludedLegend) excludedLegend.hidden = scope === 'all';
    const excludedKey = pick<HTMLElement>('[data-dp-excluded-key]');
    if (excludedKey) excludedKey.hidden = scope === 'all';
    for (const size of sizes) rove(size, null);

    cancel();
    const from = current;
    placeHits(target);
    if (!animate || reducedMotion()) { place(target); current = target; return; }
    cancel = tween(560, progress => {
      const frame = from.map((g, index) => {
        const t = target[index]!;
        return { xb: lerp(g.xb, t.xb, progress), yb: lerp(g.yb, t.yb, progress), xl: lerp(g.xl, t.xl, progress), yl: lerp(g.yl, t.yl, progress) };
      });
      place(frame);
      current = frame;
    }, () => { current = target; });
  };

  // After the entrance animation, drop the reveal classes so state changes use
  // this figure's own short transitions instead of the staggered reveal ones.
  const revealClasses = ['reveal-pop', 'reveal-draw', 'reveal-fade'];
  const strip = (scope: ParentNode) => { for (const node of scope.querySelectorAll(revealClasses.map(name => `.${name}`).join(','))) node.classList.remove(...revealClasses); };
  let isLive = false;
  function goLive() {
    if (isLive) return;
    isLive = true;
    strip(root);
    root.classList.add('is-live');
  }
  root.addEventListener('smelt:reveal', event => {
    const target = event.target as HTMLElement;
    setTimeout(() => {
      strip(target);
      if (!root.querySelector('[data-reveal="armed"]')) goLive();
    }, 2300);
  });

  // Ledger counter: count wins in step with the cells as they pop in.
  const ledger = pick<HTMLElement>('[data-dp-ledger]');
  ledger?.addEventListener('smelt:reveal', () => {
    if (reducedMotion() || isLive) return;
    const order = pairs.map(pair => ({ pair, i: Number(marks[pair.index]!.cell.style.getPropertyValue('--i')) })).sort((a, b) => a.i - b.i);
    const start = performance.now();
    won.textContent = '0';
    const tick = (now: number) => {
      if (isLive) return;
      const elapsed = now - start - 260;
      const shown = Math.max(0, Math.min(order.length, Math.floor(elapsed / 11) + 1));
      const count = order.slice(0, shown).filter(({ pair }) => counted(pair, state.metric, state.scope) && wins(pair, state.metric)).length;
      won.textContent = String(count);
      if (shown < order.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // Controls.
  const metricGroup = pick('[data-dp-metric]');
  if (metricGroup) bindSegmented(metricGroup, value => { state.metric = value === 'comp' ? 'comp' : 'core'; update(); });
  const scopeGroup = pick('[data-dp-scope]');
  if (scopeGroup) bindSegmented(scopeGroup, value => { state.scope = value === 'all' ? 'all' : 'bar'; update(); });
  const sparsityGroup = pick('[data-dp-sparsity]');
  if (sparsityGroup) bindSegmented(sparsityGroup, value => { state.sparsity = (value === 'all' ? 'all' : value) as Sparsity; update(); });

  // Linked highlighting between a chart pair and its ledger cell.
  const highlight = (index: number | null) => {
    for (const svg of panels.values()) svg.classList.remove('has-hot');
    for (const node of root.querySelectorAll('.is-hot')) node.classList.remove('is-hot');
    if (index === null) return;
    const pair = pairs[index];
    const mark = marks[index];
    if (!pair || !mark) return;
    panels.get(pair.size)?.classList.add('has-hot');
    for (const node of [mark.link, mark.base, mark.loop, mark.cell]) node.classList.add('is-hot');
  };
  // Keyboard: one Tab stop per panel (roving tabindex). Left / Right step
  // through decay branches, Up / Down through sparsities, Home / End jump to
  // the first or last branch.
  const stop = new Map<string, number>();
  const visibleIn = (size: string) => pairs.filter(pair => pair.size === size && inSparsity(pair, state.sparsity));
  function rove(size: string, index: number | null, focus = false) {
    const pool = visibleIn(size);
    const chosen = index !== null && pool.some(pair => pair.index === index) ? index
      : pool.some(pair => pair.index === stop.get(size)) ? stop.get(size)! : pool[0]?.index;
    for (const pair of pairs) if (pair.size === size) marks[pair.index]!.hit.setAttribute('tabindex', pair.index === chosen ? '0' : '-1');
    if (chosen === undefined) return;
    stop.set(size, chosen);
    if (focus) marks[chosen]!.hit.focus();
  }
  for (const size of sizes) rove(size, null);
  const esOrder = sparsities.map(item => item.es);
  const neighbour = (index: number, key: string) => {
    const pair = pairs[index]!;
    const pool = visibleIn(pair.size);
    const at = (es: number, step: number) => pool.find(other => other.es === es && other.step === step)?.index;
    const stepAt = steps.indexOf(pair.step);
    const esAt = esOrder.indexOf(pair.es);
    if (key === 'ArrowRight') return at(pair.es, steps[Math.min(steps.length - 1, stepAt + 1)]!);
    if (key === 'ArrowLeft') return at(pair.es, steps[Math.max(0, stepAt - 1)]!);
    if (key === 'Home') return at(pair.es, steps[0]!);
    if (key === 'End') return at(pair.es, steps[steps.length - 1]!);
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      const direction = key === 'ArrowDown' ? 1 : -1;
      for (let next = esAt + direction; next >= 0 && next < esOrder.length; next += direction) {
        const found = at(esOrder[next]!, pair.step);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };

  for (const pair of pairs) {
    const mark = marks[pair.index]!;
    const enter = (anchor: PointerEvent | Element) => { highlight(pair.index); showTooltip(mark.hit.dataset.tip || '', anchor); };
    const leave = () => { highlight(null); hideTooltip(); };
    mark.hit.addEventListener('pointermove', event => enter(event));
    // A tap focuses the pair; keep its tooltip until focus moves elsewhere.
    mark.hit.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') leave(); });
    mark.hit.addEventListener('focus', () => { rove(pair.size, pair.index); enter(mark.hit); });
    mark.hit.addEventListener('blur', leave);
    mark.hit.addEventListener('keydown', event => {
      const next = neighbour(pair.index, event.key);
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (next !== undefined && next !== pair.index) rove(pair.size, next, true);
    });
    mark.cell.addEventListener('pointerenter', () => { if (!mark.cell.classList.contains('is-off')) enter(mark.cell); });
    mark.cell.addEventListener('pointerleave', leave);
  }

  // Arm the reveal with transitions off, so marks below the fold disappear at
  // once rather than fading out on their staggered reveal delays.
  root.classList.add('is-arming');
  armReveal(root);
  void root.offsetWidth;
  requestAnimationFrame(() => root.classList.remove('is-arming'));
}

for (const root of document.querySelectorAll<HTMLElement>('[data-downstream-pairs]')) init(root);
