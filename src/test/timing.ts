import { newLevel } from '../game/level';

let worst = 0, at = 0, total = 0;
for (let level = 1; level <= 500; level++) {
  const t0 = performance.now();
  newLevel(level);
  const ms = performance.now() - t0;
  total += ms;
  if (ms > worst) { worst = ms; at = level; }
}
console.log('start a level: worst ' + worst.toFixed(1) + 'ms (L' + at + '), average ' + (total / 500).toFixed(2) + 'ms');
