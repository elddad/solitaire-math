import type { Destination, GameState, Source } from './types';
import { reducer } from './engine';
import { availableSources, checkMove, movableCount } from './rules';

interface Candidate { source: Source; destination: Destination; score: number }

/**
 * A heuristic player used to prove a deal is finishable inside its move budget.
 * Not part of the shipped game -- only the tests use it.
 *
 * The economics it plays to: every stock card costs one draw whatever happens,
 * and every card costs one move to place. Parking a card on a matching pile
 * only pays off because the whole pile then lands in a single move, so parking
 * a group costs +1 move total rather than +1 per card.
 */
export function solve(start: GameState, maxSteps = 6000) {
  let state = start;
  let steps = 0;
  let restores = 0;
  let draws = 0;
  let deposits = 0;

  while (state.phase === 'playing' && steps++ < maxSteps) {
    const done = state.foundations.findIndex((f) => f.completing);
    if (done >= 0) { state = reducer(state, { type: 'finishFoundation', slot: done }); continue; }

    const best = pick(state);
    if (best) {
      if (best.destination.to === 'foundation' && state.foundations[best.destination.slot].card) deposits++;
      state = reducer(state, { type: 'move', source: best.source, destination: best.destination });
      continue;
    }
    if (state.stock.length) { state = reducer(state, { type: 'draw' }); draws++; continue; }
    if (state.waste.length > 1) { state = reducer(state, { type: 'restore' }); restores++; continue; }
    break;
  }

  return {
    won: state.phase === 'won',
    phase: state.phase,
    movesUsed: state.movesMax - state.moves,
    movesLeft: state.moves,
    draws, deposits, restores,
    cardsLeft:
      state.columns.reduce((n, c) => n + c.cards.length, 0) + state.stock.length + state.waste.length,
    openSets: state.foundations.filter((f) => f.card).map((f) => `${f.value}:${f.progress}/${f.quota}`),
    state,
  };
}

/** How many cards of a value are sitting exposed on the board right now. */
function visibleOf(state: GameState, value: number): number {
  let n = 0;
  for (let col = 0; col < state.columns.length; col++) {
    const column = state.columns[col];
    const top = column.cards[column.cards.length - 1];
    if (top && top.kind === 'equation' && top.value === value) n += movableCount(state, col);
  }
  if (state.waste[0]?.kind === 'equation' && state.waste[0].value === value) n += 1;
  return n;
}

/** Does lifting this source uncover a face-down card, or empty a column? */
function uncovers(state: GameState, source: Source): boolean {
  if (source.from !== 'column') return false;
  const column = state.columns[source.col];
  return column.cards.length - source.count === column.downCount && column.downCount > 0;
}

function pick(state: GameState): Candidate | null {
  const out: Candidate[] = [];
  const emptyColumns = state.columns.filter((c) => c.cards.length === 0).length;

  for (const source of availableSources(state)) {
    const size = source.from === 'waste' ? 1 : source.count;
    const card = source.from === 'waste'
      ? state.waste[0]
      : state.columns[source.col].cards[state.columns[source.col].cards.length - 1];
    if (!card) continue;
    const frees = uncovers(state, source);

    for (let slot = 0; slot < state.foundations.length; slot++) {
      const destination: Destination = { to: 'foundation', slot };
      if (!checkMove(state, source, destination).ok) continue;
      const f = state.foundations[slot];
      if (f.card) {
        // A deposit always pays: it is one move for the whole group and it is
        // the only thing that ever frees a foundation slot.
        let score = 1000 + size * 25;
        if (f.progress + size === f.quota) score += 400;    // finishing frees the slot
        if (frees) score += 60;
        out.push({ source, destination, score });
      } else {
        // Seat the category whose cards are most ready to follow it in.
        const ready = visibleOf(state, card.value);
        const quota = card.quota ?? 0;
        out.push({ source, destination, score: 700 + ready * 45 - quota * 8 });
      }
    }

    for (let col = 0; col < state.columns.length; col++) {
      const destination: Destination = { to: 'column', col };
      if (!checkMove(state, source, destination).ok) continue;
      const target = state.columns[col];

      if (target.cards.length === 0) {
        if (card.kind === 'category') {
          // park a gold card only when no slot is free; it costs a second move later
          out.push({ source, destination, score: emptyColumns > 1 ? 240 : 60 });
        } else if (frees) {
          out.push({ source, destination, score: 150 });
        } else {
          out.push({ source, destination, score: 5 });
        }
        continue;
      }

      // Merge onto a matching pile. Cheap, and keeps the value in one place.
      let score = 500 + size * 12;
      if (frees) score += 120;
      if (source.from === 'waste') score += 40;          // gets the waste moving again
      out.push({ source, destination, score });
    }
  }

  if (!out.length) return null;
  out.sort((a, b) => b.score - a.score);
  return out[0].score > 20 ? out[0] : null;
}
