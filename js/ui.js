/* All DOM handling: screens, board rendering, input, overlays. */
(function (SM) {
  'use strict';

  var SUITS = ['\u2660', '\u2665', '\u2663', '\u2666'];
  var SUIT_RED = [false, true, false, true];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.innerHTML = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2000);
  }

  /* ---------------- screens ---------------- */
  var current = 'home';
  function show(name) {
    current = name;
    ['home', 'levels', 'game'].forEach(function (s) {
      $('screen-' + s).classList.toggle('is-active', s === name);
    });
    if (name === 'home') refreshHome();
    if (name === 'levels') refreshLevels();
    if (name === 'game') requestAnimationFrame(function () { layout(); });
  }

  function openSheet(html, wire) {
    var sheet = $('sheet');
    sheet.innerHTML = html;
    $('overlay').hidden = false;
    if (wire) wire(sheet);
  }
  function closeSheet() { $('overlay').hidden = true; }

  /* ---------------- home ---------------- */
  function refreshHome() {
    var d = SM.store.load(), t = SM.store.totals();
    $('home-level').textContent = 'Level ' + Math.min(d.level || 1, SM.TOTAL_LEVELS);
    $('stat-stars').textContent = t.stars;
    $('stat-cleared').textContent = t.cleared;
    $('stat-best').textContent = t.best.toLocaleString();
    $('btn-sound').textContent = d.sound === false ? '\ud83d\udd07' : '\ud83d\udd0a';
  }

  /* ---------------- level select ---------------- */
  var shownWorld = 0;

  function refreshLevels() {
    var d = SM.store.load();
    shownWorld = SM.worldOf(Math.min(d.level || 1, SM.TOTAL_LEVELS));
    buildWorldTabs();
    buildGrid(shownWorld);
    $('levels-stars').textContent = SM.store.totals().stars;
  }

  function buildWorldTabs() {
    var wrap = $('worlds');
    wrap.innerHTML = '';
    var d = SM.store.load();
    SM.WORLDS.forEach(function (w, i) {
      var first = i * SM.PER_WORLD + 1;
      var b = el('button', 'world-tab', w.name);
      if (i === shownWorld) b.classList.add('is-on');
      if (first > d.unlocked) b.classList.add('is-locked');
      b.onclick = function () { shownWorld = i; buildWorldTabs(); buildGrid(i); };
      wrap.appendChild(b);
    });
    var on = wrap.querySelector('.is-on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function buildGrid(w) {
    var d = SM.store.load();
    var grid = $('level-grid');
    grid.innerHTML = '';
    var from = w * SM.PER_WORLD + 1;
    var to = Math.min(SM.TOTAL_LEVELS, from + SM.PER_WORLD - 1);
    $('levels-title').textContent = SM.WORLDS[w].name + '  ' + from + '-' + to;
    for (var n = from; n <= to; n++) {
      (function (n) {
        var locked = n > d.unlocked;
        var st = d.stars[n] || 0;
        var b = el('button', 'lvl' + (locked ? ' is-locked' : '') +
          (st ? ' is-done' : '') + (n === d.unlocked && !st ? ' is-next' : ''));
        b.appendChild(el('span', 'n', locked ? '\ud83d\udd12' : String(n)));
        b.appendChild(el('span', 'st', st ? new Array(st + 1).join('\u2605') : ''));
        if (!locked) b.onclick = function () { startLevel(n); };
        grid.appendChild(b);
      })(n);
    }
  }

  /* ---------------- cards ---------------- */
  var G = null;
  var cardEls = [];
  var stockEls = [];
  var geom = null;
  var hintTimer = null;
  var ROW_STEP = 0.5;   // fraction of a card height between rows

  function isWild(v) { return v === SM.WILD; }

  function clsFor(value, suit, numOnly) {
    return 'card' +
      (isWild(value) ? ' gold numonly' : (SUIT_RED[suit] ? ' red' : '')) +
      (numOnly && !isWild(value) ? ' numonly' : '');
  }

  /* card: {value, expr, suit}. numOnly cards (stock, pile) show the bare number. */
  function makeCardEl(card, numOnly, faceDown) {
    var c = el('div', clsFor(card.value, card.suit, numOnly) + (faceDown ? ' is-down' : ''));
    var f = el('div', 'face');

    if (isWild(card.value)) {
      f.appendChild(el('div', 'val', '\u2605'));
      f.appendChild(el('div', 'wildtag', 'WILD'));
    } else {
      var lines = SM.exprLines(card.expr);
      var ex = el('div', 'expr');
      var widest = 0;
      lines.forEach(function (ln) {
        ex.appendChild(el('div', 'exline', ln));
        if (ln.length > widest) widest = ln.length;
      });
      ex.dataset.chars = widest;
      ex.dataset.lines = lines.length;
      f.appendChild(ex);
      f.appendChild(el('div', 'val', String(card.value)));
      f.appendChild(el('div', 'pip tl', SUITS[card.suit]));
      f.appendChild(el('div', 'pip br', SUITS[card.suit]));
    }

    c.appendChild(f);
    c.appendChild(el('div', 'back'));
    return c;
  }

  function buildTable() {
    var table = $('table');
    table.innerHTML = '';
    cardEls = []; stockEls = [];

    var startEl = makeCardEl(G.data.startBase, true);
    startEl.dataset.role = 'startbase';
    table.appendChild(startEl);
    G._startEl = startEl;

    G.data.stock.forEach(function (value, i) {
      var e = makeCardEl({ value: value, suit: (i * 3 + 1) % 4 }, true, true);
      e.onclick = onStockClick;
      table.appendChild(e);
      stockEls.push(e);
    });

    G.data.cards.forEach(function (c) {
      var e = makeCardEl(c, false);
      e.onclick = function () { onCardClick(c.id); };
      table.appendChild(e);
      cardEls.push(e);
    });

    var f = {};
    f.stockSlot = el('div', 'slot');
    f.baseSlot = el('div', 'slot');
    f.stockLbl = el('div', 'slot-label', 'stock');
    f.baseLbl = el('div', 'slot-label', 'pile');
    f.stockNum = el('div', 'stock-count');
    f.stockHit = el('div', 'hit');
    f.stockHit.onclick = onStockClick;
    f.stockHit.dataset.role = 'stockhit';
    Object.keys(f).forEach(function (k) { table.appendChild(f[k]); });
    G._furniture = f;
  }

  /* ---------------- geometry ---------------- */
  function layout() {
    if (!G) return;
    var wrap = $('table-wrap');
    var W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;
    var L = G.data.layout;
    var pad = 8;

    var unitW = (W - pad * 2) / L.w;
    var k = ROW_STEP * (L.h - 1) + 2.45;
    var unitH = (H - pad * 2) / (2 * 1.42 * k);
    var unit = Math.min(unitW, unitH, 46);

    var cardW = unit * 2, cardH = cardW * 1.42, rowStep = cardH * ROW_STEP;
    var boardH = (L.h - 1) * rowStep + cardH;
    var totalH = boardH + cardH * 0.22 + cardH * 1.28;
    var offX = (W - L.w * unit) / 2 + unit;
    var offY = Math.max(pad, (H - totalH) / 2);
    var bottomY = offY + boardH + cardH * 0.22;
    var cx = W / 2;

    geom = {
      unit: unit, cardW: cardW, cardH: cardH, rowStep: rowStep, offX: offX, offY: offY,
      stock: { x: cx - cardW * 0.9 - cardW / 2, y: bottomY },
      base: { x: cx + cardW * 0.9 - cardW / 2, y: bottomY }
    };

    var table = $('table');
    table.style.setProperty('--card-w', cardW.toFixed(1) + 'px');
    table.style.setProperty('--card-h', cardH.toFixed(1) + 'px');

    // Size every equation to the card it lives on, then measure and shrink any
    // that still overflow -- guessing from the character count alone is not safe
    // across fonts. Written in two passes so the browser reflows only once.
    var exprs = table.querySelectorAll('.expr');
    var avail = cardW * 0.9, i, e, lines;
    for (i = 0; i < exprs.length; i++) {
      e = exprs[i];
      lines = +e.dataset.lines || 1;
      var chars = +e.dataset.chars || 3;
      var fs = Math.min(cardH * (lines > 1 ? 0.19 : 0.28), avail / (chars * 0.62));
      e.style.fontSize = fs.toFixed(2) + 'px';
      e.style.top = (lines > 1 ? 12 : 19) + '%';
    }
    for (i = 0; i < exprs.length; i++) {
      e = exprs[i];
      var natural = 0, kids = e.children;
      for (var c = 0; c < kids.length; c++) natural = Math.max(natural, kids[c].scrollWidth);
      if (natural > avail) {
        var cur = parseFloat(e.style.fontSize);
        e.style.fontSize = (cur * avail / natural).toFixed(2) + 'px';
      }
    }

    var f = G._furniture;
    place(f.stockSlot, geom.stock.x, geom.stock.y, 1);
    place(f.baseSlot, geom.base.x, geom.base.y, 1);
    place(f.stockHit, geom.stock.x, geom.stock.y, 350);
    place(f.stockLbl, geom.stock.x, geom.stock.y + cardH + 4, 1);
    place(f.baseLbl, geom.base.x, geom.base.y + cardH + 4, 1);
    place(f.stockNum, geom.stock.x, geom.stock.y + cardH * 0.5 - 11, 360);

    render();
  }

  function place(node, x, y, z) {
    node.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    if (z !== undefined) node.style.zIndex = z;
  }

  function boardPos(c) {
    return {
      x: geom.offX + c.x * geom.unit - geom.cardW / 2,
      y: geom.offY + c.y * geom.rowStep
    };
  }

  /* ---------------- render ---------------- */
  function fanX(i) { return ((i % 3) - 1) * 1.6; }
  function fanY(i) { return -Math.min(i, 10) * 0.7; }

  function render() {
    if (!G || !geom) return;
    var pileIdx = {};
    G.pile.forEach(function (p, i) { pileIdx[p.k + ':' + p.id] = i; });

    G._startEl.className = clsFor(G.data.startBase.value, G.data.startBase.suit, true);
    place(G._startEl, geom.base.x, geom.base.y, 300);

    G.data.cards.forEach(function (c, i) {
      var e = cardEls[i];
      var pi = pileIdx['board:' + i];
      if (pi !== undefined) {
        // stacked on the pile: the equation turns into its answer
        place(e, geom.base.x + fanX(pi), geom.base.y + fanY(pi), 301 + pi);
        e.className = clsFor(c.value, c.suit) + ' solved';
      } else {
        var p = boardPos(c);
        place(e, p.x, p.y, 10 + c.y * 2);
        // Deliberately no 'this one fits' highlight: working out which
        // equations match the pile is the game. Only cover state is shown.
        var cls = clsFor(c.value, c.suit);
        if (!SM.game.isFree(G, i)) cls += ' blocked';
        e.className = cls;
      }
    });

    G.data.stock.forEach(function (value, j) {
      var e = stockEls[j];
      var pi = pileIdx['stock:' + j];
      if (pi !== undefined) {
        place(e, geom.base.x + fanX(pi), geom.base.y + fanY(pi), 301 + pi);
        e.className = clsFor(value, (j * 3 + 1) % 4, true);
      } else {
        var depth = Math.min(j - G.stockIdx, 6);
        place(e, geom.stock.x, geom.stock.y - depth * 1.1, 200 - j);
        e.className = clsFor(value, (j * 3 + 1) % 4, true) + ' is-down';
      }
    });

    // mark whatever is on top of the pile -- that is the number to match
    var topEl = G._startEl;
    if (G.pile.length) {
      var top = G.pile[G.pile.length - 1];
      topEl = top.k === 'board' ? cardEls[top.id] : stockEls[top.id];
    }
    topEl.className += ' pile-top';

    hud();
  }

  function targetText() {
    return isWild(G.base) ? 'Play anything' : 'Make ' + G.base;
  }

  function hud() {
    var left = SM.game.stockLeft(G);
    G._furniture.stockNum.textContent = left ? left : '';
    G._furniture.stockLbl.textContent = left ? 'stock' : 'empty';
    $('hud-level').textContent = 'Level ' + G.level;
    var badge = $('hud-rule');
    badge.textContent = targetText();
    badge.classList.toggle('is-wild', isWild(G.base));
    $('hud-score').textContent = G.score.toLocaleString();
    $('hud-combo').textContent = G.combo >= 2 ? 'combo x' + Math.min(G.combo, SM.game.COMBO_CAP) : '';
    $('hint-count').textContent = G.hints;
    $('btn-undo').disabled = !G.history.length;
    $('btn-hint').disabled = G.hints <= 0;
  }

  function shake(e) {
    e.classList.remove('shake');
    void e.offsetWidth;
    e.classList.add('shake');
    setTimeout(function () { e.classList.remove('shake'); }, 340);
  }

  function floater(text, pos) {
    var f = el('div', 'floater', text);
    f.style.setProperty('--fx', pos.x.toFixed(1) + 'px');
    f.style.setProperty('--fy', pos.y.toFixed(1) + 'px');
    f.style.zIndex = 900;
    $('table').appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
  }

  /* ---------------- input ---------------- */
  function onCardClick(id) {
    if (!G || G.status !== 'playing') return;
    SM.audioUnlock();
    var card = G.data.cards[id];
    if (SM.game.canPlay(G, id)) {
      var pos = boardPos(card);
      SM.game.play(G, id);
      SM.sfx.play(G.combo);
      floater('+' + (100 * Math.min(G.combo, SM.game.COMBO_CAP)), pos);
      afterMove();
    } else {
      SM.sfx.deny();
      shake(cardEls[id]);
      if (!SM.game.isFree(G, id)) toast('That card is still covered');
      else if (!isWild(card.value)) toast(card.expr.replace(/\s+/g, '') + ' = <b>' + card.value +
        '</b>, and the pile needs <b>' + G.base + '</b>');
    }
  }

  function onStockClick() {
    if (!G || G.status !== 'playing') return;
    SM.audioUnlock();
    if (SM.game.stockLeft(G) === 0) { SM.sfx.deny(); toast('The stock is empty'); return; }
    SM.game.draw(G);
    SM.sfx.draw();
    afterMove();
  }

  function afterMove() {
    render();
    if (G.status === 'won') setTimeout(winSheet, 520);
    else if (G.status === 'lost') setTimeout(loseSheet, 460);
  }

  function doUndo() {
    if (!G || !G.history.length) return;
    SM.audioUnlock();
    SM.game.undo(G);
    SM.sfx.undo();
    render();
  }

  function doHint() {
    if (!G || G.status !== 'playing') return;
    SM.audioUnlock();
    if (G.hints <= 0) { SM.sfx.deny(); toast('No hints left on this level'); return; }
    var id = SM.game.hint(G);
    if (id === null) {
      SM.sfx.deny();
      toast(SM.game.stockLeft(G) > 0 ? 'Nothing makes ' + G.base + ' - draw a card' : 'No moves left');
      return;
    }
    G.hints--; G.hintsUsed++;
    SM.sfx.hint();
    render();
    var e = cardEls[id];
    e.classList.add('hinted');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { e.classList.remove('hinted'); }, 1700);
  }

  /* ---------------- level flow ---------------- */
  function startLevel(n) {
    n = Math.max(1, Math.min(SM.TOTAL_LEVELS, n));
    G = SM.game.newGame(n);
    var d = SM.store.load();
    d.level = n;
    SM.store.save();
    buildTable();
    closeSheet();
    show('game');
    layout();
    toast('Level ' + n + ' &middot; <b>' + G.data.cfg.worldName + '</b> &middot; ' + G.data.cfg.tier.hint);
  }

  function fmtTime(ms) {
    var s = Math.round(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function winSheet() {
    var st = SM.game.stars(G);
    SM.store.recordWin(G.level, G.score, st);
    SM.sfx.win();
    var last = G.level >= SM.TOTAL_LEVELS;
    openSheet(
      '<h2>' + (last ? 'All 600 cleared!' : 'Board cleared!') + '</h2>' +
      '<p class="sub">Level ' + G.level + ' &middot; ' + G.data.cfg.worldName + '</p>' +
      '<div class="stars"><i>&#9733;</i><i>&#9733;</i><i>&#9733;</i></div>' +
      '<div class="scoreline"><span>Score</span><b>' + G.score.toLocaleString() + '</b></div>' +
      '<div class="scoreline"><span>Three-star target</span><b>' + G.data.par.toLocaleString() + '</b></div>' +
      '<div class="scoreline"><span>Equations solved</span><b>' + G.data.cards.length + '</b></div>' +
      '<div class="scoreline"><span>Stock left</span><b>' + SM.game.stockLeft(G) + '</b></div>' +
      '<div class="scoreline"><span>Time</span><b>' + fmtTime(G.elapsed) + '</b></div>' +
      '<div class="actions">' +
        '<button class="btn" data-act="levels">Levels</button>' +
        '<button class="btn" data-act="replay">Replay</button>' +
        (last ? '' : '<button class="btn btn-primary" data-act="next">Next</button>') +
      '</div>',
      function (sheet) {
        var stars = sheet.querySelectorAll('.stars i');
        for (var i = 0; i < st; i++) {
          (function (i) {
            setTimeout(function () { stars[i].classList.add('on'); SM.sfx.star(i); }, 260 + i * 260);
          })(i);
        }
        wireActions(sheet);
      }
    );
  }

  function loseSheet() {
    var fails = SM.store.recordLoss(G.level);
    SM.sfx.lose();
    var left = G.data.cards.length - SM.game.clearedCount(G);
    openSheet(
      '<h2>No moves left</h2>' +
      '<p class="sub">' + left + ' card' + (left === 1 ? '' : 's') + ' still on the board</p>' +
      '<div class="rule-box">Every level has a guaranteed solution &mdash; step back a few moves and ' +
      'clear the numbers in a different order, or deal again.</div>' +
      '<div class="actions">' +
        '<button class="btn" data-act="levels">Levels</button>' +
        '<button class="btn" data-act="undo">Undo</button>' +
        '<button class="btn btn-primary" data-act="replay">Retry</button>' +
      '</div>' +
      (fails >= 3 && G.level < SM.TOTAL_LEVELS
        ? '<div class="actions"><button class="btn" data-act="skip">Skip this level</button></div>'
        : ''),
      wireActions
    );
  }

  function wireActions(sheet) {
    sheet.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.act;
        closeSheet();
        if (a === 'levels') show('levels');
        else if (a === 'replay') startLevel(G.level);
        else if (a === 'next') startLevel(G.level + 1);
        else if (a === 'undo') doUndo();
        else if (a === 'skip') { SM.store.unlock(G.level + 1); startLevel(G.level + 1); }
      };
    });
  }

  function miniCard(txt, cls) {
    return '<div class="mini ' + (cls || '') + '">' + txt + '</div>';
  }

  function ruleSheet() {
    var cfg = G ? G.data.cfg : SM.levelConfig(1);
    var ex = null;
    if (G) {
      for (var i = 0; i < G.data.cards.length; i++) {
        if (!isWild(G.data.cards[i].value)) { ex = G.data.cards[i]; break; }
      }
    }
    var exHtml = ex
      ? '<div class="example">' + miniCard(ex.expr.replace(/\s+/g, ''), 'wide') +
        '<span class="arrow">&#8594;</span>' + miniCard(ex.value) +
        '<span style="opacity:.7;font-size:13px">&nbsp;play it on a ' + ex.value + '</span></div>'
      : '';
    openSheet(
      '<h2>' + cfg.worldName + '</h2>' +
      '<p class="sub">Levels ' + (cfg.world * SM.PER_WORLD + 1) + '&ndash;' +
        (cfg.world * SM.PER_WORLD + SM.PER_WORLD) + ' &middot; ' + cfg.tier.hint + '</p>' +
      '<div class="rule-box">Every board card is an <b>equation</b>. Work out its answer, then stack ' +
      'it on the pile when the answer <b>equals the number on the pile</b>. The card flips to its ' +
      'answer, and that answer is the number to match next.' +
      (cfg.golds ? '<br><br>A <b>gold card</b> is wild: play it on any number, and after it any ' +
        'number may be played.' : '') +
      '</div>' + exHtml +
      '<div class="actions"><button class="btn btn-primary" data-act="close">Got it</button></div>',
      wireActions
    );
  }

  function howSheet() {
    openSheet(
      '<h2>How to play</h2>' +
      '<ol>' +
      '<li>The <b>pile</b> shows a number. Every board card shows an <b>equation</b>.</li>' +
      '<li>Solve a card in your head. If its answer equals the pile number, tap it &mdash; ' +
      '<b>3&times;3</b> goes onto a <b>9</b>, and lands showing <b>9</b>.</li>' +
      '<li>Only <b>free</b> cards can be played. A card is blocked while another lies on top of it.</li>' +
      '<li>Stuck? Tap the <b>stock</b> for a new pile number. That resets your combo.</li>' +
      '<li>A <b>gold card</b> is wild &mdash; it plays on anything, and anything plays on it.</li>' +
      '<li>Clear the whole board to win. Each card in a row is worth more; leftover stock pays 150 each.</li>' +
      '</ol>' +
      '<div class="rule-box">The maths grows every 50 levels: adding, subtracting, times tables, ' +
      'division, then two-step equations like <b>7&times;6&minus;2</b>.</div>' +
      '<div class="actions"><button class="btn btn-primary" data-act="close">Close</button></div>',
      wireActions
    );
  }

  /* ---------------- boot ---------------- */
  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (current === 'game') layout(); }, 90);
  }

  function boot() {
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.onclick = function () { show(b.dataset.nav); };
    });

    $('btn-continue').onclick = function () {
      SM.audioUnlock();
      var d = SM.store.load();
      var first = !d.seenHow;
      startLevel(Math.min(d.level || 1, SM.TOTAL_LEVELS));
      if (first) { d.seenHow = true; SM.store.save(); howSheet(); }
    };
    $('btn-levels').onclick = function () { show('levels'); };
    $('btn-how').onclick = howSheet;
    $('btn-sound').onclick = function () {
      var d = SM.store.load();
      d.sound = d.sound === false;
      SM.store.save();
      refreshHome();
      if (d.sound) { SM.audioUnlock(); SM.sfx.hint(); }
    };
    $('btn-reset').onclick = function () {
      openSheet(
        '<h2>Reset progress?</h2>' +
        '<p class="sub">Every star, score and unlocked level on this device is deleted.</p>' +
        '<div class="actions">' +
        '<button class="btn" data-act="close">Keep it</button>' +
        '<button class="btn btn-primary" id="really-reset">Reset</button></div>',
        function (sheet) {
          wireActions(sheet);
          sheet.querySelector('#really-reset').onclick = function () {
            SM.store.reset(); closeSheet(); refreshHome(); toast('Progress reset');
          };
        }
      );
    };

    $('btn-undo').onclick = doUndo;
    $('btn-hint').onclick = doHint;
    $('btn-restart').onclick = function () { if (G) startLevel(G.level); };
    $('btn-rule').onclick = ruleSheet;
    $('hud-rule').onclick = ruleSheet;

    $('overlay').onclick = function (e) { if (e.target === $('overlay')) closeSheet(); };

    document.addEventListener('keydown', function (e) {
      if (!$('overlay').hidden) { if (e.key === 'Escape') closeSheet(); return; }
      if (current !== 'game') { if (e.key === 'Escape') show('home'); return; }
      var k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter' || k === 'd') { e.preventDefault(); onStockClick(); }
      else if (k === 'u' || (k === 'z' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); doUndo(); }
      else if (k === 'h') doHint();
      else if (k === 'r') { if (G) startLevel(G.level); }
      else if (k === 'escape') show('levels');
    });

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

    show('home');
  }

  SM.ui = { start: startLevel, show: show };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.SM = window.SM || {});
