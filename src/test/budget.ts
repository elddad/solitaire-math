import { createGame } from '../game/deck';
import { solve } from '../game/solver';

/* Where does the 125-move budget actually go? */
const r = solve(createGame('recording'));
console.log('recording seed:');
console.log('  result      ', r.phase, r.won ? '' : '(' + r.cardsLeft + ' cards left)');
console.log('  moves used  ', r.movesUsed, 'of 125');
console.log('  draws       ', r.draws);
console.log('  restores    ', r.restores);
console.log('  deposit moves', r.deposits);
console.log('  other moves ', r.movesUsed - r.draws - r.restores - r.deposits);
console.log('  sets open   ', r.openSets.join(' ') || 'none');
console.log('');
console.log('Floor for any deal: 42 draws + 64 one-move placements = 106.');
console.log('So only 19 spare moves exist for parking and re-handling.');
console.log('');

let won = 0; const used: number[] = []; const left: number[] = [];
for (let i = 0; i < 60; i++) {
  const s = solve(createGame('probe-' + i));
  if (s.won) { won++; used.push(s.movesUsed); } else left.push(s.cardsLeft);
}
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
console.log('60 random deals: ' + won + ' solved (avg ' + avg(used) + ' moves), ' +
  (60 - won) + ' failed (avg ' + avg(left) + ' cards short)');
