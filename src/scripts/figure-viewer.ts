const viewer = document.querySelector<HTMLDialogElement>('#figure-viewer');
const image = document.querySelector<HTMLImageElement>('#viewer-image');
const canvas = document.querySelector<HTMLDivElement>('.viewer-canvas');
const title = document.querySelector<HTMLElement>('#viewer-title');
const original = document.querySelector<HTMLAnchorElement>('#viewer-original');
const zoomValue = document.querySelector<HTMLOutputElement>('.viewer-controls output');
let zoom = 1;
let trigger: HTMLElement | null = null;
let aspectRatio = 1;
let drag: { left: number; top: number; startX: number; startY: number } | null = null;

function resize() {
  if (!image || !canvas || !zoomValue) return;
  const fitWidth = Math.max(1, Math.min(canvas.clientWidth - 36, (canvas.clientHeight - 36) * aspectRatio));
  image.style.width = `${fitWidth * zoom}px`;
  zoomValue.value = `${Math.round(zoom * 100)}%`;
}

if (viewer && image && canvas && title && original) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-enlarge]')) {
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const sourceImage = link.closest('figure')?.querySelector('img');
      trigger = link;
      zoom = 1;
      image.src = link.href;
      image.alt = sourceImage?.alt || link.dataset.caption || '';
      title.textContent = image.alt;
      original.href = link.href;
      viewer.showModal();
      document.documentElement.classList.add('dialog-open');
      aspectRatio = (sourceImage?.width || 4) / (sourceImage?.height || 3);
      resize();
      canvas.scrollTo(0, 0);
    });
  }
  for (const button of viewer.querySelectorAll<HTMLButtonElement>('[data-zoom]')) {
    button.addEventListener('click', () => {
      zoom = button.dataset.zoom === 'reset' ? 1 : Math.max(0.5, Math.min(5, zoom + (button.dataset.zoom === 'in' ? 0.5 : -0.5)));
      resize();
    });
  }
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('dialog-open');
    trigger?.focus({ preventScroll: true });
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || zoom <= 1) return;
    event.preventDefault();
    drag = { left: canvas.scrollLeft, top: canvas.scrollTop, startX: event.clientX, startY: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (drag) canvas.scrollTo(drag.left + drag.startX - event.clientX, drag.top + drag.startY - event.clientY);
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  window.addEventListener('resize', () => { if (viewer.open) resize(); });
}
