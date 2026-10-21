# Default presentation style

The look and tone every deck gets unless the user asks for something else. It comes from the repo author's own talks
(technical school projects shown on a projector), so it suits technical talks best. Follow it and a deck should need few
rounds of changes. Workflow: `CLAUDE.md`; technical reference: `README.md`; worked example: `demo/PixelPine-demo/deck.html`.

## Format

- **Animated HTML deck with this engine**, built into one file with `build.py`. A different `data-enter`
  transition on every slide and the automatic element builds; heavy animation is wanted, not a problem.
- Text and speaker notes in **the user's language** (the author's school talks are in Czech). `<aside>` notes on every
  slide, ~30–60 s of spoken text each, neutral full sentences.
- Length: about **1 slide per 30 s**. A 5-minute talk = 8–11 slides. Ask how long the talk is if the user didn't say.
- Every slide has a picture, clip or diagram where possible: real project material (renders, schematic crops,
  simulator clips, screenshots), never invented images or statistics.

## Tone and content

- **Neutral, technical, factual.** No cute or playful voice, no marketing slogans, no "friendly" wording.
- Cover what a technical audience grades: what the product is, how it works, the hardware (board, **schematic**,
  **BOM**), any clever engineering trick (and how it was solved, e.g. the script that optimised something),
  power/firmware figures, **cost and pricing**, then a short closing slide.
- One idea per slide; headline numbers big (they count up), details in the notes, not on the slide.

## Look (it's shown on a projector)

- Readable from the back of the room: **only three text sizes — 64 px headings, 40 px body, 32 px labels**
  (the title slide may have one bigger title, ~128 px).
- **Not too dense, not empty**: 3–4 short points or one table/diagram per slide.
- Light, warm background for content slides (`#F5F0E6`, dark text `#16271F`), dark slides only for title and
  closing (`#13221B` + an ambient background from a theme, e.g. `data-ambient="leds"` from pixelpine), one
  accent-coloured statement slide (e.g. prices on `#FFC47D`).
- Every deck gets its own theme built from the project's subject (CLAUDE.md, step 4), mixed with existing themes
  where they fit. With no theme the core look is neutral.
- Before designing a slide, check `RECIPES.md` for how that kind of content was shown before.
- Fonts: Fredoka for headings, Nunito Sans for text (or a pair that fits the project).
- Accent colour = the project's own colour if it has one (`data-accent`).

## Practicalities

- Presented from a PC with a mouse or clicker: keys, side buttons and the wheel all work; F for full screen.
- Keep project files tidy: everything for the talk goes in `<project>/presentation/` (source `deck.html`,
  `media/`, `video/`, built file). That folder is usually git-ignored (big videos).
- If the user asks for PowerPoint too: the engine can't export to .pptx; build that separately and say so.
- Show the user the built deck when done; feedback tends to be short ("slide 4 is broken", "add the BOM"): fix exactly that.
- Don't use the `glitch` transition unless asked (the author dislikes it).

## Quick start for a new project

1. Copy `demo/showcase/deck.html` (English, shared CSS classes) or `demo/PixelPine-demo/deck.html` (inline styles)
   to `<project>/presentation/deck.html`, fix the relative paths to `engine.css` / `engine.js`, and replace the
   slides (keep the section styles, sizes and colours above).
2. Collect media into `presentation/media/` (PNG) and `presentation/video/` (MP4, H.264).
3. `python <path-to-engine>/build.py deck.html -o <Name>.html`, open it, run `tools/check-deck.js`, press → through every slide.
