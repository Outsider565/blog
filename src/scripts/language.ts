const stateKey = 'blog-language-reading-state';

try {
  const saved = sessionStorage.getItem(stateKey);
  if (saved) {
    sessionStorage.removeItem(stateKey);
    const state = JSON.parse(saved);
    if (state.path === location.pathname && Date.now() - state.timestamp < 60000) {
      const slider = document.querySelector<HTMLInputElement>('#elr-step');
      if (slider && Number.isFinite(state.step)) {
        slider.value = String(state.step);
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (Array.isArray(state.expanded)) {
        for (const identifier of state.expanded) {
          const details = document.getElementById(identifier);
          if (details instanceof HTMLDetailsElement && (details.classList.contains('elr-architecture') || details.classList.contains('evidence') || details.id === 'cost-ledger')) details.open = true;
        }
      }
    }
  }
} catch {}

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-language]')) {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.pathname === location.pathname) {
      event.preventDefault();
      return;
    }
    if (!document.querySelector('[data-article-body]')) {
      link.hash = location.hash;
      return;
    }
    const anchors = [...document.querySelectorAll<HTMLElement>('.article-prose > [id], .elr-architecture[open], .article-header[id]')];
    const current = anchors.filter(element => element.getClientRects().length && element.getBoundingClientRect().top <= 140).at(-1);
    link.hash = current?.id || location.hash;
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({
        path: link.pathname,
        timestamp: Date.now(),
        step: Number(document.querySelector<HTMLInputElement>('#elr-step')?.value),
        expanded: [...document.querySelectorAll<HTMLDetailsElement>('.elr-architecture[open], .evidence[open], #cost-ledger[open]')].map(details => details.id),
      }));
    } catch {}
  });
}

export {};
