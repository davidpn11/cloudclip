// Runs inside an HTML deck (injected by server.py) and tells the review page which elements a mark covers.
(() => {
  if (parent === window) return;
  const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
  const shown = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true);
  };
  const atPoint = (x, y) => {
    const first = root => root.elementsFromPoint(x, y).find(shown); // skips faded-out slides stacked on top
    let el = first(document), inner;
    while (el?.shadowRoot && (inner = first(el.shadowRoot)) && inner !== el) el = inner;
    return el;
  };
  const onTop = el => {
    const r = el.getBoundingClientRect(), top = atPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && (el.contains(top) || top.contains(el));
  };
  // Decks often scroll an inner container instead of the page.
  function scroller(el) {
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      if (a === document.body && getComputedStyle(document.documentElement).overflow === 'visible') break; // the page scrolls, not body
      const s = getComputedStyle(a);
      if (/auto|scroll/.test(s.overflow) && (a.scrollHeight > a.clientHeight || a.scrollWidth > a.clientWidth)) return a;
    }
    return document.scrollingElement || document.documentElement;
  }
  // Stops at a shadow root, so a selector there only works inside its host.
  function selector(el) {
    const parts = [];
    for (; el && el !== document.documentElement; el = el.parentElement) {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const tag = el.localName, same = el.parentElement ? [...el.parentElement.children].filter(c => c.localName === tag) : [];
      parts.unshift(CSS.escape(tag) + (same.length > 1 ? `:nth-of-type(${same.indexOf(el) + 1})` : ''));
    }
    return parts.join(' > ') || 'html';
  }
  const describe = el => ({
    selector: selector(el),
    text: clip((el.innerText ?? el.textContent ?? '').trim().replace(/\s+/g, ' '), 300),
    html: clip(el.outerHTML, 600),
  });
  // The topmost elements that fit inside the box, or the one under its center when nothing fits.
  function inBox(b) {
    const found = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (found.length === 8) break;
      if (found.some(f => f.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (r.left < b.x || r.top < b.y || r.right > b.x + b.w || r.bottom > b.y + b.h) continue;
      if (shown(el) && onTop(el)) found.push(el); // not an element of another slide stacked under this one
    }
    return found.length ? found : [atPoint(b.x + b.w / 2, b.y + b.h / 2)];
  }
  const answers = {
    hit: m => {
      const els = (m.box ? inBox(m.box) : [atPoint(m.point.x, m.point.y)]).filter(Boolean), s = scroller(els[0]);
      return { hash: location.hash, scroll: { x: Math.round(s.scrollLeft), y: Math.round(s.scrollTop) }, elements: els.map(describe) };
    },
    locate: async m => {
      if (m.hash && location.hash !== m.hash) {
        location.hash = m.hash;
        await new Promise(r => setTimeout(r, 400)); // let the slide transition run
      }
      const el = m.selector ? document.querySelector(m.selector) : null;
      if (m.scroll) scroller(el).scrollTo({ left: m.scroll.x, top: m.scroll.y, behavior: 'instant' });
      return { visible: !!el && shown(el) && onTop(el) };
    },
  };
  addEventListener('message', async e => {
    if (e.source !== parent || !answers[e.data?.cloudclip]) return;
    let reply = {};
    try { reply = await answers[e.data.cloudclip](e.data); } catch {}
    parent.postMessage({ cloudclip: 'reply', id: e.data.id, ...reply }, e.origin);
  });
  // Nothing private is in these two messages, so any parent may get them.
  const moved = () => parent.postMessage({ cloudclip: 'moved' }, '*');
  addEventListener('wheel', moved, { capture: true, passive: true });
  addEventListener('pointerdown', moved, true);
  // The deck has the keyboard focus, so pass C on.
  addEventListener('keydown', e => {
    moved();
    if ((e.key !== 'c' && e.key !== 'C') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.isContentEditable || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    parent.postMessage({ cloudclip: 'comment' }, '*');
  }, true);
})();
