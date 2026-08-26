/* Progress in localStorage. Degrades quietly if storage is unavailable. */
(function (SM) {
  'use strict';
  var KEY = 'solitaire-math-v1';
  var mem = null;

  function blank() {
    return { unlocked: 1, stars: {}, best: {}, fails: {}, sound: true, level: 1 };
  }

  function load() {
    if (mem) return mem;
    try {
      var raw = localStorage.getItem(KEY);
      mem = raw ? JSON.parse(raw) : blank();
    } catch (e) { mem = blank(); }
    var b = blank();
    for (var k in b) if (!(k in mem)) mem[k] = b[k];
    return mem;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) {}
  }

  function recordWin(level, score, starCount) {
    var d = load();
    d.stars[level] = Math.max(d.stars[level] || 0, starCount);
    if (score > (d.best[level] || 0)) d.best[level] = score;
    d.unlocked = Math.max(d.unlocked, Math.min(SM.TOTAL_LEVELS, level + 1));
    d.level = Math.min(SM.TOTAL_LEVELS, level + 1);
    delete d.fails[level];
    save();
  }

  function recordLoss(level) {
    var d = load();
    d.fails[level] = (d.fails[level] || 0) + 1;
    save();
    return d.fails[level];
  }

  function unlock(level) {
    var d = load();
    d.unlocked = Math.max(d.unlocked, Math.min(SM.TOTAL_LEVELS, level));
    d.level = Math.max(d.level, Math.min(SM.TOTAL_LEVELS, level));
    save();
  }

  function totals() {
    var d = load(), s = 0, c = 0, best = 0;
    for (var k in d.stars) { s += d.stars[k]; c++; }
    for (var b in d.best) best = Math.max(best, d.best[b]);
    return { stars: s, cleared: c, best: best };
  }

  function reset() { mem = blank(); save(); }

  SM.store = {
    load: load, save: save, recordWin: recordWin, recordLoss: recordLoss,
    unlock: unlock, totals: totals, reset: reset
  };
})(window.SM = window.SM || {});
