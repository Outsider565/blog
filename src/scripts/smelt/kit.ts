// Browser helpers shared by the SMELT figures: reveal-on-scroll, tooltips,
// segmented controls and frame-based tweening. Import what a figure needs.

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Arm every [data-reveal] element below the fold and show it once it scrolls in.
 *  Elements already on screen, or all of them under reduced motion, stay visible. */
export function armReveal(scope: ParentNode = document) {
  const targets = [...scope.querySelectorAll<HTMLElement | SVGElement>('[data-reveal]:not([data-reveal="shown"])')];
  if (!targets.length) return;
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    for (const target of targets) target.dataset.reveal = 'shown';
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const target = entry.target as HTMLElement;
      requestAnimationFrame(() => { target.dataset.reveal = 'shown'; });
      target.dispatchEvent(new CustomEvent('smelt:reveal', { bubbles: true }));
      observer.unobserve(target);
    }
  }, { threshold: 0.25 });
  const armed: (HTMLElement | SVGElement)[] = [];
  for (const target of targets) {
    const box = target.getBoundingClientRect();
    if (box.top < innerHeight * 0.9 && box.bottom > 0) { target.dataset.reveal = 'shown'; continue; }
    // Hide without transitions, so a fast scroll never catches a half-hidden figure.
    target.classList.add('smelt-arming');
    target.dataset.reveal = 'armed';
    armed.push(target);
  }
  if (!armed.length) return;
  void document.body.offsetHeight;
  requestAnimationFrame(() => {
    for (const target of armed) { target.classList.remove('smelt-arming'); observer.observe(target); }
  });
}

let tooltipElement: HTMLDivElement | null = null;
function tooltipNode() {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'chart-tooltip';
    tooltipElement.setAttribute('role', 'status');
    tooltipElement.hidden = true;
    document.body.append(tooltipElement);
  }
  return tooltipElement;
}

/** Position the shared tooltip next to a pointer or element. The first line renders bold. */
export function showTooltip(text: string, anchor: { clientX: number; clientY: number } | Element) {
  const node = tooltipNode();
  node.textContent = text;
  node.hidden = false;
  const point = anchor instanceof Element ? (() => { const box = anchor.getBoundingClientRect(); return { clientX: box.left + box.width / 2, clientY: box.top }; })() : anchor;
  const { width, height } = node.getBoundingClientRect();
  const left = Math.min(innerWidth - width - 10, Math.max(10, point.clientX + 14));
  const top = point.clientY - height - 14 < 10 ? point.clientY + 18 : point.clientY - height - 14;
  node.style.left = `${left}px`;
  node.style.top = `${top}px`;
}

export function hideTooltip() {
  if (tooltipElement) tooltipElement.hidden = true;
}

/** Every [data-tip] inside root shows its text on hover and keyboard focus. */
export function bindTooltips(root: ParentNode, onEnter?: (element: Element) => void, onLeave?: (element: Element) => void) {
  for (const element of root.querySelectorAll<HTMLElement | SVGElement>('[data-tip]')) {
    if (!element.hasAttribute('tabindex') && element.tagName.toLowerCase() !== 'a' && element.tagName.toLowerCase() !== 'button') element.setAttribute('tabindex', '0');
    element.addEventListener('pointermove', event => { showTooltip(element.dataset.tip || '', event as PointerEvent); });
    element.addEventListener('pointerenter', () => onEnter?.(element));
    // A tap fires pointerleave at once; touch tooltips stay until focus moves on.
    element.addEventListener('pointerleave', event => { if ((event as PointerEvent).pointerType === 'touch') return; hideTooltip(); onLeave?.(element); });
    element.addEventListener('focus', () => { showTooltip(element.dataset.tip || '', element); onEnter?.(element); });
    element.addEventListener('blur', () => { hideTooltip(); onLeave?.(element); });
  }
}

/** Wire a .smelt-seg group of buttons with data-value; calls onChange with the chosen value. */
export function bindSegmented(group: Element, onChange: (value: string) => void) {
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('button[data-value]')];
  const choose = (button: HTMLButtonElement) => {
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    onChange(button.dataset.value || '');
  };
  for (const button of buttons) button.addEventListener('click', () => choose(button));
  return (value: string) => { const button = buttons.find(candidate => candidate.dataset.value === value); if (button) choose(button); };
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Animate a 0→1 progress value over duration ms; returns a cancel function. Instant under reduced motion. */
export function tween(duration: number, step: (progress: number) => void, done?: () => void) {
  if (reducedMotion() || duration <= 0) { step(1); done?.(); return () => {}; }
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    step(easeOut(t));
    if (t < 1) frame = requestAnimationFrame(tick); else done?.();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/** Count a number up inside an element when it is revealed. format turns a value into text. */
export function countUp(element: HTMLElement | SVGElement, target: number, format: (value: number) => string, duration = 900) {
  element.textContent = format(0);
  return tween(duration, progress => { element.textContent = format(target * progress); }, () => { element.textContent = format(target); });
}

/** Pause SMIL animations in an SVG when the reader prefers reduced motion. */
export function respectMotion(svg: SVGSVGElement) {
  if (reducedMotion()) svg.pauseAnimations();
}

export const svgNamespace = 'http://www.w3.org/2000/svg';
export function svgNode<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}, text?: string) {
  const node = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
