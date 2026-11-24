// CloudClip review page. Under server.py it saves to comments.json; as a static page (the demo) it saves to localStorage.
const $ = id => document.getElementById(id);
const stage = $('stage'), overlay = $('overlay'), f = $('f'), txt = $('txt'), list = $('list'), status = $('status');
const IMAGE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const HTML_SIZE = [1280, 720]; // the fixed viewport an HTML deck runs in
// kind is 'video', 'image', 'slides' (a folder of slide pictures) or 'html' (a live deck in an iframe).
let media, kind, key, comments = [], server = false, pendingAt = 0, draft = null, selected = null, start = null;
let slide = 1, slides = 0, deckOrigin = '', context = null, visible = true;

const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const size = () => kind === 'html' ? HTML_SIZE : kind !== 'video' ? [media.naturalWidth, media.naturalHeight] : [media.videoWidth, media.videoHeight];

function setMedia(url, as, name) {
  media?.remove();
  kind = as; key = 'cloudclip:' + name; selected = null;
  media = document.createElement(kind === 'video' ? 'video' : kind === 'html' ? 'iframe' : 'img');
  media.id = 'media';
  if (kind === 'html') {
    deckOrigin = new URL(url).origin; media.title = name;
    media.sandbox = 'allow-scripts allow-same-origin allow-forms'; // no top navigation, so a deck can't replace this page
    media.onload = () => { if (!f.classList.contains('open')) media.focus(); };
  } else if (kind !== 'video') media.alt = name;
  else { media.controls = true; media.preload = 'metadata'; media.onplay = () => { selected = null; render(); }; }
  media.addEventListener(kind === 'video' ? 'loadedmetadata' : 'load', drawMarks);
  if (kind === 'slides') go(1); else media.src = url;
  stage.prepend(media);
  document.body.dataset.kind = kind;
}

// An HTML deck keeps its 1280x720 viewport and is scaled to the stage, so marks use the same pixels on every screen.
new ResizeObserver(() => { if (kind === 'html') media.style.transform = `scale(${stage.clientWidth / HTML_SIZE[0]})`; }).observe(stage);

function go(n) {
  if (n < 1 || n > slides || f.classList.contains('open')) return; // the open comment belongs to the slide on screen
  slide = n; media.src = '/media/' + n; media.alt = `Slide ${n}`;
  $('page').textContent = `${n} / ${slides}`;
  $('prev').disabled = n === 1; $('next').disabled = n === slides;
  drawMarks();
}

// Questions to the bridge script inside an HTML deck. Resolves to null when it doesn't answer.
const waiting = new Map();
let seq = 0;
const ask = (msg, ms = 500) => new Promise(done => {
  const id = ++seq;
  waiting.set(id, done);
  media.contentWindow.postMessage({ ...msg, id }, deckOrigin);
  setTimeout(() => { waiting.delete(id); done(null); }, ms);
});
addEventListener('message', e => {
  if (kind !== 'html' || e.source !== media.contentWindow || e.origin !== deckOrigin) return;
  const m = e.data;
  if (m?.cloudclip === 'reply') { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  if (m?.cloudclip === 'comment' && !f.classList.contains('open')) openForm();
  if (m?.cloudclip === 'moved' && selected && !f.classList.contains('open')) { selected = null; render(); }
});
// The deck's own scripts can send anything, so keep only the expected fields, at a bounded size.
const cut = (v, n) => String(v ?? '').slice(0, n);
const cleanContext = m => m && {
  hash: cut(m.hash, 200), scroll: { x: +m.scroll?.x || 0, y: +m.scroll?.y || 0 },
  elements: (Array.isArray(m.elements) ? m.elements : []).slice(0, 8)
    .map(e => ({ selector: cut(e?.selector, 500), text: cut(e?.text, 301), html: cut(e?.html, 601) })),
};

async function show(c) {
  selected = c; visible = true;
  if (kind === 'video') { media.currentTime = c.time; media.pause(); }
  if (kind === 'slides') go(c.slide);
  if (kind === 'html') {
    visible = false; render();
    const r = await ask({ cloudclip: 'locate', hash: c.hash, scroll: c.scroll, selector: c.elements?.[0]?.selector }, 1000);
    if (selected !== c) return;
    visible = !!r?.visible;
    status.textContent = visible ? '' : 'Open the slide with this comment, then click it again';
  }
  render();
}

function loadLocal() {
  try { comments = JSON.parse(localStorage.getItem(key)) || []; } catch { comments = []; }
}

async function save() {
  render();
  if (!server) {
    try { localStorage.setItem(key, JSON.stringify(comments)); status.textContent = 'Saved in this browser'; }
    catch { status.textContent = 'Could not save because browser storage is blocked'; }
    return;
  }
  status.textContent = 'Saving…';
  try {
    const r = await fetch('comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(comments) });
    status.textContent = r.ok ? `Saved ${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Save failed';
  } catch { status.textContent = 'Save failed. Is the server running?'; }
}

// Marks are stored in source pixels and drawn in percent, so they stay put when the page resizes.
function markEl(m, label, cls = '') {
  const [W, H] = size();
  if (!W) return;
  const el = document.createElement('div'), r = m.box || m.point;
  el.className = `mark ${m.box ? 'box' : 'point'} ${cls}`;
  el.style.left = r.x / W * 100 + '%'; el.style.top = r.y / H * 100 + '%';
  if (m.box) { el.style.width = r.w / W * 100 + '%'; el.style.height = r.h / H * 100 + '%'; }
  if (label) el.dataset.n = label;
  overlay.append(el);
}

function drawMarks() {
  overlay.replaceChildren();
  const here = c => kind === 'image' || (kind === 'slides' ? c.slide === slide : c === selected && visible);
  comments.forEach((c, i) => { if ((c.box || c.point) && here(c)) markEl(c, i + 1); });
  if (draft) markEl(draft, '', 'draft');
}

function render() {
  comments.sort((a, b) => (a.time ?? a.slide ?? 0) - (b.time ?? b.slide ?? 0));
  list.replaceChildren(...comments.map((c, i) => {
    const li = document.createElement('li');
    li.className = 'glass item' + (c === selected ? ' sel' : '');
    const t = document.createElement('button');
    t.className = 't'; t.textContent = kind === 'video' ? fmt(c.time) : kind === 'slides' ? `Slide ${c.slide}` : `#${i + 1}`;
    t.onclick = () => show(c);
    const p = document.createElement('div');
    p.className = 'text'; p.textContent = c.text;
    if (c.box || c.point) {
      const s = document.createElement('small');
      s.textContent = c.box ? `area ${c.box.w}×${c.box.h} at ${c.box.x},${c.box.y}` : `point at ${c.point.x},${c.point.y}`;
      const on = c.elements?.[0]?.text;
      if (on) s.textContent += ` · “${on.slice(0, 60)}”`;
      p.append(s);
    }
    const x = document.createElement('button');
    x.className = 'x'; x.textContent = '✕'; x.setAttribute('aria-label', 'Delete comment');
    x.onclick = () => { comments.splice(comments.indexOf(c), 1); save(); };
    li.append(t, p, x);
    return li;
  }));
  $('empty').hidden = comments.length > 0;
  $('json').textContent = JSON.stringify(comments, null, 2);
  drawMarks();
}

function openForm() {
  if (!media) return;
  if (kind === 'video') { media.pause(); pendingAt = +media.currentTime.toFixed(2); }
  if (kind === 'html') context = ask({ cloudclip: 'hit', point: { x: HTML_SIZE[0] / 2, y: HTML_SIZE[1] / 2 } });
  $('at').textContent = { video: fmt(pendingAt), image: 'this image', slides: `slide ${slide}`, html: 'this view' }[kind];
  draft = null; selected = null; render();
  f.classList.add('open'); stage.classList.add('marking'); txt.value = ''; txt.focus();
}
const closeForm = () => { f.classList.remove('open'); stage.classList.remove('marking'); draft = start = null; txt.blur(); if (kind === 'html') media.focus(); drawMarks(); };

// Drag draws a box; a click (under 4px of movement) drops a point. Only active while the comment form is open.
const toSrc = e => {
  const r = overlay.getBoundingClientRect(), [W, H] = size(), clamp = v => Math.min(Math.max(v, 0), 1);
  return { x: Math.round(clamp((e.clientX - r.left) / r.width) * W), y: Math.round(clamp((e.clientY - r.top) / r.height) * H), cx: e.clientX, cy: e.clientY };
};
overlay.onpointerdown = e => {
  if (!size()[0]) return;
  start = toSrc(e); overlay.setPointerCapture(e.pointerId);
  draft = { point: { x: start.x, y: start.y } }; drawMarks();
};
overlay.onpointermove = e => {
  if (!start) return;
  const p = toSrc(e);
  draft = Math.hypot(p.cx - start.cx, p.cy - start.cy) < 4 ? { point: { x: start.x, y: start.y } }
    : { box: { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) } };
  drawMarks();
};
overlay.onpointerup = () => {
  start = null;
  if (kind === 'html' && draft) context = ask({ cloudclip: 'hit', ...draft }); // now, since a deck may move on by itself
  txt.focus();
};

$('copy').onclick = async e => {
  e.preventDefault(); // the button sits in <summary>, so don't toggle the panel
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText($('json').textContent); b.textContent = 'Copied'; }
  catch { b.textContent = 'Copy failed'; }
  setTimeout(() => { b.textContent = 'Copy'; }, 1500);
};
$('done').onclick = async () => {
  await context; // a comment saved a moment ago may still be waiting for the deck's answer
  await save();
  try {
    if (!(await fetch('done', { method: 'POST' })).ok) throw 0;
    document.body.classList.add('finished');
    window.close(); // only closes tabs a script opened; the message covers the rest
  } catch { status.textContent = "Couldn't reach the agent. Tell it \"done\" in the chat."; }
};
$('add').onclick = openForm;
$('cancel').onclick = closeForm;
$('prev').onclick = () => go(slide - 1);
$('next').onclick = () => go(slide + 1);
f.onsubmit = async e => {
  e.preventDefault();
  const text = txt.value.trim();
  const c = kind === 'video' ? { time: pendingAt, timestamp: fmt(pendingAt), text } : kind === 'slides' ? { slide, text } : { text };
  Object.assign(c, draft);
  closeForm();
  if (!text) return;
  if (kind === 'html') Object.assign(c, cleanContext(await context));
  comments.push(c); selected = c; visible = true; save();
};
txt.onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); }
  if (e.key === 'Escape') closeForm();
};
document.addEventListener('keydown', e => {
  if (e.target === txt || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') return closeForm();
  if (e.key === 'c' || e.key === 'C') { e.preventDefault(); openForm(); }
  if (kind === 'slides') {
    if (e.key === 'ArrowLeft') go(slide - 1);
    if (e.key === 'ArrowRight') go(slide + 1);
  }
  if (kind !== 'video') return;
  if (e.key === ' ') { e.preventDefault(); media.paused ? media.play() : media.pause(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); media.currentTime -= 5; }
  else if (e.key === 'ArrowRight') { e.preventDefault(); media.currentTime += 5; }
});
$('file').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  // shortcut: earlier object URLs are never revoked; fine for a few files per page load.
  setMedia(URL.createObjectURL(file), file.type.startsWith('image/') ? 'image' : 'video', file.name);
  closeForm(); loadLocal(); render();
};

(async () => {
  try {
    const r = await fetch('comments', { cache: 'no-store' });
    const d = r.ok && await r.json();
    if (Array.isArray(d)) { server = true; comments = d; }
  } catch {}
  const q = new URLSearchParams(location.search), html = q.get('html'), src = q.get('src') || '../demo/sample.mp4';
  slides = +q.get('slides') || 0;
  // Only a local deck from our own server: on the public demo, ?html=javascript:… would run as this site.
  if (server && /^http:\/\/127\.0\.0\.1:\d+\//.test(html)) setMedia(html, 'html', decodeURIComponent(html.split('/').pop()));
  else setMedia(src, slides ? 'slides' : IMAGE.test(src) ? 'image' : 'video', decodeURIComponent(src.split('/').pop()));
  if (!server) loadLocal();
  document.body.classList.toggle('demo', !server);
  document.body.classList.toggle('server', server);
  $('mode').textContent = server ? 'Saving to comments.json' : 'Demo mode. Comments stay in this browser.';
  render();
})();
