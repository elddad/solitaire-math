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

Then open http://localhost:5173. `?seed=anything` deals a different board;
the default `recording` seed reproduces the reference layout exactly.

```bash
npm run accept     # the full 16-section acceptance test
npm run build      # production build into docs/
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

## The move budget is the real puzzle

A 64-card deal has a hard floor: 42 stock cards each need a draw, and all 64
cards need at least one move to place. That is **106 moves before a single card
is re-handled**, against a budget of 125. Only about 19 moves of slack exist for
parking cards and reopening the stock.

That makes many shuffles genuinely unwinnable. Measured over 30 random shuffles,
only **16 could be finished** inside 125 moves.

So the level does not trust a shuffle. `src/game/level.ts` deals, runs a solver
over the result, and keeps the first shuffle the solver can finish — searching
variants of the seed until it finds one with moves to spare. Same seed, same
board, every time, and **every board that reaches a player is provably
winnable** (30/30 after the search, averaging 15 moves to spare). The reference
deal is cleared in 111 of its 125 moves.

The pinned cards from the brief survive the search: the exposed row is always
`16-2 / 7+7 / 2X4 / 18/2`, the gold category-15 card always sits directly under
`16-2`, and the stock always starts `8X1`, gold-10, `15-3`.

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
src/game/level.ts     deal, verify, retry until the board is winnable
src/layout.ts         every reference-canvas coordinate
src/components/       Hud, Board, Boosters, Overlays, Card, Icons
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
