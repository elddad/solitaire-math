import type { Card, Column, GameState } from './types';
import { mulberry32, hashString, shuffle } from './rng';
import { levelConfig, worldName } from './campaign';
import { pickCategories } from './expressions';

/** Level 5 is the hand-authored reference deck from the recording. */
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
export const REFERENCE_LEVEL = 5;

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

export interface BuiltDeck { equations: Card[]; categories: Card[] }

/** The reference deck: 54 white cards and 10 gold, 64 in total. */
function referenceDeck(): BuiltDeck {
  const equations: Card[] = [];
  const categories: Card[] = [];
  for (const value of CATEGORY_VALUES) {
    const pool = CATEGORY_POOL[value];
    categories.push(categoryCard(value, pool.length));
    for (const expression of pool) equations.push(equationCard(expression));
  }
  return { equations, categories };
}

/** Any other level: categories and expressions drawn from its world's rules. */
function generatedDeck(level: number, rand: () => number, categoryCount?: number): BuiltDeck {
  const cfg = levelConfig(level);
  const count = Math.max(3, categoryCount ?? cfg.categories);
  const chosen = pickCategories(count, cfg.quotaFor, cfg.ops, cfg.limits, cfg.values, rand);
  const equations: Card[] = [];
  const categories: Card[] = [];
  for (const c of chosen) {
    categories.push(categoryCard(c.value, c.pool.length));
    for (const expression of c.pool) equations.push(equationCard(expression));
  }
  return { equations, categories };
}

export function buildDeck(level: number, rand: () => number, categoryCount?: number): BuiltDeck {
  counter = 0;
  return level === REFERENCE_LEVEL ? referenceDeck() : generatedDeck(level, rand, categoryCount);
}

/* ------------------------------------------------------------------ dealing */

/** The exposed cards the reference recording starts with, one per column. */
const OPENERS = ['16-2', '7+7', '2X4', '18/2'];
/** The first three cards the recording draws from the stock. */
const FIRST_DRAWS: Array<{ expression?: string; category?: number }> = [
  { expression: '8X1' },
  { category: 10 },
  { expression: '15-3' },
];

export interface Deal { columns: Column[]; stock: Card[] }

function take<T>(pool: T[], match: (item: T) => boolean): T {
  const i = pool.findIndex(match);
  if (i < 0) throw new Error('card not found in pool');
  return pool.splice(i, 1)[0];
}

/**
 * Deal a level. The seed name fixes the shuffle, so the same seed always
 * produces the same board. On level 5 the "recording" seed also pins the four
 * exposed cards, the gold category-15 card hidden under 16-2, and the first
 * three stock cards; everything else is shuffled from the seed.
 */
export function deal(level: number, seedName: string, categoryCount?: number): Deal {
  const rand = mulberry32(hashString(seedName));
  const { equations, categories } = buildDeck(level, rand, categoryCount);
  const cfg = levelConfig(level);
  // The reference level keeps the recording's own 4/5/6/7 deal.
  const sizes = level === REFERENCE_LEVEL ? [4, 5, 6, 7] : cfg.columns;
  const pinned = level === REFERENCE_LEVEL && seedName.split('#')[0] === 'recording';

  const pool: Card[] = [...equations, ...categories];
  const columns: Column[] = [];
  let stock: Card[] = [];

  if (pinned) {
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
      const size = sizes[col];
      const cards: Card[] = [];
      const hidden = col === 0 ? size - 2 : size - 1;   // column 1 hides the gold 15
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
      const size = Math.min(sizes[col], Math.max(1, rest.length - at - 2));
      columns.push({ cards: rest.slice(at, at + size), downCount: Math.max(0, size - 1) });
      at += size;
    }
    stock = rest.slice(at);
  }

  return { columns, stock };
}

export const REFERENCE_MOVES = 125;
export const REFERENCE_SECONDS = 25 * 60;

export interface GameOptions {
  moves?: number; seconds?: number; coins?: number; lives?: number;
  /** Deal fewer categories than the curve asks for (used to rescue a level). */
  categories?: number;
}

export function createGame(level: number, seedName: string, options: GameOptions = {}): GameState {
  const { columns, stock } = deal(level, seedName, options.categories);
  const cfg = levelConfig(level);
  const cards = columns.reduce((n, c) => n + c.cards.length, 0) + stock.length;
  const seconds = options.seconds ??
    (level === REFERENCE_LEVEL ? REFERENCE_SECONDS : Math.round(cards * cfg.timePerCard));

  return {
    level,
    columns,
    foundations: Array.from({ length: 4 }, () => ({
      card: null, value: 0, quota: 0, progress: 0, deposited: [], completing: false,
    })),
    stock,
    waste: [],
    selected: null,
    moves: options.moves ?? REFERENCE_MOVES,
    movesMax: options.moves ?? REFERENCE_MOVES,
    secondsLeft: seconds,
    coins: options.coins ?? 354,
    lives: options.lives ?? 4,
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

export { worldName };
