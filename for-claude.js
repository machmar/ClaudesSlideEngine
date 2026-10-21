/* "For Claude" button for the web pages (index.html, themes/demo.html): copies the starting prompt for Claude.
   Put <div data-for-claude></div> where the button should go and load this script. The prompt below is the one
   copy for the web pages; README.md ("Prompt for Claude") has the same text: change both together. */
(() => {
  const PROMPT = `Make me a presentation with Claude's Slide Engine: https://github.com/machmar/ClaudesSlideEngine

1. Get the repository (clone or download it next to my material) and read its CLAUDE.md first. Follow it step by step.
2. If I don't say it below, ask me how long the talk is, who it is for and in which language it should be.
3. Use only real material: the files, pictures and numbers I give you or point you to. Never invent images, numbers or quotes.
4. Before writing slides, show me an outline with one line per slide and wait for my OK.
5. Look in RECIPES.md for how each kind of slide was solved before, and in themes/README.md for the themes that exist.
6. Make a theme for this presentation, built from its subject, and mix in existing themes where they fit.
7. Check every slide in a browser, run tools/check-deck.js, then build one HTML file with build.py and tell me where it is.
8. At the end, add what you solved in a new way to RECIPES.md. If the theme is different enough from the existing ones, offer to send it to the repository as a pull request.

The presentation is about: `;

  const css = document.createElement('style');
  css.textContent = `
.fc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; }
.fc-btn { font: 700 16px Inter, Arial, sans-serif; color: var(--bg, #16191e); background: var(--accent, #9fb3c8); border: 0; border-radius: 12px;
  padding: 11px 20px; cursor: pointer; }
.fc-btn:hover { filter: brightness(1.1); }
.fc-btn:focus-visible { outline: 3px solid var(--fg, #eef0f3); outline-offset: 2px; }
.fc-done { color: var(--ok, #8fd19e); font-weight: 600; }
.fc-details { margin-top: 10px; }
.fc-details summary { cursor: pointer; color: var(--muted, #a9b2bd); }
.fc-prompt { white-space: pre-wrap; font: 14px/1.55 Consolas, 'Courier New', monospace; color: var(--fg, #eef0f3); background: var(--bg, #16191e);
  border: 1px solid var(--line, #343b45); border-radius: 12px; padding: 16px 18px; margin: 10px 0 0; overflow-x: auto; }`;
  document.head.appendChild(css);

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
      t.remove(); return ok;
    }
  }
  document.querySelectorAll('[data-for-claude]').forEach(box => {
    box.innerHTML = `<div class="fc-row"><button type="button" class="fc-btn">For Claude: copy the prompt</button>
      <span class="fc-done" role="status" aria-live="polite"></span></div>
      <details class="fc-details"><summary>Show the prompt</summary><pre class="fc-prompt"></pre></details>`;
    box.querySelector('.fc-prompt').textContent = PROMPT;
    const done = box.querySelector('.fc-done');
    box.querySelector('.fc-btn').addEventListener('click', async () => {
      const ok = await copy(PROMPT);
      done.textContent = ok ? 'Copied. Paste it into Claude and finish the last line.' : 'Copy failed: open "Show the prompt" and copy it by hand.';
      if (!ok) box.querySelector('details').open = true;
    });
  });
  window.slideEnginePrompt = PROMPT;
})();
