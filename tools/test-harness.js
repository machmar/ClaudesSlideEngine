/* Test harness for checking slide-engine decks from an automated browser.

   An embedded or background browser window often paints no frames: requestAnimationFrame never fires and the
   animation timeline stands still, so transitions look frozen. Paste this into the page first; it replaces
   requestAnimationFrame with a timer and lets you advance every Web Animation by hand:

     slideEngine.go(3); await adv(800);   // ...take a screenshot mid-transition
     await adv(5000);                     // ...screenshot the finished slide

   Not needed (and not wanted) in a normal, visible browser window. */
window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
window.cancelAnimationFrame = id => clearTimeout(id);
window.adv = async ms => {
  let last = performance.now();
  const end = last + ms;
  while (performance.now() < end) {
    await new Promise(r => setTimeout(r, 16));
    const now = performance.now(), dt = now - last; last = now;
    document.getAnimations().forEach(a => { if (a.playState === 'running') a.currentTime = (a.currentTime || 0) + dt; });
  }
};
'harness ready: slideEngine.go(n); await adv(ms)';
