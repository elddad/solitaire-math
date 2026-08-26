/* Tiny WebAudio blips, so the whole game stays plain text in one repo. */
(function (SM) {
  'use strict';
  var ctx = null;

  function enabled() { return SM.store.load().sound !== false; }

  function ensure() {
    if (!enabled()) return null;
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function tone(freq, dur, type, vol, delay) {
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator(), gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.14, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  SM.sfx = {
    play: function (combo) { tone(440 * Math.pow(2, Math.min(combo, 12) / 12), 0.13, 'triangle', 0.13); },
    draw: function () { tone(280, 0.1, 'sine', 0.1); },
    deny: function () { tone(150, 0.12, 'sawtooth', 0.06); },
    hint: function () { tone(880, 0.09, 'sine', 0.09); },
    undo: function () { tone(320, 0.09, 'sine', 0.08); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.28, 'triangle', 0.13, i * 0.09); }); },
    lose: function () { [392, 349, 294].forEach(function (f, i) { tone(f, 0.3, 'sine', 0.11, i * 0.12); }); },
    star: function (i) { tone(660 + i * 220, 0.22, 'triangle', 0.14); }
  };

  SM.audioUnlock = function () { ensure(); };
})(window.SM = window.SM || {});
