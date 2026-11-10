// Figure 16 (attention-stages): switch configuration, tween bars, rebuild the
// per-layer attention-pattern dots. Works on every [data-attention-stages] root.
import { armReveal, bindSegmented, bindTooltips, svgNode, tween } from './kit';
import {
  cell, copy, cosineKeys, cosineTip, fmt, layerTip, narrow, narrowPatternY, narrowRows, narrowX, pattern, patternSparsity, patternTip, pct, readout,
  swarm, wide, wideCenter, wideY, type CosineKey, type Language,
} from '../../lib/smelt/attention-stages';
import { lerp } from '../../lib/smelt/plot';

type Frame = Record<CosineKey, number> & { top8: number; control: number; ratio: number; cloudMax: number };

function frameFor(size: string, sparsity: string): Frame {
  const values = cell(size, sparsity);
  const p = pattern(size);
  return {
    x: values.x[0], q: values.q[0], k: values.k[0], v: values.v[0], pv: values.pv[0], o: values.o[0],
    top8: p.top8[0], control: p.control[0], ratio: p.top8[0] / p.control[0], cloudMax: Math.max(...p.layers.map(layer => layer[1])),
  };
}

function init(root: HTMLElement) {
  const language: Language = root.dataset.language === 'en' ? 'en' : 'zh';
  const text = copy[language];
  let size = root.dataset.size || '1.6B';
  let sparsity = root.dataset.sparsity || '85%';
  let current = frameFor(size, sparsity);
  let cancel = () => {};
  const layout = narrowRows();
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg[data-orient]')];
  const readoutNode = root.querySelector<HTMLElement>('[data-stages-readout]');

  const apply = (frame: Frame) => {
    for (const svg of svgs) {
      const vertical = svg.dataset.orient === 'v';
      for (const stage of cosineKeys) {
        const group = svg.querySelector<SVGGElement>(`[data-stage="${stage}"]`);
        const bar = group?.querySelector<SVGRectElement>('[data-bar]');
        const label = group?.querySelector<SVGTextElement>('[data-value-label]');
        if (!bar || !label) continue;
        const value = frame[stage];
        if (vertical) {
          bar.setAttribute('y', wideY(value).toFixed(2));
          bar.setAttribute('height', (wide.bottom - wideY(value)).toFixed(2));
          label.setAttribute('y', (wideY(value) - 9).toFixed(2));
        } else {
          bar.setAttribute('width', (narrowX(value) - narrow.x0).toFixed(2));
          label.setAttribute('x', (narrowX(value) + 6).toFixed(2));
        }
        label.textContent = fmt(value);
      }
      // The input-X reference line is drawn in two pieces that skip the attention-pattern panel.
      for (const ref of svg.querySelectorAll<SVGLineElement>('[data-ref]')) {
        if (vertical) { ref.setAttribute('y1', wideY(frame.x).toFixed(2)); ref.setAttribute('y2', wideY(frame.x).toFixed(2)); }
        else { ref.setAttribute('x1', narrowX(frame.x).toFixed(2)); ref.setAttribute('x2', narrowX(frame.x).toFixed(2)); }
      }
      const refLabel = svg.querySelector<SVGTextElement>('[data-ref-label]');
      if (refLabel) { refLabel.setAttribute('y', (wideY(frame.x) - 7).toFixed(2)); refLabel.textContent = text.refLabel(fmt(frame.x)); }
      const mean = svg.querySelector<SVGLineElement>('[data-mean]');
      const meanLabel = svg.querySelector<SVGTextElement>('[data-pattern-label]');
      const control = svg.querySelector<SVGCircleElement>('[data-control]');
      const controlLabel = svg.querySelector<SVGTextElement>('[data-control-label]');
      const ratioLabel = svg.querySelector<SVGTextElement>('[data-ratio-label]');
      if (mean && meanLabel && control && controlLabel && ratioLabel) {
        if (vertical) {
          mean.setAttribute('y1', wideY(frame.top8).toFixed(2)); mean.setAttribute('y2', wideY(frame.top8).toFixed(2));
          meanLabel.setAttribute('y', (wideY(frame.cloudMax) - 24).toFixed(2));
          ratioLabel.setAttribute('y', (wideY(frame.cloudMax) - 9).toFixed(2));
          control.setAttribute('cy', wideY(frame.control).toFixed(2));
          controlLabel.setAttribute('y', (wideY(frame.control) + 19).toFixed(2));
        } else {
          mean.setAttribute('x1', narrowX(frame.top8).toFixed(2)); mean.setAttribute('x2', narrowX(frame.top8).toFixed(2));
          meanLabel.setAttribute('x', (narrowX(frame.cloudMax) + 8).toFixed(2));
          ratioLabel.setAttribute('x', (narrowX(frame.cloudMax) + 8).toFixed(2));
          control.setAttribute('cx', narrowX(frame.control).toFixed(2));
          controlLabel.setAttribute('x', narrowX(frame.control).toFixed(2));
        }
        meanLabel.textContent = pct(frame.top8);
        controlLabel.textContent = text.control(pct(frame.control));
        ratioLabel.textContent = text.ratio(frame.ratio.toFixed(1));
      }
    }
  };

  const rebuildDots = () => {
    const layers = pattern(size).layers;
    for (const svg of svgs) {
      const vertical = svg.dataset.orient === 'v';
      const group = svg.querySelector<SVGGElement>('[data-dots]');
      if (!group) continue;
      const offsets = vertical ? swarm(layers.map(layer => layer[1]), wideY, 3, 7, 3) : swarm(layers.map(layer => layer[1]), narrowX, 3, 6.5, 2);
      group.replaceChildren(...layers.map((layer, index) => {
        const tip = layerTip(language, layer);
        const dot = svgNode('circle', vertical
          ? { cx: (wideCenter('p') + offsets[index]!).toFixed(2), cy: wideY(layer[1]).toFixed(2), r: 3 }
          : { cx: narrowX(layer[1]).toFixed(2), cy: (narrowPatternY(layout.rows.p) + offsets[index]!).toFixed(2), r: 3 });
        dot.setAttribute('class', 'stages-dot is-entering');
        dot.setAttribute('style', `--i:${index}`);
        dot.setAttribute('role', 'img');
        dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
        dot.setAttribute('aria-label', tip.replaceAll('\n', '; '));
        dot.dataset.tip = tip;
        return dot;
      }));
      bindTooltips(group);
    }
  };

  const update = (previousSize: string) => {
    root.dataset.size = size;
    root.dataset.sparsity = sparsity;
    root.dataset.pattern = sparsity === patternSparsity ? 'on' : 'off';
    const from = current;
    const to = frameFor(size, sparsity);
    cancel();
    cancel = tween(560, progress => {
      const frame = {} as Frame;
      for (const key of Object.keys(to) as (keyof Frame)[]) frame[key] = lerp(from[key], to[key], progress);
      current = frame;
      apply(frame);
    }, () => { current = to; apply(to); });
    if (size !== previousSize) rebuildDots();
    for (const group of root.querySelectorAll<SVGGElement>('[data-stage]')) {
      const stage = group.dataset.stage as CosineKey;
      const tip = cosineTip(language, stage, size, sparsity);
      group.dataset.tip = tip;
      group.setAttribute('aria-label', tip.replaceAll('\n', '; '));
    }
    for (const group of root.querySelectorAll<SVGGElement>('[data-pattern-group]')) {
      const tip = patternTip(language, size);
      group.dataset.tip = tip;
      group.setAttribute('aria-label', tip.replaceAll('\n', '; '));
    }
    for (const row of root.querySelectorAll<HTMLTableRowElement>('.smelt-data tbody tr')) {
      const config = row.querySelector('th')?.textContent;
      if (config === text.config(size, sparsity)) row.dataset.highlight = ''; else delete row.dataset.highlight;
    }
    if (readoutNode) readoutNode.innerHTML = readout(language, size, sparsity);
  };

  const sizeGroup = root.querySelector('[data-stages-size]');
  const sparsityGroup = root.querySelector('[data-stages-sparsity]');
  if (sizeGroup) bindSegmented(sizeGroup, value => { const previous = size; size = value; update(previous); });
  if (sparsityGroup) bindSegmented(sparsityGroup, value => { sparsity = value; update(size); });
  // The per-layer dots are one tab stop; arrow keys step through the layers.
  for (const group of root.querySelectorAll<SVGGElement>('[data-dots]')) group.addEventListener('keydown', event => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    const dots = [...group.querySelectorAll<SVGCircleElement>('.stages-dot')];
    const index = dots.indexOf(event.target as SVGCircleElement);
    const next = dots[index + step];
    event.preventDefault();
    if (index < 0 || !next) return;
    for (const dot of dots) dot.setAttribute('tabindex', dot === next ? '0' : '-1');
    next.focus();
  });
  bindTooltips(root);
  armReveal(root);
}

for (const root of document.querySelectorAll<HTMLElement>('[data-attention-stages]')) init(root);
