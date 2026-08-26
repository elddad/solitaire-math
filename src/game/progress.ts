import { TOTAL_LEVELS } from './campaign';

/** Progress lives in localStorage and degrades quietly if it is unavailable. */
const KEY = 'math-category-solitaire';

export interface Progress {
  unlocked: number;
  current: number;
  stars: Record<number, number>;
  coins: number;
  lives: number;
  sound: boolean;
  vibrate: boolean;
}

function blank(): Progress {
  return { unlocked: 1, current: 1, stars: {}, coins: 354, lives: 4, sound: true, vibrate: true };
}

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return { ...blank(), ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return blank();
  }
}

export function save(p: Progress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

/** Three stars for finishing with plenty of moves to spare. */
export function starsFor(movesLeft: number, movesMax: number): number {
  const share = movesLeft / Math.max(1, movesMax);
  if (share >= 0.30) return 3;
  if (share >= 0.12) return 2;
  return 1;
}

export function recordWin(level: number, stars: number, coins: number): Progress {
  const p = load();
  p.stars[level] = Math.max(p.stars[level] ?? 0, stars);
  p.coins += coins;
  p.unlocked = Math.max(p.unlocked, Math.min(TOTAL_LEVELS, level + 1));
  p.current = Math.min(TOTAL_LEVELS, level + 1);
  save(p);
  return p;
}

export function recordLoss(level: number): Progress {
  const p = load();
  p.lives = Math.max(0, p.lives - 1);
  p.current = level;
  save(p);
  return p;
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

/* ---------------------------------------------------------------- cheats */

export function unlockAll(): Progress {
  const p = load();
  p.unlocked = TOTAL_LEVELS;
  save(p);
  return p;
}

export function starAll(): Progress {
  const p = load();
  for (let n = 1; n <= TOTAL_LEVELS; n++) p.stars[n] = 3;
  p.unlocked = TOTAL_LEVELS;
  save(p);
  return p;
}

export function addCoins(amount: number): Progress {
  const p = load();
  p.coins = Math.max(0, p.coins + amount);
  save(p);
  return p;
}

export function setLives(lives: number): Progress {
  const p = load();
  p.lives = Math.max(0, Math.min(9, lives));
  save(p);
  return p;
}

export function resetAll(): Progress {
  const p = blank();
  save(p);
  return p;
}
