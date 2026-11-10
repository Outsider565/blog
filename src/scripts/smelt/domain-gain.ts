// Figure 11 interaction: sparsity switch (bars, dots and ranking glide to the new
// values), linked row highlight, per-source tooltips with a 95% CI whisker.
import data from '../../data/smelt/domain-gain.json';
import { domainCopy, domainMax, familyTip, geometry, layout, pct, sourceTip, sparsityLabels, stats, xScale, type RowLayout, type Variant } from '../../lib/smelt/domain-gain';
import { lerp } from '../../lib/smelt/plot';
import { armReveal, bindSegmented, bindTooltips, tween } from './kit';

interface Chart {
  svg: SVGSVGElement;
  variant: Variant;
  rows: SVGGElement[];
  current: { rows: RowLayout[]; reference: number };
}

for (const root of document.querySelectorAll<HTMLElement>('[data-domain-gain]')) {
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = domainCopy(language);
  for (const element of root.querySelectorAll<HTMLElement>('[data-js-only]')) element.hidden = false;
  let sparsity = data.primary;
  let cancel = () => {};
  const charts: Chart[] = [...root.querySelectorAll<SVGSVGElement>('svg[data-variant]')].map(svg => {
    const variant = svg.dataset.variant === 'narrow' ? 'narrow' : 'wide';
    const rows = data.families.map(family => svg.querySelector<SVGGElement>(`.dg-row[data-family="${family.key}"]`)!);
    return { svg, variant, rows, current: layout(variant, sparsity) };
  });

  function draw(chart: Chart, from: Chart['current'], to: Chart['current'], t: number) {
    const g = geometry[chart.variant];
    chart.rows.forEach((row, index) => {
      const a = from.rows[index]!;
      const b = to.rows[index]!;
      row.setAttribute('transform', `translate(0 ${lerp(a.top, b.top, t).toFixed(2)})`);
      const width = lerp(a.barWidth, b.barWidth, t);
      row.querySelector('.dg-bar')?.setAttribute('width', width.toFixed(2));
      const cap = row.querySelector('.dg-cap');
      cap?.setAttribute('x1', (g.x0 + width).toFixed(2));
      cap?.setAttribute('x2', (g.x0 + width).toFixed(2));
      const value = row.querySelector('.dg-value');
      if (value) value.textContent = pct(lerp(a.mean, b.mean, t));
      row.querySelectorAll<SVGGElement>('.dg-source').forEach((dot, i) => {
        const p = a.dots[i]!;
        const q = b.dots[i]!;
        dot.setAttribute('transform', `translate(${lerp(p.x, q.x, t).toFixed(2)} ${lerp(p.y, q.y, t).toFixed(2)})`);
      });
    });
    const reference = lerp(from.reference, to.reference, t);
    const group = chart.svg.querySelector('[data-dg-reference]');
    group?.querySelectorAll('line').forEach(line => { line.setAttribute('x1', reference.toFixed(2)); line.setAttribute('x2', reference.toFixed(2)); });
    group?.querySelector('text')?.setAttribute('x', reference.toFixed(2));
    group?.querySelector('rect')?.setAttribute('x', (reference - 34).toFixed(2));
  }

  function setStats(previous: number, next: number) {
    const before = stats(previous);
    const after = stats(next);
    const top = root.querySelector('[data-dg-stat="top"]');
    const bottom = root.querySelector('[data-dg-stat="bottom"]');
    const topLabel = root.querySelector('[data-dg-stat-label="top"]');
    const bottomLabel = root.querySelector('[data-dg-stat-label="bottom"]');
    const positive = root.querySelector('[data-dg-stat="positive"]');
    if (topLabel) topLabel.textContent = text.stat1(after.top.label);
    if (bottomLabel) bottomLabel.textContent = text.stat2(after.bottom.label);
    if (positive) positive.textContent = `${after.positive} / ${after.total}`;
    return (t: number) => {
      if (top) top.textContent = pct(lerp(before.topMean, after.topMean, t));
      if (bottom) bottom.textContent = pct(lerp(before.bottomMean, after.bottomMean, t));
    };
  }

  function updateTips(next: number) {
    const aggregate = pct(data.aggregate[next] ?? 0);
    for (const chart of charts) {
      chart.rows.forEach((row, index) => {
        const family = data.families[index]!;
        const hit = row.querySelector<SVGGElement>('.dg-hit');
        if (hit) { hit.dataset.tip = familyTip(family, next, language); hit.setAttribute('aria-label', hit.dataset.tip); }
        row.querySelectorAll<SVGGElement>('.dg-source').forEach((dot, i) => { dot.dataset.tip = sourceTip(family, i, next, language); dot.setAttribute('aria-label', dot.dataset.tip); });
      });
      const reference = chart.svg.querySelector<SVGGElement>('[data-dg-reference]');
      if (reference) {
        reference.dataset.tip = text.referenceTip(aggregate, sparsityLabels[next] ?? '');
        reference.setAttribute('aria-label', reference.dataset.tip);
        const label = reference.querySelector('text');
        if (label) label.textContent = `${text.reference} ${aggregate}`;
      }
    }
  }

  const mix = (a: Chart['current'], b: Chart['current'], t: number): Chart['current'] => ({
    reference: lerp(a.reference, b.reference, t),
    rows: a.rows.map((row, index) => {
      const target = b.rows[index]!;
      return { rank: target.rank, top: lerp(row.top, target.top, t), mean: lerp(row.mean, target.mean, t), barWidth: lerp(row.barWidth, target.barWidth, t), dots: row.dots.map((dot, i) => ({ x: lerp(dot.x, target.dots[i]!.x, t), y: lerp(dot.y, target.dots[i]!.y, t) })) };
    }),
  });

  function choose(next: number) {
    if (next === sparsity) return;
    const previous = sparsity;
    sparsity = next;
    cancel();
    const targets = charts.map(chart => layout(chart.variant, next));
    const starts = charts.map(chart => chart.current);
    const statStep = setStats(previous, next);
    updateTips(next);
    clearFocus();
    cancel = tween(650, t => {
      charts.forEach((chart, index) => {
        chart.current = mix(starts[index]!, targets[index]!, t);
        draw(chart, starts[index]!, targets[index]!, t);
      });
      statStep(t);
    });
  }

  function clearFocus() {
    for (const chart of charts) {
      delete chart.svg.dataset.focus;
      chart.svg.querySelectorAll('[data-active]').forEach(element => element.removeAttribute('data-active'));
      chart.svg.querySelectorAll('.dg-ci, .dg-ci-arrow').forEach(line => line.setAttribute('visibility', 'hidden'));
    }
  }

  function focus(element: Element) {
    const row = element.closest<SVGGElement>('.dg-row');
    const svg = element.closest<SVGSVGElement>('svg');
    if (!row || !svg) return;
    clearFocus();
    svg.dataset.focus = row.dataset.family ?? '';
    row.dataset.active = '';
    if (!element.classList.contains('dg-source')) return;
    element.setAttribute('data-active', '');
    const chart = charts.find(candidate => candidate.svg === svg);
    const family = data.families.find(candidate => candidate.key === row.dataset.family);
    const index = [...row.querySelectorAll('.dg-source')].indexOf(element);
    const source = family?.sources[index];
    const line = row.querySelector('.dg-ci');
    const arrow = row.querySelector('.dg-ci-arrow');
    if (!chart || !source || !line || sparsity !== data.primary) return;
    const x = xScale(chart.variant);
    const y = chart.current.rows[data.families.indexOf(family!)]?.dots[index]?.y ?? 0;
    const high = source.ci[1] ?? 0;
    const end = x(Math.min(high, domainMax));
    line.setAttribute('x1', x(Math.max(0, source.ci[0] ?? 0)).toFixed(2));
    line.setAttribute('x2', end.toFixed(2));
    line.setAttribute('y1', y.toFixed(2));
    line.setAttribute('y2', y.toFixed(2));
    line.setAttribute('visibility', 'visible');
    // The interval runs past the chart edge: end the whisker with an open chevron.
    if (arrow && high > domainMax) {
      arrow.setAttribute('d', `M${(end - 5).toFixed(2)} ${(y - 4).toFixed(2)}L${end.toFixed(2)} ${y.toFixed(2)}L${(end - 5).toFixed(2)} ${(y + 4).toFixed(2)}`);
      arrow.setAttribute('visibility', 'visible');
    }
  }

  // Keyboard: ← → on a focused row (or dot) step through that row's sources, left to right; Esc returns to the row.
  for (const chart of charts) {
    chart.svg.addEventListener('keydown', event => {
      const target = event.target instanceof Element ? event.target : null;
      const row = target?.closest<SVGGElement>('.dg-row');
      if (!target || !row) return;
      const dots = [...row.querySelectorAll<SVGGElement>('.dg-source')];
      if (event.key === 'Escape' && target.classList.contains('dg-source')) {
        row.querySelector<SVGGElement>('.dg-hit')?.focus();
        event.preventDefault();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const layoutRow = chart.current.rows[data.families.findIndex(family => family.key === row.dataset.family)];
      const order = dots.map((_, i) => i).sort((a, b) => (layoutRow?.dots[a]?.x ?? 0) - (layoutRow?.dots[b]?.x ?? 0));
      const forward = event.key === 'ArrowRight';
      const current = order.indexOf(dots.indexOf(target as SVGGElement));
      const position = current < 0 ? (forward ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, current + (forward ? 1 : -1)));
      dots[order[position] ?? 0]?.focus();
      event.preventDefault();
    });
  }

  const group = root.querySelector('[data-dg-sparsity]');
  if (group) bindSegmented(group, value => choose(Number(value)));
  bindTooltips(root, focus, clearFocus);
  armReveal(root);
}
