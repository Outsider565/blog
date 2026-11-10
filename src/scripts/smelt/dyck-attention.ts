// Figure 17 (dyck-attention): morph the token highlights between visits, switch
// prediction targets, link the position strip to the prompt text.
import { armReveal, bindSegmented, hideTooltip, reducedMotion, showTooltip, tween } from './kit';
import { answers, attention, blocks, budget, copy, display, firstTarget, strength, stripBarWidth, stripHeight, stripIndex, stripWidth, stripX, tokens, two, three, type Target, type Visit } from '../../lib/smelt/dyck-attention';
import { lerp } from '../../lib/smelt/plot';

function init(root: HTMLElement) {
  const language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = copy[language];
  let visit: Visit = root.dataset.visit === '1' ? 1 : 2;
  let target: Target = (root.dataset.target as Target) || 'avg';
  const layout = blocks();
  const tokenNodes = new Map<number, HTMLElement>();
  for (const node of root.querySelectorAll<HTMLElement>('.dyck-prompt [data-i]')) tokenNodes.set(Number(node.dataset.i), node);
  const instructionNodes = [...root.querySelectorAll<HTMLElement>('.dyck-prompt [data-range]')];
  const bars = [...root.querySelectorAll<SVGRectElement>('.dyck-bar')];
  const stripBos = root.querySelector<HTMLElement>('[data-strip-bos]');
  const readoutNode = root.querySelector<HTMLElement>('[data-dyck-readout]');
  const rows = [...root.querySelectorAll<HTMLElement>('.dyck-mass-row')];
  const strip = root.querySelector<SVGSVGElement>('.dyck-strip-bars');
  const marker = strip ? document.createElementNS('http://www.w3.org/2000/svg', 'rect') : null;
  if (strip && marker) {
    marker.setAttribute('class', 'dyck-strip-marker');
    marker.setAttribute('y', '0'); marker.setAttribute('height', '100'); marker.setAttribute('width', '1');
    marker.style.display = 'none';
    strip.append(marker);
  }
  let shownBudget = { 1: budget(attention(1, target)), 2: budget(attention(2, target)) };
  let cancelNumbers = () => {};

  const setVisitButtons = (value: Visit) => {
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-dyck-visit] button')) button.setAttribute('aria-pressed', String(button.dataset.value === String(value)));
  };

  const render = () => {
    root.dataset.visit = String(visit);
    root.dataset.target = target;
    const weights = attention(visit, target);
    for (const [index, node] of tokenNodes) {
      const value = strength(weights[index] ?? 0);
      node.style.setProperty('--w', value.toFixed(3));
      node.classList.toggle('is-strong', value > 0.62);
    }
    for (const node of instructionNodes) {
      const [start, end] = (node.dataset.range ?? '0-0').split('-').map(Number) as [number, number];
      let sum = 0;
      for (let index = start; index <= end; index++) sum += weights[index] ?? 0;
      node.style.setProperty('--w', strength(sum).toFixed(3));
    }
    for (const bar of bars) {
      const value = weights[Number(bar.dataset.i)] ?? 0;
      bar.style.transform = `scaleY(${stripHeight(value).toFixed(4)})`;
    }
    if (stripBos) stripBos.textContent = two(weights[0] ?? 0);
    // The bracket being predicted, and the continuation tokens already given to it.
    for (let offset = 0; offset < 3; offset++) {
      const node = tokenNodes.get(firstTarget + offset);
      if (!node) continue;
      const predicting = target === 'avg' || Number(target) === offset;
      node.classList.toggle('is-predicting', predicting);
      node.classList.toggle('is-given', target !== 'avg' && offset < Number(target));
    }
    for (const row of rows) {
      if (row.dataset.row === String(visit)) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
    }
    const current = budget(weights);
    if (readoutNode) readoutNode.innerHTML = text.readout(visit, text.targetName(target), two(current.bos), two(current.answers));
  };

  const renderBudgets = () => {
    const next = { 1: budget(attention(1, target)), 2: budget(attention(2, target)) };
    const from = shownBudget;
    for (const row of rows) {
      const key = row.dataset.row === '1' ? 1 : 2;
      for (const segment of ['bos', 'answers', 'other'] as const) {
        const node = row.querySelector<HTMLElement>(`[data-seg="${segment}"]`);
        if (node) node.style.flexBasis = `${(next[key][segment] * 100).toFixed(3)}%`;
      }
      row.querySelector('.dyck-mass-bar')?.setAttribute('aria-label', `${text.visits[key]}: ${text.segments.bos} ${two(next[key].bos)}, ${text.segments.answers} ${two(next[key].answers)}, ${text.segments.other} ${two(next[key].other)}`);
    }
    cancelNumbers();
    cancelNumbers = tween(520, progress => {
      for (const row of rows) {
        const key = row.dataset.row === '1' ? 1 : 2;
        for (const segment of ['bos', 'answers'] as const) {
          const node = row.querySelector<HTMLElement>(`[data-num="${segment}"]`);
          if (node) node.textContent = two(lerp(from[key][segment], next[key][segment], progress));
        }
      }
    });
    shownBudget = next;
  };

  // Tooltips: delegated, so the 313 tokens do not each become a tab stop.
  const blockOf = (index: number) => layout.find(block => index >= block.start && index <= block.end);
  const tipFor = (index: number) => {
    const token = tokens[index] ?? '';
    const lines = [text.tipToken(index === 0 ? 'BOS' : `‘${display(token)}’`, index)];
    if (index === 0) lines.push(text.tipBos);
    else if (answers.has(index)) lines.push(text.tipAnswer(blockOf(index)?.index ?? 0));
    else if (index >= firstTarget) lines.push(text.tipTarget(index - firstTarget));
    lines.push(text.targetName(target));
    for (const value of [1, 2] as const) lines.push(text.tipVisit(value, three(attention(value, target)[index] ?? 0)));
    return lines.join('\n');
  };
  const rangeTip = (node: HTMLElement) => {
    const [start, end] = (node.dataset.range ?? '0-0').split('-').map(Number) as [number, number];
    const lines = [`${text.tipInstruction(end - start + 1)}`, text.targetName(target)];
    for (const value of [1, 2] as const) {
      const weights = attention(value, target);
      let sum = 0;
      for (let index = start; index <= end; index++) sum += weights[index] ?? 0;
      lines.push(text.tipVisit(value, three(sum)));
    }
    return lines.join('\n');
  };
  let hovered: HTMLElement | null = null;
  const setHover = (index: number | null) => {
    hovered?.classList.remove('is-hover');
    hovered = index === null ? null : tokenNodes.get(index) ?? null;
    hovered?.classList.add('is-hover');
    if (marker) {
      if (index === null) marker.style.display = 'none';
      else { marker.style.display = ''; marker.setAttribute('x', String(stripX(index))); marker.setAttribute('width', String(stripBarWidth(index))); }
    }
  };
  const prompt = root.querySelector<HTMLElement>('[data-dyck-prompt]');
  prompt?.addEventListener('pointermove', event => {
    const node = (event.target as Element).closest<HTMLElement>('[data-i], [data-range]');
    if (!node) { hideTooltip(); setHover(null); return; }
    if (node.dataset.range) { setHover(null); showTooltip(rangeTip(node), event); return; }
    const index = Number(node.dataset.i);
    setHover(index);
    showTooltip(tipFor(index), event);
  });
  prompt?.addEventListener('pointerleave', () => { hideTooltip(); setHover(null); });
  prompt?.addEventListener('focusin', event => {
    const node = (event.target as Element).closest<HTMLElement>('[data-i]');
    if (!node) return;
    const index = Number(node.dataset.i);
    setHover(index);
    showTooltip(tipFor(index), node);
  });
  prompt?.addEventListener('focusout', () => { hideTooltip(); setHover(null); });
  strip?.addEventListener('pointermove', event => {
    const box = strip.getBoundingClientRect();
    const index = stripIndex((event.clientX - box.left) / box.width * stripWidth);
    setHover(index);
    showTooltip(tipFor(index), event);
  });
  strip?.addEventListener('pointerleave', () => { hideTooltip(); setHover(null); });

  // Visit toggle, replay and the one-time autoplay.
  let timer = 0;
  const choose = (value: Visit) => { window.clearTimeout(timer); visit = value; setVisitButtons(value); render(); };
  const play = () => {
    window.clearTimeout(timer);
    if (reducedMotion()) { choose(2); return; }
    visit = 1; setVisitButtons(1); root.classList.add('is-instant'); render();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-instant')));
    timer = window.setTimeout(() => { visit = 2; setVisitButtons(2); render(); }, 1100);
  };
  const visitGroup = root.querySelector('[data-dyck-visit]');
  if (visitGroup) bindSegmented(visitGroup, value => choose(value === '1' ? 1 : 2));
  const targetGroup = root.querySelector('[data-dyck-target]');
  if (targetGroup) bindSegmented(targetGroup, value => { target = (['avg', '0', '1', '2'].includes(value) ? value : 'avg') as Target; render(); renderBudgets(); });
  root.querySelector('[data-dyck-play]')?.addEventListener('click', play);
  armReveal(root);

  if (!reducedMotion() && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      play();
    }, { threshold: 0.35 });
    observer.observe(root.querySelector('.dyck-strip') ?? root);
  }
}

for (const root of document.querySelectorAll<HTMLElement>('[data-dyck-attention]')) init(root);
