// Interaction for the recipe-search figures: choose a setting (buttons, chart
// points), preview on hover, switch sparsity (span only). Every change tweens
// the chart, the schematic and the headline numbers from where they are now.
import { armReveal, bindSegmented, bindTooltips, reducedMotion, tween } from './kit';
import {
  arrowHead, arrowPath, bestLabelOffset, bracketWorse, chartGeometry, copy, defaults, flatPath, formatStat, mix, runs, schematicGeometry,
  spanNumbers, stats, yTicks, type ChartGeometry, type Mode, type SchematicGeometry, type Sparsity, type State, type Stat, type Variant,
} from '../../lib/smelt/recipe-search';

const duration = 560;
const all = <T extends Element>(scope: ParentNode, selector: string) => [...scope.querySelectorAll<T>(selector)];
const set = (element: Element | null | undefined, attributes: Record<string, string | number>) => {
  if (!element) return;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, typeof value === 'number' ? value.toFixed(2) : value);
};

interface ChartRefs {
  svg: SVGSVGElement;
  variant: Variant;
  geometry: ChartGeometry;
  points: Map<string, SVGGElement>;
  lines: { base: SVGPathElement | null; loop: SVGPathElement | null };
  ref: SVGLineElement | null;
  refLabel: SVGTextElement | null;
  column: SVGRectElement | null;
  bracket: SVGGElement | null;
  bracketLine: SVGPathElement | null;
  best: SVGCircleElement[];
  bestLabels: SVGTextElement[];
  grid: SVGLineElement[];
  yLabels: SVGTextElement[];
}

function setup(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = 'true';
  const mode = (root.dataset.mode ?? 'span') as Mode;
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = copy[language];
  let committed: State = { mode, key: Number(root.dataset.key ?? defaults[mode]), sparsity: (root.dataset.sparsity === '95' ? '95' : '85') as Sparsity };
  let shown: State = committed;

  const charts: ChartRefs[] = all<SVGSVGElement>(root, '.rs-chart').map(svg => {
    const variant = (svg.dataset.variant === 'narrow' ? 'narrow' : 'wide') as Variant;
    return {
      svg, variant, geometry: chartGeometry(committed, variant),
      points: new Map(all<SVGGElement>(svg, '[data-rs-point]').map(point => [point.dataset.rsPoint ?? '', point])),
      lines: { base: svg.querySelector('[data-rs-line="base"]'), loop: svg.querySelector('[data-rs-line="loop"]') },
      ref: svg.querySelector('[data-rs-ref]'), refLabel: svg.querySelector('[data-rs-ref-label]'),
      column: svg.querySelector('[data-rs-column]'),
      bracket: svg.querySelector('[data-rs-bracket]'), bracketLine: svg.querySelector('[data-rs-bracket-line]'),
      best: all<SVGCircleElement>(svg, '[data-rs-best]'), bestLabels: all<SVGTextElement>(svg, '[data-rs-best-label]'),
      grid: all<SVGLineElement>(svg, '[data-rs-grid]'), yLabels: all<SVGTextElement>(svg, '[data-rs-ytick]'),
    };
  });

  const schematicSvg = root.querySelector<SVGSVGElement>('[data-rs-schematic]');
  const slabs = schematicSvg ? all<SVGRectElement>(schematicSvg, '[data-rs-slab]') : [];
  const ghosts = schematicSvg ? all<SVGRectElement>(schematicSvg, '[data-rs-ghost]') : [];
  const numbers = schematicSvg ? all<SVGTextElement>(schematicSvg, '[data-rs-number]') : [];
  const visits = schematicSvg ? all<SVGTextElement>(schematicSvg, '[data-rs-visit]') : [];
  const missing = schematicSvg ? all<SVGTextElement>(schematicSvg, '[data-rs-missing]') : [];
  const arrow = schematicSvg?.querySelector<SVGGElement>('[data-rs-arrow]');
  const arrowLine = schematicSvg?.querySelector('[data-rs-arrow-path]');
  const arrowTip = schematicSvg?.querySelector('[data-rs-arrow-head]');
  const arrowLabel = schematicSvg?.querySelector('[data-rs-arrow-label]');
  const tokenPath = schematicSvg?.querySelector('[data-rs-token-path]');
  const caption = schematicSvg?.querySelector('[data-rs-caption]');
  let schematic: SchematicGeometry = schematicGeometry(committed);

  const statValues = all<HTMLElement>(root, '[data-rs-stat]');
  const statLabels = all<HTMLElement>(root, '[data-rs-stat-label]');
  let statNow: (number | null)[] = stats(committed, language).map(stat => stat.value);
  const readout = root.querySelector<HTMLElement>('[data-rs-readout]');
  const live = root.querySelector<HTMLElement>('[data-rs-live]');
  const note = root.querySelector<HTMLElement>('[data-rs-note]');
  const rows = all<HTMLTableRowElement>(root, '[data-rs-row]');

  const drawChart = (chart: ChartRefs) => {
    const geometry = chart.geometry;
    for (const point of geometry.points) chart.points.get(point.id)?.setAttribute('transform', `translate(${point.cx.toFixed(2)} ${point.cy.toFixed(2)})`);
    if (chart.lines.loop) chart.lines.loop.setAttribute('d', flatPath(geometry.lines.loop));
    if (chart.lines.base && geometry.lines.base.length) chart.lines.base.setAttribute('d', flatPath(geometry.lines.base));
    set(chart.ref, { y1: geometry.ref.y, y2: geometry.ref.y });
    set(chart.refLabel, { y: geometry.ref.labelY });
    set(chart.column, { x: geometry.column.x, width: geometry.column.width });
    const bracket = geometry.bracket;
    set(chart.bracket, { opacity: bracket.opacity });
    set(chart.bracketLine, { d: `M${(bracket.x - 3).toFixed(2)} ${bracket.y1.toFixed(2)}H${(bracket.x + 3).toFixed(2)}M${bracket.x.toFixed(2)} ${bracket.y1.toFixed(2)}V${bracket.y2.toFixed(2)}M${(bracket.x - 3).toFixed(2)} ${bracket.y2.toFixed(2)}H${(bracket.x + 3).toFixed(2)}` });
    geometry.best.forEach((best, index) => {
      set(chart.best[index], { cx: best.x, cy: best.y });
      set(chart.bestLabels[index], { x: best.x, y: best.y + bestLabelOffset });
    });
    geometry.yTicks.forEach((y, index) => {
      set(chart.grid[index], { y1: y, y2: y });
      set(chart.yLabels[index], { y: y + 4.5 });
    });
  };

  const drawSchematic = (geometry: SchematicGeometry) => {
    geometry.slabs.forEach((slab, index) => set(slabs[index], { x: slab.x, y: slab.y, width: slab.w, height: Math.max(0, slab.h), opacity: slab.o }));
    geometry.ghosts.forEach((ghost, index) => set(ghosts[index], { x: ghost.x, y: ghost.y, width: ghost.w, height: Math.max(0, ghost.h), opacity: ghost.o }));
    if (arrow) {
      set(arrow, { opacity: geometry.arrow.o });
      set(arrowLine, { d: arrowPath(geometry.arrow) });
      set(arrowTip, { d: arrowHead(geometry.arrow) });
      set(arrowLabel, { x: geometry.arrow.right + 25, y: (geometry.arrow.top + geometry.arrow.bottom) / 2 + 5 });
    }
    geometry.numbers.forEach((number, index) => set(numbers[index], { y: number.y, opacity: number.o }));
    geometry.visits.forEach((visit, index) => set(visits[index], { y: visit.y, opacity: visit.o }));
    geometry.missing.forEach((value, index) => set(missing[index], { opacity: value }));
  };

  const drawStats = (list: Stat[], values: (number | null)[]) => {
    list.forEach((stat, index) => {
      const element = statValues[index];
      if (element) element.textContent = formatStat(stat, values[index] ?? null);
    });
  };

  let cancel = () => {};
  const show = (next: State, animate = true) => {
    const previous = shown;
    shown = next;
    const sparsityChanged = previous.sparsity !== next.sparsity;

    // Discrete changes first: selection classes, labels, text.
    const nextRuns = runs(mode, next.sparsity);
    for (const chart of charts) {
      for (const run of nextRuns) {
        const point = chart.points.get(run.id);
        if (!point) continue;
        const selected = run.key === next.key;
        point.classList.toggle('is-selected', selected);
        point.setAttribute('aria-pressed', String(selected));
        if (sparsityChanged) {
          const tip = text.tip(mode, run, next.sparsity);
          point.dataset.tip = tip;
          point.setAttribute('aria-label', tip.replaceAll('\n', language === 'zh' ? '；' : '; '));
        }
      }
      chart.bracket?.classList.toggle('is-worse', bracketWorse(next));
      for (const tick of chart.svg.querySelectorAll<SVGTextElement>('[data-rs-xtick]')) tick.classList.toggle('is-selected', Number(tick.dataset.rsXtick) === next.key);
      if (sparsityChanged) {
        const refRun = nextRuns[0];
        if (chart.refLabel && refRun) chart.refLabel.textContent = text.ref(refRun.loss.toFixed(4));
        const ticks = yTicks(next.sparsity);
        for (const label of chart.yLabels) label.style.opacity = '0';
        setTimeout(() => chart.yLabels.forEach((label, index) => { label.textContent = (ticks[index] ?? 0).toFixed(2); label.style.opacity = ''; }), reducedMotion() ? 0 : 200);
      }
    }
    const nextSchematic = schematicGeometry(next);
    nextSchematic.kinds.forEach((kind, index) => slabs[index]?.setAttribute('data-kind', kind));
    if (tokenPath && nextSchematic.token) tokenPath.setAttribute('d', nextSchematic.token);
    if (caption) caption.textContent = text.schematicCaption(next);
    if (mode === 'span') spanNumbers(next.key).forEach((value, index) => { if (numbers[index]) numbers[index].textContent = value; });
    if (mode === 'aspect') {
      const aspectRuns = runs('aspect');
      [0, 1].forEach(index => {
        const run = aspectRuns.find(item => item.series === (index === 0 ? 'base' : 'loop') && item.key === next.key);
        const physical = root.querySelector(`[data-rs-physical="${index}"]`);
        const executed = root.querySelector(`[data-rs-executed="${index}"]`);
        if (physical) physical.textContent = run ? text.physicalLine(run.physical) : '';
        if (executed) executed.textContent = run ? text.executedLine(run.executed) : '';
      });
    }
    const nextStats = stats(next, language);
    nextStats.forEach((stat, index) => {
      const element = statValues[index];
      if (element) {
        element.classList.remove('is-loop', 'is-base', 'is-gain');
        if (stat.tone === 'loop' || stat.tone === 'base' || stat.tone === 'gain') element.classList.add(`is-${stat.tone}`);
      }
      const label = statLabels[index];
      if (label) label.textContent = stat.label;
    });
    if (readout) readout.textContent = text.readout(next);
    if (note && mode === 'span') note.textContent = next.key === 0 ? text.noLoopNote : text.schematicNote.span;
    for (const row of rows) {
      const match = Number(row.dataset.rsRow) === next.key
        && (mode !== 'span' || row.dataset.group === next.sparsity)
        && (mode !== 'aspect' || row.dataset.series === 'loop');
      row.toggleAttribute('data-highlight', match);
    }

    // Continuous changes: tween from the current geometry.
    cancel();
    const fromCharts = charts.map(chart => chart.geometry);
    const toCharts = charts.map(chart => chartGeometry(next, chart.variant));
    const fromSchematic = schematic;
    const fromStats = statNow;
    const toStats = nextStats.map(stat => stat.value);
    const step = (amount: number) => {
      charts.forEach((chart, index) => { chart.geometry = mix(fromCharts[index]!, toCharts[index]!, amount); drawChart(chart); });
      schematic = mix(fromSchematic, nextSchematic, amount);
      drawSchematic(schematic);
      statNow = toStats.map((value, index) => {
        const from = fromStats[index];
        return value === null || from === null || from === undefined ? value : from + (value - from) * amount;
      });
      drawStats(nextStats, statNow);
    };
    cancel = tween(animate ? duration : 0, step, () => { statNow = toStats; drawStats(nextStats, toStats); });
  };

  // Controls
  let preview: number | null = null;
  const keyGroup = root.querySelector('[data-rs-keys]');
  let chooseKey: (value: string) => void = () => {};
  // Screen readers hear the one-sentence readout once per committed choice, not every preview or tween frame.
  const announce = () => { if (live) live.textContent = text.readout(committed); };
  const select = (key: number) => {
    preview = null;
    if (key === committed.key && shown.key === key) return;
    committed = { ...committed, key };
    show(committed);
    announce();
  };
  if (keyGroup) chooseKey = bindSegmented(keyGroup, value => select(Number(value)));
  const sparsityGroup = root.querySelector('[data-rs-sparsity]');
  if (sparsityGroup) bindSegmented(sparsityGroup, value => {
    const sparsity = (value === '95' ? '95' : '85') as Sparsity;
    if (sparsity === committed.sparsity) return;
    committed = { ...committed, sparsity };
    show({ ...committed, key: shown.key });
    announce();
  });

  // Chart points: hover previews, click / Enter commits.
  let leaveTimer = 0;
  const previewKey = (key: number | null) => {
    window.clearTimeout(leaveTimer);
    if (key === null) {
      leaveTimer = window.setTimeout(() => { preview = null; if (shown.key !== committed.key) show(committed); }, 90);
      return;
    }
    if (preview === key) return;
    preview = key;
    if (shown.key !== key) show({ ...committed, key });
  };
  bindTooltips(root, element => {
    const key = Number((element as HTMLElement).dataset.key);
    if (Number.isFinite(key)) previewKey(key);
  }, () => previewKey(null));
  for (const chart of charts) {
    for (const point of chart.points.values()) {
      const commit = () => { const key = Number(point.dataset.key); chooseKey(String(key)); select(key); };
      point.addEventListener('click', commit);
      point.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); commit(); }
      });
    }
  }

  armReveal(root.parentElement ?? root);

  // Ambient token loop in the span schematic: only while visible, never under reduced motion, and only
  // once the stack has built in (the reveal runs for about a second after the figure scrolls in).
  if (schematicSvg && mode === 'span' && !reducedMotion()) {
    const animations = all<SVGAnimationElement>(schematicSvg, 'animateMotion, animate');
    const settle = 1000;
    const revealed = root.dataset.reveal === 'armed'
      ? new Promise<void>(resolve => root.addEventListener('smelt:reveal', () => window.setTimeout(resolve, settle), { once: true }))
      : Promise.resolve();
    let visible = false;
    let started = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        if (visible && !started) {
          started = true;
          void revealed.then(() => {
            for (const animation of animations) animation.beginElement();
            if (!visible) schematicSvg.pauseAnimations();
          });
        } else if (started) {
          if (visible) schematicSvg.unpauseAnimations(); else schematicSvg.pauseAnimations();
        }
      }
    }, { threshold: 0.2 });
    observer.observe(schematicSvg);
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-recipe-search]')) setup(root);
