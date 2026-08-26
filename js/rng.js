/* Seeded deterministic RNG -- every level is generated from its number,
   so all 600 levels are identical on every device with zero data files. */
(function (SM) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(n) {
    var h = 2166136261 ^ (n >>> 0);
    h = Math.imul(h, 16777619); h ^= h >>> 13;
    h = Math.imul(h, 16777619); h ^= h >>> 7;
    h = Math.imul(h, 16777619);
    return h >>> 0;
  }

  function makeRng(seed) {
    var r = mulberry32(hashSeed(seed));
    var api = {
      next: r,
      int: function (n) { return Math.floor(r() * n); },
      range: function (a, b) { return a + Math.floor(r() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(r() * arr.length)]; },
      chance: function (p) { return r() < p; },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(r() * (i + 1));
          var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      }
    };
    return api;
  }

  SM.makeRng = makeRng;
  SM.hashSeed = hashSeed;
})(window.SM = window.SM || {});
