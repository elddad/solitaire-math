import { dealSolvable } from '../game/level';
import { solve } from '../game/solver';

let bad: number[] = [];
for (let level = 400; level <= 500; level++) {
  const d = dealSolvable(level, `level-${level}`);
  if (!d.verified || !solve(d.state).won) bad.push(level);
}
console.log('levels 400-500 unwinnable: ' + bad.length + (bad.length ? ' -> ' + bad.join(',') : ''));
