// SmeltFormula: hover / focus / tap a term to highlight it, and tell Figure 6.
import { isTermKey, termEvent, type TermKey, type TermState } from '../../lib/smelt/scaling-fit';

let counter = 0;
for (const root of document.querySelectorAll<HTMLElement>('[data-smelt-formula]')) {
  const source = `formula-${counter++}`;
  const state: TermState = { hover: null, pinned: null, source };
  const parts = [...root.querySelectorAll<HTMLElement>('[data-term]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-term]')];

  const render = () => {
    const active = state.hover ?? state.pinned;
    for (const part of parts) part.toggleAttribute('data-active', part.dataset.term === active);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.term === state.pinned));
    if (active) root.dataset.active = active; else delete root.dataset.active;
  };
  const broadcast = () => {
    render();
    document.dispatchEvent(new CustomEvent<TermState>(termEvent, { detail: { ...state, source } }));
  };
  const hover = (term: TermKey | null) => { if (state.hover !== term) { state.hover = term; broadcast(); } };
  const toggle = (term: TermKey) => { state.pinned = state.pinned === term ? null : term; broadcast(); };

  for (const part of parts) {
    const term = part.dataset.term;
    if (!isTermKey(term)) continue;
    part.addEventListener('pointerenter', event => { if ((event as PointerEvent).pointerType === 'mouse') hover(term); });
    part.addEventListener('pointerleave', () => hover(null));
    part.addEventListener('click', () => toggle(term));
    if (part instanceof HTMLButtonElement) {
      part.addEventListener('focus', () => hover(term));
      part.addEventListener('blur', () => hover(null));
    }
  }
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && state.pinned) { state.pinned = null; broadcast(); } });

  // Mirror hovers that start in Figure 6; the pin stays ours.
  document.addEventListener(termEvent, event => {
    const detail = (event as CustomEvent<TermState>).detail;
    if (detail.source === source) return;
    state.hover = detail.hover;
    render();
  });
}
