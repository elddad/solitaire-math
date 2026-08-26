import type { Card, Destination, GameState, Source } from './types';

export const TOAST_SAME_CATEGORY = 'You can only stack cards of the same category.';
export const TOAST_ONLY_CATEGORY = 'You can only put category cards here.';
export const TOAST_OVER_CATEGORY = "You can't put a card over a category card.";
export const TOAST_CATEGORY_HOME = 'A category card only goes to an empty column or foundation.';
export const TOAST_FULL = 'That set does not need any more cards.';

/**
 * How many cards can be lifted off the end of a column as one unit.
 *
 * A gold category card always travels alone. Equation cards travel as the
 * longest run of face-up cards that all share the same answer, so a stack the
 * player has already built moves in a single move.
 */
export function movableCount(state: GameState, col: number): number {
  const column = state.columns[col];
  const n = column.cards.length;
  if (n === 0) return 0;
  const last = column.cards[n - 1];
  if (n - 1 < column.downCount) return 0;          // still face down
  if (last.kind === 'category') return 1;

  let count = 1;
  for (let i = n - 2; i >= column.downCount; i--) {
    const card = column.cards[i];
    if (card.kind !== 'equation' || card.value !== last.value) break;
    count++;
  }
  return count;
}

/** The cards a source refers to, in bottom-to-top order. */
export function sourceCards(state: GameState, source: Source): Card[] {
  if (source.from === 'waste') {
    return state.waste.length ? [state.waste[0]] : [];
  }
  const column = state.columns[source.col];
  return column.cards.slice(column.cards.length - source.count);
}

export function isSourceLegal(state: GameState, source: Source): boolean {
  if (source.from === 'waste') return state.waste.length > 0;
  const max = movableCount(state, source.col);
  return source.count > 0 && source.count <= max;
}

export interface MoveCheck {
  ok: boolean;
  toast?: string;
}

/** Validate a move without applying it. Invalid moves never cost a move. */
export function checkMove(state: GameState, source: Source, destination: Destination): MoveCheck {
  if (state.phase !== 'playing' || state.locked) return { ok: false };
  if (!isSourceLegal(state, source)) return { ok: false };

  const cards = sourceCards(state, source);
  if (!cards.length) return { ok: false };
  const head = cards[0];
  const movingCategory = head.kind === 'category';

  if (destination.to === 'column') {
    const column = state.columns[destination.col];
    if (source.from === 'column' && source.col === destination.col) return { ok: false };

    if (column.cards.length === 0) return { ok: true };            // rules 3 and 4

    const top = column.cards[column.cards.length - 1];
    if (column.cards.length - 1 < column.downCount) return { ok: false };
    if (top.kind === 'category') return { ok: false, toast: TOAST_OVER_CATEGORY };   // rule 10
    if (movingCategory) return { ok: false, toast: TOAST_CATEGORY_HOME };            // rule 4
    if (top.value !== head.value) return { ok: false, toast: TOAST_SAME_CATEGORY };  // rules 1 and 2
    return { ok: true };
  }

  const foundation = state.foundations[destination.slot];
  if (foundation.completing) return { ok: false };

  if (!foundation.card) {
    // rule 11: an empty foundation only takes a gold category card
    if (!movingCategory) return { ok: false, toast: TOAST_ONLY_CATEGORY };
    return { ok: true };                                            // rule 5
  }

  // rule 12: a category card never lands on another category card
  if (movingCategory) return { ok: false, toast: TOAST_CATEGORY_HOME };
  if (head.value !== foundation.value) return { ok: false, toast: TOAST_SAME_CATEGORY };  // rule 6
  if (foundation.progress + cards.length > foundation.quota) return { ok: false, toast: TOAST_FULL }; // rule 9
  return { ok: true };
}

/** Every legal destination for a source, used by hint and magnet. */
export function destinationsFor(state: GameState, source: Source): Destination[] {
  const out: Destination[] = [];
  for (let slot = 0; slot < state.foundations.length; slot++) {
    if (checkMove(state, source, { to: 'foundation', slot }).ok) out.push({ to: 'foundation', slot });
  }
  for (let col = 0; col < state.columns.length; col++) {
    if (checkMove(state, source, { to: 'column', col }).ok) out.push({ to: 'column', col });
  }
  return out;
}

/** All sources the player could currently pick up. */
export function availableSources(state: GameState): Source[] {
  const out: Source[] = [];
  if (state.waste.length) out.push({ from: 'waste' });
  for (let col = 0; col < state.columns.length; col++) {
    const max = movableCount(state, col);
    for (let count = 1; count <= max; count++) out.push({ from: 'column', col, count });
  }
  return out;
}
