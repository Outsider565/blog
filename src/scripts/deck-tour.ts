// Guided tours for the deck. When a slide opens, each figure that carries a
// tour (data-tour, from slides.ts) steps through its key states by itself, so
// the audience sees every case without the speaker clicking. The control that
// is about to change fills up like a progress bar while the current state
// holds. Any pointer or key input inside the figure hands control back;
// leaving the slide stops the tour and opening it again replays it.
//
// Figures take each step as a `tour:set` event { key, value, instant } on
// their root: the Loop-μP figures feed it to their own parse(), the parameter
// table presses the matching recipe button. Numeric values (the phase-plane
// point "α,γ") can glide, sending in-between values for the figure to snap.
import type { TourStep } from '../data/loop-science/slides';

const FIRST_HOLD = 1600;
const HOLD = 2400;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const numbers = (value: string | undefined) => value?.split(',').map(Number).filter(number => !Number.isNaN(number)) ?? [];

let running: (() => void)[] = [];

function play(frame: HTMLElement) {
  const root = frame.querySelector<HTMLElement>('[data-lm-figure], [data-parameter-table]');
  const steps = JSON.parse(frame.dataset.tour ?? '[]') as TourStep[];
  if (!root || !steps.length) return;
  const current: Record<string, string> = {};
  const send = (key: string, value: string, instant = false) => root.dispatchEvent(new CustomEvent('tour:set', { detail: { key, value, instant } }));
  const set = (values: Record<string, string>, instant = false) => {
    for (const [key, value] of Object.entries(values)) { send(key, value, instant); current[key] = value; }
  };

  // Without motion, show where the tour would end.
  if (reducedMotion()) { set(Object.assign({}, ...steps.map(step => step.set)), true); return; }

  let timer = 0;
  let frameId = 0;
  let stopped = false;
  const clearNext = () => { for (const button of root.querySelectorAll('.tour-next')) button.classList.remove('tour-next'); };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    cancelAnimationFrame(frameId);
    clearNext();
    frame.classList.remove('is-touring');
    frame.removeEventListener('pointerdown', stop, true);
    frame.removeEventListener('keydown', stop, true);
  };
  const controlsFor = (values: Record<string, string>) => Object.entries(values)
    .filter(([key, value]) => current[key] !== value)
    .flatMap(([key, value]) => [...root.querySelectorAll<HTMLElement>(key === 'recipe' ? `[data-recipe-choice="${value}"]` : `[data-lm-key="${key}"][data-lm-value="${value}"]`)]);

  const queue = (index: number) => {
    const next = steps[index + 1];
    if (!next) { stop(); return; }
    const hold = steps[index]!.hold ?? (index ? HOLD : FIRST_HOLD);
    clearNext();
    for (const button of controlsFor(next.set)) {
      button.style.setProperty('--tour-hold', `${hold}ms`);
      button.classList.add('tour-next');
    }
    timer = window.setTimeout(() => advance(index + 1), hold);
  };

  const advance = (index: number) => {
    if (stopped) return;
    const step = steps[index]!;
    clearNext();
    const gliding = Object.entries(step.set).filter(([key, value]) => step.glide && numbers(current[key]).length && numbers(current[key]).length === numbers(value).length);
    set(Object.fromEntries(Object.entries(step.set).filter(([key]) => !gliding.some(([other]) => other === key))));
    if (!gliding.length) { queue(index); return; }
    const from = Object.fromEntries(gliding.map(([key]) => [key, numbers(current[key])]));
    const start = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - start) / step.glide!);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      for (const [key, value] of gliding) {
        const to = numbers(value);
        send(key, from[key]!.map((number, position) => number + (to[position]! - number) * eased).join(','));
      }
      if (t < 1) { frameId = requestAnimationFrame(tick); return; }
      set(Object.fromEntries(gliding));
      queue(index);
    };
    frameId = requestAnimationFrame(tick);
  };

  set(steps[0]!.set, true);
  frame.classList.add('is-touring');
  frame.addEventListener('pointerdown', stop, true);
  frame.addEventListener('keydown', stop, true);
  running.push(stop);
  queue(0);
}

/** Stop every running tour (the slide is being left). */
export function stopTours() {
  for (const stop of running) stop();
  running = [];
}

/** Start the tours of a slide from their first step. */
export function startTours(slide: HTMLElement) {
  stopTours();
  for (const frame of slide.querySelectorAll<HTMLElement>('[data-deck-figure][data-tour]')) play(frame);
}
