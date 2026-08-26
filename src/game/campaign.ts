import type { Limits, Op } from './expressions';

export const TOTAL_LEVELS = 500;
const PER_WORLD = 50;

interface World {
  name: string;
  ops: Op[];
  limits: Limits;
  values: [number, number];
  /** Distinct categories on the board at the start and end of the world. */
  categories: [number, number];
  /** Cards needed per set, start and end of the world. */
  quota: [number, number];
  columns: number[];
  /** Seconds of clock per card in the deck. */
  timePerCard: [number, number];
  /** Spare moves on top of what a solver needs, start and end. */
  slack: [number, number];
}

/* Ten worlds of fifty. Every knob moves in one direction: more categories to
   juggle against four slots, larger sets, deeper columns, harder arithmetic,
   less clock and less slack. */
const WORLDS: World[] = [
  { name: 'First Sums',   ops: ['+', '-'],
    limits: { maxOperand: 9, maxPrinted: 20, maxFactor: 6 },  values: [3, 12],
    categories: [5, 6], quota: [3, 3], columns: [3, 4, 5, 6], timePerCard: [26, 24], slack: [30, 26] },
  { name: 'Bigger Sums',  ops: ['+', '-'],
    limits: { maxOperand: 12, maxPrinted: 30, maxFactor: 8 }, values: [4, 18],
    categories: [6, 6], quota: [3, 4], columns: [3, 4, 5, 6], timePerCard: [24, 23], slack: [26, 23] },
  { name: 'Times Tables', ops: ['+', '-', 'X'],
    limits: { maxOperand: 12, maxPrinted: 40, maxFactor: 9 }, values: [4, 24],
    categories: [6, 7], quota: [3, 4], columns: [4, 5, 6, 6], timePerCard: [23, 22], slack: [24, 21] },
  { name: 'Sharing Out',  ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 12, maxPrinted: 60, maxFactor: 9 }, values: [2, 20],
    categories: [7, 7], quota: [4, 4], columns: [4, 5, 6, 7], timePerCard: [22, 21], slack: [22, 19] },
  { name: 'All Four',     ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 15, maxPrinted: 72, maxFactor: 10 }, values: [2, 30],
    categories: [7, 8], quota: [4, 5], columns: [4, 5, 6, 7], timePerCard: [21, 20], slack: [20, 17] },
  { name: 'Deep Deal',    ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 15, maxPrinted: 80, maxFactor: 10 }, values: [2, 32],
    categories: [8, 8], quota: [4, 5], columns: [5, 6, 7, 7], timePerCard: [20, 19], slack: [18, 15] },
  { name: 'Crowded Table', ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 16, maxPrinted: 84, maxFactor: 11 }, values: [2, 36],
    categories: [9, 9], quota: [4, 6], columns: [5, 6, 7, 8], timePerCard: [19, 18], slack: [16, 14] },
  { name: 'Big Numbers',  ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 20, maxPrinted: 99, maxFactor: 12 }, values: [5, 40],
    categories: [9, 10], quota: [5, 6], columns: [5, 6, 7, 8], timePerCard: [18, 17], slack: [15, 13] },
  { name: 'Under Pressure', ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 20, maxPrinted: 99, maxFactor: 12 }, values: [4, 44],
    categories: [10, 10], quota: [5, 7], columns: [6, 7, 8, 8], timePerCard: [17, 16], slack: [13, 11] },
  { name: 'Number Master', ops: ['+', '-', 'X', '/'],
    limits: { maxOperand: 24, maxPrinted: 99, maxFactor: 12 }, values: [4, 48],
    categories: [10, 11], quota: [5, 7], columns: [6, 7, 8, 9], timePerCard: [16, 14], slack: [12, 9] },
];

export interface LevelConfig {
  level: number;
  world: number;
  worldName: string;
  ops: Op[];
  limits: Limits;
  values: [number, number];
  categories: number;
  quotaFor: (index: number) => number;
  columns: number[];
  timePerCard: number;
  slack: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function worldOf(level: number): number {
  return Math.max(0, Math.min(WORLDS.length - 1, Math.floor((level - 1) / PER_WORLD)));
}

export function worldName(level: number): string {
  return WORLDS[worldOf(level)].name;
}

export function levelConfig(level: number): LevelConfig {
  const w = worldOf(level);
  const world = WORLDS[w];
  const t = ((level - 1) % PER_WORLD) / (PER_WORLD - 1);   // 0 at the start, 1 at the end

  const categories = Math.round(lerp(world.categories[0], world.categories[1], t));
  const quotaLow = world.quota[0];
  const quotaHigh = Math.round(lerp(world.quota[0], world.quota[1], t));

  return {
    level,
    world: w,
    worldName: world.name,
    ops: world.ops,
    limits: world.limits,
    values: world.values,
    categories,
    // sets get larger further down the list, so a board mixes quick and slow sets
    quotaFor: (i) => quotaLow + Math.round(((quotaHigh - quotaLow) * i) / Math.max(1, categories - 1)),
    columns: world.columns,
    timePerCard: lerp(world.timePerCard[0], world.timePerCard[1], t),
    slack: Math.round(lerp(world.slack[0], world.slack[1], t)),
  };
}
