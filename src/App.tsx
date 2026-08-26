import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { reducer } from './game/engine';
import { newLevel } from './game/level';
import { checkMove } from './game/rules';
import type { Destination, Source } from './game/types';
import { Board } from './components/Board';
import { BoosterRow } from './components/Boosters';
import { Hud } from './components/Hud';
import { AdBanner, EndPanel, MenuPanel, Toast } from './components/Overlays';
import { LevelSelect } from './components/LevelSelect';
import * as Progress from './game/progress';
import { TOTAL_LEVELS } from './game/campaign';
import { SHOW_AD, STAGE_H, STAGE_W } from './layout';

const params = new URLSearchParams(location.search);
/** Dev flags: ?level=n jumps straight to a level, ?seed=xyz fixes the shuffle. */
const START_LEVEL = Math.max(1, Math.min(TOTAL_LEVELS, Number(params.get('level')) || 0));
const SEED_OVERRIDE = params.get('seed') ?? undefined;

function openingLevel(): number {
  if (START_LEVEL) return START_LEVEL;
  const saved = Progress.load().current;
  return Math.max(1, Math.min(TOTAL_LEVELS, saved));
}

export default function App() {
  const [progress, setProgress] = useState(Progress.load);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    newLevel(openingLevel(), SEED_OVERRIDE));
  const [menuOpen, setMenuOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [sound, setSound] = useState(progress.sound);
  const [vibrate, setVibrate] = useState(progress.vibrate);
  const scored = useRef<number | null>(null);
  const [jokerArmed, setJokerArmed] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [scale, setScale] = useState(0.28);
  const shakeTimer = useRef<number | undefined>(undefined);

  /* fit the 1320x2868 stage into whatever screen we are on */
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      setScale(Math.min(w / STAGE_W, h / STAGE_H, 520 / STAGE_W));
    };
    fit();
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, []);

  const paused = menuOpen || levelsOpen || state.phase !== 'playing';
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  /* a filled set clears itself once its completion animation has run */
  useEffect(() => {
    const slot = state.foundations.findIndex((f) => f.completing);
    if (slot < 0) return;
    const id = window.setTimeout(() => dispatch({ type: 'finishFoundation', slot }), 1200);
    return () => window.clearTimeout(id);
  }, [state.foundations]);

  useEffect(() => {
    if (!state.calculatorUntil) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearCalculator' }), 5000);
    return () => window.clearTimeout(id);
  }, [state.calculatorUntil]);

  useEffect(() => {
    if (!state.hint) return;
    const id = window.setTimeout(() => dispatch({ type: 'clearHint' }), 2000);
    return () => window.clearTimeout(id);
  }, [state.hint]);

  useEffect(() => {
    if (state.phase === 'playing') { scored.current = null; return; }
    if (scored.current === state.level) return;          // score a level once
    scored.current = state.level;
    if (state.phase === 'won') {
      const stars = Progress.starsFor(state.moves, state.movesMax);
      setProgress(Progress.recordWin(state.level, stars, 100 + state.moves * 2));
    } else {
      setProgress(Progress.recordLoss(state.level));
    }
  }, [state.phase, state.level, state.moves, state.movesMax]);

  const goToLevel = useCallback((level: number) => {
    setMenuOpen(false);
    setLevelsOpen(false);
    setJokerArmed(false);
    dispatch({ type: 'replace', state: newLevel(level, level === state.level ? SEED_OVERRIDE : undefined) });
  }, [state.level]);

  const buzz = useCallback((ms: number) => {
    if (vibrate && navigator.vibrate) navigator.vibrate(ms);
  }, [vibrate]);

  /* an illegal move shakes the card and costs nothing */
  const refuse = useCallback((cardId: string | undefined) => {
    if (!cardId) return;
    window.clearTimeout(shakeTimer.current);
    setShakingId(cardId);
    buzz(30);
    shakeTimer.current = window.setTimeout(() => setShakingId(null), 340);
  }, [buzz]);

  const cardAt = useCallback((source: Source) => {
    if (source.from === 'waste') return state.waste[0];
    const column = state.columns[source.col];
    return column.cards[column.cards.length - 1];
  }, [state]);

  const tapSource = useCallback((source: Source) => {
    if (state.phase !== 'playing' || state.locked) return;
    setJokerArmed(false);
    const current = state.selected;
    const samePile = current !== null && current.from === source.from &&
      (source.from === 'waste' || (current.from === 'column' && current.col === source.col));
    if (samePile) {
      // tapping the same pile again either changes the group size or deselects
      const sameSize = source.from === 'waste' ||
        (current !== null && current.from === 'column' && current.count === source.count);
      dispatch({ type: 'select', source: sameSize ? null : source });
      return;
    }
    dispatch({ type: 'select', source });
    buzz(8);
  }, [state, buzz]);

  const attempt = useCallback((destination: Destination) => {
    const source = state.selected;
    if (!source) return;
    const check = checkMove(state, source, destination);
    if (!check.ok) refuse(cardAt(source)?.id);
    else buzz(16);
    dispatch({ type: 'move', source, destination });
  }, [state, refuse, cardAt, buzz]);

  /**
    * One tap handler for the tableau. With nothing selected a tap picks the
    * pile up; with something already selected the tap is a destination, so
    * tapping a card that is itself liftable still completes the move.
    */
  const tapPile = useCallback((col: number, source: Source | null) => {
    if (jokerArmed) { setJokerArmed(false); return; }
    const selected = state.selected;
    const samePile = selected !== null && selected.from === 'column' && selected.col === col;
    if (selected && !samePile) { attempt({ to: 'column', col }); return; }
    if (source) tapSource(source);
    else if (selected) dispatch({ type: 'select', source: null });
  }, [state.selected, attempt, jokerArmed, tapSource]);

  const tapFoundation = useCallback((slot: number) => {
    if (jokerArmed) {
      const f = state.foundations[slot];
      if (f.card && !f.completing && f.progress < f.quota) {
        dispatch({ type: 'joker', slot });
        buzz(24);
      }
      setJokerArmed(false);
      return;
    }
    if (!state.selected) return;
    attempt({ to: 'foundation', slot });
  }, [jokerArmed, state.foundations, state.selected, attempt, buzz]);

  const tapStock = useCallback(() => {
    setJokerArmed(false);
    if (state.stock.length) dispatch({ type: 'draw' });
    else dispatch({ type: 'restore' });
    buzz(10);
  }, [state.stock.length, buzz]);

  const tapJoker = useCallback(() => {
    if (state.boosters.joker <= 0 || state.phase !== 'playing') return;
    dispatch({ type: 'select', source: null });
    setJokerArmed((v) => !v);
  }, [state.boosters.joker, state.phase]);

  const canUndo = state.history.length > 0 && state.boosters.undo > 0;
  const canMagnet = useMemo(() => {
    if (!state.foundations.some((f) => f.card)) return false;
    for (let slot = 0; slot < 4; slot++) {
      if (checkMove(state, { from: 'waste' }, { to: 'foundation', slot }).ok) return true;
      for (let col = 0; col < state.columns.length; col++) {
        if (checkMove(state, { from: 'column', col, count: 1 }, { to: 'foundation', slot }).ok) return true;
      }
    }
    return false;
  }, [state]);

  const replay = () => goToLevel(state.level);
  const next = () => goToLevel(Math.min(TOTAL_LEVELS, state.level + 1));

  return (
    <div className="viewport">
      <div className="stage" style={{ transform: `scale(${scale})` }}>
        <Hud
          coins={progress.coins} lives={progress.lives} secondsLeft={state.secondsLeft}
          level={state.level} moves={state.moves} movesMax={state.movesMax}
          onMenu={() => setMenuOpen(true)}
        />
        <Board
          state={state}
          showValues={!!state.calculatorUntil}
          jokerArmed={jokerArmed}
          shakingId={shakingId}
          flippingIds={new Set()}
          onTapPile={tapPile}
          onTapSource={tapSource}
          onTapFoundation={tapFoundation}
          onTapStock={tapStock}
          onTapJoker={tapJoker}
        />
        <BoosterRow
          counts={state.boosters} canUndo={canUndo} canMagnet={canMagnet}
          onHint={() => dispatch({ type: 'hint' })}
          onUndo={() => dispatch({ type: 'undo' })}
          onMagnet={() => dispatch({ type: 'magnet' })}
          onCalculator={() => dispatch({ type: 'calculator' })}
        />
        <AdBanner visible={SHOW_AD} />
        <Toast toast={state.toast} />
        <EndPanel state={state} onNext={next} onReplay={replay} onMenu={() => setLevelsOpen(true)} />
        <MenuPanel
          open={menuOpen} sound={sound} vibrate={vibrate}
          onResume={() => setMenuOpen(false)}
          onRestart={replay}
          onLevels={() => { setMenuOpen(false); setLevelsOpen(true); }}
          onToggleSound={() => setSound((v) => { Progress.save({ ...progress, sound: !v }); return !v; })}
          onToggleVibrate={() => setVibrate((v) => { Progress.save({ ...progress, vibrate: !v }); return !v; })}
        />
        {levelsOpen && (
          <LevelSelect progress={progress} onPick={goToLevel} onClose={() => setLevelsOpen(false)} />
        )}
      </div>
    </div>
  );
}
