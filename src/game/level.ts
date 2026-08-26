import { createGame } from './deck';
import { solve } from './solver';
import type { GameState } from './types';

/**
 * A 64-card deal has a floor of 42 draws plus 64 one-move placements, so the
 * 125-move budget leaves only about 19 spare moves. Plenty of shuffles cannot
 * be finished inside it. Rather than loosen the budget, the level searches
 * shuffle variants of its own seed and keeps the first one a solver can win --
 * a board a solver clears has margin for a person. Same seed, same board.
 */
const MAX_ATTEMPTS = 60;
const COMFORTABLE = 8;      // moves to spare before we stop looking

export interface DealtLevel {
  state: GameState;
  attempt: number;
  movesToSpare: number;
  verified: boolean;
}

export function dealSolvable(seedName: string): DealtLevel {
  let best: DealtLevel | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const state = createGame(attempt === 0 ? seedName : `${seedName}#${attempt}`);
    const result = solve(state);
    if (!result.won) continue;
    const candidate = { state, attempt, movesToSpare: result.movesLeft, verified: true };
    if (!best || candidate.movesToSpare > best.movesToSpare) best = candidate;
    if (candidate.movesToSpare >= COMFORTABLE) return candidate;
  }

  // Nothing cleared: hand back the plain deal rather than refusing to play.
  return best ?? { state: createGame(seedName), attempt: 0, movesToSpare: 0, verified: false };
}

export function newLevel(seedName: string): GameState {
  return dealSolvable(seedName).state;
}
