(() => {
  const storageKey = 'blog-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => value === 'light' || value === 'dark' ? value : 'system';
  const readPreference = () => {
    try { return normalize(localStorage.getItem(storageKey)); }
    catch { return 'system'; }
  };
  let preference = readPreference();

  function applyTheme() {
    const theme = preference === 'system' ? systemTheme.matches ? 'dark' : 'light' : preference;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151a17' : '#ffffff');
    for (const select of document.querySelectorAll('[data-theme-select]')) select.value = preference;
    for (const control of document.querySelectorAll('[data-theme-control]')) control.hidden = false;
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', applyTheme, { once: true });
  document.addEventListener('change', event => {
    if (!(event.target instanceof HTMLSelectElement) || !event.target.matches('[data-theme-select]')) return;
    preference = normalize(event.target.value);
    try { localStorage.setItem(storageKey, preference); } catch {}
    applyTheme();
  });
  systemTheme.addEventListener('change', () => {
    if (preference === 'system') applyTheme();
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = readPreference();
    applyTheme();
  });
})();
