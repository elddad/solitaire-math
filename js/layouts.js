/* Board layouts drawn as ASCII art.
   Each '#' is a card centre. One character = half a card width, so cards in a
   row must sit 2 columns apart. A card at (x,y) is covered by cards at
   (x-1,y+1) and (x+1,y+1) -- exactly the TriPeaks overlap rule. */
(function (SM) {
  'use strict';

  var ART = {
    'Cross': [
      '...#...',
      '..#.#..',
      '.#.#.#.',
      '..#.#..',
      '...#...'
    ],
    'Pyramid': [
      '....#....',
      '...#.#...',
      '..#.#.#..',
      '.#.#.#.#.',
      '#.#.#.#.#'
    ],
    'Twin Peaks': [
      '..#.....#..',
      '.#.#...#.#.',
      '#.#.#.#.#.#',
      '.#.#.#.#.#.'
    ],
    'Diamond': [
      '...#...',
      '..#.#..',
      '.#.#.#.',
      '#.#.#.#',
      '.#.#.#.',
      '..#.#..',
      '...#...'
    ],
    'Butterfly': [
      '#.#.....#.#',
      '.#.#...#.#.',
      '..#.#.#.#..',
      '...#.#.#...',
      '....#.#....'
    ],
    'Crown': [
      '#...#...#...#',
      '.#.#.#.#.#.#.',
      '..#...#...#..',
      '...#.#.#.#...',
      '....#...#....'
    ],
    'Fortress': [
      '#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.',
      '..#.#.#.#.#..',
      '...#.#.#.#...'
    ],
    'Wall': [
      '#.#.#.#.#.#',
      '.#.#.#.#.#.',
      '#.#.#.#.#.#',
      '.#.#.#.#.#.'
    ],
    'Tower': [
      '....#.#....',
      '...#.#.#...',
      '..#.#.#.#..',
      '.#.#.#.#.#.',
      '#.#.#.#.#.#',
      '.#.#.#.#.#.'
    ],
    'Three Peaks': [
      '..#.....#.....#..',
      '.#.#...#.#...#.#.',
      '#.#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.#.'
    ],
    'Grand Pyramid': [
      '......#......',
      '.....#.#.....',
      '....#.#.#....',
      '...#.#.#.#...',
      '..#.#.#.#.#..',
      '.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#'
    ],
    'Zigzag': [
      '#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#.#'
    ],
    'Cathedral': [
      '....#...#...#....',
      '...#.#.#.#.#.#...',
      '..#.#.#.#.#.#.#..',
      '.#.#.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#.#.#'
    ],
    'Twin Diamonds': [
      '...#.......#...',
      '..#.#.....#.#..',
      '.#.#.#...#.#.#.',
      '#.#.#.#.#.#.#.#',
      '.#.#.#...#.#.#.',
      '..#.#.....#.#..',
      '...#.......#...'
    ],
    'Spider': [
      '..#.#.#.#.#.#..',
      '.#.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.',
      '..#.#.#.#.#.#..'
    ],
    'Long Rows': [
      '#.#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.#.'
    ],
    'Twin Towers': [
      '..#.#.....#.#..',
      '.#.#.#...#.#.#.',
      '#.#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.#.',
      '..#.#.#.#.#.#..'
    ],
    'Hourglass': [
      '#.#.#.#.#.#.#',
      '.#.#.#.#.#.#.',
      '..#.#.#.#.#..',
      '...#.#.#.#...',
      '..#.#.#.#.#..',
      '.#.#.#.#.#.#.',
      '#.#.#.#.#.#.#'
    ]
  };

  var cache = {};

  /* How many cards are playable at once, averaged over random legal clearings.
     A deep narrow board offers 2, a wide flat one offers 5 -- by far the biggest
     driver of how hard a board is, so the level tuning reads it. */
  function avgFree(L) {
    var rng = SM.makeRng(L.n * 31 + L.h), total = 0, steps = 0;
    for (var t = 0; t < 40; t++) {
      var removed = new Array(L.n), i;
      for (i = 0; i < L.n; i++) removed[i] = false;
      for (var k = 0; k < L.n; k++) {
        var free = [];
        for (i = 0; i < L.n; i++) {
          if (removed[i]) continue;
          var ok = true, cv = L.covers[i];
          for (var c = 0; c < cv.length; c++) if (!removed[cv[c]]) { ok = false; break; }
          if (ok) free.push(i);
        }
        total += free.length; steps++;
        removed[free[rng.int(free.length)]] = true;
      }
    }
    return total / steps;
  }

  function parse(name) {
    if (cache[name]) return cache[name];
    var art = ART[name];
    var slots = [], maxX = 0, minX = 1e9;
    for (var y = 0; y < art.length; y++) {
      var row = art[y];
      for (var x = 0; x < row.length; x++) {
        if (row.charAt(x) === '#') {
          slots.push({ x: x, y: y });
          if (x > maxX) maxX = x;
          if (x < minX) minX = x;
        }
      }
    }
    // shift the whole board left so column 0 is always occupied
    if (minX > 0) {
      for (var m = 0; m < slots.length; m++) slots[m].x -= minX;
      maxX -= minX;
    }
    var index = {};
    for (var i = 0; i < slots.length; i++) index[slots[i].x + ',' + slots[i].y] = i;
    var covers = slots.map(function (s) {
      var out = [];
      var l = index[(s.x - 1) + ',' + (s.y + 1)];
      var r = index[(s.x + 1) + ',' + (s.y + 1)];
      if (l !== undefined) out.push(l);
      if (r !== undefined) out.push(r);
      return out;
    });
    var L = { name: name, slots: slots, covers: covers, w: maxX + 2, h: art.length, n: slots.length };
    L.free = avgFree(L);
    cache[name] = L;
    return L;
  }

  var NAMES = Object.keys(ART);
  var BY_SIZE = { tiny: [], small: [], medium: [], large: [], huge: [] };
  NAMES.forEach(function (name) {
    var n = parse(name).n;
    if (n <= 15) BY_SIZE.tiny.push(name);
    else if (n <= 21) BY_SIZE.small.push(name);
    else if (n <= 27) BY_SIZE.medium.push(name);
    else if (n <= 34) BY_SIZE.large.push(name);
    else BY_SIZE.huge.push(name);
  });

  SM.layoutNames = NAMES;
  SM.parseLayout = parse;
  SM.layoutsBySize = function (size) { return BY_SIZE[size] && BY_SIZE[size].length ? BY_SIZE[size] : NAMES; };
})(window.SM = window.SM || {});
