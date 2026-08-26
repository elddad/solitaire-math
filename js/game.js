/* Pure game state. No DOM in here. */
(function (SM) {
  'use strict';

  var COMBO_CAP = 8;
  var STOCK_BONUS = 150;

  function newGame(level) {
    var data = SM.generate(level);
    return {
      level: level,
      data: data,
      match: SM.matchValue,
      cleared: data.cards.map(function () { return false; }),
      stockIdx: 0,
      pile: [],
      history: [],
      base: data.startBase.value,
      score: 0,
      combo: 0,
      moves: 0,
      hints: data.cfg.hints,
      hintsUsed: 0,
      undos: 0,
      startedAt: Date.now(),
      elapsed: 0,
      status: 'playing'
    };
  }

  function isFree(g, id) {
    if (g.cleared[id]) return false;
    var cv = g.data.layout.covers[id];
    for (var i = 0; i < cv.length; i++) if (!g.cleared[cv[i]]) return false;
    return true;
  }

  function canPlay(g, id) {
    return g.status === 'playing' && isFree(g, id) &&
      g.match(g.data.cards[id].value, g.base);
  }

  function legalMoves(g) {
    var out = [];
    for (var i = 0; i < g.cleared.length; i++) if (canPlay(g, i)) out.push(i);
    return out;
  }

  function stockLeft(g) { return g.data.stock.length - g.stockIdx; }

  function clearedCount(g) {
    var c = 0;
    for (var i = 0; i < g.cleared.length; i++) if (g.cleared[i]) c++;
    return c;
  }

  function evaluate(g) {
    if (clearedCount(g) === g.cleared.length) {
      g.status = 'won';
      g.score += stockLeft(g) * STOCK_BONUS;
      g.elapsed = Date.now() - g.startedAt;
    } else if (legalMoves(g).length === 0 && stockLeft(g) === 0) {
      g.status = 'lost';
      g.elapsed = Date.now() - g.startedAt;
    }
  }

  function snapshot(g) {
    return { base: g.base, score: g.score, combo: g.combo };
  }

  function play(g, id) {
    if (!canPlay(g, id)) return false;
    g.history.push({ t: 'play', id: id, s: snapshot(g) });
    g.cleared[id] = true;
    g.combo += 1;
    g.score += 100 * Math.min(g.combo, COMBO_CAP);
    g.base = g.data.cards[id].value;
    g.pile.push({ k: 'board', id: id });
    g.moves++;
    evaluate(g);
    return true;
  }

  function draw(g) {
    if (g.status !== 'playing' || stockLeft(g) === 0) return false;
    g.history.push({ t: 'draw', s: snapshot(g) });
    var idx = g.stockIdx++;
    g.base = g.data.stock[idx];
    g.combo = 0;
    g.pile.push({ k: 'stock', id: idx });
    g.moves++;
    evaluate(g);
    return true;
  }

  function undo(g) {
    if (!g.history.length) return false;
    var h = g.history.pop();
    if (h.t === 'play') g.cleared[h.id] = false;
    else g.stockIdx--;
    g.pile.pop();
    g.base = h.s.base;
    g.score = h.s.score;
    g.combo = h.s.combo;
    g.status = 'playing';
    g.undos++;
    return true;
  }

  function hint(g) {
    var moves = legalMoves(g);
    if (!moves.length) return null;
    var best = null, bestScore = -1;
    var cv = g.data.layout.covers;
    for (var i = 0; i < moves.length; i++) {
      var id = moves[i];
      var prevBase = g.base;
      g.cleared[id] = true;
      g.base = g.data.cards[id].rank;
      var follow = legalMoves(g).length;
      g.base = prevBase;
      g.cleared[id] = false;
      var opens = 0;
      for (var j = 0; j < cv.length; j++) {
        if (!g.cleared[j] && cv[j].indexOf(id) >= 0) opens++;
      }
      var s = follow * 3 + opens * 2;
      if (s > bestScore) { bestScore = s; best = id; }
    }
    return best;
  }

  function stars(g) {
    if (g.status !== 'won') return 0;
    var par = g.data.par;
    if (g.score >= par) return 3;
    if (g.score >= Math.round(par * 0.7)) return 2;
    return 1;
  }

  SM.game = {
    newGame: newGame, isFree: isFree, canPlay: canPlay, legalMoves: legalMoves,
    stockLeft: stockLeft, clearedCount: clearedCount, play: play, draw: draw,
    undo: undo, hint: hint, stars: stars, COMBO_CAP: COMBO_CAP
  };
})(window.SM = window.SM || {});
