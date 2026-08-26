import type { Card, Column, GameState } from './types';
import { mulberry32, hashString, shuffle } from './rng';

/** Level 5: ten categories, 54 equation cards, one gold card each. */
export const CATEGORY_POOL: Record<number, string[]> = {
  5: ['3+2', '10-5', '5X1'],
  6: ['3X2', '12/2', '10-4'],
  8: ['2X4', '8X1', '16/2', '4+4', '10-2', '24/3', '5+3', '12-4'],
  9: ['18/2', '3X3', '5+4', '12-3', '10-1', '27/3'],
  10: ['2X5', '5X2', '10X1', '20/2', '6+4', '5+5', '15-5', '12-2'],
  12: ['12X1', '24/2', '3X4', '6+6', '36/3', '10+2', '14-2', '15-3'],
  14: ['16-2', '7+7', '2X7', '28/2', '10+4', '15-1'],
  15: ['3X5', '30/2', '10+5', '20-5'],
  16: ['32/2', '4X4', '8+8', '20-4'],
  20: ['40/2', '4X5', '10+10', '25-5'],
};

export const CATEGORY_VALUES = Object.keys(CATEGORY_POOL).map(Number).sort((a, b) => a - b);

/** Evaluate an expression written with X for times and / for divide. */
export function evaluate(expression: string): number {
  const m = /^(\d+)([+\-X/])(\d+)$/.exec(expression);
  if (!m) throw new Error(`bad expression: ${expression}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  switch (m[2]) {
    case '+': return a + b;
    case '-': return a - b;
    case 'X': return a * b;
    default: return a / b;
  }
}

let counter = 0;
function equationCard(expression: string): Card {
  return { id: `e${counter++}`, kind: 'equation', value: evaluate(expression), expression };
}
function categoryCard(value: number, quota: number): Card {
  return { id: `c${counter++}`, kind: 'category', value, quota };
}

/** Every card in the level 5 deck: 54 white + 10 gold = 64. */
export function buildDeck(): { equations: Card[]; categories: Card[] } {
  counter = 0;
  const equations: Card[] = [];
  const categories: Card[] = [];
  for (const value of CATEGORY_VALUES) {
    const pool = CATEGORY_POOL[value];
    categories.push(categoryCard(value, pool.length));
    for (const expression of pool) equations.push(equationCard(expression));
  }
  return { equations, categories };
}

const COLUMN_SIZES = [4, 5, 6, 7];

/** The exposed cards the recording starts with, one per column. */
const OPENERS = ['16-2', '7+7', '2X4', '18/2'];
/** The first three cards the recording draws from the stock. */
const FIRST_DRAWS: Array<{ expression?: string; category?: number }> = [
  { expression: '8X1' },
  { category: 10 },
  { expression: '15-3' },
];

export interface Deal {
  columns: Column[];
  stock: Card[];
}

function take<T>(pool: T[], match: (item: T) => boolean): T {
  const i = pool.findIndex(match);
  if (i < 0) throw new Error('card not found in pool');
  return pool.splice(i, 1)[0];
}

/**
 * Deal the level.
 *
 * The "recording" seed reproduces the reference layout exactly: the four
 * exposed cards, the gold category-15 card hidden directly beneath 16-2, and
 * the first three stock cards. Every other card is shuffled from the seed, so
 * the same seed always produces the same board.
 */
export function deal(seedName: string): Deal {
  const { equations, categories } = buildDeck();
  const rand = mulberry32(hashString(seedName));
  // 'recording' and 'recording#7' both use the reference layout; the suffix
  // only varies the shuffle of the cards that are not pinned by the brief.
  const recording = seedName.split('#')[0] === 'recording';

  const pool: Card[] = [...equations, ...categories];
  const columns: Column[] = [];
  let stock: Card[] = [];

  if (recording) {
    const openers = OPENERS.map((e) => take(pool, (c) => c.expression === e));
    const gold15 = take(pool, (c) => c.kind === 'category' && c.value === 15);
    const draws = FIRST_DRAWS.map((d) =>
      d.expression
        ? take(pool, (c) => c.expression === d.expression)
        : take(pool, (c) => c.kind === 'category' && c.value === d.category)
    );

    const rest = shuffle(pool, rand);
    let at = 0;
    for (let col = 0; col < 4; col++) {
      const size = COLUMN_SIZES[col];
      const cards: Card[] = [];
      // column 1 hides the gold 15 directly under its exposed card
      const hidden = col === 0 ? size - 2 : size - 1;
      for (let i = 0; i < hidden; i++) cards.push(rest[at++]);
      if (col === 0) cards.push(gold15);
      cards.push(openers[col]);
      columns.push({ cards, downCount: size - 1 });
    }
    stock = [...draws, ...rest.slice(at)];
  } else {
    const rest = shuffle(pool, rand);
    let at = 0;
    for (let col = 0; col < 4; col++) {
      const size = COLUMN_SIZES[col];
      const cards = rest.slice(at, at + size);
      at += size;
      columns.push({ cards, downCount: size - 1 });
    }
    stock = rest.slice(at);
  }

  return { columns, stock };
}

export const LEVEL5 = {
  level: 5,
  moves: 125,
  seconds: 25 * 60,
  coins: 354,
  lives: 4,
};

export function createGame(seedName: string): GameState {
  const { columns, stock } = deal(seedName);
  return {
    level: LEVEL5.level,
    columns,
    foundations: Array.from({ length: 4 }, () => ({
      card: null, value: 0, quota: 0, progress: 0, deposited: [], completing: false,
    })),
    stock,
    waste: [],
    selected: null,
    moves: LEVEL5.moves,
    movesMax: LEVEL5.moves,
    secondsLeft: LEVEL5.seconds,
    coins: LEVEL5.coins,
    lives: LEVEL5.lives,
    boosters: { hint: 3, undo: 3, magnet: 3, calculator: 3, joker: 3 },
    history: [],
    phase: 'playing',
    locked: false,
    hint: null,
    calculatorUntil: null,
    toast: null,
    seedName,
  };
}
