# Themes

The core engine is neutral: cube turns, an iris, blinds, a dissolve, a zoom, a vortex and the automatic element
builds. A **theme** adds a look on top: more transitions, element effects, ambient backgrounds and progress-dot styles.
Every name is unique across the core and all themes, so **a deck can link any number of themes and mix their
effects freely**: a slide can come in with an LED wipe from one theme while its cards roll in with another's.

**Every new presentation gets its own theme**, built from its subject, and it comes here when it adds something the
catalogue doesn't have yet (see [CLAUDE.md](../CLAUDE.md), step 4 of "Making a presentation").

**Try them: [`demo.html`](https://machmar.github.io/ClaudesSlideEngine/themes/demo.html)** plays every transition,
effect, background and progress style of the core and of every theme, one at a time, between a blue slide A and an
orange slide B. Its list is generated from the manifests, so a new theme shows up there by itself.

## Using themes in a deck

Link each theme's `theme.js` **before** `engine.js`:

```html
<link rel="stylesheet" href="../ClaudesSlideEngine/engine.css">
<script src="../ClaudesSlideEngine/themes/pixelpine/theme.js" defer></script>
<script src="../ClaudesSlideEngine/themes/train/theme.js" defer></script>
<script src="../ClaudesSlideEngine/engine.js" defer></script>
```

Then use the names from the catalogue below like any core name (`data-enter`, `data-fx`, `data-ambient`,
`data-dots`). A theme's own options are attributes on `<body>`, listed in its README. If a name is used but its theme
isn't linked, the browser console says which slide and which theme. `build.py` packs theme files into the single-file
build like the engine.

## Adding a theme

1. Make `themes/<name>/` (lowercase, dashes allowed) with three files:
   - `theme.js`: the code, CSS included (see the API below);
   - `theme.json`: the manifest (below); every name `theme.js` registers must be listed here and nowhere else;
   - `README.md`: what it adds, its `<body>` options, which project it was made for, a demo link.
2. Pick names that don't clash with the catalogue. A prefix helps (`led-…`).
3. Show it off: the deck it was made for as `demo/<Name>-demo/` (paths to `../../`), and a section **at the end** of
   `demo/showcase/deck.html`. The showcase keeps every info slide first (neutral core only), then one section per
   theme in the order they were added; yours starts with a dark divider slide (kicker `Theme: <name>`, your ambient
   if you have one), then one short slide per transition and effect, styled with your theme's look via a class and,
   if your theme has a progress style, `data-dots="<style>"` on those slides; give them the theme's colour with
   `data-accent`.
   Add what the deck solved in a new way to [`RECIPES.md`](../RECIPES.md).
4. Run `python tools/themes.py`: it checks every theme and regenerates the catalogue below and `catalogue.js`, which
   feeds [`demo.html`](demo.html). The same check runs on every pull request. Open `demo.html` and run every one of
   your names; an effect that needs particular content (a picture, a card) gets it from `preview` in `theme.json`.
5. Open a pull request. See [CLAUDE.md](../CLAUDE.md#contributing-pull-requests-welcome).

`theme.json`:

```json
{
  "name": "pixelpine",
  "title": "PixelPine (LED tree)",
  "description": "One line: what it looks like.",
  "author": "your GitHub name (made with Claude)",
  "tags": ["led", "glow"],
  "provides": {
    "transitions": ["led-radial"],
    "effects": [],
    "ambients": ["leds"],
    "dots": []
  },
  "options": { "data-led-bg": "colour the LED wipes fill the screen with" },
  "accent": "#ffc47d",
  "preview": { "my-pop": "<div class=\"card\" data-fx=\"my-pop\"><p class=\"big\">240</p></div>" },
  "demo": "demo/PixelPine-demo/deck.html"
}
```

`accent` (optional) is the theme's colour: the theme demo and the showcase section use it. `preview` (optional) maps
an effect name to the sample HTML `demo.html` shows it on (paths relative to `themes/`); without it the effect is
shown on a plain card.

## Theme API

```js
(window.slideEngineThemes = window.slideEngineThemes || []).push({ name: 'mytheme', setup(se) {
  se.transition('my-wipe', async (from, to, dir, reveal) => { ... });
  se.build('my-pop', { measure: true, make(item, { el, delay, out, A, geo, slide }) { ... } });
  se.ambient('my-bg', { init(slide, canvas) { return state; }, draw(g, state, t, dt, still) { ... } });
  se.dots('my-dots', { init(dotsEl, count) { ... }, update(current, dotsEl) { ... } });
  se.css(`...`);
} });
```

**Registering**

| call | what it adds | used in a deck as |
|---|---|---|
| `se.transition(name, fn)` | `fn(from, to, dir, reveal)` is async: show both slides (`se.layer`), animate, call `reveal()` when the new slide becomes visible (its element builds start then), resolve when done. `dir` is 1 forward, -1 back. Read `se.simple` for the short M-key version. | `data-enter="name"` |
| `se.build(name, def)` | an element effect. `def.make(item, ctx)` adds animations to `ctx.out` (use `ctx.A(el, keyframes, options)`, which applies `ctx.delay`). `def.measure`: `true` gives `ctx.geo` = the element's box on the slide (`x, y, w, h`), `'text'` adds the box of its text (`tx`, `ty`, `th`). `def.nested`: may sit inside another animated element. `def.count`: its numbers also count up. `el._se` is scratch space for the current build (`el._se.countDelay` holds the count back, ms). | `data-fx="name"` |
| `se.ambient(name, def)` | a canvas background behind a slide's content. `init(slide, canvas)` returns state; `draw(g, state, t, dt, still)` is called every frame while the slide is shown (`t` seconds, `dt` since the last frame, `still` = one frozen frame for the overview). | `data-ambient="name"` |
| `se.dots(name, def)` | a progress indicator style: `init(dotsEl, count)` when it becomes active (add classes and `se.helper()` elements; both are cleared when another style takes over), `update(current, dotsEl, count)` on every slide change. `dotsEl` holds one `<i>` per slide with classes `cur` / `seen`. | `data-dots="name"` on `<body>` or on a slide |
| `se.css(text)` | adds a stylesheet | |

**Helpers on `se`**: `W`, `H` (canvas size), `body`, `stage`, `fx` / `fctx` (a full-stage canvas above the slides and its
2D context, for transitions to draw on; clear it when done), `sprite` (a glow dot in the accent colour, redrawn in
place when a slide changes the accent), `ACCENT`, `rgb` (both follow the current slide's accent; read them when drawing,
not once in `setup`),
`ease` (`io`, `out`, `in`), `simple`, `clamp`, `sstep`, `rgba`, `mix`, `A` (a tracked animation for transitions; a key
press mid-transition finishes it), `layer(slide, z)`, `rafLoop(ms, p => …)`, `finished(anim)`, `focusOf(slide)`,
`centerOf(el)`, `helper(cls, html, style)`, `sampled(ms, t => keyframe, n)`, `splitLetters(el)`, `countTargets(el)`.

Elements a theme adds to a slide for an effect must be made with `se.helper()` (class `se-helper`): the engine removes
them when the slide is left, and the overview, the planner and `tools/check-deck.js` ignore them.

## Catalogue

<!-- catalogue:start (generated by tools/themes.py, do not edit by hand) -->

### All themes

| theme | what it is | adds | tags | demo |
|---|---|---|---|---|
| **core** (built into `engine.js`) | neutral: cube turns, iris, blinds, dissolve, zoom, vortex and the automatic element builds | 10 transitions, 13 effects, 2 dot styles | | [showcase](../demo/showcase/deck.html) |
| [**pixelpine**](pixelpine/README.md) | Glowing LED matrix wipes and a twinkling LED background, from the PixelPine Christmas tree talk. | 4 transitions, 1 ambient, 1 dot style | electronics, glow, led | [PixelPine-demo](../demo/PixelPine-demo/deck.html) |
| [**train**](train/README.md) | A toy steam loco pulls slides away as wagons, steam clouds, a tunnel, level-crossing barriers, cards on wheels. | 5 transitions, 4 effects, 1 ambient, 1 dot style | playful, steam, transport | [Nudgy-demo](../demo/Nudgy-demo/deck.html) |

### Transitions (`data-enter`), A–Z

| name | theme |
|---|---|
| `barrier` | [train](train/README.md) |
| `blinds` | core |
| `cube-x` | core |
| `cube-y` | core |
| `dissolve` | core |
| `fade` | core |
| `glitch` | core |
| `iris` | core |
| `led-diagonal` | [pixelpine](pixelpine/README.md) |
| `led-radial` | [pixelpine](pixelpine/README.md) |
| `led-rain` | [pixelpine](pixelpine/README.md) |
| `led-spiral` | [pixelpine](pixelpine/README.md) |
| `none` | core |
| `steam` | [train](train/README.md) |
| `track` | [train](train/README.md) |
| `train` | [train](train/README.md) |
| `tunnel` | [train](train/README.md) |
| `vortex` | core |
| `zoom` | core |

### Element effects (`data-fx`), A–Z

| name | theme |
|---|---|
| `count` | core |
| `depart` | [train](train/README.md) |
| `fade` | core |
| `flip` | core |
| `letters` | core |
| `list` | core |
| `pop` | core |
| `power` | core |
| `puff` | [train](train/README.md) |
| `radial` | core |
| `rise` | core |
| `rows` | core |
| `scan` | core |
| `spin3d` | core |
| `tilt` | core |
| `tow` | [train](train/README.md) |
| `wagon` | [train](train/README.md) |

### Ambient backgrounds (`data-ambient`), A–Z

| name | theme |
|---|---|
| `leds` | [pixelpine](pixelpine/README.md) |
| `trains` | [train](train/README.md) |

### Progress dot styles (`data-dots`), A–Z

| name | theme |
|---|---|
| `counter` | core |
| `dots` | core |
| `led-dots` | [pixelpine](pixelpine/README.md) |
| `track` | [train](train/README.md) |

### By tag

| tag | themes |
|---|---|
| electronics | [pixelpine](pixelpine/README.md) |
| glow | [pixelpine](pixelpine/README.md) |
| led | [pixelpine](pixelpine/README.md) |
| playful | [train](train/README.md) |
| steam | [train](train/README.md) |
| transport | [train](train/README.md) |

<!-- catalogue:end -->
