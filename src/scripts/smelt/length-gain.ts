// Figure 12 interaction: a left-to-right reveal, during which the short/long half
// means open up from the flat 1.0 line to their measured levels (the headline
// numbers stay at their final values); legend toggles; per-bucket tooltips.
import { bucketTip, halfSegments, halves, ratioLabel, seriesKeys, xAt, type SeriesKey, type Variant } from '../../lib/smelt/length-gain';
import { lerp } from '../../lib/smelt/plot';
import { armReveal, bindTooltips, tween } from './kit';

const isKey = (value: string | undefined): value is SeriesKey => value === 'loop' || value === 'size' || value === 'experts';

for (const root of document.querySelectorAll<HTMLElement>('[data-length-gain]')) {
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-variant]')];
  const visible = new Set<SeriesKey>(seriesKeys);
  const variantOf = (svg: SVGSVGElement): Variant => svg.dataset.variant === 'narrow' ? 'narrow' : 'wide';
  for (const element of root.querySelectorAll<HTMLElement>('[data-js-only]')) element.hidden = false;

  /** Place half-mean segments at a fraction t between flat (1.0) and measured. */
  function openHalves(t: number) {
    for (const svg of svgs) {
      const variant = variantOf(svg);
      for (const key of seriesKeys) {
        const h = halves(key);
        const s = halfSegments(variant, lerp(1, h.short, t), lerp(1, h.long, t));
        const group = svg.querySelector(`.lg-series[data-series="${key}"]`);
        for (const part of ['short', 'long'] as const) {
          const line = group?.querySelector(`.lg-half[data-half="${part}"]`);
          line?.setAttribute('y1', s[part].y.toFixed(2));
          line?.setAttribute('y2', s[part].y.toFixed(2));
        }
        const leader = group?.querySelector('.lg-leader');
        if (leader) leader.setAttribute('d', leader.getAttribute('d')!.replace(/^M([\d.]+) [\d.-]+/, `M$1 ${s.long.y.toFixed(2)}`));
        const label = group?.querySelector('[data-lg-direct-ratio]');
        if (label) label.textContent = ratioLabel(lerp(1, h.ratio, t));
      }
    }
  }

  armReveal(root);
  // Only a rendered variant can reveal; the other one is display: none and stays armed.
  const armed = svgs.some(svg => svg.dataset.reveal === 'armed' && svg.getClientRects().length > 0);
  if (armed) {
    openHalves(0);
    let started = false;
    root.addEventListener('smelt:reveal', () => {
      if (started) return;
      started = true;
      // Overlaps the end of the 900 ms wipe; the segments fade in at about 500 ms.
      window.setTimeout(() => tween(850, openHalves), 400);
    });
  }

  let hovered: SeriesKey | null = null;
  let focused: SeriesKey | null = null;
  function emphasize() {
    const candidate = hovered ?? focused;
    const key = candidate && visible.has(candidate) ? candidate : null; // a hidden curve never dims the others
    for (const svg of svgs) {
      svg.toggleAttribute('data-hover', key !== null);
      for (const group of svg.querySelectorAll<SVGGElement>('.lg-series')) group.toggleAttribute('data-hover', group.dataset.series === key);
    }
    for (const stat of root.querySelectorAll<HTMLElement>('[data-lg-stat]')) stat.toggleAttribute('data-active', stat.dataset.lgStat === key);
  }

  function refreshTips() {
    const keys = seriesKeys.filter(key => visible.has(key));
    for (const col of root.querySelectorAll<SVGGElement>('.lg-col')) col.dataset.tip = bucketTip(Number(col.dataset.index), language, keys);
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-lg-toggle]')) {
    const key = button.dataset.lgToggle;
    if (!isKey(key)) continue;
    button.setAttribute('aria-pressed', 'true');
    button.addEventListener('click', () => {
      const show = !visible.has(key);
      if (!show && visible.size === 1) return; // keep at least one curve on screen
      if (show) visible.add(key); else visible.delete(key);
      button.setAttribute('aria-pressed', String(show));
      for (const group of root.querySelectorAll<SVGGElement>(`.lg-series[data-series="${key}"]`)) group.toggleAttribute('data-hidden', !show);
      root.querySelector(`[data-lg-stat="${key}"]`)?.toggleAttribute('data-hidden', !show);
      refreshTips();
      emphasize();
    });
    // The headline numbers are focusable so keyboard and touch readers (a tap focuses) can see a control's half means.
    const stat = root.querySelector<HTMLElement>(`[data-lg-stat="${key}"]`);
    stat?.setAttribute('tabindex', '0');
    for (const target of [button, stat]) {
      target?.addEventListener('pointerenter', () => { hovered = key; emphasize(); });
      target?.addEventListener('pointerleave', () => { if (hovered === key) hovered = null; emphasize(); });
      // A legend button clicked with the mouse keeps focus; only keyboard focus should keep the curve emphasized.
      target?.addEventListener('focus', () => { if (target !== button || button.matches(':focus-visible')) { focused = key; emphasize(); } });
      target?.addEventListener('blur', () => { if (focused === key) focused = null; emphasize(); });
    }
  }

  function showBucket(element: Element) {
    const svg = element.closest('svg');
    if (!svg) return;
    const index = Number((element as SVGGElement).dataset.index);
    const x = xAt(variantOf(svg), index);
    const guide = svg.querySelector('.lg-guide');
    guide?.setAttribute('x1', x.toFixed(2));
    guide?.setAttribute('x2', x.toFixed(2));
    guide?.setAttribute('visibility', 'visible');
    svg.querySelectorAll('.lg-dot').forEach(dot => dot.toggleAttribute('data-active', Number((dot as SVGElement).dataset.index) === index));
  }
  function hideBucket(element: Element) {
    const svg = element.closest('svg');
    svg?.querySelector('.lg-guide')?.setAttribute('visibility', 'hidden');
    svg?.querySelectorAll('.lg-dot[data-active]').forEach(dot => dot.removeAttribute('data-active'));
  }
  bindTooltips(root, showBucket, hideBucket);
}
