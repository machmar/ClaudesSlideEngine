/* Train theme for Claude's Slide Engine: a toy loco, wagons and steam.
   Transitions train, track, steam, tunnel, barrier · effects tow, wagon, puff, depart · ambient "trains" ·
   data-dots="track" · colours from data-train="body,chassis,wheels" on <body>. Docs: README.md next to this file.
   Link it before engine.js:  <script src="themes/train/theme.js" defer></script> */
(window.slideEngineThemes = window.slideEngineThemes || []).push({ name: 'train', setup(se) {
  const { W, H, stage, fctx, sprite, ease, clamp, sstep, A, layer, rafLoop, finished, helper, sampled } = se;
  const T = {};

  const TRAIN = (se.body.dataset.train || '#c8402a,#2a5aa0,#1e1e22').split(',').map(s => s.trim());
  const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const shade = (hex, t) => '#' + hexRgb(hex).map(v => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)).toString(16).padStart(2, '0')).join('');
  const LOCO = { w: 240, h: 170, ground: 166, chimney: [186, 12], wheel: 30 };   // the loco drawing faces right
  function wheelSVG(cx, cy, r, rot = 0) {
    const c = TRAIN[2], holes = [0, 1, 2, 3, 4].map(i => { const a = i * 1.2566; return `<circle cx="${(cx + Math.cos(a) * r * .4).toFixed(1)}" cy="${(cy + Math.sin(a) * r * .4).toFixed(1)}" r="${(r * .11).toFixed(1)}" fill="${shade(c, .4)}"/>`; }).join('');
    return `<g class="se-wh"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="${r * .66}" fill="none" stroke="${shade(c, .28)}" stroke-width="${r * .1}"/>${holes}<circle cx="${cx}" cy="${cy}" r="${r * .17}" fill="${shade(c, .55)}"/></g>`;
  }
  function locoSVG(rot = 0) {
    const [b, base, wh] = TRAIN, d = shade(b, -.28), l = shade(b, .14);
    return `<svg viewBox="0 0 240 170" width="100%" height="100%" preserveAspectRatio="none">` +
      `<rect x="12" y="104" width="16" height="18" rx="4" fill="${wh}"/><rect x="212" y="104" width="16" height="18" rx="4" fill="${wh}"/>` +
      `<rect x="28" y="100" width="184" height="34" rx="9" fill="${base}"/>` +
      `<rect x="20" y="88" width="202" height="16" rx="7" fill="${d}"/>` +
      `<rect x="30" y="30" width="74" height="62" rx="8" fill="${b}"/><rect x="22" y="20" width="90" height="15" rx="7" fill="${d}"/>` +
      `<rect x="46" y="43" width="40" height="27" rx="6" fill="#fdf0d8" opacity=".92"/>` +
      `<rect x="98" y="44" width="120" height="48" rx="22" fill="${l}"/>` +
      `<rect x="128" y="44" width="6" height="48" fill="${d}" opacity=".45"/><rect x="170" y="44" width="6" height="48" fill="${d}" opacity=".45"/>` +
      `<path d="M136 46 a13 13 0 0 1 26 0 z" fill="${b}"/>` +
      `<rect x="179" y="20" width="15" height="28" fill="${b}"/><path d="M170 10 h33 l-6 13 h-21 z" fill="${d}"/>` +
      `<circle cx="214" cy="66" r="8" fill="#ffe7a8"/>` +
      wheelSVG(72, 136, 30, rot) + wheelSVG(168, 136, 30, rot) + `</svg>`;
  }
  function wagonSVG(color, rot = 0) {                  // 200 x 170, same ground line and wheels as the loco
    const [, base, wh] = TRAIN;
    return `<svg viewBox="0 0 200 170" width="100%" height="100%" preserveAspectRatio="none">` +
      `<rect x="0" y="106" width="14" height="14" rx="4" fill="${wh}"/><rect x="186" y="106" width="14" height="14" rx="4" fill="${wh}"/>` +
      `<rect x="12" y="100" width="176" height="34" rx="9" fill="${base}"/>` +
      `<rect x="20" y="46" width="160" height="58" rx="10" fill="${color}"/><rect x="16" y="40" width="168" height="13" rx="6" fill="${shade(color, -.25)}"/>` +
      `<rect x="40" y="60" width="120" height="8" rx="4" fill="${shade(color, .25)}" opacity=".7"/>` +
      wheelSVG(56, 136, 30, rot) + wheelSVG(144, 136, 30, rot) + `</svg>`;
  }
  function bogieSVG() {                       // a wheel pair to put under a slide: 240 x 90, wheels touch y 90
    return `<svg viewBox="0 0 240 90" width="100%" height="100%" preserveAspectRatio="none"><rect x="10" y="4" width="220" height="30" rx="8" fill="${TRAIN[1]}"/>` +
      wheelSVG(64, 56, 34) + wheelSVG(176, 56, 34) + `</svg>`;
  }
  const spinWheels = (el, deg) => el.querySelectorAll('.se-wh').forEach(g => g.style.transform = `rotate(${deg}deg)`);

  /* steam: soft puffs that rise, grow and fade, drawn on a canvas */
  const puffSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
    const r = g.createRadialGradient(40, 40, 0, 48, 48, 48);
    r.addColorStop(0, '#ffffff'); r.addColorStop(.5, 'rgba(246,243,238,.97)'); r.addColorStop(.78, 'rgba(206,201,194,.75)'); r.addColorStop(1, 'rgba(206,201,194,0)');
    g.fillStyle = r; g.fillRect(0, 0, 96, 96); return c;
  })();
  function steam() {
    const ps = [];
    return {
      ps,
      emit(x, y, o = {}) {
        ps.push({ x, y, vx: (o.vx || 0) + (Math.random() - .5) * 24 * (o.k || 1), vy: -(45 + Math.random() * 40) * (o.k || 1), r: (o.r || 16) * (.75 + Math.random() * .5),
          grow: (o.grow || 30) * (o.k || 1), t: 0, life: o.life || 1.5, a: o.a || .9 });
      },
      step(dt) {
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985; p.vy *= .985; p.r += p.grow * dt;
          if (p.t > p.life) ps.splice(i, 1);
        }
      },
      draw(g) {
        for (const p of ps) { const q = p.t / p.life; g.globalAlpha = p.a * Math.min(1, q * 8) * Math.pow(1 - q, 1.3); g.drawImage(puffSprite, p.x - p.r, p.y - p.r, 2 * p.r, 2 * p.r); }
        g.globalAlpha = 1;
      }
    };
  }
  const PUFF_CSS = 'radial-gradient(circle closest-side, #fff 0%, rgba(246,243,238,.97) 50%, rgba(206,201,194,.75) 78%, rgba(206,201,194,0) 100%)';

  function puffAt(out, slide, x, y, s, drift, delay, alpha = .9) {      // one steam puff at slide coordinates (x, y), size s
    const p = helper('se-puff', '', { left: (x - s / 2) + 'px', top: (y - s / 2) + 'px', width: s + 'px', height: s + 'px', background: PUFF_CSS, zIndex: 5 });
    slide.appendChild(p);
    out.push(p.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: alpha, transform: `translate(${drift * .15}px, ${-s * .25}px) scale(.75)`, offset: .12 },
      { opacity: 0, transform: `translate(${drift}px, ${-s * 3}px) scale(2.6)` }], { duration: 1100, delay, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' }));
  }

  const svgImg = (svg, w, h) => { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('width="100%" height="100%"', `xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"`)); return i; };
  let trainArt = null;                        // the loco and three wagons, 6 wheel positions each (the wheel repeats every 72 deg)
  const getTrainArt = () => trainArt || (trainArt = {
    loco: [0, 1, 2, 3, 4, 5].map(f => svgImg(locoSVG(f * 12), 240, 170)),
    wagons: ['#e3a23b', '#3f8a5c', TRAIN[1]].map(c => [0, 1, 2, 3, 4, 5].map(f => svgImg(wagonSVG(c, f * 12), 200, 170)))
  });

  function drawTrains(g, a, t, dt, still) {
    const art = getTrainArt();
    g.clearRect(0, 0, W, H);
    for (const L of a.lanes) {
      const lw = L.h * 240 / 170, ww = L.h * 200 / 170, gap = L.h * .06, len = lw + L.n * (ww + gap), loop = W + len + 300;
      const dist = t * L.v + L.off, head = ((dist % loop) + loop) % loop - 150;    // front of the train, measured along its direction
      const frame = Math.floor((dist / (L.h * 30 / 170) * 57.3 % 72) / 12) % 6;
      const X = (x, w) => L.dir > 0 ? x : W - x - w;                                // lane coordinates -> canvas
      g.globalAlpha = L.a * .5; g.fillStyle = '#d9d2c3';
      g.fillRect(0, L.y, W, Math.max(2, L.h * .04));                                  // rail and sleepers
      const sl = L.h * .5; for (let x = -(dist % sl); x < W; x += sl) g.fillRect(X(x, L.h * .12), L.y + L.h * .04, L.h * .12, L.h * .06);
      g.globalAlpha = L.a;
      const put = (img, x, w) => {
        if (!img.complete || !img.naturalWidth) return;
        const sx = X(x, w), y = L.y - L.h * 166 / 170;
        if (L.dir > 0) g.drawImage(img, sx, y, w, L.h); else { g.save(); g.translate(sx + w, 0); g.scale(-1, 1); g.drawImage(img, 0, y, w, L.h); g.restore(); }
      };
      put(art.loco[frame], head - lw, lw);
      for (let i = 0; i < L.n; i++) put(art.wagons[i % 3][frame], head - lw - (i + 1) * (ww + gap), ww);
      if (!still) {                           // steam from the chimney, blown back
        L.puffT -= dt;
        if (L.puffT <= 0 && head > 0 && head < W + lw) {
          L.puffT = .11;
          const cx = head - lw + LOCO.chimney[0] / 240 * lw;
          a.steam.emit(X(cx, 0), L.y - L.h * (166 - LOCO.chimney[1]) / 170, { r: L.h * .14, k: L.h / 66, vx: -L.dir * L.v * .35, life: 1.6, a: L.a * .75 });
        }
      }
    }
    a.steam.step(dt); a.steam.draw(g);
  }

  /* ---------- transitions ----------
     train / track: the slides become wagons on a rail. A camera looks at a "world" in slide units: a slide at offset ox
     covers x = ox..ox+W, y = 0..H; its bogies, the couplers, the rail and the loco hang below it. */
  const RW = { gap: 46, G: 170, bogieW: 430, bogieH: 161, locoH: 560, rail: H + 140 };
  RW.locoW = RW.locoH * LOCO.w / LOCO.h; RW.cy = (RW.rail + 60) / 2; RW.barY = H - 50;   // camera centre: the slide plus the rail below it
  function railScene(from) {
    const bg = getComputedStyle(from).backgroundColor, bgOk = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    const back = helper('se-rail-bg', '', { left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 1,
      background: `linear-gradient(rgba(0,0,0,.02), rgba(0,0,0,.2)), ${bgOk ? bg : '#14181c'}` });
    const world = helper('se-world', '', { left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 30, transformOrigin: '0 0' });
    const rail = helper('', '', { left: -6 * W + 'px', top: RW.rail + 'px', width: 13 * W + 'px', height: '58px',
      background: `linear-gradient(${TRAIN[2]} 0 16px, transparent 16px), repeating-linear-gradient(90deg, #7a6a58 0 30px, transparent 30px 96px)` });
    world.appendChild(rail);
    stage.append(back, world);
    const scene = { back, world, rail, parts: [], steam: steam(), dist: new Map() };
    scene.add = (html, w, h, extra) => { const e = helper('', html, Object.assign({ width: w + 'px', height: h + 'px', left: 0, top: 0 }, extra)); world.appendChild(e); scene.parts.push(e); return e; };
    scene.loco = flip => scene.add(locoSVG(), RW.locoW, RW.locoH, { transform: flip ? 'scaleX(-1)' : '' });
    scene.bogie = () => scene.add(bogieSVG(), RW.bogieW, RW.bogieH);
    scene.bar = w => scene.add('', w, 24, { background: TRAIN[2], borderRadius: '8px' });
    scene.done = () => { back.remove(); world.remove(); fctx.clearRect(0, 0, W, H); };
    return scene;
  }
  const camOf = (s, cy) => ({ s, cy, tx: ox => W / 2 + (ox - W / 2) * s, ty: y => H / 2 + (y - cy) * s });
  function placeSlide(slide, cam, ox) { slide.style.transformOrigin = '0 0'; slide.style.transform = `translate(${cam.tx(ox)}px, ${cam.ty(0)}px) scale(${cam.s})`; }
  function placePart(scene, el, x, y, flip, wheelR) {     // moves a world part; spins its wheels by the distance it moved
    const last = scene.dist.get(el); el.style.left = x + 'px'; el.style.top = y + 'px';
    if (wheelR) { const d = (last ? last.d + (x - last.x) : 0); scene.dist.set(el, { x, d }); spinWheels(el, (flip ? -d : d) / wheelR * 57.3); }
  }
  function wagonAt(scene, slide, cam, ox, bogies) {        // a slide and its two bogies at world offset ox
    placeSlide(slide, cam, ox);
    bogies.forEach((b, i) => placePart(scene, b, ox + (i ? W - 120 - RW.bogieW : 120), H - 22, false, RW.bogieH * 34 / 90));
  }
  function chimneyPuff(scene, cam, loco, x, flip, k) {     // steam from a loco at world x, blown back (k = direction of travel)
    const cx = x + (flip ? LOCO.w - LOCO.chimney[0] : LOCO.chimney[0]) / LOCO.w * RW.locoW, cy = RW.rail - RW.locoH * (LOCO.ground - LOCO.chimney[1]) / LOCO.h;
    scene.steam.emit(cam.tx(cx), cam.ty(cy), { r: 70 * cam.s, k: cam.s * 2.2, vx: -k * 160 * cam.s, life: 1.4 });
  }
  const railY = () => RW.rail - RW.locoH * LOCO.ground / LOCO.h;

  T['train'] = async (from, to, dir, reveal) => {
    const k = dir > 0 ? -1 : 1, flip = k < 0, dur = se.simple ? 1000 : 3000, S = .78, CY = RW.cy, D = 2500;
    const sc = railScene(from), loco = sc.loco(flip), bar = sc.bar(RW.gap + 12), bogies = [sc.bogie(), sc.bogie()];
    layer(from, 2); layer(to, 2);
    const couple = ox => flip ? ox - RW.gap - RW.locoW : ox + W + RW.gap;
    let swapped = false, revealed = false, lastT = performance.now(), puffT = 0, lastX = null;
    await rafLoop(dur, p => {
      const now = performance.now(), dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
      const zin = sstep(clamp(p / .15)), zout = sstep(clamp((p - .85) / .15)), s = 1 + (S - 1) * zin + (1 - S) * zout;
      const cam = camOf(s, H / 2 + (CY - H / 2) * (zin - zout));
      const fromX = p < .22 ? 0 : k * D * Math.pow(clamp((p - .22) / .28), 2.2);
      const toX = p < .52 ? -k * D : -k * D * Math.pow(1 - clamp((p - .52) / .3), 3);
      let lx;
      if (p < .22) lx = couple(0) + k * 1700 * Math.pow(1 - sstep(clamp((p - .04) / .18)), 1);
      else if (p < .51) lx = couple(fromX);
      else if (p < .82) lx = couple(toX);
      else lx = couple(0) + k * 2200 * Math.pow((p - .82) / .18, 2);
      if (p >= .51 && !swapped) { swapped = true; from.classList.remove('se-on'); }
      if (p >= .82 && !revealed) { revealed = true; reveal(); }
      const ox = p < .51 ? fromX : toX;
      if (p < .51) placeSlide(from, cam, fromX);
      placeSlide(to, cam, toX);
      wagonAt(sc, p < .51 ? from : to, cam, ox, bogies);
      placePart(sc, loco, lx, railY(), flip, RW.locoH * LOCO.wheel / LOCO.h);
      placePart(sc, bar, flip ? ox - RW.gap - 6 : ox + W - 6, RW.barY);
      bar.style.opacity = p > .2 && p < .83 ? 1 : 0;
      const a = clamp(Math.min(p / .1, (1 - p) / .1));
      sc.back.style.opacity = sc.world.style.opacity = a;
      sc.world.style.transform = `translate(${cam.tx(0)}px, ${cam.ty(0)}px) scale(${s})`;
      puffT -= dt; if (lastX !== null && Math.abs(lx - lastX) > .5 && puffT <= 0) { puffT = .05; chimneyPuff(sc, cam, loco, lx, flip, Math.sign(lx - lastX)); }
      lastX = lx;
      fctx.clearRect(0, 0, W, H); sc.steam.step(dt); sc.steam.draw(fctx);
    });
    [from, to].forEach(s => s.style.transform = '');
    sc.done();
  };

  T['track'] = async (from, to, dir, reveal) => {
    const k = dir > 0 ? -1 : 1, flip = k < 0, dur = se.simple ? 1100 : 3300, S = .4, CY = RW.cy, step = W + RW.G;
    const sc = railScene(from), loco = sc.loco(flip), bars = [sc.bar(RW.gap + 12), sc.bar(RW.G + 12)], bf = [sc.bogie(), sc.bogie()], bt = [sc.bogie(), sc.bogie()];
    layer(from, 2); layer(to, 2);
    let revealed = false, lastT = performance.now(), puffT = 0, lastX = null;
    await rafLoop(dur, p => {
      const now = performance.now(), dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
      const zin = sstep(clamp(p / .28)), zout = sstep(clamp((p - .72) / .28)), s = 1 + (S - 1) * zin + (1 - S) * zout;
      const cam = camOf(s, H / 2 + (CY - H / 2) * (zin - zout));
      const shift = step * sstep(clamp((p - .28) / .44));
      const fx = k * shift, tx = -k * step + k * shift, lx = flip ? fx - RW.gap - RW.locoW : fx + W + RW.gap;
      if (p >= .72 && !revealed) { revealed = true; reveal(); }
      wagonAt(sc, from, cam, fx, bf); wagonAt(sc, to, cam, tx, bt);
      placePart(sc, loco, lx, railY(), flip, RW.locoH * LOCO.wheel / LOCO.h);
      placePart(sc, bars[0], flip ? fx - RW.gap - 6 : fx + W - 6, RW.barY);
      placePart(sc, bars[1], flip ? fx + W - 6 : fx - RW.G - 6, RW.barY);
      const a = clamp(Math.min(p / .14, (1 - p) / .14));
      sc.back.style.opacity = sc.world.style.opacity = a;
      sc.world.style.transform = `translate(${cam.tx(0)}px, ${cam.ty(0)}px) scale(${s})`;
      puffT -= dt; if (lastX !== null && Math.abs(lx - lastX) > .5 && puffT <= 0) { puffT = .05; chimneyPuff(sc, cam, loco, lx, flip, Math.sign(lx - lastX)); }
      lastX = lx;
      fctx.clearRect(0, 0, W, H); sc.steam.step(dt); sc.steam.draw(fctx);
    });
    from.classList.remove('se-on');
    [from, to].forEach(s => s.style.transform = '');
    sc.done();
  };

  T['steam'] = async (from, to, dir, reveal) => {      // a cloud of steam rolls over the screen from below and clears upwards
    layer(from, 2); layer(to, 1);
    const dur = se.simple ? 900 : 2300, src = [W / 2, dir > 0 ? H + 80 : -80], far = Math.hypot(W / 2, H) + 100, P = [];
    for (let y = -60; y < H + 140; y += 100) for (let x = -60; x < W + 140; x += 100) {
      const px = x + (Math.random() - .5) * 60, py = y + (Math.random() - .5) * 60;
      P.push({ x: px, y: py, d: Math.hypot(px - src[0], py - src[1]) / far, R: 110 + Math.random() * 70, rise: 220 + Math.random() * 200, f: Math.random() });
    }
    let swapped = false;
    await rafLoop(dur, p => {
      fctx.clearRect(0, 0, W, H);
      if (p >= .5 && !swapped) { swapped = true; from.classList.remove('se-on'); layer(to, 2); reveal(); }
      const first = p < .5, q = first ? p / .5 : (p - .5) / .5;
      let fill = first ? clamp((q - .72) / .28) : 1 - clamp(q / .3);
      for (const c of P) {
        let r, y = c.y, al;
        if (first) { const l = sstep(clamp((q * 1.4 - c.d * .95) / .45)); r = c.R * l; y += (1 - l) * 90; al = 1; }
        else { const l = sstep(clamp((q * 1.5 - (1 - c.d) * .5 - c.f * .2) / .7)); r = c.R * (1 + q * .7); y -= q * c.rise; al = 1 - l; }
        if (r < 2 || al < .01) continue;
        fctx.globalAlpha = al; fctx.drawImage(puffSprite, c.x - r, y - r, 2 * r, 2 * r);
      }
      if (fill > 0) { fctx.globalAlpha = fill; fctx.fillStyle = '#f3f0ea'; fctx.fillRect(0, 0, W, H); }
      fctx.globalAlpha = 1;
    });
    fctx.clearRect(0, 0, W, H);
  };

  function archPath(g, cx, bottom, w, h) {           // a rectangle w x h with a half-circle top
    const r = w / 2; g.moveTo(cx - r, bottom); g.lineTo(cx - r, bottom - h + r); g.arc(cx, bottom - h + r, r, Math.PI, 0); g.lineTo(cx + r, bottom); g.closePath();
  }
  function portal(g, cx, bottom, w, h, hole) {        // a stone tunnel mouth; hole = see through it, else dark inside
    const t = w * .17;
    g.fillStyle = '#2f3b30'; g.beginPath(); g.ellipse(cx, bottom, w * 1.6, h * 1.25, 0, Math.PI, 0); g.fill();      // the hill around it
    g.fillStyle = '#8d847a'; g.beginPath(); archPath(g, cx, bottom, w + 2 * t, h + t); g.fill();
    g.strokeStyle = '#6c655c'; g.lineWidth = Math.max(1, w * .012);
    for (let i = 1; i < 12; i++) {                    // the arch stones
      const a = Math.PI + Math.PI * i / 12, r0 = w / 2, r1 = w / 2 + t, cy = bottom - h + w / 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    g.beginPath(); archPath(g, cx, bottom, w, h);
    if (hole) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(); g.restore(); } else { g.fillStyle = '#0b0d10'; g.fill(); }
  }
  T['tunnel'] = async (from, to, dir, reveal) => {
    layer(from, 2); layer(to, 1);
    const dur = se.simple ? 1000 : 2800, cx = W / 2;
    let swapped = false, revealed = false;
    await rafLoop(dur, p => {
      fctx.clearRect(0, 0, W, H);
      if (p < .42) {                                  // ride up to the tunnel and into it
        const q = p / .42, z = Math.pow(10, sstep(q)), w = 360 * z, h = 400 * z, bottom = H * .82 + (z - 1) * H * .2;
        from.style.transform = `scale(${1 + q * .5})`; from.style.filter = `brightness(${1 - q * .5})`;
        fctx.globalAlpha = clamp(q / .12);
        fctx.strokeStyle = TRAIN[2]; fctx.lineWidth = 6 * z;                // two rails into the mouth
        [-1, 1].forEach(sd => { fctx.beginPath(); fctx.moveTo(cx + sd * w * .22, bottom); fctx.lineTo(cx + sd * W * .7, H + 40); fctx.stroke(); });
        portal(fctx, cx, bottom, w, h, false);
      } else if (p < .6) {                            // dark, lamps passing by
        if (!swapped) { swapped = true; from.classList.remove('se-on'); from.style.transform = from.style.filter = ''; layer(to, 2); }
        const q = (p - .42) / .18;
        fctx.fillStyle = '#0b0d10'; fctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 7; i++) {
          const d = ((i / 7 - q * 1.6) % 1 + 1) % 1 * 7 + .45;
          fctx.globalAlpha = clamp(1.4 - d / 5) * .25; fctx.strokeStyle = '#8d847a'; fctx.lineWidth = 6 / d;
          fctx.beginPath(); archPath(fctx, cx, H / 2 + H * .5 / d, W * .9 / d, H * 1.1 / d); fctx.stroke();
          fctx.globalAlpha = clamp(1.4 - d / 5);
          [-1, 1].forEach(sd => fctx.drawImage(sprite, cx + sd * W * .4 / d - 90 / d, H / 2 - H * .25 / d - 90 / d, 180 / d, 180 / d));
        }
      } else {                                        // the exit opens up onto the new slide
        if (!swapped) { swapped = true; from.classList.remove('se-on'); layer(to, 2); }
        const q = (p - .6) / .4, z = Math.pow(16, sstep(q)), w = 150 * z, h = 175 * z, bottom = H * .6 + (z - 1) * 52;
        if (!revealed) { revealed = true; reveal(); }
        to.style.transform = `scale(${1.35 - .35 * sstep(q)})`;
        fctx.globalAlpha = 1; fctx.fillStyle = '#0b0d10'; fctx.fillRect(0, 0, W, H);
        fctx.save(); fctx.globalCompositeOperation = 'destination-out'; fctx.beginPath(); archPath(fctx, cx, bottom, w, h); fctx.fill(); fctx.restore();
        const t = w * .17; fctx.strokeStyle = '#8d847a'; fctx.lineWidth = t; fctx.beginPath(); archPath(fctx, cx, bottom + t / 2, w + t, h + t / 2); fctx.stroke();
      }
      fctx.globalAlpha = 1;
    });
    from.style.transform = from.style.filter = to.style.transform = '';
    fctx.clearRect(0, 0, W, H);
  };

  T['barrier'] = async (from, to, dir, reveal) => {      // level-crossing barriers swing down over the slide, then up again
    layer(from, 2); layer(to, 1);
    const n = 6, bh = H / n, dur = se.simple ? 900 : 2300, L = W * 1.05, els = [], anims = [];
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0, row = dir > 0 ? i : n - 1 - i;
      const boom = helper('se-boom', '', { left: (left ? 0 : W - L) + 'px', top: (i * bh - 4) + 'px', width: L + 'px', height: (bh + 8) + 'px', zIndex: 41,
        transformOrigin: `${left ? bh / 2 : L - bh / 2}px 50%`, boxShadow: '0 8px 22px rgba(0,0,0,.35)',
        background: `repeating-linear-gradient(90deg, #d2382b 0 ${bh * .9}px, #f7f2e8 ${bh * .9}px ${bh * 1.8}px)`, backgroundPosition: left ? '0 0' : `${L % (bh * 1.8)}px 0` });
      const lamp = helper('se-boom', '', { left: (left ? bh * .2 : W - bh * .8) + 'px', top: (i * bh + bh * .2) + 'px', width: bh * .6 + 'px', height: bh * .6 + 'px',
        borderRadius: '50%', zIndex: 42, background: '#2a2a2a', border: `${bh * .06}px solid #111` });
      stage.append(boom, lamp); els.push(boom, lamp);
      const up = `rotate(${left ? -90 : 90}deg)`, delay = row * (dur * .03);
      anims.push(A(boom, [{ transform: up, opacity: 0 }, { transform: up, opacity: 1, offset: .06 }, { transform: 'rotate(0)', offset: .36, easing: 'cubic-bezier(.5,0,.4,1.35)' },
        { transform: 'rotate(0)', offset: .62 }, { transform: up, opacity: 1, offset: .94 }, { transform: up, opacity: 0 }], { duration: dur - delay * 2, delay, easing: 'cubic-bezier(.55,0,.45,1)' }));
      A(lamp, [{ background: '#2a2a2a', opacity: 0 }, { opacity: 1, offset: .1 }, { background: '#ff3b2a', boxShadow: `0 0 ${bh * .5}px ${bh * .15}px rgba(255,60,40,.8)`, offset: .25 },
        { background: '#2a2a2a', offset: .45 }, { background: '#ff3b2a', boxShadow: `0 0 ${bh * .5}px ${bh * .15}px rgba(255,60,40,.8)`, offset: .65 }, { background: '#2a2a2a', opacity: 1, offset: .9 }, { opacity: 0 }], { duration: dur });
    }
    let over = false;
    setTimeout(() => { if (over) return; from.classList.remove('se-on'); layer(to, 2); reveal(); }, dur * .5);
    await Promise.all(anims.map(finished)); over = true;
    els.forEach(e => e.remove());
  };

  Object.entries(T).forEach(([name, fn]) => se.transition(name, fn));

  /* ---------- element effects ---------- */
  se.build('tow', { measure: 'text', make(item, { el, delay, out, A }) {   // a small loco pulls the text in from the left, uncouples and drives off
    const g = item.geo, th = g.th, lh = th * 1.05, lw = lh * LOCO.w / LOCO.h, gap = th * .22;
    const lx = g.tx + gap, ly = g.ty + th - lh * LOCO.ground / LOCO.h + th * .04;
    const loco = helper('se-tow', locoSVG(), { left: lx + 'px', top: ly + 'px', width: lw + 'px', height: lh + 'px', zIndex: 5 });
    const bar = helper('se-tow', '', { left: (g.tx - 2) + 'px', top: (ly + lh * .64) + 'px', width: (gap + 6) + 'px', height: Math.max(4, lh * .07) + 'px', background: TRAIN[2], borderRadius: '3px', zIndex: 4 });
    g.slide.append(bar, loco);
    const D = lx + lw + 40, tIn = 1500, tWait = 350, tOff = 1100, T = tIn + tWait + tOff, away = W - lx + 80;
    const xEl = t => t < tIn ? -D * Math.pow(1 - t / tIn, 3) : 0;
    const xLoco = t => t <= tIn + tWait ? xEl(t) : away * Math.pow((t - tIn - tWait) / tOff, 2);
    const bob = t => (t < tIn || t > tIn + tWait) && t < T ? Math.sin(t / 45) * lh * .012 : 0;
    A(el, sampled(tIn, t => ({ transform: `translateX(${xEl(t)}px)` })), { duration: tIn });
    A(bar, sampled(tIn + 300, t => ({ transform: `translateX(${xEl(t)}px)`, opacity: t < tIn ? 1 : 1 - (t - tIn) / 300 })), { duration: tIn + 300 });
    A(loco, sampled(T, t => ({ transform: `translate(${xLoco(t)}px, ${bob(t)}px)`, opacity: t < T ? 1 : 0 }), 60), { duration: T });
    const r = LOCO.wheel / LOCO.h * lh;
    loco.querySelectorAll('.se-wh').forEach(w => A(w, sampled(T, t => ({ transform: `rotate(${xLoco(t) / r * 57.3}deg)` }), 60), { duration: T }));
    for (let te = 40; te < T; te += 95) {
      const v = xLoco(te + 30) - xLoco(te); if (Math.abs(v) < .3) continue;
      puffAt(out, g.slide, lx + xLoco(te) + LOCO.chimney[0] / LOCO.w * lw, ly + LOCO.chimney[1] / LOCO.h * lh, lh * .34, -lh * .5, delay + te);
    }
  } });
  se.build('wagon', { measure: true, make(item, { el, delay, out, A }) {   // the card rolls in on two wheels, which fold away when it stops
    const g = item.geo, dur = 1300, D = g.x + g.w + 60, xx = t => t < dur ? -D * Math.pow(1 - t / dur, 3) : 0;
    A(el, sampled(dur, t => ({ transform: `translateX(${xx(t)}px) rotate(${t < dur ? Math.sin(t / 60) * .5 * (1 - t / dur) : 0}deg)`, transformOrigin: '50% 100%' })), { duration: dur });
    const wd = clamp(g.h * .3, 34, 64), r = wd / 2;
    [.18, .82].forEach(f => {
      const w = helper('se-wagon', `<svg viewBox="0 0 68 68" width="100%" height="100%">${wheelSVG(34, 34, 33)}</svg>`, { left: (g.x + g.w * f - r) + 'px', top: (g.y + g.h - r * .95) + 'px', width: wd + 'px', height: wd + 'px', zIndex: 0 });
      g.slide.appendChild(w);
      A(w, sampled(dur + 450, t => ({ transform: `translate(${xx(t)}px, ${t < dur ? 0 : -r * 1.3 * (t - dur) / 450}px)`, opacity: t < dur ? 1 : 1 - (t - dur) / 450 })), { duration: dur + 450 });
      A(w.querySelector('.se-wh'), sampled(dur, t => ({ transform: `rotate(${xx(t) / r * 57.3}deg)` })), { duration: dur });
    });
    el._se.arrive = delay + dur;                 // a puff inside waits for the card
  } });
  se.build('puff', { measure: true, nested: true, count: true, make(item, { el, delay, out, A }) {   // the text appears out of a cloud of steam (after its card has arrived)
    let d0 = delay; for (let p = el.parentElement; p; p = p.parentElement) if (p._se && p._se.arrive != null) { d0 = Math.max(d0, p._se.arrive - 200); break; }
    el._se.countDelay = d0 + 250;               // its number counts once the steam clears
    const g = item.geo, n = Math.max(3, Math.round(g.w / (g.h * .9))), s = g.h * 1.5;
    A(el, [{ opacity: 0, transform: 'scale(.6)', filter: 'blur(12px)' }, { opacity: 0, transform: 'scale(.6)', filter: 'blur(12px)', offset: .25 },
      { opacity: 1, transform: 'scale(1.06)', filter: 'blur(0)', offset: .7 }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: d0, easing: ease.out });
    for (let i = 0; i < n; i++) {
      const cx = g.x + g.w * (i + .5) / n + (Math.random() - .5) * g.h * .3, cy = g.y + g.h * .55 + (Math.random() - .5) * g.h * .3;
      const p = helper('se-puff', '', { left: (cx - s / 2) + 'px', top: (cy - s / 2) + 'px', width: s + 'px', height: s + 'px', background: PUFF_CSS, zIndex: 5 });
      g.slide.appendChild(p);
      out.push(p.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: .95, transform: 'scale(1)', offset: .35 },
        { opacity: 0, transform: `translate(${(Math.random() - .5) * s * .6}px, ${-s * .7}px) scale(1.7)` }], { duration: 1500, delay: d0 + i * 45, easing: ease.out, fill: 'both' }));
    }
  } });
  se.build('depart', { measure: true, make(item, { el, delay, out, A }) {   // a loco picture backs in from the right; every 14 s it drives off to the right and backs in again
    const g = item.geo, [cfx, cfy] = (el.dataset.chimney || '.7,.2').split(',').map(Number);
    const D2 = W - g.x + 60, tIn = 1800, C = 14000, tw = 6000, tOut = 1600, tBack = 2200;
    const bob = (t, moving) => moving ? Math.sin(t / 50) * 3 : 0;
    const xin = t => D2 * Math.pow(1 - t / tIn, 3);
    A(el, sampled(tIn, t => ({ transform: `translate(${xin(t)}px, ${bob(t, t < tIn)}px)` })), { duration: tIn });
    const segs = [[0, tw, () => 0], [tw, tw + tOut, t => D2 * Math.pow((t - tw) / tOut, 2)], [tw + tOut, tw + tOut + tBack, t => D2 * Math.pow(1 - (t - tw - tOut) / tBack, 3)], [tw + tOut + tBack, C, () => 0]];
    const xl = t => { for (const [a, b, f] of segs) if (t < b) return f(t); return 0; };
    const keys = []; segs.forEach(([a, b, f]) => { const n = Math.max(1, Math.round((b - a) / 100)); for (let i = 0; i <= n; i++) { const t = a + (b - a) * i / n; keys.push({ offset: t / C, transform: `translate(${f(t)}px, ${bob(t, b - a < 3000)}px)` }); } });
    out.push(el.animate(keys, { duration: C, delay: delay + tIn, iterations: Infinity }));       // no fill: the entry shows until it starts
    const chim = x => [g.x + cfx * g.w + x, g.y + cfy * g.h], s = g.h * .13;
    for (let te = 60; te < tIn * .8; te += 160) { const [x, y] = chim(xin(te)); puffAt(out, g.slide, x, y, s, g.h * .2, delay + te, .7); }
    for (let te = tw + 40; te < tw + tOut + tBack * .8; te += 160) {
      const [x, y] = chim(xl(te)), p = helper('se-puff', '', { left: (x - s / 2) + 'px', top: (y - s / 2) + 'px', width: s + 'px', height: s + 'px', background: PUFF_CSS, zIndex: 5 });
      g.slide.appendChild(p);
      const a = te / C, b = (te + 1100) / C, drift = te < tw + tOut ? -g.h * .2 : g.h * .2;
      out.push(p.animate([{ offset: 0, opacity: 0, transform: 'scale(.3)' }, { offset: a, opacity: 0, transform: 'scale(.3)' }, { offset: a + .006, opacity: .7, transform: 'scale(.6)' },
        { offset: b, opacity: 0, transform: `translate(${drift}px, ${-g.h * .5}px) scale(2.6)` }, { offset: 1, opacity: 0, transform: 'scale(.3)' }], { duration: C, delay: delay + tIn, iterations: Infinity }));
    }
  } });

  /* ---------- ambient: little trains on two tracks at the bottom of the slide ---------- */
  se.ambient('trains', {
    init() {
      getTrainArt();
      return { steam: steam(), lanes: [
        { y: H - 92, h: 66, v: 95, dir: 1, a: .95, n: 3, off: 300, puffT: 0 },
        { y: H - 196, h: 38, v: 55, dir: -1, a: .45, n: 2, off: 1400, puffT: 0 }] };
    },
    draw: drawTrains
  });

  /* ---------- data-dots="track": a rail with a stop per slide and a small loco at the current one ---------- */
  let mini = null, miniAt = null;
  se.dots('track', {
    init(dots) { mini = helper('se-mini', locoSVG()); dots.classList.add('se-track'); dots.appendChild(mini); },
    update(cur) { if (miniAt !== null && cur !== miniAt) mini.classList.toggle('back', cur < miniAt); miniAt = cur; mini.style.left = (cur * 44 + 22 - 26) + 'px'; }
  });

  se.css(`
#se-dots.se-track { gap: 0; bottom: 12px; height: 44px; align-items: flex-end; }
#se-dots.se-track::before { content: ''; position: absolute; left: -24px; right: -24px; bottom: 4px; height: 4px; border-radius: 2px;
  background: rgba(150, 138, 120, .6); box-shadow: 0 6px 0 -1px rgba(150, 138, 120, .3); }
#se-dots.se-track i, #se-dots.se-track i.cur { width: 44px; height: 14px; border-radius: 0; background: none; box-shadow: none; transform: none; position: relative; }
#se-dots.se-track i::after { content: ''; position: absolute; left: 19px; bottom: 6px; width: 6px; height: 14px; border-radius: 3px; background: rgba(128, 128, 128, .45); transition: background .5s, box-shadow .5s; }
#se-dots.se-track i.seen::after { background: var(--se-accent-a45); }
#se-dots.se-track i.cur::after { background: var(--se-accent-light); box-shadow: 0 0 10px 3px var(--se-accent-a75); }
#se-dots.se-track .se-mini { bottom: 7px; width: 52px; height: 37px; transition: left 1.6s cubic-bezier(.65, 0, .35, 1); }
#se-dots.se-track .se-mini.back { transform: scaleX(-1); }
.se-wh { transform-box: fill-box; transform-origin: center; }
`);
} });
