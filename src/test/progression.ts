export {};
/* Campaign progression: unlocking, stars, coins, and the difficulty curve. */
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

const { load, save, recordWin, recordLoss, starsFor, totalStars } = await import('../game/progress');
const { newLevel } = await import('../game/level');
const { TOTAL_LEVELS, levelConfig } = await import('../game/campaign');
const { solve } = await import('../game/solver');

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (ok) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : '')); }
};

console.log('\n1. Fresh save');
let p = load();
check('starts unlocked at level 1', p.unlocked === 1 && p.current === 1);
check('no stars yet', totalStars(p) === 0);

console.log('\n2. Stars scale with moves left');
check('3 stars for 30% spare', starsFor(30, 100) === 3);
check('2 stars for 12% spare', starsFor(12, 100) === 2);
check('1 star for scraping through', starsFor(1, 100) === 1);

console.log('\n3. Winning unlocks the next level');
p = recordWin(1, 3, 160);
check('level 2 unlocked', p.unlocked === 2, String(p.unlocked));
check('current advanced', p.current === 2, String(p.current));
check('stars stored', p.stars[1] === 3);
check('coins added', p.coins === 354 + 160, String(p.coins));
p = recordWin(1, 1, 100);
check('a worse replay does not lower the star count', p.stars[1] === 3, String(p.stars[1]));
check('replaying does not unlock further', p.unlocked === 2, String(p.unlocked));

console.log('\n4. Losing costs a life and holds position');
const before = p.lives;
p = recordLoss(2);
check('a life is spent', p.lives === before - 1, String(p.lives));
check('still on the same level', p.current === 2);
check('unlock is not rolled back', p.unlocked === 2);

console.log('\n5. Progress survives a reload');
save(p);
store.set('other', 'x');
const reloaded = load();
check('unlocked persisted', reloaded.unlocked === 2);
check('stars persisted', reloaded.stars[1] === 3);

console.log('\n6. The curve actually gets harder');
const sample = [1, 60, 120, 190, 260, 320, 380, 440, 500];
const rows = sample.map((n) => {
  const g = newLevel(n);
  const cards = g.columns.reduce((a, c) => a + c.cards.length, 0) + g.stock.length;
  const sets = new Set([...g.columns.flatMap((c) => c.cards), ...g.stock]
    .filter((c) => c.kind === 'category').map((c) => c.value)).size;
  const spare = g.movesMax - solve(g).movesUsed;
  return { n, cards, sets, moves: g.movesMax, spare, secs: g.secondsLeft, world: levelConfig(n).worldName };
});
rows.forEach((r) => console.log('    L' + String(r.n).padStart(3) + '  ' + r.world.padEnd(16) +
  ' cards ' + String(r.cards).padStart(2) + '  sets ' + r.sets +
  '  moves ' + String(r.moves).padStart(3) + '  spare ' + String(r.spare).padStart(2) +
  '  clock ' + Math.floor(r.secs / 60) + ':' + String(r.secs % 60).padStart(2, '0')));

const first = rows[0], last = rows[rows.length - 1];
check('later levels deal more cards', last.cards > first.cards * 2, first.cards + ' -> ' + last.cards);
check('later levels juggle more sets', last.sets >= first.sets + 4, first.sets + ' -> ' + last.sets);
check('later levels leave less slack', last.spare < first.spare, first.spare + ' -> ' + last.spare);
check('card count never falls across worlds',
  rows.every((r, i) => i === 0 || r.cards >= rows[i - 1].cards - 6),
  rows.map((r) => r.cards).join(','));
check('every sampled level is winnable', rows.every((_, i) => solve(newLevel(sample[i])).won));
check('level 500 exists', newLevel(TOTAL_LEVELS).level === 500);

console.log('\n' + (failures ? failures + ' CHECK(S) FAILED' : 'progression: all checks passed'));
process.exit(failures ? 1 : 0);
