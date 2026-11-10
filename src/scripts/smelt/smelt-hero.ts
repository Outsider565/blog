// Opening animation: a token pulse runs through both stacks at one layer per beat.
// The looped row returns over its middle block for a second visit and arrives later.
import { reducedMotion } from './kit';
import { legs, narrowLayout, pointAt, visitEvents, wideLayout, type HeroLayout, type HeroRow, type VisitEvent } from '../../lib/smelt/smelt-hero';

const BEAT = 230;          // ms per layer pitch of travel
const RETURN_BEATS = 2.4;  // the return leg takes this many beats, however long it is drawn
const LEAD = 380;          // ms the pulses wait at the input before setting off

interface Row {
  layout: HeroLayout;
  row: HeroRow;
  ends: number[];
  events: VisitEvent[];
  next: number;
  count: number;
  done: boolean;
  pulse: SVGCircleElement;
  out: SVGElement | null;
  counters: SVGTextElement[];
  layers: Map<number, SVGGElement>;
  dots: Map<string, SVGCircleElement>;
}

const layouts: Record<string, HeroLayout> = { wide: wideLayout, narrow: narrowLayout };

function distanceAt(item: Row, beats: number) {
  const pitch = item.layout.pitch;
  const [first, second, total] = item.ends;
  if (second === undefined || total === undefined) return Math.max(0, Math.min(beats * pitch, first!));
  const firstBeats = first! / pitch;
  if (beats <= firstBeats) return Math.max(0, beats * pitch);
  if (beats <= firstBeats + RETURN_BEATS) return first! + (beats - firstBeats) / RETURN_BEATS * (second - first!);
  return Math.min(total, second + (beats - firstBeats - RETURN_BEATS) * pitch);
}

function bind(root: HTMLElement) {
  if (root.dataset.bound) return;
  root.dataset.bound = 'true';
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const replay = root.querySelector<HTMLButtonElement>('[data-hero-replay]');
  const rows: Row[] = [];
  for (const svg of root.querySelectorAll<SVGSVGElement>('[data-hero-layout]')) {
    const layout = layouts[svg.dataset.heroLayout ?? ''];
    if (!layout) continue;
    for (const group of svg.querySelectorAll<SVGGElement>('[data-hero-row]')) {
      const row = layout.rows.find(candidate => candidate.kind === group.dataset.heroRow);
      const pulse = group.querySelector<SVGCircleElement>('[data-hero-pulse]');
      if (!row || !pulse) continue;
      rows.push({
        layout, row, ends: legs(layout, row), events: visitEvents(layout, row.kind, RETURN_BEATS).sort((a, b) => a.at - b.at), next: 0, count: 0, done: false, pulse,
        out: group.querySelector<SVGElement>('[data-hero-out]'),
        counters: [...group.querySelectorAll<SVGTextElement>('[data-hero-count]')],
        layers: new Map([...group.querySelectorAll<SVGGElement>('[data-layer]')].map(node => [Number(node.dataset.layer), node])),
        dots: new Map([...group.querySelectorAll<SVGCircleElement>('[data-dot]')].map(node => [node.dataset.dot ?? '', node])),
      });
    }
  }
  if (!rows.length) return;

  let frame = 0;
  let start = 0;
  const place = (item: Row, distance: number) => {
    const [x, y] = pointAt(item.layout, item.row, distance);
    item.pulse.setAttribute('cx', x.toFixed(2));
    item.pulse.setAttribute('cy', y.toFixed(2));
  };
  const reset = () => {
    cancelAnimationFrame(frame);
    for (const item of rows) {
      item.next = 0;
      item.count = 0;
      item.done = false;
      for (const layer of item.layers.values()) layer.classList.remove('is-v1', 'is-v2');
      for (const dot of item.dots.values()) dot.classList.remove('is-on');
      item.out?.classList.remove('is-on');
      for (const counter of item.counters) counter.textContent = '0';
      delete item.pulse.dataset.done;
      place(item, 0);
    }
  };
  const tick = (now: number) => {
    const beats = (now - start - LEAD) / BEAT;
    let running = false;
    for (const item of rows) {
      if (item.done) continue;
      while (item.next < item.events.length && item.events[item.next]!.at <= beats) {
        const event = item.events[item.next++]!;
        const layer = item.layers.get(event.layer);
        if (layer) { layer.classList.remove('is-v1', 'is-v2'); layer.classList.add(`is-v${event.visit}`); }
        item.dots.get(`${event.layer}-${event.visit}`)?.classList.add('is-on');
        item.count += 1;
        for (const counter of item.counters) counter.textContent = String(item.count);
      }
      const distance = distanceAt(item, beats);
      place(item, distance);
      if (distance >= item.ends.at(-1)! - 1e-6) {
        item.done = true;
        item.out?.classList.add('is-on');
        item.pulse.dataset.done = 'true';
      } else running = true;
    }
    if (running) frame = requestAnimationFrame(tick);
    else root.classList.remove('is-playing');
  };
  const play = () => {
    reset();
    root.classList.add('is-playing');
    start = performance.now();
    frame = requestAnimationFrame(tick);
  };

  reset();
  if (replay) { replay.hidden = false; replay.addEventListener('click', play); }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    play();
  }, { threshold: 0.5 });
  observer.observe(root);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-smelt-hero]')) bind(root);
