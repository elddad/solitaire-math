import { dealSolvable } from '../game/level';
import { createGame } from '../game/deck';
import { solve } from '../game/solver';

const d = dealSolvable(5, 'recording');
console.log('verified=' + d.verified + ' attempt=' + d.attempt + ' solverMoves=' + d.solverMoves +
  ' movesMax=' + d.state.movesMax + ' stock=' + d.state.stock.length);
const r = solve(d.state);
console.log('replay: ' + r.phase + ' used ' + r.movesUsed + ' left ' + r.movesLeft);

for (let a = 0; a < 8; a++) {
  const seed = a === 0 ? 'recording' : `recording#${a}`;
  const probe = createGame(5, seed, { moves: 4000 });
  const s = solve(probe);
  console.log('  ' + seed.padEnd(13) + (s.won ? 'won in ' + s.movesUsed : s.phase) +
    '  cardsLeft=' + s.cardsLeft);
}
