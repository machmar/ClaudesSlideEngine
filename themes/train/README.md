# train theme

A toy steam train for decks about anything that moves: the old slide leaves as a wagon pulled by a small loco,
clouds of steam roll over the screen, the view rides through a tunnel, level-crossing barriers swing down, cards roll
in on wheels and numbers come out of a puff of steam. Made for the talk about Nudgy, a toy locomotive with a small
neural network on a 0,11 $ microcontroller.

Demo: [Nudgy-demo](../../demo/Nudgy-demo/deck.html) (Czech; its two live-app slides need the project's local
simulator, so online they stay on their "connecting" screen) and the train slides of the
[showcase](../../demo/showcase/deck.html).

```html
<script src="themes/train/theme.js" defer></script>   <!-- before engine.js -->
```

| name | kind | what it does |
|---|---|---|
| `train` | transition | the old slide shrinks into a wagon on a rail and a loco pulls it away; the new slide arrives behind the loco, which uncouples and leaves |
| `track` | transition | the view zooms out to the slides standing as wagons on a rail, the train moves on by one wagon, the view zooms back in |
| `steam` | transition | a cloud of steam rolls over the screen from below and clears upwards |
| `tunnel` | transition | ride into a stone tunnel mouth, past the lamps inside, and out through the exit onto the new slide |
| `barrier` | transition | six level-crossing barriers swing down with blinking lamps and lift again |
| `tow` | effect | a small loco pulls a heading in from the left, uncouples and drives off |
| `wagon` | effect | a card rolls in on two wheels, which fold away when it stops |
| `puff` | effect | big text or a number appears out of a puff of steam and counts up; inside a `wagon` card it waits until the card has arrived |
| `depart` | effect | for a picture of a loco: it backs in from the right, and every 14 s drives off and backs in again, with steam from `data-chimney="x,y"` (the chimney as fractions of the picture, default `.7,.2`) |
| `trains` | ambient | little steam trains drive along two tracks at the bottom of the slide |
| `track` | dots | `data-dots="track"` on `<body>` (or on the slides of a section): the progress dots become a rail with a stop per slide and a small loco at the current one |

Options on `<body>`: `data-train="body,chassis,wheels"`, the loco and wagon colours (default
`#c8402a,#2a5aa0,#1e1e22`).

How it's built: one SVG drawing of the loco, a wagon and a bogie (wheel pair) shared by everything, and a small steam
particle system drawn on canvas. `train` and `track` move the slides themselves through a "world" with a camera; the
effects sample one motion function into keyframes (`se.sampled`) so the loco, the coupling bar and the wheels follow the
element exactly.
