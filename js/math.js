/* The maths layer.
   A board card carries an EQUATION; its answer is the card value.
   A card may be stacked on the pile when its answer equals the pile number.
   The gold card is a wild: it stacks on anything, and anything stacks on it. */
(function (SM) {
  'use strict';

  var WILD = -1;
  var TIMES = '\u00d7';   // x
  var DIV = '\u00f7';     // divide
  var MINUS = '\u2212';   // proper minus sign

  function matchValue(a, b) {
    return a === WILD || b === WILD || a === b;
  }

  /* ---- equation builders -------------------------------------------------
     Each builder answers two questions: can this value be written this way
     (feasible), and give me one such equation (build). Feasibility is checked
     without the RNG so a level can pick only values it can actually print. */

  function factorPairs(v, opMax) {
    var out = [];
    for (var a = 2; a <= opMax && a <= v; a++) {
      if (v % a === 0 && v / a <= opMax && v / a >= 2) out.push([a, v / a]);
    }
    return out;   // no 1 x n filler -- a times-table card should be a real product
  }

  var BUILDERS = {
    add: {
      lo: function (v, t) { return Math.max(1, v - t.opMax); },
      hi: function (v, t) { return Math.min(v - 1, t.opMax); },
      feasible: function (v, t) { return v >= 2 && this.lo(v, t) <= this.hi(v, t); },
      build: function (v, t, rng) {
        var a = rng.range(this.lo(v, t), this.hi(v, t));
        return a + ' + ' + (v - a);
      }
    },
    sub: {
      feasible: function (v, t) { return v >= 1 && v + 1 <= t.sumMax; },
      build: function (v, t, rng) {
        var b = rng.range(1, Math.min(t.opMax, t.sumMax - v));
        return (v + b) + ' ' + MINUS + ' ' + b;
      }
    },
    mul: {
      feasible: function (v, t) { return v >= 2 && factorPairs(v, t.opMax).length > 0; },
      build: function (v, t, rng) {
        var p = rng.pick(factorPairs(v, t.opMax));
        return p[0] + ' ' + TIMES + ' ' + p[1];
      }
    },
    div: {
      feasible: function (v, t) { return v >= 1 && v * 2 <= t.sumMax; },
      build: function (v, t, rng) {
        var hiB = Math.min(9, Math.floor(t.sumMax / v));
        var b = rng.range(2, Math.max(2, hiB));
        return (v * b) + ' ' + DIV + ' ' + b;
      }
    },
    /* two-step: a + b - c  */
    addsub: {
      // v = a + b - c, so v + c must be reachable as a + b with both <= opMax
      cMax: function (v, t) { return Math.min(t.opMax, t.sumMax - v, 2 * t.opMax - v); },
      feasible: function (v, t) { return v >= 1 && this.cMax(v, t) >= 1; },
      build: function (v, t, rng) {
        var c = rng.range(1, this.cMax(v, t));
        var w = v + c;
        var lo = Math.max(1, w - t.opMax), hi = Math.min(w - 1, t.opMax);
        if (lo > hi) return null;
        var a = rng.range(lo, hi);
        return a + ' + ' + (w - a) + ' ' + MINUS + ' ' + c;
      }
    },
    /* two-step: a x b +/- c  */
    muladd: {
      feasible: function (v, t) {
        for (var a = 2; a <= 9; a++) {
          for (var b = 2; b <= 9; b++) {
            var d = v - a * b;
            if (d !== 0 && Math.abs(d) <= t.opMax) return true;
          }
        }
        return false;
      },
      build: function (v, t, rng) {
        var opts = [];
        for (var a = 2; a <= 9; a++) {
          for (var b = a; b <= 9; b++) {
            var d = v - a * b;
            if (d !== 0 && Math.abs(d) <= t.opMax) opts.push([a, b, d]);
          }
        }
        if (!opts.length) return null;
        var o = rng.pick(opts);
        return o[0] + ' ' + TIMES + ' ' + o[1] + (o[2] > 0 ? ' + ' + o[2] : ' ' + MINUS + ' ' + (-o[2]));
      }
    }
  };

  function feasible(v, tier) {
    for (var i = 0; i < tier.ops.length; i++) {
      if (BUILDERS[tier.ops[i]].feasible(v, tier)) return true;
    }
    return false;
  }

  /* every value in the tier range that can actually be written as an equation */
  function tierValues(tier) {
    if (tier._values) return tier._values;
    var out = [];
    for (var v = tier.valMin; v <= tier.valMax; v++) if (feasible(v, tier)) out.push(v);
    tier._values = out;
    return out;
  }

  function makeExpr(v, tier, rng) {
    var ops = tier.ops.filter(function (o) { return BUILDERS[o].feasible(v, tier); });
    for (var tries = 0; tries < 8 && ops.length; tries++) {
      var op = rng.pick(ops);
      var txt = BUILDERS[op].build(v, tier, rng);
      if (txt) return txt;
    }
    // last resort: the plainest sum that exists
    if (BUILDERS.add.feasible(v, tier)) return BUILDERS.add.build(v, tier, rng);
    return String(v);
  }

  SM.WILD = WILD;
  SM.TIMES = TIMES;
  SM.DIV = DIV;
  SM.MINUS = MINUS;
  SM.matchValue = matchValue;
  SM.tierValues = tierValues;
  SM.makeExpr = makeExpr;
  SM.exprFeasible = feasible;
})(window.SM = window.SM || {});

/* Split an equation for display: three-operand equations get a second line so
   the type never has to shrink to nothing on a narrow card. */
(function (SM) {
  'use strict';
  SM.exprLines = function (expr) {
    if (!expr) return [''];
    var t = expr.split(/\s+/);
    if (t.length >= 5) return [t[0] + t[1] + t[2], t[3] + t[4]];
    return [t.join('')];
  };
})(window.SM = window.SM || {});
