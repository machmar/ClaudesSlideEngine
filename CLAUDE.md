# CLAUDE.md: Claude's Slide Engine

This repo is a presentation toolkit **for you (Claude) to use**. People ask you to make or convert a presentation;
you write a deck of plain HTML `<section>` slides, the engine animates it, `build.py` packs it into one file.
Read this file, then follow it. Reference for every attribute and effect: `README.md`. Default look and tone:
`PRESENTATION-STYLE.md`. Themes and the catalogue of every effect: `themes/README.md`. Worked examples:
`demo/showcase/deck.html` (shared CSS classes, English) and `demo/PixelPine-demo/deck.html` (inline styles, Czech,
pictures and video clips). How each kind of slide was solved before: `RECIPES.md`.

**Pull requests are highly welcome** (new themes, transitions, element effects, controls, fixes, anything). If you
make a theme or improve the engine while making someone's deck, tell the user it could go upstream and offer to
prepare a pull request to https://github.com/machmar/ClaudesSlideEngine (see Contributing at the end).

## Making a presentation

1. **Get the brief.** You need: the material (a project folder, documents, notes, a URL), the audience, the language,
   and **how long the talk is** (about 1 slide per 30 s: 5 min = 8–11 slides). Read the material yourself first and
   ask only for what you can't find. Ask where the deck should live if it isn't obvious; default is
   `<their project>/presentation/`, otherwise `talks/<name>/` in this repo (git-ignored).
2. **Outline first.** One line per slide (title + what it shows + which picture). For a talk longer than ~5 slides,
   show the outline to the user and wait for an OK before writing slides. Follow `PRESENTATION-STYLE.md`: one idea
   per slide, headline numbers big, details in the notes. **Look up each kind of content in `RECIPES.md`** (KPIs,
   cost tables, schematics, clips, …) and reuse the solution instead of inventing a new one.
3. **Collect real material.** Pictures into `presentation/media/` (PNG/JPG), clips into `presentation/video/`
   (MP4, H.264, small: 640–1280 px wide, a few MB). Use renders, screenshots, schematic crops, photos and charts from
   the user's project. **Never invent images, numbers, quotes or statistics.** If something is missing, leave it out
   or ask. You may draw simple diagrams as inline `<svg>`.
4. **Make a theme for this presentation.** The core is neutral, and every new presentation should get **its own
   theme** in `themes/<name>/` (`themes/README.md` says how), built from the project's subject: a toy train got steam,
   wagons and a tunnel; an LED tree got LED wipes. Give it at least one transition or effect that only makes sense for
   this subject, plus its colours as options. Check the catalogue in `themes/README.md` first and link existing themes
   for what already fits; mixing is fine and names never clash. Keep the theme generic (no slide text in it) so other
   decks can use it, and run `python tools/themes.py`.
   **When the deck is done, decide whether to submit the theme:** if it adds something the catalogue doesn't have (a
   new kind of transition, effect or background, not just new colours), offer the user to send it upstream as a pull
   request, with the deck as `demo/<Name>-demo/` and a section in the showcase (see Contributing). If it is too close
   to an existing theme, fold the improvements into that theme instead, or keep it local.
5. **Write `deck.html`.** Start from a copy of a demo deck and fix the relative paths to `engine.css`, `engine.js`
   and the themes (theme scripts go **before** `engine.js`). Rules:
   - one `<section>` per slide, laid out with normal CSS on a 1920 × 1080 canvas (flex column by default);
   - text sizes only 64 px headings, 40 px body, 32 px labels (one 96–128 px title on the first and last slide);
   - every slide except the first has its own `data-enter` (core or a linked theme), no two neighbours alike, no
     `glitch` unless asked;
   - every slide has `<aside>` speaker notes: 30–60 s of full spoken sentences, same language as the slides;
   - set `data-lang` (`cs` or `en` key hints) and `data-accent` on `<body>`;
   - let the automatic builds work; add `data-fx` only where it helps (`power` for clips, `spin3d` for product
     renders, `scan` for schematics and screenshots).
6. **Check it in a browser** (see Testing below): load `tools/test-harness.js`, step to every slide and look at a
   screenshot of each one, then run `tools/check-deck.js` and fix everything it lists. Open the overview (wheel or G)
   for a one-screen look at all slides. The console warns about any name whose theme isn't linked.
7. **Build** the portable file: `python <engine>/build.py deck.html -o <Name>.html` (embeds the engine, pictures and
   clips; Google Fonts stay links). Rebuild after every change to the deck.
8. **Hand over:** the path of the built file, the slide list, anything you left out and why. Mention F (full
   screen), N (notes), the wheel overview and H (all controls).
9. **Update `RECIPES.md`:** add a row for every kind of content you solved in a new way (a layout, an interaction, a
   trick for a kind of information), with the deck and slide, and improve rows you found a better way for. If the
   deck goes upstream as a demo, these rows go into the same pull request.

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

`window.slideEngine` = `{ go(n), next(), prev(), overview(), current, slides, notes, themes, transitions }`.

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
   `layer()`, `rafLoop()`, `focusOf()`; canvas effects draw on `#se-fx`. Going back plays the leaving slide's
   transition reversed. Slides without `data-enter` get one from the cycle and are marked `data-enter-auto`.
   Registries `T`, `BUILDS` (theme element effects, run from `makeBuild`'s `default:`), `AMBIENTS`, `DOTSTYLES`
   (progress styles; core `counter` and `dots`; `setDots()` switches per slide from `chrome()`).
   Elements made for an effect use `helper()` (class `se-helper`): removed by `resetBuilds`, ignored by plans,
   overview clones and `check-deck.js`. `prime()` measures elements whose effect asks for it (`geoOf()`) and gives
   each a scratch object `el._se`.
5. **Navigation:** `go(n)`; input during a transition sets `skipFx`, finishes it and queues the target. Keys, click
   (left 20 % = back), touch swipe, mouse buttons 3/4, BrowserBack/Forward keys and a history trap (after the first
   gesture the page sits on a middle history entry; `popstate` to either neighbour becomes prev/next). `nav()` drops
   duplicate signals within 450 ms. Right click is disabled. `next()` / `prev()` first dispatch a cancelable `se:step`
   on the current slide (in-slide steps, README "Steps inside a slide"); `go()` and `closeOverview()` fire
   `se:leave` / `se:enter` on the two slides.
6. **Overview** (`openOverview` / `closeOverview`, `ovState` 0 closed / 1 open / 2 closing): static clones of every
   slide in `#se-ov`, 3 columns up to 9 slides, else 4; extra rows scroll the grid. The wheel opens it, then steps
   the highlight (80 px of delta = one notch). `next` enters the highlighted slide (shown finished, no builds),
   `prev` returns to the starting slide. `go()` is ignored while it is open.
7. **Timer** `#se-timer` (bottom right, starts on the first slide change, `setInterval`), T / Shift+T.
   **Help panel** `#se-help` (H / ? / F1, closes after 6 s or on any key/click).
8. **Themes:** theme files push `{ name, setup(se) }` onto `window.slideEngineThemes` before the engine runs; after
   the core transitions are defined, the engine calls every `setup(themeAPI)` (API in `themes/README.md`), then
   creates the ambients (`startAmbients()`) and warns in the console about unknown names. A theme loaded after the
   engine is reported and ignored.

**New looks go into a theme**, not the core: the core stays neutral and only gets things every deck can use. Adding a
core transition: write `T['name']` (layer both slides, animate with `A()` or `rafLoop()`, call `reveal()` when the
new slide shows, await the end), then add it to the README table and to `demo/showcase/deck.html`. Adding an element
animation: a `case` in `makeBuild()`, optionally a rule in `plan()`, the README table. Adding a key: the keydown
handler, the help table in `engine.js`, the README "Presenting" section and the controls slide of the showcase.

After any engine change: open every demo deck, step through them with the harness, run `tools/check-deck.js` and
`python tools/themes.py --check`, and keep `README.md` in sync. The demos are served live by GitHub Pages straight
from `main`, so they must work unbuilt.

## Contributing (pull requests welcome)

New themes, transitions, element effects, controls, fixes and docs are all welcome as pull requests. **A PR can hold
any number of changes**: a new theme together with the talk that shows it off, a few fixes found along the way, docs.
Whatever belongs together. A good PR:

- keeps the engine dependency-free and puts new looks into a theme (`themes/<name>/`, see `themes/README.md`);
- passes `python tools/themes.py --check` (it also runs automatically on every PR);
- shows the new thing live: a demo deck in `demo/<Name>-demo/` (paths to `../../`), and for a new theme a section at
  the end of the showcase: the showcase (`demo/showcase/deck.html`) keeps every info slide first, using only the neutral core; after them comes
  one section per theme, in the order the themes were added. A new theme **appends its section at the end**: a dark
  divider slide (kicker `Theme: <name>`, the theme's ambient if it has one), then one short slide per transition and
  effect, styled with the theme's own look through a class on those slides and with its progress style (if it has
  one) through `data-dots` on them;
- adds its new solutions to `RECIPES.md` (one row each, pointing at the demo slide);
- updates the docs it touches (`README.md`, a theme's README, the help table in `engine.js` if it adds a key);
- was stepped through with `tools/test-harness.js` on the demo decks, and `tools/check-deck.js` passes on them;
- says in the description what it adds and how it was tested (browser and version); the PR template asks for this.

Only open a pull request when the user asks for it or agrees to it; it is published under their GitHub account.

## Repo conventions

- MIT licensed. No build step for the engine itself, no npm, no frameworks.
- Themes in `themes/<name>/` (theme.js, theme.json, README.md); demo decks in `demo/<Name>-demo/`, linking the engine
  and themes at `../../`.
- Showcase order: the showcase (`demo/showcase/deck.html`) keeps every info slide first, using only the neutral core; after them comes
  one section per theme, in the order the themes were added. A new theme **appends its section at the end**: a dark
  divider slide (kicker `Theme: <name>`, the theme's ambient if it has one), then one short slide per transition and
  effect, styled with the theme's own look through a class on those slides and with its progress style (if it has
  one) through `data-dots` on them.
- `RECIPES.md` is kept up to date by every deck that solves something new.
- Don't commit built single-file decks (`*.html` outputs of `build.py` are tens of MB). `talks/` is git-ignored.
- `HANDOVER.md`, if present, is the author's local session notes and is not part of the repo.
