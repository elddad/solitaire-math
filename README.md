# Math Category Solitaire

A solitaire-style arithmetic sorting game. Every white card is an expression, and
its **answer is its category**: `16-2` and `7+7` are both category **14**; `2X4`
and `8X1` are both **8**; `18/2` and `3X3` are both **9**.

Uncover gold category cards, seat them in the four foundation slots, then fill
each one with the number of matching cards its quota demands.

It is not Klondike. There are no suits, no colours, no ascending runs.

```
foundations   [ 14  3/6 ]  [ 8  0/8 ]  [    ]  [    ]

tableau        16-2         7+7         2X4     18/2
               ^ tap to select, tap a destination to place
```

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `?level=n` jumps to any level and
`?seed=anything` deals a different shuffle of it; level 5 with its default seed
reproduces the reference layout exactly.

```bash
npm run accept       # the 16-section acceptance test for the reference level
npm run progression  # unlocking, stars, and the difficulty curve
npm run verify       # replay all 500 levels from the shipped manifest
npm run campaign     # deal and solve every level from scratch (slow)
npm run manifest     # regenerate the verified level table (~2 min)
npm run build        # production build into docs/
```

## How it plays

| | |
|---|---|
| **Select** | Tap a card or a matched group. It gets a yellow-green outline. Tap it again to let go. |
| **Place** | Tap a destination. An illegal move shakes, explains itself, and costs nothing. |
| **Stack** | A card goes on any exposed card with the same answer. Same-answer runs move as one unit for one move. |
| **Foundations** | Only a gold category card opens a slot. After that it takes matching cards until its quota is full, then clears itself and frees the slot. |
| **Stock** | Tap to turn a card over. When it empties, `RESTORE STOCK` recycles the waste so the level stays solvable. |
| **Joker** | Fills one gap in any open set. Three of them, and they cost no move. |
| **Boosters** | Hint, Undo, Magnet (sweep every exposed card that can go home), Calculator (show answers for five seconds). Three each. |

Every successful action costs one move. Level 5 gives 125 moves and 25 minutes.

## 500 levels

Ten worlds of fifty, and every knob turns one way:

| Levels | World | Maths | Cards | Sets |
|---|---|---|---|---|
| 1-50 | First Sums | `+` `-` to 12 | ~20 | 5 |
| 51-100 | Bigger Sums | `+` `-` to 18 | ~24 | 6 |
| 101-150 | Times Tables | `X` joins in | ~24 | 6 |
| 151-200 | Sharing Out | `/` joins in | ~35 | 7 |
| 201-250 | All Four | every operation | ~35 | 7 |
| 251-300 | Deep Deal | deeper columns | ~40 | 8 |
| 301-350 | Crowded Table | nine sets, four slots | ~50 | 9 |
| 351-400 | Big Numbers | operands to 99 | ~65 | 10 |
| 401-450 | Under Pressure | less clock, less slack | ~70 | 10 |
| 451-500 | Number Master | everything at once | ~77 | 11 |

Level 1 deals 20 cards, 5 sets and 30 spare moves. Level 500 deals 77 cards,
11 sets and 9 spare moves. Sets also grow: three cards each early, up to seven
late, so a single set can occupy a slot for a long stretch while the other
categories pile up behind it.

Level 5 is left exactly as the brief specifies: the hand-authored 64-card
reference deck, 125 moves, 25:00 - so the acceptance test keeps its meaning.

## Every level is verified winnable

A deal has a hard floor: every stock card needs a draw and every card needs at
least one move to place. A budget that looks generous can still be impossible,
and with only four foundation slots against ten or more categories a board can
deadlock outright. Measured on the reference level, only **16 of 30 random
shuffles** could be finished inside 125 moves.

So no shuffle is trusted. `npm run manifest` deals each level, plays it through
with a solver, and keeps the first shuffle the solver can finish - shaving a
category if a level cannot be made winnable at its intended size. The winning
seed, its move budget and its category count ship in `src/game/manifest.ts`.

That search costs about two minutes for the campaign, which is why it happens
at build time: starting a level at runtime is then just a shuffle, **0.1 ms on
average and under 1 ms at worst**.

`npm run verify` replays all 500 levels straight from the shipped manifest:
**500/500 winnable, 0 equation errors**, averaging 18 spare moves.

## Cheats menu

For testing and for skipping ahead. Open it three ways:

* **Menu → CHEATS**
* **Tap the LEVEL label**
* **`?cheats=1` in the URL**

| | |
|---|---|
| **Jump** | Type any level 1-500 and go straight to it (unlocks everything on the way) |
| **Unlock all 500** | Every level playable |
| **3 stars on all** | Fills the level map |
| **+10,000 coins / Refill lives** | Top up the meta-game |
| **+50 moves / +5 minutes** | Extend the current level |
| **Max boosters** | Nine of each, joker included |
| **Win this level** | Ends it as a win, awarding stars and unlocking the next |
| **X-ray cards** | Draws face-down cards face up. Purely visual - the rules still treat them as hidden |
| **Ad banner** | Toggle the placeholder without editing the config |
| **Reset progress** | Back to a fresh save on level 1 |

## Layout

The whole interface is laid out on a fixed **1320 × 2868** reference canvas -
the recording's own portrait resolution - and scaled with a single transform to
fit the screen, capped at 520 CSS px wide. Every coordinate in `src/layout.ts`
is a reference pixel, so the design cannot drift as it scales. The four columns
never reflow into rows, and the page never scrolls during play.

## Code map

```
src/game/types.ts     Card, Column, Foundation, GameState
src/game/rng.ts       seeded shuffle
src/game/deck.ts      the level 5 deck, the equation pool, the deal
src/game/rules.ts     group detection and every move validation
src/game/engine.ts    the reducer: one action in, new state out
src/game/solver.ts    heuristic player used to verify a deal (not shipped logic)
src/game/campaign.ts  the 500-level difficulty curve
src/game/expressions.ts  procedural equation cards per world
src/game/manifest.ts  GENERATED: the verified seed for every level
src/game/level.ts     deal a level from the manifest, or verify one on the spot
src/game/progress.ts  unlocked levels, stars and coins in localStorage
src/layout.ts         every reference-canvas coordinate
src/components/       Hud, Board, Boosters, Overlays, LevelSelect, Cheats, Card, Icons
src/test/acceptance.ts  the acceptance test
```

State is a single serializable object, so undo is a snapshot stack and the whole
board can be dropped into JSON.

## Deploying

The build writes to `docs/`, and GitHub Pages serves `main` → `/docs`. Push and
it republishes:

```bash
npm run build
git add -A && git commit -m "..." && git push
```

## Notes

* All artwork - coins, hearts, joker, boosters, card backs - is original CSS and
  inline SVG. No emoji are used as game icons.
* The banner region is a neutral `Ad placeholder`. Set `SHOW_AD = false` in
  `src/layout.ts` to remove it; the layout stays aligned either way.
