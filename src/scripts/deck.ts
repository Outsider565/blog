// The talk deck at /loop-science/: scales the 1280 × 720 stage to the window,
// pages with keys, toolbar and swipes, keeps the slide number in the URL hash,
// and drives the notes panel, the presenter window, the slide list and help.
// The article figures run their own scripts; their reveal animations start
// when a slide first becomes visible, exactly as they do on scroll.

import { startTours, stopTours } from './deck-tour';

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const CHANNEL = 'loop-science-deck';

type PanelName = 'notes' | 'overview' | 'help';

const clock = (minutes: number) => {
  const seconds = Math.max(0, Math.round(minutes * 60));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function setup(deck: HTMLElement) {
  const slides = [...deck.querySelectorAll<HTMLElement>('[data-slide]')];
  const total = slides.length;
  const viewport = deck.querySelector<HTMLElement>('[data-deck-viewport]');
  const stage = deck.querySelector<HTMLElement>('[data-deck-stage]');
  if (!total || !viewport || !stage) return;
  const find = <T extends Element = HTMLElement>(selector: string) => deck.querySelector<T>(selector);
  const panels: Record<PanelName, HTMLElement | null> = {
    notes: find('[data-deck-panel="notes"]'),
    overview: find('[data-deck-panel="overview"]'),
    help: find('[data-deck-panel="help"]'),
  };
  const counter = find('[data-deck-current]');
  const previous = find<HTMLButtonElement>('[data-deck-prev]');
  const next = find<HTMLButtonElement>('[data-deck-next]');
  const languageLink = find<HTMLAnchorElement>('[data-deck-language]');
  const fullscreenButton = find<HTMLButtonElement>('[data-deck-fullscreen]');
  const jump = find('[data-deck-jump]');
  const jumpValue = find('[data-deck-jump-value]');
  const notes = {
    body: find('[data-notes-body]'), title: find('[data-notes-title]'), page: find('[data-notes-page]'), part: find('[data-notes-part]'),
    planned: find('[data-notes-planned]'), elapsed: find('[data-notes-elapsed]'), next: find('[data-notes-next]'), timer: find('.notes-timer'),
  };
  const totalMinutes = Number(deck.dataset.totalMinutes) || 0;
  const presenter = deck.classList.contains('is-presenter');
  let index = Math.max(0, Math.min(total - 1, Number(deck.dataset.index) || 0));
  let lastFocus: HTMLElement | null = null;

  // ── Scaling: the stage keeps 16:9 and fills the free area. ──
  const fit = () => {
    const box = viewport.getBoundingClientRect();
    if (box.width && box.height) stage.style.setProperty('--s', String(Math.min(box.width / STAGE_WIDTH, box.height / STAGE_HEIGHT)));
  };
  new ResizeObserver(fit).observe(viewport);
  fit();

  // Each figure is laid out at its article width and scaled uniformly. The
  // preferred scale (data-scale) shrinks when the slide has less room than
  // planned, so a two-line title or a wrapped control row never pushes a
  // figure over the footer. Frames take the scaled size.
  const fitSlide = (slide: HTMLElement) => {
    const body = slide.querySelector<HTMLElement>('.slide-body');
    const visual = body?.querySelector<HTMLElement>('.slide-visual');
    if (!body || !visual || !slide.classList.contains('is-active')) return;
    const items = [...visual.querySelectorAll<HTMLElement>('[data-deck-figure]')].map(frame => ({
      frame,
      inner: frame.querySelector<HTMLElement>('[data-deck-figure-inner]'),
      width: Number(frame.dataset.width) || 760,
      scale: Number(frame.dataset.scale) || 1,
    }));
    if (!items.length || items.some(item => !item.inner?.offsetHeight)) return;
    const bodyStyle = getComputedStyle(body);
    const visualStyle = getComputedStyle(visual);
    const stacked = body.classList.contains('is-stack');
    let height = body.clientHeight - Number.parseFloat(bodyStyle.paddingTop) - Number.parseFloat(bodyStyle.paddingBottom);
    const text = body.querySelector<HTMLElement>('.slide-text');
    const equations = body.querySelector<HTMLElement>('.slide-equations');
    if (equations) height -= equations.offsetHeight + (Number.parseFloat(bodyStyle.rowGap) || 0);
    if (stacked && text) height -= text.offsetHeight + (Number.parseFloat(bodyStyle.rowGap) || 0);
    if (!stacked) for (const other of visual.children) if (!other.hasAttribute('data-deck-figure')) height -= (other as HTMLElement).offsetHeight;
    const width = visual.clientWidth;
    const gap = Number.parseFloat(stacked ? visualStyle.columnGap : visualStyle.rowGap) || 0;
    const gaps = gap * (items.length - 1);
    const heights = items.map(item => item.inner!.offsetHeight * item.scale);
    const widths = items.map(item => item.width * item.scale);
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    const factor = Math.max(0.05, Math.min(1,
      stacked ? height / Math.max(...heights) : (height - gaps) / sum(heights),
      stacked ? (width - gaps) / sum(widths) : width / Math.max(...widths),
    ));
    for (const item of items) {
      const scale = item.scale * factor;
      item.frame.style.setProperty('--fig-s', scale.toFixed(4));
      item.frame.style.height = `${(item.inner!.offsetHeight * scale).toFixed(1)}px`;
      item.frame.dataset.fitted = factor < 1 ? factor.toFixed(3) : '';
    }
  };
  for (const frame of deck.querySelectorAll<HTMLElement>('[data-deck-figure]')) {
    const inner = frame.querySelector<HTMLElement>('[data-deck-figure-inner]');
    const slide = frame.closest<HTMLElement>('[data-slide]');
    if (inner && slide) new ResizeObserver(() => fitSlide(slide)).observe(inner);
  }

  // Focus moves inside a figure must never scroll the stage out of place.
  deck.addEventListener('scroll', event => {
    const element = event.target as HTMLElement;
    if (element === viewport || element === stage || element.classList?.contains('slide')) { element.scrollTop = 0; element.scrollLeft = 0; }
  }, true);

  // ── Notes panel ──
  const renderNotes = () => {
    const panel = panels.notes;
    if (!panel || panel.hidden) return;
    const slide = slides[index]!;
    const start = Number(slide.dataset.start) || 0;
    const minutes = Number(slide.dataset.minutes) || 0;
    if (notes.body) { notes.body.innerHTML = slide.querySelector('.slide-notes')?.innerHTML ?? ''; notes.body.scrollTop = 0; }
    if (notes.title) notes.title.textContent = slide.dataset.title ?? '';
    if (notes.page) notes.page.textContent = `${index + 1} / ${total}`;
    if (notes.part) notes.part.textContent = slide.dataset.partName ?? '';
    if (notes.planned) notes.planned.textContent = `${clock(start)}–${clock(start + minutes)} / ${clock(totalMinutes)}`;
    const following = slides[index + 1];
    if (notes.next) notes.next.textContent = following ? `${index + 2}. ${following.dataset.title ?? ''}` : notes.next.dataset.empty ?? '';
    tick();
  };
  let timerStart = Date.now();
  const tick = () => {
    const elapsed = (Date.now() - timerStart) / 60000;
    if (notes.elapsed) notes.elapsed.textContent = clock(elapsed);
    const slide = slides[index]!;
    const end = (Number(slide.dataset.start) || 0) + (Number(slide.dataset.minutes) || 0);
    notes.timer?.classList.toggle('is-late', elapsed > end + 0.5);
  };
  window.setInterval(tick, 1000);
  find('[data-notes-reset]')?.addEventListener('click', () => { timerStart = Date.now(); tick(); });

  // ── Paging ──
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
  const overviewButtons = [...deck.querySelectorAll<HTMLButtonElement>('[data-deck-goto]')];

  // SVG text on a hidden slide can keep the metrics of a fallback font: the
  // CJK web font arrives later and the text is never laid out again, so
  // anchored labels drift and CJK runs go missing. Re-lay out the SVGs of a
  // slide whenever it is shown, and every slide's once the fonts are in.
  const relayoutSvgText = (slide: HTMLElement) => {
    for (const svg of slide.querySelectorAll<SVGSVGElement>('svg')) {
      if (!svg.querySelector('text')) continue;
      const display = svg.style.display;
      svg.style.display = 'none';
      void svg.getBoundingClientRect();
      svg.style.display = display;
    }
  };
  document.fonts?.ready.then(() => relayoutSvgText(slides[index]!));
  document.fonts?.addEventListener('loadingdone', () => relayoutSvgText(slides[index]!));

  // Figures with a guided tour play it whenever their slide opens. On first
  // load the figure scripts may not be listening yet, so wait for them.
  let scriptsReady = document.readyState === 'complete';
  const ready = () => { if (scriptsReady) return; scriptsReady = true; tour(); };
  document.addEventListener('DOMContentLoaded', ready, { once: true });
  window.addEventListener('load', ready, { once: true });
  const tour = () => { if (scriptsReady) startTours(slides[index]!); else stopTours(); };

  const show = (target: number, options: { broadcast?: boolean } = {}) => {
    const wanted = Math.max(0, Math.min(total - 1, Math.trunc(target)));
    const changed = wanted !== index || !slides[wanted]!.classList.contains('is-active');
    if (changed) {
      const leaving = slides[index];
      if (leaving && document.activeElement instanceof HTMLElement && leaving.contains(document.activeElement)) document.activeElement.blur();
      for (const slide of slides) slide.classList.remove('is-active');
      index = wanted;
      slides[index]!.classList.add('is-active');
      for (const tooltip of document.querySelectorAll<HTMLElement>('.chart-tooltip')) tooltip.hidden = true;
      tour();
      relayoutSvgText(slides[index]!);
    }
    fitSlide(slides[index]!);
    deck.dataset.index = String(index);
    if (counter) counter.textContent = String(index + 1);
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === total - 1;
    const hash = `#${index + 1}`;
    if (location.hash !== hash) history.replaceState(history.state, '', hash);
    if (languageLink) languageLink.hash = hash;
    for (const [position, button] of overviewButtons.entries()) button.setAttribute('aria-current', String(position === index));
    renderNotes();
    if (changed && options.broadcast !== false) channel?.postMessage({ type: 'show', index });
  };

  channel?.addEventListener('message', event => {
    const data = event.data as { type?: string; index?: unknown };
    if (data?.type === 'show' && typeof data.index === 'number') show(data.index, { broadcast: false });
  });
  window.addEventListener('hashchange', () => {
    const asked = Number.parseInt(location.hash.slice(1), 10);
    if (asked >= 1 && asked <= total) show(asked - 1);
  });
  previous?.addEventListener('click', () => show(index - 1));
  next?.addEventListener('click', () => show(index + 1));
  for (const [position, button] of overviewButtons.entries()) button.addEventListener('click', () => { show(position); setPanel('overview', false); });

  // ── Panels ──
  const overlayOpen = () => !panels.overview?.hidden || !panels.help?.hidden;
  const syncToggles = () => {
    for (const button of deck.querySelectorAll<HTMLButtonElement>('[data-deck-toggle]')) {
      const panel = panels[button.dataset.deckToggle as PanelName];
      button.setAttribute('aria-pressed', String(Boolean(panel && !panel.hidden)));
    }
  };
  function setPanel(name: PanelName, open?: boolean) {
    const panel = panels[name];
    if (!panel) return;
    const opening = open ?? panel.hidden;
    if (name === 'notes') {
      panel.hidden = !opening;
      deck.classList.toggle('notes-open', opening);
      renderNotes();
    } else {
      if (opening) {
        if (!overlayOpen()) lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        for (const other of ['overview', 'help'] as const) if (other !== name && panels[other]) panels[other]!.hidden = true;
        panel.hidden = false;
        const focusTarget = name === 'overview' ? overviewButtons[index] : panel.querySelector<HTMLElement>('[data-deck-close]');
        focusTarget?.focus({ preventScroll: false });
      } else {
        panel.hidden = true;
        if (!overlayOpen()) lastFocus?.focus({ preventScroll: true });
      }
    }
    syncToggles();
  }
  const closeOverlays = () => { setPanel('overview', false); setPanel('help', false); };
  for (const button of deck.querySelectorAll<HTMLButtonElement>('[data-deck-toggle]')) button.addEventListener('click', () => setPanel(button.dataset.deckToggle as PanelName));
  for (const button of deck.querySelectorAll<HTMLButtonElement>('[data-deck-close]')) button.addEventListener('click', closeOverlays);
  for (const overlay of deck.querySelectorAll<HTMLElement>('.deck-overlay')) overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlays(); });

  // ── Full screen and presenter window ──
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* not allowed here; the page still works windowed */ }
  };
  document.addEventListener('fullscreenchange', () => {
    const on = Boolean(document.fullscreenElement);
    document.documentElement.classList.toggle('deck-fullscreen', on);
    if (fullscreenButton) fullscreenButton.textContent = (on ? fullscreenButton.dataset.labelExit : fullscreenButton.dataset.labelEnter) ?? '';
  });
  fullscreenButton?.addEventListener('click', toggleFullscreen);
  if (!document.fullscreenEnabled && fullscreenButton) fullscreenButton.hidden = true;

  const openPresenter = () => {
    const url = new URL(location.href);
    url.searchParams.set('presenter', '');
    url.hash = `#${index + 1}`;
    window.open(url.href, 'loop-science-presenter', 'popup,width=1280,height=800');
  };
  const presenterButton = find<HTMLButtonElement>('[data-deck-presenter]');
  if (presenter && presenterButton) presenterButton.hidden = true;
  presenterButton?.addEventListener('click', openPresenter);
  if (presenter && languageLink) languageLink.search = '?presenter';

  // ── Keyboard ──
  let digits = '';
  let digitTimer = 0;
  const showDigits = () => {
    if (jump) jump.hidden = !digits;
    if (jumpValue) jumpValue.textContent = digits;
  };
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const key = event.key;
    // All figure controls keep navigation keys, including ordinary buttons.
    const inFigure = Boolean(target?.closest('.deck-figure'));
    if (key === 'Escape') {
      if (overlayOpen()) closeOverlays();
      else if (digits) { digits = ''; showDigits(); }
      else if (target?.closest('.slide') && (target instanceof HTMLElement || target instanceof SVGElement)) target.blur();
      else return;
      event.preventDefault();
      return;
    }
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (overlayOpen()) {
      if (key === 'o' || key === 'O') { setPanel('overview'); event.preventDefault(); }
      else if (key === '?') { setPanel('help'); event.preventDefault(); }
      return;
    }
    if (/^[0-9]$/.test(key) && !inFigure) {
      digits = (digits + key).slice(-3);
      showDigits();
      window.clearTimeout(digitTimer);
      digitTimer = window.setTimeout(() => { digits = ''; showDigits(); }, 2500);
      event.preventDefault();
      return;
    }
    if (key === 'Enter' && digits) {
      show(Number(digits) - 1);
      digits = '';
      showDigits();
      event.preventDefault();
      return;
    }
    const onControl = Boolean(target?.closest('button, a, summary, [role="button"]'));
    switch (key) {
      case 'ArrowRight': case 'ArrowDown': if (inFigure) return; show(index + 1); break;
      case 'ArrowLeft': case 'ArrowUp': if (inFigure) return; show(index - 1); break;
      case 'PageDown': show(index + 1); break;
      case 'PageUp': show(index - 1); break;
      case ' ': if (onControl) return; show(index + (event.shiftKey ? -1 : 1)); break;
      case 'Home': if (inFigure) return; show(0); break;
      case 'End': if (inFigure) return; show(total - 1); break;
      case 'f': case 'F': void toggleFullscreen(); break;
      case 's': case 'S': setPanel('notes'); break;
      case 'p': case 'P': if (!presenter) openPresenter(); break;
      case 'o': case 'O': setPanel('overview'); break;
      case '?': setPanel('help'); break;
      case 'l': case 'L': languageLink?.click(); break;
      case 'r': case 'R': startTours(slides[index]!); break;
      default: return;
    }
    event.preventDefault();
  });

  // ── Touch: swipe left or right outside the figures. ──
  let touch: { x: number; y: number; time: number } | null = null;
  viewport.addEventListener('touchstart', event => {
    const point = event.touches[0];
    touch = event.touches.length === 1 && point && !(event.target as Element).closest('.deck-figure') ? { x: point.clientX, y: point.clientY, time: Date.now() } : null;
  }, { passive: true });
  viewport.addEventListener('touchend', event => {
    const point = event.changedTouches[0];
    if (!touch || !point) return;
    const dx = point.clientX - touch.x;
    const dy = point.clientY - touch.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touch.time < 800) show(index + (dx < 0 ? 1 : -1));
    touch = null;
  });

  // ── The toolbar fades out while the pointer rests. ──
  let idleTimer = 0;
  const wake = () => {
    deck.classList.remove('is-idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => deck.classList.add('is-idle'), 2600);
  };
  document.addEventListener('pointermove', wake, { passive: true });
  document.addEventListener('pointerdown', wake, { passive: true });
  wake();

  if (presenter) { if (panels.notes) panels.notes.hidden = false; deck.classList.add('notes-open'); }
  syncToggles();
  show(index, { broadcast: false });
}

const root = document.querySelector<HTMLElement>('[data-deck]');
if (root) setup(root);
