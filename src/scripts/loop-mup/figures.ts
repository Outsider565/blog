// Interaction for the Loop-μP figures: segmented controls and in-figure
// buttons re-render the view from the shared module, chart elements show
// tooltips, heatmaps report the cell under the pointer, and the phase diagram
// follows clicks, drags and arrow keys.
import { modules } from '../../lib/loop-mup/figures';
import { controls } from '../../lib/loop-mup/markup';
import { clampState, limits, step, type State as PhaseState } from '../../lib/loop-mup/phase';
import { bindTooltips, hideTooltip, showTooltip } from '../smelt/kit';

const visible = (element: Element) => element.getClientRects().length > 0;

function setup(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = 'true';
  const id = root.dataset.lmFigure ?? '';
  const module = modules[id];
  const view = root.querySelector<HTMLElement>('[data-lm-view]');
  if (!module || !view) return;
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const controlBox = root.querySelector<HTMLElement>('[data-lm-controls]');
  const live = root.querySelector<HTMLElement>('[data-lm-live]');
  let state: any = JSON.parse(root.dataset.state ?? 'null') ?? module.initial;
  if (controlBox) controlBox.hidden = false;

  const wire = () => {
    bindTooltips(view);
    for (const hit of view.querySelectorAll<SVGRectElement>('[data-lm-heat]')) {
      const size = Number(hit.dataset.n);
      const read = (event: PointerEvent) => {
        const box = hit.getBoundingClientRect();
        const j = Math.min(size - 1, Math.max(0, Math.floor((event.clientX - box.left) / box.width * size)));
        const i = Math.min(size - 1, Math.max(0, Math.floor((event.clientY - box.top) / box.height * size)));
        const text = module.cell?.(state, language, hit.dataset.lmHeat, i, j);
        if (text) showTooltip(text, event);
      };
      hit.addEventListener('pointermove', read);
      hit.addEventListener('pointerdown', read);
      hit.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') hideTooltip(); });
    }
  };

  const render = (focus?: string) => {
    if (controlBox) controlBox.innerHTML = controls(module.controls(state, language), `lm-${id}-${language}`);
    view.innerHTML = module.view(state, language);
    hideTooltip();
    wire();
    if (focus) [...root.querySelectorAll<HTMLElement | SVGElement>(focus)].find(visible)?.focus({ preventScroll: true });
    const label = [...view.querySelectorAll('[role="img"][aria-label]')].find(visible)?.getAttribute('aria-label');
    if (live && label) live.textContent = label;
  };

  const update = (next: any, focus?: string) => {
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    render(focus);
  };

  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-lm-key]');
    if (!button || !root.contains(button)) return;
    const { lmKey: key = '', lmValue: value = '' } = button.dataset;
    const focused = root.contains(document.activeElement);
    update(module.parse(key, value, state), focused ? `button[data-lm-key="${key}"][data-lm-value="${value}"]` : undefined);
  });

  // A deck's guided tour sets controls (and the phase-plane point) directly.
  root.addEventListener('tour:set', event => {
    const { key, value } = (event as CustomEvent<{ key: string; value: string }>).detail;
    update(module.parse(key, value, state));
  });

  if (id === 'phase') {
    // A deck builds this SVG while its slide is hidden. Redraw after it gains
    // a layout box so SVG text uses the visible chart's font metrics.
    let previousWidth = 0;
    const phaseResize = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width > 0 && width !== previousWidth) render();
      previousWidth = width;
    });
    phaseResize.observe(root);
    // The plane keeps its on-screen box across re-renders, so a drag keeps
    // working while the rectangle under the pointer is replaced.
    let plane: DOMRect | null = null;
    const at = (event: PointerEvent): PhaseState => {
      const box = plane!;
      return clampState({
        ...state,
        alpha: limits.alpha[0] + (event.clientX - box.left) / box.width * (limits.alpha[1] - limits.alpha[0]),
        gamma: limits.gamma[1] - (event.clientY - box.top) / box.height * (limits.gamma[1] - limits.gamma[0]),
      });
    };
    view.addEventListener('pointerdown', event => {
      const target = (event.target as Element).closest('[data-lm-plane]');
      if (!target) return;
      event.preventDefault();
      plane = target.getBoundingClientRect();
      update(at(event), '[data-lm-focus="plane"]');
    });
    window.addEventListener('pointermove', event => { if (plane) update(at(event)); });
    window.addEventListener('pointerup', () => { plane = null; });
    window.addEventListener('pointercancel', () => { plane = null; });
    view.addEventListener('keydown', event => {
      if (!(event.target as Element).closest('[data-lm-plane]')) return;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      update(clampState({ ...state, alpha: state.alpha + move[0], gamma: state.gamma + move[1] }), '[data-lm-focus="plane"]');
    });
  }

  wire();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-lm-figure]')) setup(root);
