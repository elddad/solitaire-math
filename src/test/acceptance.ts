/* The 14-step acceptance test from the brief, plus a solvability sweep.
   Run with: npm run accept */
import { createGame, evaluate, CATEGORY_POOL } from '../game/deck';
import { newLevel, dealSolvable } from '../game/level';
import { reducer, type Action } from '../game/engine';
import { movableCount } from '../game/rules';
import { solve } from '../game/solver';
import type { GameState } from '../game/types';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (condition) console.log('  ok    ' + label);
  else { failures++; console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : '')); }
}
function step(n: number, title: string) { console.log('\n' + n + '. ' + title); }

const run = (s: GameState, a: Action) => reducer(s, a);
const exposed = (s: GameState, col: number) => {
  const c = s.columns[col];
  return c.cards.length ? c.cards[c.cards.length - 1] : null;
};
const label = (s: GameState, col: number) => exposed(s, col)?.expression ?? exposed(s, col)?.value;

console.log('=== Math Category Solitaire - acceptance test (recording seed) ===');

// ---------------------------------------------------------------- deck sanity
step(0, 'Deck definition');
const totals = Object.entries(CATEGORY_POOL);
let equationCount = 0;
let poolOk = true;
for (const [value, pool] of totals) {
  equationCount += pool.length;
  for (const expression of pool) {
    if (evaluate(expression) !== Number(value)) { poolOk = false; console.log('    bad: ' + expression + ' != ' + value); }
  }
}
check('10 categories', totals.length === 10, String(totals.length));
check('54 equation cards', equationCount === 54, String(equationCount));
check('64 cards total', equationCount + totals.length === 64);
check('every expression equals its category', poolOk);

// ---------------------------------------------------------------------- 1 & 2
let s = newLevel(5, 'recording');
step(1, 'Opening board');
check('125 moves', s.moves === 125, String(s.moves));
check('25:00 on the clock', s.secondsLeft === 1500, String(s.secondsLeft));
check('4 lives', s.lives === 4);
check('354 coins', s.coins === 354);
check('42 cards in stock', s.stock.length === 42, String(s.stock.length));
check('3 jokers', s.boosters.joker === 3);
check('4 empty foundations', s.foundations.every((f) => f.card === null));
check('22 cards dealt to the tableau',
  s.columns.reduce((n, c) => n + c.cards.length, 0) === 22);
check('columns are 4/5/6/7', s.columns.map((c) => c.cards.length).join('/') === '4/5/6/7');

step(2, 'Exposed tableau cards');
check('16-2, 7+7, 2X4, 18/2',
  [0, 1, 2, 3].map((i) => label(s, i)).join(',') === '16-2,7+7,2X4,18/2',
  [0, 1, 2, 3].map((i) => label(s, i)).join(','));

// -------------------------------------------------------------------------- 3
step(3, 'Tap stock');
s = run(s, { type: 'draw' });
check('waste top is 8X1', s.waste[0]?.expression === '8X1', String(s.waste[0]?.expression));
check('stock is 41', s.stock.length === 41, String(s.stock.length));
check('moves are 124', s.moves === 124, String(s.moves));

// -------------------------------------------------------------------------- 4
step(4, 'Move 8X1 onto 2X4');
s = run(s, { type: 'move', source: { from: 'waste' }, destination: { to: 'column', col: 2 } });
check('column 3 holds a 2-card group', movableCount(s, 2) === 2, String(movableCount(s, 2)));
check('both cards answer 8',
  s.columns[2].cards.slice(-2).every((c) => c.value === 8));
check('moves are 123', s.moves === 123, String(s.moves));

// -------------------------------------------------------------------------- 5
step(5, 'Draw again');
s = run(s, { type: 'draw' });
check('gold category 10 appears',
  s.waste[0]?.kind === 'category' && s.waste[0]?.value === 10,
  s.waste[0]?.kind + ' ' + s.waste[0]?.value);
check('stock is 40', s.stock.length === 40, String(s.stock.length));
check('moves are 122', s.moves === 122, String(s.moves));

// -------------------------------------------------------------------------- 6
step(6, 'Move category 10 into the fourth foundation');
s = run(s, { type: 'move', source: { from: 'waste' }, destination: { to: 'foundation', slot: 3 } });
check('slot 4 shows 0 / 8',
  s.foundations[3].progress === 0 && s.foundations[3].quota === 8,
  s.foundations[3].progress + '/' + s.foundations[3].quota);
check('moves are 121', s.moves === 121, String(s.moves));

// -------------------------------------------------------------------------- 7
step(7, 'Mismatched card onto the category-8 stack is rejected');
s = run(s, { type: 'draw' });                       // 15-3, answers 12
const movesBefore = s.moves;
check('drew 15-3', s.waste[0]?.expression === '15-3', String(s.waste[0]?.expression));
s = run(s, { type: 'move', source: { from: 'waste' }, destination: { to: 'column', col: 2 } });
check('toast shown', s.toast?.text === 'You can only stack cards of the same category.', s.toast?.text ?? 'none');
check('move count unchanged', s.moves === movesBefore, s.moves + ' vs ' + movesBefore);
check('card stayed on the waste', s.waste[0]?.expression === '15-3');

step(7.5 as unknown as number, 'Other rejections');
const r1 = run(s, { type: 'move', source: { from: 'waste' }, destination: { to: 'foundation', slot: 0 } });
check('white card into an empty foundation is refused',
  r1.toast?.text === 'You can only put category cards here.', r1.toast?.text ?? 'none');

// -------------------------------------------------------------------------- 8
step(8, 'Move 16-2 onto 7+7 and reveal the gold 15');
s = run(s, { type: 'move', source: { from: 'column', col: 0, count: 1 }, destination: { to: 'column', col: 1 } });
check('column 2 holds a 2-card category-14 group',
  movableCount(s, 1) === 2 && s.columns[1].cards.slice(-2).every((c) => c.value === 14),
  String(movableCount(s, 1)));
const revealed = exposed(s, 0);
check('gold category 15 is now face up in column 1',
  revealed?.kind === 'category' && revealed?.value === 15,
  revealed?.kind + ' ' + revealed?.value);
check('it is exposed, not face down',
  s.columns[0].downCount === s.columns[0].cards.length - 1);

// -------------------------------------------------------------------------- 9
step(9, 'Move category 15 into an empty foundation');
s = run(s, { type: 'move', source: { from: 'column', col: 0, count: 1 }, destination: { to: 'foundation', slot: 0 } });
check('slot 1 is category 15, 0 / 4',
  s.foundations[0].value === 15 && s.foundations[0].quota === 4 && s.foundations[0].progress === 0,
  s.foundations[0].value + ' ' + s.foundations[0].progress + '/' + s.foundations[0].quota);

// ------------------------------------------------------------------------- 10
step(10, 'Deposit a 15 into that foundation');
// put a real category-15 card on the waste, wherever it currently sits
function liftCard(state: GameState, match: (e: string) => boolean): GameState {
  const next: GameState = JSON.parse(JSON.stringify(state));
  for (const column of next.columns) {
    const i = column.cards.findIndex((c) => c.expression && match(c.expression));
    if (i >= 0) { const [card] = column.cards.splice(i, 1);
      if (column.downCount > column.cards.length) column.downCount = Math.max(0, column.cards.length - 1);
      next.waste.unshift(card); return next; }
  }
  const j = next.stock.findIndex((c) => c.expression && match(c.expression));
  if (j >= 0) { const [card] = next.stock.splice(j, 1); next.waste.unshift(card); return next; }
  const k = next.waste.findIndex((c) => c.expression && match(c.expression));
  if (k > 0) { const [card] = next.waste.splice(k, 1); next.waste.unshift(card); }
  return next;
}
s = liftCard(s, (e) => e === '3X5');
check('3X5 is on the waste', s.waste[0]?.expression === '3X5', String(s.waste[0]?.expression));
s = run(s, { type: 'move', source: { from: 'waste' }, destination: { to: 'foundation', slot: 0 } });
check('progress is 1 of 4',
  s.foundations[0].progress === 1 && s.foundations[0].quota === 4,
  s.foundations[0].progress + '/' + s.foundations[0].quota);
check('the deposited card answers 15', s.foundations[0].deposited[0].value === 15);

// ------------------------------------------------------------------------- 11
step(11, 'A four-card group enters its foundation in one move');
{
  let t = newLevel(5, 'recording');
  // build a clean state: foundation 0 holds category 14, column 0 holds four 14s
  const fours = ['16-2', '7+7', '2X7', '28/2'];
  t = JSON.parse(JSON.stringify(t));
  const all = [...t.columns.flatMap((c) => c.cards), ...t.stock];
  const gold14 = all.find((c) => c.kind === 'category' && c.value === 14)!;
  const group = fours.map((e) => all.find((c) => c.expression === e)!);
  t.columns = [
    { cards: group, downCount: 0 },
    { cards: [], downCount: 0 },
    { cards: [], downCount: 0 },
    { cards: [], downCount: 0 },
  ];
  t.stock = []; t.waste = [];
  t.foundations[0] = { card: gold14, value: 14, quota: 6, progress: 0, deposited: [], completing: false };
  check('the four 14s read as one group', movableCount(t, 0) === 4, String(movableCount(t, 0)));
  const movesBefore4 = t.moves;
  t = run(t, { type: 'move', source: { from: 'column', col: 0, count: 4 }, destination: { to: 'foundation', slot: 0 } });
  check('progress jumped to 4', t.foundations[0].progress === 4, String(t.foundations[0].progress));
  check('it cost exactly one move', t.moves === movesBefore4 - 1, t.moves + ' vs ' + (movesBefore4 - 1));
  check('a deposit beyond the quota is refused', (() => {
    let u: GameState = JSON.parse(JSON.stringify(t));
    u.foundations[0].progress = 5;
    u.columns[1] = { cards: [group[0], group[1]], downCount: 0 };
    const before = u.moves;
    u = run(u, { type: 'move', source: { from: 'column', col: 1, count: 2 }, destination: { to: 'foundation', slot: 0 } });
    return u.moves === before && u.foundations[0].progress === 5;
  })());

  // ----------------------------------------------------------------------- 12
  step(12, 'A completed set clears its slot');
  t.foundations[0].progress = 5;
  t.columns[1] = { cards: [group[0]], downCount: 0 };
  t = run(t, { type: 'move', source: { from: 'column', col: 1, count: 1 }, destination: { to: 'foundation', slot: 0 } });
  check('foundation reports completing', t.foundations[0].completing === true);
  t = run(t, { type: 'finishFoundation', slot: 0 });
  check('slot is empty again', t.foundations[0].card === null && t.foundations[0].quota === 0);
  check('coins were awarded', t.coins > 354, String(t.coins));
}

// ------------------------------------------------------------------------- 13
step(13, 'The stock can be restored from the waste');
{
  let t = newLevel(5, 'recording');
  let guard = 0;
  while (t.stock.length && guard++ < 100) t = run(t, { type: 'draw' });
  check('stock is empty', t.stock.length === 0);
  const wasteSize = t.waste.length;
  const before = t.moves;
  t = run(t, { type: 'restore' });
  check('stock refilled', t.stock.length === wasteSize - 1, t.stock.length + ' vs ' + (wasteSize - 1));
  check('one card stays face up on the waste', t.waste.length === 1);
  check('restoring cost one move', t.moves === before - 1);
  check('no card was lost',
    t.stock.length + t.waste.length === wasteSize, String(t.stock.length + t.waste.length));
  const empty = run(newLevel(5, 'recording'), { type: 'restore' });
  check('restore does nothing while the stock still has cards', empty.moves === 125);
}

// ------------------------------------------------------------------------- 14
step(14, 'The level can actually be completed');
{
  const result = solve(newLevel(5, 'recording'));
  console.log('    recording seed: ' + (result.won ? 'WON' : result.phase) +
    ' using ' + result.movesUsed + ' of 125 moves, ' + result.restores + ' restores, ' +
    result.cardsLeft + ' cards left, sets open: ' + (result.openSets.join(' ') || 'none'));
  check('recording seed completes inside the move budget', result.won, result.phase);

  // Raw shuffles are often too tight for 125 moves, which is exactly why the
  // level searches shuffle variants of its seed until one is provably winnable.
  let raw = 0;
  const samples = 30;
  for (let i = 0; i < samples; i++) if (solve(createGame(5, 'seed-' + i, { moves: 125 })).won) raw++;
  console.log('    raw shuffles: ' + raw + '/' + samples + ' winnable before the search');

  let dealt = 0;
  const spare: number[] = [];
  for (let i = 0; i < samples; i++) {
    const d = dealSolvable(5, 'seed-' + i);
    if (d.verified) { dealt++; spare.push((125 - d.solverMoves)); }
  }
  const avgSpare = spare.length ? Math.round(spare.reduce((a, b) => a + b, 0) / spare.length) : 0;
  console.log('    after the search: ' + dealt + '/' + samples + ' verified, average ' +
    avgSpare + ' moves to spare');
  check('every dealt board is verified winnable', dealt === samples, dealt + '/' + samples);
}

// -------------------------------------------------------------- bug guardrails
step(15, 'Guardrails');
{
  let t = newLevel(5, 'recording');
  const ids = () => {
    const seen: string[] = [];
    t.columns.forEach((c) => c.cards.forEach((x) => seen.push(x.id)));
    t.stock.forEach((x) => seen.push(x.id));
    t.waste.forEach((x) => seen.push(x.id));
    t.foundations.forEach((f) => { if (f.card) seen.push(f.card.id); f.deposited.forEach((x) => seen.push(x.id)); });
    return seen;
  };
  check('64 unique cards at the start', new Set(ids()).size === 64 && ids().length === 64,
    ids().length + ' / ' + new Set(ids()).size);

  // hammer it the way a fast tapper would
  for (let i = 0; i < 300; i++) {
    t = run(t, { type: 'draw' });
    t = run(t, { type: 'move', source: { from: 'waste' }, destination: { to: 'column', col: i % 4 } });
    t = run(t, { type: 'move', source: { from: 'waste' }, destination: { to: 'foundation', slot: i % 4 } });
    const d = t.foundations.findIndex((f) => f.completing);
    if (d >= 0) t = run(t, { type: 'finishFoundation', slot: d });
  }
  const after = ids();
  check('no card duplicated or lost after 900 rapid actions',
    new Set(after).size === after.length, after.length + ' / ' + new Set(after).size);
  check('move count never goes negative', t.moves >= 0, String(t.moves));
  check('no foundation exceeds its quota',
    t.foundations.every((f) => f.quota === 0 || f.progress <= f.quota));

  let u = newLevel(5, 'recording');
  u = run(u, { type: 'draw' });
  const drawnId = u.waste[0].id;
  u = run(u, { type: 'move', source: { from: 'waste' }, destination: { to: 'column', col: 2 } });
  u = run(u, { type: 'undo' });
  const places = [
    u.waste.filter((c) => c.id === drawnId).length,
    u.columns.reduce((n, c) => n + c.cards.filter((x) => x.id === drawnId).length, 0),
  ];
  check('undo puts a card back in exactly one place', places[0] + places[1] === 1, places.join('+'));
  check('undo restored the move counter', u.moves === 124, String(u.moves));
  check('undo spent a charge', u.boosters.undo === 2, String(u.boosters.undo));

  let v = newLevel(5, 'recording');
  const emptyStock = { ...v, stock: [] };
  check('cannot draw from an empty stock', run(emptyStock, { type: 'draw' }).moves === 125);
  v = { ...v, boosters: { ...v.boosters, joker: 0 } };
  check('a spent joker cannot be reused',
    run(v, { type: 'joker', slot: 0 }).boosters.joker === 0);
  check('a face-down card cannot be moved', movableCount(newLevel(5, 'recording'), 0) === 1);
}


// ------------------------------------------------------- booster bookkeeping
step(16, 'Boosters');
{
  let t = newLevel(5, 'recording');
  t = run(t, { type: 'draw' });
  t = run(t, { type: 'move', source: { from: 'waste' }, destination: { to: 'column', col: 2 } });
  t = run(t, { type: 'draw' });                                   // gold category 10
  t = run(t, { type: 'move', source: { from: 'waste' }, destination: { to: 'foundation', slot: 3 } });
  check('a set is open', t.foundations[3].value === 10 && t.foundations[3].quota === 8);

  const beforeJoker = t.moves;
  t = run(t, { type: 'joker', slot: 3 });
  check('joker adds one to the set', t.foundations[3].progress === 1, String(t.foundations[3].progress));
  check('joker charge spent', t.boosters.joker === 2, String(t.boosters.joker));
  check('joker is a booster, so it costs no move', t.moves === beforeJoker, t.moves + ' vs ' + beforeJoker);
  check('a joker cannot overfill a set', (() => {
    let z: GameState = JSON.parse(JSON.stringify(t));
    z.foundations[3].progress = z.foundations[3].quota;
    return run(z, { type: 'joker', slot: 3 }).boosters.joker === z.boosters.joker;
  })());

  t = run(t, { type: 'hint' });
  check('hint charge spent', t.boosters.hint === 2, String(t.boosters.hint));
  check('hint found a move', t.hint !== null);

  t = run(t, { type: 'undo' });
  check('undo rolled back the joker', t.foundations[3].progress === 0, String(t.foundations[3].progress));
  check('undo refunded the joker', t.boosters.joker === 3, String(t.boosters.joker));
  check('undo did NOT refund the hint', t.boosters.hint === 2, String(t.boosters.hint));
  check('undo charge spent', t.boosters.undo === 2, String(t.boosters.undo));

  t = run(t, { type: 'calculator' });
  check('calculator charge spent', t.boosters.calculator === 2, String(t.boosters.calculator));
  check('calculator is timed', t.calculatorUntil !== null);

  // Build a board the magnet definitely has work on: category 8 seated, and
  // two exposed 8s waiting in the tableau.
  let m: GameState = JSON.parse(JSON.stringify(newLevel(5, 'recording')));
  const pile = [...m.columns.flatMap((c) => c.cards), ...m.stock];
  const gold8 = pile.find((c) => c.kind === 'category' && c.value === 8)!;
  const eights = ['2X4', '8X1', '16/2'].map((e) => pile.find((c) => c.expression === e)!);
  m.columns = [
    { cards: [eights[0]], downCount: 0 },
    { cards: [eights[1]], downCount: 0 },
    { cards: [eights[2]], downCount: 0 },
    { cards: [], downCount: 0 },
  ];
  m.stock = []; m.waste = [];
  m.foundations[0] = { card: gold8, value: 8, quota: 8, progress: 0, deposited: [], completing: false };
  const beforeMagnet = m.moves;
  m = run(m, { type: 'magnet' });
  check('magnet spent a charge', m.boosters.magnet === 2, String(m.boosters.magnet));
  check('magnet swept every exposed 8 home', m.foundations[0].progress === 3, String(m.foundations[0].progress));
  check('each swept card cost its own move', m.moves === beforeMagnet - 3, m.moves + ' vs ' + (beforeMagnet - 3));
  const undone = run(m, { type: 'undo' });
  check('one undo reverses the whole magnet sweep',
    undone.moves === beforeMagnet && undone.foundations[0].progress === 0,
    undone.moves + ' / ' + undone.foundations[0].progress);
}

console.log('\n' + (failures ? failures + ' CHECK(S) FAILED' : 'all checks passed (16 sections)'));
process.exit(failures ? 1 : 0);
