/* Sweep the whole campaign: every level must be dealable, winnable inside its
   own budget, and harder than the ones before it. */
import { TOTAL_LEVELS, levelConfig } from '../game/campaign';
import { dealSolvable } from '../game/level';
import { solve } from '../game/solver';
import { evaluate } from '../game/deck';

let fails = 0;
const rows: Array<{ level: number; cards: number; sets: number; moves: number; used: number; secs: number }> = [];
const unverified: number[] = [];
const badMath: string[] = [];

const step = Number(process.argv[2] ?? 1);
for (let level = 1; level <= TOTAL_LEVELS; level += step) {
  const dealt = dealSolvable(level, `level-${level}`);
  const s = dealt.state;
  if (!dealt.verified) unverified.push(level);

  // every printed expression must equal the value the card claims
  const all = [...s.columns.flatMap((c) => c.cards), ...s.stock];
  for (const c of all) {
    if (c.kind === 'equation' && evaluate(c.expression!) !== c.value) {
      badMath.push(`L${level} ${c.expression}`);
    }
    if (c.kind === 'equation' && !/^\d+[+\-X/]\d+$/.test(c.expression!)) {
      badMath.push(`L${level} malformed ${c.expression}`);
    }
  }

  const replay = solve(s);
  if (!replay.won) { fails++; if (fails <= 6) console.log(`L${level} NOT WINNABLE (${replay.phase}, ${replay.cardsLeft} left)`); }

  rows.push({
    level, cards: all.length,
    sets: s.foundations.length && new Set(all.filter((c) => c.kind === 'category').map((c) => c.value)).size,
    moves: s.movesMax, used: replay.movesUsed, secs: s.secondsLeft,
  });
}

console.log(`levels checked: ${rows.length} (every ${step})`);
console.log(`not winnable  : ${fails}`);
console.log(`unverified    : ${unverified.length}${unverified.length ? ' -> ' + unverified.slice(0, 8).join(',') : ''}`);
console.log(`equation errors: ${badMath.length}${badMath.length ? ' -> ' + badMath.slice(0, 5).join(', ') : ''}`);

console.log('\nlevel  world             cards  sets  moves  clock');
for (const r of rows) {
  if (r.level !== 1 && (r.level - 1) % 50 !== 0 && r.level !== TOTAL_LEVELS) continue;
  const cfg = levelConfig(r.level);
  console.log(
    String(r.level).padStart(5) + '  ' + cfg.worldName.padEnd(16) +
    String(r.cards).padStart(6) + String(r.sets).padStart(6) +
    String(r.moves).padStart(7) + '  ' + Math.floor(r.secs / 60) + ':' + String(r.secs % 60).padStart(2, '0')
  );
}

// difficulty must trend upward, not wobble
const early = rows.filter((r) => r.level <= 50);
const late = rows.filter((r) => r.level > TOTAL_LEVELS - 50);
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
console.log('\naverage cards   first 50: ' + avg(early.map((r) => r.cards)).toFixed(1) +
  '   last 50: ' + avg(late.map((r) => r.cards)).toFixed(1));
console.log('average sets    first 50: ' + avg(early.map((r) => r.sets)).toFixed(1) +
  '   last 50: ' + avg(late.map((r) => r.sets)).toFixed(1));
console.log('spare moves     first 50: ' + avg(early.map((r) => r.moves - r.used)).toFixed(1) +
  '   last 50: ' + avg(late.map((r) => r.moves - r.used)).toFixed(1));
process.exit(fails || badMath.length ? 1 : 0);
