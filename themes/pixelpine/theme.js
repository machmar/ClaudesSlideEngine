/* PixelPine theme for Claude's Slide Engine: the LED look of the PixelPine Christmas tree talk.
   Transitions led-radial, led-rain, led-spiral, led-diagonal (glowing LEDs cover the screen and
   switch off) · ambient "leds" (a faint moving LED matrix, nice on dark title slides) ·
   data-led-bg="#0b130f" on <body> = the colour the LED wipes fill the screen with · data-dots="led-dots": glowing
   progress dots. The LEDs glow in the accent colour (data-accent, on <body> or on the slide). Docs: README.md next to this file.
   Link it before engine.js:  <script src="themes/pixelpine/theme.js" defer></script> */
(window.slideEngineThemes = window.slideEngineThemes || []).push({ name: 'pixelpine', setup(se) {
  const { W, H, fctx, sprite, clamp, sstep, layer, rafLoop, focusOf } = se;
  const LED_BG = se.body.dataset.ledBg || '#0b130f';

  /* ---------- LED wipes: a grid of LEDs lights up along a pattern, covers the screen, then switches off ---------- */
  function ledWipe(kind) {
    return async (from, to, dir, reveal) => {
      const G = 40, cols = Math.ceil(W / G), rows = Math.ceil(H / G), cells = [];
      const focus = kind === 'radial' ? focusOf(to, from) : [W / 2, H / 2];
      const diag = Math.hypot(W, H);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * G + G / 2, y = r * G + G / 2, dx = x - focus[0], dy = y - focus[1];
        let d;
        if (kind === 'radial') d = Math.hypot(dx, dy) / diag;
        else if (kind === 'rain') d = (y / H) * .55 + ((c * 7919) % 97) / 97 * .45;
        else if (kind === 'spiral') d = (Math.hypot(dx, dy) / diag) * .55 + ((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * .45;
        else d = (x / W) * .7 + (y / H) * .3;
        cells.push({ x, y, d: dir < 0 ? 1 - d : d, n: Math.random() });
      }
      layer(from, 2);
      const band = .22; let swapped = false;
      await rafLoop(se.simple ? 700 : 1900, p => {
        fctx.clearRect(0, 0, W, H);
        const first = p < .5, q = first ? p / .5 : (p - .5) / .5;
        if (!first && !swapped) { swapped = true; from.classList.remove('se-on'); layer(to, 2); reveal(); }
        for (const cl of cells) {
          const on = sstep(clamp((q * (1 + band) - cl.d) / band));
          const cover = first ? on : 1 - sstep(clamp((q * (1 + band) - (1 - cl.d)) / band));
          const glow = first ? Math.sin(on * Math.PI) * .9 + on * .35 : cover * .35 + Math.sin(cover * Math.PI) * .9;
          if (cover > .002) { fctx.globalAlpha = cover; fctx.fillStyle = LED_BG; fctx.fillRect(cl.x - G / 2, cl.y - G / 2, G, G); }
          if (glow > .01) { fctx.globalAlpha = clamp(glow * (.75 + cl.n * .25)); fctx.drawImage(sprite, cl.x - G * .8, cl.y - G * .8, G * 1.6, G * 1.6); }
        }
        fctx.globalAlpha = 1;
      });
      fctx.clearRect(0, 0, W, H);
    };
  }
  se.transition('led-radial', ledWipe('radial')); se.transition('led-rain', ledWipe('rain'));
  se.transition('led-spiral', ledWipe('spiral')); se.transition('led-diagonal', ledWipe('diagonal'));

  /* ---------- data-dots="led-dots": the progress dots glow like LEDs ---------- */
  se.dots('led-dots', { init(dots) { dots.classList.add('se-led-dots'); } });
  se.css(`
#se-dots.se-led-dots i { width: 12px; height: 12px; }
#se-dots.se-led-dots i.seen { background: var(--se-accent-a45); }
#se-dots.se-led-dots i.cur { background: var(--se-accent-light); box-shadow: 0 0 10px 3px var(--se-accent-a90), 0 0 26px 8px var(--se-accent-a50); transform: scale(1.35); }
`);

  /* ---------- ambient: a faint LED matrix with a slow wave and twinkles ---------- */
  se.ambient('leds', {
    init() { const dots = []; for (let y = 30; y < H; y += 44) for (let x = 30 + ((y / 44) % 2) * 22; x < W; x += 44) dots.push([x, y, Math.random() * 6.28]); return { dots }; },
    draw(g, st, t) {
      g.clearRect(0, 0, W, H);
      for (const [x, y, ph] of st.dots) {
        const wave = Math.sin(t * 1.3 - x / 260 - y / 340 + Math.sin(t * .4) * 2) * .5 + .5;
        const tw = Math.pow(Math.sin(t * 2.1 + ph * 7) * .5 + .5, 18);
        g.globalAlpha = .05 + wave * .1 + tw * .5; g.drawImage(sprite, x - 9, y - 9, 18, 18);
      }
      g.globalAlpha = 1;
    }
  });
} });
