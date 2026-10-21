# pixelpine theme

The LED look of the [PixelPine](https://github.com/machmar/pixelpine) talk (a PCB Christmas tree with 240 LEDs):
glowing LEDs in the deck's accent colour sweep over the screen, cover it and switch off to reveal the next slide.

Demo: [PixelPine-demo](../../demo/PixelPine-demo/deck.html) (Czech) and the
[showcase](../../demo/showcase/deck.html).

```html
<script src="themes/pixelpine/theme.js" defer></script>   <!-- before engine.js -->
```

| name | kind | what it does |
|---|---|---|
| `led-radial` | transition | LEDs spread from a focus point (`data-focus="x,y"` on the slide, else the outgoing slide's first picture), cover the screen, then switch off |
| `led-rain` | transition | the same, falling like rain |
| `led-spiral` | transition | the same, sweeping in a spiral |
| `led-diagonal` | transition | the same, across the diagonal |
| `leds` | ambient | a faint LED matrix with a slow wave and twinkles behind the slide (`data-ambient="leds"`), good on dark title slides |
| `led-dots` | dots | `data-dots="led-dots"` on `<body>` (or on the slides of a section): the progress dots glow like LEDs, the current one brightest |

Options on `<body>`: `data-led-bg` = the colour the LEDs fill the screen with (default `#0b130f`). The LEDs and the LED
dots glow in the accent colour: `data-accent` on `<body>`, or on the slides of a section (the PixelPine talk and the
showcase's pixelpine section use `#ffc47d`).
