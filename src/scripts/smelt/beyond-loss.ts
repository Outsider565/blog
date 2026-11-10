// BeyondLoss: benchmark toggle (points move vertically, the fit morphs, the
// residual panel re-scales), scale selection linked across both panels, and
// nearest-point tooltips.
import { armReveal, bindSegmented, hideTooltip, reducedMotion, showTooltip, svgNode, tween } from './kit';
import { lerp, linePath, type Point } from '../../lib/smelt/plot';
import { pairs, sizes } from '../../lib/smelt/downstream-pairs';
import {
  benchText, columnCenter, keyboardOrder, note, columnWidth, columns, copy, digits, fitPath, fitValue, jitter, lossScale, pointTip, pooled, readout, residual,
  residualAxis, residualBox, scaleSummary, scatterBox, scoreAxis, signed, statValues, toDisplay, unit, type BenchKey, type ScaleKey,
} from '../../lib/smelt/beyond-loss';
import type { Language } from '../../lib/site';

interface Layout {
  base: number[]; loop: number[]; fitAt: number[]; fit: Point[]; rdot: number[];
  barTop: number[]; baseTop: number[]; zero: number; pooled: number; ciLow: number; ciHigh: number;
}

function init(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = 'true';
  const language = (root.dataset.language === 'en' ? 'en' : 'zh') as Language;
  const text = copy[language];
  const state = { key: 'core' as BenchKey, scale: 'all' as ScaleKey };
  const pick = <T extends Element>(selector: string) => root.querySelector<T>(selector);
  const all = <T extends Element>(selector: string) => [...root.querySelectorAll<T>(selector)];
  const byIndex = <T extends Element>(attribute: string) => {
    const nodes = all<T>(`[${attribute}]`);
    const list: T[] = [];
    for (const node of nodes) list[Number(node.getAttribute(attribute))] = node;
    return list;
  };
  const baseDots = byIndex<SVGCircleElement>('data-bl-base');
  const loopDots = byIndex<SVGCircleElement>('data-bl-loop');
  const sticks = byIndex<SVGLineElement>('data-bl-stick');
  const rdots = byIndex<SVGCircleElement>('data-bl-rdot');
  const bars = sizes.map(size => pick<SVGRectElement>(`[data-bl-bar="${size}"]`)!);
  const means = sizes.map(size => pick<SVGLineElement>(`[data-bl-mean-line="${size}"]`)!);
  const baseLines = sizes.map(size => pick<SVGLineElement>(`[data-bl-base-line="${size}"]`)!);
  const baseTexts = sizes.map(size => pick<SVGTextElement>(`[data-bl-base-mean="${size}"]`));
  const endpointTables = all<HTMLElement>('[data-bl-endpoints]');
  const live = pick<HTMLElement>('[data-bl-live]');
  const meanTexts = columns.map(column => pick<SVGTextElement>(`[data-bl-mean="${column}"]`)!);
  const labels = all<SVGTextElement>('.bl-col-label');
  const colHits = columns.map(column => pick<SVGRectElement>(`[data-bl-col="${column}"]`)!);
  const fitNode = pick<SVGPathElement>('[data-bl-fit]')!;
  const zeroNode = pick<SVGLineElement>('[data-bl-zero]')!;
  const ci = pick<SVGLineElement>('[data-bl-ci]')!;
  const ciLow = pick<SVGLineElement>('[data-bl-ci-low]')!;
  const ciHigh = pick<SVGLineElement>('[data-bl-ci-high]')!;
  const diamond = pick<SVGPathElement>('[data-bl-diamond]')!;
  const pooledGroup = pick<SVGGElement>('[data-bl-pooled]')!;
  const chanceLine = pick<SVGLineElement>('[data-bl-chance]')!;
  const chanceLegend = pick<HTMLElement>('[data-bl-chance-legend]');
  const scatter = pick<SVGSVGElement>('[data-bl-scatter]')!;
  const residualSvg = pick<SVGSVGElement>('[data-bl-residual]')!;
  const ring = pick<SVGCircleElement>('[data-bl-ring]')!;
  if (baseDots.length !== pairs.length || loopDots.length !== pairs.length || !fitNode || !scatter || !residualSvg || baseLines.some(line => !line)) return;

  const layout = (key: BenchKey): Layout => {
    const axis = scoreAxis(key);
    const raxis = residualAxis(key);
    const summary = pooled(key);
    return {
      base: pairs.map(pair => axis.scale(toDisplay(key, pair[key][0]))),
      loop: pairs.map(pair => axis.scale(toDisplay(key, pair[key][1]))),
      fitAt: pairs.map(pair => axis.scale(toDisplay(key, fitValue(key, pair.loss[1])))),
      fit: fitPath(key, axis),
      rdot: pairs.map(pair => raxis.scale(residual(pair, key, 1))),
      barTop: sizes.map(size => raxis.scale(scaleSummary(key, size).mean)),
      baseTop: sizes.map(size => raxis.scale(scaleSummary(key, size).baseMean)),
      zero: raxis.scale(0),
      pooled: raxis.scale(summary.mean),
      ciLow: raxis.scale(summary.ci[0] ?? 0),
      ciHigh: raxis.scale(summary.ci[1] ?? 0),
    };
  };
  let current = layout(state.key);
  let cancel = () => {};
  let cancelStats = () => {};
  let shown = { mean: pooled(state.key).mean, points: pooled(state.key).positive, total: pairs.length };

  const apply = (frame: Layout) => {
    for (const pair of pairs) {
      const i = pair.index;
      baseDots[i]!.setAttribute('cy', frame.base[i]!.toFixed(2));
      loopDots[i]!.setAttribute('cy', frame.loop[i]!.toFixed(2));
      sticks[i]!.setAttribute('y1', frame.fitAt[i]!.toFixed(2));
      sticks[i]!.setAttribute('y2', frame.loop[i]!.toFixed(2));
      rdots[i]!.setAttribute('cy', frame.rdot[i]!.toFixed(2));
    }
    fitNode.setAttribute('d', linePath(frame.fit));
    sizes.forEach((_, index) => {
      const top = frame.barTop[index]!;
      bars[index]!.setAttribute('y', Math.min(top, frame.zero).toFixed(2));
      bars[index]!.setAttribute('height', Math.abs(frame.zero - top).toFixed(2));
      means[index]!.setAttribute('y1', top.toFixed(2));
      means[index]!.setAttribute('y2', top.toFixed(2));
      baseLines[index]!.setAttribute('y1', frame.baseTop[index]!.toFixed(2));
      baseLines[index]!.setAttribute('y2', frame.baseTop[index]!.toFixed(2));
    });
    zeroNode.setAttribute('y1', frame.zero.toFixed(2));
    zeroNode.setAttribute('y2', frame.zero.toFixed(2));
    const cx = columnCenter(4);
    ci.setAttribute('y1', frame.ciLow.toFixed(2)); ci.setAttribute('y2', frame.ciHigh.toFixed(2));
    ciLow.setAttribute('y1', frame.ciLow.toFixed(2)); ciLow.setAttribute('y2', frame.ciLow.toFixed(2));
    ciHigh.setAttribute('y1', frame.ciHigh.toFixed(2)); ciHigh.setAttribute('y2', frame.ciHigh.toFixed(2));
    diamond.setAttribute('d', `M${cx} ${(frame.pooled - 6).toFixed(2)}l6 6l-6 6l-6 -6Z`);
  };
  const mix = (from: Layout, to: Layout, t: number): Layout => ({
    base: from.base.map((value, i) => lerp(value, to.base[i]!, t)),
    loop: from.loop.map((value, i) => lerp(value, to.loop[i]!, t)),
    fitAt: from.fitAt.map((value, i) => lerp(value, to.fitAt[i]!, t)),
    fit: from.fit.map((point, i) => [point[0], lerp(point[1], to.fit[i]![1], t)] as Point),
    rdot: from.rdot.map((value, i) => lerp(value, to.rdot[i]!, t)),
    barTop: from.barTop.map((value, i) => lerp(value, to.barTop[i]!, t)),
    baseTop: from.baseTop.map((value, i) => lerp(value, to.baseTop[i]!, t)),
    zero: lerp(from.zero, to.zero, t),
    pooled: lerp(from.pooled, to.pooled, t),
    ciLow: lerp(from.ciLow, to.ciLow, t),
    ciHigh: lerp(from.ciHigh, to.ciHigh, t),
  });

  const swapTicks = (group: SVGGElement | null, ticks: { value: number; label: string }[], y: (value: number) => number, x0: number, x1: number, animate: boolean) => {
    if (!group) return;
    const old = [...group.children];
    const fresh = ticks.map(tick => {
      const position = y(tick.value);
      const node = svgNode('g', { class: animate ? 'bl-tick is-entering' : 'bl-tick' });
      node.append(svgNode('line', { class: 'grid', x1: x0, x2: x1, y1: position.toFixed(2), y2: position.toFixed(2) }));
      node.append(svgNode('text', { x: x0 - 6, y: (position + 4.5).toFixed(2), 'text-anchor': 'end' }, tick.label));
      return node;
    });
    group.append(...fresh);
    if (!animate) { old.forEach(node => node.remove()); return; }
    requestAnimationFrame(() => { fresh.forEach(node => node.classList.remove('is-entering')); old.forEach(node => node.classList.add('is-leaving')); });
    setTimeout(() => old.forEach(node => node.remove()), 320);
  };

  const setText = (selector: string, value: string) => { const node = pick<HTMLElement>(selector); if (node) node.textContent = value; };
  const tipFor = (column: string) => {
    const key = state.key;
    const d = digits(key);
    const u = unit(key, language);
    const name = benchText(key, language).name;
    if (column === 'all') {
      const own = pooled(key);
      return `${text.pooled} · ${name}\n${text.mean} ${signed(own.mean, d)} ${u}\n${text.ci} ${signed(own.ci[0] ?? 0, d)} – ${signed(own.ci[1] ?? 0, d)}\n${text.positive} ${own.positive} / ${own.total}\n${text.pooledBase}`;
    }
    const own = scaleSummary(key, column);
    return `${column} · ${name}\n${text.mean} ${signed(own.mean, d)} ${u}\n${text.baseMean} ${signed(own.baseMean, d)} ${u}\n${text.sameScaleGap} ${signed(own.mean - own.baseMean, d)} ${u}\n${text.positive} ${own.positive} / ${own.total}`;
  };

  // Headline numbers follow the benchmark and the selected scale, counting
  // from what is on screen; the final frame writes the exact text.
  const refreshStats = (animate: boolean) => {
    const key = state.key;
    const stats = statValues(key, language, state.scale);
    const meanNode = pick<HTMLElement>('[data-bl-stat="mean"]');
    const pointsNode = pick<HTMLElement>('[data-bl-stat="points"]');
    const from = shown;
    const d = digits(key);
    cancelStats();
    cancelStats = tween(animate ? 520 : 0, t => {
      if (meanNode) meanNode.textContent = signed(lerp(from.mean, stats.meanValue, t), d);
      if (pointsNode) pointsNode.textContent = `${Math.round(lerp(from.points, stats.positive, t))} / ${stats.total}`;
    }, () => { if (meanNode) meanNode.textContent = stats.mean; if (pointsNode) pointsNode.textContent = stats.points; });
    shown = { mean: stats.meanValue, points: stats.positive, total: stats.total };
    setText('[data-bl-stat="meanLabel"]', stats.meanLabel);
    setText('[data-bl-stat="pointsLabel"]', stats.pointsLabel);
    setText('[data-bl-stat="scales"]', stats.scales);
  };

  const refreshSelection = (animate = true) => {
    const scale = state.scale;
    refreshStats(animate);
    const off = (size: string) => scale !== 'all' && size !== scale;
    for (const pair of pairs) {
      const faded = off(pair.size);
      baseDots[pair.index]!.classList.toggle('is-faded', faded);
      loopDots[pair.index]!.classList.toggle('is-faded', faded);
      sticks[pair.index]!.classList.toggle('is-faded', faded);
      sticks[pair.index]!.classList.toggle('is-focus', scale !== 'all' && !faded);
      rdots[pair.index]!.classList.toggle('is-faded', faded);
    }
    sizes.forEach((size, index) => {
      bars[index]!.classList.toggle('is-faded', off(size));
      means[index]!.classList.toggle('is-faded', off(size));
      baseLines[index]!.classList.toggle('is-faded', off(size));
      baseTexts[index]?.classList.toggle('is-faded', off(size));
    });
    columns.forEach((column, index) => {
      const faded = scale !== 'all' && column !== scale;
      meanTexts[index]?.classList.toggle('is-faded', faded);
      labels[index]?.classList.toggle('is-faded', faded);
      colHits[index]?.setAttribute('aria-pressed', String(column === scale));
    });
    pooledGroup.classList.toggle('is-faded', scale !== 'all');
    setText('[data-bl-readout]', readout(state.key, scale, language));
    const annotation = note(state.key, scale, language);
    const noteNode = pick<SVGTextElement>('[data-bl-note]');
    if (noteNode) {
      noteNode.setAttribute('text-anchor', annotation.anchor);
      [...noteNode.querySelectorAll('tspan')].forEach((span, index) => {
        span.textContent = annotation.lines[index] ?? '';
        span.setAttribute('x', String(annotation.x));
      });
    }
  };

  const refreshBench = (animate: boolean) => {
    const key = state.key;
    const info = benchText(key, language);
    setText('[data-bl-axis]', info.axis);
    setText('[data-bl-better]', info.better);
    setText('[data-bl-raxis]', text.residualAxis(key));
    setText('[data-bl-r2]', `R² = ${pooled(key).r2.toFixed(3)}`);
    const d = digits(key);
    columns.forEach((column, index) => {
      const value = column === 'all' ? pooled(key).mean : scaleSummary(key, column).mean;
      if (meanTexts[index]) meanTexts[index]!.textContent = signed(value, d);
      if (column !== 'all') { const baseText = baseTexts[index]; if (baseText) baseText.textContent = signed(scaleSummary(key, column).baseMean, d); }
      const tip = tipFor(column);
      colHits[index]?.setAttribute('data-tip', tip);
      colHits[index]?.setAttribute('aria-label', tip.replaceAll('\n', '; '));
    });
    for (const pair of pairs) {
      const up = residual(pair, key, 1) > 0;
      sticks[pair.index]!.classList.toggle('is-up', up);
      sticks[pair.index]!.classList.toggle('is-down', !up);
      rdots[pair.index]!.classList.toggle('is-up', up);
      rdots[pair.index]!.classList.toggle('is-down', !up);
    }
    const axis = scoreAxis(key);
    const raxis = residualAxis(key);
    swapTicks(pick('[data-bl-yticks]'), axis.ticks, axis.scale, scatterBox.x0, scatterBox.x1, animate);
    swapTicks(pick('[data-bl-rticks]'), raxis.ticks, raxis.scale, residualBox.x0, residualBox.x1, animate);
    const chanceY = axis.scale(25);
    chanceLine.setAttribute('y1', chanceY.toFixed(2));
    chanceLine.setAttribute('y2', chanceY.toFixed(2));
    chanceLine.classList.toggle('is-out', key !== 'mmlu');
    if (chanceLegend) chanceLegend.hidden = key !== 'mmlu';
    root.dataset.bench = key;
    for (const table of endpointTables) table.hidden = table.dataset.blEndpoints !== key;

    cancel();
    const target = layout(key);
    const from = current;
    if (!animate || reducedMotion()) { apply(target); current = target; }
    else cancel = tween(620, t => { current = mix(from, target, t); apply(current); }, () => { current = target; if (keyPoint) placeKeyPoint(false); });
    refreshSelection(animate);
  };

  const revealClasses = ['reveal-pop', 'reveal-draw', 'reveal-fade', 'reveal-grow', 'reveal-grow-x'];
  const strip = (scope: ParentNode) => { for (const node of scope.querySelectorAll(revealClasses.map(name => `.${name}`).join(','))) node.classList.remove(...revealClasses); };
  let isLive = false;
  const goLive = () => {
    if (isLive) return;
    isLive = true;
    strip(root);
    root.classList.add('is-live');
  };
  root.addEventListener('smelt:reveal', event => {
    const target = event.target as Element;
    setTimeout(() => {
      strip(target);
      if (!root.querySelector('[data-reveal="armed"]')) goLive();
    }, 2300);
  });

  bindSegmented(pick('[data-bl-bench]')!, value => { goLive(); state.key = (value === 'mmlu' || value === 'comp' ? value : 'core'); refreshBench(true); });
  const chooseScale = bindSegmented(pick('[data-bl-scale]')!, value => {
    goLive();
    state.scale = value || 'all';
    if (keyPoint && !visible(pairs[keyPoint.index]!.size)) clearKeyPoint();
    refreshSelection();
  });

  // Residual columns: click (or Enter / Space) to select that scale; again to clear.
  columns.forEach((column, index) => {
    const hit = colHits[index];
    if (!hit) return;
    const select = () => chooseScale(state.scale === column ? 'all' : column);
    hit.addEventListener('click', select);
    hit.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
    hit.addEventListener('focus', () => showTooltip(hit.getAttribute('data-tip') || '', hit));
    hit.addEventListener('blur', hideTooltip);
  });

  // Nearest-point tooltips for pointer and touch; keyboard users step through
  // the same points with the arrow keys (every value is also in the tables).
  const toLocal = (svg: SVGSVGElement, event: PointerEvent) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  function visible(size: string) { return state.scale === 'all' || state.scale === size; }
  const pointAt = (index: number, arch: 0 | 1) => ({ x: lossScale(pairs[index]!.loss[arch]), y: arch ? current.loop[index]! : current.base[index]! });
  const nearest = (local: { x: number; y: number }, radius: number) => {
    let best: { index: number; arch: 0 | 1; distance: number } | null = null;
    for (const pair of pairs) {
      if (!visible(pair.size)) continue;
      for (const arch of [1, 0] as const) {
        const { x, y } = pointAt(pair.index, arch);
        const distance = Math.hypot(x - local.x, y - local.y);
        if (distance < radius && (!best || distance < best.distance)) best = { index: pair.index, arch, distance };
      }
    }
    return best;
  };
  const showRing = (index: number, arch: 0 | 1, keyboard: boolean) => {
    const { x, y } = pointAt(index, arch);
    ring.setAttribute('cx', x.toFixed(2));
    ring.setAttribute('cy', y.toFixed(2));
    ring.classList.add('is-on');
    ring.classList.toggle('is-key', keyboard);
  };
  const hideRing = () => { ring.classList.remove('is-on', 'is-key'); };
  const pointerPick = (event: PointerEvent) => {
    const local = toLocal(scatter, event);
    if (!local) return;
    const best = nearest(local, event.pointerType === 'touch' ? 16 : 9);
    if (!best) { if (!keyPoint) hideRing(); else placeKeyPoint(false); if (event.pointerType !== 'touch') hideTooltip(); return; }
    showRing(best.index, best.arch, false);
    showTooltip(pointTip(pairs[best.index]!, best.arch, state.key, language), event);
  };
  scatter.addEventListener('pointermove', pointerPick);
  scatter.addEventListener('pointerdown', pointerPick);
  scatter.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    if (keyPoint && document.activeElement === scatter) { placeKeyPoint(false); return; }
    hideRing(); hideTooltip();
  });

  // Keyboard: the scatter is one Tab stop. Left / Right walk the visible
  // endpoints in order of validation loss, Up / Down switch between a
  // configuration's SMELT and Baseline endpoints, Home / End jump to the ends.
  let keyPoint: { index: number; arch: 0 | 1 } | null = null;
  function placeKeyPoint(announce: boolean) {
    if (!keyPoint) return;
    showRing(keyPoint.index, keyPoint.arch, true);
    const tip = pointTip(pairs[keyPoint.index]!, keyPoint.arch, state.key, language);
    const matrix = scatter.getScreenCTM();
    const { x, y } = pointAt(keyPoint.index, keyPoint.arch);
    if (matrix) { const screen = new DOMPoint(x, y).matrixTransform(matrix); showTooltip(tip, { clientX: screen.x, clientY: screen.y }); }
    if (announce && live) live.textContent = tip.replaceAll('\n', '; ');
  }
  function clearKeyPoint() { keyPoint = null; hideRing(); hideTooltip(); }
  scatter.addEventListener('focus', () => {
    if (!scatter.matches(':focus-visible')) return;
    if (!keyPoint || !visible(pairs[keyPoint.index]!.size)) keyPoint = { index: keyboardOrder(1, state.scale)[0]!, arch: 1 };
    placeKeyPoint(true);
  });
  scatter.addEventListener('blur', clearKeyPoint);
  scatter.addEventListener('keydown', event => {
    if (event.key === 'Escape') { clearKeyPoint(); return; }
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const point = keyPoint ?? { index: keyboardOrder(1, state.scale)[0]!, arch: 1 as const };
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      keyPoint = { index: point.index, arch: point.arch ? 0 : 1 };
    } else {
      const order = keyboardOrder(point.arch, state.scale);
      const at = Math.max(0, order.indexOf(point.index));
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? order.length - 1 : event.key === 'ArrowRight' ? Math.min(order.length - 1, at + 1) : Math.max(0, at - 1);
      keyPoint = { index: order[next]!, arch: point.arch };
    }
    placeKeyPoint(true);
  });

  // Close a tapped tooltip when the reader taps outside the figure.
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !root.contains(event.target as Node)) { hideRing(); hideTooltip(); }
  });

  const residualPick = (event: PointerEvent) => {
    const local = toLocal(residualSvg, event);
    if (!local) return;
    let best: { index: number; distance: number } | null = null;
    for (const pair of pairs) {
      if (!visible(pair.size)) continue;
      const x = columnCenter(sizes.indexOf(pair.size)) + jitter(pair) * columnWidth * 0.62;
      const distance = Math.hypot(x - local.x, current.rdot[pair.index]! - local.y);
      if (distance < (event.pointerType === 'touch' ? 10 : 6) && (!best || distance < best.distance)) best = { index: pair.index, distance };
    }
    if (best) { showTooltip(pointTip(pairs[best.index]!, 1, state.key, language), event); return; }
    const column = columns.findIndex((_, index) => Math.abs(columnCenter(index) - local.x) <= columnWidth / 2);
    if (column >= 0 && local.y > residualBox.y0) showTooltip(tipFor(columns[column]!), event); else hideTooltip();
  };
  residualSvg.addEventListener('pointermove', residualPick);
  residualSvg.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') hideTooltip(); });

  for (const table of endpointTables) table.hidden = table.dataset.blEndpoints !== state.key;

  // Arm the reveal with transitions off, so marks below the fold disappear at
  // once rather than fading out on their staggered reveal delays.
  root.classList.add('is-arming');
  armReveal(root);
  void root.offsetWidth;
  requestAnimationFrame(() => root.classList.remove('is-arming'));
}

for (const root of document.querySelectorAll<HTMLElement>('[data-beyond-loss]')) init(root);
