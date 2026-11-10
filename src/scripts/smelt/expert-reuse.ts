// Figure 14 (expert-reuse): linked selection between the overview dots and the
// segmented controls, the two-visit pick animation in the expert pool, and
// tweened bars in the overlap distribution.
import { armReveal, bindSegmented, bindTooltips, reducedMotion, tween } from './kit';
import { cells, copy, dist, distLayout, expertsOf, k, meanLabels, meanLabelText, poolShape, poolStates, randomMean, sizeColor, type Size, type SparsityKey } from '../../lib/smelt/expert-reuse';
import { lerp } from '../../lib/smelt/plot';

const svgNamespace = 'http://www.w3.org/2000/svg';

for (const root of document.querySelectorAll<HTMLElement>('[data-expert-reuse]')) {
  const text = copy[root.dataset.language === 'en' ? 'en' : 'zh'];
  let es = (root.dataset.es ?? '8') as SparsityKey;
  let size = (root.dataset.size ?? '1.6B') as Size;
  const pool = root.querySelector<HTMLElement>('[data-er-pool]')!;
  const poolCells = [...pool.querySelectorAll<HTMLElement>('i')];
  const poolSub = root.querySelector<HTMLElement>('[data-er-pool-sub]')!;
  const readout = root.querySelector<HTMLElement>('[data-er-readout] > span')!;
  const replay = root.querySelector<HTMLButtonElement>('[data-er-replay]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-er-dist]')!;
  const tickGroup = svg.querySelector<SVGGElement>('[data-er-ticks]')!;
  const bars = [...svg.querySelectorAll<SVGGElement>('.er-bar')];
  const meanGroup = svg.querySelector<SVGGElement>('[data-er-mean]')!;
  const meanLabel = svg.querySelector<SVGTextElement>('[data-er-mean-label]')!;
  const randomGroup = svg.querySelector<SVGGElement>('[data-er-random-mean]')!;
  const randomLabel = svg.querySelector<SVGTextElement>('[data-er-random-label]')!;
  const breaks = [...svg.querySelectorAll<SVGGElement>('[data-er-break]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('.er-dot')];
  const rows = [...root.querySelectorAll<HTMLElement>('.er-row[data-es]')];
  const tableRows = [...root.querySelectorAll<HTMLTableRowElement>('tbody tr[data-es]')];
  let current = distLayout(es, size);
  let cancelBars = () => {};
  let timers: number[] = [];

  bindTooltips(root);
  replay.hidden = false;

  // ---- Expert pool ----
  const clearTimers = () => { for (const timer of timers) clearTimeout(timer); timers = []; };
  function setPool(animate: boolean) {
    clearTimers();
    const state = poolStates(es, size);
    const experts = state.experts;
    const shape = poolShape[experts] ?? { cols: 16, cell: 12 };
    pool.style.setProperty('--cols', String(shape.cols));
    pool.style.setProperty('--er-cell', `${shape.cell}px`);
    pool.dataset.experts = String(experts);
    pool.setAttribute('aria-label', text.poolSub(experts));
    poolSub.textContent = text.poolSub(experts);
    poolCells.forEach((cell, index) => { cell.hidden = index >= experts; });
    if (!animate || reducedMotion()) {
      poolCells.forEach((cell, index) => { const value = state.states[index]; if (value) cell.dataset.v = value; else delete cell.dataset.v; });
      root.dataset.phase = '2';
      pool.classList.remove('is-playing');
      return;
    }
    // Reset instantly, then visit 1 picks its experts one by one, then visit 2
    // picks again: reused experts turn two-tone, new ones coral.
    pool.classList.add('is-reset');
    pool.classList.remove('is-playing');
    for (const cell of poolCells) delete cell.dataset.v;
    root.dataset.phase = '0';
    void pool.offsetWidth;
    pool.classList.remove('is-reset');
    const pace = 55;
    const later = (delay: number, action: () => void) => { timers.push(window.setTimeout(action, delay)); };
    later(180, () => { root.dataset.phase = '1'; });
    state.first.forEach((index, order) => later(180 + order * pace, () => { const cell = poolCells[index]; if (cell) cell.dataset.v = '1'; }));
    const second = 180 + k * pace + 520;
    later(second, () => { root.dataset.phase = '2'; pool.classList.add('is-playing'); });
    state.second.forEach((index, order) => later(second + order * pace, () => {
      const cell = poolCells[index];
      if (cell) cell.dataset.v = state.kept.includes(index) ? 'b' : '2';
    }));
  }

  // ---- Distribution ----
  function drawTicks(layout: typeof current) {
    tickGroup.replaceChildren(...layout.ticks.map(tick => {
      const group = document.createElementNS(svgNamespace, 'g');
      const line = document.createElementNS(svgNamespace, 'line');
      for (const [key, value] of Object.entries({ class: 'grid', x1: dist.left, x2: dist.width - dist.right, y1: tick.y, y2: tick.y })) line.setAttribute(key, String(value));
      const label = document.createElementNS(svgNamespace, 'text');
      for (const [key, value] of Object.entries({ x: dist.left - 7, y: tick.y + 4.5, 'text-anchor': 'end' })) label.setAttribute(key, String(value));
      label.textContent = tick.label;
      group.append(line, label);
      return group;
    }));
  }

  function placeLabels(layout: typeof current) {
    meanLabel.textContent = meanLabelText(text, es, layout.mean);
    randomLabel.textContent = text.randomLabel(layout.randomMean);
    const place = meanLabels(layout, meanLabel.textContent, randomLabel.textContent);
    meanLabel.setAttribute('x', String(place.measured.x));
    meanLabel.setAttribute('text-anchor', place.measured.anchor);
    randomLabel.setAttribute('x', String(place.random.x));
    randomLabel.setAttribute('text-anchor', place.random.anchor);
  }

  function setDistribution(animate: boolean) {
    const next = distLayout(es, size);
    const previous = current;
    if (next.maximum !== previous.maximum) drawTicks(next);
    placeLabels(next);
    breaks.forEach((mark, index) => mark.toggleAttribute('data-on', next.bars[index]?.random.clipped ?? false));
    bars.forEach((bar, index) => {
      const value = next.bars[index]!;
      const tip = text.barTip(value.shared, value.measured.share, value.random.share);
      bar.dataset.tip = tip;
      bar.setAttribute('aria-label', tip.replaceAll('\n', '; '));
    });
    cancelBars();
    const rectangles = bars.map(bar => [bar.querySelector<SVGRectElement>('.er-bar-random')!, bar.querySelector<SVGRectElement>('.er-bar-measured')!] as const);
    const step = (progress: number) => {
      rectangles.forEach(([random, measured], index) => {
        const from = previous.bars[index]!;
        const to = next.bars[index]!;
        const randomY = lerp(from.random.y, to.random.y, progress);
        const measuredY = lerp(from.measured.y, to.measured.y, progress);
        random.setAttribute('y', randomY.toFixed(2));
        random.setAttribute('height', Math.max(0, next.baseline - randomY).toFixed(2));
        measured.setAttribute('y', measuredY.toFixed(2));
        measured.setAttribute('height', Math.max(0, next.baseline - measuredY).toFixed(2));
      });
      meanGroup.setAttribute('transform', `translate(${lerp(previous.meanX, next.meanX, progress).toFixed(2)} 0)`);
      randomGroup.setAttribute('transform', `translate(${lerp(previous.randomX, next.randomX, progress).toFixed(2)} 0)`);
    };
    cancelBars = tween(animate ? 560 : 0, step);
    current = next;
  }

  // ---- Selection ----
  function select(nextEs: SparsityKey, nextSize: Size, animate = true) {
    const changedPool = nextEs !== es || nextSize !== size;
    es = nextEs;
    size = nextSize;
    root.dataset.es = es;
    root.dataset.size = size;
    root.style.setProperty('--c', sizeColor[size]);
    setEs(es, false);
    setSize(size, false);
    for (const dot of dots) dot.setAttribute('aria-pressed', String(dot.dataset.es === es && dot.dataset.size === size));
    for (const row of rows) row.toggleAttribute('data-active', row.dataset.es === es);
    for (const row of tableRows) row.toggleAttribute('data-highlight', row.dataset.es === es && row.dataset.size === size);
    readout.innerHTML = text.readout(size, es, cells[es][size].mean, randomMean(expertsOf(es)));
    if (changedPool) { setDistribution(animate); setPool(animate); }
  }

  // bindSegmented returns a setter; a silent flag keeps programmatic updates from re-entering select().
  let silent = false;
  const esSetter = bindSegmented(root.querySelector('[data-er-es]')!, value => { if (!silent) select(value as SparsityKey, size); });
  const sizeSetter = bindSegmented(root.querySelector('[data-er-size]')!, value => { if (!silent) select(es, value as Size); });
  function setEs(value: string, notify: boolean) { silent = !notify; esSetter(value); silent = false; }
  function setSize(value: string, notify: boolean) { silent = !notify; sizeSetter(value); silent = false; }
  for (const dot of dots) dot.addEventListener('click', () => select(dot.dataset.es as SparsityKey, dot.dataset.size as Size));
  replay.addEventListener('click', () => setPool(true));

  root.style.setProperty('--c', sizeColor[size]);
  armReveal(root);
  const detail = root.querySelector<HTMLElement>('.er-detail')!;
  if (detail.dataset.reveal === 'armed') detail.addEventListener('smelt:reveal', () => setPool(true), { once: true });
}
