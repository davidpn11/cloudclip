// Light or dark: follows the system until the viewer clicks a [data-theme-toggle] button.
// Loaded in <head> so the saved choice applies before the first paint. The website and its demo iframe share the choice.
(() => {
  const KEY = 'cloudclip:theme', root = document.documentElement;
  const apply = t => { if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme; };
  try { apply(localStorage.getItem(KEY)); } catch {}
  addEventListener('storage', e => { if (e.key === KEY) apply(e.newValue); });
  document.addEventListener('click', e => {
    if (!e.target.closest?.('[data-theme-toggle]')) return;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch {}
  });
})();
