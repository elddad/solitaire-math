import { dealSolvable } from '../game/level';
import { solve } from '../game/solver';

for (const seed of ['recording', 'daily-1', 'daily-2', 'daily-3', 'shuffle-x']) {
  const d = dealSolvable(seed);
  const r = solve(d.state);
  const cols = d.state.columns.map((c) => c.cards[c.cards.length - 1]);
  console.log(
    seed.padEnd(10) +
    ' attempt ' + String(d.attempt).padStart(2) +
    '  verified=' + d.verified +
    '  spare=' + String(d.movesToSpare).padStart(2) +
    '  stock=' + d.state.stock.length +
    '  exposed=' + cols.map((c) => c.expression ?? ('[' + c.value + ']')).join(',')
  );
  void r;
}
