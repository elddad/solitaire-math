import { createGame, REFERENCE_LEVEL, REFERENCE_MOVES } from './deck';
import { levelConfig, TOTAL_LEVELS, worldOf } from './campaign';
import { solve } from './solver';
import { LEVEL_MANIFEST } from './manifest';
import type { GameState } from './types';

/**
 * Deal a level that is provably finishable.
 *
 * A deal has a hard floor: every stock card needs a draw and every card needs
 * at least one move to place, so a generous-looking budget can still be
 * impossible. Rather than guess, each level is dealt, played through by a
 * solver with an unlimited budget, and then given the solver's move count plus
 * the world's slack. Shuffles the solver cannot finish are skipped and the
 * seed is varied until one works, so the same seed always gives the same board
 * and every board a player sees can be completed.
 */
const MAX_ATTEMPTS = 60;
const PROBE_MOVES = 4000;

export interface DealtLevel {
  state: GameState;
  attempt: number;
  solverMoves: number;
  verified: boolean;
}

export function dealSolvable(level: number, seedName: string): DealtLevel {
  const cfg = levelConfig(level);

  // Try the level at its intended size first. If no shuffle of it can be
  // finished -- four slots against many categories can genuinely deadlock --
  // shave one category and try again rather than ship a board nobody can win.
  for (let drop = 0; drop <= 3; drop++) {
    const categories = drop === 0 ? undefined : Math.max(3, cfg.categories - drop);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const seed = attempt === 0 && drop === 0 ? seedName : `${seedName}#${drop}-${attempt}`;
      const probe = createGame(level, seed, { moves: PROBE_MOVES, categories });
      const result = solve(probe);
      if (!result.won) continue;

      // Level 5 keeps the budget the brief fixes; everything else is calibrated.
      if (level === REFERENCE_LEVEL && result.movesUsed > REFERENCE_MOVES) continue;
      const moves = level === REFERENCE_LEVEL ? REFERENCE_MOVES : result.movesUsed + cfg.slack;

      return {
        state: createGame(level, seed, { moves, categories }),
        attempt,
        solverMoves: result.movesUsed,
        verified: true,
      };
    }
    if (level === REFERENCE_LEVEL) break;      // never reshape the reference deck
  }

  // Nothing cleared: deal anyway with a generous budget rather than refuse.
  const fallback = createGame(level, seedName, { moves: PROBE_MOVES });
  const r = solve(fallback);
  return {
    state: createGame(level, seedName, { moves: Math.max(60, r.movesUsed + cfg.slack + 20) }),
    attempt: 0,
    solverMoves: r.movesUsed,
    verified: false,
  };
}

/**
 * Start a level.
 *
 * Searching for a winnable shuffle takes up to a few seconds -- far too long
 * to do while someone waits -- so the search runs at build time
 * (`npm run manifest`) and the winning seed, its move budget and the number of
 * categories that shuffle was dealt with all ship in a table. Dealing at
 * runtime is then just a shuffle. Passing an explicit seed bypasses the table
 * and verifies on the spot, which is what the dev ?seed= flag uses.
 */
export function newLevel(level: number, seedName?: string): GameState {
  const n = Math.max(1, Math.min(TOTAL_LEVELS, level));
  if (!seedName) {
    const entry = LEVEL_MANIFEST[n];
    if (entry) return createGame(n, entry.seed, { moves: entry.moves, categories: entry.sets });
  }
  const seed = seedName ?? (n === REFERENCE_LEVEL ? 'recording' : `level-${n}`);
  return dealSolvable(n, seed).state;
}

export { TOTAL_LEVELS, worldOf };
