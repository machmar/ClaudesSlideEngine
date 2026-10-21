# Claude's Slide Engine

**Live demos:** [showcase](https://machmar.github.io/ClaudesSlideEngine/demo/showcase/deck.html) (what it can do and
how to control it) · [PixelPine](https://machmar.github.io/ClaudesSlideEngine/demo/PixelPine-demo/deck.html) (a real
11-slide talk, LED theme, in Czech) · [Nudgy](https://machmar.github.io/ClaudesSlideEngine/demo/Nudgy-demo/deck.html)
(a 12-slide talk about a toy locomotive, train theme, in Czech). Open in Firefox, Chrome or Edge, press → or scroll
the mouse wheel.

> **This is meant for Claude, not really for people.** It is the toolkit Claude (Anthropic's AI assistant, here
> working as Claude Code) uses to build presentations: you give Claude your material and the talk length, and it
> writes the deck, checks it and packs it into one HTML file. [`CLAUDE.md`](CLAUDE.md) tells Claude exactly how. You
> can write decks by hand with the reference below, but nothing here is polished for that: there is no editor, no
> guarantees, and the API changes whenever a talk needs something new.

**Pull requests are highly welcome:** new themes, transitions, element effects, controls, fixes, new recipes,
anything that makes the decks better, as many changes in one PR as belong together. Claude makes a theme for every new
presentation; if yours turned out different from the existing ones, send it upstream with the talk as a demo. See
[Contributing](CLAUDE.md#contributing-pull-requests-welcome) for what a good PR includes.

A plain HTML file of `<section>` slides becomes a heavily animated presentation: 3D cube turns, an iris, blinds, a
pixel dissolve, a zoom-through and a vortex between slides, every element building in (headings letter by letter,
numbers counting up, cards flipping in, table rows sliding in, clips switching on), a zoomable slide overview on the
scroll wheel, speaker notes and a talk timer. The core is neutral; **[themes](themes/README.md)** add a look on top
(LED wipes, steam trains, …), and a deck can mix any number of them. No libraries, no install: `engine.js` and
`engine.css`, plus `build.py` to pack a deck into one portable file.

## What's here

| Path | What it is |
|---|---|
| `engine.js`, `engine.css` | The engine (neutral core). Link both from a deck. |
| [`themes/`](themes/README.md) | Themes, one folder each, and the catalogue of every transition and effect by theme, kind and tag. |
| `build.py` | Packs a deck into one self-contained HTML file (Python 3, standard library only). |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for Claude: how to make or convert a presentation, how to change the engine. |
| [`PRESENTATION-STYLE.md`](PRESENTATION-STYLE.md) | The default look and tone of a deck (sizes, colours, structure). |
| [`RECIPES.md`](RECIPES.md) | How each kind of slide was solved before (KPIs, cost tables, schematics, clips, …), with the deck and slide. Updated by every new deck. |
| `demo/showcase/` | Demo deck: first the neutral core and the controls, then one section per theme. |
| `demo/PixelPine-demo/` | A real talk built with the engine and the pixelpine theme (Czech, with pictures and clips). |
| `demo/Nudgy-demo/` | A real talk built with the train theme (Czech; steps through a schematic inside one slide). |
| `tools/test-harness.js` | Lets an automated browser step through animations frame by frame. |
| `tools/check-deck.js` | Finds overflowing elements, stray font sizes, missing notes and repeated transitions. |
| `tools/themes.py` | Checks every theme and regenerates the catalogue in `themes/README.md`. |

To ask Claude for a talk: open Claude Code in this folder (or point it here) and say something like *"Make a
10-minute presentation about my project in ../myproject"*, or *"Convert talk.pptx into a presentation"*.

## A deck

```html
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>My talk</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Nunito+Sans:wght@400;700&display=swap">
<link rel="stylesheet" href="../ClaudesSlideEngine/engine.css">
<script src="../ClaudesSlideEngine/themes/pixelpine/theme.js" defer></script>  <!-- optional: themes first -->
<script src="../ClaudesSlideEngine/engine.js" defer></script>
<style>
  section { font-family: 'Nunito Sans', Arial, sans-serif; padding: 128px; gap: 48px; background: #f5f0e6; }
  h2 { font-size: 64px; }
  p { font-size: 40px; }
</style>
</head>
<body data-accent="#ffc47d" data-lang="cs">

<section data-ambient="leds" style="background:#13221b;color:#f5f0e6;justify-content:center">
  <h1 style="font-size:128px">Title</h1>
  <aside>Speaker notes for this slide (press N).</aside>
</section>

<section data-enter="cube-y">
  <h2>Second slide</h2>
  <p style="font-size:64px">240 LED</p>
  <img src="media/photo.png" style="width:600px;height:400px;object-fit:cover">
  <img src="media/clip-still.png" data-video="media/clip.mp4" style="width:400px;height:500px">
</section>

</body>
</html>
```

- Every `<section>` directly in `<body>` (or in `<main>`) is one slide on a fixed **1920 × 1080** canvas, scaled to
  fit the screen. Lay it out with normal CSS; a slide is a flex column unless you say otherwise
  (`style="flex-direction:row"`, or `display:grid` inline or as `data-display="grid"`).
- Style slides with your own CSS as usual (`section { ... }`, classes, inline styles).
- `<aside>` inside a slide = speaker notes.
- `<img data-video="clip.mp4" src="still.png">` becomes a looping, muted video that plays only while its slide is
  shown; the image is its poster.
- `data-ambient="leds"` on the title comes from the pixelpine theme linked above; everything else here is core.

## Transitions

Put `data-enter="<name>"` on a slide to choose how it comes in (going back plays it in reverse). Slides without one
take the next transition from a cycle (`data-transitions` on `<body>` changes the cycle). The core ones are below;
themes add more (LED wipes, a steam train, a tunnel, …): see the [catalogue](themes/README.md#catalogue).

| name | what it does |
|---|---|
| `cube-y`, `cube-x` | 3D cube turn sideways / upwards, pulling back mid-turn |
| `iris` | a glowing ring opens the new slide from its first picture (or `data-focus`) |
| `blinds` | 14 blinds open alternately from top and bottom in a wave |
| `dissolve` | the old slide brightens and melts away in soft pixels |
| `zoom` | fly through the old slide; the new one spins in from far away |
| `glitch` | RGB-split digital glitch with torn slices (not used in the demos) |
| `vortex` | the old slide spirals into the centre, the new one spirals out |
| `fade`, `none` | quiet slides |

`data-focus="x,y"` (canvas pixels) sets where `iris` starts (and theme transitions that start from a point). Without
it, `iris` uses the incoming slide's first picture.

## Element animations

Chosen automatically, in document order:

| element | animation |
|---|---|
| `h1`–`h4` | letters flip up one by one with a glow (`letters`) |
| `p`, `li` | rise and un-blur (`rise`); text of 60 px or more pops in (`pop`) |
| numbers in big text (60 px+), right-aligned table cells | count up from 0 (`count`); `480 → 141` counts up, then down |
| `div` / `figure` with a background, border or shadow | swings in like a card (`flip`) |
| `table` | rows slide in one by one (`rows`) |
| `ul`, `ol` | items come in one by one (`list`) |
| `img`, `svg` | pop in (`pop`) |
| video | tilts up from flat (`tilt`) |

Override with `data-fx="<name>"` on the element: any name above, plus `fade`, `power` (switches on like an old
TV/LED panel, good for videos), `spin3d` (spins in in 3D, good for product renders), `scan` (a glowing bar scans it
in, good for schematics and screenshots), `radial` (spreads from the top with shifting colours), `count` (count up
any element's numbers), or `none`. Themes add more effects: see the [catalogue](themes/README.md#catalogue).

## Options on `<body>`

| attribute | default | |
|---|---|---|
| `data-accent` | `#9fb3c8` (neutral) | colour of every glow: letter glow, iris ring, scan bar, progress dots, themes' lights |
| `data-lang` | `en` | `cs` for Czech key hints |
| `data-width`, `data-height` | `1920`, `1080` | canvas size |
| `data-transitions` | `cube-y,iris,blinds,dissolve,zoom,vortex,cube-x,fade` | cycle for slides without `data-enter` (theme names work too) |
| `data-dots` | on | `off` hides the progress dots; a theme can add other styles |
| `data-timer` | on | `off` hides the talk timer until T is pressed |
| `data-wheel` | on | `off`: the scroll wheel doesn't open the slide overview |

`data-ambient="<name>"` on a slide draws a moving background behind its content; ambients come from themes (the
LED matrix `leds` from pixelpine, for example). A theme's own options are `<body>` attributes listed in its README.

## Themes

Themes live in [`themes/<name>/`](themes/README.md), one `theme.js` each. Link the ones you want **before**
`engine.js` and use their names like core ones; mix as many as you like. The [catalogue](themes/README.md#catalogue)
lists every transition, effect, ambient and dot style A–Z with the theme it comes from, plus every theme by tag.
New themes are welcome: [how to add one](themes/README.md#adding-a-theme).

## Steps inside a slide

A slide can step through its own content (zoom into parts of a schematic, reveal points one by one) before the deck
moves on. Every next / back input (keys, click, clicker, mouse side buttons, browser back / forward, swipe) is first
offered to the current slide as a cancelable `se:step` event with `detail.dir` = `1` or `-1`; call `preventDefault()`
to keep the slide and do your own step. The overview (wheel, G) still treats the slide as one. `se:enter` and
`se:leave` fire on a slide when it becomes / stops being the current one, which is the place to reset its steps or to
start and stop something heavy (a live iframe).

```js
const s = document.getElementById('schematic'); let step = 0;
s.addEventListener('se:step', e => { const n = step + e.detail.dir; if (n >= 0 && n <= 4) { e.preventDefault(); show(step = n); } });
s.addEventListener('se:enter', () => show(step = 0));
```

Add the listeners in an inline script at the end of `<body>` (it runs before the engine starts), not in `DOMContentLoaded`.

`data-click="off"` on a slide stops a left click on it from changing slides, for a slide whose content is used with
the mouse (an iframe of a live app, say). Keys, the clicker and the mouse side buttons still work. A click inside an
iframe never reaches the deck anyway; give the keyboard back with `iframe.blur()` when the page loses focus to it.

## Presenting

→ / space / Enter / PageDown / click / mouse forward button: next · ← / PageUp / click near the left edge / mouse
back button: back · Home / End · **scroll wheel** or **G**: slide overview ·
**F** full screen · **N** speaker notes · **T** timer on/off (**Shift+T** resets it) · **H** (or **?** / F1) shows all controls for a few seconds · **M** plain fades (if the PC can't keep up) · `#5` in the URL opens slide 5.
Pressing a key mid-transition skips to the end, so it never gets stuck. Right click does nothing (the browser menu is turned off). Clickers that send PageUp/PageDown work.

- **Timer:** the bottom-right corner shows the time since the first slide change (faint `0:00` until then), so you can
  open the deck early and it starts when you start talking. `data-timer="off"` on `<body>` hides it by default.
- **Slide overview (quick jump):** scroll the mouse wheel (or press G) and the current slide shrinks into a grid of
  all slides. Keep scrolling to move the highlight (one slide per wheel notch, down/right = later). Any *next* input
  (→, space, Enter, PageDown, clicker, mouse forward button) zooms into the highlighted slide; any *back* input
  (←, PageUp, mouse back button, Esc, or G again) returns to the slide you started from. Clicking a thumbnail opens
  that slide, clicking beside the thumbnails goes back. A slide opened this way appears fully built (no element
  animations); from there → continues normally. With many slides the grid scrolls. `data-wheel="off"` on `<body>`
  stops the wheel from opening it (G still works).
- **Mouse back/forward buttons:** depending on the mouse driver these arrive as mouse buttons, as Browser Back/Forward
  keys, or only as the browser's own back/forward. All three change slides; the browser's back/forward is caught
  through history entries the deck keeps around itself. Those entries are set up on your first key press or click
  (browsers ignore them otherwise), so **press a key or click once after opening the deck** (e.g. F for full screen)
  before relying on the side buttons.

## One portable file

```
python build.py path/to/deck.html -o talk.html
```

Inlines `engine.css`, `engine.js`, the linked themes and any other local stylesheet or script, and embeds every local image, video and
font as a data URI, so `talk.html` can be copied to a USB stick and opened anywhere (Firefox, Chrome, Edge). Google Fonts
links stay links: without internet the text falls back to the next font in your stack. `--link-media` keeps media as
relative paths instead (small file, but the media must travel with it). Rebuild after every change to the deck.

Works in current Firefox (what the author presents with), Chrome and Edge; Safari is untested. It needs a reasonably modern GPU for the 3D, blur and mask effects; on a weak
laptop press M.

## License

[MIT](LICENSE).
