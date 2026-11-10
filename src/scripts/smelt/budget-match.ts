// Figure 1: step through the budget-matching recipe. Geometry and meters tween
// between states; the expert grid and colours transition in CSS.
import { bindTooltips, reducedMotion, tween } from './kit';
import {
  attention, copy, meterTip, finalStep, formatRatio, headHeight, headVisibility, headX, layerWidth, layers, meterKeys,
  meterPosition, mixShape, panelFields, ratioOf, routedAt, shapeOf, statusText, steps, type FieldKey, type MeterKey, type Shape,
} from '../../lib/smelt/budget-match';
import type { Language } from '../../lib/site';

const MORPH = 650;
const FIRST_DWELL = 1300;
const DWELL = 2400;

interface Meter { root: HTMLElement; value: HTMLElement; fill: HTMLElement; dot: HTMLElement; status: HTMLElement }

function bind(root: HTMLElement) {
  if (root.dataset.bound) return;
  root.dataset.bound = 'true';
  const language: Language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = copy[language];
  const items = [...root.querySelectorAll<HTMLElement>('[data-bm-item]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-bm-step]')];
  const arrows = root.querySelector<HTMLElement>('[data-bm-arrows]');
  const prev = root.querySelector<HTMLButtonElement>('[data-bm-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-bm-next]');
  const stepWord = root.querySelector<HTMLElement>('[data-bm-stepword]');
  const title = root.querySelector<HTMLElement>('[data-bm-title]');
  const body = root.querySelector<HTMLElement>('[data-bm-body]');
  const live = root.querySelector<HTMLElement>('[data-bm-live]');
  const meterRow = root.querySelector<HTMLElement>('.bm-meters');
  // Only the experts that are ever routed change state: data-route lists the sets (a: 192-expert
  // pool, b: 288-expert pool) that route this token to them.
  const routable = [...root.querySelectorAll<SVGRectElement>('[data-route]')];
  const bars = [...root.querySelectorAll<SVGRectElement>('[data-bm-bar]')];
  const ruler = root.querySelector<SVGPathElement>('[data-bm-ruler]');
  const heads = [...root.querySelectorAll<SVGRectElement>('[data-bm-head]')];
  const links = [...root.querySelectorAll<SVGLineElement>('[data-bm-link]')];
  const kvs = [...root.querySelectorAll<SVGRectElement>('[data-bm-kv]')];
  const expertSvgs = [...root.querySelectorAll<SVGSVGElement>('[data-bm-experts]')];
  const fields = [...root.querySelectorAll<HTMLElement>('[data-bm-field]')];
  const meters = new Map<MeterKey, Meter>();
  for (const key of meterKeys) {
    const meter = root.querySelector<HTMLElement>(`[data-bm-meter="${key}"]`);
    const value = meter?.querySelector<HTMLElement>('[data-bm-value]');
    const fill = meter?.querySelector<HTMLElement>('[data-bm-fill]');
    const dot = meter?.querySelector<HTMLElement>('[data-bm-dot]');
    const status = meter?.querySelector<HTMLElement>('[data-bm-status]');
    if (meter && value && fill && dot && status) meters.set(key, { root: meter, value, fill, dot, status });
  }

  let current = finalStep;
  let shape: Shape = shapeOf(steps[finalStep]!.config);
  let values: Record<MeterKey, number> = { flops: ratioOf(finalStep, 'flops'), params: ratioOf(finalStep, 'params'), kv: ratioOf(finalStep, 'kv') };
  let cancel = () => {};
  let timer = 0;
  let autoplay = false;

  const drawShape = (state: Shape) => {
    const width = layerWidth(state.hidden);
    const left = layers.cx - width / 2;
    for (const bar of bars) { bar.setAttribute('x', left.toFixed(2)); bar.setAttribute('width', width.toFixed(2)); }
    ruler?.setAttribute('d', `M${left.toFixed(2)} ${layers.ruler - 4}V${layers.ruler + 4}M${left.toFixed(2)} ${layers.ruler}H${(left + width).toFixed(2)}M${(left + width).toFixed(2)} ${layers.ruler - 4}V${layers.ruler + 4}`);
    const height = headHeight(state);
    heads.forEach((head, index) => {
      const group = Math.floor(index / attention.maxHeads);
      const slot = index % attention.maxHeads;
      const x = headX(state, group, slot);
      const opacity = headVisibility(state, slot).toFixed(3);
      head.setAttribute('x', x.toFixed(2));
      head.setAttribute('y', (attention.qBottom - height).toFixed(2));
      head.setAttribute('height', height.toFixed(2));
      head.style.opacity = opacity;
      const link = links[index];
      if (link) { link.setAttribute('x1', (x + attention.headW / 2).toFixed(2)); link.style.opacity = opacity; }
    });
    for (const kv of kvs) kv.setAttribute('height', height.toFixed(2));
  };

  const drawMeters = (state: Record<MeterKey, number>, step: number) => {
    const one = meterPosition(1);
    for (const [key, meter] of meters) {
      const at = meterPosition(state[key]);
      meter.value.textContent = formatRatio(state[key], step, key);
      meter.fill.style.left = `${Math.min(at, one).toFixed(3)}%`;
      meter.fill.style.width = `${Math.abs(at - one).toFixed(3)}%`;
      meter.dot.style.left = `${at.toFixed(3)}%`;
    }
  };

  const setStatic = (step: number) => {
    const config = steps[step]!.config;
    root.dataset.step = String(step);
    root.toggleAttribute('data-looped', step >= 1);
    root.toggleAttribute('data-narrowed', step >= 2);
    root.toggleAttribute('data-more-experts', step >= 3);
    root.toggleAttribute('data-attention', step >= 4);
    items.forEach((item, index) => {
      item.classList.toggle('is-done', index < step);
      item.classList.toggle('is-current', index === step);
      item.classList.remove('is-next');
    });
    buttons.forEach((button, index) => { if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    if (stepWord) stepWord.textContent = text.stepWord(step);
    if (title) title.textContent = text.titles[step] ?? '';
    if (body) body.textContent = text.bodies[step] ?? '';
    const pool = routedAt(step) === routedAt(finalStep) ? 'b' : 'a';
    for (const rect of routable) rect.classList.toggle('is-routed', (rect.dataset.route ?? '').includes(pool));
    buttons.forEach((button, index) => { button.tabIndex = index === step ? 0 : -1; });
    if (prev) prev.disabled = step === 0;
    if (next) next.disabled = step === finalStep;
    const values = panelFields(config);
    for (const element of fields) {
      const entry = values[element.dataset.bmField as FieldKey];
      if (!entry) continue;
      element.textContent = entry.value;
      element.classList.toggle('is-changed', entry.changed);
    }
    for (const svg of expertSvgs) svg.style.setProperty('--bm-cell', shapeOf(config).cell.toFixed(4));
    for (const [key, meter] of meters) {
      const status = statusText(step, key, language);
      meter.root.classList.remove('is-off', 'is-matched', 'is-reference');
      meter.root.classList.add(`is-${status.state}`);
      meter.status.textContent = status.text;
      const ratio = formatRatio(ratioOf(step, key), step, key);
      meter.root.dataset.tip = meterTip(step, key, language);
      meter.root.setAttribute('aria-label', `${text.meters[key]}: ${ratio}, ${status.text}`);
    }
  };

  const go = (step: number, animate = true) => {
    const target = Math.max(0, Math.min(finalStep, step));
    const fromShape = shape;
    const toShape = shapeOf(steps[target]!.config);
    const fromValues = { ...values };
    const toValues: Record<MeterKey, number> = { flops: ratioOf(target, 'flops'), params: ratioOf(target, 'params'), kv: ratioOf(target, 'kv') };
    current = target;
    setStatic(target);
    cancel();
    cancel = tween(animate ? MORPH : 0, progress => {
      shape = mixShape(fromShape, toShape, progress);
      values = { flops: fromValues.flops + (toValues.flops - fromValues.flops) * progress, params: fromValues.params + (toValues.params - fromValues.params) * progress, kv: fromValues.kv + (toValues.kv - fromValues.kv) * progress };
      drawShape(shape);
      drawMeters(values, target);
    });
  };

  const stopAutoplay = () => {
    autoplay = false;
    clearTimeout(timer);
    root.classList.remove('is-autoplay');
    live?.setAttribute('aria-live', 'polite');
    for (const item of items) item.classList.remove('is-next');
  };
  const queue = (dwell: number) => {
    const upcoming = items[current + 1];
    if (!upcoming) { stopAutoplay(); return; }
    root.style.setProperty('--bm-dwell', `${dwell}ms`);
    upcoming.classList.remove('is-next');
    void upcoming.offsetWidth;
    upcoming.classList.add('is-next');
    timer = window.setTimeout(() => {
      if (!autoplay) return;
      go(current + 1);
      queue(DWELL);
    }, dwell);
  };
  // One polite announcement per step the reader chooses (autoplay and page load stay silent).
  const announce = () => {
    if (live) live.textContent = `${text.stepWord(current)}${text.colon}${text.titles[current] ?? ''}${language === 'zh' ? '。' : '. '}${text.bodies[current] ?? ''}`;
  };
  const user = (step: number) => { stopAutoplay(); go(step); announce(); };

  buttons.forEach((button, index) => button.addEventListener('click', () => user(index)));
  prev?.addEventListener('click', () => user(current - 1));
  next?.addEventListener('click', () => user(current + 1));
  // Roving focus over the step buttons: arrows move from the focused step, Home / End jump.
  root.querySelector('.bm-steps')?.addEventListener('keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const focused = buttons.indexOf((event.target as HTMLElement).closest<HTMLButtonElement>('[data-bm-step]')!);
    const from = focused >= 0 ? focused : current;
    const target = key === 'Home' ? 0 : key === 'End' ? finalStep : Math.max(0, Math.min(finalStep, from + (key === 'ArrowRight' ? 1 : -1)));
    user(target);
    buttons[target]?.focus();
  });
  bindTooltips(root, element => {
    const key = (element as HTMLElement).dataset.bmMeter;
    if (!key) return;
    root.dataset.focus = key;
    for (const [other, meter] of meters) meter.root.classList.toggle('is-focus', other === key);
  }, () => {
    delete root.dataset.focus;
    for (const meter of meters.values()) meter.root.classList.remove('is-focus');
  });
  if (arrows) arrows.hidden = false;

  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  // Start from the Baseline and walk through the recipe once the figure is in view.
  go(0, false);
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (current !== 0) return;
    autoplay = true;
    root.classList.add('is-autoplay');
    // Autoplay is not something the reader asked for: keep it out of the screen reader.
    live?.setAttribute('aria-live', 'off');
    queue(FIRST_DWELL);
  }, { threshold: 0.6 });
  // Start when the meters (the payoff) are on screen, not merely the top of the figure.
  observer.observe(meterRow ?? root);
  root.addEventListener('pointerdown', () => { if (autoplay) stopAutoplay(); });
}

for (const root of document.querySelectorAll<HTMLElement>('[data-budget-match]')) bind(root);
