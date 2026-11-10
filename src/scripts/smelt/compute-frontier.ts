// Figure 7 (ComputeFrontier): pick a sparsity, scrub the budget; the lens, stats
// and CE Gain marker follow. The server render already shows S≈97%, C = 10²¹.
import data from '../../data/smelt/compute-frontier.json';
import { computeFrontierCopy } from '../../lib/smelt/compute-frontier-copy';
import { dimensionPath, fitWindow, formatGain, formatSparsity, frontierSeries, gainSeries, gapDimension, layouts, logRange, markerGeometry, scales, seriesPath, snapshot, sparsities, spreadLabels, tableBudgets, whiskers, type Layout, type Snapshot, type Variant } from '../../lib/smelt/compute-frontier';
import { billions, sci, supHtml } from '../../lib/smelt/scaling-fit';
import { armReveal, bindSegmented, bindTooltips, countUp, svgNode, tween } from './kit';

const percent = (value: number) => `${Math.round(value)}%`;

interface View {
  layout: Layout; svg: SVGSVGElement;
  q: <T extends Element = SVGElement>(selector: string) => T | null;
}

for (const root of document.querySelectorAll<HTMLElement>('[data-compute-frontier]')) {
  const text = computeFrontierCopy[root.dataset.language === 'en' ? 'en' : 'zh'];
  const views: View[] = [...root.querySelectorAll<SVGSVGElement>('svg[data-cf-variant]')].map(svg => ({
    layout: layouts[(svg.dataset.cfVariant as Variant) ?? 'wide'], svg,
    q: <T extends Element = SVGElement>(selector: string) => svg.querySelector<T>(selector),
  }));
  const range = root.querySelector<HTMLInputElement>('[data-cf-range]');
  const output = root.querySelector<HTMLOutputElement>('[data-cf-output]');
  const readout = root.querySelector<HTMLElement>('[data-cf-readout]');
  const stat = (key: string) => root.querySelector<HTMLElement>(`[data-cf-stat="${key}"]`);
  const label = (key: string) => root.querySelector<HTMLElement>(`[data-cf-label="${key}"]`);
  const budgetButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-cf-budget] button')];

  let sparsity = data.defaultSparsity;
  let shownSparsity = sparsity;
  let logCompute = Math.log10(data.annotatedBudget);
  let cancelShape = () => {};
  let cancelBudget = () => {};
  // The headline counts up once on reveal; any state change cancels it so the
  // number it settles on is always the current one.
  let cancelCount = () => {};

  const snapTo = (value: number) => {
    for (const budget of tableBudgets) if (Math.abs(value - Math.log10(budget)) < 0.03) return Math.log10(budget);
    return value;
  };

  // Whiskers act as buttons: click, Enter or Space jumps to their budget.
  function bindWhisker(node: SVGGElement) {
    const jump = () => goTo(Math.log10(Number(node.dataset.budget)));
    node.addEventListener('click', jump);
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      jump();
    });
  }

  function drawShape(series: { baseline: number[]; smelt: number[] }) {
    for (const view of views) {
      view.q('[data-cf-path="baseline"]')?.setAttribute('d', seriesPath(series.baseline, view.layout, 'loss'));
      view.q('[data-cf-path="smelt"]')?.setAttribute('d', seriesPath(series.smelt, view.layout, 'loss'));
    }
  }

  function drawWhiskers() {
    for (const view of views) {
      const group = view.q<SVGGElement>('[data-cf-whiskers]');
      if (!group) continue;
      group.replaceChildren();
      for (const item of whiskers(sparsity, view.layout)) {
        const low = percent(item.cell.ci95[0]!);
        const high = percent(item.cell.ci95[1]!);
        const tip = text.whiskerTip(sci(item.cell.C), formatSparsity(sparsity), `${item.cell.point.toFixed(1)}%`, low, high, item.cell.C > fitWindow[1]);
        const node = svgNode('g', { class: item.cell.C > fitWindow[1] ? 'cf-whisker is-extrapolated' : 'cf-whisker', role: 'button', 'data-tip': tip, 'data-budget': String(item.cell.C), 'aria-label': `${tip.replaceAll('\n', ' · ')} · ${text.whiskerAction}` });
        node.append(
          svgNode('rect', { class: 'hit', x: item.x - 9, y: item.y1 - 4, width: 18, height: item.y0 - item.y1 + 8 }),
          svgNode('path', { class: 'cf-whisker-line', d: `M${item.x} ${item.y0}V${item.y1}M${item.x - 3.5} ${item.y0}h7${item.clipped ? `M${item.x - 3.5} ${item.y1 + 4}L${item.x} ${item.y1}L${item.x + 3.5} ${item.y1 + 4}` : `M${item.x - 3.5} ${item.y1}h7`}` }),
          svgNode('circle', { class: 'cf-whisker-dot', cx: item.x, cy: item.y, r: 3 }),
        );
        bindWhisker(node);
        group.append(node);
      }
      bindTooltips(group);
    }
  }

  function drawSparsityMarks() {
    for (const view of views) {
      const { g } = scales(view.layout);
      for (const line of view.svg.querySelectorAll<SVGPathElement>('[data-cf-gain]')) line.classList.toggle('is-active', line.dataset.cfGain === String(sparsity));
      const labels = [...view.svg.querySelectorAll<SVGTextElement>('[data-cf-gain-label]')];
      const ends = spreadLabels(sparsities.map(value => g(gainSeries(value).at(-1)!)), 13, view.layout.stripTop + 4, view.layout.stripBottom - 4);
      labels.forEach((node, index) => { node.classList.toggle('is-active', node.dataset.cfGainLabel === String(sparsity)); node.setAttribute('y', String(ends[index]! + 4.5)); });
    }
  }

  function drawMarks(state: Snapshot) {
    for (const view of views) {
      const marks = markerGeometry(state, view.layout);
      const set = (selector: string, attributes: Record<string, number | string>) => {
        const node = view.q(selector);
        if (node) for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, typeof value === 'number' ? value.toFixed(2) : value);
      };
      set('[data-cf-scrub]', { x1: marks.scrubX, x2: marks.scrubX });
      set('[data-cf-box]', { x: marks.box.x0, y: marks.box.y0, width: marks.box.x1 - marks.box.x0, height: Math.max(4, marks.box.y1 - marks.box.y0) });
      marks.connectors.forEach((line, index) => set(`[data-cf-connector="${index}"]`, { x1: line[0], y1: line[1], x2: line[2], y2: line[3] }));
      set('[data-cf-main-arrow]', { x1: marks.smelt[0], y1: marks.smelt[1], x2: marks.base[0], y2: marks.base[1] });
      set('[data-cf-base-dot]', { cx: marks.base[0], cy: marks.base[1], visibility: marks.baseVisible ? 'visible' : 'hidden' });
      set('[data-cf-edge]', { d: marks.edge });
      set('[data-cf-loop-dot]', { cx: marks.smelt[0], cy: marks.smelt[1] });
      set('[data-cf-gain-dot]', { cx: marks.gainPoint[0], cy: marks.gainPoint[1] });
      set('[data-cf-lens-path="baseline"]', { d: marks.lens.base });
      set('[data-cf-lens-path="smelt"]', { d: marks.lens.smelt });
      const direction = Math.sign(marks.lens.arrowX1 - marks.lens.arrowX0) || 1;
      const dim = dimensionPath(marks.lens.arrowX0 + 5 * direction, marks.lens.arrowX1 - 5 * direction, marks.lens.arrowY);
      const short = Math.abs(marks.lens.arrowX1 - marks.lens.arrowX0) < 12;
      set('[data-cf-dim]', { d: short ? '' : dim.line });
      set('[data-cf-dim-head]', { d: short ? '' : dim.heads });
      set('[data-cf-gap-dim]', { d: gapDimension(marks.lens.arrowX0, marks.lens.arrowY, marks.lens.gapY) });
      const gapText = view.q('[data-cf-lens-gap]');
      if (gapText) gapText.textContent = text.lensGap(1000 * state.lossGap);
      set('[data-cf-lens-base]', { cx: marks.lens.arrowX1, cy: marks.lens.arrowY });
      set('[data-cf-lens-loop]', { cx: marks.lens.arrowX0, cy: marks.lens.arrowY });
      const gainText = view.q('[data-cf-lens-gain]');
      if (gainText) { gainText.textContent = text.lensGain(formatGain(state.gain)); gainText.classList.toggle('is-negative', state.gain < 0); }
      const loopLabel = view.q('[data-cf-lens-loop-label]');
      if (loopLabel) loopLabel.textContent = sci(state.compute);
      const baseLabel = view.q('[data-cf-lens-base-label]');
      if (baseLabel) baseLabel.textContent = sci(state.referenceCompute);
      view.svg.setAttribute('aria-label', text.ariaChart(formatGain(state.gain), sci(state.compute), formatSparsity(sparsity)));
    }
  }

  // Text nodes are rewritten only when their content changes (drag fires every frame).
  const written = new WeakMap<Element, string>();
  const setHtml = (node: Element | null, html: string) => { if (node && written.get(node) !== html) { node.innerHTML = html; written.set(node, html); } };
  function drawText(state: Snapshot) {
    cancelCount();
    cancelCount = () => {};
    const budget = sci(state.compute);
    const gain = stat('gain');
    if (gain) {
      gain.textContent = formatGain(state.gain);
      gain.classList.toggle('is-gain', state.gain >= 0);
      gain.classList.toggle('is-base', state.gain < 0);
      gain.classList.toggle('is-extrapolated', state.extrapolated);
    }
    setHtml(label('gain'), supHtml(text.statGain(budget, formatSparsity(sparsity), state.gain < 0, state.extrapolated)));
    setHtml(stat('reference'), supHtml(sci(state.referenceCompute)));
    const ci = stat('ci');
    if (ci) ci.textContent = state.table ? `[${percent(state.table.ci95[0]!)}, ${percent(state.table.ci95[1]!)}]` : '—';
    setHtml(label('ci'), supHtml(state.table ? text.statCi : text.statCiNone));
    const allocation = (arch: 'baseline' | 'smelt') => ({ F: sci(state.allocation[arch].flops), D: billions(state.allocation[arch].tokens), tpp: state.allocation[arch].tpp.toFixed(0) });
    setHtml(readout, supHtml(text.allocation(allocation('baseline'), allocation('smelt'))));
    setHtml(output, supHtml(budget));
    if (range) { range.value = logCompute.toFixed(3); range.setAttribute('aria-valuetext', `${budget} FLOPs`); range.style.setProperty('--fill', `${(100 * (logCompute - logRange[0]) / (logRange[1] - logRange[0])).toFixed(2)}%`); }
    for (const button of budgetButtons) button.setAttribute('aria-pressed', String(Math.abs(Math.log10(Number(button.dataset.value)) - logCompute) < 1e-6));
  }

  function update() {
    const state = snapshot(10 ** logCompute, shownSparsity);
    drawMarks(state);
    drawText(state);
  }

  function goTo(target: number) {
    cancelBudget();
    const start = logCompute;
    cancelBudget = tween(520, progress => { logCompute = start + (target - start) * progress; update(); }, () => { logCompute = target; update(); });
  }

  // The law is continuous in S, so a sparsity change glides through the
  // intermediate surfaces: curves, markers, lens and numbers stay consistent.
  function setSparsity(value: number) {
    if (value === sparsity) return;
    sparsity = value;
    const from = shownSparsity;
    drawSparsityMarks();
    drawWhiskers();
    cancelShape();
    cancelShape = tween(560, progress => {
      shownSparsity = from + (value - from) * progress;
      drawShape({ baseline: frontierSeries('baseline', shownSparsity), smelt: frontierSeries('smelt', shownSparsity) });
      const state = snapshot(10 ** logCompute, shownSparsity);
      drawMarks(state);
      drawText(state);
    }, () => { shownSparsity = value; drawShape({ baseline: frontierSeries('baseline', value), smelt: frontierSeries('smelt', value) }); update(); });
  }

  // ---- controls ----
  const sparsityGroup = root.querySelector('[data-cf-sparsity]');
  if (sparsityGroup) bindSegmented(sparsityGroup, value => setSparsity(Number(value)));
  for (const button of budgetButtons) button.addEventListener('click', () => goTo(Math.log10(Number(button.dataset.value))));
  range?.addEventListener('input', () => { cancelBudget(); logCompute = snapTo(Number(range.value)); update(); });

  for (const view of views) {
    const hit = view.q<SVGRectElement>('[data-cf-hit]');
    if (!hit) continue;
    const toLog = (event: PointerEvent) => {
      const box = view.svg.getBoundingClientRect();
      const unitX = (event.clientX - box.left) * view.layout.width / box.width;
      const fraction = (unitX - view.layout.left) / (view.layout.right - view.layout.left);
      return snapTo(logRange[0] + Math.min(1, Math.max(0, fraction)) * (logRange[1] - logRange[0]));
    };
    let dragging = false;
    hit.addEventListener('pointerdown', event => { dragging = true; hit.setPointerCapture(event.pointerId); cancelBudget(); logCompute = toLog(event); update(); });
    hit.addEventListener('pointermove', event => { if (!dragging) return; logCompute = toLog(event); update(); });
    const stop = () => { dragging = false; };
    hit.addEventListener('pointerup', stop);
    hit.addEventListener('pointercancel', stop);
  }

  // Server-rendered whiskers: wire their clicks, keys and tooltips.
  for (const node of root.querySelectorAll<SVGGElement>('.cf-whisker')) bindWhisker(node);
  bindTooltips(root);

  // Reveal: count the headline up once the numbers themselves scroll in.
  const stats = root.querySelector<HTMLElement>('[data-cf-stats]');
  const gainStat = stat('gain');
  stats?.addEventListener('smelt:reveal', () => {
    if (!gainStat) return;
    const target = snapshot(10 ** logCompute, sparsity).gain;
    cancelCount();
    cancelCount = countUp(gainStat, target, value => formatGain(value), 900);
  }, { once: true });
  root.dataset.ready = '';
  armReveal(root);
}
