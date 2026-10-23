// CloudClip review page. Under server.py it saves to comments.json; as a static page (the demo) it saves to localStorage.
const $ = id => document.getElementById(id);
const stage = $('stage'), overlay = $('overlay'), f = $('f'), txt = $('txt'), list = $('list'), status = $('status');
const IMAGE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
let media, isImage, key, comments = [], server = false, pendingAt = 0, draft = null, selected = null, start = null;

const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const size = () => isImage ? [media.naturalWidth, media.naturalHeight] : [media.videoWidth, media.videoHeight];

function setMedia(url, image, name) {
  media?.remove();
  isImage = image; key = 'cloudclip:' + name; selected = null;
  media = document.createElement(image ? 'img' : 'video');
  media.id = 'media'; media.src = url;
  if (image) media.alt = name;
  else { media.controls = true; media.preload = 'metadata'; media.onplay = () => { selected = null; render(); }; }
  media.addEventListener(image ? 'load' : 'loadedmetadata', drawMarks);
  stage.prepend(media);
  document.body.classList.toggle('is-image', image);
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
  comments.forEach((c, i) => { if ((c.box || c.point) && (isImage || c === selected)) markEl(c, i + 1); });
  if (draft) markEl(draft, '', 'draft');
}

function render() {
  comments.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  list.replaceChildren(...comments.map((c, i) => {
    const li = document.createElement('li');
    li.className = 'glass item' + (c === selected ? ' sel' : '');
    const t = document.createElement('button');
    t.className = 't'; t.textContent = isImage ? `#${i + 1}` : fmt(c.time);
    t.onclick = () => { if (!isImage) { media.currentTime = c.time; media.pause(); } selected = c; render(); };
    const p = document.createElement('div');
    p.className = 'text'; p.textContent = c.text;
    if (c.box || c.point) {
      const s = document.createElement('small');
      s.textContent = c.box ? `area ${c.box.w}×${c.box.h} at ${c.box.x},${c.box.y}` : `point at ${c.point.x},${c.point.y}`;
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
  if (!isImage) { media.pause(); pendingAt = +media.currentTime.toFixed(2); }
  $('at').textContent = isImage ? 'this image' : fmt(pendingAt);
  draft = null; selected = null; render();
  f.classList.add('open'); stage.classList.add('marking'); txt.value = ''; txt.focus();
}
const closeForm = () => { f.classList.remove('open'); stage.classList.remove('marking'); draft = start = null; txt.blur(); drawMarks(); };

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
overlay.onpointerup = () => { start = null; txt.focus(); };

$('add').onclick = openForm;
$('cancel').onclick = closeForm;
f.onsubmit = e => {
  e.preventDefault();
  const text = txt.value.trim();
  if (text) {
    const c = isImage ? { text } : { time: pendingAt, timestamp: fmt(pendingAt), text };
    comments.push(Object.assign(c, draft)); selected = c; save();
  }
  closeForm();
};
txt.onkeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); }
  if (e.key === 'Escape') closeForm();
};
document.addEventListener('keydown', e => {
  if (e.target === txt || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') return closeForm();
  if (e.key === 'c' || e.key === 'C') { e.preventDefault(); openForm(); }
  if (isImage) return;
  if (e.key === ' ') { e.preventDefault(); media.paused ? media.play() : media.pause(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); media.currentTime -= 5; }
  else if (e.key === 'ArrowRight') { e.preventDefault(); media.currentTime += 5; }
});
$('file').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  // shortcut: earlier object URLs are never revoked; fine for a few files per page load.
  setMedia(URL.createObjectURL(file), file.type.startsWith('image/'), file.name);
  closeForm(); loadLocal(); render();
};

(async () => {
  try {
    const r = await fetch('comments', { cache: 'no-store' });
    const d = r.ok && await r.json();
    if (Array.isArray(d)) { server = true; comments = d; }
  } catch {}
  const src = new URLSearchParams(location.search).get('src') || '../demo/sample.mp4';
  setMedia(src, IMAGE.test(src), decodeURIComponent(src.split('/').pop()));
  if (!server) loadLocal();
  document.body.classList.toggle('demo', !server);
  $('mode').textContent = server ? 'Saving to comments.json' : 'Demo mode. Comments stay in this browser.';
  render();
})();
