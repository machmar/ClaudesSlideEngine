# CLAUDE.md: Claude's Slide Engine

This repo is a presentation toolkit **for you (Claude) to use**. People ask you to make or convert a presentation;
you write a deck of plain HTML `<section>` slides, the engine animates it, `build.py` packs it into one file.
Read this file, then follow it. Reference for every attribute and effect: `README.md`. Default look and tone:
`PRESENTATION-STYLE.md`. Worked examples: `demo/showcase/deck.html` (shared CSS classes, English) and
`demo/PixelPine-demo/deck.html` (inline styles, Czech, pictures and video clips).

## Making a presentation

1. **Get the brief.** You need: the material (a project folder, documents, notes, a URL), the audience, the language,
   and **how long the talk is** (about 1 slide per 30 s: 5 min = 8–11 slides). Read the material yourself first and
   ask only for what you can't find. Ask where the deck should live if it isn't obvious; default is
   `<their project>/presentation/`, otherwise `talks/<name>/` in this repo (git-ignored).
2. **Outline first.** One line per slide (title + what it shows + which picture). For a talk longer than ~5 slides,
   show the outline to the user and wait for an OK before writing slides. Follow `PRESENTATION-STYLE.md`: one idea
   per slide, headline numbers big, details in the notes.
3. **Collect real material.** Pictures into `presentation/media/` (PNG/JPG), clips into `presentation/video/`
   (MP4, H.264, small: 640–1280 px wide, a few MB). Use renders, screenshots, schematic crops, photos and charts from
   the user's project. **Never invent images, numbers, quotes or statistics.** If something is missing, leave it out
   or ask. You may draw simple diagrams as inline `<svg>`.
4. **Write `deck.html`.** Start from a copy of a demo deck and fix the two relative paths to `engine.css` and
   `engine.js`. Rules:
   - one `<section>` per slide, laid out with normal CSS on a 1920 × 1080 canvas (flex column by default);
   - text sizes only 64 px headings, 40 px body, 32 px labels (one 96–128 px title on the first and last slide);
   - every slide except the first has its own `data-enter`, no two neighbours alike, no `glitch` unless asked;
   - every slide has `<aside>` speaker notes: 30–60 s of full spoken sentences, same language as the slides;
   - set `data-lang` (`cs` or `en` key hints) and `data-accent` on `<body>`;
   - let the automatic builds work; add `data-fx` only where it helps (`power` for clips, `spin3d` for product
     renders, `scan` for schematics and screenshots).
5. **Check it in a browser** (see Testing below): load `tools/test-harness.js`, step to every slide and look at a
   screenshot of each one, then run `tools/check-deck.js` and fix everything it lists. Open the overview (wheel or G)
   for a one-screen look at all slides.
6. **Build** the portable file: `python <engine>/build.py deck.html -o <Name>.html` (embeds the engine, pictures and
   clips; Google Fonts stay links). Rebuild after every change to the deck.
7. **Hand over:** the path of the built file, the slide list, anything you left out and why. Mention F (full
   screen), N (notes), the wheel overview and H (all controls).

## Converting an existing presentation

Rebuild it as real HTML slides; don't paste screenshots of the old slides (they can't animate and look blurry).

- **PowerPoint (.pptx):** read it with `python-pptx`: per slide the title, text frames, tables and
  `slide.notes_slide.notes_text_frame.text` (speaker notes → `<aside>`). Export embedded pictures from the picture
  shapes' `image.blob` into `media/`. Charts: redraw as SVG or a table from the chart data, or render that slide to
  an image only if there is no other way.
- **PDF:** extract text with `pdftotext -layout` or PyMuPDF, pictures with PyMuPDF (`page.get_images`). A page that is
  one big diagram may be rendered to PNG and used as a picture.
- **Google Slides / Keynote:** ask for a .pptx or PDF export.
- **Markdown / notes / an outline:** treat it as the material for step 2 above.

Keep the content and order unless the user asks for changes. Restyle to `PRESENTATION-STYLE.md` (the old deck's
colours and fonts only if the user wants them kept), split overfull slides, move long text into the notes, and say
which slides you split or merged.

## Testing

An automated or background browser often paints no frames: `requestAnimationFrame` never fires and the animation
timeline stands still, so everything looks frozen and screenshots lie.

1. Serve the folder that contains both the deck and the engine, e.g. `python -m http.server 8768`, and open the
   deck over `http://` (media and fonts work more reliably than from `file://`).
2. Run the contents of `tools/test-harness.js` in the page, then `slideEngine.go(n); await adv(800)` for a
   mid-transition screenshot and `await adv(5000)` for the finished slide. Keep each script call under ~40 s.
3. Run `tools/check-deck.js` the same way: it returns `'deck OK'` or a list of problems.
4. Inputs: dispatch `KeyboardEvent`s on `document.body` and `WheelEvent`s on `#se-stage` (not `window`).
   Synthetic events can't prove real mouse-driver behaviour; ask the user to try side buttons and the wheel.

`window.slideEngine` = `{ go(n), next(), prev(), overview(), current, slides, notes, transitions }`.

## Changing the engine

`engine.js` is one IIFE, no dependencies, standard web APIs only (current Firefox, Chrome, Edge; Safari untested). In order:

1. **Config** from `<body data-*>`; the accent colour becomes CSS variables `--se-accent*` used by `engine.css`.
2. **Stage build:** every `body > section` (or `body > main > section`) moves into `#se-stage` (1920 × 1080, scaled
   by `fit()`) and gets class `se-slide`. `<aside>` → notes, `img[data-video]` → `<video>`, a table's inline
   `padding` → `--cell-pad`. engine.css keeps its defaults at zero specificity (`:where`) so deck CSS wins, except
   visibility (`#se-stage .se-slide` / `.se-on`).
3. **Builds:** `plan(slide)` picks an animation per element (automatic rules or `data-fx`), `prime()` creates them
   paused, `playBuilds()` starts them when the transition calls `reveal()`, `resetBuilds()` cancels them. `count` is
   a rAF tween (`renderCount`) that handles `1 000`, decimal commas, leading zeros and `a → b`.
4. **Transitions:** registry `T[name] = async (from, to, dir, reveal)`, helpers `A()` (tracked Web Animation),
   `layer()`, `rafLoop()`, `focusOf()`. LED wipes draw on the `#se-fx` canvas. Going back plays the leaving slide's
   transition reversed. Slides without `data-enter` get one from the cycle and are marked `data-enter-auto`.
5. **Navigation:** `go(n)`; input during a transition sets `skipFx`, finishes it and queues the target. Keys, click
   (left 20 % = back), touch swipe, mouse buttons 3/4, BrowserBack/Forward keys and a history trap (after the first
   gesture the page sits on a middle history entry; `popstate` to either neighbour becomes prev/next). `nav()` drops
   duplicate signals within 450 ms. Right click is disabled.
6. **Overview** (`openOverview` / `closeOverview`, `ovState` 0 closed / 1 open / 2 closing): static clones of every
   slide in `#se-ov`, 3 columns up to 9 slides, else 4; extra rows scroll the grid. The wheel opens it, then steps
   the highlight (80 px of delta = one notch). `next` enters the highlighted slide (shown finished, no builds),
   `prev` returns to the starting slide. `go()` is ignored while it is open.
7. **Timer** `#se-timer` (bottom right, starts on the first slide change, `setInterval`), T / Shift+T.
   **Help panel** `#se-help` (H / ? / F1, closes after 6 s or on any key/click).

Adding a transition: write `T['name']` (layer both slides, animate with `A()` or `rafLoop()`, call `reveal()` when the
new slide shows, await the end), then add it to the README table and to `demo/showcase/deck.html`. Adding an element
animation: a `case` in `makeBuild()`, optionally a rule in `plan()`, the README table. Adding a key: the keydown
handler, the help table in `engine.js`, the README "Presenting" section and the controls slide of the showcase.

After any engine change: open both demo decks, step through them with the harness, run `tools/check-deck.js`, and
keep `README.md` in sync. The demos are served live by GitHub Pages straight from `main`, so they must work unbuilt.

## Repo conventions

- MIT licensed. No build step for the engine itself, no npm, no frameworks.
- Don't commit built single-file decks (`*.html` outputs of `build.py` are tens of MB). `talks/` is git-ignored.
- `HANDOVER.md`, if present, is the author's local session notes and is not part of the repo.
