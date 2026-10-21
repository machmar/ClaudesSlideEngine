# Recipes: how each kind of slide was solved

A list of solutions that already exist, so the next deck doesn't reinvent them. **Before designing a slide, look
here** for the kind of content you need to show. **After finishing a deck, add every new solution** (a new layout, a
trick for a kind of information, an interaction): one row each, with the deck and slide where it was done. Improve a
row when you find a better way. Rows are short; the deck itself is the full example to copy from.

Slide links point at the deck source; open the deck and press the slide number (or add `#n` to its URL).
Decks: [showcase](demo/showcase/deck.html) · [PixelPine](demo/PixelPine-demo/deck.html) (slide ids in Czech deck).

## Opening, structure, closing

| need | solution | where |
|---|---|---|
| Title slide | Dark slide, kicker (32 px, uppercase, accent) + one 128 px `h1` + one 40 px line; an ambient background from a theme; the product's best clip or render on the right half (`flex-direction:row`) | PixelPine `#cover`, showcase 1 |
| Closing slide | Same layout as the title: "thank you" in 96 px, contact line, one looping clip; same ambient as the title so the talk ends where it started | PixelPine `#end` |
| Section divider | Dark slide like the title: kicker naming the section, one big line, one sentence; a different transition marks the change of part | showcase 14 (theme section) |
| Statement / money slide that must stand out | The one slide in the accent colour (whole background), cards in a lighter tint of it | PixelPine `#market`, showcase 10 |

## Numbers and money

| need | solution | where |
|---|---|---|
| A few headline numbers (KPIs) | 2×2 grid (`display:grid; grid-template-columns:1fr 1fr`) or a row of cards; in each card a 64 px number + a 40 px or 32 px explanation. The numbers count up by themselves | PixelPine `#power`, showcase 3 |
| Before → after | One 64 px line `480 → 141`: counts up to the first number, then down to the second | PixelPine `#routing`, showcase 3 |
| Cost at several batch sizes | Table: rows = cost items, columns = batch sizes, numbers right-aligned (they count up), a total row with its own background (`<tr style="background:…">`), one sentence on the biggest cost below | PixelPine `#cost`, showcase 5 |
| Prices per sales channel | Accent slide, one card per channel: 32 px uppercase channel label, 64 px price, 40 px margin line; a 32 px footnote for the basis (VAT, batch size) | PixelPine `#market` |
| Bill of materials | Table of the 5–8 most expensive lines (part, qty, price), the rest summed in one row; the cost driver named in a sentence | PixelPine `#bom` |

## Hardware, pictures and clips

| need | solution | where |
|---|---|---|
| Product render | Transparent PNG, large, `data-fx="spin3d"`, text column beside it | PixelPine `#board`, showcase 4 |
| Schematic | Crop of the one block that matters (not the whole sheet) as PNG, `data-fx="scan"`, 2–3 short labels | PixelPine `#schematic` |
| Result of an optimisation / algorithm | The result picture with `data-fx="radial"` on one side; the before → after number and 3 numbered steps of how it was done on the other | PixelPine `#routing` |
| What the product does (animations, modes) | A row of 2–3 short clips (`<img data-video>` with a still as poster, `data-fx="tilt"`), each with a one-line caption | PixelPine `#product`, `#personality` |
| One clip as the hero | `data-fx="power"`: it switches on like a screen | PixelPine `#cover`, showcase 7 |

## Text, code and lists

| need | solution | where |
|---|---|---|
| 3 short points | `ul` (items come in one by one); never more than 4 | showcase 2, 12 |
| How something works, step by step | `ol` with 3 items at 32 px beside a picture | PixelPine `#routing` |
| Code or markup | `<pre>` on a dark box, the important part in `<b>` coloured with the accent; beside 3 bullet points | showcase 2, 9 |
| Keyboard keys / controls | Table with `<kbd>` keys in the left column | showcase 10 |
| A set of names or options | Grid of small cards (`display:grid; grid-template-columns:repeat(4,1fr)`) | showcase 8 |
| Showing several effects at once | Row of coloured tiles, each tile with its own `data-fx` and its name in it | showcase 6 |
