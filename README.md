# Solitaire Math

Solitaire played with equations. The pile shows a number; every board card shows a sum.
Work out a card's answer and, if it equals the number on the pile, stack it there — the
card flips to its answer, and that answer becomes the number to match next.

**600 levels**, every one guaranteed solvable. No build step, no dependencies, no assets:
plain HTML, CSS and JavaScript that runs straight from GitHub Pages.

```
board:   [3×3]  [12−4]  [4+5]  [2×7]        pile: ( 9 )
                                            tap 3×3 → it lands as 9
```

## Play it

Open `index.html` in a browser — that is genuinely all it needs. To serve it locally:

```bash
node serve.js
```

Then visit http://localhost:5173.

## Put it on GitHub Pages

```bash
git init
git add .
git commit -m "Solitaire Math"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder
`/ (root)`. The included `.nojekyll` stops Jekyll from touching the files. Nothing has to
build, so the site is live a minute later at `https://<you>.github.io/<repo>/`, and every
push to `main` republishes it.

## How the game works

| | |
|---|---|
| **Free cards** | A card can only be played when nothing lies on top of it. Covered cards are dimmed but still readable, so you can plan ahead. |
| **The pile** | Shows the number to match. Stack a card whose answer equals it. |
| **The stock** | Tap it for a new pile number when nothing on the board matches. It resets your combo, so draw only when you have to. |
| **Gold cards** | Wild. Play one on any number, and play any number on it. |
| **Combo** | Each card played without drawing is worth more, up to 800. Every unused stock card pays 150 when you clear the board. |
| **Stars** | One for clearing it, three for beating par. Par is set from the level's own built-in solution, so it is always reachable. |
| **Undo** | Unlimited and free. Lose three times and the level offers a skip. |

Keyboard: `space` draw · `u` undo · `h` hint · `r` restart · `esc` back.

## The twelve worlds

| Levels | World | Maths |
|---|---|---|
| 1–50 | Addition | `a + b` |
| 51–100 | Subtraction | `a − b` |
| 101–150 | Plus & Minus | both |
| 151–200 | Times Tables | `a × b` |
| 201–250 | Division | `a ÷ b` |
| 251–300 | Times & Share | `×` and `÷` |
| 301–350 | All Four | every operation |
| 351–400 | Big Numbers | two-digit sums |
| 401–450 | Two Steps | `a + b − c` |
| 451–500 | Mixed Steps | `a × b + c` |
| 501–550 | Number Master | everything, mixed |
| 551–600 | Grand Master | no mercy |

## How the levels are built

Levels are not stored — each one is generated from its number by a seeded RNG, so level 437
is the same board for everyone, on every device, from about 40 KB of code.

Generation runs **backwards from a solution**. It picks a legal order to clear the board,
walks that order assigning each card a value, and inserts a stock draw or a gold card
whenever the target number changes. Because the sequence is built before the numbers are,
a winning line always exists — there are no unsolvable deals. `js/levels.js` also records
that line, which is what the three-star par is measured against.

Difficulty is tuned rather than guessed. `js/layouts.js` measures how many cards each board
shape leaves free at once (1.6 for the deep `Cross`, 5.1 for the flat `Long Rows`), and the
level tuning reads that number: a board that frees fewer cards uses fewer distinct numbers,
so a drawn number is still likely to have a match. The stock sizes in `SPARE` were
calibrated by running a greedy bot over all 600 levels until each world hit its intended
win rate — from ~100% in Addition down to ~72% in Grand Master, before undo and hints.

## Layout of the code

```
index.html        markup for the three screens
css/style.css     everything visual
js/rng.js         seeded RNG -- levels are reproducible from their number
js/layouts.js     board shapes as ASCII art, plus the free-card metric
js/math.js        equation builders and the answer-matching rule
js/levels.js      world tuning and the backwards level generator
js/game.js        game state: free cards, play, draw, undo, scoring
js/storage.js     progress in localStorage
js/audio.js       WebAudio blips, no sound files
js/ui.js          rendering, input, animation, overlays
serve.js          optional local static server
```

There is no framework and no build. Editing a file and reloading is the whole loop.
