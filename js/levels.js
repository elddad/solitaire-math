/* 600 levels, generated deterministically from the level number.
   Each level is built BACKWARDS from a legal clearing sequence, so a solution
   is guaranteed to exist -- no unsolvable deals, ever.

   The pile shows a number. A board card shows an equation and may be stacked
   on the pile when its answer equals that number; once stacked it turns into
   its answer, which is the number to match next. A gold card is a wild. */
(function (SM) {
  'use strict';

  var TOTAL_LEVELS = 600;
  var PER_WORLD = 50;

  var WORLDS = [
    { name: 'Addition',     hint: 'a + b',
      ops: ['add'], valMin: 2, valMax: 12, opMax: 9, sumMax: 20,
      sizes: ['tiny', 'small'], run: [3, 6], golds: 0 },
    { name: 'Subtraction',  hint: 'a − b',
      ops: ['sub'], valMin: 1, valMax: 12, opMax: 9, sumMax: 20,
      sizes: ['tiny', 'small'], run: [3, 6], golds: 0 },
    { name: 'Plus & Minus', hint: 'a + b and a − b',
      ops: ['add', 'sub'], valMin: 1, valMax: 15, opMax: 9, sumMax: 24,
      sizes: ['small', 'medium'], run: [3, 5], golds: 1 },
    { name: 'Times Tables', hint: 'a × b',
      ops: ['mul'], valMin: 4, valMax: 36, opMax: 9, sumMax: 81,
      sizes: ['small', 'medium'], run: [3, 5], golds: 1 },
    { name: 'Division',     hint: 'a ÷ b',
      ops: ['div'], valMin: 2, valMax: 12, opMax: 9, sumMax: 72,
      sizes: ['medium'], run: [3, 5], golds: 1 },
    { name: 'Times & Share', hint: 'a × b and a ÷ b',
      ops: ['mul', 'div'], valMin: 2, valMax: 24, opMax: 9, sumMax: 81,
      sizes: ['medium', 'large'], run: [3, 5], golds: 1 },
    { name: 'All Four',     hint: 'every operation',
      ops: ['add', 'sub', 'mul', 'div'], valMin: 2, valMax: 20, opMax: 9, sumMax: 81,
      sizes: ['medium', 'large'], run: [3, 5], golds: 1, stockGolds: 1 },
    { name: 'Big Numbers',  hint: 'two-digit sums',
      ops: ['add', 'sub'], valMin: 10, valMax: 40, opMax: 20, sumMax: 60,
      sizes: ['large'], run: [3, 4], golds: 1, stockGolds: 1 },
    { name: 'Two Steps',    hint: 'a + b − c',
      ops: ['addsub'], valMin: 2, valMax: 22, opMax: 12, sumMax: 40,
      sizes: ['large'], run: [3, 4], golds: 1, stockGolds: 1 },
    { name: 'Mixed Steps',  hint: 'a × b + c',
      ops: ['muladd', 'mul'], valMin: 5, valMax: 40, opMax: 9, sumMax: 81,
      sizes: ['large', 'huge'], run: [2, 4], golds: 2, stockGolds: 1 },
    { name: 'Number Master', hint: 'everything, mixed',
      ops: ['add', 'sub', 'mul', 'div', 'addsub'], valMin: 2, valMax: 30, opMax: 12, sumMax: 81,
      sizes: ['large', 'huge'], run: [2, 4], golds: 2, stockGolds: 1 },
    { name: 'Grand Master', hint: 'no mercy',
      ops: ['add', 'sub', 'mul', 'div', 'addsub', 'muladd'], valMin: 2, valMax: 40, opMax: 12, sumMax: 99,
      sizes: ['large', 'huge'], run: [2, 3], golds: 2, stockGolds: 1 }
  ];

  /* How many DIFFERENT numbers one board uses. The pile is matched by answer,
     so a drawn number is wasted unless some free card makes it -- which means
     the palette has to track how many cards a board leaves free at once.
     Wider boards can carry more numbers; deep ones need fewer to stay fair. */
  var PAL_K = [1.15, 1.15, 1.3, 1.3, 1.4, 1.45, 1.5, 1.55, 1.6, 1.65, 1.75, 1.85];

  /* Spare stock as a fraction of the board size. Bigger boards genuinely need
     more spare draws, so a flat count is unfair at both ends. */
  var SPARE = [0.20, 0.20, 0.82, 0.97, 0.90, 0.78, 0.56, 0.57, 0.57, 0.62, 0.58, 0.63];

  function worldOf(n) {
    return Math.max(0, Math.min(WORLDS.length - 1, Math.floor((n - 1) / PER_WORLD)));
  }

  function config(n) {
    var wi = worldOf(n);
    var w = WORLDS[wi];
    var i = (n - 1) % PER_WORLD;
    var boss = i === PER_WORLD - 1;

    var band = Math.min(w.sizes.length - 1, Math.floor(i / (PER_WORLD / w.sizes.length)));
    if (boss) band = w.sizes.length - 1;
    var pool = SM.layoutsBySize(w.sizes[band]);
    var layoutName = pool[(i + wi * 3) % pool.length];
    if (boss) {
      var big = SM.layoutsBySize(wi >= 6 ? 'huge' : 'large');
      layoutName = big[wi % big.length];
    }

    var step = Math.floor(i / 20);
    var run = [Math.max(2, w.run[0] - step), Math.max(3, w.run[1] - step)];
    var L = SM.parseLayout(layoutName);
    var cards = L.n;
    var palette = Math.max(3, Math.min(9, Math.round(L.free * PAL_K[wi]) + Math.floor(i / 25)));
    var spare = Math.max(3, Math.round(cards * (SPARE[wi] - i * 0.0012)));

    return {
      level: n, world: wi, worldName: w.name, indexInWorld: i, boss: boss,
      tier: w, layoutName: layoutName, run: run, spare: spare,
      palette: palette,
      golds: (w.golds || 0) + (boss ? 1 : 0),
      stockGolds: w.stockGolds || 0,
      hints: 3
    };
  }

  function freeOrder(L, rng) {
    var removed = new Array(L.n), order = [], z;
    for (z = 0; z < L.n; z++) removed[z] = false;
    for (var k = 0; k < L.n; k++) {
      var free = [];
      for (var i = 0; i < L.n; i++) {
        if (removed[i]) continue;
        var ok = true, cv = L.covers[i];
        for (var c = 0; c < cv.length; c++) if (!removed[cv[c]]) { ok = false; break; }
        if (ok) free.push(i);
      }
      var pick = free[rng.int(free.length)];
      removed[pick] = true;
      order.push(pick);
    }
    return order;
  }

  /* Score model: a card pays 100 x combo (combo caps at 8); unused stock pays 150. */
  function comboSum(m) {
    var s = 0;
    for (var i = 1; i <= m; i++) s += 100 * Math.min(i, 8);
    return s;
  }

  function scriptScore(solution, stockSize) {
    var combo = 0, s = 0, draws = 0;
    for (var i = 0; i < solution.length; i++) {
      if (solution[i].t === 'draw') { combo = 0; draws++; }
      else { combo++; s += 100 * Math.min(combo, 8); }
    }
    return s + Math.max(0, stockSize - draws) * 150;
  }

  /* Three stars: 62% of a flawless run, but never more than a shade above what
     the built-in solution scores, so every level's par is actually reachable. */
  function parScore(cards, stockSize, solution) {
    var ideal = comboSum(cards) + stockSize * 150;
    var script = scriptScore(solution, stockSize);
    return Math.max(500, Math.round(Math.min(ideal * 0.62, script * 1.2)));
  }

  function generate(n) {
    var cfg = config(n);
    var rng = SM.makeRng(n * 104729 + 7);
    var L = SM.parseLayout(cfg.layoutName);
    var N = L.n;
    var tier = cfg.tier;
    var VALUES = SM.tierValues(tier);
    var order = freeOrder(L, rng);

    var palette = rng.shuffle(VALUES.slice()).slice(0, Math.min(VALUES.length, cfg.palette));

    function pickVal(not) {
      if (palette.length < 2) return palette[0];
      var v, guard = 0;
      do { v = rng.pick(palette); } while (v === not && ++guard < 30);
      return v;
    }

    var values = new Array(N);
    var stock = [];
    var solution = [];
    var golds = cfg.golds;
    var target = pickVal(null);
    var startBase = target;
    var left = rng.range(cfg.run[0], cfg.run[1]);
    var avgRun = (cfg.run[0] + cfg.run[1]) / 2;
    var pendingWild = false;
    var draws = 0;

    for (var k = 0; k < N; k++) {
      var slot = order[k];
      if (pendingWild) {
        target = pickVal(target);
        pendingWild = false;
        left = rng.range(cfg.run[0], cfg.run[1]);
      } else if (left <= 0) {
        var switchesLeft = Math.max(1, (N - k) / avgRun);
        if (golds > 0 && k < N - 1 && rng.next() < Math.min(0.9, golds / switchesLeft)) {
          values[slot] = SM.WILD;
          solution.push({ t: 'play', id: slot });
          golds--; pendingWild = true;
          continue;
        }
        target = pickVal(target);
        stock.push(target); draws++;
        solution.push({ t: 'draw' });
        left = rng.range(cfg.run[0], cfg.run[1]);
      }
      values[slot] = target;
      left--;
      solution.push({ t: 'play', id: slot });
    }

    // Spare draws are appended AFTER the scripted ones so the solution survives,
    // and are sampled from numbers that really are on the board.
    var boardVals = values.filter(function (v) { return v !== SM.WILD; });
    var spares = [];
    for (var s = 0; s < cfg.spare; s++) spares.push(rng.pick(boardVals));
    for (var gg = 0; gg < cfg.stockGolds; gg++) {
      spares.splice(rng.int(spares.length + 1), 0, SM.WILD);
    }
    stock = stock.concat(spares);

    var cards = L.slots.map(function (sl, i) {
      var v = values[i];
      return {
        id: i, x: sl.x, y: sl.y, value: v,
        expr: v === SM.WILD ? null : SM.makeExpr(v, tier, rng),
        suit: rng.int(4)
      };
    });

    return {
      level: n, cfg: cfg, layout: L, cards: cards,
      stock: stock, startBase: { value: startBase, suit: rng.int(4) },
      scriptedDraws: draws, solution: solution,
      par: parScore(N, stock.length, solution)
    };
  }

  SM.TOTAL_LEVELS = TOTAL_LEVELS;
  SM.PER_WORLD = PER_WORLD;
  SM.WORLDS = WORLDS;
  SM.worldOf = worldOf;
  SM.levelConfig = config;
  SM.generate = generate;
})(window.SM = window.SM || {});
