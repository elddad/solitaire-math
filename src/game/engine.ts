import type { Card, Destination, GameState, Source } from './types';
import {
  availableSources, checkMove, destinationsFor, movableCount, sourceCards,
} from './rules';

export type Action =
  | { type: 'select'; source: Source | null }
  | { type: 'move'; source: Source; destination: Destination }
  | { type: 'draw' }
  | { type: 'restore' }
  | { type: 'joker'; slot: number }
  | { type: 'hint' }
  | { type: 'undo' }
  | { type: 'magnet' }
  | { type: 'calculator' }
  | { type: 'clearCalculator' }
  | { type: 'clearHint' }
  | { type: 'tick' }
  | { type: 'finishFoundation'; slot: number }
  | { type: 'unlock' }
  /** Swap in a freshly dealt level. Built outside the reducer so the engine
      does not have to depend on the level dealer, which depends on the solver,
      which depends on the engine. */
  | { type: 'replace'; state: GameState };

let toastId = 0;

function toast(state: GameState, text: string): GameState {
  return { ...state, toast: { id: ++toastId, text } };
}

/** Snapshot everything except the history itself, so undo cannot nest. */
function snapshot(state: GameState): string {
  const copy: Partial<GameState> = { ...state };
  delete copy.history;
  delete copy.toast;
  delete copy.hint;
  return JSON.stringify(copy);
}

function pushHistory(state: GameState): string[] {
  return [...state.history, snapshot(state)].slice(-60);
}

/** Turn over the newly exposed card of a column, if it is face down. */
function flipIfNeeded(state: GameState, col: number): void {
  const column = state.columns[col];
  if (column.cards.length === 0) { column.downCount = 0; return; }
  if (column.downCount >= column.cards.length) column.downCount = column.cards.length - 1;
}

function clone(state: GameState): GameState {
  return {
    ...state,
    columns: state.columns.map((c) => ({ cards: c.cards.slice(), downCount: c.downCount })),
    foundations: state.foundations.map((f) => ({ ...f, deposited: f.deposited.slice() })),
    stock: state.stock.slice(),
    waste: state.waste.slice(),
    boosters: { ...state.boosters },
  };
}

function removeSource(next: GameState, source: Source): Card[] {
  if (source.from === 'waste') return next.waste.splice(0, 1);
  const column = next.columns[source.col];
  const cards = column.cards.splice(column.cards.length - source.count, source.count);
  flipIfNeeded(next, source.col);
  return cards;
}

function everythingDone(state: GameState): boolean {
  const cardsLeft =
    state.columns.reduce((n, c) => n + c.cards.length, 0) + state.stock.length + state.waste.length;
  // A set that has just filled up is already won -- it is only waiting for its
  // clear animation. Counting it as open would lose the level on the very move
  // that finished it, whenever that move was also the last one.
  const stillOpen = state.foundations.some((f) => f.card !== null && !f.completing);
  return cardsLeft === 0 && !stillOpen;
}

function settle(state: GameState): GameState {
  if (state.phase !== 'playing') return state;
  if (everythingDone(state)) return { ...state, phase: 'won', selected: null };
  if (state.moves <= 0) return { ...state, phase: 'lost-moves', selected: null };
  return state;
}

/** Apply one validated move. Costs exactly one move, whatever the group size. */
function applyMove(state: GameState, source: Source, destination: Destination): GameState {
  const next = clone(state);
  next.history = pushHistory(state);
  const cards = removeSource(next, source);

  if (destination.to === 'column') {
    const column = next.columns[destination.col];
    const before = column.cards.length;
    column.cards.push(...cards);
    if (column.downCount > before) column.downCount = before;
  } else {
    const foundation = next.foundations[destination.slot];
    if (cards[0].kind === 'category') {
      foundation.card = cards[0];
      foundation.value = cards[0].value;
      foundation.quota = cards[0].quota ?? 0;
      foundation.progress = 0;
      foundation.deposited = [];
    } else {
      foundation.deposited.push(...cards);
      foundation.progress += cards.length;               // rule 8: a group costs one move
      if (foundation.progress >= foundation.quota) foundation.completing = true;
    }
  }

  next.moves = Math.max(0, next.moves - 1);
  next.selected = null;
  next.hint = null;
  return settle(next);
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'select': {
      if (state.phase !== 'playing' || state.locked) return state;
      return { ...state, selected: action.source, hint: null };
    }

    case 'move': {
      const check = checkMove(state, action.source, action.destination);
      if (!check.ok) {
        // rule 13: an illegal move snaps back and costs nothing
        const rejected = { ...state, selected: null };
        return check.toast ? toast(rejected, check.toast) : rejected;
      }
      return applyMove(state, action.source, action.destination);
    }

    case 'draw': {
      if (state.phase !== 'playing' || state.locked || !state.stock.length) return state;
      const next = clone(state);
      next.history = pushHistory(state);
      next.waste.unshift(next.stock.shift()!);
      next.moves = Math.max(0, next.moves - 1);
      next.selected = null;
      next.hint = null;
      return settle(next);
    }

    case 'restore': {
      if (state.phase !== 'playing' || state.locked) return state;
      if (state.stock.length || state.waste.length === 0) return state;
      const next = clone(state);
      next.history = pushHistory(state);
      // waste[0] is the newest, so the stock refills in the order it was drawn
      next.stock = next.waste.slice().reverse();
      next.waste = [];
      const first = next.stock.shift();
      if (first) next.waste = [first];
      next.moves = Math.max(0, next.moves - 1);
      next.selected = null;
      return settle(next);
    }

    case 'joker': {
      if (state.phase !== 'playing' || state.locked || state.boosters.joker <= 0) return state;
      const foundation = state.foundations[action.slot];
      if (!foundation.card || foundation.completing) return state;
      if (foundation.progress >= foundation.quota) return state;   // never exceed the quota
      const next = clone(state);
      next.history = pushHistory(state);
      next.boosters.joker -= 1;
      const f = next.foundations[action.slot];
      f.deposited.push({ id: `j${action.slot}-${f.progress}`, kind: 'equation', value: f.value, expression: 'JOKER' });
      f.progress += 1;
      if (f.progress >= f.quota) f.completing = true;
      next.selected = null;
      return settle(next);
    }

    case 'finishFoundation': {
      if (!state.foundations[action.slot].completing) return state;
      const next = clone(state);
      next.foundations[action.slot] = {
        card: null, value: 0, quota: 0, progress: 0, deposited: [], completing: false,
      };
      next.coins += 25;
      return settle(next);
    }

    case 'hint': {
      if (state.phase !== 'playing' || state.boosters.hint <= 0) return state;
      const mark = findHint(state);
      if (!mark) return toast(state, 'No move available - draw or restore the stock.');
      return { ...state, hint: mark, boosters: { ...state.boosters, hint: state.boosters.hint - 1 } };
    }

    case 'clearHint':
      return state.hint ? { ...state, hint: null } : state;

    case 'undo': {
      if (!state.history.length || state.boosters.undo <= 0) return state;
      const previous = JSON.parse(state.history[state.history.length - 1]) as GameState;
      return {
        ...previous,
        secondsLeft: state.secondsLeft,           // the clock does not rewind
        history: state.history.slice(0, -1),
        // Only the joker is spent by a board move, so only the joker comes back.
        // Hint, magnet and calculator charges stay spent.
        boosters: {
          ...state.boosters,
          joker: previous.boosters.joker,
          undo: state.boosters.undo - 1,
        },
        toast: null, hint: null, selected: null, locked: false,
      };
    }

    case 'magnet': {
      if (state.phase !== 'playing' || state.boosters.magnet <= 0) return state;
      let working = state;
      let moved = 0;
      for (let pass = 0; pass < 12; pass++) {
        const found = bestMagnetMove(working);
        if (!found) break;
        working = applyMove(working, found.source, found.destination);
        moved++;
      }
      if (!moved) return toast(state, 'Nothing can go to a set right now.');
      return {
        ...working,
        boosters: { ...working.boosters, magnet: state.boosters.magnet - 1 },
        history: [...state.history, snapshot(state)].slice(-60),
      };
    }

    case 'calculator': {
      if (state.phase !== 'playing' || state.boosters.calculator <= 0) return state;
      return {
        ...state,
        calculatorUntil: Date.now() + 5000,
        boosters: { ...state.boosters, calculator: state.boosters.calculator - 1 },
      };
    }

    case 'clearCalculator':
      return state.calculatorUntil ? { ...state, calculatorUntil: null } : state;

    case 'tick': {
      if (state.phase !== 'playing') return state;
      const secondsLeft = state.secondsLeft - 1;
      if (secondsLeft <= 0) return { ...state, secondsLeft: 0, phase: 'lost-time', selected: null };
      return { ...state, secondsLeft };
    }

    case 'unlock':
      return state.locked ? { ...state, locked: false } : state;

    case 'replace':
      return action.state;
  }
}

/** Prefer a move that fills a set, then one that frees a face-down card. */
function findHint(state: GameState) {
  let best: { source: Source; destination: Destination; rank: number } | null = null;
  for (const source of availableSources(state)) {
    for (const destination of destinationsFor(state, source)) {
      let rank = 1;
      if (destination.to === 'foundation') {
        rank = state.foundations[destination.slot].card ? 5 : 4;
      } else if (source.from === 'column') {
        const column = state.columns[source.col];
        rank = column.cards.length - source.count === column.downCount ? 3 : 2;
      }
      if (!best || rank > best.rank) best = { source, destination, rank };
    }
  }
  return best ? { source: best.source, destination: best.destination } : null;
}

/** One magnet step: the largest group that can enter an active foundation. */
function bestMagnetMove(state: GameState) {
  let best: { source: Source; destination: Destination; size: number } | null = null;
  for (const source of availableSources(state)) {
    const size = source.from === 'waste' ? 1 : source.count;
    for (let slot = 0; slot < state.foundations.length; slot++) {
      if (!state.foundations[slot].card) continue;
      const destination: Destination = { to: 'foundation', slot };
      if (!checkMove(state, source, destination).ok) continue;
      if (!best || size > best.size) best = { source, destination, size };
    }
  }
  return best;
}

export { movableCount, sourceCards, checkMove, destinationsFor, availableSources };
