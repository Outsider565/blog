// Fits the 1920 × 1080 poster sheet to the window, toggles actual size, and
// exports a PDF through the browser's print dialog (styles/smelt-poster.css
// sets the page to exactly one 16:9 sheet).
const page = document.querySelector<HTMLElement>('[data-poster-page]');
const viewport = page?.querySelector<HTMLElement>('[data-poster-viewport]');
const zoom = page?.querySelector<HTMLButtonElement>('[data-poster-zoom]');
const exporter = page?.querySelector<HTMLButtonElement>('[data-poster-export]');

if (page && viewport) {
  const sheet = { width: 1920, height: 1080 };
  let actual = false;

  const fit = () => {
    if (actual) {
      page.style.setProperty('--s', '1');
      return;
    }
    const styles = getComputedStyle(viewport);
    const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const width = viewport.clientWidth - padX;
    const height = viewport.clientHeight - padY;
    // Narrow screens fit the width and scroll; wide ones show the whole sheet.
    const byWidth = width / sheet.width;
    const scale = window.innerWidth < 760 ? byWidth : Math.min(byWidth, height / sheet.height);
    page.style.setProperty('--s', String(Math.max(0.1, scale)));
  };

  fit();
  new ResizeObserver(fit).observe(viewport);
  window.addEventListener('resize', fit);

  if (zoom) {
    zoom.hidden = false;
    const fitLabel = zoom.textContent?.trim() ?? '';
    const zh = page.dataset.language === 'zh';
    zoom.addEventListener('click', () => {
      actual = !actual;
      zoom.setAttribute('aria-pressed', String(actual));
      zoom.textContent = actual ? (zh ? '适应窗口' : 'Fit to window') : fitLabel;
      page.classList.toggle('is-actual', actual);
      fit();
    });
  }

  exporter?.addEventListener('click', () => {
    const title = document.title;
    document.title = 'SMELT-poster';
    const restore = () => { document.title = title; };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
    // Browsers without afterprint (or with a non-blocking dialog) still get the title back.
    setTimeout(restore, 1000);
  });
}

export {};
