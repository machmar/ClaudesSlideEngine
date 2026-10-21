/* slide-engine: turns <section> slides into an animated presentation. See README.md. */
(() => {
'use strict';
const body = document.body;
const W = +body.dataset.width || 1920, H = +body.dataset.height || 1080;
const ACCENT = body.dataset.accent || '#9fb3c8';      // neutral by default; a deck or theme sets its own
const LANG = body.dataset.lang || 'en';
const CYCLE = (body.dataset.transitions || 'cube-y,iris,blinds,dissolve,zoom,vortex,cube-x,fade')
  .split(',').map(s => s.trim()).filter(Boolean);
const ease = { io: 'cubic-bezier(.65,0,.35,1)', out: 'cubic-bezier(.16,1,.3,1)', in: 'cubic-bezier(.55,0,1,.45)' };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sstep = t => t * t * (3 - 2 * t);

/* ---------- colours from the accent ---------- */
const rgb = (() => { const h = ACCENT.replace('#', ''); const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [0, 2, 4].map(i => parseInt(f.substr(i, 2), 16)); })();
const mix = (c, t) => c.map(v => Math.round(v + (255 - v) * t));
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const LIGHT = mix(rgb, .55);
const root = document.documentElement.style;
root.setProperty('--se-accent', ACCENT);
root.setProperty('--se-accent-light', rgba(LIGHT, 1));
[35, 45, 50, 60, 75, 90].forEach(a => root.setProperty(`--se-accent-a${a}`, rgba(rgb, a / 100)));

/* ---------- build the stage from the <section> elements ---------- */
const stage = document.createElement('div'); stage.id = 'se-stage';
stage.style.width = W + 'px'; stage.style.height = H + 'px';
const NOTES = [];
const sections = [...document.querySelectorAll('body > section, body > main > section')];
const slides = sections.map((s, i) => {
  s.dataset.id = s.id || 'slide-' + (i + 1);
  s.classList.add('se-slide');
  s.style.width = W + 'px'; s.style.height = H + 'px';
  if (s.style.display === 'grid') s.dataset.display = 'grid';     // a CSS-only grid slide needs data-display="grid"
  s.style.display = '';
  const aside = s.querySelector(':scope > aside');
  NOTES.push(aside ? aside.textContent.trim() : '');
  if (aside) aside.remove();
  s.querySelectorAll('img[data-video]').forEach(img => {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = img.getAttribute('src') || ''; v.src = img.dataset.video;
    v.setAttribute('aria-label', img.alt || '');
    v.setAttribute('style', img.getAttribute('style') || '');
    if (!v.style.objectFit) v.style.objectFit = 'cover';
    if (img.dataset.fx) v.dataset.fx = img.dataset.fx;
    img.replaceWith(v);
  });
  s.querySelectorAll('table').forEach(t => { const p = t.style.padding; if (p) { t.style.padding = ''; t.style.setProperty('--cell-pad', p); } });
  stage.appendChild(s);
  return s;
});
const fx = document.createElement('canvas'); fx.id = 'se-fx'; fx.width = W; fx.height = H; fx.style.width = W + 'px'; fx.style.height = H + 'px';
const dotsEl = document.createElement('div'); dotsEl.id = 'se-dots';
const timerEl = document.createElement('div'); timerEl.id = 'se-timer'; timerEl.textContent = '0:00';
stage.append(fx, dotsEl, timerEl);
if (body.dataset.timer === 'off') body.classList.add('se-timer-off');
const notesEl = document.createElement('div'); notesEl.id = 'se-notes';
const hint = document.createElement('div'); hint.id = 'se-hint';
hint.innerHTML = LANG === 'cs'
  ? '<b>→ / mezerník</b> další · <b>←</b> zpět · <b>kolečko / G</b> přehled · <b>F</b> celá obrazovka · <b>H</b> všechny ovládací prvky'
  : '<b>→ / space</b> next · <b>←</b> back · <b>wheel / G</b> overview · <b>F</b> full screen · <b>H</b> all controls';
const helpEl = document.createElement('div'); helpEl.id = 'se-help';   // H / ? / F1: every control for 6 s, closed early by any key or click
helpEl.innerHTML = '<div><h3>' + (LANG === 'cs' ? 'Ovládání' : 'Controls') + '</h3><table>' + (LANG === 'cs' ? [
  ['→ · mezerník · Enter · PageDown · klik · boční tlačítko vpřed', 'další snímek'],
  ['← · PageUp · klik u levého okraje · boční tlačítko zpět', 'předchozí snímek'],
  ['Home · End', 'první · poslední snímek'],
  ['kolečko myši · G', 'přehled snímků: kolečko vybírá, → otevře, ← nebo Esc zpět'],
  ['F', 'celá obrazovka'],
  ['N', 'poznámky řečníka'],
  ['T · Shift+T', 'časomíra skrýt/zobrazit · vynulovat'],
  ['M', 'jednoduché přechody (slabý počítač)'],
  ['H · ? · F1', 'tato nápověda']] : [
  ['→ · space · Enter · PageDown · click · mouse forward button', 'next slide'],
  ['← · PageUp · click near the left edge · mouse back button', 'previous slide'],
  ['Home · End', 'first · last slide'],
  ['scroll wheel · G', 'slide overview: scroll to pick, → opens, ← or Esc goes back'],
  ['F', 'full screen'],
  ['N', 'speaker notes'],
  ['T · Shift+T', 'timer hide/show · reset'],
  ['M', 'simple transitions (slow PC)'],
  ['H · ? · F1', 'this help']]).map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('') + '</table></div>';
body.append(stage, notesEl, hint, helpEl);
const fctx = fx.getContext('2d');
let cur = 0, busy = false, queued = null, simple = false, running = [], skipFx = false;

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
}
addEventListener('resize', fit); fit();

/* ---------- glow sprite in the accent colour (iris ring, themes' lights) ---------- */
const sprite = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, rgba(mix(rgb, .9), 1)); r.addColorStop(.18, rgba(mix(rgb, .4), .95));
  r.addColorStop(.45, rgba(rgb, .35)); r.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return c;
})();

/* ---------- registries: the core fills them below, theme files (themes/<name>/theme.js) add to them ---------- */
const T = {}, BUILDS = {}, AMBIENTS = {}, DOTSTYLES = {};
function helper(cls, html, css) {           // an element the engine adds for an effect (never part of the deck's content)
  const e = document.createElement('div'); e.className = 'se-helper ' + cls; if (html) e.innerHTML = html;
  Object.assign(e.style, css || {}); return e;
}

/* ---------- element builds ---------- */
function splitLetters(el) {
  if (el.dataset.split) return; el.dataset.split = 1;
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'se-w';
          [...part].forEach(ch => { const c = document.createElement('span'); c.className = 'se-c'; c.textContent = ch; w.appendChild(c); });
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
  };
  walk(el);
}
const NUM = /\d{1,3}(?:[  ]\d{3})+(?:[,.]\d+)?|\d+(?:[,.]\d+)?/g;
function countTargets(el) {
  const text = el.textContent, nums = [...text.matchAll(NUM)];
  if (!nums.length) return null;
  return { text, nums: nums.map(m => {
    const dm = m[0].match(/[,.](\d+)$/);
    return { i: m.index, s: m[0], v: parseFloat(m[0].replace(/[  ]/g, '').replace(',', '.')),
      dec: dm ? dm[1].length : 0, dsep: dm ? m[0][m[0].length - dm[1].length - 1] : ',',
      sep: (m[0].match(/[  ]/) || [''])[0], lead: /^0\d/.test(m[0]) ? m[0].length : 0 };
  }) };
}
function fmt(v, n) {
  let s = v.toFixed(n.dec);
  let [a, b] = s.split('.');
  if (n.lead) a = a.padStart(n.lead - (b ? b.length + 1 : 0), '0');
  if (n.sep) a = a.replace(/\B(?=(\d{3})+(?!\d))/g, n.sep);
  return a + (b ? n.dsep + b : '');
}
function renderCount(el, info, p) {
  let out = '', last = 0;
  const arrow = /[→>]/.test(info.text) && info.nums.length === 2;
  info.nums.forEach((n, k) => {
    let v = n.v * p;
    if (arrow && k === 0) v = n.v * clamp(p / .35);
    if (arrow && k === 1) v = info.nums[0].v + (n.v - info.nums[0].v) * clamp((p - .35) / .65);
    out += info.text.slice(last, n.i) + fmt(v, n); last = n.i + n.s.length;
  });
  el.textContent = out + info.text.slice(last);
}

/* Decide once which elements animate how. data-fx on an element overrides the automatic choice. */
function plan(slide) {
  if (slide._plan) return slide._plan;
  const items = [], covered = new Set();
  const inside = el => [...covered].some(c => c !== el && c.contains(el));
  for (const el of slide.querySelectorAll('h1,h2,h3,h4,p,li,img,video,svg,table,ol,ul,div,figure,blockquote,pre')) {
    if (el.closest('.se-ambient,.se-scanbar,.se-helper') || el.closest('svg') !== null && el.tagName !== 'svg' && el.tagName !== 'SVG') continue;
    const tag = el.tagName.toUpperCase(), forced = el.dataset.fx;
    if (forced === 'none') { covered.add(el); continue; }
    const def = forced && BUILDS[forced];
    if (inside(el) && !(forced === 'count' || def && def.nested)) {
      if (tag === 'P' && !forced) { const big = parseFloat(getComputedStyle(el).fontSize) >= 60 && !el.children.length; const info = big && countTargets(el); if (info) items.push({ el, kind: 'count', info, quiet: true }); }
      continue;
    }
    if (forced === 'count') { const info = countTargets(el); if (info) items.push({ el, kind: 'count', info }); continue; }
    if (forced) {
      if (forced === 'letters') splitLetters(el);
      items.push({ el, kind: forced }); covered.add(el);
      if (forced === 'rows') addCellCounts(el, items);
      if (def && def.count && !el.children.length) { const info = countTargets(el); if (info) items.push({ el, kind: 'count', info, quiet: true }); }
      continue;
    }
    const cs = getComputedStyle(el);
    if (tag === 'DIV' || tag === 'FIGURE' || tag === 'BLOCKQUOTE') {
      const painted = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
      if (painted) { items.push({ el, kind: 'flip' }); covered.add(el); }
      continue;
    }
    if (/^H[1-4]$/.test(tag)) { splitLetters(el); items.push({ el, kind: 'letters' }); covered.add(el); continue; }
    if (tag === 'IMG' || tag === 'SVG' || tag === 'PRE') { items.push({ el, kind: 'pop' }); covered.add(el); continue; }
    if (tag === 'VIDEO') { items.push({ el, kind: 'tilt' }); covered.add(el); continue; }
    if (tag === 'TABLE') { items.push({ el, kind: 'rows' }); covered.add(el); addCellCounts(el, items); continue; }
    if (tag === 'OL' || tag === 'UL') { items.push({ el, kind: 'list' }); covered.add(el); continue; }
    if (tag === 'P' || tag === 'LI') {
      const big = parseFloat(cs.fontSize) >= 60 && !el.children.length;
      const info = big ? countTargets(el) : null;
      if (info) items.push({ el, kind: 'count', info, quiet: true });
      items.push({ el, kind: big ? 'pop' : 'rise' }); covered.add(el);
    }
  }
  return (slide._plan = items);
}
function addCellCounts(table, items) {        // right-aligned number cells count up
  table.querySelectorAll('td').forEach(td => {
    if (getComputedStyle(td).textAlign !== 'right') return;
    const t = td.querySelector('b,strong') || td, info = countTargets(t);
    if (info && !t.children.length && /^\s*\d/.test(t.textContent)) items.push({ el: t, kind: 'count', info, quiet: true });
  });
}

const GLOW = rgba(rgb, .95);
/* keyframes sampled from a motion function of time (ms), so that helpers can follow the same path exactly */
const sampled = (T, fn, n = 40) => Array.from({ length: n + 1 }, (_, i) => Object.assign({ offset: i / n }, fn(T * i / n)));
/* where an element sits on its slide (canvas px), measured before any build moves it; measure "text" adds the box of
   the text itself (tx = right edge, ty, th), not of the (often full-width) element around it */
function geoOf(el, measure) {
  const slide = el.closest('.se-slide'), sr = slide.getBoundingClientRect(), k = sr.width / W, r = el.getBoundingClientRect();
  const g = { slide, x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  if (measure === 'text') {
    const rg = document.createRange(); rg.selectNodeContents(el); const tr = rg.getBoundingClientRect();
    g.tx = (tr.right - sr.left) / k; g.ty = (tr.top - sr.top) / k; g.th = tr.height / k;
  }
  return g;
}
function makeBuild(item, delay, out) {
  const { el, kind } = item;
  const A = (target, k, o) => out.push(target.animate(k, Object.assign({ fill: 'both', delay }, o)));
  const radius = getComputedStyle(el).borderRadius || '0px';
  switch (kind) {
    case 'letters': {
      const cs = el.querySelectorAll('.se-c'), big = parseFloat(getComputedStyle(el).fontSize) > 100;
      cs.forEach((c, i) => out.push(c.animate([
        { opacity: 0, transform: 'translateY(.7em) rotateX(-100deg) scale(.6)', filter: 'blur(8px)', textShadow: '0 0 0 transparent' },
        { opacity: 1, transform: 'translateY(-.08em) rotateX(10deg) scale(1.08)', filter: 'blur(0)', textShadow: `0 0 34px ${GLOW}`, offset: .6 },
        { opacity: 1, transform: 'none', filter: 'blur(0)', textShadow: '0 0 0 transparent' }
      ], { duration: big ? 1100 : 800, delay: delay + i * (big ? 70 : 22), easing: ease.out, fill: 'both' })));
      break;
    }
    case 'rise': A(el, [{ opacity: 0, transform: 'translateY(46px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 750, easing: ease.out }); break;
    case 'fade': A(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: ease.out }); break;
    case 'pop': A(el, [{ opacity: 0, transform: 'scale(.4) rotate(-6deg)' }, { opacity: 1, transform: 'scale(1.12) rotate(1deg)', offset: .65 }, { opacity: 1, transform: 'none' }], { duration: 850, easing: ease.out }); break;
    case 'flip': A(el, [{ opacity: 0, transform: 'perspective(1400px) rotateY(-85deg) translateX(-80px) scale(.9)', transformOrigin: '0% 50%' },
      { opacity: 1, transform: 'perspective(1400px) rotateY(8deg) scale(1.02)', transformOrigin: '0% 50%', offset: .7 },
      { opacity: 1, transform: 'none', transformOrigin: '0% 50%' }], { duration: 1050, easing: ease.out }); break;
    case 'rows': [...el.rows].forEach((r, i) => out.push(r.animate([
      { opacity: 0, transform: 'translateX(-120px) skewX(-12deg)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: 700, delay: delay + i * 120, easing: ease.out, fill: 'both' }))); break;
    case 'list': [...el.children].forEach((li, i) => out.push(li.animate([
      { opacity: 0, transform: 'translateX(70px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
      { duration: 800, delay: delay + i * 260, easing: ease.out, fill: 'both' }))); break;
    case 'power': {
      const ins = (t, b) => `inset(${t} 0 ${b} 0 round ${radius})`;
      A(el, [
        { opacity: 0, clipPath: ins('49%', '49%'), filter: 'brightness(4) saturate(0)' },
        { opacity: 1, clipPath: ins('49%', '49%'), filter: 'brightness(5) saturate(0)', offset: .18 },
        { opacity: 1, clipPath: ins('0%', '0%'), filter: 'brightness(2.2) saturate(.5)', offset: .45 },
        { opacity: .35, clipPath: ins('0%', '0%'), filter: 'brightness(.5)', offset: .55 },
        { opacity: 1, clipPath: ins('0%', '0%'), filter: 'brightness(1.6)', offset: .65 },
        { opacity: .6, clipPath: ins('0%', '0%'), filter: 'brightness(.8)', offset: .72 },
        { opacity: 1, clipPath: ins('0%', '0%'), filter: 'brightness(1)' }], { duration: 1500, easing: 'linear' });
      break;
    }
    case 'tilt': A(el, [
      { opacity: 0, transform: 'perspective(1100px) rotateX(70deg) translateY(160px) scale(.8)', filter: 'brightness(3)' },
      { opacity: 1, transform: 'perspective(1100px) rotateX(-8deg) translateY(-10px)', filter: 'brightness(1.8)', offset: .6 },
      { opacity: 1, transform: 'none', filter: 'brightness(1)' }], { duration: 1200, easing: ease.out }); break;
    case 'spin3d': A(el, [
      { opacity: 0, transform: 'perspective(1800px) rotateY(-110deg) rotateZ(-8deg) scale(.6)', filter: 'drop-shadow(0 0 0 transparent)' },
      { opacity: 1, transform: 'perspective(1800px) rotateY(14deg) rotateZ(1deg) scale(1.04)', filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.35))', offset: .7 },
      { opacity: 1, transform: 'none', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,.18))' }], { duration: 1700, easing: ease.out }); break;
    case 'scan': {
      A(el, [{ clipPath: `inset(0 100% 0 0 round ${radius})`, filter: 'sepia(1) hue-rotate(60deg) brightness(1.2)' },
        { clipPath: `inset(0 0% 0 0 round ${radius})`, filter: 'sepia(1) hue-rotate(60deg) brightness(1.2)', offset: .8 },
        { clipPath: `inset(0 0% 0 0 round ${radius})`, filter: 'none' }], { duration: 2000, easing: 'cubic-bezier(.45,0,.55,1)' });
      const slide = el.closest('.se-slide'), sr = slide.getBoundingClientRect(), r = el.getBoundingClientRect(), k = sr.width / W;
      const x = (r.left - sr.left) / k, y = (r.top - sr.top) / k, w = r.width / k, h = r.height / k;
      const bar = document.createElement('div'); bar.className = 'se-scanbar';
      bar.style.left = x + 'px'; bar.style.top = (y - 10) + 'px'; bar.style.height = (h + 20) + 'px';
      slide.appendChild(bar);
      out.push(bar.animate([{ transform: 'translateX(-7px)', opacity: 0 }, { opacity: 1, offset: .05 },
        { transform: `translateX(${w - 7}px)`, opacity: 1, offset: .8 }, { transform: `translateX(${w - 7}px)`, opacity: 0 }],
        { duration: 2000, delay, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both' }));
      break;
    }
    case 'radial': A(el, [
      { clipPath: 'circle(0% at 50% 6%)', filter: 'hue-rotate(200deg) saturate(2) brightness(1.3)', transform: 'scale(.9) rotate(-4deg)' },
      { clipPath: 'circle(80% at 50% 6%)', filter: 'hue-rotate(90deg) saturate(1.5)', transform: 'scale(1.02) rotate(1deg)', offset: .6 },
      { clipPath: 'circle(150% at 50% 6%)', filter: 'none', transform: 'none' }], { duration: 2200, easing: ease.out }); break;
    case 'count': {
      const info = item.info; renderCount(el, info, 0);
      if (el._se && el._se.countDelay != null) delay = el._se.countDelay;   // a theme effect can hold the count back
      let t0 = null;
      out.push({ raf: 0, cancel() { cancelAnimationFrame(this.raf); }, finish() { cancelAnimationFrame(this.raf); renderCount(el, info, 1); }, pause() {},
        play() { const go = now => { if (t0 === null) t0 = now + delay; const p = clamp((now - t0) / 1500); renderCount(el, info, 1 - Math.pow(1 - p, 4)); if (p < 1) this.raf = requestAnimationFrame(go); }; this.raf = requestAnimationFrame(go); } });
      break;
    }
    default: { const def = BUILDS[kind]; if (def) def.make(item, { el, delay, out, A, geo: item.geo, slide: el.closest('.se-slide') }); }
  }
}
function prime(slide) {            // put a slide's elements in their "before" state, paused
  resetBuilds(slide);
  const anims = [], speed = simple ? .5 : 1;
  let k = 0;
  plan(slide).forEach(it => { it.el._se = {}; const d = BUILDS[it.kind]; it.geo = d && d.measure ? geoOf(it.el, d.measure) : null; });
  plan(slide).forEach(it => { makeBuild(it, (it.kind === 'count' ? 250 + k * 60 : k * 140) * speed, anims); if (!it.quiet) k++; });
  anims.forEach(a => a.pause());
  slide._builds = anims;
}
const playBuilds = slide => (slide._builds || []).forEach(a => a.play());
function resetBuilds(slide) {
  (slide._builds || []).forEach(a => a.cancel());
  slide._builds = null;
  slide.querySelectorAll('.se-scanbar,.se-helper').forEach(b => b.remove());
  (slide._plan || []).forEach(it => { if (it.kind === 'count') renderCount(it.el, it.info, 1); delete it.el._se; });
}

/* ---------- ambient backgrounds: data-ambient="<name>" on a slide, all from themes ----------
   AMBIENTS[name] = { init(slide, canvas) -> state, draw(g, state, t, dt, still) }; still = a frozen frame (overview). */
const ambients = [];
function startAmbients() {          // after the themes have registered theirs
  slides.forEach(s => {
    const def = AMBIENTS[s.dataset.ambient]; if (!def) return;
    const c = document.createElement('canvas'); c.className = 'se-ambient'; c.width = W; c.height = H; c.style.width = W + 'px'; c.style.height = H + 'px'; s.prepend(c);
    ambients.push({ s, def, g: c.getContext('2d'), st: (def.init && def.init(s, c)) || {}, last: null });
  });
  if (ambients.length) requestAnimationFrame(ambientTick);
}
function ambientTick(now) {
  const t = now / 1000;
  for (const a of ambients) {
    if (!a.s.classList.contains('se-on')) { a.last = null; continue; }
    const dt = a.last == null ? 0 : Math.min(.1, t - a.last); a.last = t;
    a.def.draw(a.g, a.st, t, dt, false);
  }
  requestAnimationFrame(ambientTick);
}
const drawAmbient = (g, a, t, still) => a.def.draw(g, a.st, t, 0, !!still);

/* ---------- transitions ---------- */
function A(el, k, o) { const a = el.animate(k, Object.assign({ fill: 'both' }, o)); running.push(a); return a; }
function layer(el, z) { el.style.zIndex = z; el.classList.add('se-on'); }
function rafLoop(dur, fn) {
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => { const p = skipFx ? 1 : clamp((now - t0) / dur); fn(p); if (p < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}
function centerOf(el) {
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / W;
  return [(r.left + r.width / 2 - s.left) / k, (r.top + r.height / 2 - s.top) / k];
}
function focusOf(target, fallbackSlide) {    // data-focus="x,y" on the incoming slide, else its (or a fallback's) first picture
  const f = target.dataset.focus;
  if (f) { const [x, y] = f.split(',').map(Number); return [x, y]; }
  const m = (fallbackSlide || target).querySelector('img,video,svg');
  return m ? centerOf(m) : [W / 2, H / 2];
}
const finished = a => a.finished.catch(() => {});


function cube(axis) {
  return async (from, to, dir, reveal) => {
    const half = axis === 'Y' ? W / 2 : H / 2, sign = axis === 'Y' ? -dir : dir, rot = 'rotate' + axis;
    from.style.transformOrigin = to.style.transformOrigin = `50% 50% -${half}px`;
    layer(from, 2); layer(to, 1);
    const dur = simple ? 600 : 1500;
    const a = A(from, [{ transform: `${rot}(0deg)`, filter: 'brightness(1)' },
      { transform: `translateZ(-600px) ${rot}(${sign * 45}deg)`, filter: 'brightness(.7)', offset: .5 },
      { transform: `${rot}(${sign * 90}deg)`, filter: 'brightness(.25)' }], { duration: dur, easing: ease.io });
    A(to, [{ transform: `${rot}(${-sign * 90}deg)`, filter: 'brightness(.25)' },
      { transform: `translateZ(-600px) ${rot}(${-sign * 45}deg)`, filter: 'brightness(.7)', offset: .5 },
      { transform: `${rot}(0deg)`, filter: 'brightness(1)' }], { duration: dur, easing: ease.io });
    setTimeout(reveal, dur * .45);
    await finished(a);
  };
}
T['cube-y'] = cube('Y'); T['cube-x'] = cube('X');

T.iris = async (from, to, dir, reveal) => {
  layer(to, 0);
  const [cx, cy] = focusOf(to);
  layer(from, 1); layer(to, 2);
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 40, dur = simple ? 600 : 1500;
  const ring = document.createElement('div'); ring.className = 'se-ring'; stage.appendChild(ring);
  Object.assign(ring.style, { left: (cx - R) + 'px', top: (cy - R) + 'px', width: 2 * R + 'px', height: 2 * R + 'px' });
  A(ring, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: .9, offset: .85 }, { transform: 'scale(1.08)', opacity: 0 }], { duration: dur, easing: ease.in, fill: 'forwards' });
  A(from, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(.86) rotate(-3deg)', filter: 'brightness(.35)' }], { duration: dur, easing: ease.io });
  const a = A(to, [{ clipPath: `circle(0px at ${cx}px ${cy}px)` }, { clipPath: `circle(${R}px at ${cx}px ${cy}px)` }], { duration: dur, easing: ease.in });
  setTimeout(reveal, dur * .35);
  await finished(a); ring.remove();
};

T.blinds = async (from, to, dir, reveal) => {
  const n = 14, sw = W / n, dur = simple ? 600 : 1500;
  layer(from, 1); layer(to, 2);
  A(from, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(.92)', filter: 'brightness(.4)' }], { duration: dur, easing: ease.io });
  to.style.maskImage = to.style.webkitMaskImage = Array(n).fill('linear-gradient(#000,#000)').join(',');
  to.style.maskRepeat = to.style.webkitMaskRepeat = 'no-repeat';
  setTimeout(reveal, dur * .4);
  await rafLoop(dur, p => {
    const size = [], pos = [];
    for (let i = 0; i < n; i++) {
      const k = dir > 0 ? i : n - 1 - i, local = clamp(p * 1.7 - (k / n) * .7);
      const w = (sw + 2) * sstep(clamp(local * 1.25)), h = H * sstep(clamp(local * 1.6));
      size.push(`${w}px ${h}px`); pos.push(`${i * sw + sw / 2 - w / 2}px ${i % 2 ? 0 : H - h}px`);
    }
    to.style.maskSize = to.style.webkitMaskSize = size.join(',');
    to.style.maskPosition = to.style.webkitMaskPosition = pos.join(',');
  });
};

T.dissolve = async (from, to, dir, reveal) => {
  layer(to, 1); layer(from, 2); reveal();
  const cw = 48, ch = 27, m = document.createElement('canvas'); m.width = cw; m.height = ch; const g = m.getContext('2d');
  const r = Array.from({ length: cw * ch }, (_, i) => { const x = i % cw, y = i / cw | 0; return Math.random() * .55 + (Math.hypot(x - cw / 2, (y - ch / 2) * 1.7) / cw) * .45; });
  const img = g.createImageData(cw, ch), dur = simple ? 500 : 1300;
  A(from, [{ filter: 'brightness(1) saturate(1)' }, { filter: 'brightness(1.8) saturate(.2)' }], { duration: dur, easing: 'linear' });
  from.style.maskSize = from.style.webkitMaskSize = '100% 100%';
  await rafLoop(dur, p => {
    for (let i = 0; i < r.length; i++) img.data[i * 4 + 3] = clamp((r[i] - p * 1.15) * 8 + .5) * 255;
    g.putImageData(img, 0, 0);
    from.style.maskImage = from.style.webkitMaskImage = `url(${m.toDataURL()})`;
  });
};

T.zoom = async (from, to, dir, reveal) => {
  layer(from, 2); layer(to, 1);
  const dur = simple ? 600 : 1500, k = dir > 0 ? 1 : -1;
  A(from, [{ transform: 'scale(1) rotate(0)', opacity: 1, filter: 'blur(0)' }, { transform: `scale(${dir > 0 ? 4 : .2}) rotate(${k * 12}deg)`, opacity: 0, filter: 'blur(14px)' }], { duration: dur * .7, easing: ease.in });
  const a = A(to, [{ transform: `scale(${dir > 0 ? .25 : 3}) rotate(${-k * 20}deg)`, opacity: 0, filter: 'blur(10px)' },
    { transform: 'scale(1.05) rotate(1deg)', opacity: 1, filter: 'blur(0)', offset: .75 }, { transform: 'none', opacity: 1, filter: 'blur(0)' }],
    { duration: dur * .8, delay: dur * .25, easing: ease.out });
  setTimeout(reveal, dur * .4);
  await finished(a);
};

T.glitch = async (from, to, dir, reveal) => {
  layer(from, 2); layer(to, 1);
  const frames = (n, end) => Array.from({ length: n + 1 }, (_, i) => {
    const last = i === n, y1 = Math.random() * 80, y2 = y1 + 5 + Math.random() * 30;
    return { offset: i / n, easing: 'steps(1, end)', opacity: last ? end : 1,
      transform: last ? 'none' : `translateX(${(Math.random() - .5) * 160}px) skewX(${(Math.random() - .5) * 20}deg)`,
      clipPath: last || Math.random() < .5 ? 'inset(0 0 0 0)' : `inset(${y1}% 0 ${100 - y2}% 0)`,
      filter: last ? 'none' : `drop-shadow(${12 + Math.random() * 20}px 0 rgba(255,40,90,.85)) drop-shadow(${-12 - Math.random() * 20}px 0 rgba(0,230,255,.85)) hue-rotate(${Math.random() * 360}deg)` };
  });
  const d = simple ? 300 : 650;
  await finished(A(from, frames(10, 0), { duration: d, fill: 'forwards' }));
  from.classList.remove('se-on'); layer(to, 2); reveal();
  await finished(A(to, frames(10, 1), { duration: d }));
};

T.vortex = async (from, to, dir, reveal) => {
  layer(from, 2); layer(to, 1);
  const dur = simple ? 600 : 1700, k = dir > 0 ? 1 : -1;
  A(from, [{ transform: 'rotate(0) scale(1)', clipPath: 'circle(120% at 50% 50%)', filter: 'brightness(1)' },
    { transform: `rotate(${k * 220}deg) scale(.15)`, clipPath: 'circle(12% at 50% 50%)', filter: 'brightness(2.5)' }], { duration: dur * .6, easing: ease.in });
  const a = A(to, [{ transform: `rotate(${-k * 220}deg) scale(.15)`, clipPath: 'circle(10% at 50% 50%)', filter: 'brightness(2.5)', opacity: 0 },
    { transform: `rotate(${k * 8}deg) scale(1.04)`, clipPath: 'circle(90% at 50% 50%)', filter: 'brightness(1.2)', opacity: 1, offset: .75 },
    { transform: 'none', clipPath: 'circle(120% at 50% 50%)', filter: 'brightness(1)', opacity: 1 }], { duration: dur * .7, delay: dur * .3, easing: ease.out });
  setTimeout(() => { to.style.zIndex = 3; reveal(); }, dur * .45);
  await finished(a);
};

T.fade = async (from, to, dir, reveal) => {
  layer(from, 1); layer(to, 2); reveal();
  await finished(A(to, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 }));
};
T.none = async (from, to, dir, reveal) => { layer(to, 2); reveal(); };

/* ---------- themes ----------
   A theme file (themes/<name>/theme.js, linked BEFORE engine.js) pushes { name, setup(se) } onto
   window.slideEngineThemes. setup() gets the API below and registers its transitions, element effects, ambients and
   dot styles. Names are global, so a deck can link several themes and mix their effects with the core ones.
   themes/README.md documents the API and lists every theme. */
const CORE_FX = ['letters', 'rise', 'fade', 'pop', 'flip', 'rows', 'list', 'power', 'tilt', 'spin3d', 'scan', 'radial', 'count', 'none'];
const THEMES = [];
const themeAPI = {
  W, H, body, stage, fx, fctx, sprite, ACCENT, rgb, ease,
  get simple() { return simple; },                       // M key: plain, short transitions
  clamp, sstep, rgba, mix, A, layer, rafLoop, finished, focusOf, centerOf, helper, sampled, splitLetters, countTargets,
  css(text) { const st = document.createElement('style'); st.textContent = text; document.head.appendChild(st); },
  transition(name, fn) { T[name] = fn; },
  build(name, def) { BUILDS[name] = typeof def === 'function' ? { make: def } : def; },
  ambient(name, def) { AMBIENTS[name] = def; },
  dots(name, def) { DOTSTYLES[name] = def; }
};
(window.slideEngineThemes || []).forEach(th => {
  try { th.setup(themeAPI); THEMES.push(th.name); } catch (e) { console.error(`slide-engine: theme "${th && th.name}" failed`, e); }
});
window.slideEngineThemes = { push: th => console.warn(`slide-engine: theme "${th && th.name}" was loaded after engine.js and is ignored; link themes before the engine`) };
startAmbients();
{                                   // name a missing theme instead of failing quietly
  const miss = new Map(), note = (what, i) => { if (!miss.has(what)) miss.set(what, new Set()); miss.get(what).add(i + 1); };
  slides.forEach((s, i) => {
    if (s.dataset.enter && !T[s.dataset.enter]) note(`data-enter="${s.dataset.enter}"`, i);
    if (s.dataset.ambient && !AMBIENTS[s.dataset.ambient]) note(`data-ambient="${s.dataset.ambient}"`, i);
    s.querySelectorAll('[data-fx]').forEach(el => { const f = el.dataset.fx; if (!CORE_FX.includes(f) && !BUILDS[f]) note(`data-fx="${f}"`, i); });
  });
  const d = body.dataset.dots; if (d && d !== 'on' && d !== 'off' && !DOTSTYLES[d]) miss.set(`data-dots="${d}"`, new Set());
  miss.forEach((at, what) => console.warn(`slide-engine: unknown ${what}${at.size ? ' (slide ' + [...at].join(', ') + ')' : ''}. Is its theme linked before engine.js? See themes/README.md`));
}

/* the transition INTO each slide: its data-enter, else the next one from the cycle */
slides.forEach((s, i) => { if (!s.dataset.enter || !T[s.dataset.enter]) { s.dataset.enterAuto = ''; s.dataset.enter = CYCLE[(i - 1 + CYCLE.length) % CYCLE.length] || 'fade'; } });

/* ---------- navigation ---------- */
slides.forEach(() => dotsEl.appendChild(document.createElement('i')));
const dotStyle = DOTSTYLES[body.dataset.dots];      // data-dots="<name>" from a theme restyles the progress dots
if (dotStyle && dotStyle.init) dotStyle.init(dotsEl, slides.length);
const seen = new Set();
function chrome() {
  dotsEl.querySelectorAll('i').forEach((d, i) => { d.classList.toggle('cur', i === cur); d.classList.toggle('seen', seen.has(i)); });
  if (dotStyle && dotStyle.update) dotStyle.update(cur, dotsEl);
  notesEl.textContent = NOTES[cur] || '';
  if (!settling) history.replaceState(history.state, '', '#' + (cur + 1));
}
function media(slide, on) {
  slide.querySelectorAll('video').forEach(v => { if (on) { v.currentTime = 0; v.play().catch(() => {}); } else v.pause(); });
}
function cleanup(s) {
  s.style.zIndex = ''; s.style.transformOrigin = ''; s.style.clipPath = '';
  ['maskImage', 'webkitMaskImage', 'maskSize', 'webkitMaskSize', 'maskPosition', 'webkitMaskPosition', 'maskRepeat', 'webkitMaskRepeat'].forEach(p => s.style[p] = '');
}
async function go(n, forceDir) {
  n = clamp(n, 0, slides.length - 1);
  if (n === cur || ovState) return;
  startTimer();
  if (busy) { queued = n; skipFx = true; running.forEach(a => { try { a.finish(); } catch (e) {} }); return; }
  busy = true;
  const from = slides[cur], to = slides[n], dir = forceDir || (n > cur ? 1 : -1);
  const name = simple ? 'fade' : (dir > 0 ? to : from).dataset.enter;
  to.classList.add('se-on'); to.style.zIndex = 0;        // laid out for measuring, but underneath
  swapped(from, to, dir); prime(to); media(to, true);
  let revealed = false; const reveal = () => { if (!revealed) { revealed = true; playBuilds(to); } };
  try { await (T[name] || T.fade)(from, to, dir, reveal); } catch (e) { console.error(e); }
  reveal();
  running.forEach(a => { try { a.cancel(); } catch (e) {} }); running = [];
  from.classList.remove('se-on'); media(from, false); resetBuilds(from);
  slides.forEach(cleanup); to.classList.add('se-on'); to.style.zIndex = 2;
  fctx.clearRect(0, 0, W, H);
  seen.add(cur); cur = n; chrome();
  busy = false; skipFx = false;
  if (queued !== null) { const q = queued; queued = null; if (q !== cur) go(q); }
}
/* talk timer in the corner: starts on the first slide change, T hides/shows it, Shift+T resets it */
let timerStart = null, timerIv = 0;
function startTimer() {
  if (timerStart !== null) return;
  timerStart = Date.now(); timerEl.classList.add('run');
  timerIv = setInterval(() => {
    const s = Math.floor((Date.now() - timerStart) / 1000), h = s / 3600 | 0, m = (s / 60 | 0) % 60, two = v => String(v).padStart(2, '0');
    timerEl.textContent = (h ? h + ':' + two(m) : m) + ':' + two(s % 60);
  }, 250);
}
function resetTimer() { clearInterval(timerIv); timerStart = null; timerEl.classList.remove('run'); timerEl.textContent = '0:00'; }

/* In-slide steps: before leaving the current slide, every next/back input (keys, click, clicker, mouse side buttons,
   browser history, swipe; not the overview) is offered to the slide as a cancelable `se:step` event, detail.dir = 1 / -1.
   A slide that steps through its own content calls preventDefault() and stays. `se:enter` / `se:leave` (detail.dir)
   fire on a slide when it becomes / stops being the current one, so it can reset its steps. */
const stepHere = d => !busy && queued === null && !slides[cur].dispatchEvent(new CustomEvent('se:step', { detail: { dir: d }, cancelable: true }));
const swapped = (from, to, dir) => { from.dispatchEvent(new CustomEvent('se:leave', { detail: { dir } })); to.dispatchEvent(new CustomEvent('se:enter', { detail: { dir } })); };
const next = () => ovState ? closeOverview(ovSel) : stepHere(1) || go((queued ?? cur) + 1);
const prev = () => ovState ? closeOverview(ovFrom) : stepHere(-1) || go((queued ?? cur) - 1);

/* ---------- overview: a grid of all slides ----------
   The scroll wheel (or G) zooms out of the current slide into a grid of all slides; scrolling moves the highlight,
   any "next" input (→, space, clicker, forward button, ...) zooms into the highlighted slide, any "back" input (or Esc)
   returns to the slide it was opened from. A slide entered this way is shown fully built, like its thumbnail. */
let ovState = 0, ovEl = null, ovGrid, ovBg, thumbs = [], ovSel = 0, ovFrom = 0, ovOff = 0, ovOpening = null;  // ovState: 0 closed, 1 open, 2 closing
const OV = { pad: 90, gap: 40 };
function buildOverview() {
  const n = slides.length;
  OV.cols = n <= 9 ? 3 : 4;                 // big thumbnails; extra rows scroll
  OV.w = (W - 2 * OV.pad - (OV.cols - 1) * OV.gap) / OV.cols; OV.h = OV.w * H / W;
  OV.vis = Math.max(1, Math.floor((H - 2 * OV.pad + OV.gap) / (OV.h + OV.gap)));
  const rows = Math.min(Math.ceil(n / OV.cols), OV.vis), top = (H - rows * OV.h - (rows - 1) * OV.gap) / 2;
  ovEl = document.createElement('div'); ovEl.id = 'se-ov';
  ovBg = document.createElement('div'); ovBg.className = 'se-ov-bg';
  ovGrid = document.createElement('div'); ovGrid.className = 'se-ov-grid';
  slides.forEach((s, i) => {
    const th = document.createElement('div'); th.className = 'se-th'; th.dataset.i = i;
    th._x = OV.pad + (i % OV.cols) * (OV.w + OV.gap); th._y = top + (i / OV.cols | 0) * (OV.h + OV.gap);
    Object.assign(th.style, { left: th._x + 'px', top: th._y + 'px', width: OV.w + 'px', height: OV.h + 'px' });
    const k = s.cloneNode(true);          // a static copy of the slide in its finished state
    k.removeAttribute('id'); k.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    k.querySelectorAll('.se-scanbar,.se-helper').forEach(e => e.remove());
    k.querySelectorAll('video').forEach(v => { const img = document.createElement('img'); img.src = v.poster; img.setAttribute('style', v.getAttribute('style') || ''); v.replaceWith(img); });
    const amb = ambients.find(a => a.s === s), ac = k.querySelector('canvas.se-ambient');
    if (amb && ac) drawAmbient(ac.getContext('2d'), amb, 3, true);
    k.classList.add('se-on'); k.style.zIndex = ''; k.style.transform = `scale(${OV.w / W})`; k.style.transformOrigin = '0 0';
    k.inert = true;
    const num = document.createElement('b'); num.className = 'se-num'; num.textContent = i + 1;
    th.append(k, num); ovGrid.appendChild(th); thumbs.push(th);
  });
  ovEl.append(ovBg, ovGrid); stage.appendChild(ovEl);
}
function ovScroll(instant) {               // keep the highlighted row visible when there are more rows than fit
  const row = ovSel / OV.cols | 0;
  if (row < ovOff) ovOff = row; else if (row >= ovOff + OV.vis) ovOff = row - OV.vis + 1;
  if (instant) ovGrid.style.transition = 'none';
  ovGrid.style.transform = `translateY(${-ovOff * (OV.h + OV.gap)}px)`;
  if (instant) { ovGrid.offsetWidth; ovGrid.style.transition = ''; }
}
function ovSelect(i) {
  if (ovState !== 1 || !thumbs.length) return;
  ovSel = clamp(i, 0, slides.length - 1);
  thumbs.forEach((t, k) => t.classList.toggle('sel', k === ovSel));
  ovScroll();
}
const fullOf = th => `translate(${-th._x}px, ${-(th._y - ovOff * (OV.h + OV.gap))}px) scale(${W / OV.w})`;   // thumbnail -> whole stage
async function openOverview() {
  if (ovState || !slides.length) return;
  ovState = 1;
  if (busy) { queued = null; skipFx = true; running.forEach(a => { try { a.finish(); } catch (e) {} }); }
  await new Promise(res => { const chk = () => busy ? setTimeout(chk, 16) : res(); chk(); });
  (slides[cur]._builds || []).forEach(a => { try { a.finish(); } catch (e) {} });
  if (!ovEl) buildOverview();
  ovFrom = ovSel = cur; ovOff = 0;
  thumbs.forEach((t, k) => t.classList.toggle('sel', k === ovSel));
  ovScroll(true);
  slides[cur].querySelectorAll('video').forEach(v => v.pause());
  ovEl.classList.add('show');
  flash(LANG === 'cs' ? 'Kolečko vybírá · → otevřít · ← zpět' : 'Scroll to pick · → open · ← back');
  const fast = simple ? .5 : 1, c0 = cur % OV.cols, r0 = cur / OV.cols | 0, anims = [];
  anims.push(ovBg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 * fast, fill: 'both' }));
  anims.push(thumbs[cur].animate([{ transform: fullOf(thumbs[cur]), borderRadius: '0px' }, { transform: 'none' }], { duration: 750 * fast, easing: ease.io, fill: 'both' }));
  thumbs.forEach((t, k) => {
    if (k === cur) return;
    const d = Math.hypot(k % OV.cols - c0, (k / OV.cols | 0) - r0);
    anims.push(t.animate([{ opacity: 0, transform: `translate(${OV.w * .2}px, ${OV.h * .2}px) scale(.6)` }, { opacity: 1, transform: 'none' }],
      { duration: 600 * fast, delay: (250 + d * 70) * fast, easing: ease.out, fill: 'both' }));
  });
  ovOpening = Promise.all(anims.map(finished)).then(() => anims.forEach(a => a.cancel()));
  await ovOpening;
}
async function closeOverview(n) {
  if (ovState !== 1) return;
  ovState = 2;
  await ovOpening;
  ovSel = n; thumbs.forEach((t, k) => t.classList.toggle('sel', k === n)); ovScroll(true);
  const th = thumbs[n], fast = simple ? .5 : 1, anims = [];
  th.style.zIndex = 5;
  thumbs.forEach(t => { if (t !== th) anims.push(t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${OV.w * .075}px, ${OV.h * .075}px) scale(.85)` }], { duration: 400 * fast, easing: ease.in, fill: 'both' })); });
  anims.push(th.querySelector('.se-num').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }));
  anims.push(th.animate([{ transform: 'none' }, { transform: fullOf(th), borderRadius: '0px' }], { duration: 700 * fast, easing: ease.io, fill: 'both' }));
  await Promise.all(anims.map(finished));
  if (n !== cur) {
    startTimer();
    const from = slides[cur], to = slides[n];
    swapped(from, to, n > cur ? 1 : -1);
    from.classList.remove('se-on'); media(from, false); resetBuilds(from); from.style.zIndex = '';
    to.classList.add('se-on'); to.style.zIndex = 2; media(to, true);
    seen.add(cur); cur = n; chrome();
  } else slides[cur].querySelectorAll('video').forEach(v => v.play().catch(() => {}));
  ovEl.classList.remove('show'); th.style.zIndex = '';
  anims.forEach(a => a.cancel());
  ovState = 0;
}

addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  const k = e.key;
  if (k === 'h' || k === 'H' || k === '?' || k === 'F1') {
    e.preventDefault(); clearTimeout(helpEl._t);
    if (helpEl.classList.toggle('show')) helpEl._t = setTimeout(() => helpEl.classList.remove('show'), 6000);
    return;
  }
  if (helpEl.classList.contains('show')) { helpEl.classList.remove('show'); if (k === 'Escape') return; }   // any other key closes help and still works
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
  else if (k === 'BrowserForward') { e.preventDefault(); nav(1); }
  else if (k === 'BrowserBack') { e.preventDefault(); nav(-1); }
  else if (k === 'Home') ovState ? ovSelect(0) : go(0); else if (k === 'End') ovState ? ovSelect(slides.length - 1) : go(slides.length - 1);
  else if (k === 'Escape') { if (ovState) prev(); }
  else if (k === 'g' || k === 'G' || k === 'o' || k === 'O') ovState ? prev() : openOverview();
  else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
  else if (k === 'n' || k === 'N') notesEl.classList.toggle('show');
  else if (k === 'T' || k === 't' && e.shiftKey) { resetTimer(); body.classList.remove('se-timer-off'); flash(LANG === 'cs' ? 'Čas vynulován' : 'Timer reset'); }
  else if (k === 't') body.classList.toggle('se-timer-off');
  else if (k === 'm' || k === 'M') { simple = !simple; flash(simple ? (LANG === 'cs' ? 'Jednoduché přechody' : 'Simple transitions') : (LANG === 'cs' ? 'Plné animace' : 'Full animations')); }
});
addEventListener('contextmenu', e => e.preventDefault());     // no browser menu on right click during the talk
addEventListener('click', e => {
  if (helpEl.classList.contains('show')) { helpEl.classList.remove('show'); return; }
  if (ovState) { const th = e.target.closest('.se-th'); if (ovState === 1) closeOverview(th ? +th.dataset.i : ovFrom); return; }
  if (e.target.closest('a,button,#se-notes,video[controls]') || slides[cur].dataset.click === 'off') return;   // data-click="off": the mouse is for the slide's content
  (e.clientX < innerWidth * .2 ? prev : next)();
});
/* Mouse back/forward buttons. Depending on the mouse driver they reach the page as mouse buttons 3/4, as the
   BrowserBack/BrowserForward keys, or only as the browser's own history navigation. All three are handled: the page
   keeps a history entry behind and ahead of itself, so a browser back/forward lands there and is turned into a
   slide change instead of leaving the presentation. `nav` drops the second of two signals from one press. */
let lastNav = 0;
const nav = (d, from) => { const now = performance.now(); if (now - lastNav < 450) return; lastNav = now; d > 0 ? next() : prev(); };
const SIDE = { 3: -1, 4: 1 };
['mousedown', 'pointerdown', 'pointerup', 'auxclick'].forEach(t => addEventListener(t, e => { if (SIDE[e.button]) e.preventDefault(); }));
addEventListener('mouseup', e => { if (SIDE[e.button]) { e.preventDefault(); nav(SIDE[e.button]); } });
let settling = 0, trapped = false;
function trap() {                 // needs a user gesture first, or Chrome skips these entries on Back
  if (trapped) return; trapped = true;
  const url = location.href;
  history.replaceState({ se: 'back' }, '', url);
  history.pushState({ se: 'mid' }, '', url);
  history.pushState({ se: 'fwd' }, '', url);
  settling++; history.back();
}
addEventListener('popstate', e => {
  const s = e.state && e.state.se;
  if (settling) { if (s === 'mid') settling--; return; }
  if (s === 'back') { settling++; history.forward(); nav(-1); }
  else if (s === 'fwd') { settling++; history.back(); nav(1); }
});
['keydown', 'pointerdown', 'mousedown', 'touchstart'].forEach(t => addEventListener(t, trap, { once: true, passive: true }));

/* Scroll wheel / touchpad: the first scroll opens the overview grid, further scrolling (down or right = later slides)
   moves its highlight, one step per wheel notch. data-wheel="off" on <body> turns it off (G still opens the grid). */
if (body.dataset.wheel !== 'off') {
  let acc = 0, quiet;
  addEventListener('wheel', e => {
    if (e.target.closest && e.target.closest('#se-notes') || e.ctrlKey) return;     // let notes scroll, keep pinch-zoom
    e.preventDefault();
    clearTimeout(quiet); quiet = setTimeout(() => { acc = 0; }, 260);
    if (ovState === 2) return;
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
    acc += (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
    if (!ovState) { if (Math.abs(acc) >= 50) { acc = 0; openOverview(); } }
    else if (Math.abs(acc) >= 80) { ovSelect(ovSel + Math.sign(acc)); acc = 0; }
  }, { passive: false });
}
let tx = null;
addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
addEventListener('touchend', e => { if (tx === null || ovState) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); tx = null; });
let idleT; addEventListener('mousemove', () => { body.classList.remove('se-idle'); clearTimeout(idleT); idleT = setTimeout(() => body.classList.add('se-idle'), 2500); });
function flash(t) { hint.textContent = t; hint.style.opacity = 1; clearTimeout(hint._t); hint._t = setTimeout(() => hint.style.opacity = 0, 1800); }
setTimeout(() => hint.style.opacity = 0, 5000);

/* ---------- start ---------- */
cur = clamp((parseInt(location.hash.slice(1), 10) || 1) - 1, 0, slides.length - 1);
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  const s = slides[cur]; if (!s) return;
  s.classList.add('se-on'); s.style.zIndex = 2;
  s.dispatchEvent(new CustomEvent('se:enter', { detail: { dir: 1 } }));
  prime(s); media(s, true); chrome();
  setTimeout(() => playBuilds(s), 300);
});
window.slideEngine = { go, next, prev, overview: () => ovState ? prev() : openOverview(), get current() { return cur; }, slides, notes: NOTES, themes: THEMES, transitions: Object.keys(T) };
})();
