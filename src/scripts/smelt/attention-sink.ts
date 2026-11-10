// Figure 18 (attention-sink): scale selector, linked hover between the two
// visits of a physical layer, and a playhead that sweeps the execution trace.
import { bindSegmented, bindTooltips, hideTooltip, reducedMotion, showTooltip, tween } from './kit';
import { copy, heads, plotSpan, sinkMarkup, summary, type Variant } from '../../lib/smelt/attention-sink';
import { lerp } from '../../lib/smelt/plot';

function init(root: HTMLElement) {
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = copy[language];
  const uid = root.dataset.uid || 'sink';
  let size = root.dataset.size || '1.6B';
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-variant]')];
  const plot = root.querySelector<HTMLElement>('.sink-plot');
  let cancelSweep = () => {};
  let cancelStats = () => {};
  let swept = false;

  const bindPoints = (svg: SVGSVGElement) => {
    const link = (element: Element, on: boolean) => {
      const layer = (element as HTMLElement).dataset.layer;
      svg.classList.toggle('has-focus', on);
      element.classList.toggle('is-active', on);
      if (!layer) return;
      for (const node of svg.querySelectorAll(`[data-layer="${layer}"], [data-link="${layer}"]`)) node.classList.toggle('is-linked', on);
    };
    bindTooltips(svg, element => link(element, true), element => link(element, false));
  };

  // Keyboard: one tab stop per series (roving tabindex). Left / right step along
  // a series; up / down jump to the nearest point of the next series.
  const seriesOrder = ['base', 'v1', 'v2'] as const;
  const bindKeys = (svg: SVGSVGElement) => svg.addEventListener('keydown', event => {
    const point = (event.target as Element).closest<SVGGElement>('.sink-point');
    if (!point || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const series = point.dataset.series as typeof seriesOrder[number];
    const list = (name: string) => [...svg.querySelectorAll<SVGGElement>(`.sink-point[data-series="${name}"]`)];
    let next: SVGGElement | undefined;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
      const points = list(series);
      const index = points.indexOf(point);
      next = event.key === 'Home' ? points[0] : event.key === 'End' ? points.at(-1) : points[index + (event.key === 'ArrowRight' ? 1 : -1)];
    } else {
      const position = seriesOrder.indexOf(series);
      const name = seriesOrder[(position + (event.key === 'ArrowDown' ? 1 : seriesOrder.length - 1)) % seriesOrder.length]!;
      const x = Number(point.dataset.x);
      const layer = point.dataset.layer ?? point.dataset.layerBase;
      const candidates = list(name);
      next = candidates.find(candidate => (candidate.dataset.layer ?? candidate.dataset.layerBase) === layer && name !== 'base' && series !== 'base')
        ?? candidates.reduce<SVGGElement | undefined>((best, candidate) => !best || Math.abs(Number(candidate.dataset.x) - x) < Math.abs(Number(best.dataset.x) - x) ? candidate : best, undefined);
    }
    event.preventDefault();
    if (!next || next === point) return;
    for (const other of list(next.dataset.series ?? '')) other.setAttribute('tabindex', '-1');
    next.setAttribute('tabindex', '0');
    if (next.dataset.series === series) point.setAttribute('tabindex', '-1');
    next.focus();
  });

  const sweepState = (svg: SVGSVGElement, progress: number) => {
    const [left, right] = plotSpan(svg.dataset.variant as Variant);
    const position = lerp(left, right, progress);
    svg.querySelector('[data-sweep]')?.setAttribute('width', (progress >= 1 ? 2000 : position + 6).toFixed(1));
    svg.querySelector('[data-playhead]')?.setAttribute('cx', position.toFixed(1));
    const cursor = svg.querySelector('[data-cursor]');
    cursor?.setAttribute('x1', position.toFixed(1));
    cursor?.setAttribute('x2', position.toFixed(1));
    for (const band of svg.querySelectorAll<SVGRectElement>('[data-segment]')) {
      const start = Number(band.getAttribute('x'));
      const end = start + Number(band.getAttribute('width'));
      band.classList.toggle('is-passing', progress < 1 && position >= start && position <= end + 1);
    }
  };

  const sweep = (duration: number) => {
    cancelSweep();
    if (reducedMotion()) { for (const svg of svgs) sweepState(svg, 1); root.classList.remove('is-sweeping'); return; }
    root.classList.add('is-sweeping');
    cancelSweep = tween(duration, progress => { for (const svg of svgs) sweepState(svg, progress); }, () => {
      for (const svg of svgs) sweepState(svg, 1);
      root.classList.remove('is-sweeping');
    });
  };

  const render = () => {
    for (const svg of svgs) {
      const variant = svg.dataset.variant as Variant;
      svg.innerHTML = sinkMarkup(language, size, variant, `${uid}-${variant === 'wide' ? 'w' : 'n'}`);
      svg.setAttribute('aria-label', text.aria(size));
      bindPoints(svg);
    }
    syncTables();
  };

  // The disclosure shows the table that matches the visible view.
  function syncTables() {
    const view = root.dataset.view || 'depth';
    for (const table of root.querySelectorAll<HTMLElement>('[data-sink-table]')) table.hidden = view !== 'depth' || table.dataset.sinkTable !== size;
    const headsTable = root.querySelector<HTMLElement>('[data-sink-heads-table]');
    if (headsTable) headsTable.hidden = view !== 'heads';
  }

  const updateStats = (from: ReturnType<typeof summary>) => {
    const to = summary(size);
    const block = root.querySelector<HTMLElement>('[data-stat="block"]');
    const change = root.querySelector<HTMLElement>('[data-stat="change"]');
    const count = root.querySelector<HTMLElement>('[data-stat="count"]');
    if (count) count.textContent = `${to.lower} / ${to.total}`;
    cancelStats();
    cancelStats = tween(520, progress => {
      const v1 = lerp(from.visit1, to.visit1, progress);
      const v2 = lerp(from.visit2, to.visit2, progress);
      const delta = lerp(from.change, to.change, progress);
      if (block) block.textContent = `${v1.toFixed(2)} → ${v2.toFixed(2)}`;
      if (change) change.textContent = `${delta >= 0 ? '+' : '−'}${Math.abs(delta * 100).toFixed(0)}%`;
    });
  };

  for (const svg of svgs) { bindPoints(svg); bindKeys(svg); }
  const group = root.querySelector('[data-sink-size]');
  if (group) bindSegmented(group, value => {
    const previous = summary(size);
    size = value;
    root.dataset.size = value;
    render();
    updateStats(previous);
    if (swept) sweep(1100);
    else for (const svg of svgs) sweepState(svg, 1);
  });

  // Depth view vs per-head view.
  const panes = [...root.querySelectorAll<HTMLElement>('[data-sink-pane]')];
  const viewGroup = root.querySelector('[data-sink-view]');
  if (viewGroup) bindSegmented(viewGroup, value => {
    root.dataset.view = value;
    root.dataset.toggled = '';
    for (const pane of panes) pane.hidden = pane.dataset.sinkPane !== value;
    syncTables();
    hideTooltip();
    if (value === 'depth' && swept) sweep(900);
  });
  // Per-head maps: hover a cell, or focus a map and step with the arrow keys.
  // The same (layer, head) cell is outlined in both maps.
  const headMap = root.querySelector<HTMLElement>('[data-sink-heads]');
  const layerCount = heads.layers.length;
  let hoveredCells: Element[] = [];
  let active: [number, number] = [0, 0];
  const clearCells = () => { for (const node of hoveredCells) node.classList.remove('is-hover'); hoveredCells = []; };
  const cellTip = (layerIndex: number, head: number) => {
    const v1 = heads.visit1[layerIndex]?.[head] ?? 0;
    const v2 = heads.visit2[layerIndex]?.[head] ?? 0;
    const delta = v2 - v1;
    return [text.tipHead(heads.layers[layerIndex] ?? 0, head), text.tipHeadVisit(1, v1.toFixed(3)), text.tipHeadVisit(2, v2.toFixed(3)), text.tipHeadDelta(`${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(3)}`)].join('\n');
  };
  const highlight = (layerIndex: number, head: number) => {
    clearCells();
    hoveredCells = headMap ? [...headMap.querySelectorAll(`i[data-cell="${layerIndex}-${head}"]`)] : [];
    for (const node of hoveredCells) node.classList.add('is-hover');
  };
  headMap?.addEventListener('pointermove', event => {
    const cell = (event.target as Element).closest<HTMLElement>('i[data-cell]');
    if (!cell) { clearCells(); hideTooltip(); return; }
    const [layerIndex, head] = (cell.dataset.cell ?? '0-0').split('-').map(Number) as [number, number];
    highlight(layerIndex, head);
    showTooltip(cellTip(layerIndex, head), event);
  });
  headMap?.addEventListener('pointerleave', () => {
    const focused = document.activeElement?.closest?.('[data-heads-grid]');
    if (focused && headMap.contains(focused)) { showActive(focused as HTMLElement); return; }
    clearCells(); hideTooltip();
  });
  function showActive(grid: HTMLElement) {
    const [layerIndex, head] = active;
    highlight(layerIndex, head);
    const cell = grid.querySelector(`i[data-cell="${layerIndex}-${head}"]`);
    if (cell) showTooltip(cellTip(layerIndex, head), cell);
  }
  for (const grid of root.querySelectorAll<HTMLElement>('[data-heads-grid]')) {
    grid.addEventListener('focus', () => showActive(grid));
    grid.addEventListener('blur', () => { clearCells(); hideTooltip(); });
    grid.addEventListener('keydown', event => {
      let [layerIndex, head] = active;
      switch (event.key) {
        case 'ArrowLeft': head = Math.max(0, head - 1); break;
        case 'ArrowRight': head = Math.min(heads.nHeads - 1, head + 1); break;
        case 'ArrowUp': layerIndex = Math.max(0, layerIndex - 1); break;
        case 'ArrowDown': layerIndex = Math.min(layerCount - 1, layerIndex + 1); break;
        case 'Home': head = 0; break;
        case 'End': head = heads.nHeads - 1; break;
        case 'PageUp': layerIndex = 0; break;
        case 'PageDown': layerIndex = layerCount - 1; break;
        case 'Escape': hideTooltip(); return;
        default: return;
      }
      event.preventDefault();
      active = [layerIndex, head];
      showActive(grid);
    });
  }

  // Never print (or leave behind) a half-swept chart.
  addEventListener('beforeprint', () => { cancelSweep(); for (const svg of svgs) sweepState(svg, 1); root.classList.remove('is-sweeping'); });

  // Play the sweep once, the first time the chart scrolls into view.
  if (!reducedMotion() && 'IntersectionObserver' in window && plot) {
    for (const svg of svgs) sweepState(svg, 0);
    root.classList.add('is-sweeping');
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      swept = true;
      sweep(2000);
    }, { threshold: 0.4 });
    observer.observe(plot);
  } else {
    swept = true;
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-attention-sink]')) init(root);
