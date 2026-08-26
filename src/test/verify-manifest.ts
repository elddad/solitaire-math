/* Replay every level straight from the shipped manifest. */
import { createGame } from '../game/deck';
import { LEVEL_MANIFEST } from '../game/manifest';
import { solve } from '../game/solver';
import { TOTAL_LEVELS, levelConfig } from '../game/campaign';
import { evaluate } from '../game/deck';

let unwinnable = 0, mathErrors = 0, missing = 0;
const spare: number[] = [];
const cards: number[] = [];

for (let level = 1; level <= TOTAL_LEVELS; level++) {
  const e = LEVEL_MANIFEST[level];
  if (!e) { missing++; continue; }
  const g = createGame(level, e.seed, { moves: e.moves, categories: e.sets });
  const all = [...g.columns.flatMap((c) => c.cards), ...g.stock];
  for (const c of all) {
    if (c.kind === 'equation' && evaluate(c.expression!) !== c.value) mathErrors++;
  }
  const r = solve(g);
  if (!r.won) { unwinnable++; if (unwinnable <= 5) console.log('  L' + level + ' ' + r.phase); }
  else spare.push(r.movesLeft);
  cards.push(all.length);
}

const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('levels in manifest : ' + (TOTAL_LEVELS - missing) + ' / ' + TOTAL_LEVELS);
console.log('unwinnable         : ' + unwinnable);
console.log('equation errors    : ' + mathErrors);
console.log('avg cards          : ' + avg(cards) + '  (L1 ' + cards[0] + ' -> L500 ' + cards[cards.length - 1] + ')');
console.log('avg spare moves    : ' + avg(spare));
console.log('world names        : ' + [1, 101, 201, 301, 401].map((n) => levelConfig(n).worldName).join(', '));
process.exit(unwinnable + mathErrors + missing ? 1 : 0);
