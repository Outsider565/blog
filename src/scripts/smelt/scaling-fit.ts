// Figure 6 (ScalingFit): sliders evaluate both fitted laws; hovering a term links
// to SmeltFormula. The server render already holds the default state.
import data from '../../data/smelt/scaling-fit.json';
import { scalingFitCopy } from '../../lib/smelt/scaling-fit-copy';
import { archs, barFraction, formatParam, fromSlider, isTermKey, playground, playParams, signedFixed, sliderFraction, supHtml, termEvent, terms, toSlider, type Arch, type Law, type PlayParam, type TermKey, type TermState, type Terms } from '../../lib/smelt/scaling-fit';
import { armReveal, bindTooltips, hideTooltip } from './kit';

const laws = data.coefficients as Record<Arch, Law>;
const span = playground.maxLoss - playground.breakAt;
let counter = 0;

for (const root of document.querySelectorAll<HTMLElement>('[data-scaling-fit]')) {
  const text = scalingFitCopy[root.dataset.language === 'en' ? 'en' : 'zh'];
  const source = `scaling-fit-${counter++}`;
  const values: Record<PlayParam, number> = { F: data.default.F, S: data.default.S, D: data.default.D };
  const sliders = new Map<PlayParam, { input: HTMLInputElement; output: HTMLOutputElement }>();
  for (const param of playParams) {
    const wrap = root.querySelector<HTMLElement>(`.sf-slider[data-param="${param}"]`);
    const input = wrap?.querySelector<HTMLInputElement>('[data-input]');
    const output = wrap?.querySelector<HTMLOutputElement>('[data-output]');
    if (input && output) sliders.set(param, { input, output });
  }
  const readout = root.querySelector<HTMLElement>('[data-readout]');
  const archName = (arch: Arch) => arch === 'baseline' ? text.base : text.loop;

  function render() {
    const split = Object.fromEntries(archs.map(arch => [arch, terms(laws[arch], values.F, values.S, values.D)])) as Record<Arch, Terms>;
    for (const arch of archs) {
      const row = root.querySelector<HTMLElement>(`.sf-bar-row[data-arch="${arch}"]`);
      if (!row) continue;
      const t = split[arch];
      const geometry: Record<TermKey, [number, number, number]> = {
        E: [0, barFraction(t.E), t.E],
        capacity: [barFraction(t.E), t.capacity / span, t.capacity],
        data: [barFraction(t.E + t.capacity), t.data / span, t.data],
      };
      for (const segment of row.querySelectorAll<HTMLElement>('[data-seg]')) {
        const term = segment.dataset.seg;
        if (!isTermKey(term)) continue;
        const [x, w, value] = geometry[term];
        segment.style.setProperty('--x', x.toFixed(5));
        segment.style.setProperty('--w', w.toFixed(5));
        segment.dataset.tip = text.segmentTip(term, archName(arch), value.toFixed(4));
      }
      const total = row.querySelector<HTMLElement>('[data-total]');
      if (total) { total.textContent = t.total.toFixed(4); total.style.setProperty('--end', barFraction(t.total).toFixed(5)); }
    }
    const gaps: Record<TermKey | 'total', [number, number]> = {
      E: [split.baseline.E, split.smelt.E],
      capacity: [split.baseline.capacity, split.smelt.capacity],
      data: [split.baseline.data, split.smelt.data],
      total: [split.baseline.total, split.smelt.total],
    };
    for (const row of root.querySelectorAll<HTMLElement>('[data-delta]')) {
      const key = row.dataset.delta as TermKey | 'total';
      const entry = gaps[key];
      if (!entry) continue;
      const [baseValue, loopValue] = entry;
      const gap = 1000 * (baseValue - loopValue);
      const width = Math.min(1, Math.abs(gap) / playground.deltaRange) * 0.5;
      const bar = row.querySelector<HTMLElement>('.sf-delta-bar');
      if (bar) {
        bar.style.setProperty('--l', (gap >= 0 ? 0.5 : 0.5 - width).toFixed(4));
        bar.style.setProperty('--w', width.toFixed(4));
        bar.classList.toggle('is-negative', gap < 0);
      }
      const value = row.querySelector<HTMLElement>('[data-value]');
      if (value) value.textContent = signedFixed(gap, 1);
      row.dataset.tip = text.deltaTip(key, baseValue.toFixed(4), loopValue.toFixed(4), signedFixed(gap, 1));
    }
    if (readout) {
      const gap = 1000 * (split.baseline.total - split.smelt.total);
      readout.textContent = text.readout(split.baseline.total.toFixed(4), split.smelt.total.toFixed(4), gap);
    }
  }

  // While a thumb is dragged the bars follow it directly; Reset and keyboard
  // steps keep the 520 ms glide.
  const endScrub = () => root.classList.remove('is-scrubbing');
  let frame = 0;
  for (const [param, { input, output }] of sliders) {
    input.addEventListener('pointerdown', () => root.classList.add('is-scrubbing'));
    input.addEventListener('pointerup', endScrub);
    input.addEventListener('pointercancel', endScrub);
    input.addEventListener('change', endScrub);
    input.addEventListener('input', () => {
      values[param] = fromSlider(param, Number(input.value));
      const label = formatParam(param, values[param]);
      output.innerHTML = supHtml(label);
      input.setAttribute('aria-valuetext', label);
      input.style.setProperty('--fill', `${(100 * sliderFraction(param, values[param])).toFixed(2)}%`);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
  }
  root.querySelector('[data-reset]')?.addEventListener('click', () => {
    for (const [param, { input, output }] of sliders) {
      values[param] = data.default[param];
      input.value = String(toSlider(param, values[param]));
      const label = formatParam(param, values[param]);
      output.innerHTML = supHtml(label);
      input.setAttribute('aria-valuetext', label);
      input.style.setProperty('--fill', `${(100 * sliderFraction(param, values[param])).toFixed(2)}%`);
    }
    endScrub();
    render();
  });

  // ---- linked highlighting ----
  let pinned: TermKey | null = null;
  let hover: TermKey | null = null;
  const show = () => {
    const active = hover ?? pinned;
    if (active) root.dataset.term = active; else delete root.dataset.term;
  };
  const broadcast = (term: TermKey | null) => {
    hover = term;
    show();
    document.dispatchEvent(new CustomEvent<TermState>(termEvent, { detail: { hover, pinned, source } }));
  };
  document.addEventListener(termEvent, event => {
    const detail = (event as CustomEvent<TermState>).detail;
    if (detail.source === source) return;
    hover = detail.hover;
    pinned = detail.pinned;
    show();
  });
  const termOf = (element: Element) => {
    const term = (element as HTMLElement).dataset.term;
    return isTermKey(term) ? term : null;
  };
  bindTooltips(root, element => broadcast(termOf(element)), () => broadcast(null));
  for (const group of root.querySelectorAll<HTMLElement>('.sf-group[data-term]')) {
    const term = termOf(group);
    if (!term) continue;
    group.addEventListener('pointerenter', () => broadcast(term));
    group.addEventListener('pointerleave', () => broadcast(null));
  }
  root.addEventListener('pointerleave', () => hideTooltip());

  root.dataset.ready = '';
  armReveal(root);
}
