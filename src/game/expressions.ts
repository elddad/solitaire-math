/* Procedural equation cards.

   Cards print as a single operation with no spaces and no equals sign:
   `16-2`, `7+7`, `2X4`, `18/2`. Difficulty comes from which operations a
   level is allowed and how large its operands may grow. */

export type Op = '+' | '-' | 'X' | '/';

export interface Limits {
  /** Largest operand allowed in a sum or difference. */
  maxOperand: number;
  /** Largest number that may be printed at all (a dividend, say). */
  maxPrinted: number;
  /** Largest factor allowed in a product. */
  maxFactor: number;
}

/** Every expression of the allowed shapes that answers to `value`. */
export function expressionsFor(value: number, ops: Op[], limits: Limits): string[] {
  const out = new Set<string>();
  if (value < 1) return [];

  if (ops.includes('+')) {
    const lo = Math.max(1, value - limits.maxOperand);
    const hi = Math.min(value - 1, limits.maxOperand);
    for (let a = lo; a <= hi; a++) out.add(`${a}+${value - a}`);
  }

  if (ops.includes('-')) {
    for (let b = 1; b <= limits.maxOperand; b++) {
      const a = value + b;
      if (a > limits.maxPrinted) break;
      out.add(`${a}-${b}`);
    }
  }

  if (ops.includes('X')) {
    for (let a = 1; a <= limits.maxFactor; a++) {
      if (value % a !== 0) continue;
      const b = value / a;
      if (b < 1 || b > limits.maxFactor) continue;
      // a plain "1Xn" is not much of a puzzle unless nothing else exists
      out.add(`${a}X${b}`);
    }
  }

  if (ops.includes('/')) {
    for (let b = 2; b <= 12; b++) {
      const a = value * b;
      if (a > limits.maxPrinted) break;
      out.add(`${a}/${b}`);
    }
  }

  return [...out];
}

/** Drop the least interesting forms when richer ones are available. */
function rank(expression: string): number {
  if (/^1X/.test(expression) || /X1$/.test(expression)) return 3;
  return 0;
}

/**
 * Choose `count` distinct categories, each with at least `quota` different
 * ways of being written. Returns the values in ascending order.
 */
export function pickCategories(
  count: number,
  quotaFor: (index: number) => number,
  ops: Op[],
  limits: Limits,
  valueRange: [number, number],
  rand: () => number
): Array<{ value: number; quota: number; pool: string[] }> {
  const candidates: number[] = [];
  for (let v = valueRange[0]; v <= valueRange[1]; v++) {
    if (expressionsFor(v, ops, limits).length >= 3) candidates.push(v);
  }
  // shuffle the candidate values
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const chosen: Array<{ value: number; quota: number; pool: string[] }> = [];
  for (const value of candidates) {
    if (chosen.length >= count) break;
    const quota = quotaFor(chosen.length);
    const all = expressionsFor(value, ops, limits).sort((a, b) => rank(a) - rank(b));
    if (all.length < quota) continue;

    // keep the best-ranked forms, then shuffle within what we keep
    const keep = all.slice(0, Math.max(quota, Math.min(all.length, quota + 4)));
    for (let i = keep.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [keep[i], keep[j]] = [keep[j], keep[i]];
    }
    chosen.push({ value, quota, pool: keep.slice(0, quota) });
  }

  return chosen.sort((a, b) => a.value - b.value);
}
