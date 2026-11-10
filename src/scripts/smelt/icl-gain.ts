// Figure 13 interaction: choose a task (menu or click a line on the left); the
// right panel's curves, gap connectors and axis glide to the new task.
import { accuracyDomain, accuracyPoints, allShots, columnTip, curveOf, defaultTask, endLabel, frame, labelOf, meanCurve, readout, type Curve } from '../../lib/smelt/icl-gain';
import { lerp, linePath, linear, type Point } from '../../lib/smelt/plot';
import { armReveal, bindTooltips, svgNode, tween } from './kit';

for (const root of document.querySelectorAll<HTMLElement>('[data-icl-gain]')) {
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const select = root.querySelector<HTMLSelectElement>('[data-ig-select]');
  const gapChart = root.querySelector<SVGSVGElement>('.ig-gap');
  const chart = root.querySelector<SVGSVGElement>('.ig-accuracy');
  if (!select || !gapChart || !chart) continue;
  for (const element of root.querySelectorAll<HTMLElement>('[data-js-only]')) element.hidden = false;
  const taskLayer = gapChart.querySelector<SVGGElement>('[data-ig-tasks]');
  const mean = gapChart.querySelector<SVGGElement>('.ig-mean');
  const grid = chart.querySelector<SVGGElement>('[data-ig-grid]');
  const baseLine = chart.querySelector<SVGPathElement>('.ig-base-line');
  const loopLine = chart.querySelector<SVGPathElement>('.ig-loop-line');
  const baseDots = [...chart.querySelectorAll<SVGCircleElement>('[data-ig-dot="base"]')];
  const loopDots = [...chart.querySelectorAll<SVGCircleElement>('[data-ig-dot="loop"]')];
  const connectors = [...chart.querySelectorAll<SVGLineElement>('.ig-connector')];
  const columns = [...chart.querySelectorAll<SVGGElement>('.ig-col')];
  const title = root.querySelector('[data-ig-title]');
  const selectedName = root.querySelector('[data-ig-selected-name]');
  const output = root.querySelector('[data-ig-readout]');

  let curve: Curve = curveOf(defaultTask);
  let state = { domain: accuracyDomain(curve).domain as readonly [number, number], ...accuracyPoints(curve, accuracyDomain(curve).domain) };
  let cancel = () => {};

  function renderGrid(values: number[]) {
    if (!grid) return [] as SVGGElement[];
    grid.replaceChildren();
    return values.map(value => {
      const group = svgNode('g', { class: 'ig-tick', 'data-value': value });
      group.append(svgNode('line', { class: 'grid', x1: frame.x0, x2: frame.x1, y1: 0, y2: 0 }), svgNode('text', { x: frame.x0 - 8, y: 0, 'text-anchor': 'end' }, String(Number(value.toFixed(2)))));
      grid.append(group);
      return group;
    });
  }

  function placeGrid(groups: SVGGElement[], domain: readonly [number, number]) {
    const y = linear(domain, [frame.y0, frame.y1]);
    for (const group of groups) {
      const position = y(Number(group.dataset.value));
      group.querySelector('line')?.setAttribute('y1', position.toFixed(2));
      group.querySelector('line')?.setAttribute('y2', position.toFixed(2));
      group.querySelector('text')?.setAttribute('y', (position + 4.5).toFixed(2));
      group.style.opacity = position < frame.y1 - 3 || position > frame.y0 + 3 ? '0' : '1';
    }
  }

  function placeSeries(base: Point[], loop: Point[], padFrom: number) {
    baseLine?.setAttribute('d', linePath(base));
    loopLine?.setAttribute('d', linePath(loop));
    base.forEach(([x, y], index) => { baseDots[index]?.setAttribute('cx', x.toFixed(2)); baseDots[index]?.setAttribute('cy', y.toFixed(2)); });
    loop.forEach(([x, y], index) => { loopDots[index]?.setAttribute('cx', x.toFixed(2)); loopDots[index]?.setAttribute('cy', y.toFixed(2)); });
    connectors.forEach((line, index) => {
      const b = base[index]!;
      const l = loop[index]!;
      line.setAttribute('x1', b[0].toFixed(2));
      line.setAttribute('x2', b[0].toFixed(2));
      line.setAttribute('y1', b[1].toFixed(2));
      line.setAttribute('y2', l[1].toFixed(2));
      line.classList.toggle('is-negative', l[1] > b[1]);
      line.toggleAttribute('data-pad', index >= padFrom);
    });
  }

  function choose(key: string) {
    const next = curveOf(key);
    if (next === curve) return;
    curve = next;
    select!.value = next.key;
    // Left panel: mark the selected line and lift it above the others (the mean stays on top).
    for (const group of gapChart!.querySelectorAll<SVGGElement>('.ig-task')) {
      const on = group.dataset.task === next.key;
      group.toggleAttribute('data-selected', on);
      if (on && taskLayer && mean) taskLayer.insertBefore(group, mean);
    }
    const endText = gapChart!.querySelector<SVGTextElement>('[data-ig-end]');
    if (endText) {
      const label = endLabel(next, endLabel(meanCurve));
      endText.setAttribute('x', label.x.toFixed(2));
      endText.setAttribute('y', label.y.toFixed(2));
      endText.setAttribute('text-anchor', label.anchor);
      endText.textContent = label.text;
      endText.toggleAttribute('hidden', next.key === 'mean');
    }
    if (title) title.textContent = labelOf(next, language);
    if (selectedName) selectedName.textContent = next.label;
    selectedName?.parentElement?.toggleAttribute('hidden', next.key === 'mean');
    if (output) output.textContent = readout(next, language);
    columns.forEach((column, index) => { column.dataset.tip = columnTip(next, index, language) || `k = ${allShots[index]}${language === 'zh' ? '：该任务未评测' : ': not evaluated for this task'}`; });

    const target = accuracyDomain(next);
    const end = { domain: target.domain, ...accuracyPoints(next, target.domain) };
    const start = state;
    const ticks = renderGrid(target.ticks);
    const padFrom = next.shots.length;
    for (const dot of [...baseDots, ...loopDots]) if (Number(dot.dataset.index) < padFrom) dot.removeAttribute('data-pad');
    cancel();
    cancel = tween(620, t => {
      const domain = [lerp(start.domain[0], end.domain[0], t), lerp(start.domain[1], end.domain[1], t)] as const;
      const mix = (a: Point[], b: Point[]) => a.map((point, index): Point => [lerp(point[0], b[index]![0], t), lerp(point[1], b[index]![1], t)]);
      // Points are tweened in screen space, but the axis glides with the domain so both arrive together.
      placeGrid(ticks, domain);
      const base = mix(start.base, end.base);
      const loop = mix(start.loop, end.loop);
      placeSeries(base, loop, t < 1 ? Math.max(padFrom, start.base.length) : padFrom);
      state = { domain, base, loop };
    }, () => {
      for (const dot of [...baseDots, ...loopDots]) dot.toggleAttribute('data-pad', Number(dot.dataset.index) >= padFrom);
      placeSeries(end.base, end.loop, padFrom);
      state = end;
    });
  }

  select.addEventListener('change', () => choose(select.value));
  for (const group of gapChart.querySelectorAll<SVGGElement>('.ig-task')) group.addEventListener('click', () => choose(group.dataset.task ?? 'mean'));
  mean?.addEventListener('click', () => choose('mean'));

  const guide = chart.querySelector('.ig-guide');
  bindTooltips(root, element => {
    if (!element.classList.contains('ig-col')) return;
    const x = (frame.x0 + (Number((element as SVGGElement).dataset.index) + 0.5) * ((frame.x1 - frame.x0) / allShots.length)).toFixed(2);
    guide?.setAttribute('x1', x);
    guide?.setAttribute('x2', x);
    guide?.setAttribute('visibility', 'visible');
  }, () => guide?.setAttribute('visibility', 'hidden'));
  armReveal(root);
}
