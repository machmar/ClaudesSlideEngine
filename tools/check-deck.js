/* Deck checker: paste into the browser console (or run it with an automated browser's JavaScript tool) on an open
   deck. It shows every slide for a moment, measures it and returns a list of problems:
     - an element sticks out of the 1920 x 1080 slide (text too long, picture too big),
     - a font size outside the deck's sizes (default 128 / 96 titles, 64 / 40 / 32 px, change SIZES below),
     - a slide without speaker notes or without its own data-enter,
     - the same transition on two slides in a row.
   An empty list means the deck passed. It changes nothing; reload the page afterwards to continue presenting. */
(() => {
  const SIZES = [128, 96, 64, 40, 32], W = 1920, H = 1080, problems = [];
  const eng = window.slideEngine;
  if (!eng) return 'slideEngine not found: open a deck first';
  eng.slides.forEach((s, i) => {
    const on = s.classList.contains('se-on');
    s.classList.add('se-on');
    const sr = s.getBoundingClientRect(), k = sr.width / W;
    s.querySelectorAll('*').forEach(el => {
      if (el.closest('.se-ambient,.se-scanbar') || el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const out = Math.max((sr.left - r.left) / k, (r.right - sr.right) / k, (sr.top - r.top) / k, (r.bottom - sr.bottom) / k);
      if (out > 2) problems.push(`slide ${i + 1}: <${el.tagName.toLowerCase()}> "${(el.textContent || '').trim().slice(0, 40)}" sticks out of the slide by ${Math.round(out)} px`);
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (ownText && !el.closest('pre,kbd,code')) {
        const fs = Math.round(parseFloat(getComputedStyle(el).fontSize));
        if (!SIZES.includes(fs)) problems.push(`slide ${i + 1}: "${el.textContent.trim().slice(0, 40)}" is ${fs} px (allowed ${SIZES.join('/')})`);
      }
    });
    if (!on) s.classList.remove('se-on');
    if (!(eng.notes[i] || '').trim()) problems.push(`slide ${i + 1}: no speaker notes (<aside>)`);
    if (i > 0 && 'enterAuto' in s.dataset) problems.push(`slide ${i + 1}: no data-enter, uses ${s.dataset.enter} from the cycle`);
    if (i > 0 && s.dataset.enter === eng.slides[i - 1].dataset.enter) problems.push(`slide ${i + 1}: same transition as slide ${i} (${s.dataset.enter})`);
  });
  return problems.length ? [...new Set(problems)] : 'deck OK';
})();
